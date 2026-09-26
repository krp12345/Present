"""Tests for the PKI package.

Run with ``python3 -m unittest discover -s scripts/pki -t scripts``.

Every test below replaces one collaborator with a fake, which is the point
of the protocols: nothing here touches the network, and the clock and the
serial numbers are fixed, so the results are reproducible.
"""

from __future__ import annotations

import ipaddress
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509

from pki.addresses import (
    DefaultRouteAddressSource,
    DhcpLeaseAddressSource,
    FirstAnsweringAddressSource,
    LoopbackAddressSource,
    MergedAddressSource,
    StaticAddressSource,
    TolerantAddressSource,
)
from pki.authority import StoredAuthorityProvider
from pki.clock import FixedClock
from pki.commands import MappingCommandRunner
from pki.errors import AddressDiscoveryError, MaterialExistsError
from pki.issuing import CertificateFactory
from pki.keys import EcKeyFactory
from pki.naming import SubjectSpec
from pki.profiles import RootAuthorityProfile
from pki.serials import SequentialSerialSource
from pki.storage import FilesystemMaterialStore, PassphraseProtectedKey, UnencryptedKey
from pki.subjects import PrimaryAddressSubject
from pki.usecases import AuthorityNames, CreateAuthority, IssueServerCertificate
from pki.validity import DaysValidity

IP_ADDR_OUTPUT = json.dumps(
    [
        {
            "ifname": "lo",
            "addr_info": [{"family": "inet", "local": "127.0.0.1", "scope": "host"}],
        },
        {
            "ifname": "eth0",
            "addr_info": [
                {
                    "family": "inet",
                    "local": "10.0.0.5",
                    "scope": "global",
                    "dynamic": True,
                },
                {"family": "inet", "local": "10.0.0.6", "scope": "global"},
            ],
        },
    ]
)
IP_ROUTE_OUTPUT = json.dumps([{"dev": "eth0", "prefsrc": "10.0.0.5"}])

ADDR_ARGV = ("ip", "-json", "-4", "addr", "show")
ROUTE_ARGV = ("ip", "-json", "route", "get", "1.1.1.1")


def fake_runner(**overrides: str) -> MappingCommandRunner:
    responses = {ADDR_ARGV: IP_ADDR_OUTPUT, ROUTE_ARGV: IP_ROUTE_OUTPUT}
    responses.update({globals()[key]: value for key, value in overrides.items()})
    return MappingCommandRunner(responses)


class AddressDiscoveryTests(unittest.TestCase):
    def test_only_leased_addresses_are_reported(self) -> None:
        found = DhcpLeaseAddressSource(fake_runner()).addresses()
        self.assertEqual([str(item.address) for item in found], ["10.0.0.5"])
        self.assertEqual(found[0].origin, "dhcp lease")

    def test_default_route_is_the_fallback(self) -> None:
        found = DefaultRouteAddressSource(fake_runner()).addresses()
        self.assertEqual([str(item.address) for item in found], ["10.0.0.5"])

    def test_route_answers_when_no_lease_is_visible(self) -> None:
        empty = MappingCommandRunner(
            {ADDR_ARGV: json.dumps([]), ROUTE_ARGV: IP_ROUTE_OUTPUT}
        )
        source = FirstAnsweringAddressSource(
            [DhcpLeaseAddressSource(empty), DefaultRouteAddressSource(empty)]
        )
        self.assertEqual([str(item.address) for item in source.addresses()], ["10.0.0.5"])

    def test_a_source_that_cannot_run_reports_nothing(self) -> None:
        broken = MappingCommandRunner({})
        self.assertEqual(
            TolerantAddressSource(DhcpLeaseAddressSource(broken)).addresses(), ()
        )

    def test_merging_keeps_order_and_drops_duplicates(self) -> None:
        source = MergedAddressSource(
            [
                DhcpLeaseAddressSource(fake_runner()),
                StaticAddressSource(["10.0.0.5", "203.0.113.9"]),
                LoopbackAddressSource(),
            ]
        )
        self.assertEqual(
            [str(item.address) for item in source.addresses()],
            ["10.0.0.5", "203.0.113.9", "127.0.0.1", "::1"],
        )


class CertificateTests(unittest.TestCase):
    def setUp(self) -> None:
        self._directory = tempfile.TemporaryDirectory()
        self.addCleanup(self._directory.cleanup)
        self.path = Path(self._directory.name)
        self.clock = FixedClock(datetime(2026, 1, 1, tzinfo=timezone.utc))

    def make_store(self, overwrite: bool = False) -> FilesystemMaterialStore:
        return FilesystemMaterialStore(self.path, overwrite=overwrite)

    def make_authority(self, store, protection=None) -> None:
        CreateAuthority(
            key_factory=EcKeyFactory(),
            certificates=CertificateFactory(
                self.clock, SequentialSerialSource(), DaysValidity(3650)
            ),
            profile=RootAuthorityProfile(),
            store=store,
            protection=protection or UnencryptedKey(),
        ).execute(SubjectSpec(common_name="Test CA"))

    def make_issuer(self, store, addresses, protection=None):
        return IssueServerCertificate(
            key_factory=EcKeyFactory(),
            addresses=addresses,
            subject_policy=PrimaryAddressSubject(),
            certificates=CertificateFactory(
                self.clock, SequentialSerialSource(2), DaysValidity(397)
            ),
            authority=StoredAuthorityProvider(
                store,
                AuthorityNames().certificate,
                AuthorityNames().key,
                protection or UnencryptedKey(),
            ),
            store=store,
            protection=UnencryptedKey(),
        )

    def test_root_can_sign_and_is_self_issued(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        root = store.load_certificate(AuthorityNames().certificate)
        self.assertEqual(root.subject, root.issuer)
        constraints = root.extensions.get_extension_for_class(x509.BasicConstraints)
        self.assertTrue(constraints.value.ca)
        self.assertEqual(constraints.value.path_length, 0)
        self.assertTrue(
            root.extensions.get_extension_for_class(x509.KeyUsage).value.key_cert_sign
        )
        self.assertEqual(root.not_valid_after_utc.year, 2035)

    def test_server_certificate_covers_the_leased_address(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        result = self.make_issuer(
            store, DhcpLeaseAddressSource(fake_runner())
        ).execute()
        names = result.certificate.extensions.get_extension_for_class(
            x509.SubjectAlternativeName
        ).value
        self.assertEqual(
            names.get_values_for_type(x509.IPAddress),
            [ipaddress.ip_address("10.0.0.5")],
        )
        self.assertEqual(result.certificate.subject.rfc4514_string(), "CN=10.0.0.5")

    def test_server_certificate_chains_to_the_root(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        result = self.make_issuer(
            store, DhcpLeaseAddressSource(fake_runner())
        ).execute()
        root = store.load_certificate(AuthorityNames().certificate)
        self.assertEqual(result.certificate.issuer, root.subject)
        result.certificate.verify_directly_issued_by(root)
        self.assertEqual(result.chain_path.read_text().count("BEGIN CERTIFICATE"), 2)

    def test_encrypted_ca_key_round_trips(self) -> None:
        protection = PassphraseProtectedKey(b"secret")
        store = self.make_store()
        self.make_authority(store, protection)
        self.assertIn("ENCRYPTED", store.path_of(AuthorityNames().key).read_text())
        self.make_issuer(
            store, DhcpLeaseAddressSource(fake_runner()), protection
        ).execute()

    def test_nothing_is_written_when_a_name_is_taken(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        before = store.path_of(AuthorityNames().key).read_bytes()
        with self.assertRaises(MaterialExistsError):
            self.make_authority(store)
        self.assertEqual(store.path_of(AuthorityNames().key).read_bytes(), before)

    def test_keys_are_not_world_readable(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        mode = store.path_of(AuthorityNames().key).stat().st_mode & 0o777
        self.assertEqual(mode, 0o600)

    def test_issuing_without_an_address_is_refused(self) -> None:
        store = self.make_store()
        self.make_authority(store)
        with self.assertRaises(AddressDiscoveryError):
            self.make_issuer(store, StaticAddressSource([])).execute()


if __name__ == "__main__":
    unittest.main()

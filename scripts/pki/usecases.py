"""The two things this package does.

Both use cases are wired from abstractions only: they never create a key
factory, open a file or run a command themselves.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from cryptography import x509

from .addresses import AddressSource, DiscoveredAddress
from .authority import AuthorityProvider
from .errors import AddressDiscoveryError
from .issuing import CertificateFactory, CertificateRequest, SelfIssuer
from .keys import PrivateKeyFactory
from .naming import SubjectSpec
from .profiles import CertificateProfile, TlsServerProfile
from .storage import KeyProtection, MaterialStore
from .subjects import ServerSubjectPolicy


@dataclass(frozen=True)
class AuthorityNames:
    """File names the CA is stored under."""

    key: str = "ca.key.pem"
    certificate: str = "ca.crt.pem"


@dataclass(frozen=True)
class AuthorityResult:
    certificate: x509.Certificate
    key_path: Path
    certificate_path: Path


class CreateAuthority:
    """Creates a private certificate authority: one key, one self-signed root."""

    def __init__(
        self,
        key_factory: PrivateKeyFactory,
        certificates: CertificateFactory,
        profile: CertificateProfile,
        store: MaterialStore,
        protection: KeyProtection,
        names: AuthorityNames = AuthorityNames(),
    ) -> None:
        self._key_factory = key_factory
        self._certificates = certificates
        self._profile = profile
        self._store = store
        self._protection = protection
        self._names = names

    def execute(self, subject: SubjectSpec) -> AuthorityResult:
        self._store.assert_writable([self._names.key, self._names.certificate])
        key = self._key_factory.create()
        certificate = self._certificates.issue(
            CertificateRequest(
                subject=subject, public_key=key.public_key(), profile=self._profile
            ),
            issuer=SelfIssuer(subject.to_name(), key),
        )
        key_path = self._store.save_key(self._names.key, key, self._protection)
        certificate_path = self._store.save_certificate(
            self._names.certificate, certificate
        )
        return AuthorityResult(certificate, key_path, certificate_path)


@dataclass(frozen=True)
class ServerNames:
    """File names the server material is stored under."""

    key: str = "server.key.pem"
    certificate: str = "server.crt.pem"
    chain: str = "server.fullchain.pem"


@dataclass(frozen=True)
class ServerCertificateResult:
    certificate: x509.Certificate
    addresses: Sequence[DiscoveredAddress]
    key_path: Path
    certificate_path: Path
    chain_path: Path


class IssueServerCertificate:
    """Issues a TLS server certificate for the addresses this host holds.

    The addresses come from whichever :class:`AddressSource` was wired in;
    for the DHCP case that is the kernel's own record of the lease.
    """

    def __init__(
        self,
        key_factory: PrivateKeyFactory,
        addresses: AddressSource,
        subject_policy: ServerSubjectPolicy,
        certificates: CertificateFactory,
        authority: AuthorityProvider,
        store: MaterialStore,
        protection: KeyProtection,
        dns_names: Sequence[str] = (),
        names: ServerNames = ServerNames(),
    ) -> None:
        self._key_factory = key_factory
        self._addresses = addresses
        self._subject_policy = subject_policy
        self._certificates = certificates
        self._authority = authority
        self._store = store
        self._protection = protection
        self._dns_names = list(dns_names)
        self._names = names

    def execute(self) -> ServerCertificateResult:
        discovered = list(self._addresses.addresses())
        if not discovered:
            raise AddressDiscoveryError(
                "no IP address found for this host; pass one with --ip"
            )
        self._store.assert_writable(
            [self._names.key, self._names.certificate, self._names.chain]
        )
        issuer = self._authority.issuer()
        key = self._key_factory.create()
        profile = TlsServerProfile(
            ip_addresses=[found.address for found in discovered],
            dns_names=self._dns_names,
        )
        certificate = self._certificates.issue(
            CertificateRequest(
                subject=self._subject_policy.subject(discovered),
                public_key=key.public_key(),
                profile=profile,
            ),
            issuer=issuer,
        )
        key_path = self._store.save_key(self._names.key, key, self._protection)
        certificate_path = self._store.save_certificate(
            self._names.certificate, certificate
        )
        chain_path = self._store.save_chain(
            self._names.chain, [certificate, *issuer.chain()]
        )
        return ServerCertificateResult(
            certificate=certificate,
            addresses=discovered,
            key_path=key_path,
            certificate_path=certificate_path,
            chain_path=chain_path,
        )

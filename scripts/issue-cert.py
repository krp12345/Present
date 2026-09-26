#!/usr/bin/env python3
"""Issue the HTTPS server certificate for this machine's DHCP address.

The address is not guessed: the kernel marks a leased address as dynamic,
so ``ip -json addr`` reports exactly what DHCP handed out. Anything else the
certificate must cover -- the home router's public IP, a hostname -- is added
with --ip and --dns.

    ./scripts/issue-cert.py                       # LAN lease only
    ./scripts/issue-cert.py --ip 203.0.113.9      # and the public address

Re-run it whenever the lease changes. A DHCP reservation on the router keeps
that from happening often.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pki.addresses import (  # noqa: E402
    AddressSource,
    DefaultRouteAddressSource,
    DhcpLeaseAddressSource,
    FirstAnsweringAddressSource,
    LoopbackAddressSource,
    MergedAddressSource,
    StaticAddressSource,
    TolerantAddressSource,
)
from pki.authority import StoredAuthorityProvider  # noqa: E402
from pki.cli import (  # noqa: E402
    add_shared_arguments,
    build_key_factory,
    describe_addresses,
    describe_certificate,
    protection_for_stored_ca_key,
    report_failure,
)
from pki.clock import SystemClock  # noqa: E402
from pki.commands import SubprocessCommandRunner  # noqa: E402
from pki.errors import PkiError  # noqa: E402
from pki.issuing import CertificateFactory  # noqa: E402
from pki.naming import SubjectSpec  # noqa: E402
from pki.serials import RandomSerialSource  # noqa: E402
from pki.storage import FilesystemMaterialStore, UnencryptedKey  # noqa: E402
from pki.subjects import FixedSubject, PrimaryAddressSubject  # noqa: E402
from pki.usecases import (  # noqa: E402
    AuthorityNames,
    IssueServerCertificate,
    ServerNames,
)
from pki.validity import MAX_LEAF_DAYS, DaysValidity  # noqa: E402


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Issue a server certificate for this host's IP addresses.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    add_shared_arguments(parser)
    parser.add_argument(
        "--ip",
        action="append",
        default=[],
        dest="extra_ips",
        metavar="ADDRESS",
        help="an extra address to cover, such as the public IP (repeatable)",
    )
    parser.add_argument(
        "--dns",
        action="append",
        default=[],
        dest="dns_names",
        metavar="NAME",
        help="a host name to cover (repeatable)",
    )
    parser.add_argument(
        "--discover",
        choices=("auto", "dhcp", "route", "none"),
        default="auto",
        help="how to find this host's address: dhcp lease, default route, "
        "auto (lease, then route), or none for --ip only",
    )
    parser.add_argument(
        "--no-loopback",
        action="store_true",
        help="leave 127.0.0.1 and ::1 out of the certificate",
    )
    parser.add_argument(
        "--common-name",
        default=None,
        help="subject name; the first address is used when this is not given",
    )
    parser.add_argument("--organization", default=None, help="organisation name")
    parser.add_argument(
        "--days",
        type=int,
        default=MAX_LEAF_DAYS,
        help="how long the certificate is valid; Apple clients reject over 398",
    )
    return parser.parse_args(argv)


def build_address_source(arguments: argparse.Namespace) -> AddressSource:
    """Assemble the answer to "which addresses?" from the flags given."""
    runner = SubprocessCommandRunner()
    lease = TolerantAddressSource(DhcpLeaseAddressSource(runner))
    route = TolerantAddressSource(DefaultRouteAddressSource(runner))
    discovery: list[AddressSource] = {
        "auto": [FirstAnsweringAddressSource([lease, route])],
        "dhcp": [lease],
        "route": [route],
        "none": [],
    }[arguments.discover]

    sources: list[AddressSource] = list(discovery)
    if arguments.extra_ips:
        sources.append(StaticAddressSource(arguments.extra_ips))
    if not arguments.no_loopback:
        sources.append(LoopbackAddressSource())
    return MergedAddressSource(sources)


def build_use_case(arguments: argparse.Namespace) -> IssueServerCertificate:
    """Composition root: the only place that picks concrete implementations."""
    store = FilesystemMaterialStore(arguments.directory, overwrite=arguments.force)
    authority_names = AuthorityNames()
    subject_policy = (
        FixedSubject(
            SubjectSpec(
                common_name=arguments.common_name, organization=arguments.organization
            )
        )
        if arguments.common_name
        else PrimaryAddressSubject(organization=arguments.organization)
    )
    return IssueServerCertificate(
        key_factory=build_key_factory(arguments),
        addresses=build_address_source(arguments),
        subject_policy=subject_policy,
        certificates=CertificateFactory(
            clock=SystemClock(),
            serials=RandomSerialSource(),
            validity=DaysValidity(arguments.days),
        ),
        authority=StoredAuthorityProvider(
            store=store,
            certificate_name=authority_names.certificate,
            key_name=authority_names.key,
            protection=protection_for_stored_ca_key(store, authority_names.key),
        ),
        store=store,
        protection=UnencryptedKey(),
        dns_names=arguments.dns_names,
        names=ServerNames(),
    )


def main(argv: list[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    try:
        result = build_use_case(arguments).execute()
    except PkiError as error:
        return report_failure(error)

    print("Server certificate issued for:")
    print(describe_addresses(result.addresses))
    print(describe_certificate(result.certificate))
    print(f"  key        {result.key_path}")
    print(f"  cert       {result.certificate_path}")
    print(f"  fullchain  {result.chain_path}")
    print()
    print("Point the server at the certificate and key, and serve HTTPS only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

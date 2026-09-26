#!/usr/bin/env python3
"""Create the private certificate authority for this installation.

Run once. The root key it writes is the most sensitive file in the project:
everything trusted by the phone and the home PC hangs off it.

    ./scripts/make-ca.py --common-name "Present Home CA" --ask-passphrase

Afterwards, install pki/ca.crt.pem as a trusted root on the home PC and on
the phone, then issue the server certificate with ./scripts/issue-cert.py.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pki.cli import (  # noqa: E402
    add_shared_arguments,
    build_key_factory,
    describe_certificate,
    protection_for_new_ca_key,
    report_failure,
)
from pki.clock import SystemClock  # noqa: E402
from pki.errors import PkiError  # noqa: E402
from pki.issuing import CertificateFactory  # noqa: E402
from pki.naming import SubjectSpec  # noqa: E402
from pki.profiles import RootAuthorityProfile  # noqa: E402
from pki.serials import RandomSerialSource  # noqa: E402
from pki.storage import FilesystemMaterialStore  # noqa: E402
from pki.usecases import AuthorityNames, CreateAuthority  # noqa: E402
from pki.validity import DaysValidity  # noqa: E402

DEFAULT_DAYS = 3650


def parse_arguments(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a private certificate authority.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    add_shared_arguments(parser)
    parser.add_argument(
        "--common-name", default="Present Home CA", help="name shown to clients"
    )
    parser.add_argument("--organization", default=None, help="organisation name")
    parser.add_argument("--country", default=None, help="two-letter country code")
    parser.add_argument(
        "--days", type=int, default=DEFAULT_DAYS, help="how long the root is valid"
    )
    parser.add_argument(
        "--ask-passphrase",
        action="store_true",
        help="encrypt the CA key with a passphrase typed at the prompt",
    )
    return parser.parse_args(argv)


def build_use_case(arguments: argparse.Namespace) -> CreateAuthority:
    """Composition root: the only place that picks concrete implementations."""
    return CreateAuthority(
        key_factory=build_key_factory(arguments),
        certificates=CertificateFactory(
            clock=SystemClock(),
            serials=RandomSerialSource(),
            validity=DaysValidity(arguments.days),
        ),
        profile=RootAuthorityProfile(path_length=0),
        store=FilesystemMaterialStore(arguments.directory, overwrite=arguments.force),
        protection=protection_for_new_ca_key(arguments.ask_passphrase),
        names=AuthorityNames(),
    )


def main(argv: list[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    subject = SubjectSpec(
        common_name=arguments.common_name,
        organization=arguments.organization,
        country=arguments.country,
    )
    try:
        result = build_use_case(arguments).execute(subject)
    except PkiError as error:
        return report_failure(error)

    print("Certificate authority created.")
    print(describe_certificate(result.certificate))
    print(f"  key        {result.key_path}")
    print(f"  root cert  {result.certificate_path}")
    print()
    print("Next: install the root certificate as trusted on every client,")
    print("then run ./scripts/issue-cert.py to issue the server certificate.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

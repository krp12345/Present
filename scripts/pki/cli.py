"""Command-line plumbing shared by the two scripts.

This is the only layer that reads the environment, prompts on a terminal or
prints. The use cases below it do none of those things.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from pathlib import Path
from typing import Sequence

from cryptography import x509

from .addresses import DiscoveredAddress
from .errors import MaterialExistsError, MaterialNotFoundError, PkiError
from .keys import EcKeyFactory, Ed25519KeyFactory, PrivateKeyFactory, RsaKeyFactory
from .storage import (
    KeyProtection,
    MaterialStore,
    PassphraseProtectedKey,
    UnencryptedKey,
)

DEFAULT_DIRECTORY = Path(os.environ.get("PRESENT_PKI_DIR", "pki"))
CA_PASSPHRASE_VARIABLE = "PRESENT_CA_PASSPHRASE"
ENCRYPTED_PEM_MARKER = b"ENCRYPTED"


def add_shared_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--dir",
        type=Path,
        default=DEFAULT_DIRECTORY,
        dest="directory",
        help="directory holding the PKI material",
    )
    parser.add_argument(
        "--key-type",
        choices=("ec", "rsa", "ed25519"),
        default="ec",
        help="key algorithm; ec is curve P-256",
    )
    parser.add_argument(
        "--rsa-bits", type=int, default=3072, help="key size when --key-type rsa"
    )
    parser.add_argument(
        "--force", action="store_true", help="overwrite material that already exists"
    )


def build_key_factory(arguments: argparse.Namespace) -> PrivateKeyFactory:
    if arguments.key_type == "rsa":
        return RsaKeyFactory(key_size=arguments.rsa_bits)
    if arguments.key_type == "ed25519":
        return Ed25519KeyFactory()
    return EcKeyFactory()


def protection_for_new_ca_key(ask: bool) -> KeyProtection:
    """Protection for a CA key being created."""
    from_environment = os.environ.get(CA_PASSPHRASE_VARIABLE)
    if from_environment:
        return PassphraseProtectedKey(from_environment.encode())
    if not ask:
        return UnencryptedKey()
    passphrase = getpass.getpass("Passphrase for the CA key: ")
    if passphrase != getpass.getpass("Repeat passphrase: "):
        raise SystemExit("passphrases do not match")
    if not passphrase:
        raise SystemExit("passphrase must not be empty")
    return PassphraseProtectedKey(passphrase.encode())


def protection_for_stored_ca_key(store: MaterialStore, name: str) -> KeyProtection:
    """Protection for a CA key being read back, asking only if it is encrypted."""
    path = store.path_of(name)
    header = path.read_bytes()[:80] if path.exists() else b""
    if ENCRYPTED_PEM_MARKER not in header:
        return UnencryptedKey()
    from_environment = os.environ.get(CA_PASSPHRASE_VARIABLE)
    if from_environment:
        return PassphraseProtectedKey(from_environment.encode())
    return PassphraseProtectedKey(getpass.getpass("Passphrase for the CA key: ").encode())


def hint_for(error: PkiError) -> str | None:
    """What the operator can do about this failure, if anything."""
    if isinstance(error, MaterialNotFoundError):
        return "create the authority first: ./scripts/make-ca.py"
    if isinstance(error, MaterialExistsError):
        return "re-run with --force to replace existing material"
    return None


def report_failure(error: PkiError) -> int:
    """Print a failure the way the operator needs to read it. Returns the exit code."""
    print(f"error: {error}", file=sys.stderr)
    hint = hint_for(error)
    if hint:
        print(hint, file=sys.stderr)
    return 1


def describe_certificate(certificate: x509.Certificate) -> str:
    lines = [
        f"  subject    {certificate.subject.rfc4514_string()}",
        f"  issuer     {certificate.issuer.rfc4514_string()}",
        f"  serial     {certificate.serial_number:x}",
        f"  valid from {certificate.not_valid_before_utc:%Y-%m-%d %H:%M} UTC",
        f"  valid to   {certificate.not_valid_after_utc:%Y-%m-%d %H:%M} UTC",
    ]
    try:
        names = certificate.extensions.get_extension_for_class(
            x509.SubjectAlternativeName
        ).value
    except x509.ExtensionNotFound:
        return "\n".join(lines)
    covered = [str(name.value) for name in names]
    lines.append(f"  valid for  {', '.join(covered)}")
    return "\n".join(lines)


def describe_addresses(addresses: Sequence[DiscoveredAddress]) -> str:
    return "\n".join(f"  {found}" for found in addresses)

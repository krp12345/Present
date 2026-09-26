"""Private key creation.

Each factory knows one algorithm. Adding a new algorithm means adding a
class here, not editing the ones that already work.
"""

from __future__ import annotations

from typing import Protocol

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, rsa
from cryptography.hazmat.primitives.asymmetric.types import (
    CertificateIssuerPrivateKeyTypes,
)

PrivateKey = CertificateIssuerPrivateKeyTypes


class PrivateKeyFactory(Protocol):
    """Creates one fresh private key per call."""

    def create(self) -> PrivateKey: ...

    @property
    def description(self) -> str: ...


class EcKeyFactory:
    """NIST curve keys. Small, fast, accepted by every current TLS client."""

    def __init__(self, curve: ec.EllipticCurve | None = None) -> None:
        self._curve = curve or ec.SECP256R1()

    def create(self) -> PrivateKey:
        return ec.generate_private_key(self._curve)

    @property
    def description(self) -> str:
        return f"EC {self._curve.name}"


class RsaKeyFactory:
    """RSA keys, for clients or appliances that still insist on them."""

    def __init__(self, key_size: int = 3072, public_exponent: int = 65537) -> None:
        self._key_size = key_size
        self._public_exponent = public_exponent

    def create(self) -> PrivateKey:
        return rsa.generate_private_key(
            public_exponent=self._public_exponent, key_size=self._key_size
        )

    @property
    def description(self) -> str:
        return f"RSA {self._key_size}"


class Ed25519KeyFactory:
    """Ed25519 keys. Fine for a private CA; browser support is uneven."""

    def create(self) -> PrivateKey:
        return ed25519.Ed25519PrivateKey.generate()

    @property
    def description(self) -> str:
        return "Ed25519"


def signature_hash_for(key: PrivateKey) -> hashes.HashAlgorithm | None:
    """The hash the signing algorithm of this key expects.

    Ed25519 carries its own hash and must be handed ``None``.
    """
    if isinstance(key, ed25519.Ed25519PrivateKey):
        return None
    return hashes.SHA256()

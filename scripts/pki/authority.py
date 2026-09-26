"""Getting hold of the signing CA."""

from __future__ import annotations

from typing import Protocol

from .issuing import AuthorityIssuer, Issuer
from .storage import KeyProtection, MaterialStore


class AuthorityProvider(Protocol):
    """Supplies the issuer that will sign a certificate."""

    def issuer(self) -> Issuer: ...


class StoredAuthorityProvider:
    """Loads the CA certificate and key from a material store."""

    def __init__(
        self,
        store: MaterialStore,
        certificate_name: str,
        key_name: str,
        protection: KeyProtection,
    ) -> None:
        self._store = store
        self._certificate_name = certificate_name
        self._key_name = key_name
        self._protection = protection

    def issuer(self) -> Issuer:
        certificate = self._store.load_certificate(self._certificate_name)
        key = self._store.load_key(self._key_name, self._protection)
        return AuthorityIssuer(certificate, key)

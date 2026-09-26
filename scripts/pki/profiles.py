"""What a certificate is allowed to be used for.

A profile owns one answer to "which X.509 extensions belong on this kind of
certificate". The signer applies whichever profile it is handed and never
asks what kind it is.
"""

from __future__ import annotations

from typing import Iterable, Protocol, Sequence

from cryptography import x509

from .addresses import IpAddress

ExtensionEntry = tuple[x509.ExtensionType, bool]


class CertificateProfile(Protocol):
    """The extensions this kind of certificate carries."""

    def extensions(self) -> Sequence[ExtensionEntry]: ...


class RootAuthorityProfile:
    """A root CA: may sign certificates and revocation lists, nothing else.

    ``path_length=0`` stops the root from being used to mint further CAs.
    """

    def __init__(self, path_length: int | None = 0) -> None:
        self._path_length = path_length

    def extensions(self) -> Sequence[ExtensionEntry]:
        return (
            (x509.BasicConstraints(ca=True, path_length=self._path_length), True),
            (
                x509.KeyUsage(
                    digital_signature=False,
                    content_commitment=False,
                    key_encipherment=False,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=True,
                    crl_sign=True,
                    encipher_only=False,
                    decipher_only=False,
                ),
                True,
            ),
        )


class TlsServerProfile:
    """A TLS server certificate for a set of IP addresses and host names."""

    def __init__(
        self, ip_addresses: Iterable[IpAddress], dns_names: Iterable[str] = ()
    ) -> None:
        self._ip_addresses = list(ip_addresses)
        self._dns_names = list(dns_names)
        if not self._ip_addresses and not self._dns_names:
            raise ValueError("a server certificate needs at least one name")

    def extensions(self) -> Sequence[ExtensionEntry]:
        general_names: list[x509.GeneralName] = [
            x509.IPAddress(address) for address in self._ip_addresses
        ]
        general_names.extend(x509.DNSName(name) for name in self._dns_names)
        return (
            (x509.BasicConstraints(ca=False, path_length=None), True),
            (
                x509.KeyUsage(
                    digital_signature=True,
                    content_commitment=False,
                    key_encipherment=True,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=False,
                    crl_sign=False,
                    encipher_only=False,
                    decipher_only=False,
                ),
                True,
            ),
            (
                x509.ExtendedKeyUsage([x509.ExtendedKeyUsageOID.SERVER_AUTH]),
                False,
            ),
            (x509.SubjectAlternativeName(general_names), False),
        )

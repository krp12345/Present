"""Building and signing certificates.

``CertificateFactory`` knows how to assemble a certificate. It does not know
whether the signature comes from the subject itself (a root) or from a CA;
both issuers satisfy the same protocol, so either can be handed in.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric.types import CertificatePublicKeyTypes

from .clock import Clock
from .keys import PrivateKey, signature_hash_for
from .naming import SubjectSpec
from .profiles import CertificateProfile
from .serials import SerialSource
from .validity import ValidityPolicy


class Issuer(Protocol):
    """Whoever signs the certificate."""

    @property
    def name(self) -> x509.Name: ...

    @property
    def signing_key(self) -> PrivateKey: ...

    def authority_key_identifier(self) -> x509.AuthorityKeyIdentifier: ...

    def chain(self) -> Sequence[x509.Certificate]:
        """The issuer's own certificates, root last. Empty when self-signing."""


class SelfIssuer:
    """The subject signs itself. Used only for the root certificate."""

    def __init__(self, subject: x509.Name, key: PrivateKey) -> None:
        self._name = subject
        self._key = key

    @property
    def name(self) -> x509.Name:
        return self._name

    @property
    def signing_key(self) -> PrivateKey:
        return self._key

    def authority_key_identifier(self) -> x509.AuthorityKeyIdentifier:
        return x509.AuthorityKeyIdentifier.from_issuer_public_key(self._key.public_key())

    def chain(self) -> Sequence[x509.Certificate]:
        return ()


class AuthorityIssuer:
    """An existing CA signs on behalf of the subject."""

    def __init__(self, certificate: x509.Certificate, key: PrivateKey) -> None:
        self._certificate = certificate
        self._key = key

    @property
    def name(self) -> x509.Name:
        return self._certificate.subject

    @property
    def signing_key(self) -> PrivateKey:
        return self._key

    def authority_key_identifier(self) -> x509.AuthorityKeyIdentifier:
        identifier = self._certificate.extensions.get_extension_for_class(
            x509.SubjectKeyIdentifier
        )
        return x509.AuthorityKeyIdentifier.from_issuer_subject_key_identifier(
            identifier.value
        )

    def chain(self) -> Sequence[x509.Certificate]:
        return (self._certificate,)


@dataclass(frozen=True)
class CertificateRequest:
    """Everything the factory needs that is specific to one certificate."""

    subject: SubjectSpec
    public_key: CertificatePublicKeyTypes
    profile: CertificateProfile


class CertificateFactory:
    """Assembles and signs one certificate per call."""

    def __init__(
        self, clock: Clock, serials: SerialSource, validity: ValidityPolicy
    ) -> None:
        self._clock = clock
        self._serials = serials
        self._validity = validity

    def issue(
        self, request: CertificateRequest, issuer: Issuer
    ) -> x509.Certificate:
        window = self._validity.window(self._clock)
        builder = (
            x509.CertificateBuilder()
            .subject_name(request.subject.to_name())
            .issuer_name(issuer.name)
            .public_key(request.public_key)
            .serial_number(self._serials.next_serial())
            .not_valid_before(window.not_before)
            .not_valid_after(window.not_after)
            .add_extension(
                x509.SubjectKeyIdentifier.from_public_key(request.public_key),
                critical=False,
            )
            .add_extension(issuer.authority_key_identifier(), critical=False)
        )
        for extension, critical in request.profile.extensions():
            builder = builder.add_extension(extension, critical=critical)
        return builder.sign(
            private_key=issuer.signing_key,
            algorithm=signature_hash_for(issuer.signing_key),
        )

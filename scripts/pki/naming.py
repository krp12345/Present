"""Subject names."""

from __future__ import annotations

from dataclasses import dataclass

from cryptography import x509
from cryptography.x509.oid import NameOID


@dataclass(frozen=True)
class SubjectSpec:
    """What the certificate claims to identify."""

    common_name: str
    organization: str | None = None
    organizational_unit: str | None = None
    country: str | None = None

    def to_name(self) -> x509.Name:
        attributes = [x509.NameAttribute(NameOID.COMMON_NAME, self.common_name)]
        if self.organization:
            attributes.append(
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, self.organization)
            )
        if self.organizational_unit:
            attributes.append(
                x509.NameAttribute(
                    NameOID.ORGANIZATIONAL_UNIT_NAME, self.organizational_unit
                )
            )
        if self.country:
            attributes.append(x509.NameAttribute(NameOID.COUNTRY_NAME, self.country))
        return x509.Name(attributes)

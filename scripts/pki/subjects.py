"""Deciding what name a server certificate carries."""

from __future__ import annotations

from typing import Protocol, Sequence

from .addresses import DiscoveredAddress
from .naming import SubjectSpec


class ServerSubjectPolicy(Protocol):
    """Chooses the subject for a certificate covering these addresses."""

    def subject(self, addresses: Sequence[DiscoveredAddress]) -> SubjectSpec: ...


class FixedSubject:
    """The operator named the subject; use it as given."""

    def __init__(self, spec: SubjectSpec) -> None:
        self._spec = spec

    def subject(self, addresses: Sequence[DiscoveredAddress]) -> SubjectSpec:
        return self._spec


class PrimaryAddressSubject:
    """Name the certificate after the first address it covers.

    Clients match on the subject alternative name, not on this, so it only
    has to be something a human recognises in a certificate viewer.
    """

    def __init__(self, organization: str | None = None) -> None:
        self._organization = organization

    def subject(self, addresses: Sequence[DiscoveredAddress]) -> SubjectSpec:
        return SubjectSpec(
            common_name=str(addresses[0].address), organization=self._organization
        )

"""Time as a dependency.

Certificate validity depends on "now". Injecting the clock keeps the
certificate use cases testable and free of hidden global state.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol


class Clock(Protocol):
    """Source of the current instant."""

    def now(self) -> datetime:
        """Return an aware UTC datetime."""


class SystemClock:
    """The real wall clock."""

    def now(self) -> datetime:
        return datetime.now(tz=timezone.utc)


class FixedClock:
    """A clock that never moves. For tests and reproducible issuance."""

    def __init__(self, instant: datetime) -> None:
        self._instant = instant

    def now(self) -> datetime:
        return self._instant

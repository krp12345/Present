"""How long a certificate is good for."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol

from .clock import Clock

# Apple clients reject server certificates valid for more than 398 days.
MAX_LEAF_DAYS = 397


@dataclass(frozen=True)
class ValidityWindow:
    not_before: datetime
    not_after: datetime

    @property
    def days(self) -> int:
        return (self.not_after - self.not_before).days


class ValidityPolicy(Protocol):
    """Turns "now" into the window a certificate is valid for."""

    def window(self, clock: Clock) -> ValidityWindow: ...


class DaysValidity:
    """A fixed number of days, backdated slightly for clock skew."""

    def __init__(self, days: int, backdate: timedelta = timedelta(minutes=5)) -> None:
        if days <= 0:
            raise ValueError("validity in days must be positive")
        self._days = days
        self._backdate = backdate

    def window(self, clock: Clock) -> ValidityWindow:
        now = clock.now()
        return ValidityWindow(
            not_before=now - self._backdate, not_after=now + timedelta(days=self._days)
        )

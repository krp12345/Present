"""Certificate serial numbers."""

from __future__ import annotations

from typing import Protocol

from cryptography import x509


class SerialSource(Protocol):
    """Supplies the serial number of the next certificate."""

    def next_serial(self) -> int: ...


class RandomSerialSource:
    """A fresh random serial per certificate, as public CAs are required to use.

    Random serials need no counter file, and two issuances never collide.
    """

    def next_serial(self) -> int:
        return x509.random_serial_number()


class SequentialSerialSource:
    """Predictable serials. For tests."""

    def __init__(self, start: int = 1) -> None:
        self._next = start

    def next_serial(self) -> int:
        serial = self._next
        self._next += 1
        return serial

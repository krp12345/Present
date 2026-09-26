"""Discovering which IP addresses the certificate must cover.

Every source answers the same question -- "which addresses?" -- so they can
be swapped or combined without the caller knowing which one answered.
"""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Iterable, Protocol, Sequence

from .commands import CommandRunner, parse_json
from .errors import CommandError, PkiError

IpAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


@dataclass(frozen=True)
class DiscoveredAddress:
    """An address together with where it came from."""

    address: IpAddress
    interface: str
    origin: str

    def __str__(self) -> str:
        return f"{self.address} ({self.interface}, {self.origin})"


class AddressSource(Protocol):
    """Answers: which IP addresses should the certificate be valid for?"""

    def addresses(self) -> Sequence[DiscoveredAddress]: ...


def _is_usable(address: IpAddress) -> bool:
    return not (
        address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_unspecified
    )


class DhcpLeaseAddressSource:
    """Addresses the kernel marks as leased, i.e. handed out by DHCP.

    ``ip -json addr`` flags an address as ``dynamic`` when it came from a
    lease rather than from static configuration, so this is the DHCP answer
    rather than a guess at one.
    """

    def __init__(self, runner: CommandRunner, family: str = "-4") -> None:
        self._runner = runner
        self._family = family

    def addresses(self) -> Sequence[DiscoveredAddress]:
        argv = ["ip", "-json", self._family, "addr", "show"]
        links = parse_json(self._runner.run(argv), "ip addr")
        found: list[DiscoveredAddress] = []
        for link in links:
            interface = link.get("ifname", "?")
            for entry in link.get("addr_info", []):
                if not entry.get("dynamic"):
                    continue
                if entry.get("scope") != "global":
                    continue
                address = ipaddress.ip_address(entry["local"])
                if _is_usable(address):
                    found.append(DiscoveredAddress(address, interface, "dhcp lease"))
        return found


class DefaultRouteAddressSource:
    """The address the machine would use to reach the internet.

    A fallback for hosts whose lease is not visible to the kernel flag, and
    the closest thing to "the address other machines on the LAN will dial".
    """

    def __init__(self, runner: CommandRunner, probe: str = "1.1.1.1") -> None:
        self._runner = runner
        self._probe = probe

    def addresses(self) -> Sequence[DiscoveredAddress]:
        argv = ["ip", "-json", "route", "get", self._probe]
        routes = parse_json(self._runner.run(argv), "ip route get")
        found: list[DiscoveredAddress] = []
        for route in routes:
            source = route.get("prefsrc")
            if not source:
                continue
            address = ipaddress.ip_address(source)
            if _is_usable(address):
                found.append(
                    DiscoveredAddress(address, route.get("dev", "?"), "default route")
                )
        return found


class StaticAddressSource:
    """Addresses the operator named explicitly, such as the public IP."""

    def __init__(self, values: Iterable[str], origin: str = "given") -> None:
        self._values = list(values)
        self._origin = origin

    def addresses(self) -> Sequence[DiscoveredAddress]:
        found: list[DiscoveredAddress] = []
        for value in self._values:
            try:
                address = ipaddress.ip_address(value.strip())
            except ValueError as exc:
                raise PkiError(f"{value!r} is not an IP address") from exc
            found.append(DiscoveredAddress(address, "-", self._origin))
        return found


class LoopbackAddressSource:
    """127.0.0.1 and ::1, so the server can also be opened on the host."""

    def addresses(self) -> Sequence[DiscoveredAddress]:
        return (
            DiscoveredAddress(ipaddress.ip_address("127.0.0.1"), "lo", "loopback"),
            DiscoveredAddress(ipaddress.ip_address("::1"), "lo", "loopback"),
        )


class TolerantAddressSource:
    """Wraps a source that may fail on this host and reports nothing instead."""

    def __init__(self, inner: AddressSource) -> None:
        self._inner = inner

    def addresses(self) -> Sequence[DiscoveredAddress]:
        try:
            return self._inner.addresses()
        except CommandError:
            return ()


class FirstAnsweringAddressSource:
    """The first source that finds anything wins. Used for lease, then route."""

    def __init__(self, sources: Sequence[AddressSource]) -> None:
        self._sources = list(sources)

    def addresses(self) -> Sequence[DiscoveredAddress]:
        for source in self._sources:
            found = source.addresses()
            if found:
                return found
        return ()


class MergedAddressSource:
    """Everything every source found, in order, without duplicates."""

    def __init__(self, sources: Sequence[AddressSource]) -> None:
        self._sources = list(sources)

    def addresses(self) -> Sequence[DiscoveredAddress]:
        seen: set[IpAddress] = set()
        merged: list[DiscoveredAddress] = []
        for source in self._sources:
            for found in source.addresses():
                if found.address in seen:
                    continue
                seen.add(found.address)
                merged.append(found)
        return merged

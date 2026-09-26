"""Running external commands.

Wrapped behind a protocol so address discovery can be exercised without a
real network stack.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any, Protocol, Sequence

from .errors import CommandError


class CommandRunner(Protocol):
    """Runs a command and returns its standard output."""

    def run(self, argv: Sequence[str]) -> str: ...


class SubprocessCommandRunner:
    """Runs the command with :mod:`subprocess`."""

    def __init__(self, timeout_seconds: float = 5.0) -> None:
        self._timeout_seconds = timeout_seconds

    def run(self, argv: Sequence[str]) -> str:
        if shutil.which(argv[0]) is None:
            raise CommandError(f"{argv[0]} is not installed")
        try:
            completed = subprocess.run(
                list(argv),
                capture_output=True,
                text=True,
                timeout=self._timeout_seconds,
                check=True,
            )
        except subprocess.TimeoutExpired as exc:
            raise CommandError(f"{' '.join(argv)} timed out") from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(
                f"{' '.join(argv)} failed: {exc.stderr.strip() or exc.returncode}"
            ) from exc
        return completed.stdout


class MappingCommandRunner:
    """Replays canned output. For tests."""

    def __init__(self, responses: dict[tuple[str, ...], str]) -> None:
        self._responses = responses

    def run(self, argv: Sequence[str]) -> str:
        try:
            return self._responses[tuple(argv)]
        except KeyError as exc:
            raise CommandError(f"no canned output for {' '.join(argv)}") from exc


def parse_json(output: str, source: str) -> Any:
    try:
        return json.loads(output)
    except json.JSONDecodeError as exc:
        raise CommandError(f"{source} did not return JSON") from exc

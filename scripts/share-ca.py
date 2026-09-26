#!/usr/bin/env python3
"""Hand the root certificate to a phone on the same network.

The phone cannot fetch the certificate over HTTPS, because not trusting this
CA yet is exactly the problem being solved. So this serves it over plain
HTTP, briefly, on the LAN -- which is safe for a root *certificate* (it is
public by nature) as long as two things hold:

* only that one file is reachable. Serving the pki/ directory with
  ``python3 -m http.server`` would publish ca.key.pem to the whole network.
* the fingerprint printed here matches the one the phone shows on install,
  which is what rules out a swap in transit.

    ./scripts/share-ca.py

Stop it with Ctrl-C once the phone has the file.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pki.addresses import (  # noqa: E402
    DefaultRouteAddressSource,
    DhcpLeaseAddressSource,
    FirstAnsweringAddressSource,
    TolerantAddressSource,
)
from pki.cli import DEFAULT_DIRECTORY  # noqa: E402
from pki.commands import SubprocessCommandRunner  # noqa: E402

# iOS only offers to install a configuration profile when the certificate
# arrives under this media type.
CERTIFICATE_MEDIA_TYPE = "application/x-x509-ca-cert"
DOWNLOAD_NAME = "present-home-ca.crt"


def certificate_handler(payload: bytes) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - name fixed by the base class
            if self.path not in ("/", f"/{DOWNLOAD_NAME}"):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", CERTIFICATE_MEDIA_TYPE)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, format: str, *args: object) -> None:
            # flush: when this runs in the background its output is a pipe,
            # and a buffered download log is worse than none.
            print(f"  {self.client_address[0]} -> {format % args}", flush=True)

    return Handler


def host_address() -> str:
    runner = SubprocessCommandRunner()
    source = FirstAnsweringAddressSource(
        [
            TolerantAddressSource(DhcpLeaseAddressSource(runner)),
            TolerantAddressSource(DefaultRouteAddressSource(runner)),
        ]
    )
    found = source.addresses()
    return str(found[0].address) if found else "localhost"


def fingerprint(path: Path) -> str:
    result = subprocess.run(
        ["openssl", "x509", "-in", str(path), "-noout", "-fingerprint", "-sha256"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip().split("=", 1)[-1] if result.returncode == 0 else "?"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIRECTORY, dest="directory")
    parser.add_argument("--port", type=int, default=8000)
    arguments = parser.parse_args(argv)

    certificate = arguments.directory / "ca.crt.pem"
    if not certificate.exists():
        print(f"error: {certificate} does not exist", file=sys.stderr)
        print("create the authority first: ./scripts/make-ca.py", file=sys.stderr)
        return 1

    url = f"http://{host_address()}:{arguments.port}/"
    print(f"Open this on the phone, in Safari:\n\n    {url}\n")
    # qr writes a PNG when stdout is not a terminal, so only ask for the
    # terminal rendering.
    if sys.stdout.isatty() and shutil.which("qr"):
        subprocess.run(["qr", url], check=False)
    print(f"\nIt should show this fingerprint on the install screen:\n")
    print(f"    SHA-256 {fingerprint(certificate)}\n")
    print("Only ca.crt.pem is reachable. Ctrl-C when the phone has it.")

    server = ThreadingHTTPServer(
        ("0.0.0.0", arguments.port), certificate_handler(certificate.read_bytes())
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

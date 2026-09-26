#!/usr/bin/env bash
# Boot Present over HTTPS on this machine's IP addresses.
#
# Does the whole job: finds the Go toolchain, builds the web bundle if it is
# missing, checks the certificate, then runs the server in the foreground.
# Ctrl-C stops it.
#
# Needs a certificate first, once:
#   ./scripts/make-ca.py && ./scripts/issue-cert.py
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKI_DIR="${PRESENT_PKI_DIR:-$ROOT/pki}"

export PRESENT_STATIC_DIR="${PRESENT_STATIC_DIR:-$ROOT/web/dist}"
export PRESENT_STATIC_KEY="${PRESENT_STATIC_KEY:-present-demo}"
export DATABASE_URL="${DATABASE_URL:-postgres://present:present@localhost:5432/present?sslmode=disable}"
export PRESENT_ADDR="${PRESENT_ADDR:-:8443}"
export PRESENT_TLS_CERT="${PRESENT_TLS_CERT:-$PKI_DIR/server.fullchain.pem}"
export PRESENT_TLS_KEY="${PRESENT_TLS_KEY:-$PKI_DIR/server.key.pem}"

# Go, wherever it lives on this machine.
if ! command -v go >/dev/null 2>&1; then
  for candidate in "$HOME/Installation/go/bin" /usr/local/go/bin /usr/lib/golang/bin; do
    if [[ -x "$candidate/go" ]]; then
      PATH="$candidate:$PATH"
      break
    fi
  done
fi
if ! command -v go >/dev/null 2>&1; then
  echo "Go is not installed, or not on PATH. See README." >&2
  exit 1
fi

# The certificate is the one thing this script will not create for you:
# a new CA has to be trusted on every device again, so that stays deliberate.
if [[ ! -f "$PRESENT_TLS_CERT" || ! -f "$PRESENT_TLS_KEY" ]]; then
  echo "No server certificate under $PKI_DIR." >&2
  echo "Run: ./scripts/make-ca.py && ./scripts/issue-cert.py" >&2
  exit 1
fi

if [[ ! -f "$PRESENT_STATIC_DIR/index.html" ]]; then
  echo "Building the web bundle..."
  (cd "$ROOT/web" && npm ci --silent && npm run build)
fi

# Build, then run the binary directly. `go run` would leave the real server
# as a child process that outlives a kill on this script's pid.
echo "Building the server..."
(cd "$ROOT/server" && go build -o present-server ./cmd/server)

# The addresses worth sharing are the ones the certificate actually covers,
# so read them back out of it rather than guessing again.
port="${PRESENT_ADDR##*:}"
echo
echo "Reachable at:"
openssl x509 -in "$PRESENT_TLS_CERT" -noout -ext subjectAltName |
  tr ',' '\n' |
  sed -n 's/.*IP Address:\(.*\)/\1/p' |
  tr -d ' ' |
  python3 -c '
import ipaddress, sys

port = sys.argv[1]
for line in sys.stdin:
    if not line.strip():
        continue
    address = ipaddress.ip_address(line.strip())
    host = f"[{address}]" if address.version == 6 else str(address)
    print(f"  https://{host}:{port}")
' "$port"
echo

cd "$ROOT/server"
exec ./present-server

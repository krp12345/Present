#!/usr/bin/env bash
# Optional public tunnel for phone testing.
#
# The server speaks HTTPS with a certificate from the private CA in ./pki,
# which cloudflared has no reason to trust, hence --no-tls-verify on the
# loopback hop to the origin.
set -euo pipefail

CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
PORT="${PORT:-8443}"

exec "$CLOUDFLARED" tunnel --no-tls-verify --url "https://localhost:${PORT}"

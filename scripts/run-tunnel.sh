#!/usr/bin/env bash
set -euo pipefail

CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
PORT="${PORT:-8080}"

exec "$CLOUDFLARED" tunnel --url "http://localhost:${PORT}"

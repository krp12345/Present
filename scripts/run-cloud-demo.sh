#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export PRESENT_STATIC_DIR="$ROOT/web/dist"
export PRESENT_STATIC_KEY="${PRESENT_STATIC_KEY:-present-demo}"
export DATABASE_URL="${DATABASE_URL:-postgres://present:present@localhost:5432/present?sslmode=disable}"

cd "$ROOT/server"
go run ./cmd/server

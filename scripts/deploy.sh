#!/usr/bin/env bash
# Deploy Present to Firebase: Firestore rules + indexes and the web app on
# Hosting. Builds the web app first.
#
#   ./scripts/deploy.sh                 # uses the project in .firebaserc
#   ./scripts/deploy.sh my-project-id   # or name it explicitly
#
# First time only: see "Deploying to Firebase" in README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

project_args=()
if [[ $# -ge 1 ]]; then
  project_args=(--project "$1")
elif grep -q '"your-firebase-project-id"' .firebaserc; then
  echo "Set your Firebase project id in .firebaserc, or run: $0 <project-id>" >&2
  exit 1
fi

[[ -d node_modules ]] || npm ci
npx firebase deploy --only hosting,firestore "${project_args[@]}"

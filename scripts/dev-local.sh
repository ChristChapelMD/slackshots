#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting SlackShots locally..."
echo "App URL: http://localhost:3000"
echo

npm run index:worker &
INDEXER_PID=$!

cleanup() {
  if kill -0 "${INDEXER_PID}" >/dev/null 2>&1; then
    echo
    echo "Stopping SlackShots indexer..."
    kill "${INDEXER_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

BETTER_AUTH_URL="http://localhost:3000" \
  LOCAL_DEV_AUTH_BYPASS="true" \
  NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS="true" \
  NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  SLACK_OAUTH2_V2_REDIRECT_URI="http://localhost:3000/api/slack/oauth2_v2/callback" \
  npm run dev:next -- --port 3000

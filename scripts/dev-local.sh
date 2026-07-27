#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting SlackShots locally..."
echo "App URL: http://localhost:3000"
echo

BETTER_AUTH_URL="http://localhost:3000" \
  LOCAL_DEV_AUTH_BYPASS="true" \
  NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS="true" \
  NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  SLACK_OAUTH2_V2_REDIRECT_URI="http://localhost:3000/api/slack/oauth2_v2/callback" \
  npm run dev:next -- --port 3000

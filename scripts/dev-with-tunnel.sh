#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Error: cloudflared is not installed."
  echo "Install it first or use: npm run dev:local"
  exit 1
fi

TUNNEL_NAME="${1:-${CLOUDFLARED_TUNNEL_NAME:-}}"

if [[ -z "${TUNNEL_NAME}" ]]; then
  echo "Error: missing tunnel name."
  echo "Usage: npm run dev:tunnel -- <tunnel-name>"
  echo "Or set environment variable: CLOUDFLARED_TUNNEL_NAME=<tunnel-name>"
  exit 1
fi

echo "Starting cloudflared tunnel: ${TUNNEL_NAME}"
cloudflared tunnel run "${TUNNEL_NAME}" &
TUNNEL_PID=$!

cleanup() {
  if kill -0 "${TUNNEL_PID}" >/dev/null 2>&1; then
    echo
    echo "Stopping cloudflared tunnel..."
    kill "${TUNNEL_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting SlackShots dev server..."
echo "Tunnel process PID: ${TUNNEL_PID}"
echo

npm run dev:next -- --port 3000

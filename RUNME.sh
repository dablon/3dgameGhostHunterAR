#!/usr/bin/env bash
# ====================================================================
#  RUNME.sh — boot the 3D game in your browser.
#  Requirements: Node.js 20+ on PATH (https://nodejs.org).
# ====================================================================
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-5173}"
URL="http://localhost:${PORT}"

echo
echo "[RUNME] Working directory: $(pwd)"
echo

# ---- 1. Sanity check Node ----
if ! command -v node >/dev/null 2>&1; then
  echo "[RUNME] FATAL: 'node' is not on PATH. Install Node.js 20+ and try again."
  exit 1
fi
echo "[RUNME] Node version: $(node --version)"

# ---- 2. Install dependencies on first run ----
if [ ! -d node_modules ]; then
  echo "[RUNME] First run detected. Installing dependencies via npm install ..."
  npm install --no-audit --no-fund
else
  echo "[RUNME] node_modules present. Skipping install."
fi

# ---- 3. Start dev server in background ----
echo "[RUNME] Starting Vite dev server on port ${PORT} ..."
npm run dev &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT INT TERM

# ---- 4. Wait for the server to respond ----
echo "[RUNME] Waiting for server to be reachable ..."
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 2 "${URL}" 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "[RUNME] Server is up at ${URL}"

# ---- 5. Open browser ----
echo "[RUNME] Opening default browser ..."
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}" >/dev/null 2>&1 &
elif command -v open    >/dev/null 2>&1; then
  open    "${URL}" >/dev/null 2>&1 &
elif command -v wslview >/dev/null 2>&1; then
  wslview "${URL}" >/dev/null 2>&1 &
else
  echo "[RUNME] Could not auto-open a browser. Open ${URL} manually."
fi

echo
echo "[RUNME] ========================================================="
echo "[RUNME]  Game is running. Press Ctrl+C to stop the server."
echo "[RUNME] ========================================================="
echo

wait "${SERVER_PID}"

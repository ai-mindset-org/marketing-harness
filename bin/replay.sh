#!/usr/bin/env bash
# Replay mode without a folder: the scripted build from web/scenario.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4747}"
node "$ROOT/tools/build-scenario.mjs"
node "$ROOT/tools/harness-server.mjs" --dir "$ROOT/kit/files" --port "$PORT" &
trap 'kill $! 2>/dev/null || true' EXIT INT TERM
sleep 0.5; open "http://localhost:$PORT/" 2>/dev/null || true
wait

#!/usr/bin/env bash
# Open an existing harness folder in the live instrument (graph + console).
#   bin/open.sh ~/harness/marketing        then work in the folder with claude / codex
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$(cd "${1:?укажи папку харнесса}" && pwd)"
PORT="${PORT:-4747}"
lsof -ti tcp:"$PORT" >/dev/null 2>&1 && { echo "порт $PORT занят – bin/stop.sh"; exit 1; }
node "$ROOT/tools/harness-server.mjs" --dir "$DIR" --port "$PORT" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT INT TERM
sleep 0.6
URL="http://localhost:$PORT/?mode=live"
[[ "${NO_OPEN:-0}" == 1 ]] || { open "$URL" 2>/dev/null || true; open "$DIR" 2>/dev/null || true; }
cat <<MSG
граф:     $URL   (вкладка «консоль» – claude, codex, сотник)
папка:    $DIR   (Obsidian: Open folder as vault)
агент:    cd "$DIR" && claude
Ctrl-C – остановить сервер.
MSG
wait $SERVER

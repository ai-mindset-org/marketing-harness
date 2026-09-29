#!/usr/bin/env bash
# Live build of a marketing harness into an empty folder.
#   bin/demo.sh [folder] [--pace 1] [--agents] [--model sonnet] [--answers file.json]
# Opens http://localhost:4747/?mode=live and grows the folder phase by phase.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$HOME/Demos/marketing-harness-$(date +%Y-%m-%d-%H%M)}"
[[ "${1:-}" == --* ]] && DIR="$HOME/Demos/marketing-harness-$(date +%Y-%m-%d-%H%M)" || shift || true
PORT="${PORT:-4747}"
NODE="$(command -v node || echo /opt/homebrew/opt/node@20/bin/node)"

node_ok() { "$NODE" -e 'process.exit(Number(process.versions.node.split(".")[0])>=18?0:1)'; }
node_ok || { echo "нужен node ≥ 18"; exit 1; }

mkdir -p "$DIR"
lsof -ti tcp:"$PORT" >/dev/null 2>&1 && { echo "порт $PORT занят – останови старый сервер: bin/stop.sh"; exit 1; }
"$NODE" "$ROOT/tools/harness-server.mjs" --dir "$DIR" --port "$PORT" > "$ROOT/.server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT INT TERM
sleep 0.6
URL="http://localhost:$PORT/?mode=live"
[[ "${NO_OPEN:-0}" == 1 ]] || open "$URL" 2>/dev/null || true
echo "граф: $URL"
"$NODE" "$ROOT/tools/harness-demo.mjs" --dir "$DIR" "$@"
echo "сервер жив, граф открыт. Ctrl-C – остановить."
wait $SERVER

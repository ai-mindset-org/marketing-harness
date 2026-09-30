#!/usr/bin/env bash
# Open a harness folder in the live instrument: graph, file editor, agent console.
#   ~/harness-engine/bin/open.sh ~/harness/marketing-sprint
# Already running for this folder → just opens the browser. Port busy with another
# folder → takes the next free port. Stop: <engine>/bin/stop.sh [port]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ -d "${1:-}" ]] || { echo "папки нет: ${1:-<не указана>}"; echo "пример: $ROOT/bin/open.sh ~/harness/marketing-sprint"; exit 1; }
DIR="$(cd "$1" && pwd)"
command -v node >/dev/null || { echo "нужен node ≥ 18: brew install node"; exit 1; }
. "$ROOT/bin/_port.sh"
read -r MODE PORT < <(harness_port "$DIR")
URL="http://localhost:$PORT/?mode=live&intro=0"
if [[ "$MODE" == reuse ]]; then
  echo "уже запущен для этой папки: $URL"
  [[ "${NO_OPEN:-0}" == 1 ]] || open "$URL" 2>/dev/null || true
  exit 0
fi
[[ "$MODE" == new ]] || { echo "свободного порта нет: $ROOT/bin/stop.sh"; exit 1; }
node "$ROOT/tools/harness-server.mjs" --dir "$DIR" --port "$PORT" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT INT TERM
sleep 0.6
[[ "${NO_OPEN:-0}" == 1 ]] || open "$URL" 2>/dev/null || true
cat <<MSG
граф:     $URL
          консоль – claude, codex, сотник; правка файлов; Obsidian
папка:    $DIR
агент:    cd "$DIR" && claude
стоп:     Ctrl-C здесь или $ROOT/bin/stop.sh $PORT
MSG
wait $SERVER

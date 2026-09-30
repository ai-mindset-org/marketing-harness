#!/usr/bin/env bash
# Stop the harness server: <engine>/bin/stop.sh [port]   (default 4747)
# Only the process that listens on the port: a browser tab connected to it stays alive.
PORT="${1:-${PORT:-4747}}"
PIDS="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null)"
[[ -n "$PIDS" ]] || { echo "на $PORT ничего нет"; exit 0; }
kill $PIDS 2>/dev/null && echo "сервер на $PORT остановлен"

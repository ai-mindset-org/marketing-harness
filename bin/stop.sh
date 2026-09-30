#!/usr/bin/env bash
# Stop the harness server: <engine>/bin/stop.sh [port]   (default 4747)
PORT="${1:-${PORT:-4747}}"
lsof -ti tcp:"$PORT" | xargs kill 2>/dev/null && echo "сервер на $PORT остановлен" || echo "на $PORT ничего нет"

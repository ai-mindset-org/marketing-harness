#!/usr/bin/env bash
PORT="${PORT:-4747}"
lsof -ti tcp:"$PORT" | xargs kill 2>/dev/null && echo "сервер на $PORT остановлен" || echo "на $PORT ничего нет"

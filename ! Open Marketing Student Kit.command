#!/bin/bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kit_dir="$repo_dir/student-kit"

choose_port() {
  local start="$1" candidate
  for ((candidate=start; candidate<start+50; candidate++)); do
    if ! lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return
    fi
  done
  return 1
}

qa_port=4750
if ! curl -fsS "http://127.0.0.1:$qa_port/qa-dashboard/" 2>/dev/null | grep -q 'QA обзор страниц'; then
  qa_port="$(choose_port 4750)"
  nohup python3 -m http.server "$qa_port" --bind 127.0.0.1 --directory "$kit_dir" >"${TMPDIR:-/tmp}/marketing-student-kit-qa-$qa_port.log" 2>&1 &
fi

editor_port=8790
if ! curl -fsS "http://127.0.0.1:$editor_port/" 2>/dev/null | grep -q 'Локальный редактор'; then
  editor_port="$(choose_port 8790)"
  PORT="$editor_port" nohup node "$kit_dir/editable-pages/editor.mjs" >"${TMPDIR:-/tmp}/marketing-student-kit-editor-$editor_port.log" 2>&1 &
fi

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:$qa_port/qa-dashboard/" >/dev/null 2>&1 && curl -fsS "http://127.0.0.1:$editor_port/" >/dev/null 2>&1; then break; fi
  sleep 0.25
done

open "http://127.0.0.1:$qa_port/qa-dashboard/"
open "http://127.0.0.1:$editor_port/"
printf 'QA: http://127.0.0.1:%s/qa-dashboard/\nРедактор: http://127.0.0.1:%s/\n' "$qa_port" "$editor_port"

#!/usr/bin/env bash
# Deploy the template into a new folder instantly and open it live.
#   bin/new.sh ~/harness/my-product [b2b-consultant|b2c-shop|saas-founder]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:?укажи новую папку}"
PRESET="${2:-}"
node "$ROOT/tools/build-scenario.mjs" >/dev/null
node "$ROOT/tools/harness-demo.mjs" --dir "$DIR" --pace 0 ${PRESET:+--preset "$PRESET"}
exec "$ROOT/bin/open.sh" "$DIR"

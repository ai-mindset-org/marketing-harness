#!/usr/bin/env bash
# A copy of a harness folder with its whole git history, to try something without risk.
#   bin/fork.sh <from> <to> [--at <commit>]
# --at: the copy starts at that commit (an old version); later commits are not in it.
# Committed state only: uncommitted edits stay in <from>. Obsidian settings come along.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FROM="${1:?откуда: папка харнесса}"; TO="${2:?куда: новая папка}"; AT=""
[[ "${3:-}" == --at ]] && AT="${4:?--at <коммит>}"
FROM="$(cd "$FROM" && pwd)"
[[ -d "$FROM/.git" ]] || { echo "в $FROM нет git: форк берёт историю из git"; exit 1; }
[[ -e "$TO" ]] && { echo "папка уже есть: $TO"; exit 1; }
git clone -q --no-hardlinks "$FROM" "$TO"
cd "$TO"
git remote rename origin source
if [[ -n "$AT" ]]; then git reset -q --hard "$AT"; fi
git config core.hooksPath .githooks
[[ -d "$FROM/.obsidian" ]] && rsync -a --exclude 'workspace*' "$FROM/.obsidian/" "$TO/.obsidian/"
UP="$(git -C "$FROM" remote get-url origin 2>/dev/null || true)"
cat <<MSG
форк:     $TO  ($(git log -1 --format='%h %s' | cut -c1-70))
откуда:   $FROM${AT:+ · с коммита $AT}
открыть:  $ROOT/bin/open.sh "$TO"
${UP:+свой GitHub: gh repo create <имя> --private --source "$TO" --push   (исходник: $UP)}
MSG

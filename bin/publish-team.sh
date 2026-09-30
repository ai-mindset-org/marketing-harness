#!/usr/bin/env bash
# Publish the team view of a harness folder: export state.json into the internal site
# and push lab-sites only when the folder's git HEAD changed.
#   bin/publish-team.sh [folder] [lab-sites clone]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$HOME/harness/marketing-sprint}"
SITES="${2:-$HOME/repos/lab-sites}"
OUT="$SITES/internal-sites/marketing-harness/team/state.json"
git -C "$DIR" pull -q --ff-only 2>/dev/null || true
HEAD="$(git -C "$DIR" rev-parse --short HEAD)"
# compare with what is already published (committed), not with a leftover local file
if git -C "$SITES" show "HEAD:internal-sites/marketing-harness/team/state.json" 2>/dev/null | grep -q "\"head\":\"$HEAD\""; then echo "без изменений · $HEAD"; exit 0; fi
node "$ROOT/tools/export-state.mjs" --dir "$DIR" --out "$OUT"
# the same folder as a zip: download, unpack, open in the browser or with bin/open.sh
git -C "$DIR" archive --prefix="$(basename "$DIR")/" -o "$(dirname "$OUT")/$(basename "$DIR").zip" HEAD
cd "$SITES"
git pull -q --rebase
command -v gitleaks >/dev/null && gitleaks detect --no-git --source internal-sites/marketing-harness/team --redact --no-banner --log-level error
git add internal-sites/marketing-harness/team/
git commit -q -m "marketing-harness: командный вид · $(basename "$DIR") $HEAD"
git push -q
echo "опубликовано · $HEAD → content.aimindset.org/marketing-harness/?mode=team"

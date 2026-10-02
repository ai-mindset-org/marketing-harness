#!/usr/bin/env bash
# deploy-site.sh – publish the guide, About and Demo: open copy (marketing-harness.lab.aimindset.org)
# and the team's internal show (content.aimindset.org/marketing-harness/, keeps its team/ state)
# usage: bin/deploy-site.sh [path to a lab-sites clone, default ~/repos/lab-sites]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAB="${1:-$HOME/repos/lab-sites}"
[[ -d "$LAB/.git" ]] || { echo "нет клона lab-sites: gh repo clone ai-mindset-org/lab-sites $LAB"; exit 1; }
command -v gitleaks >/dev/null || { echo "нужен gitleaks: brew install gitleaks"; exit 1; }
cd "$ROOT"
[[ -z "$(git status --porcelain)" ]] || { echo "в движке незакоммиченные правки – сначала commit и push"; exit 1; }
git pull -q --rebase
node tools/build-scenario.mjs
git -C "$LAB" pull -q --rebase
for D in sites/marketing-harness internal-sites/marketing-harness; do
  mkdir -p "$LAB/$D"
  rsync -a --delete --exclude marketing-harness-kit.zip --exclude team/ web/ "$LAB/$D/"
  git archive --prefix=marketing-harness/ -o "$LAB/$D/marketing-harness-kit.zip" HEAD
  gitleaks detect --no-git --source "$LAB/$D" --no-banner --log-level error
done
cd "$LAB"
git add sites/marketing-harness internal-sites/marketing-harness
git diff --cached --quiet && { echo "сайт уже совпадает с движком $(git -C "$ROOT" rev-parse --short HEAD)"; exit 0; }
git commit -q -m "marketing-harness: сайт из движка $(git -C "$ROOT" rev-parse --short HEAD)"
git push -q
echo "выкачено: https://marketing-harness.lab.aimindset.org/ и https://content.aimindset.org/marketing-harness/ – через минуту"

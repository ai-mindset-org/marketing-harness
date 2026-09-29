---
title: Playwright
aliases: [плейрайт]
---
# Playwright

**Зачем:** управляемый браузер. В харнессе – две задачи: превращает HTML-карусель в PDF для LinkedIn и PNG для Instagram ([[{design} carousel]]), и собирает Ads Library в [[{skill} adlib-recon]].

## где включить
- основной путь, Python без установки в проект: `uv run --with playwright python …` (браузер: `uv run --with playwright python -m playwright install chromium`);
- второй путь, через node: `npm install -D playwright && npx playwright install chromium`;
- после обновления Node выполни `npx playwright install chromium` ещё раз.

## проверка
`node bin/render.mjs all --pdf` – рядом с HTML карусели появляется PDF. без Playwright рендер пишет только HTML: его можно открыть в браузере и распечатать в PDF вручную (размер страницы 1080×1350 уже задан).

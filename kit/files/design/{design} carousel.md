---
title: карусель
aliases: [карусель, документ LinkedIn]
---
# карусель

Документ-карусель – главный формат механики в LinkedIn: документы и мультифото дают +16% охвата ([[{research} linkedin 2026 – 2026-09-29]]). Карусель ради «листай дальше» без содержания площадка подавляет: на каждом слайде – шаг, цифра или пример.

## формат
- 1080×1350 (4:5), 6–8 слайдов, PDF для LinkedIn, PNG для Instagram;
- слайд 1 и последний – тёмные, штамп жёлтый; внутренние – бумага с сеткой;
- текст слайда 6–25 слов, Inter 800, 64px (обложка 92px);
- подпись сверху `fig. NN/NN · тема`, снизу – визуальная подсказка и подпись бренда.

## бриф
пишет [[{skill} carousel-brief]]: таблица «слайд · текст · визуал», `*ключевое слово*`, `_акцент_`.

## рендер
```bash
node bin/render.mjs carousel "outputs/carousel/{carousel} car-01 weekly loop.md"         # HTML
node bin/render.mjs carousel "outputs/carousel/{carousel} car-01 weekly loop.md" --pdf   # + PDF (Playwright)
```
пример: `outputs/carousel/{carousel} car-01 weekly loop.html`.

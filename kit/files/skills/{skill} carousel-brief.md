---
name: carousel-brief
description: Use when нужна карусель – документ LinkedIn или Instagram – из нуклеуса. Готовит покадровый бриф, который рендерит bin/render.mjs. Триггеры – карусель, слайды, carousel, документ для LinkedIn.
---
# carousel-brief

6–8 слайдов, одна мысль на слайд. сетка и типографика – [[{design} carousel]].

| слайд | роль | слов |
|---|---|---|
| 1 | хук из [[{rule} creative-codes]] крупно | 6–12 |
| 2 | проблема в сцене | 12–25 |
| 3–6 | механика по шагам, у шага цифра или пример | 10–25 |
| 7 | что сделать завтра | 10–20 |
| 8 | CTA и код в utm | 6–12 |

файл `outputs/carousel/{carousel} car-NN <slug>.md`: frontmatter как у черновика плюс таблица «слайд · текст · визуал». рендер: `node bin/render.mjs carousel "<файл>"` → HTML рядом (1080×1350), с Playwright ещё PDF для LinkedIn. проверка текста – [[{rule} anti-slop]].

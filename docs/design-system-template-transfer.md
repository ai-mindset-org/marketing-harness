# Перенос шаблона дизайн-системы

Источник структуры: [AIM material system](https://aimindset-design.web.app/material-system/). До интеграции очищенный шаблон находился в локальном каталоге `Design System Template/` проекта AI Mindset. Файлы ниже скопированы без переименования; изменения сайта-хозяина перечислены отдельно. Исходный каталог сохранён для отката и сравнения.

| src (`Design System Template/`) | dst (`marketing-harness/`) |
| --- | --- |
| `index.html` | `web/design-system-template/index.html` |
| `aim-material-system.css` | `web/design-system-template/aim-material-system.css` |
| `aim-material-system.js` | `web/design-system-template/aim-material-system.js` |
| `template-preview.css` | `web/design-system-template/template-preview.css` |
| `template-values.json` | `web/design-system-template/template-values.json` |
| `components/editorial-copy.css` | `web/design-system-template/components/editorial-copy.css` |
| `components/editorial-copy.js` | `web/design-system-template/components/editorial-copy.js` |
| `components/live-examples.js` | `web/design-system-template/components/live-examples.js` |
| `components/section-card-scenes.js` | `web/design-system-template/components/section-card-scenes.js` |
| `components/section-card.css` | `web/design-system-template/components/section-card.css` |
| `site/program-morph.js` | `web/design-system-template/site/program-morph.js` |
| `site/responsive-spec.css` | `web/design-system-template/site/responsive-spec.css` |
| `site/site-composition.css` | `web/design-system-template/site/site-composition.css` |
| `site/site-scoped.css` | `web/design-system-template/site/site-scoped.css` |

Дополнительно созданы `web/design-system-template/README.md` и эта запись. В копии `index.html` заменены несколько брендовых текстов примеров и заполненные значения типографической таблицы; структура и кнопки сохранены. Для входа на страницу добавлены ссылки в `web/index.html`, `web/guide.html`, `web/access.html`. Для GitHub Pages подготовлен `.github/workflows/pages.yml`. Путь отката после публикации: отмена соответствующего Git-коммита без затрагивания исходного каталога.

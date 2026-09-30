---
title: нейминг
aliases: [нейминг-конвенция]
---
# нейминг

Имя файла сообщает тип, тему и, для снимков, дату. Машина сортирует и фильтрует по типу, человек находит глазами, Obsidian строит граф по тем же именам.

## формат
- живой файл: `{тип} имя.md` – `{rule} anti-slop.md`, `{skill} content-factory.md`, `{tool} exa.md`;
- снимок на дату: `{тип} имя – YYYY-MM-DD.md` – `{research} linkedin 2026 – 2026-09-29.md`, `{dashboard} weekly – 2026-09-29.md`;
- имя латиницей, строчными; слова через пробел, устойчивые термины и имена скиллов через дефис (`anti-slop`, `content-factory`); русское название – в `aliases` во frontmatter;
- дата всегда в конце, после короткого тире;
- при переименовании ссылки `[[…]]` правятся в том же коммите (Obsidian делает это сам).

## типы и ветки
| тип | ветка | живой или снимок |
|---|---|---|
| `{context}` | context/ | живой |
| `{rule}` | rules/ | живой |
| `{tool}` | tools/ | живой |
| `{skill}` | skills/ | живой |
| `{eval}` | evals/ | рубрика и golden set живые, scorecard и checks – снимки |
| `{design}` | design/ | живой |
| `{guide}` | guides/ | живой |
| `{source}` | sources/ | снимок |
| `{research}` | research/ | снимок |
| `{nucleus}` | nuclei/ | живой, с номером: `{nucleus} n01 two conveyors` |
| `{post}` | outputs/linkedin, outputs/telegram | живой, с номером: `{post} li-01 fake winner` |
| `{carousel}` · `{landing}` | outputs/carousel, outputs/landing | живой |
| `{cover}` | outputs/covers | живой, с номером: `{cover} tg-01 two conveyors` |
| `{dashboard}` | dashboards/ | снимок |
| `{session}` | sessions/ | снимок: `{session} claude content-factory 11-38 – 2026-09-30`, пишет сервер харнесса |

## исключения
`README.md`, `AGENTS.md`, `CLAUDE.md` и код в `bin/`, `tools/mcp/`, `design/assets/` – без типа: их имена читают программы.

## frontmatter черновика
`nucleus`, `channel`, `segment`, `code`, `status` (draft · checked · approved · published), `score`. Проверяет [[{eval} checks]].

---
title: LMS AI Mindset
aliases: [лмс, learn.aimindset.org]
---
# LMS AI Mindset

**Зачем:** транскрипты и чаты занятий лабы как сырьё для харнесса. Загрузчик забирает запись в `sources/`, дальше экстрактор вынимает нуклеусы. Скилл [[{skill} lms-ingest]].

## что умеет API
публичный API v1 на `https://learn.aimindset.org/api/v1`, только чтение:
| вызов | что отдаёт | scope |
|---|---|---|
| `GET /api/v1` | проверка, без токена | – |
| `GET /api/v1/me` | чей токен, scopes, доступные лабы | любой |
| `GET /api/v1/sessions?lab=…` | список занятий лабы | `sessions:read` |
| `GET /api/v1/sessions/{id}` | детали занятия | `sessions:read` |
| `GET /api/v1/sessions/{id}/transcript` | транскрипт, имена скрыты | `transcripts:read` |
| `GET /api/v1/sessions/{id}/chat` | чат занятия, имена скрыты | `chats:read` |
Документация: `learn.aimindset.org/cabinet/api-docs`, спецификация `…/api/v1/openapi.yaml`. На вкладке API-docs можно скачать markdown-версию, её удобно отдать агенту.

## где включить
1. войти на learn.aimindset.org;
2. `https://learn.aimindset.org/cabinet/api-keys`, раздел «API-ключи» → создать персональный токен: scopes `sessions:read`, `transcripts:read`, при нужде `chats:read`; лабы – только свои. `pii:read` не берём;
3. токен показывается один раз: `export AIM_LMS_TOKEN=<токен>` в `~/.zshrc`;
4. раздела «API-ключи» нет или страница не пускает – обнови страницу с очисткой кэша, затем напиши в @aimindset_support.

## подключение к агенту
MCP-сервер лежит в папке: `tools/mcp/lms.mjs`, без зависимостей, только чтение. В `.mcp.json`:
```json
"lms": { "command": "node", "args": ["tools/mcp/lms.mjs"], "env": { "AIM_LMS_TOKEN": "${AIM_LMS_TOKEN}" } }
```
инструменты агента: `lms_health`, `lms_me`, `lms_sessions`, `lms_session`, `lms_transcript`, `lms_chat`.

## проверка без агента
```bash
node tools/mcp/lms.mjs cli health             # {"ok": true}
node tools/mcp/lms.mjs cli me                 # scopes и лабы токена; slug лабы `marketing` должен быть в списке
node tools/mcp/lms.mjs cli sessions marketing # занятия маркетинг-спринта
```
нет доступа к лабе или slug не виден – @aimindset_support.

## границы
имена в транскриптах скрыты по умолчанию, так и храним; чаты занятий в публичные тексты не цитируем: [[{rule} sources-and-consent]].

---
title: установка харнесса
aliases: [сетап, установка]
---
# установка харнесса

От пустого компьютера до первого проверенного поста. Шаги 1–4 обязательны, 5–12 – когда появилась задача.

## 0 · выбери маршрут
| маршрут | для кого | что нужно |
|---|---|---|
| только чат | Claude в окне браузера, терминал не открывали | проект на claude.ai, файлы папки загружаешь в проект руками |
| терминал | готов открыть терминал и набрать `claude` | шаги 1–4 |
| агенты | уже запускаешь агентов, хочешь параллель и сервер | шаги 1–8 |

## 1 · Claude Code
1. подписка Claude Pro или Max;
2. терминал: `curl -fsSL https://claude.ai/install.sh | bash`;
3. `claude --version` показывает версию. подробности – [[{tool} claude-code]].

## 2 · папка харнесса
вариант А – готовый набор: распакуй архив и выполни
```bash
bin/demo.sh ~/harness/my-product --pace 0 --preset b2b-consultant   # мгновенно, пресет ближайшего архетипа
```
пресеты: `b2b-consultant`, `b2c-shop`, `saas-founder`. без пресета – пример маркетинг-спринта.

вариант Б – руками: пустая папка, `git init`, файлы по образцу этой папки: `AGENTS.md`, `CLAUDE.md`, `context/`, `rules/`, `skills/`.

где живёт папка: на своём компьютере, под git. Dropbox и iCloud для этой папки не используем. подробности – [[README]], шаг ноль.

## 3 · контекст из анкеты
открой папку в Claude Code (`cd ~/harness/my-product && claude`) и скажи:
> прочитай AGENTS.md и задай мне семь вопросов анкеты по одному; ответы разложи в context/

или заполни `context/{context} product.md`, `{context} audience.md`, `{context} voice.md`, `{context} truth-pack.md` сам. не знаешь ответа – оставь пустым, агент спросит позже.

## 4 · скиллы и первая проверка
```bash
node bin/sync-skills.mjs    # зеркала для Claude Code и Codex
node bin/check.mjs --golden # регрессия: 6/6
```
в сессии набери `/` – видны `content-factory`, `slop-check` и другие.

## 5 · Obsidian (по желанию)
«Open folder as vault» → папка харнесса. граф показывает ветки цветами. [[{tool} obsidian]].

## 6 · Exa (ресёрч)
ключ на dashboard.exa.ai → `export EXA_API_KEY=<ключ>` в `~/.zshrc` → новый терминал → в сессии `/mcp` показывает `exa`. [[{tool} exa]].

## 7 · LMS (записи занятий)
токен в кабинете learn.aimindset.org → `export AIM_LMS_TOKEN=<токен>` → проверка `node tools/mcp/lms.mjs cli me`. [[{tool} lms]].

## 8 · живой граф и агенты
для команды и тех, кто хочет видеть сборку: инструмент `marketing-harness-sim`, команда `bin/open.sh <папка>` открывает граф этой папки в браузере; консоль там же запускает Claude или Codex.

## 9 · Telegram
бот от @BotFather для публикации в канал или своя сессия MTProto для черновиков; одна сессия на один компьютер, агент в каналы сам не пишет. [[{tool} telegram]].

## 10 · Gemini
ключ на aistudio.google.com/apikey → `export GEMINI_API_KEY=<ключ>`; проверка заголовком `x-goog-api-key`. [[{tool} gemini]].

## 11 · Apify
свой аккаунт и свой токен на console.apify.com → `export APIFY_TOKEN=<токен>`; общего аккаунта нет. [[{tool} apify]].

## 12 · LinkedIn
уровень 1 без ключей; уровни 2 и 3 – по карточке, имена переменных бери из README набора linkedin-skills. [[{tool} linkedin]].

## ключи
все ключи – в `~/.zshrc` (или в связке ключей macOS, см. ниже), в папке их нет, в чат их не вставляем: [[{rule} boundaries]]. проверить, что ничего не утекло: `git grep -nE "(sk-|ghp_|Bearer [A-Za-z0-9])"` возвращает пусто.

связка ключей macOS: положить значение (команда спросит его на вводе) – `security add-generic-password -s EXA_API_KEY -a "$USER" -w`; прочитать в `~/.zshrc` – `export EXA_API_KEY="$(security find-generic-password -s EXA_API_KEY -w)"`. Так же для остальных ключей, сервис называем именем переменной.

## что делать, если
- `claude` не находится – перезапусти терминал после установки;
- скилл не виден – `node bin/sync-skills.mjs`, потом новая сессия; если глобальных скиллов у тебя сотни, список может обрезаться – скажи агенту прочитать `skills/{skill} <имя>.md`;
- `/mcp` пустой – не задана переменная ключа: `echo $EXA_API_KEY` пусто → добавь в `~/.zshrc` и открой новый терминал.

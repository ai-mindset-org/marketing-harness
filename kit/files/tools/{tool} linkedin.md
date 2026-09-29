---
title: LinkedIn
aliases: [линкедин]
---
# LinkedIn

**Зачем:** главный канал B2B-сегмента (26 из 66 анкет когорты). Схема – [[{rule} linkedin soft outreach]], скиллы – [[{skill} linkedin-post]], [[{skill} linkedin-profile]], [[{skill} linkedin-engage]], данные – [[{research} linkedin 2026 – 2026-09-29]].

## три уровня подключения
**1 · руками (по умолчанию).** Агент готовит текст и PDF карусели в `outputs/`, человек публикует из окна LinkedIn. Ключей не нужно.

**2 · набор скиллов Булаева.** `github.com/sergebulaev/linkedin-skills` (MIT, 12 скиллов: пост, черновики комментариев, ответы, хьюманайзер, профиль, планировщик, аналитика вовлечения и другие). Установка в Claude Code: `/plugin` → добавить маркетплейс репозитория → поставить `linkedin-skills`. Для публикации и сбора данных нужны его сервисы:
- Publora – публикация и лайки через официальный API LinkedIn, базовый план около $3–4 в месяц, 15 постов бесплатно;
- HarvestAPI или Apify – посты и вовлечённые люди по ICP; бюджет демо Булаева $20, поддержание около $1 в день.
имена переменных для Publora и HarvestAPI бери из README набора linkedin-skills, придуманные имена не используй. ключи сервисов – в `~/.zshrc`, в чат не вставляем.

**3 · своё приложение LinkedIn (для разработчиков).**
1. linkedin.com/developers → Create app; приложению нужна страница компании, которой ты управляешь;
2. названия продуктов LinkedIn меняются, сверь их в день настройки. Вкладка Products: «Sign In with LinkedIn using OpenID Connect» и «Share on LinkedIn» (даёт `w_member_social` – публикация от своего имени);
3. вкладка Auth: redirect URL, scopes `openid profile w_member_social`;
4. OAuth даёт токен на 60 дней: `export LINKEDIN_ACCESS_TOKEN=<токен>`;
5. публикация: `POST https://api.linkedin.com/rest/posts` с заголовками `LinkedIn-Version: <ГГГГММ>` (версия API живёт около 12 месяцев, актуальное значение бери в документации LinkedIn) и `X-Restli-Protocol-Version: 2.0.0`; PDF-карусель сначала загружается через Documents API, потом пост ссылается на её URN;
6. публикация от страницы компании требует Community Management API – это партнёрская программа с заявкой.

## правила площадки
автоматические комментарии и сбор профилей вне официальных API нарушают пользовательское соглашение. харнесс готовит черновики, человек утверждает: [[{rule} boundaries]].

## проверка
уровень 1 – PDF открывается и листается; уровень 2 – `/plugin` показывает `linkedin-skills`; уровень 3 – `curl -H "Authorization: Bearer $LINKEDIN_ACCESS_TOKEN" https://api.linkedin.com/v2/userinfo` возвращает имя.

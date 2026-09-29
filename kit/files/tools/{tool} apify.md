---
title: Apify
aliases: [апифай]
---
# Apify

**Зачем:** готовые сборщики публичных данных: Meta Ads Library, Instagram, TikTok, X, Reddit, LinkedIn-посты. Кумар подключает Apify к Claude и Codex для разведки рекламы, Урбан каждое утро в 11:00 собирает залетевшие ролики в таблицу. Скиллы набора: [[{skill} trendwatch]], [[{skill} adlib-recon]].

Общего аккаунта Apify у AI Mindset нет: каждый участник заводит свой аккаунт и свой токен.

## где включить
1. console.apify.com → регистрация, бесплатный кредит на старт;
2. Settings → API & Integrations → Personal API token → `export APIFY_TOKEN=<токен>`;
3. MCP для агента с токеном в заголовке Authorization (формат сверь на docs.apify.com/platform/integrations/mcp): `claude mcp add --transport http apify https://mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN"`. Токен сохранится в конфиге открытым текстом, конфиг не публикуем;
4. сборщик (actor) выбирается в Apify Store по задаче: «Facebook Ads Library», «Instagram Scraper», «TikTok Scraper».

## проверка
`curl -s -H "Authorization: Bearer $APIFY_TOKEN" https://api.apify.com/v2/users/me | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['username'])"` – только имя аккаунта.

## стоимость и границы
оплата за прогон, стартовый кредит небольшой; готовые сервисы трендвотчинга у Урбана стоили около $100 в месяц. собираем только публичное, персональные данные в папку не кладём: [[{rule} boundaries]].

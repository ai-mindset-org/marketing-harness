---
title: очередь ресёрчей
aliases: [очередь ресёрчей, дополнительные ресёрчи, ветки ресёрча]
---
# очередь ресёрчей

Шесть веток, готовых к запуску из консоли харнесса. У каждой один вопрос, скилл, четыре запроса Exa, фильтр дат, файл результата и строка задачи для консоли. Общий порядок: [[{skill} research-exa]] и [[{tool} exa]]. Все запросы идут через `web_search_advanced_exa`, фильтр дат 6 месяцев (для платформ и алгоритмов), после поиска агент дочитывает три страницы через `web_fetch_exa`. `agent_run` запускается только по слову человека. Результат: `research/{research} <тема> – <дата>.md`, таблица «утверждение · источник · дата · уровень A/B/C», блок «что это значит для нас».

Стоимость каждого прогона: четыре поиска и три дочитывания Exa (дёшево) плюс токены на 15–20 минут сессии. Ветки с выгрузкой из Apify добавляют оплату за прогон сборщика по тарифу Apify.

## 1 · LinkedIn
- вопрос: какие форматы и привычки комментирования дают B2B-охват и заявки после мартовского обновления ленты;
- скилл: research-exa; вывод для поста проверяет [[{skill} fact-check]];
- запросы Exa: `LinkedIn feed algorithm 2026 LLM ranking study` · `LinkedIn comments strategy B2B founders lead generation case 2026` · `LinkedIn document carousel PDF reach data 2026` · `LinkedIn automation limits connection requests policy 2026`;
- пишет: `research/{research} linkedin comments – <дата>`; стоимость: базовая;
- задача: «Прочитай AGENTS.md. По скиллу research-exa проведи скан: какие форматы и комментарии дают B2B-охват в LinkedIn в 2026. Четыре запроса Exa из очереди ветки LinkedIn, фильтр дат 6 месяцев, дочитай три страницы, запиши файл в research/ по naming.»

## 2 · Telegram
- вопрос: какие форматы постов и способы роста дают подписчиков и заявки в русскоязычном Telegram;
- скилл: research-exa;
- запросы Exa: `Telegram channel growth 2026 cross-promotion case study` · `Telegram Ads price per subscriber 2026` · `Telegram channel post format views retention analysis 2026` · `Telegram bot onboarding funnel conversion mini app case 2026`;
- пишет: `research/{research} telegram growth – <дата>`; стоимость: базовая;
- задача: «Прочитай AGENTS.md. По скиллу research-exa проведи скан: что растит канал в Telegram в 2026. Четыре запроса Exa из ветки Telegram, фильтр дат 6 месяцев, три страницы, запиши в research/ по naming.»

## 3 · реклама и креативы
- вопрос: какие креативы в нашей нише живут дольше 90 дней и на каких хуках и энглах;
- скилл: [[{skill} adlib-recon]] (выгрузка Ads Library, нужен Apify или Playwright), практики – research-exa;
- запросы Exa: `Meta ad creative testing framework hook angle 2026` · `long-running Meta ads analysis creative fatigue 2026` · `UGC ad creative performance study 2026` · `Meta Ads Library competitor research method case`;
- пишет: `research/{research} ad creatives – <дата>`; стоимость: базовая плюс прогон Apify;
- задача: «Прочитай AGENTS.md. По скиллу adlib-recon разбери рекламу трёх конкурентов, бренды я назову в задаче, отметь креативы старше 90 дней, разложи по кодам creative-codes. Практики по четырём запросам Exa ветки «реклама», запиши в research/.»

## 4 · видео и контент-завод
- вопрос: как выпускать два ролика в день на аккаунт агентами и что сегодня собирается из Claude, ffmpeg, Remotion и Hyperframes;
- скилл: [[{skill} trendwatch]] для залётов, research-exa для стека ([[{tool} video-stack]]);
- запросы Exa: `AI video content pipeline agent ffmpeg Remotion 2026` · `Hyperframes HeyGen agent video editing` · `short-form video repurposing pipeline cost per video 2026` · `Instagram Reels TikTok organic reach AI content policy 2026`;
- пишет: `research/{research} video factory – <дата>`; стоимость: базовая плюс прогон Apify для залётов;
- задача: «Прочитай AGENTS.md. По скиллу research-exa проведи скан: стек сборки коротких видео агентами и стоимость ролика в 2026. Четыре запроса Exa ветки «видео», фильтр дат 6 месяцев, запиши в research/. Потом trendwatch: 5 залётов ниши.»

## 5 · SEO и GEO
- вопрос: что подтверждено данными о попадании в ответы нейросетей и что остаётся догадкой;
- скилл: research-exa; все утверждения уровня C помечаются «гипотеза» ([[{skill} fact-check]]);
- запросы Exa: `generative engine optimization 2026 study citations ChatGPT Perplexity` · `AI Overviews click-through rate impact data 2026` · `llms.txt adoption effect AI citations study` · `brand AI visibility tracking tools comparison 2026`;
- пишет: `research/{research} seo geo – <дата>`; стоимость: базовая;
- задача: «Прочитай AGENTS.md. По скиллу research-exa проведи скан: что доказано про GEO в 2026. Четыре запроса Exa ветки SEO и GEO, фильтр дат 6 месяцев, три страницы, у каждого утверждения уровень A/B/C, запиши в research/.»

## 6 · онбординг, квиз и воронка
- вопрос: какие приёмы онбординга и квиза поднимают долю оплат в подписочных продуктах (механика Урбана: два вопроса подряд, «пропустить», 15 секунд);
- скилл: research-exa; воронки конкурентов – [[{skill} adlib-recon]];
- запросы Exa: `quiz funnel onboarding conversion subscription app 2026 case` · `paywall onboarding A/B test benchmark 2026` · `personalized onboarding per ad creative landing attribution` · `churned users interview script customer development`;
- пишет: `research/{research} onboarding funnel – <дата>`; стоимость: базовая;
- задача: «Прочитай AGENTS.md. По скиллу research-exa проведи скан: что повышает оплату после квиза и онбординга в 2026. Четыре запроса Exa ветки онбординга, фильтр дат 6 месяцев, запиши в research/. Сверь с конспектом Урбана в sources/.»

## три главных скилла ресёрча
1. **research-exa** – единственный скилл внешнего контекста, обслуживает пять веток из шести и даёт таблицу с уровнями A/B/C.
2. **adlib-recon** – даёт то, чего в поиске нет: рынок сам отобрал креативы старше 90 дней, и от них можно считать коды.
3. **trendwatch** – превращает ежедневный сбор залётов в поток идей для органики, которая кормит платные креативы ([[{automation} trend scan]]).

Ворота для всех трёх: [[{skill} fact-check]] перед использованием вывода в тексте и [[{skill} cross-llm-verify]] для важных выводов.

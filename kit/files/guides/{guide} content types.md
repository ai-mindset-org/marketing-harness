---
title: типы контента
aliases: [типы контента, форматы, матрица форматов]
---
# типы контента

Девять типов, которые харнесс умеет выпускать или собирается уметь. У каждого есть тип файла по [[{rule} naming]], папка, скилл, шаблон, ворота проверки и число нуклеусов на единицу. Формат F1–F7 из [[{rule} creative-codes]] стоит в колонке «код».

| тип | файл и папка | код | скилл | шаблон | ворота | нуклеусов | в наборе |
|---|---|---|---|---|---|---|---|
| пост LinkedIn | `outputs/linkedin/{post} li-NN <slug>.md` | F1 | [[{skill} linkedin-post]] | [[{design} linkedin]], `render.mjs linkedin` | check, slop-check, fact-check | 1 | есть |
| карусель LinkedIn (PDF) | `outputs/carousel/{carousel} car-NN <slug>.md` | F2 | [[{skill} carousel-brief]] | [[{design} carousel]], `render.mjs carousel --pdf` | check, slop-check, дизайнер смотрит | 1 | есть |
| пост Telegram | `outputs/telegram/{post} tg-NN <slug>.md` | F1, F5 | нет своего: по [[{context} voice]] через [[{skill} content-factory]] | нет | check, slop-check | 1 | скилл: пробел |
| лендинг | `outputs/landing/{landing} <slug>.md` | F7 | нет своего | [[{design} landing]], `render.mjs landing` | check, slop-check, fact-check по [[{context} truth-pack]] | 3–5 (блок на нуклеус) | скилл: пробел |
| письмо | `outputs/email/{email} <slug>.md` | F6 | нет | нет | check, slop-check | 1–2 | пробел целиком |
| сценарий ролика (раскадровка) | `outputs/video/{storyboard} <slug>.md` | F3 | [[{skill} raskadrovka]] | нет: сборка в [[{tool} video-stack]] | check, slop-check, человек смотрит первый кадр | 1 | скилл есть, шаблона нет |
| бриф рекламного креатива | `outputs/ads/{brief} <slug>.md` | F5 | нет: разведка в [[{skill} adlib-recon]], код по [[{rule} creative-codes]] | нет | check, slop-check, вердикт по оплатам | 1 (параметры P-H-A-F) | пробел |
| кейс | `outputs/cases/{case} <slug>.md` | F1, F7 | нет | нет | fact-check, согласие героя ([[{rule} sources-and-consent]]) | 2–4 | пробел |
| недельный дайджест | `outputs/telegram/{post} digest – <дата>.md` | F1 | нет: данные из [[{skill} weekly-loop]] | нет | check, fact-check по срезу | 3–5 | пробел |

## как читать таблицу
- **ворота** – цепочка из [[{rule} evals]]: код (`node bin/check.mjs`), судья ([[{skill} slop-check]]), человек, рынок. Для чисел добавляется [[{skill} fact-check]];
- **нуклеусов на единицу:** пост, карусель, письмо и ролик держат одну мысль. Лендинг и дайджест собирают несколько, каждому отдаётся блок до 60 слов;
- **пробел** означает, что скилла или шаблона в наборе нет. До появления скилла тип собирается вручную: агент читает нуклеус и голос, пишет черновик по образцу соседнего типа, проверки идут те же;
- папки `outputs/email/`, `outputs/video/`, `outputs/ads/`, `outputs/cases/` в наборе не заведены. Типы `{email}`, `{storyboard}`, `{brief}`, `{case}` в таблицу [[{rule} naming]] тоже не внесены: строку добавляет человек вместе с первым файлом.

## как закрыть пробел
1. отнеси тип к слою: скорее всего скилл, а ограничения (формат, длина) – правило;
2. напиши скилл по шаблону из [[{guide} rules to skills]] и по образцу ближайшего: письмо смотри на [[{skill} linkedin-post]], бриф креатива – на [[{skill} carousel-brief]];
3. добавь пример в [[{eval} golden-set]]: один хороший и один плохой текст этого типа;
4. добавь строку в [[{rule} naming]] и в таблицу выше;
5. `node bin/sync-skills.mjs`, затем `node bin/check.mjs --golden`.

Порядок работы над пробелами определяет вердикт недели: если письма приносят оплаты, скилл письма идёт первым.

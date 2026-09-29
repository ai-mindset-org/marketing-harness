---
name: lms-ingest
description: Use when нужно забрать запись занятия, транскрипт или чат из LMS AI Mindset в папку харнесса как сырьё. Триггеры – забери из LMS, транскрипт занятия, лекция спикера в sources, lms ingest.
---
# lms-ingest

1. проверь доступ: инструмент `lms_me` (или `node tools/mcp/lms.mjs cli me`). нет токена – остановись и дай ссылку на [[{tool} lms]].
2. найди занятие: `lms_sessions` с `lab` (например `marketing`), выбери `id`.
3. забери `lms_transcript` (имена скрыты по умолчанию; `redact_names=false` не используем).
4. сожми в конспект 60–120 строк: механики, цифры с таймкодами, инструменты, цитаты спикера (не участников).
5. запиши `sources/{source} <спикер> <тема> – <дата занятия>.md`, во frontmatter `source: lms:<id>`, `speaker`, `recorded`.
6. цифры с таймкодами предложи строками в [[{context} truth-pack]] отдельным блоком «на сверку» – сам truth-pack не правь.

чат занятия (`lms_chat`) используем только для вопросов участников в обезличенном виде: [[{rule} sources-and-consent]].

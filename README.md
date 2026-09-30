# marketing harness · live build

Форк [aim-sim-office](../aim-sim-office/) под маркетинг-спринт AI Mindset. Два слоя:
- **набор** (`kit/`) – сам харнесс: папка с контекстом, правилами, ролями, инструментами, скиллами, evals, дизайн-системой, рутинами, сырьём и результатом. 108 файлов, имена по конвенции `{тип} имя`;
- **инструмент** (`web/`, `tools/`, `bin/`) – разворачивает набор в пустую папку по таймлайну и рисует граф папки вживую; консоль отдаёт задачи агентам внутри папки.

Внутренний показ: `https://content.aimindset.org/marketing-harness/` (демо, Tailscale). `?at=end` – сразу финал, `?speed=4` – быстрее, `?phase=p05` – с фазы, `?stops=0` – без остановок. Рядом две страницы: `guide.html` (запуск, живая папка, таймлайн блоков, агенты, ресёрч) и `access.html` (инструменты, ключи, проверки, готовность этого компьютера).

## команды

| что | команда |
|---|---|
| демо без папки | `bin/replay.sh` → `http://localhost:4747/` · пробел – пауза, ← → – фазы, End – в конец, s – остановки вкл/выкл |
| сборка с остановками | `bin/demo.sh ~/Demos/mh-0110 --pace 1 --stops` · после каждой фазы карточка, дальше по «продолжить» |
| сборка в пустую папку по таймлайну | `bin/demo.sh ~/Demos/mh-0110 --pace 1` · 4:35, коммит на фазу |
| мгновенно новая папка + живой граф | `bin/new.sh ~/harness/my-product [b2b-consultant\|b2c-shop\|saas-founder]` |
| открыть существующий харнесс | `bin/open.sh ~/harness/marketing-sprint` |
| живые агенты в фазах 08–09 | `EXA_API_KEY=… AIM_LMS_TOKEN=… bin/demo.sh ~/Demos/mh-live --agents` · модель claude по умолчанию opus (`--model sonnet` или `HARNESS_CLAUDE_MODEL`) |
| остановить сервер | `bin/stop.sh` |

Рабочая папка Алекса: `~/harness/marketing-sprint` (развёрнута из набора, 10 коммитов). Открывается в Obsidian как vault.

## три режима
- **демо** – `index.html`: сборка по `web/scenario.json`, карточки фаз, клик по фазе внизу возвращает к её карточке;
- **живая папка** – `bin/open.sh <папка>` → `?mode=live`: папка этого компьютера через локальный сервер, правка, агенты, Obsidian; пробел замораживает картинку;
- **команда** – `?mode=team`: рабочая папка спринта из git (`ai-mindset-org/marketing-harness-sprint`), статичный `team/state.json`, опрос раз в 20 с, без консоли и правки. Публикация: `bin/publish-team.sh [папка] [клон lab-sites]` – экспорт через `tools/export-state.mjs`, push в lab-sites только при новом HEAD папки. На сервере это делает таймер (предложено инфраструктуре, узел сначала в реестр).

## ключи не уходят из процесса
`tools/folder-state.mjs` читает папку одинаково для сервера и экспорта и маскирует всё, что похоже на ключ (sk-, ghp_, github_pat_, токены ботов Telegram, Google, Apify, Krisp, Bearer, `api_key=…`, `exaApiKey=…`) в содержимом файлов, журналах агентов и раздаче `/f/`. Плейсхолдеры `${ИМЯ}` остаются. Скрытые файлы папки (`.env` и другие) сервер не отдаёт, кроме `.mcp.json`, `.githooks/`, `.claude/settings.json`.

## выкладка во внутренний контур
```bash
node tools/build-scenario.mjs
rsync -a --delete --exclude marketing-harness-kit.zip --exclude team/ web/ ~/repos/lab-sites/internal-sites/marketing-harness/
git archive --prefix=marketing-harness-sim/ -o ~/repos/lab-sites/internal-sites/marketing-harness/marketing-harness-kit.zip HEAD
cd ~/repos/lab-sites && gitleaks detect --no-git --source internal-sites/marketing-harness && git add internal-sites/marketing-harness && git commit -m "…" && git push
bin/publish-team.sh ~/harness/marketing-sprint    # командный вид
```

## остановки
После каждой фазы – карточка человеческим языком: что появилось в папке, зачем это, какие файлы (клик открывает файл). Тексты – поле `stop` у фазы в `kit/manifest.json`. В демо остановки включены по умолчанию; в живой сборке – флаг `--stops`: раннер ждёт, пока в браузере нажмут «продолжить» (`POST /api/continue` пишет `.harness/continue`).

## живая папка: правка и открытие
- сервер перечитывает папку каждые 0,7 с, граф и дерево меняются от любой правки: Obsidian, редактор, агент;
- панель файла: «вид» (markdown отрисован, ссылки кликаются), «исходник», «править» – текст слева, живое превью справа, ⌘S сохраняет и коммитит `edit(human): <файл>`;
- «Obsidian» открывает файл в хранилище; если папка ещё не хранилище, при закрытом Obsidian сервер регистрирует её сам, при открытом – показывает менеджер хранилищ и кладёт путь в буфер. «приложение» – `open` в программе по умолчанию, «Finder» – `open -R`; «папка в Obsidian» в шапке – вся папка;
- клик по слою легенды прячет слой со связями.

## консоль агентов (только локально)
Вкладка «консоль» в живом режиме: исполнитель, модель, задача, пресеты. Сервер слушает только `127.0.0.1`, запись требует заголовка с токеном сессии, поэтому чужие сайты запуск не вызовут.
- **claude** – `claude -p` в папке, модель по умолчанию opus (выбор opus · sonnet · haiku), MCP только тех серверов, чьи ключи заданы в окружении;
- **codex** – `codex exec --full-auto` в папке;
- **сотник** – Codex на `ws-povalyaev`: папка уезжает в `~/harness/<имя>` (`rsync` вместе с `.git`, чтобы агент видел историю; назад `.git` не возвращается), `codex exec` работает там, изменения возвращаются каждые 4 секунды, граф растёт вживую;
- каждый успешный запуск заканчивается коммитом `agent(<исполнитель>): <задача>`; запуск виден в графе красным узлом со связями к тронутым файлам.

Вкладка «инструменты» показывает, какие ключи заданы (значения не отдаются), CLI, доступность сервера и LMS API.

## устройство

```
kit/
  answers.json · answers/*.json   анкета по умолчанию и пресеты трёх архетипов когорты
  manifest.json                    10 фаз, 109 шагов, 6 дорожек агентов, пояснение к шагу
  files/                           харнесс: AGENTS.md · CLAUDE.md · context/ · rules/ · tools/ (+ mcp/lms.mjs)
                                   skills/ · evals/ · design/ · guides/ · bin/ (check, render, sync-skills)
                                   sources/ · research/ · nuclei/ · outputs/ · dashboards/
  versions/                        промежуточные версии: до нейминга, до правки li-02, отчёт проверок v1
tools/
  timeline.mjs        manifest → один таймлайн (переименование, параллельные дорожки)
  build-scenario.mjs  рендер и проверки набора → web/scenario.json
  harness-server.mjs  статика, /api/state, /api/tools, /api/agent, /api/file, /api/open, /api/continue, /f/<файл папки>
  harness-demo.mjs    раннер: пустая папка → фазы → git; --agents, --preset, --pace 0
web/                  инструмент: index.html · app.js · styles.css · vendor/d3 · scenario.json
                      страницы: guide.html · access.html · doc.css · doc.js · kit-docs.json (из набора при сборке)
bin/                  demo.sh · new.sh · open.sh · replay.sh · stop.sh
```

Правка набора: файл в `kit/files/` или шаг в `kit/manifest.json` → `node tools/build-scenario.mjs`.

## фазы
00 пустая папка · 01 анкета → контекст · 02 правила и принципы · 03 нейминг (файлы переименовываются, ссылки правятся) · 04 инструменты · 05 скиллы и правила спикеров · 06 evals · 07 дизайн-система · 08 агенты параллельно (загрузчик из LMS, исследователь, экстрактор, автор, дизайнер, критик) · 09 срез и петля.

## слои графа
◆ хаб · ■ контекст · ◇ правило · ⬡ роль · △ инструмент · × код · ✳ гайд · ○ скилл · ▲ eval · ☆ дизайн · ● агент · □ сырьё · Y ресёрч · • нуклеус · ▢ черновик · ✚ срез · ⧗ рутина · пунктир – файл, которого ещё нет. Клик по легенде скрывает слой.

## требования
node ≥ 18, git. Для агентов – Claude Code CLI, Codex CLI; для Сотника – SSH-ключ к `ws-povalyaev`. Ключи сервисов – только в окружении.

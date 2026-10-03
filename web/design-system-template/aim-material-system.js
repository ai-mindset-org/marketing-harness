/* Design System Template · Visual Material System: tokens, component specifications and catalogue UI. */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- данные */

  var SWATCHES = {
    primary: [
      ['--accent-primary', null, 'Главный акцент: маркеры секций, статус, активное состояние.'],
      ['--accent-primary-on-dark', null, 'Акцент для текста, контура и фокуса на тёмной поверхности.'],
      ['--accent-primary-deep', null, 'Более глубокая тональность главного акцента.'],
      ['--accent-primary-rich', null, 'Плотный вариант для исследовательских сцен.'],
      ['--accent-primary-signal', null, 'Короткий сигнал и точечное выделение.']
    ],
    support: [
      ['--accent-support', null, 'Дополнительный акцент для соседней заливки и сочетания с главным.']
    ],
    secondary: [
      ['--accent-secondary', null, 'Второй основной акцент: контуры, траектории и тематические поверхности.'],
      ['--accent-secondary-light', null, 'Светлая ступень второго акцента для фокуса и активных элементов.'],
      ['--accent-secondary-pale', null, 'Светлый сигнал и небольшие детали графики.']
    ],
    core: [
      ['--surface-base', null, 'Базовая поверхность страницы.'],
      ['--text-primary', null, 'Основной текст, рамки и инверсия.'],
      ['--link-underline', null, 'Подчёркивание ссылок в покое.'],
      ['--border-hairline', null, 'Швы списков и границы карточек.'],
      ['--surface-hover', null, 'Заливка ховера у вкладок и служебных панелей.'],
      ['--text-muted', null, 'Метки, подписи и ключи строк.'],
      ['--on-primary', null, 'Текст на главном акценте; проверяется контраст каждого состояния.'],
      ['--on-support', null, 'Текст на дополнительном акценте.'],
      ['--text-lead', null, 'Лид-абзац.'],
      ['--text-row', null, 'Текст внутри строки списка.'],
      ['--text-card', null, 'Текст в карточке.']
    ],
    scene: [
      ['--scene-surface-1', null, 'Светлая поверхность карточки продукта.'],
      ['--scene-surface-2', null, 'Вторая поверхность карточки продукта.'],
      ['--scene-surface-3', null, 'Поверхность карточки направления.'],
      ['--scene-line-1', null, 'Линии и частицы первой анимационной сцены.'],
      ['--scene-line-2', null, 'Линии и частицы второй сцены.'],
      ['--scene-depth-1', null, 'Глубокий слой движущейся графики.'],
      ['--scene-depth-2', null, 'Второй глубокий слой движущейся графики.'],
      ['--scene-warm-signal', null, 'Тёплый сигнал в движущейся графике.'],
      ['--scene-emphasis', null, 'Контрастный акцент движущейся графики.']
    ],
    voxel: [
      ['--voxel-ink', null, 'Основные грани объёмной графики.'],
      ['--voxel-mid', null, 'Средняя грань.'],
      ['--voxel-signal', null, 'Акцентная грань.'],
      ['--voxel-highlight', null, 'Светлая грань и блик.'],
      ['--voxel-deep', null, 'Тёмная грань.'],
      ['--voxel-light', null, 'Вторичная светлая грань.'],
      ['--voxel-trail', null, 'Полупрозрачный след и подсветка.']
    ]
  };

  var TYPE_SCALE = [
    ['--type-11', 11, 'Метки интерфейса, ключи строк, подписи статистики, номера секций'],
    ['--type-12', 12, 'Вкладки, кнопки, переходы, ссылки проекта'],
    ['--type-13', 13, 'Компактные описания карточек и мелкие подписи'],
    ['--type-14', 14, 'Описание карточки, подзаголовок, навигация в шапке'],
    ['--type-16', 16, 'Основной текст, словомарка, заголовок строки, врезка-голос'],
    ['--type-18', 18, 'Заголовок секции h2, заголовок карточки, цитата'],
    ['--type-24', 24, 'h1, число в статистике, заголовок продукта'],
    ['--type-32', 32, 'Заголовок полосы «кто мы», крупный заголовок направления'],
    ['--type-44', 44, 'Крупные заголовки']
  ];

  var TYPE_ROLES = [
    ['основной текст', '--type-16 / --leading-body', 'Редакционные абзацы страницы'],
    ['h1', '--type-24 / 700 / --tracking-heading', 'Один на страницу'],
    ['h2', '--type-18 / 600 / --tracking-heading', 'Заголовок секции'],
    ['h3', '--type-14 / 600 / --leading-card', 'Подзаголовок внутри блока'],
    ['лид', '--type-16 / --leading-body', 'Первый абзац секции, роль --text-lead'],
    ['описания карточек', '--type-13 или --type-14 / --leading-small', 'Размер выбирается по роли содержания'],
    ['.small', '--type-13 / --tracking-body', 'Мелкая подпись, цвет --text-muted'],
    ['метки UI', '--type-11 / --tracking-ui / --leading-ui', 'Строчные буквы: .num, .key, .stats span, мета'],
    ['.stats b', '--type-24 / 700', 'Число: кегль не уменьшается на мобильном'],
    ['цитата', '--type-18 / --leading-quote', '.about-quote и .rhythm-quote p'],
    ['врезка-голос', '--type-16 / --leading-quote', '.product-visual-quote, .manifesto-side-quote'],
    ['карточка продукта h3', '--type-24 / --tracking-tight', 'Крупный заголовок в полосе продукта'],
    ['карточка направления', '--type-18 / --leading-card', '.product-block--direction h3, .project-card h4']
  ];

  var TYPE_METRICS = [
    ['--tracking-body', '0', 'Основной текст'],
    ['--tracking-ui', '.14em', 'Капслочные метки интерфейса'],
    ['--tracking-heading', '-.01em', 'h1, h2 и числа статистики'],
    ['--tracking-tight', '-.025em', 'Крупные заголовки от 18px и выше'],
    ['--leading-solid', '1', 'Словомарка, крупные числа, однострочные кнопки'],
    ['--leading-display', '1.10', 'Display-заголовки type-44/32'],
    ['--leading-label', '1.2', 'Навигация в шапке'],
    ['--leading-heading', '1.25', 'h1 и заголовки полос'],
    ['--leading-card', '1.35', 'h2, h3, вкладки, мета карточек'],
    ['--leading-ui', '1.45', 'Капслочные метки'],
    ['--leading-quote', '1.45', 'Цитатные плашки type-18'],
    ['--leading-body', '1.6', 'Стандартный текст type-16'],
    ['--leading-small', '1.65', 'Компактные тексты карточек/списков type-13/14']
  ];

  var GRID_SPANS = [
    [1, 5, 'h1 в герое'],
    [6, 8, 'лид в герое — прижат к низу'],
    [1, 2, 'сопроводительный абзац героя'],
    [4, 8, 'карточки лабораторий — прижаты вправо'],
    [1, 3, 'цитата в блоке подхода'],
    [4, 8, 'контекст в блоке подхода'],
    [1, 8, 'значение по умолчанию для любого блока']
  ];

  var GRID_ROWS = [
    ['--page-shell-max', 'Оболочка страницы', '1320px'],
    ['--page-gutter', 'Боковые поля', 'clamp(32px, 4.6vw, 64px); до 640px включительно — 16px'],
    ['--grid-gap', 'Межколонник', 'clamp(18px, 1.8vw, 24px); до 640px — 14px внутри компонентов'],
    ['--top-height', 'Высота шапки', 'По содержимому, с учётом переноса меню и увеличения текста'],
    ['колонки', 'Сетка секции', '8 выше 700px; 1 до 700px включительно, внешний gap 0'],
    ['ритм секции', 'Маркетинговая секция', 'Десктоп: 104–148px / 92–124px; до 700px: 64px / 48px'],
    ['граница секции', 'Без разделительных линий', 'Заголовок и содержание связаны отступом; border: 0'],
    ['scroll-margin', 'Якорь секции', 'Высота закреплённых панелей + 16px']
  ];

  /* Responsive layout transitions. */
  var BREAKPOINTS = [
    ['1200px', 'Карта направлений', 'Четыре карточки направлений становятся двумя'],
    ['1050px', 'Манифест', 'Композиция становится одноколоночной'],
    ['по вместимости', 'Шапка', 'Бренд и меню переносятся; высота определяется содержимым, якорь учитывает закреплённые панели'],
    ['960px', 'Команда', 'Три карточки в ряд становятся одной'],
    ['900px', 'Статистика и карточки', 'Статистика 6 → 3 колонки, карточки проектов 3 → 2, весь герой на 1/-1'],
    ['760px', 'Продуктовые полосы', 'Копия и сцена перестают быть двумя колонками: сцена сверху, текст под ней'],
    ['700px', 'Сетка страницы', 'ГЛАВНЫЙ перелом: 8 колонок → 1, column-gap → 0, каждый блок получает grid-column:1/-1'],
    ['640px', 'Поля и межколонник', '--page-gutter 32px → 16px, --grid-gap 18px → 14px; статистика 3 → 2, карточки лабораторий в одну колонку'],
    ['560px', 'Карточки проектов', 'Последний шаг: 2 → 1 колонка, высота арта растёт до 180px']
  ];

  /* Поведение восьми колонок и боковых полей по ширинам — то, что не видно
     из таблицы брейкпоинтов: где clamp упирается в пол, а где выключается сетка. */
  var GRID_STEPS = [
    { w: '1440px и шире', cols: 8, gutter: '64px', gap: '24px',
      note: 'Максимальная ширина оболочки — 1320px. Дополнительные поля формируются снаружи.' },
    { w: '1000 < ширина < 1440px', cols: 8, gutter: '46–64px', gap: '18–24px',
      note: 'Поля зависят от 4.6vw, межколонник — от 1.8vw.' },
    { w: '700 < ширина ≤ 1000px', cols: 8, gutter: '≈32–46px', gap: '18px',
      note: 'Восемь колонок. Поля продолжают вычисляться через 4.6vw.' },
    { w: '640 < ширина ≤ 700px', cols: 1, gutter: '≈32px', gap: '0',
      note: 'Одна колонка. На 700px поле 32.2px; минимум 32px достигается около 696px.' },
    { w: '640px и уже', cols: 1, gutter: '16px', gap: '0',
      note: 'Внешний gap — 0. Токен 14px применяется внутри компонентов (статистика, карточки).' }
  ];

  /* ── ИНТЕРВАЛЫ ─────────────────────────────────────────────────────────
     Единственный раздел, который НЕ снят с сайта: системы интервалов там нет.
     Аудит живого CSS 20.08.2026: 53 разных значения в margin/padding/gap,
     от 1px до 190px — практически каждое целое от 1 до 32. Шкала ниже собрана
     вокруг реальных пиков (14, 18, 12, 8, 10, 16, 22, 20, 24), поэтому перенос
     стоит ±2px почти везде. */
  var SPACE_SCALE = [
    ['--space-4', 4, 'Прижим подписи к числу, зазор между глифом и словом'],
    ['--space-8', 8, 'Строки меты, мелкие внутренние зазоры, отступ иконки'],
    ['--space-12', 12, 'Заголовок ↔ текст внутри карточки, зазор в плотных сетках'],
    ['--space-16', 16, 'Внутренние поля карточки и строки списка'],
    ['--space-24', 24, 'Между элементами внутри блока, максимум межколонника'],
    ['--space-32', 32, 'Между блоками внутри полосы, низ заголовка секции'],
    ['--space-48', 48, 'Между смысловыми группами внутри полосы'],
    ['--space-64', 64, 'Боковые поля на широком экране, крупная пауза'],
    ['--space-96', 96, 'Вертикальный ритм полосы: верх и низ секции']
  ];

  var SPACE_VERTICAL = [
    ['4px', 'Подпись под числом статистики', 'зазор между числом и подписью'],
    ['8px', 'Строки внутри блока меты', 'дата, время, статус'],
    ['12px', 'Заголовок карточки ↔ её текст', 'внутренний интервал карточки'],
    ['16px', 'Вертикальные поля строки списка', 'внутренний отступ строки'],
    ['24px', 'Абзац ↔ абзац, заголовок секции ↔ лид', 'основной шаг чтения'],
    ['32px', 'Блок ↔ блок внутри полосы', 'расстояние между блоками'],
    ['48px', 'Группа ↔ группа', 'перед крупной цитатой или сменой темы'],
    ['96px', 'Верх и низ полосы', 'через clamp: clamp(64px, 7vw, 96px)']
  ];

  var SPACE_HORIZONTAL = [
    ['4px', 'Внутри мелкой плашки', 'номер секции, счётчик'],
    ['8px', 'Плашка: горизонтальные поля', 'внутренний отступ плашки'],
    ['12px', 'Внутренние поля карточки проекта', 'внутренний отступ карточки'],
    ['16px', 'Внутренние поля карточки и строки', 'внутренний отступ компонента'],
    ['24px', 'Межколонник, максимум', 'clamp(16px, 1.8vw, 24px)'],
    ['64px', 'Боковые поля страницы, максимум', 'clamp(32px, 4.6vw, 64px)'],
    ['16px', 'Боковые поля на мобильном', 'при ширине окна ≤640px']
  ];

  /* Что придётся подвинуть при переносе шкалы на сайт. Дельта почти везде ±2px —
     это и есть аргумент в пользу именно такой шкалы. */
  var SPACE_MIGRATION = [
    ['section', 'clamp(84px,7vw,112px) 0 clamp(76px,6vw,96px)', 'clamp(64px,7vw,96px) 0 clamp(64px,6vw,96px)'],
    ['--grid-gap', 'clamp(18px,1.8vw,24px)', 'clamp(16px,1.8vw,24px)'],
    ['.sec-head', 'margin-bottom: 30px', 'margin-bottom: 32px'],
    ['.row', 'padding: 14px 2px', 'padding: 16px 2px'],
    ['.learning-topic', 'padding: 18px 2px', 'padding: 16px 2px'],
    ['.stats', 'margin: 26px 0', 'margin: 24px 0'],
    ['.rhythm-quote', 'margin: 34px 0', 'margin: 32px 0'],
    ['.hero-lab-card__status', 'padding: 9px 14px 8px', 'padding: 8px 16px'],
    ['.hero-lab-card__body', 'padding: 16px 16px 14px', 'padding: 16px'],
    ['.project-card h3', 'padding: 7px 13px 0', 'padding: 8px 12px 0'],
    ['.follow-link', 'padding: 14px 16px', 'padding: 16px'],
    ['.btn', 'padding: 10px 20px', 'padding: 12px 24px']
  ];

  var MOTION_ROWS = [
    ['feedback', '.15–.22s', 'Ссылки, ховер вкладок, стрелка перехода'],
    ['ступенчатый ховер', '.18s steps(3, end)', 'Кнопки, CTA, заливка служебных элементов'],
    ['перестройка', '.28–.35s ease', 'Появление подсветки сцены, раскрытие ветки'],
    ['сцена', '.45–.65s cubic-bezier(.2,.8,.2,1)', 'Масштаб сцены при ховере, штриховая линия связи'],
    ['attention', '1.8–2.8s infinite', 'Пульс живого статуса, кольцо отклика'],
    ['ambient', '4.2–16s infinite', 'Дыхание слоёв, орбиты, движение сетки'],
    ['ступенчатое раскрытие', '.8s steps(6)', 'Вход блока с дискретным ритмом']
  ];


  var LAYOUT_ROWS = [
    ['полоса-список', 'Заголовок секции + .rows из .row', 'каталог, исследования, ресурсы'],
    ['полоса-карточки', 'Заголовок + плотная сетка карточек без зазора', 'проекты, профили'],
    ['полоса-продукт', 'Две колонки: текст и анимированная часть, порядок чередуется', 'продуктовые разделы'],
    ['полоса-цитата', 'Цитата и соседний текст или графика в пролётах 3/5 либо 5/3', 'редакционные цитаты'],
    ['полоса-герой', 'h1 на 5 колонок, лид на 3, статистика на всю ширину', 'входной блок страницы']
  ];

  var QA_ROWS = [
    ['смысловой блок', 'Нет линии между заголовком и его списком; секции разделяются отступом', 'обязательно'],
    ['общая оболочка', 'Навигация, футер и вложенные сетки соответствуют правилам конкретного продукта', 'обязательно'],
    ['семантика', 'Перечисления размечены через ul/li; стрелка ↗ стоит только у реального внешнего перехода', 'обязательно'],
    ['кегли', 'Все вычисленные font-size попадают в девять значений шкалы', 'обязательно'],
    ['тёмная поверхность', 'Контраст текста, действий и фокуса проверен в каждом состоянии', 'обязательно при использовании'],
    ['акцент', 'Основной и второй акценты применены в своих ролях; активное состояние навигации различимо', 'обязательно'],
    ['safe zone', 'Абзац читается, пока идёт анимация фона', 'обязательно'],
    ['повторное использование', 'Компонент проверен с реальным содержанием и во всех заявленных состояниях', 'обязательно'],
    ['ссылки', 'Ссылки и ресурсы доступны команде без доступа к локальному компьютеру', 'обязательно'],
    ['мобильный', 'Матрица 320–768px и границы 640/700px; текст 200%, touch, формы и reduced-motion', 'обязательно']
  ];

  /* Роли canvas-слоёв. */
  var CANVAS_ROWS = [
    ['герой с объектом', 'Воксельное лицо: точечный силуэт, который перетекает A→B по скроллу', 'реализация'],
    ['карточки направлений', 'По сцене на каждую из четырёх карточек направления', 'реализация'],
    ['продукты', 'Кинетическая сцена продукта — своя физика на каждый', 'реализации'],
    ['карта связей', 'Холст потока в карте направлений плюс два SVG с линиями связи', 'реализация'],
    ['герой с полем глифов', 'Поле глифов, знак собирается из постера логотипа', 'реализация'],
    ['слой ниже героя', 'Ручейки: 460 частиц воды, огибающих контент', 'реализация'],
    ['глобальный декоративный слой', 'Воксельный компаньон в отдельном слое', 'реализация'],
  ];

  var LAYERS = [
    {
      name: 'Поле героя',
      id: '#hero-kv',
      zone: 'только в границах секции #hero',
      cell: 'клетка 9px',
      glyphs: '· : . / 0 1 - + = < > / { } [ ] ( ) / | / # $ % & @ ?',
      what: 'Изображение логотипа задаёт маску поля. Каретка у курсора проявляет строки символов.',
      rule: 'Скролл не переносит знак по странице: пока он в герое, часть его клеток кратко переходит в код и собирается обратно по той же сетке.'
    },
    {
      name: 'Ручейки',
      id: '#ruslo-canvas',
      zone: 'только ниже героя',
      cell: 'клетка 7×13px, шрифт 11px',
      glyphs: '· ~ ≈ и пулы .:;· / =+<>{} / 01$#',
      what: '460 частиц движутся по полю направлений. Влажность увеличивается на 0.13 за проход и умножается на 0.94 за кадр. Её значение определяет класс символа. Частицы обходят прямоугольники контентных блоков.',
      rule: 'Поле привязано к координатам документа. При прокрутке карта сдвигается на целое число клеток.'
    },
    {
      name: 'Компаньон',
      id: '#vxc-canvas',
      zone: 'поверх всей страницы, в паузах',
      cell: 'изометрия под углом π/6',
      glyphs: 'воксельные кубы',
      what: 'Изометрический персонаж из кубов перемещается по периметру. При быстром движении появляется след; периодически выводятся подсказки.',
      rule: 'Появляется при отсутствии ввода. Текстовые подсказки в поле глифов отключены.'
    }
  ];

  var BANDS = [
    ['0.30', null, 'уровень 1: низкая интенсивность'],
    ['0.46', null, 'уровень 2: средняя интенсивность'],
    ['0.62', null, 'уровень 3: высокая интенсивность'],
    ['0.78', null, 'уровень 4: пиковая интенсивность']
  ];

  var GLYPH_LEVELS = [
    ['0.06', '·', '.:;·', 'сухо — редкие точки'],
    ['0.22', '~', '=+<>{}', 'течение обозначено'],
    ['0.50', '≈', '01$#', 'полная вода, самый плотный знак']
  ];

  var CHARACTERS = [
    ['кораблик ▸', 'Плывёт по ручейкам сверху вниз, огибая контентные блоки', 'слой ручейков'],
    ['воксельный компаньон', 'Бродит по периметру, след при разгоне, речевые пузыри', 'отдельный слой'],
    ['лупа агент-вида', 'Фразы для человека или агента внутри пунктирной окружности', 'поле героя'],
    ['стрелка-комета', 'Указывает на ближайшие ключи секции; переключает цель каждые 1.8 с', 'поле героя']
  ];

  var PROMPTS = [
    'начни с одной задачи', 'сначала опиши контекст', 'проверь на живом кейсе',
    'сохрани удачный ход', 'повтори вручную — потом автоматизируй',
    'раздели задачу на следующий шаг', 'сформулируй, что должно измениться',
    'сравни два подхода', 'задай системе роль и границы', 'собери материалы в одном месте',
    'не усложняй первый проход', 'оставь человеку последнее слово',
    'передай рутину, оставь решение себе', 'преврати повторение в шаблон',
    'если ответ не подходит — уточни задачу'
  ];

  var TEAM_CARDS = ['Профиль 1', 'Профиль 2', 'Профиль 3', 'Профиль 4'];

  var ACTION_ROWS = [
    ['A · .btn', 'Чёрная, полный пиксельный кант --px-a, текст --on-primary, --type-12', 'главное действие: «присоединиться», «перейти на страницу», «карта проектов», «все события ↗», отправка формы'],
    ['B · .product-cta', 'Контурная, диагональный кант --px-b, стрелка справа, --type-12', 'действие внутри карточки/блока: «открыть платформу ↗», «показать все события (N)», «регистрация ↗»'],
    ['C · .aim-button-outline', 'Контур 1px со ступенчатыми срезами двух углов, --type-13, стрелка справа', 'второстепенное действие']
  ];

  var SCHEDULE_STATES = [
    ['события есть', 'Показываются первые два, остальные скрыты под кнопкой «показать все события (N)»', 'основное'],
    ['событий нет', 'Блок остаётся на месте, строка меняется на «Новых событий пока нет» со ссылкой на календарь', 'пустое'],
    ['данные не пришли', 'Резерв: события берутся из атрибута data-events прямо в разметке', 'запасное']
  ];

  var SCHEDULE_DATA = [
    ['источник', 'Адрес календаря · заполнить', 'внешний'],
    ['формат даты', 'Локаль, часовой пояс и короткая подпись задаются проектом', '—'],
  ];

  var MISSING_ROWS = [
    ['иконки', 'Определить наличие набора и правила стрелок, статусов и линий', 'решение проекта'],
    ['тёмная тема', 'Выбрать охват: вся система или отдельные компоненты', 'решение проекта'],
    ['скругления', 'Вспомогательные изображения: border-radius 12px', 'карточки и кнопки сохраняют собственную геометрию'],
    ['тени', 'Роли тени карточки и действия задаются отдельно', 'решение проекта'],
    ['prefers-reduced-motion', 'Поддержка зависит от слоя', 'поддержка проверяется отдельно для каждого слоя'],
    ['вторая гарнитура', 'Определить семейство словомарки и возможную текстовую пару', 'решение проекта'],
    ['цвет в тексте', 'Основной, вторичный и активный текст получают отдельные роли', 'значения заполнить']
  ];

  var TOKENS_CSS = [
    '/* Заполните значения по template-values.json. */', ':root {'
  ].concat(
    Object.keys(SWATCHES).reduce(function (all, group) {
      return all.concat(SWATCHES[group].map(function (item) {
        return '  ' + item[0] + ': <COLOR>; /* ' + item[2] + ' */';
      }));
    }, []),
    ['  --font-body: <FONT_FAMILY>;', '  --font-wordmark: <FONT_FAMILY>;'],
    TYPE_SCALE.map(function (_, index) {
      return '  --type-' + String(index + 1).padStart(2, '0') + ': <SIZE>;';
    }),
    ['  /* Три роли веса, четыре роли трекинга, девять ролей интерлиньяжа. */', '}']
  ).join('\n');

  var SPACING_CSS = [
    '/* Интервалы Design System Template — девять ступеней.',
    '   Предлагаемые значения margin, padding и gap. */',
    ':root {',
    '  --space-4:4px;   /* прижим подписи, зазор глифа       */',
    '  --space-8:8px;   /* строки меты, поля мелкой плашки   */',
    '  --space-12:12px; /* заголовок ↔ текст в карточке      */',
    '  --space-16:16px; /* внутренние поля карточки и строки */',
    '  --space-24:24px; /* абзац ↔ абзац, максимум колонника */',
    '  --space-32:32px; /* блок ↔ блок внутри полосы         */',
    '  --space-48:48px; /* группа ↔ группа                   */',
    '  --space-64:64px; /* боковые поля на широком экране    */',
    '  --space-96:96px; /* верх и низ полосы                 */',
    '}',
    '',
    '/* Вертикальный ритм */',
    'section        { padding: clamp(var(--space-64), 7vw, var(--space-96)) 0',
    '                          clamp(var(--space-64), 6vw, var(--space-96)) }',
    '.sec-head      { margin-bottom: var(--space-32) }',
    '.row           { padding: var(--space-16) 2px }   /* 2px — оптический прижим, не отступ */',
    '.learning-topic{ padding: var(--space-16) 2px }',
    '.stats         { margin: var(--space-24) 0 }',
    '.rhythm-quote  { margin: var(--space-32) 0 }',
    '',
    '/* Горизонтальные отступы */',
    ':root          { --page-gutter: clamp(var(--space-32), 4.6vw, var(--space-64));',
    '                 --grid-gap:    clamp(var(--space-16), 1.8vw, var(--space-24)) }',
    '@media(max-width:640px) {',
    '  :root        { --page-gutter: var(--space-16); --grid-gap: 14px }',
    '}',
    '.hero-lab-card__body { padding: var(--space-16) }',
    '.follow-link         { padding: var(--space-16) }',
    '.project-card h3     { padding: var(--space-8) var(--space-12) 0 }',
    '.btn                 { padding: var(--space-12) var(--space-24) }',
    '',
    '/* Вне шкалы сознательно: 2px в .row — оптическое выравнивание внутри',
    '   компонента, не интервал. Других исключений быть не должно. */'
  ].join('\n');

  var STARTER_HTML = [
    '<section id="новая-полоса">',
    '  <div class="sec-head">',
    '    <p class="num">10 · название</p>',
    '    <p class="num">подпись справа</p>',
    '  </div>',
    '',
    '  <h2>Заголовок полосы одной строкой</h2>',
    '  <p class="lead">Первый абзац: роль цвета --text-lead, не длиннее 700px.</p>',
    '',
    '  <div class="rows">',
    '    <div class="row">',
    '      <span class="key live">направление</span>',
    '      <p>Описание строки: роль цвета --text-row.</p>',
    '      <a class="go" href="{{url}}">смотреть →</a>',
    '    </div>',
    '  </div>',
    '',
    '  <figure class="rhythm-quote rhythm-quote--right">',
    '    <p>Цитата <span class="rhythm-highlight">с чернильным выделением</span> внутри.</p>',
    '  </figure>',
    '',
    '  <a class="section-page-cta" href="{{url}}">открыть страницу <span>↗</span></a>',
    '</section>',
    '',
    '<!-- Компоненты используют общие токены цвета, типографики и сетки. -->'
  ].join('\n');

  /* ------------------------------------------------------------- отрисовка */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderSwatches() {
    $$('[data-swatches]').forEach(function (host) {
      var set = host.dataset.swatches === 'primary-support'
        ? [SWATCHES.primary[0], SWATCHES.support[0]].concat(SWATCHES.primary.slice(1))
        : SWATCHES[host.dataset.swatches] || [];
      set.forEach(function (item) {
        var card = el('div', 'ms-swatch');
        var chip = el('div', 'ms-swatch__chip');
        chip.classList.add('template-swatch-chip');
        var body = el('div', 'ms-swatch__body');
        body.append(
          el('b', 'ms-swatch__name', item[0]),
          el('span', 'ms-swatch__hex', 'значение не задано'),
          el('span', 'ms-swatch__use', item[2])
        );
        card.append(chip, body);
        host.append(card);
      });
    });
  }

  function renderRows(host, data, opts) {
    if (!host) return;
    opts = opts || {};
    var text = opts.text || function (item) { return item[1] + (item[2] ? ' — ' + item[2] : ''); };
    data.forEach(function (item) {
      var row = el('div', 'ms-row');
      row.append(el('span', 'ms-row__key' + (opts.live && opts.live(item) ? ' is-live' : ''), item[0]));
      row.append(el('p', null, text(item)));
      if (opts.value) row.append(el('span', 'ms-row__val', opts.value(item)));
      host.append(row);
    });
  }

  function renderTypeScale() {
    var host = $('[data-type-scale]');
    if (!host) return;
    TYPE_SCALE.forEach(function (item) {
      var line = el('div', 'ms-type-line');
      line.append(el('span', 'ms-type-line__token', 'ступень ' + String(TYPE_SCALE.indexOf(item) + 1).padStart(2, '0')));
      var sample = el('span', 'ms-type-line__sample', 'Образец текста');
      sample.style.fontSize = item[1] + 'px';
      if (item[1] >= 18) sample.style.letterSpacing = 'var(--tracking-tight)';
      if (item[1] >= 24) sample.style.fontWeight = '700';
      line.append(sample, el('span', 'ms-type-line__role', item[2]));
      host.append(line);
    });
  }

  function renderGridSpans() {
    var host = $('[data-grid-spans]');
    if (!host) return;
    GRID_SPANS.forEach(function (item) {
      var line = el('div', 'ms-grid-span');
      var bar = el('b', null, item[0] + '/' + (item[1] + 1) + '  ·  ' + item[2]);
      bar.style.gridColumn = item[0] + ' / ' + (item[1] + 1);
      line.append(bar);
      host.append(line);
    });
  }

  function renderGridSteps() {
    var host = $('[data-grid-steps]');
    if (!host) return;
    GRID_STEPS.forEach(function (step) {
      var row = el('div', 'ms-gstep');
      row.append(el('span', 'ms-gstep__w', step.w));

      var demo = el('div', 'ms-gstep__demo');
      var pad = el('i', 'ms-gstep__gutter');
      var cols = el('div', 'ms-gstep__cols');
      cols.style.gridTemplateColumns = 'repeat(' + step.cols + ', minmax(0, 1fr))';
      cols.style.columnGap = step.cols === 1 ? '0' : '4px';
      for (var i = 0; i < step.cols; i++) cols.append(el('u'));
      demo.append(pad, cols, el('i', 'ms-gstep__gutter'));

      var meta = el('div', 'ms-gstep__meta');
      meta.append(
        el('b', null, step.cols === 1 ? '1 колонка' : step.cols + ' колонок'),
        el('span', null, 'поля ' + step.gutter + ' · колонник ' + step.gap),
        el('small', null, step.note)
      );
      row.append(demo, meta);
      host.append(row);
    });
  }

  function renderSpaceScale() {
    var host = $('[data-space-scale]');
    if (!host) return;
    SPACE_SCALE.forEach(function (item) {
      var line = el('div', 'ms-space-line');
      line.append(el('span', 'ms-space-line__token', item[0]));
      line.append(el('span', 'ms-space-line__px', item[1] + 'px'));
      var bar = el('span', 'ms-space-line__bar');
      bar.style.width = item[1] + 'px';
      line.append(bar, el('span', 'ms-space-line__use', item[2]));
      host.append(line);
    });
  }

  /* Карточка, собранная только по шкале: показывает шаги вживую, а не на словах. */
  function renderVerticalDemo() {
    var host = $('[data-space-vertical]');
    if (!host) return;
    [['96', 'верх полосы'], ['32', 'блок ↔ блок'], ['24', 'абзац ↔ абзац'],
     ['16', 'поля строки'], ['12', 'заголовок ↔ текст'], ['8', 'строки меты'],
     ['4', 'подпись под числом']].forEach(function (pair) {
      var band = el('i');
      band.style.height = pair[0] + 'px';
      band.style.background = 'repeating-linear-gradient(135deg, rgba(0,0,0,.08) 0 5px, transparent 5px 10px)';
      host.append(band, el('em', null, pair[0] + 'px · ' + pair[1]));
    });
  }

  function renderHorizontalDemo() {
    var host = $('[data-space-horizontal]');
    if (!host) return;
    [['поле 64px', 64], ['поле 32px', 32], ['поле 16px', 16],
     ['колонник 24px', 24], ['колонник 16px', 16], ['карточка 16px', 16], ['плашка 8px', 8]
    ].forEach(function (pair) {
      var row = el('div', 'ms-hbar');
      row.append(el('span', null, pair[0]));
      var track = el('div');
      var fill = el('i');
      fill.style.width = pair[1] + 'px';
      track.append(fill, el('b', null, pair[1] + 'px'));
      row.append(track);
      host.append(row);
    });
  }

  function renderLayers() {
    var host = $('[data-layers]');
    if (!host) return;
    LAYERS.forEach(function (L, i) {
      var card = el('article', 'ms-layer');
      var head = el('div', 'ms-layer__head');
      head.append(el('b', null, String(i + 1).padStart(2, '0') + ' · ' + L.name), el('code', null, L.id));
      var meta = el('div', 'ms-layer__meta');
      [L.zone, L.cell, L.glyphs].forEach(function (v) { meta.append(el('span', null, v)); });
      var body = el('div', 'ms-layer__body');
      body.append(el('p', null, L.what));
      var rule = el('p', 'ms-layer__rule');
      rule.append(el('b', null, 'Правило. '), document.createTextNode(L.rule));
      body.append(rule);
      card.append(head, meta, body);
      host.append(card);
    });
  }

  function renderBands() {
    var host = $('[data-bands]');
    if (!host) return;
    BANDS.forEach(function (b) {
      var row = el('div', 'ms-band');
      var chip = el('i');
      chip.style.background = b[1];
      row.append(chip, el('b', null, b[0]), el('code', null, b[1]), el('span', null, b[2]));
      host.append(row);
    });
  }

  function renderGlyphLevels() {
    var host = $('[data-glyph-levels]');
    if (!host) return;
    GLYPH_LEVELS.forEach(function (g) {
      var row = el('div', 'ms-glevel');
      row.append(el('b', null, g[1]), el('code', null, '≥ ' + g[0]), el('span', 'ms-glevel__pool', g[2]), el('span', null, g[3]));
      host.append(row);
    });
  }

  function renderPrompts() {
    var host = $('[data-prompts]');
    if (!host) return;
    PROMPTS.forEach(function (t) { host.append(el('span', 'ms-prompt', t)); });
  }

  function renderTeamCards() {
    var host = $('[data-team-cards]');
    if (!host) return;
    TEAM_CARDS.forEach(function (n) {
      var card = el('article', 'ms-person');
      card.append(el('div', 'ms-person__photo'), el('b', null, n), el('span', null, 'роль'));
      host.append(card);
    });
  }

  /* Живой предпросмотр в трёх ширинах: iframe шириной ровно как устройство,
     затем масштабируется целиком — так видно настоящую раскладку, а не отзывчивость обёртки. */
  function renderWidths() {
    var host = $('[data-widths]');
    if (!host) return;
    [[375, 'мобильный · 1 колонка, поля 16px'],
     [768, 'планшет · 8 колонок, поля 32px'],
     [1280, 'десктоп · 8 колонок, поля ~59px']].forEach(function (pair) {
      var box = el('div', 'ms-width');
      box.append(el('p', 'ms-width__bar', pair[0] + 'px — ' + pair[1]));
      var view = el('div', 'ms-width__view');
      var btn = el('button', 'ms-btn', 'загрузить');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        var frame = document.createElement('iframe');
        frame.src = 'about:blank';
        frame.style.width = pair[0] + 'px';
        var scale = Math.min(1, (view.clientWidth - 2) / pair[0]);
        frame.style.height = Math.round(560 / scale) + 'px';
        frame.style.transform = 'scale(' + scale + ')';
        frame.setAttribute('title', 'главная в ' + pair[0] + 'px');
        view.textContent = '';
        view.append(frame);
      });
      view.append(btn);
      box.append(view);
      host.append(box);
    });
  }

  function renderStrips() {
    var strips = {
      main: ['black', 'dimgray', 'white', 'dimgray', 'dimgray', 'whitesmoke'],
      'variant-b': ['black', 'dimgray', 'gainsboro', 'dimgray', 'dimgray', 'gainsboro', 'whitesmoke']
    };
    $$('[data-strip]').forEach(function (host) {
      (strips[host.dataset.strip] || []).forEach(function (hex) {
        var i = el('i');
        i.style.background = hex;
        host.append(i);
      });
    });
  }

  function renderCode() {
    var map = { tokens: TOKENS_CSS, starter: STARTER_HTML, spacing: SPACING_CSS };
    $$('[data-code]').forEach(function (node) {
      node.textContent = map[node.dataset.code] || '';
    });
  }

  /* ------------------------------------------------------------ поведение */

  function initSkinSwitch() {
    var buttons = $$('[data-skin-target]');
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var skin = btn.dataset.skinTarget;
        document.documentElement.dataset.templateSkin = skin;
        buttons.forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        try { localStorage.setItem('ds-template-skin', skin); } catch (e) { /* приватный режим */ }
      });
    });
    var saved;
    try { saved = localStorage.getItem('ds-template-skin'); } catch (e) { saved = null; }
    if (saved === 'variant-b') {
      var target = buttons.filter(function (b) { return b.dataset.skinTarget === 'variant-b'; })[0];
      if (target) target.click();
    }
  }

  function initCopy() {
    var map = { tokens: TOKENS_CSS, starter: STARTER_HTML, spacing: SPACING_CSS };
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = map[btn.dataset.copy];
        if (!text) return;
        var done = function () {
          var label = btn.textContent;
          btn.textContent = 'скопировано';
          setTimeout(function () { btn.textContent = label; }, 1400);
        };
        var failed = function () {
          var label = btn.textContent;
          btn.textContent = 'не удалось скопировать';
          setTimeout(function () { btn.textContent = label; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, failed);
        } else {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.append(ta);
          ta.select();
          var copied = false;
          try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
          ta.remove();
          if (copied) done(); else failed();
        }
      });
    });
  }


  function initTabs() {
    var links = $$('.ms-tabs a');
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var index = sections.indexOf(entry.target);
        links.forEach(function (a, i) { a.classList.toggle('is-current', i === index); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    sections.forEach(function (section) { if (section) observer.observe(section); });
  }

  /* ------------------------------------------------------------------ старт */

  renderSwatches();
  renderTypeScale();
  renderRows($('[data-type-roles]'), TYPE_ROLES);
  renderRows($('[data-type-metrics]'), TYPE_METRICS);
  renderGridSpans();
  renderRows($('[data-grid-rows]'), GRID_ROWS);
  renderRows($('[data-breakpoints]'), BREAKPOINTS);
  renderGridSteps();
  renderSpaceScale();
  renderVerticalDemo();
  renderHorizontalDemo();
  renderRows($('[data-space-vertical-rows]'), SPACE_VERTICAL);
  renderRows($('[data-space-horizontal-rows]'), SPACE_HORIZONTAL);
  renderRows($('[data-space-migration]'), SPACE_MIGRATION, {
    text: function (item) { return 'сейчас ' + item[1]; },
    value: function (item) { return '→ ' + item[2]; }
  });
  renderRows($('[data-motion-rows]'), MOTION_ROWS);
  renderRows($('[data-layout-rows]'), LAYOUT_ROWS);
  renderRows($('[data-qa-rows]'), QA_ROWS, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; }
  });
  renderRows($('[data-canvas-rows]'), CANVAS_ROWS, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; },
    live: function (item) { return item[2] === 'variant-b'; }
  });
  renderRows($('[data-action-rows]'), ACTION_ROWS, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; }
  });
  renderRows($('[data-schedule-states]'), SCHEDULE_STATES, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; },
    live: function (item) { return item[2] === 'основное'; }
  });
  renderRows($('[data-schedule-data]'), SCHEDULE_DATA, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; }
  });
  renderRows($('[data-missing-rows]'), MISSING_ROWS, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; }
  });
  renderRows($('[data-characters]'), CHARACTERS, {
    text: function (item) { return item[1]; },
    value: function (item) { return item[2]; }
  });
  renderLayers();
  renderBands();
  renderGlyphLevels();
  renderPrompts();
  renderTeamCards();
  renderWidths();
  renderStrips();
  renderCode();

  initSkinSwitch();
  initCopy();
  initTabs();
  var catalogueHeader = document.querySelector('.ms-top');
  var catalogueTabs = document.querySelector('.ms-tabs');
  if (catalogueHeader && catalogueTabs && 'ResizeObserver' in window) {
    var measureCatalogueHeader = function () {
      var headerHeight = catalogueHeader.getBoundingClientRect().height;
      var tabsHeight = catalogueTabs.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--catalogue-header-height', headerHeight + 'px');
      document.documentElement.style.setProperty('--catalogue-anchor-offset', (headerHeight + tabsHeight + 16) + 'px');
    };
    var catalogueResize = new ResizeObserver(measureCatalogueHeader);
    catalogueResize.observe(catalogueHeader);
    catalogueResize.observe(catalogueTabs);
    measureCatalogueHeader();
  }
})();

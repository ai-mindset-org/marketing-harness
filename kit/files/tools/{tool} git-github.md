---
title: git и GitHub
aliases: [гит]
---
# git и GitHub

**Зачем:** история каждой правки, откат, работа с нескольких машин и с сервера. Коммит на каждый шаг агента: [[{rule} principles]], пункт 12.

## где включить
1. git на маке уже есть (`git --version`), при первом вызове macOS предложит поставить инструменты разработчика;
2. в папке: `git init` (скрипт харнесса делает это сам);
3. GitHub: аккаунт на github.com, `brew install gh`, `gh auth login`;
4. приватный репозиторий из папки: `gh repo create <имя> --private --source . --push`.

## безопасность
- `.gitignore` харнесса исключает `.harness/`, `.env*`, рабочие файлы Obsidian;
- перед push: `gitleaks detect --no-git --source .` или хотя бы `git diff --cached` глазами;
- ключи в git не попадают никогда: [[{rule} boundaries]].

## проверка
`git log --oneline` показывает коммиты по фазам сборки: init → контекст → правила → нейминг → инструменты → скиллы → evals → дизайн → пачка → срез.

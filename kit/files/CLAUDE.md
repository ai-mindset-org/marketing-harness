---
title: CLAUDE.md
layer: hub
---
@AGENTS.md

## только для Claude Code
- скиллы видны из `.claude/skills/`; это зеркало `skills/`, его пишет `node bin/sync-skills.mjs`;
- MCP-серверы описаны в `.mcp.json`: Exa и LMS. ключи берутся из окружения, см. [[{tool} exa]] и [[{tool} lms]];
- разрешения держим узкими: запись в папку, `node bin/*`, git status/diff. публикация и сеть – через человека.

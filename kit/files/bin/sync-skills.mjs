#!/usr/bin/env node
// skills/{skill} <name>.md is the single source. This writes the mirrors each
// runtime reads: .claude/skills/<name>/SKILL.md (Claude Code) and
// .agents/skills/<name>/SKILL.md (Codex). Mirrors are never edited by hand.
//   node bin/sync-skills.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'skills');
const mirrors = ['.claude/skills', '.agents/skills'].map((m) => path.join(root, m));
const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => f.endsWith('.md')) : [];
const names = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(src, f), 'utf8');
  const name = (/^name:\s*(.+)$/m.exec(text) || [])[1]?.trim() || f.replace(/^\{skill\}\s*/, '').replace(/\.md$/, '');
  if (!/^[a-z0-9-]+$/.test(name)) { console.error(`пропуск ${f}: имя «${name}» не kebab-case`); continue; }
  const header = `<!-- mirror of skills/${f} · edit the source, then: node bin/sync-skills.mjs -->\n`;
  for (const m of mirrors) {
    fs.mkdirSync(path.join(m, name), { recursive: true });
    // frontmatter must stay first, so the note goes right after it
    const out = text.replace(/^(---\n[\s\S]*?\n---\n)/, `$1${header}`);
    fs.writeFileSync(path.join(m, name, 'SKILL.md'), out);
  }
  names.push(name);
}
// drop mirrors whose source is gone
for (const m of mirrors) {
  if (!fs.existsSync(m)) continue;
  for (const d of fs.readdirSync(m)) {
    if (names.includes(d)) continue;
    const skill = path.join(m, d, 'SKILL.md');
    // only our own mirrors are removed; skills installed by hand stay
    if (fs.existsSync(skill) && fs.readFileSync(skill, 'utf8').includes('mirror of skills/')) fs.rmSync(path.join(m, d), { recursive: true, force: true });
  }
}
console.log(`скиллов: ${names.length} → .claude/skills, .agents/skills`);

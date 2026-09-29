#!/usr/bin/env node
// Ask-before-create: lists existing files whose names share a word (>= 4 letters) with the new name.
//   node bin/guard-new.mjs <skill|nucleus|automation|rule|tool> <name>
// Exit 1 when matches are found (extend the existing file), 0 when the name is free.
import fs from 'node:fs';
import path from 'node:path';

const DIRS = { skill: 'skills', nucleus: 'nuclei', automation: 'automations', routine: 'automations', rule: 'rules', tool: 'tools' };
const [type, ...rest] = process.argv.slice(2);
const name = rest.join(' ');
if (!DIRS[type] || !name) {
  console.error(`usage: node bin/guard-new.mjs <${Object.keys(DIRS).join('|')}> <name>`);
  process.exit(2);
}

const words = (s) => new Set(s.toLowerCase().replace(/^\{[^}]*\}\s*/, '').split(/[^a-zа-яё]+/i).filter((w) => w.length >= 4));
const mine = words(name);
const dir = path.join(process.cwd(), DIRS[type]);
let files = [];
try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')); } catch { /* folder missing: nothing to match */ }

const hits = files
  .map((f) => ({ f, shared: [...words(path.basename(f, '.md'))].filter((w) => mine.has(w)) }))
  .filter((h) => h.shared.length);

if (!hits.length) { console.log(`ok: в ${DIRS[type]}/ нет файлов, похожих на «${name}»`); process.exit(0); }
console.log(`найдено похожее в ${DIRS[type]}/ – дополни существующий файл вместо нового:`);
hits.forEach((h) => console.log(`  ${DIRS[type]}/${h.f}  (общие слова: ${h.shared.join(', ')})`));
process.exit(1);

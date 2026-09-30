#!/usr/bin/env node
// Bring a deployed harness folder up to the current kit without touching what people edited.
//   node tools/update-folder.mjs --dir ~/harness/marketing-sprint --since 3bb0988 [--dry]
// For every kit file: new in the kit → added · the folder still has the old kit text → updated ·
// edited in the folder → left alone and listed. --since is the engine commit the folder was last
// updated from; next time it is read from .harness/engine.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const dry = argv.includes('--dry');
const dir = opt('dir') && path.resolve(opt('dir').replace(/^~/, process.env.HOME));
if (!dir || !fs.existsSync(path.join(dir, '.git'))) { console.error('usage: update-folder.mjs --dir <harness folder with git> [--since <engine commit>] [--dry]'); process.exit(2); }
const engineFile = path.join(dir, '.harness', 'engine.json');
let since = opt('since');
if (!since) { try { since = JSON.parse(fs.readFileSync(engineFile, 'utf8')).commit; } catch { /* first update */ } }
if (!since) { console.error('нужен --since <коммит движка>, из которого папка развёрнута или обновлена в прошлый раз'); process.exit(2); }
const git = (...a) => execFileSync('git', ['-C', root, '-c', 'core.quotePath=false', ...a], { encoding: 'utf8', maxBuffer: 64e6 });
const head = git('rev-parse', '--short', 'HEAD').trim();

// the folder's own answers render the {{templates}} the same way the deploy did
let answers = JSON.parse(fs.readFileSync(path.join(root, 'kit', 'answers.json'), 'utf8'));
try { answers = { ...answers, ...(JSON.parse(fs.readFileSync(path.join(dir, '.harness', 'state.json'), 'utf8')).answers || {}) }; } catch { /* defaults */ }

const kitRoot = path.join(root, 'kit', 'files');
const files = [];
(function walk(rel) {
  for (const e of fs.readdirSync(path.join(kitRoot, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.name === '.DS_Store' || e.name === 'node_modules') continue;
    if (e.isDirectory()) walk(r); else files.push(r);
  }
})('');
const oldList = new Set(git('ls-tree', '-r', '--name-only', since, '--', 'kit/files').split('\n').filter(Boolean).map((p) => p.replace(/^kit\/files\//, '')));
const oldText = (rel) => { if (!oldList.has(rel)) return null; try { return git('show', `${since}:kit/files/${rel}`); } catch { return null; } };
const isText = (rel) => /\.(md|json|mjs|js|css|html|txt|canvas|sh)$|^\.githooks\//.test(rel);

const out = { added: [], updated: [], same: 0, edited: [], deleted: [] };
for (const rel of files) {
  const src = path.join(kitRoot, rel), dst = path.join(dir, rel);
  const raw = fs.readFileSync(src);
  const next = isText(rel) ? renderTemplate(raw.toString('utf8'), answers) : raw;
  const prevRaw = oldText(rel);
  const prev = prevRaw === null ? null : isText(rel) ? renderTemplate(prevRaw, answers) : null;
  const write = () => { if (dry) return; fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, next); const m = fs.statSync(src).mode & 0o777; if (m & 0o111) fs.chmodSync(dst, m); };
  if (!fs.existsSync(dst)) { if (prev !== null) out.deleted.push(rel); else { out.added.push(rel); write(); } continue; }
  const cur = isText(rel) ? fs.readFileSync(dst, 'utf8') : fs.readFileSync(dst);
  if (isText(rel) ? cur === next : Buffer.compare(cur, next) === 0) { out.same++; continue; }
  if (prev !== null && cur === prev) { out.updated.push(rel); write(); continue; }
  out.edited.push(rel);
}
// Obsidian settings stay personal: only the graph colours are shared
const gi = path.join(dir, '.gitignore');
let gitignore = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
const giFixed = gitignore.includes('.obsidian/*') ? gitignore : `${gitignore.replace(/^\.obsidian\/workspace\*\n?/m, '')}${gitignore.endsWith('\n') || !gitignore ? '' : '\n'}.obsidian/*\n!.obsidian/graph.json\n`;
const tracked = execFileSync('git', ['-C', dir, 'ls-files', '.obsidian'], { encoding: 'utf8' }).split('\n').filter((p) => p && p !== '.obsidian/graph.json');
if (!dry) {
  if (giFixed !== gitignore) fs.writeFileSync(gi, giFixed);
  if (tracked.length) execFileSync('git', ['-C', dir, 'rm', '-q', '--cached', '--', ...tracked]);
  fs.mkdirSync(path.dirname(engineFile), { recursive: true });
  fs.writeFileSync(engineFile, JSON.stringify({ commit: head, at: new Date().toISOString() }));
}
const list = (t, a) => a.length && console.log(`${t} · ${a.length}\n${a.map((x) => `  ${x}`).join('\n')}`);
console.log(`${dry ? 'проба · ' : ''}набор ${since} → ${head} · папка ${dir.replace(process.env.HOME, '~')}`);
list('добавлено', out.added); list('обновлено', out.updated);
list('правлено в папке, не тронуто', out.edited); list('удалено в папке, не возвращаю', out.deleted);
console.log(`без изменений · ${out.same}`);
if (giFixed !== gitignore) console.log('.gitignore: настройки Obsidian личные, общий только graph.json');
if (tracked.length) console.log(`убраны из git (файлы на месте): ${tracked.join(', ')}`);

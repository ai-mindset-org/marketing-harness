#!/usr/bin/env node
// kit/ → web/scenario.json (replay mode data). Run after any kit edit.
// Before the timeline is built, the kit's own scripts produce what the agents
// "write" in the demo: rendered HTML (bin/render.mjs) and check reports
// (bin/check.mjs) – the final one and the one before li-02 was rewritten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kit = path.join(root, 'kit');
const files = path.join(kit, 'files');
const DATE = '2026-09-29';
const run = (cwd, a) => { try { execFileSync(process.execPath, a, { cwd, stdio: 'ignore' }); } catch { /* check exits 1 on a fail – expected for v1 */ } };

run(files, ['bin/render.mjs', 'all']);
run(files, ['bin/check.mjs', '--date', DATE]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-kit-'));
fs.cpSync(files, tmp, { recursive: true });
fs.copyFileSync(path.join(kit, 'versions', 'li-02 creative codes.v1.md'), path.join(tmp, 'outputs/linkedin/{post} li-02 creative codes.md'));
run(tmp, ['bin/check.mjs', '--date', DATE]);
fs.copyFileSync(path.join(tmp, `evals/{eval} checks – ${DATE}.md`), path.join(kit, 'versions', 'checks.v1.md'));
fs.rmSync(tmp, { recursive: true, force: true });

const tl = buildTimeline(kit);
let n = 0x3a7f1;
for (const e of tl.events) if (e.type === 'commit') e.hash = (n = (n * 7919 + 104729) % 0xfffffff).toString(16).padStart(7, '0').slice(0, 7);
tl.generated = new Date().toISOString();
const out = path.join(root, 'web', 'scenario.json');
fs.writeFileSync(out, JSON.stringify(tl));
const paths = new Set();
for (const e of tl.events) { if (e.type === 'file') paths.add(e.path); if (e.type === 'rename') { paths.delete(e.from); paths.add(e.to); } }
// documents for guide.html and access.html: kit markdown rendered with the default answers
const { renderTemplate } = await import('./timeline.mjs');
const answers = JSON.parse(fs.readFileSync(path.join(kit, 'answers.json'), 'utf8'));
const DOC_DIRS = ['tools', 'guides', 'roles', 'automations', 'gates', 'design'];
const DOC_FILES = ['README.md', 'AGENTS.md', 'sources/{source} index.md', 'rules/{rule} principles.md', 'rules/{rule} boundaries.md', 'rules/{rule} naming.md',
  'skills/{skill} harness-principles.md', 'skills/{skill} research-exa.md', 'skills/{skill} fact-check.md', 'skills/{skill} adlib-recon.md', 'skills/{skill} trendwatch.md', 'skills/{skill} harness-evolve.md'];
const docs = {};
for (const d of DOC_DIRS) for (const f of fs.readdirSync(path.join(files, d)).filter((x) => x.endsWith('.md'))) DOC_FILES.push(`${d}/${f}`);
for (const rel of DOC_FILES) { const p = path.join(files, rel); if (fs.existsSync(p)) docs[rel] = renderTemplate(fs.readFileSync(p, 'utf8'), answers); }
fs.writeFileSync(path.join(root, 'web', 'kit-docs.json'), JSON.stringify({ generated: tl.generated, docs }));
console.log(`docs → web/kit-docs.json · ${Object.keys(docs).length} файлов`);
console.log(`scenario → ${path.relative(root, out)} · ${tl.phases.length} фаз · ${tl.events.length} событий · ${paths.size} файлов · ${(tl.duration / 1000).toFixed(0)} с`);

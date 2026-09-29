#!/usr/bin/env node
// Level-1 evals: deterministic checks over outputs/ (no model, seconds).
//   node bin/check.mjs                 → evals/{eval} checks – <today>.md, exit 1 on a hard fail
//   node bin/check.mjs --golden        → regression run over evals/{eval} golden-set.md
//   node bin/check.mjs --date 2026-09-29 --json
// Stop-words come from rules/{rule} anti-slop.md, facts from context/{context} truth-pack.md and sources/.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const today = opt('date', new Date().toISOString().slice(0, 10));
const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; } };
const walk = (dir) => { try { return fs.readdirSync(path.join(root, dir), { recursive: true }).map(String).map((f) => path.join(dir, f)); } catch { return []; } };

// ---------- rule sources ----------
const antiSlop = read('rules/{rule} anti-slop.md');
const stopSection = (antiSlop.split('## стоп-лист слов')[1] || '').split('\n## ')[0];
const STOP_WORDS = stopSection.split('\n').join(' ').split('·').map((w) => w.trim().toLowerCase()).filter((w) => w && w.length > 3)
  .map((w) => w.split(' ').map((x) => x.slice(0, Math.max(5, x.length - 2))).join(' '));
const CUSHIONS = ['честно говоря', 'стоит отметить', 'важно понимать', 'давайте разберёмся', 'давайте разберемся', 'ниже –', 'в этом посте', 'секрет в том', 'и вот что важно'];
const ANTITHESIS = [
  /(^|[\s.,;:!?«"(])не\s+(?:просто\s+|только\s+)?[^.,;:!?\n]{1,40}?,\s*а\s+/i,
  /это\s+не\s+[^.;:!?\n]{1,40}?\s+[–-]\s+это/i,
  /вместо\s+[^.;:!?\n]{1,40}?\s+[–-]\s+/i,
];
const LENGTH = { linkedin: [700, 1700], telegram: [300, 1600] };

// ---------- facts corpus: number + unit keys ----------
const NUM = /(\$|€)?(\d+(?:[  ]\d{3})*(?:[.,]\d+)?)(?:\s?[–-]\s?\d+)?\s*(%|\$|€|[a-zа-яё]+)?/gi;
const keyOf = (m) => `${m[2].replace(/[  ]/g, '').replace(',', '.')}|${(m[3] || m[1] || '').toLowerCase().slice(0, 3)}`;
const corpusText = [read('context/{context} truth-pack.md'), ...walk('sources').filter((f) => f.endsWith('.md')).map(read), ...walk('nuclei').filter((f) => f.endsWith('.md')).map(read)].join('\n');
const FACT_KEYS = new Set([...corpusText.matchAll(NUM)].map(keyOf));
const FACT_NUMS = new Set([...corpusText.matchAll(NUM)].map((m) => m[2].replace(/[  ]/g, '')));

function frontmatter(t) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(t);
  const fm = {};
  if (m) m[1].split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); });
  return { fm, body: m ? t.slice(m[0].length) : t };
}

// text-level checks shared by drafts and the golden set
function textChecks(body) {
  const lower = body.toLowerCase();
  const found = {
    emdash: (body.match(/—/g) || []).length,
    antithesis: ANTITHESIS.map((re) => (re.exec(body) || [])[0]).filter(Boolean).map((s) => s.trim().slice(0, 60)),
    stopwords: STOP_WORDS.filter((w) => lower.includes(w)),
    cushions: CUSHIONS.filter((c) => lower.includes(c)),
  };
  return found;
}

function checkDraft(file) {
  const { fm, body: raw } = frontmatter(read(file));
  const body = raw.replace(/^\|\s*\d+\s*\|/gm, '|'); // slide numbers of briefs are not facts
  const t = textChecks(body);
  const missing = ['nucleus', 'channel', 'segment', 'code', 'status'].filter((k) => !fm[k]);
  const codeOk = /^P\d-H\d-A\d-F\d$/.test(fm.code || '');
  const len = body.replace(/\s+/g, ' ').trim().length;
  const bounds = LENGTH[(fm.channel || '').toLowerCase()];
  const lengthOk = !bounds || (len >= bounds[0] && len <= bounds[1]);
  // a number passes when the same number+unit is in the facts corpus, or when it is >= 10 and appears there at all;
  // small numbers need the unit to match ("в 3 раза" fails even though "3 недели" exists)
  const unsourced = [...body.matchAll(NUM)].filter((m) => {
    const n = m[2].replace(/[  ]/g, '');
    if (/^[12]$/.test(n) || FACT_KEYS.has(keyOf(m))) return false;
    return !(FACT_NUMS.has(n) && (parseFloat(n.replace(',', '.')) >= 10 || m[3] === undefined));
  }).map((m) => m[0].trim()).filter((s) => !/^P\d|^H\d|^A\d|^F\d/.test(s));
  const links = (body.match(/https?:\/\//g) || []).length;
  const hard = t.emdash > 0 || t.antithesis.length > 0 || t.stopwords.length > 0 || missing.length > 0 || !codeOk;
  const soft = t.cushions.length > 0 || !lengthOk || unsourced.length > 0 || ((fm.channel === 'linkedin') && links > 0);
  return { file, channel: fm.channel || '', code: fm.code || '', len, lengthOk, missing, codeOk, links, unsourced, ...t, verdict: hard ? 'fail' : soft ? 'warn' : 'pass' };
}

// ---------- golden set regression ----------
function golden() {
  const text = read('evals/{eval} golden-set.md');
  const blocks = [...text.matchAll(/```golden (pass|fail)(?::\s*([^\n]*))?\n([\s\S]*?)```/g)];
  let ok = 0;
  const rows = blocks.map(([, expect, why, body], i) => {
    const t = textChecks(body);
    const got = t.emdash || t.antithesis.length || t.stopwords.length || t.cushions.length ? 'fail' : 'pass';
    const pass = got === expect;
    if (pass) ok++;
    return `${pass ? '✓' : '✗'} пример ${i + 1}: ждали ${expect}${why ? ` (${why.trim()})` : ''}, получили ${got}`;
  });
  console.log(rows.join('\n'));
  console.log(`golden set: ${ok}/${blocks.length}`);
  process.exit(ok === blocks.length ? 0 : 1);
}
if (argv.includes('--golden')) golden();

// ---------- run over outputs ----------
const drafts = walk('outputs').filter((f) => f.endsWith('.md'));
const results = drafts.map(checkDraft);
if (argv.includes('--json')) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }

const mark = (b) => (b ? '✓' : '✗');
const rows = results.map((r) => `| [[${path.basename(r.file, '.md')}]] | ${r.emdash ? `✗ ${r.emdash}` : '✓'} | ${r.antithesis.length ? `✗ «${r.antithesis[0]}»` : '✓'} | ${r.stopwords.length ? `✗ ${r.stopwords.join(', ')}` : '✓'} | ${r.cushions.length ? `! ${r.cushions.join(', ')}` : '✓'} | ${r.missing.length ? `✗ ${r.missing.join(', ')}` : '✓'} | ${mark(r.codeOk)} ${r.code} | ${r.lengthOk ? '✓' : '!'} ${r.len} | ${r.unsourced.length ? `! ${r.unsourced.slice(0, 3).join(', ')}` : '✓'} | **${r.verdict}** |`);
const counts = results.reduce((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] || 0) + 1 }), {});
const report = `---
title: проверки кодом
generated_by: bin/check.mjs
date: ${today}
---
# проверки кодом · ${today}

Уровень 1 из [[{rule} evals]]. Стоп-слова берутся из [[{rule} anti-slop]], факты – из [[{context} truth-pack]] и \`sources/\`. ✗ – жёсткий провал, ! – предупреждение.

| черновик | тире | антитеза | стоп-слова | подушки | frontmatter | код | длина | числа без источника | итог |
|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

итог: pass ${counts.pass || 0} · warn ${counts.warn || 0} · fail ${counts.fail || 0}. провалы уходят автору до судьи ([[{skill} slop-check]]).
`;
const out = `evals/{eval} checks – ${today}.md`;
fs.mkdirSync(path.join(root, 'evals'), { recursive: true });
fs.writeFileSync(path.join(root, out), report);
console.log(`${out} · pass ${counts.pass || 0} · warn ${counts.warn || 0} · fail ${counts.fail || 0}`);
process.exit(counts.fail ? 1 : 0);

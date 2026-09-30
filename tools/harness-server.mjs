#!/usr/bin/env node
// Zero-dependency local server for the harness instrument.
//   node tools/harness-server.mjs --dir ~/Demos/marketing-harness --port 4747
//
// GET  /api/state            watched folder as JSON (files, harness state, git log with files, runs)
// GET  /api/session          per-launch token for write calls (same-origin only)
// GET  /api/tools            which tools are ready: env vars present (never values), CLIs, server reachability
// GET  /api/runs/:id         one agent session: steps, tokens, result, touched files, commit
// GET  /api/commit/:hash     commit card: message, author, files, diff
// GET  /api/history?path=    commits that touched a file · &commit= adds that version and its diff
// POST /api/agent            {runner: claude|codex|sotnik, prompt, model?, role?}  header X-Harness-Token
// POST /api/runs/:id/stop
// POST /api/file             {path, content, create?}  human edit from the preview panel, then a commit
// POST /api/revert           {commit}  git revert, a new commit that undoes it
// POST /api/restore          {path, commit}  the file as it was in that commit, committed
// POST /api/fork             {to, at?, open?}  bin/fork.sh: a copy of the folder with its history
// POST /api/open             {path, app: default|obsidian|finder}  open a file (or the folder: path '') on this Mac
// POST /api/continue         release a demo that waits at a phase stop (harness-demo --stops)
// Binds to 127.0.0.1, answers only to Host localhost/127.0.0.1 (no DNS rebinding),
// write calls need a custom header with the session token.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { walk, redact, readJson, sh, gitLog, gitInfo } from './folder-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const dir = path.resolve((args.dir || '.').replace(/^~/, process.env.HOME));
const port = Number(args.port || 4747);
const web = path.join(root, 'web');
const SERVER_HOST = process.env.HARNESS_SERVER_HOST || 'ws-povalyaev';
const SERVER_BASE = process.env.HARNESS_SERVER_BASE || '~/harness';
const TOKEN = crypto.randomBytes(16).toString('hex');
const DEFAULT_CLAUDE_MODEL = process.env.HARNESS_CLAUDE_MODEL || 'opus';
const HOME = process.env.HOME || '';
const home = (s) => String(s).split(HOME).join('~');

// ---------- tools status (presence only, values never leave the process) ----------
const ENV_TOOLS = [
  ['exa', 'EXA_API_KEY', 'Exa MCP – поиск'],
  ['lms', 'AIM_LMS_TOKEN', 'LMS API – транскрипты сессий'],
  ['linkedin', 'LINKEDIN_ACCESS_TOKEN', 'LinkedIn Posts API'],
  ['telegram', 'TELEGRAM_BOT_TOKEN', 'Telegram Bot API'],
  ['gemini', 'GEMINI_API_KEY', 'Gemini – разбор роликов'],
  ['apify', 'APIFY_TOKEN', 'Apify – сбор Ads Library'],
];
let toolsCache = { at: 0, data: null };
function toolsStatus() {
  if (Date.now() - toolsCache.at < 60000 && toolsCache.data) return toolsCache.data;
  const has = (bin) => !!sh('which', [bin]);
  const lms = sh('curl', ['-s', '-m', '4', 'https://learn.aimindset.org/api/v1']);
  const ssh = sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=4', SERVER_HOST, 'command -v codex >/dev/null && echo ok']);
  const data = [
    ...ENV_TOOLS.map(([id, env, what]) => ({ id, what, ready: !!process.env[env], hint: `export ${env}=… в ~/.zshrc`, env })),
    { id: 'lms-api', what: 'learn.aimindset.org/api/v1 отвечает', ready: !!lms && lms.includes('"ok":true') },
    { id: 'claude', what: 'Claude Code CLI', ready: has('claude') },
    { id: 'codex', what: 'Codex CLI локально', ready: has('codex') },
    { id: 'sotnik', what: `Сотник: codex на ${SERVER_HOST}`, ready: ssh === 'ok' },
    { id: 'gh', what: 'GitHub CLI', ready: has('gh') },
    { id: 'gitleaks', what: 'gitleaks – секрет-скан в pre-commit', ready: has('gitleaks') },
    { id: 'hooks', what: 'гейты включены (core.hooksPath .githooks)', ready: sh('git', ['-C', dir, 'config', 'core.hooksPath']) === '.githooks' },
    { id: 'obsidian', what: 'Obsidian', ready: fs.existsSync('/Applications/Obsidian.app') },
  ];
  toolsCache = { at: Date.now(), data };
  return data;
}

// ---------- git: commits that tell the truth ----------
const git = (a, opts = {}) => {
  const r = spawnSync('git', ['-C', dir, '-c', 'core.quotePath=false', ...a], { encoding: 'utf8', timeout: 60000, ...opts });
  return { code: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
const head = () => git(['rev-parse', '--short', 'HEAD']).out || null;
// who edits: the person from `git config user.name` if set, the agent says so in the name
function author(kind) {
  const name = git(['config', 'user.name']).out, email = git(['config', 'user.email']).out;
  if (kind === 'agent') return { name: name ? `harness-agent · ${name}` : 'harness-agent', email: email || 'harness@aimindset.local' };
  return { name: name || 'harness-editor', email: email || 'harness@aimindset.local' };
}
const withAuthor = (kind) => { const a = author(kind); return ['-c', `user.name=${a.name}`, '-c', `user.email=${a.email}`]; };
// commit exactly these paths; the pre-commit gate may refuse – then say so and unstage
function commitPaths(paths, msg, kind) {
  const list = [...new Set(paths)].filter(Boolean);
  if (!list.length) return { commit: null, nothing: true };
  const before = head();
  git(['add', '-A', '--', ...list]);
  const r = git([...withAuthor(kind), 'commit', '-q', '-m', msg, '--', ...list]);
  const after = head();
  if (after && after !== before) return { commit: after };
  git(['reset', '-q', '--', ...list]);
  const text = `${r.err}\n${r.out}`.trim();
  if (/nothing to commit|no changes added|nothing added/i.test(text)) return { commit: null, nothing: true };
  return { commit: null, gate: redact(home(text)).split('\n').filter((l) => !/^hint:/.test(l)).slice(-8).join('\n') || 'коммит не прошёл' };
}
const isHash = (h) => /^[0-9a-f]{7,40}$/.test(String(h || ''));
const commitExists = (h) => isHash(h) && git(['cat-file', '-t', h]).out === 'commit';

// ---------- agent runs: live stream, tokens, session record ----------
const runs = new Map();
const runsDir = path.join(dir, '.harness', 'runs');
const MAX_STEPS = 500;
fs.mkdirSync(runsDir, { recursive: true });
const runMeta = ({ proc, stopRemote, steps, snapshot, msgUsage, pid, ...r }) => ({ ...r, touched: [...(r.touched || [])] });
function saveRun(run) {
  try { fs.writeFileSync(path.join(runsDir, `${run.id}.json`), JSON.stringify({ ...runMeta(run), steps: run.steps.slice(-MAX_STEPS) })); } catch { /* disk */ }
}
// earlier runs survive a restart: *.json of this version, bare *.log of older ones
function loadRuns() {
  let names = [];
  try { names = fs.readdirSync(runsDir); } catch { return; }
  for (const n of names.filter((x) => x.endsWith('.json'))) {
    const r = readJson(path.join(runsDir, n), null);
    if (!r || !r.id) continue;
    if (r.status === 'running') r.status = 'lost';
    r.steps = r.steps || []; r.touched = new Set(r.touched || []);
    runs.set(r.id, r);
  }
  for (const n of names.filter((x) => x.endsWith('.log'))) {
    const id = n.replace(/\.log$/, '');
    if (runs.has(id)) continue;
    let txt = '';
    try { txt = fs.readFileSync(path.join(runsDir, n), 'utf8'); } catch { continue; }
    const h = /^\[harness\] (\w+) · (\S+)/.exec(txt);
    const p = /^\[prompt\] (.*)$/m.exec(txt);
    const end = /\[harness\] (\w+) · code (-?\d+) · (\d+) s/.exec(txt);
    if (!h) continue;
    const startedAt = Date.parse(h[2]);
    runs.set(id, { id, runner: h[1], prompt: p ? p[1] : '', model: '', role: '', status: end ? (end[2] === '143' ? 'stopped' : end[1]) : 'lost', startedAt,
      endedAt: end ? startedAt + Number(end[3]) * 1000 : null, code: end ? Number(end[2]) : null, usage: null, steps: [], touched: new Set(), legacy: true,
      result: txt.replace(/^\[harness\][^\n]*\n\[prompt\][^\n]*\n\n?/, '').replace(/\n\[harness\][^\n]*\n?$/, '').trim().slice(0, 4000) });
  }
}
loadRuns();
function logTail(id, n = 40) {
  try { return redact(home(fs.readFileSync(path.join(runsDir, `${id}.log`), 'utf8'))).split('\n').slice(-n).join('\n'); } catch { return ''; }
}
function runtimeMcpConfig() {
  // keep only servers whose ${VARS} are set, so a missing key never breaks a run
  const cfg = readJson(path.join(dir, '.mcp.json'), { mcpServers: {} });
  const out = { mcpServers: {} };
  for (const [name, s] of Object.entries(cfg.mcpServers || {})) {
    const vars = [...JSON.stringify(s).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
    if (vars.every((v) => process.env[v])) out.mcpServers[name] = s;
  }
  const p = path.join(dir, '.harness', 'mcp.runtime.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  return { path: p, names: Object.keys(out.mcpServers) };
}
// run ids: time to the second plus a counter, two launches in one second never share a log
function newRunId(runner) {
  const d = new Date();
  const stamp = `${d.toISOString().slice(0, 10).replace(/-/g, '')}-${d.toTimeString().slice(0, 8).replace(/:/g, '')}`;
  let id = `${stamp}-${runner}`, k = 2;
  while (runs.has(id) || fs.existsSync(path.join(runsDir, `${id}.log`))) id = `${stamp}-${runner}-${k++}`;
  return id;
}
const relOf = (p) => {
  const s = String(p || '');
  if (!s) return '';
  const abs = path.isAbsolute(s) ? s : path.join(dir, s);
  const r = path.relative(dir, abs);
  return r.startsWith('..') ? '' : r.split(path.sep).join('/');
};
// dirty paths with mtime: what the folder looked like when a run started
// content hash: rsync (сотник) brings files back with whole-second mtimes, same text must not count
const fileHash = (p) => { try { const f = path.join(dir, p); return fs.statSync(f).size > 4e6 ? '' : crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex'); } catch { return ''; } };
function dirtySnapshot(withHash = false) {
  const out = new Map();
  const hashes = new Map();
  out.hashes = hashes;
  // raw stdout: a trim would eat the leading space of the first status code
  const st = spawnSync('git', ['-C', dir, 'status', '--porcelain', '-uall', '-z'], { encoding: 'utf8', timeout: 20000 }).stdout || '';
  for (const rec of st.split('\0').filter((x) => /^[ MADRCU?!]{2} ./.test(x))) {
    const p = rec.slice(3);
    let m = 0; try { m = fs.statSync(path.join(dir, p)).mtimeMs; } catch { m = -1; }
    out.set(p, m);
    if (withHash && m >= 0) hashes.set(p, fileHash(p));
  }
  return out;
}
const IGNORE_TOUCH = /^(\.obsidian\/|\.harness\/|\.claude\/skills\/|\.agents\/)|(^|\/)\.DS_Store$/;
function changedByRun(run) {
  const now = dirtySnapshot();
  const others = new Set();
  for (const r of runs.values()) if (r !== run && r.status === 'running') for (const p of r.touched) others.add(p);
  const out = new Set();
  for (const [p, m] of now) {
    if (IGNORE_TOUCH.test(p)) continue;
    const before = run.snapshot?.get(p);
    if (before !== undefined && (before === m || (run.snapshot.hashes.get(p) && run.snapshot.hashes.get(p) === fileHash(p)))) continue; // dirty before the run and unchanged since
    if (m >= 0 && m < run.startedAt - 1000 && before === undefined) continue;
    if (others.has(p) && !run.touched.has(p)) continue; // another live run owns it
    out.add(p);
  }
  for (const p of run.touched) if (now.has(p) && !IGNORE_TOUCH.test(p)) out.add(p);
  return [...out];
}
const skillOfPrompt = (p) => (/скилл[уа]?\s+([a-z][\w-]+)/i.exec(p) || /\{skill\}\s+([a-z][\w-]+)/.exec(p) || [])[1] || '';
const ROLE_TITLES = { ingest: 'загрузчик', researcher: 'исследователь', extractor: 'экстрактор', writer: 'автор', designer: 'дизайнер', critic: 'критик' };
function taskLabel(run) {
  const bits = [ROLE_TITLES[run.role], run.skill].filter(Boolean);
  return bits.length ? bits.join(' · ') : run.prompt.replace(/\s+/g, ' ').slice(0, 60);
}

function step(run, kind, text) {
  const t = redact(home(String(text || ''))).trim();
  if (!t) return;
  run.steps.push({ t: Date.now(), kind, text: t.slice(0, kind === 'text' ? 1500 : 400) });
  if (run.steps.length > MAX_STEPS * 2) run.steps.splice(0, run.steps.length - MAX_STEPS);
  run.last = `${kind === 'tool' ? '▸ ' : kind === 'file' ? '✎ ' : kind === 'cmd' ? '$ ' : ''}${t.split('\n')[0].slice(0, 120)}`;
  fs.appendFile(path.join(runsDir, `${run.id}.log`), `${new Date().toTimeString().slice(0, 8)} ${kind.padEnd(5)} ${t}\n`, () => {});
}
const toolArg = (name, inp = {}) => {
  const f = inp.file_path || inp.notebook_path || inp.path;
  if (f) return relOf(f) || home(f);
  if (inp.command) return inp.command;
  if (inp.pattern) return `${inp.pattern}${inp.path ? ` в ${relOf(inp.path)}` : ''}`;
  if (inp.query) return inp.query;
  if (inp.url) return inp.url;
  if (inp.skill) return inp.skill;
  const s = JSON.stringify(inp); return s.length > 2 ? s.slice(0, 160) : '';
};
// claude -p --output-format stream-json: one JSON event per line
function claudeEvent(run, e) {
  if (e.type === 'system' && e.subtype === 'init') {
    run.sessionModel = e.model;
    step(run, 'sys', `модель ${e.model} · инструментов ${(e.tools || []).length}${(e.mcp_servers || []).length ? ` · mcp: ${e.mcp_servers.map((m) => `${m.name} ${m.status}`).join(', ')}` : ''}`);
  } else if (e.type === 'assistant' && e.message) {
    const m = e.message;
    if (m.usage && m.id) { run.msgUsage ||= {}; run.msgUsage[m.id] = m.usage; }
    for (const b of m.content || []) {
      if (b.type === 'text') step(run, 'text', b.text);
      if (b.type === 'tool_use') {
        const a = toolArg(b.name, b.input);
        if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(b.name)) { const r = relOf(b.input?.file_path || b.input?.notebook_path); if (r) run.touched.add(r); step(run, 'file', `${b.name} ${a}`); }
        else if (b.name === 'Bash') step(run, 'cmd', a);
        else step(run, 'tool', `${b.name.replace(/^mcp__/, 'mcp ')} ${a}`);
      }
    }
    const u = Object.values(run.msgUsage || {});
    run.usage = { input: u.reduce((s, x) => s + (x.input_tokens || 0) + (x.cache_creation_input_tokens || 0), 0), cached: u.reduce((s, x) => s + (x.cache_read_input_tokens || 0), 0), output: u.reduce((s, x) => s + (x.output_tokens || 0), 0), cost: null };
    run.turns = u.length;
  } else if (e.type === 'user' && e.message) {
    for (const b of e.message.content || []) if (b.type === 'tool_result' && b.is_error) step(run, 'err', typeof b.content === 'string' ? b.content : JSON.stringify(b.content));
  } else if (e.type === 'result') {
    const u = e.usage || {};
    run.usage = { input: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0), cached: u.cache_read_input_tokens || 0, output: u.output_tokens || 0, cost: e.total_cost_usd ?? null };
    run.turns = e.num_turns; run.result = redact(home(String(e.result || ''))).slice(0, 6000);
    if (e.is_error) step(run, 'err', `claude: ${e.subtype}`);
  }
}
// codex exec --json
function codexEvent(run, e, mapPath = relOf) {
  const it = e.item || {};
  if (e.type === 'item.completed' || (e.type === 'item.started' && it.type === 'command_execution')) {
    if (it.type === 'agent_message') { step(run, 'text', it.text); run.result = redact(home(String(it.text || ''))).slice(0, 6000); }
    else if (it.type === 'reasoning' && e.type === 'item.completed') step(run, 'think', it.text);
    else if (it.type === 'command_execution') { if (e.type === 'item.started') step(run, 'cmd', it.command); else if (it.exit_code) step(run, 'err', `код ${it.exit_code}: ${it.command}`); }
    else if (it.type === 'file_change' && e.type === 'item.completed') for (const c of it.changes || []) { const r = mapPath(c.path); if (r) run.touched.add(r); step(run, 'file', `${c.kind} ${r || c.path}`); }
    else if (it.type === 'mcp_tool_call' && e.type === 'item.completed') step(run, 'tool', `mcp ${it.server || ''} ${it.tool || ''}`);
    else if (it.type === 'error') step(run, 'err', it.message);
  } else if (e.type === 'turn.completed' && e.usage) {
    const u = e.usage, p = run.usage || { input: 0, cached: 0, output: 0, cost: null };
    run.usage = { input: p.input + Math.max(0, (u.input_tokens || 0) - (u.cached_input_tokens || 0)), cached: p.cached + (u.cached_input_tokens || 0), output: p.output + (u.output_tokens || 0), cost: null };
    run.turns = (run.turns || 0) + 1;
  } else if (e.type === 'error' || e.type === 'turn.failed') step(run, 'err', e.message || e.error?.message || 'ошибка');
}
function lineReader(onLine) {
  let buf = '';
  return (chunk) => { buf += chunk.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) onLine(l); } };
}
const jsonLines = (run, handler, raw) => lineReader((l) => { let e; try { e = JSON.parse(l); } catch { raw(l); return; } handler(run, e); });

let codexHelp = null;
const codexSupports = (flag) => { if (codexHelp === null) codexHelp = sh('codex', ['exec', '--help']) || ''; return codexHelp.includes(flag); };

function startRun({ runner, prompt, model, role }) {
  const id = newRunId(runner);
  const run = { id, runner, prompt, role: role || '', skill: skillOfPrompt(prompt), model: model || (runner === 'claude' ? DEFAULT_CLAUDE_MODEL : 'gpt-5.6-terra'), status: 'running',
    startedAt: Date.now(), endedAt: null, code: null, usage: null, turns: 0, steps: [], touched: new Set(), commit: null, gate: null, session: null, result: '', by: git(['config', 'user.name']).out || '' };
  run.snapshot = dirtySnapshot(true);
  runs.set(id, run);
  fs.writeFileSync(path.join(runsDir, `${id}.log`), `[harness] ${runner} · ${new Date().toISOString()}\n[prompt] ${prompt}\n\n`);
  const raw = (l) => { if (!/^\d{4}-\d\d-\d\dT.*(ERROR|WARN) rmcp|^Reading additional input from stdin/.test(l)) step(run, 'out', l); };
  const finish = (code) => {
    if (run.status !== 'running') return;
    run.code = code; run.endedAt = Date.now();
    run.status = run.stopped ? 'stopped' : code === 0 ? 'done' : 'failed';
    fs.appendFileSync(path.join(runsDir, `${id}.log`), `\n[harness] ${run.status} · code ${code} · ${Math.round((run.endedAt - run.startedAt) / 1000)} s\n`);
    closeRun(run);
  };
  step(run, 'sys', `${runner} · ${run.model}${role ? ` · роль ${ROLE_TITLES[role] || role}` : ''}`);
  if (runner === 'claude') {
    const mcp = runtimeMcpConfig();
    const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'Bash(node bin/*)', 'Bash(git status)', 'Bash(git diff*)', 'Bash(git log*)'];
    if (mcp.names.includes('exa')) tools.push('mcp__exa__web_search_exa', 'mcp__exa__web_search_advanced_exa', 'mcp__exa__web_fetch_exa');
    if (mcp.names.includes('lms')) tools.push('mcp__lms');
    // project settings only: the launcher's global CLAUDE.md and hooks stay out of the harness
    const p = spawn('claude', ['-p', prompt, '--model', run.model, '--permission-mode', 'acceptEdits', '--max-turns', '40', '--setting-sources', 'project,local',
      '--output-format', 'stream-json', '--verbose', '--mcp-config', mcp.path, '--strict-mcp-config', '--allowedTools', tools.join(',')], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    run.pid = p.pid; run.proc = p;
    p.stdout.on('data', jsonLines(run, claudeEvent, raw)); p.stderr.on('data', lineReader(raw));
    p.on('exit', finish); p.on('error', (e) => { step(run, 'err', e.message); finish(1); });
  } else if (runner === 'codex') {
    // codex 0.156 dropped --full-auto: the sandbox flag says the same (write inside the folder)
    const a = ['exec', '--json', '--skip-git-repo-check', '-s', 'workspace-write', '-C', dir, '-m', run.model, '-c', 'model_reasoning_effort="medium"'];
    if (codexSupports('--ignore-user-config')) a.splice(1, 0, '--ignore-user-config');
    const p = spawn('codex', [...a, prompt], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    run.pid = p.pid; run.proc = p;
    p.stdout.on('data', jsonLines(run, codexEvent, raw)); p.stderr.on('data', lineReader(raw));
    p.on('exit', finish); p.on('error', (e) => { step(run, 'err', e.message); finish(1); });
  } else if (runner === 'sotnik') {
    sotnikRun(run, prompt, finish, raw);
  } else {
    step(run, 'err', 'unknown runner'); finish(2);
  }
  saveRun(run);
  return run;
}

// Sotnik = Codex on the team server. The folder is mirrored up, the agent works
// there, changes are pulled back every few seconds so the graph stays live.
function sotnikRun(run, prompt, finish, raw) {
  const name = path.basename(dir);
  const remote = `${SERVER_BASE}/${name}`;
  const rsyncBase = ['-az', '--exclude', '.harness/', '--exclude', '.git/', '--exclude', '.obsidian/workspace*'];
  const stepCmd = (cmd, a) => new Promise((res) => {
    const p = spawn(cmd, a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', lineReader(raw)); p.stderr.on('data', lineReader(raw));
    p.on('exit', res); p.on('error', () => res(1));
  });
  const mapPath = (p) => { const k = String(p).indexOf(`/${name}/`); return k >= 0 ? String(p).slice(k + name.length + 2) : ''; };
  (async () => {
    step(run, 'sys', `сотник: ${SERVER_HOST}:${remote}`);
    if (await stepCmd('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `mkdir -p ${remote} ${SERVER_BASE}/.prompts`]) !== 0) return finish(1);
    // .git goes up so the agent sees history; it never comes back (pull excludes it)
    const upBase = rsyncBase.filter((a, i) => !(a === '.git/' || (a === '--exclude' && rsyncBase[i + 1] === '.git/')));
    if (await stepCmd('rsync', [...upBase, '--delete', `${dir}/`, `${SERVER_HOST}:${remote}/`]) !== 0) return finish(1);
    const pf = `${SERVER_BASE}/.prompts/${run.id}.txt`;
    await new Promise((res) => { const p = spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `cat > ${pf}`]); p.stdin.end(prompt); p.on('exit', res); });
    // stdin closed on both ends: codex exec otherwise waits for extra input from the pipe
    const pidf = `${SERVER_BASE}/.prompts/${run.id}.pid`;
    run.stopRemote = () => spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `kill $(cat ${pidf}) 2>/dev/null`], { stdio: 'ignore' });
    const cmd = `cd ${remote} && echo $$ > ${pidf} && exec codex exec --json --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -m ${run.model} -c model_reasoning_effort='"medium"' "$(cat ${pf})" < /dev/null`;
    const p = spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, cmd], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    run.proc = p;
    p.stdout.on('data', jsonLines(run, (r, e) => codexEvent(r, e, mapPath), raw)); p.stderr.on('data', lineReader(raw));
    let pulling = false;
    const pull = async () => { if (pulling) return; pulling = true; await stepCmd('rsync', [...rsyncBase, `${SERVER_HOST}:${remote}/`, `${dir}/`]); pulling = false; };
    const timer = setInterval(pull, 4000);
    p.on('exit', async (code) => { clearInterval(timer); await pull(); finish(code ?? 1); });
    p.on('error', (e) => { clearInterval(timer); step(run, 'err', e.message); finish(1); });
  })();
}

// the end of a run: a session record in sessions/, one commit with exactly the run's files
function closeRun(run) {
  const files = run.status === 'done' ? changedByRun(run) : [];
  if (run.status !== 'done') run.uncommitted = changedByRun(run);
  run.touched = new Set([...run.touched, ...files]);
  run.files = files;
  const rel = writeSession(run, files);
  run.session = rel;
  const msg = `agent(${run.runner}): ${taskLabel(run)}`.slice(0, 90);
  const res = commitPaths([...files, rel], run.status === 'done' ? msg : `session(${run.runner}): ${run.status} · ${taskLabel(run)}`.slice(0, 90), 'agent');
  run.commit = res.commit; run.gate = res.gate || null;
  if (res.gate) step(run, 'err', `коммит остановил гейт:\n${res.gate}`);
  saveRun(run);
  delete run.snapshot;
}
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wl = (p) => `[[${p.replace(/\.md$/, '')}|${path.basename(p).replace(/\.md$/, '').replace(/^\{[a-z-]+\}\s+/, '')}]]`;
function writeSession(run, files) {
  const slug = (run.skill || run.role || 'task').replace(/[^\w-]/g, '').toLowerCase() || 'task';
  const d = new Date(run.startedAt);
  let rel = `sessions/{session} ${run.runner} ${slug} ${pad(d.getHours())}-${pad(d.getMinutes())} – ${fmtDate(run.startedAt)}.md`;
  for (let k = 2; fs.existsSync(path.join(dir, rel)); k++) rel = rel.replace(/( \d+)? – /, ` ${k} – `);
  const u = run.usage || {};
  const dur = Math.round(((run.endedAt || Date.now()) - run.startedAt) / 1000);
  const fm = [
    '---', 'type: session', `id: ${run.id}`, `runner: ${run.runner}`, `model: ${run.model}`,
    run.role ? `role: ${run.role}` : null, run.skill ? `skill: ${run.skill}` : null,
    `status: ${run.status}`, `started: ${fmtDate(run.startedAt)} ${fmtTime(run.startedAt)}`, `duration_s: ${dur}`,
    u.input !== undefined ? `tokens_in: ${u.input}` : null, u.cached ? `tokens_cached: ${u.cached}` : null, u.output !== undefined ? `tokens_out: ${u.output}` : null,
    u.cost ? `cost_usd: ${Number(u.cost).toFixed(2)}` : null, run.turns ? `turns: ${run.turns}` : null,
    run.by ? `launched_by: ${run.by}` : null, `files: ${files.length}`, '---',
  ].filter((x) => x !== null).join('\n');
  const who = [ROLE_TITLES[run.role], run.skill].filter(Boolean).join(' · ') || 'задача';
  const steps = run.steps.filter((s) => ['tool', 'file', 'cmd', 'err'].includes(s.kind));
  const shown = steps.slice(0, 60);
  const body = [
    `# сессия · ${who} · ${fmtDate(run.startedAt).slice(8)}.${fmtDate(run.startedAt).slice(5, 7)} ${fmtTime(run.startedAt)}`, '',
    `**задача:** ${redact(home(run.prompt)).replace(/\n+/g, ' ')}`, '',
    `**итог:** ${run.status === 'done' ? 'готово' : run.status === 'stopped' ? 'остановлен кнопкой «стоп»' : `упал, код ${run.code}`} · ${Math.floor(dur / 60)} мин ${dur % 60} с${u.output !== undefined ? ` · токены: вход ${u.input}, кэш ${u.cached || 0}, выход ${u.output}` : ''}`, '',
    '## ответ агента', '', (run.result || '–').trim(), '',
    '## файлы', '',
    ...(files.length ? files.map((p) => `- ${wl(p)} · \`${p}\``) : ['- –']),
    ...(run.uncommitted && run.uncommitted.length ? ['', `не закоммичено после сбоя: ${run.uncommitted.map((p) => `\`${p}\``).join(', ')}`] : []), '',
    '## ход работы', '',
    ...(shown.length ? shown.map((s) => `- ${fmtTime(s.t)} ${s.kind === 'file' ? '✎' : s.kind === 'cmd' ? '$' : s.kind === 'err' ? '✗' : '▸'} ${s.text.split('\n')[0].replace(/\|/g, '/').slice(0, 160)}`) : ['- –']),
    ...(steps.length > shown.length ? [`- … ещё ${steps.length - shown.length} шагов в журнале \`.harness/runs/${run.id}.log\``] : []), '',
    `запуск из консоли харнесса · журнал на компьютере запуска: \`.harness/runs/${run.id}.log\``, '',
  ].join('\n');
  fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), `${fm}\n${redact(body)}`);
  return rel;
}
function publicRuns() {
  return [...runs.values()].sort((a, b) => a.startedAt - b.startedAt).slice(-40).map((r) => ({ ...runMeta(r), tail: r.status === 'running' ? logTail(r.id, 12) : '' }));
}
function runDetail(id) {
  const r = runs.get(id);
  if (!r) return null;
  return { ...runMeta(r), steps: r.steps.slice(-MAX_STEPS), tail: r.legacy ? logTail(r.id, 200) : '' };
}

// ---------- human edits, history, revert, fork ----------
const EDITABLE = /\.(md|json|css|html|mjs|canvas|txt)$/;
function inside(rel) {
  const clean = String(rel || '').replace(/^\/+/, '');
  const full = path.resolve(dir, clean);
  if (full !== dir && !full.startsWith(dir + path.sep)) return null;
  if (/(^|\/)\.git(\/|$)/.test(clean) || clean.startsWith('.harness')) return null;
  return { clean, full };
}
function saveFile({ path: rel, content, create }) {
  const p = inside(rel);
  if (!p || !p.clean || !EDITABLE.test(p.clean) || typeof content !== 'string') return { error: 'путь или тип файла' };
  if (content.length > 200000) return { error: 'слишком большой файл' };
  fs.mkdirSync(path.dirname(p.full), { recursive: true });
  try { fs.writeFileSync(p.full, content, create ? { flag: 'wx' } : undefined); } catch (e) { return { error: e.code === 'EEXIST' ? 'файл уже есть' : e.message }; }
  const r = commitPaths([p.clean], `${create ? 'new' : 'edit'}(human): ${p.clean.slice(0, 80)}`, 'human');
  return { ok: true, ...r };
}
const busy = () => [...runs.values()].some((r) => r.status === 'running');
function revert({ commit }) {
  if (!commitExists(commit)) return { error: 'нет такого коммита' };
  if (busy()) return { error: 'сейчас работает агент: дождись конца запуска или останови его' };
  const before = head();
  const r = git([...withAuthor('human'), 'revert', '--no-edit', commit]);
  if (head() !== before) return { ok: true, commit: head() };
  const conflicts = git(['diff', '--name-only', '--diff-filter=U']).out;
  git(['revert', '--abort']);
  const text = redact(home(`${r.err}\n${r.out}`)).trim();
  if (conflicts) return { error: `откат задевает файлы, которые менялись позже: ${conflicts.split('\n').join(', ')}. откати сначала более поздние коммиты или верни версию отдельного файла через «история»` };
  if (/local changes|would be overwritten/i.test(text)) return { error: 'в папке есть несохранённые правки тех же файлов: закоммить их или верни, потом откатывай' };
  return { error: text.split('\n').slice(-6).join('\n') || 'откат не прошёл (гейт или конфликт)' };
}
function history(q) {
  const p = inside(q.get('path') || '');
  if (!p || !p.clean) return { error: 'путь' };
  const raw = git(['log', '--follow', '-n', '40', '--format=%h\t%aI\t%an\t%s', '--', p.clean]).out;
  const list = raw ? raw.split('\n').map((l) => { const [hash, date, who, msg] = l.split('\t'); return { hash, date, who, msg }; }) : [];
  const out = { path: p.clean, commits: list };
  const c = q.get('commit');
  if (c && commitExists(c)) {
    const at = git(['log', '--follow', '-n', '1', '--format=%H', c, '--', p.clean]).out;
    const name = git(['log', '--follow', '--name-only', '--format=', '-n', '1', c, '--', p.clean]).out.split('\n')[0] || p.clean;
    out.version = { commit: c, content: redact(git(['show', `${c}:${name}`]).out).slice(0, 60000) };
    if (at) out.version.diff = redact(home(git(['show', '--format=', '--no-color', c, '--', name]).out)).slice(0, 60000);
  }
  return out;
}
function restore({ path: rel, commit }) {
  const p = inside(rel);
  if (!p || !p.clean || !EDITABLE.test(p.clean)) return { error: 'путь' };
  if (!commitExists(commit)) return { error: 'нет такого коммита' };
  const name = git(['log', '--follow', '--name-only', '--format=', '-n', '1', commit, '--', p.clean]).out.split('\n')[0] || p.clean;
  const r = git(['show', `${commit}:${name}`]);
  if (r.code !== 0) return { error: 'в этом коммите файла нет' };
  fs.mkdirSync(path.dirname(p.full), { recursive: true });
  fs.writeFileSync(p.full, r.out.endsWith('\n') ? r.out : `${r.out}\n`);
  return { ok: true, ...commitPaths([p.clean], `restore(human): ${p.clean.slice(0, 70)} @ ${commit.slice(0, 7)}`, 'human') };
}
function commitCard(hash) {
  if (!commitExists(hash)) return { error: 'нет такого коммита' };
  const meta = git(['show', '-s', '--format=%h%x09%H%x09%aI%x09%an%x09%s%x09%b', hash]).out.split('\t');
  const files = git(['show', '--format=', '--name-status', hash]).out.split('\n').filter(Boolean).map((l) => { const [st, ...ps] = l.split('\t'); return { st: st[0], path: ps[ps.length - 1] }; });
  const diff = redact(home(git(['show', '--format=', '--no-color', '--stat=90', '-p', hash]).out));
  return { hash: meta[0], full: meta[1], date: meta[2], who: meta[3], msg: meta[4], body: (meta[5] || '').trim(), files, diff: diff.slice(0, 80000), cut: diff.length > 80000, head: head() };
}
function fork({ to, at, open }) {
  const target = path.resolve(String(to || '').trim().replace(/^~(?=\/|$)/, HOME));
  if (!to || !target.startsWith(HOME + path.sep) || /[\n"'`$]/.test(target)) return { error: 'путь внутри домашней папки, например ~/harness/моя-копия' };
  if (fs.existsSync(target)) return { error: `папка уже есть: ${home(target)}` };
  if (at && !commitExists(at)) return { error: 'нет такого коммита' };
  const r = spawnSync(path.join(root, 'bin', 'fork.sh'), [dir, target, ...(at ? ['--at', at] : [])], { encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) return { error: redact(home(`${r.stderr}\n${r.stdout}`)).trim().split('\n').slice(-4).join('\n') || 'форк не получился' };
  const openCmd = `${home(path.join(root, 'bin', 'open.sh'))} ${home(target)}`;
  if (open) spawn(path.join(root, 'bin', 'open.sh'), [target], { detached: true, stdio: 'ignore', env: process.env }).unref();
  return { ok: true, to: home(target), open: openCmd };
}

function obsidianVaults() {
  const cfg = readJson(path.join(HOME, 'Library', 'Application Support', 'obsidian', 'obsidian.json'), {});
  return Object.values(cfg.vaults || {}).map((v) => v.path).filter(Boolean);
}
function openOnMac({ path: rel, app }) {
  const p = inside(rel);
  if (!p || !fs.existsSync(p.full)) return { error: 'нет такого файла' };
  const run = (a) => spawn('open', a, { stdio: 'ignore', detached: true }).unref();
  if (app === 'finder') { run(['-R', p.full]); return { ok: true, hint: 'показано в Finder' }; }
  if (app === 'default') { run([p.full]); return { ok: true, hint: 'открыто в приложении по умолчанию' }; }
  if (app === 'obsidian') {
    const vault = obsidianVaults().find((v) => p.full === v || p.full.startsWith(v + path.sep));
    if (vault) { run([`obsidian://open?path=${encodeURIComponent(p.full)}`]); return { ok: true, hint: `открыто в Obsidian · vault ${path.basename(vault)}` }; }
    // not a known vault yet. Obsidian reads its vault list only at launch, so a closed
    // Obsidian gets the folder registered; a running one shows its vault manager.
    const cfgPath = path.join(HOME, 'Library', 'Application Support', 'obsidian', 'obsidian.json');
    const running = !!sh('pgrep', ['-x', 'Obsidian']);
    if (!running && fs.existsSync(cfgPath)) {
      const cfg = readJson(cfgPath, null);
      if (cfg && cfg.vaults) {
        cfg.vaults[crypto.randomBytes(8).toString('hex')] = { path: dir, ts: Date.now() };
        fs.writeFileSync(cfgPath, JSON.stringify(cfg));
        run([`obsidian://open?path=${encodeURIComponent(p.full)}`]);
        return { ok: true, hint: `папка добавлена в хранилища Obsidian и открыта: ${path.basename(dir)}` };
      }
    }
    try { execFileSync('pbcopy', { input: dir }); } catch { /* no clipboard */ }
    run(['obsidian://choose-vault']);
    return { ok: true, hint: `Obsidian открыт, а папки нет среди хранилищ: «Open folder as vault» и вставь путь, он уже в буфере. один раз, дальше кнопка открывает файлы сразу` };
  }
  return { error: 'app' };
}

function state() {
  return {
    dir, name: path.basename(dir),
    files: walk(dir),
    harness: readJson(path.join(dir, '.harness', 'state.json'), {}),
    commits: gitLog(dir),
    git: gitInfo(dir),
    runs: publicRuns(),
    now: Date.now(),
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.zip': 'application/zip' };
const body = (req, limit = 20000) => new Promise((res) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > limit) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } }); });
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const HOSTS = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);

fs.writeFileSync(path.join(dir, '.harness', 'server.pid'), String(process.pid));
http.createServer(async (req, res) => {
  // a page on another site that resolves its own name to 127.0.0.1 still sends its Host: refuse it
  if (!HOSTS.has(String(req.headers.host || ''))) { res.writeHead(403); return res.end('host'); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/state') return json(res, 200, state());
  if (url.pathname === '/api/session') return json(res, 200, { token: TOKEN, dir, name: path.basename(dir), serverHost: SERVER_HOST, claudeModel: DEFAULT_CLAUDE_MODEL, git: gitInfo(dir), engine: home(root) });
  if (url.pathname === '/api/tools') return json(res, 200, { tools: toolsStatus() });
  if (req.method === 'GET') {
    let m = /^\/api\/runs\/([\w-]+)$/.exec(url.pathname);
    if (m) { const r = runDetail(m[1]); return json(res, r ? 200 : 404, r || { error: 'нет запуска' }); }
    m = /^\/api\/commit\/([0-9a-f]{7,40})$/.exec(url.pathname);
    if (m) return json(res, 200, commitCard(m[1]));
    if (url.pathname === '/api/history') return json(res, 200, history(url.searchParams));
  }
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    if (req.headers['x-harness-token'] !== TOKEN) return json(res, 403, { error: 'token' });
    if (url.pathname === '/api/file') return json(res, 200, saveFile(await body(req, 250000)));
    if (url.pathname === '/api/open') return json(res, 200, openOnMac(await body(req)));
    if (url.pathname === '/api/revert') return json(res, 200, revert(await body(req)));
    if (url.pathname === '/api/restore') return json(res, 200, restore(await body(req)));
    if (url.pathname === '/api/fork') return json(res, 200, fork(await body(req)));
    if (url.pathname === '/api/continue') {
      fs.mkdirSync(path.join(dir, '.harness'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.harness', 'continue'), String(Date.now()));
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/agent') {
      const b = await body(req);
      if (!['claude', 'codex', 'sotnik'].includes(b.runner) || !b.prompt || String(b.prompt).length > 4000) return json(res, 400, { error: 'runner/prompt' });
      const r = startRun({ runner: b.runner, prompt: String(b.prompt), model: b.model ? String(b.model).replace(/[^\w.-]/g, '') : '', role: /^[a-z]{3,12}$/.test(b.role || '') ? b.role : '' });
      return json(res, 200, { id: r.id });
    }
    const m = /^\/api\/runs\/([\w-]+)\/stop$/.exec(url.pathname);
    if (m) { const r = runs.get(m[1]); if (r && r.status === 'running') { r.stopped = true; if (r.stopRemote) r.stopRemote(); if (r.proc) r.proc.kill('SIGTERM'); } return json(res, 200, { ok: !!r }); }
    return json(res, 404, { error: 'not found' });
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  // /f/<path> serves files of the watched folder (rendered carousels, landing)
  const isFolder = rel.startsWith('f/');
  const base = isFolder ? dir : web;
  const file = path.join(base, isFolder ? rel.slice(2) : rel);
  // folder files: hidden ones stay hidden except the few the graph shows
  const relF = isFolder ? path.relative(dir, file) : '';
  const hidden = isFolder && relF.split(path.sep).some((seg) => seg.startsWith('.')) && !['.mcp.json', path.join('.claude', 'settings.json')].includes(relF) && !relF.startsWith(`.githooks${path.sep}`);
  if (!file.startsWith(base) || hidden || file.includes(`${path.sep}.git${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  const type = TYPES[path.extname(file)] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  if (isFolder && /^(text\/|application\/json)/.test(type)) return res.end(redact(fs.readFileSync(file, 'utf8')));
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`harness · http://localhost:${port}/?mode=live · папка ${dir}`);
});
const bye = () => { try { if (fs.readFileSync(path.join(dir, '.harness', 'server.pid'), 'utf8') === String(process.pid)) fs.unlinkSync(path.join(dir, '.harness', 'server.pid')); } catch { /* gone */ } process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);

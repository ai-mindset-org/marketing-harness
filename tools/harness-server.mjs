#!/usr/bin/env node
// Zero-dependency local server for the harness instrument.
//   node tools/harness-server.mjs --dir ~/Demos/marketing-harness --port 4747
//
// GET  /api/state      watched folder as JSON (files, harness state, git log, runs)
// GET  /api/session    per-launch token for write calls (same-origin only)
// GET  /api/tools      which tools are ready: env vars present (never values), CLIs, server reachability
// POST /api/agent      {runner: claude|codex|sotnik, prompt, model?}  header X-Harness-Token
// POST /api/runs/:id/stop
// POST /api/file       {path, content}  human edit from the preview panel, then a commit
// POST /api/open       {path, app: default|obsidian|finder}  open a file (or the folder: path '') on this Mac
// POST /api/continue   release a demo that waits at a phase stop (harness-demo --stops)
// Binds to 127.0.0.1. Write calls need a custom header, so other sites cannot trigger them.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
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
    { id: 'obsidian', what: 'Obsidian', ready: fs.existsSync('/Applications/Obsidian.app') },
  ];
  toolsCache = { at: Date.now(), data };
  return data;
}

// ---------- agent runs ----------
const runs = new Map();
const runsDir = path.join(dir, '.harness', 'runs');
function logTail(id, n = 40) {
  try { return redact(fs.readFileSync(path.join(runsDir, `${id}.log`), 'utf8').split('\n').slice(-n).join('\n')); } catch { return ''; }
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
function autoCommit(runner, prompt) {
  sh('git', ['-C', dir, 'add', '-A']);
  sh('git', ['-C', dir, '-c', 'user.name=harness-agent', '-c', 'user.email=harness@aimindset.local', 'commit', '-q', '-m', `agent(${runner}): ${prompt.replace(/\s+/g, ' ').slice(0, 64)}`]);
}
function startRun({ runner, prompt, model }) {
  const id = `${new Date().toISOString().slice(11, 19).replace(/:/g, '')}-${runner}`;
  fs.mkdirSync(runsDir, { recursive: true });
  const logPath = path.join(runsDir, `${id}.log`);
  const log = fs.openSync(logPath, 'a');
  const write = (s) => fs.appendFileSync(logPath, s);
  const run = { id, runner, prompt, model: model || '', status: 'running', startedAt: Date.now(), endedAt: null, code: null };
  runs.set(id, run);
  const finish = (code) => {
    run.status = code === 0 ? 'done' : 'failed'; run.code = code; run.endedAt = Date.now();
    write(`\n[harness] ${run.status} · code ${code} · ${Math.round((run.endedAt - run.startedAt) / 1000)} s\n`);
    if (code === 0) autoCommit(runner, prompt);
  };
  write(`[harness] ${runner} · ${new Date().toISOString()}\n[prompt] ${prompt}\n\n`);

  if (runner === 'claude') {
    const mcp = runtimeMcpConfig();
    const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'Bash(node bin/*)', 'Bash(git status)', 'Bash(git diff*)'];
    if (mcp.names.includes('exa')) tools.push('mcp__exa__web_search_exa', 'mcp__exa__web_search_advanced_exa', 'mcp__exa__web_fetch_exa');
    if (mcp.names.includes('lms')) tools.push('mcp__lms');
    const p = spawn('claude', ['-p', prompt, '--model', model || DEFAULT_CLAUDE_MODEL, '--permission-mode', 'acceptEdits', '--max-turns', '40',
      '--mcp-config', mcp.path, '--allowedTools', tools.join(',')], { cwd: dir, stdio: ['ignore', log, log] });
    run.pid = p.pid; run.proc = p;
    p.on('exit', finish); p.on('error', (e) => { write(`\n${e.message}\n`); finish(1); });
  } else if (runner === 'codex') {
    const p = spawn('codex', ['exec', '--full-auto', '--skip-git-repo-check', '-C', dir, '-m', model || 'gpt-5.6-terra', '-c', 'model_reasoning_effort="medium"', prompt],
      { cwd: dir, stdio: ['ignore', log, log] });
    run.pid = p.pid; run.proc = p;
    p.on('exit', finish); p.on('error', (e) => { write(`\n${e.message}\n`); finish(1); });
  } else if (runner === 'sotnik') {
    sotnikRun(run, prompt, model, write, finish);
  } else {
    write('unknown runner\n'); finish(2);
  }
  return run;
}

// Sotnik = Codex on the team server. The folder is mirrored up, the agent works
// there, changes are pulled back every few seconds so the graph stays live.
function sotnikRun(run, prompt, model, write, finish) {
  const name = path.basename(dir);
  const remote = `${SERVER_BASE}/${name}`;
  const rsyncBase = ['-az', '--exclude', '.harness/', '--exclude', '.git/', '--exclude', '.obsidian/workspace*'];
  const step = (cmd, a) => new Promise((res) => {
    const p = spawn(cmd, a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (d) => write(d.toString())); p.stderr.on('data', (d) => write(d.toString()));
    p.on('exit', res); p.on('error', () => res(1));
  });
  (async () => {
    write(`[sotnik] ${SERVER_HOST}:${remote}\n`);
    if (await step('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `mkdir -p ${remote} ${SERVER_BASE}/.prompts`]) !== 0) return finish(1);
    // .git goes up so the agent sees history; it never comes back (pull excludes it)
    const upBase = rsyncBase.filter((a, i) => !(a === '.git/' || (a === '--exclude' && rsyncBase[i + 1] === '.git/')));
    if (await step('rsync', [...upBase, '--delete', `${dir}/`, `${SERVER_HOST}:${remote}/`]) !== 0) return finish(1);
    const pf = `${SERVER_BASE}/.prompts/${run.id}.txt`;
    await new Promise((res) => { const p = spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `cat > ${pf}`]); p.stdin.end(prompt); p.on('exit', res); });
    // stdin closed on both ends: codex exec otherwise waits for extra input from the pipe
    const pidf = `${SERVER_BASE}/.prompts/${run.id}.pid`;
    run.stopRemote = () => spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, `kill $(cat ${pidf}) 2>/dev/null`], { stdio: 'ignore' });
    const cmd = `cd ${remote} && echo $$ > ${pidf} && exec codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -m ${model || 'gpt-5.6-terra'} -c model_reasoning_effort='"medium"' "$(cat ${pf})" < /dev/null`;
    const p = spawn('ssh', ['-o', 'BatchMode=yes', SERVER_HOST, cmd], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    run.proc = p;
    p.stdout.on('data', (d) => write(d.toString())); p.stderr.on('data', (d) => write(d.toString()));
    let pulling = false;
    const pull = async () => { if (pulling) return; pulling = true; await step('rsync', [...rsyncBase, `${SERVER_HOST}:${remote}/`, `${dir}/`]); pulling = false; };
    const timer = setInterval(pull, 4000);
    p.on('exit', async (code) => { clearInterval(timer); await pull(); finish(code ?? 1); });
    p.on('error', (e) => { clearInterval(timer); write(`\n${e.message}\n`); finish(1); });
  })();
}

// ---------- human edits and opening files on this Mac ----------
const EDITABLE = /\.(md|json|css|html|mjs|canvas|txt)$/;
function inside(rel) {
  const clean = String(rel || '').replace(/^\/+/, '');
  const full = path.resolve(dir, clean);
  if (full !== dir && !full.startsWith(dir + path.sep)) return null;
  if (/(^|\/)\.git(\/|$)/.test(clean) || clean.startsWith('.harness')) return null;
  return { clean, full };
}
function saveFile({ path: rel, content }) {
  const p = inside(rel);
  if (!p || !p.clean || !EDITABLE.test(p.clean) || typeof content !== 'string') return { error: 'путь или тип файла' };
  if (content.length > 200000) return { error: 'слишком большой файл' };
  fs.mkdirSync(path.dirname(p.full), { recursive: true });
  fs.writeFileSync(p.full, content);
  sh('git', ['-C', dir, 'add', '--', p.clean]);
  sh('git', ['-C', dir, '-c', 'user.name=harness-editor', '-c', 'user.email=harness@aimindset.local', 'commit', '-q', '-m', `edit(human): ${p.clean.slice(0, 80)}`, '--', p.clean]);
  return { ok: true, commit: sh('git', ['-C', dir, 'rev-parse', '--short', 'HEAD']) };
}
function obsidianVaults() {
  const cfg = readJson(path.join(process.env.HOME, 'Library', 'Application Support', 'obsidian', 'obsidian.json'), {});
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
    const cfgPath = path.join(process.env.HOME, 'Library', 'Application Support', 'obsidian', 'obsidian.json');
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

function publicRuns() {
  return [...runs.values()].slice(-12).map(({ proc, stopRemote, ...r }) => ({ ...r, tail: logTail(r.id, 30) }));
}

function state() {
  return {
    dir, name: path.basename(dir),
    files: walk(dir),
    harness: readJson(path.join(dir, '.harness', 'state.json'), {}),
    commits: gitLog(dir),
    runs: publicRuns(),
    now: Date.now(),
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.zip': 'application/zip' };
const body = (req, limit = 20000) => new Promise((res) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > limit) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } }); });
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/state') return json(res, 200, state());
  if (url.pathname === '/api/session') return json(res, 200, { token: TOKEN, dir, name: path.basename(dir), serverHost: SERVER_HOST, claudeModel: DEFAULT_CLAUDE_MODEL, git: gitInfo(dir) });
  if (url.pathname === '/api/tools') return json(res, 200, { tools: toolsStatus() });
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    if (req.headers['x-harness-token'] !== TOKEN) return json(res, 403, { error: 'token' });
    if (url.pathname === '/api/file') return json(res, 200, saveFile(await body(req, 250000)));
    if (url.pathname === '/api/open') return json(res, 200, openOnMac(await body(req)));
    if (url.pathname === '/api/continue') {
      fs.mkdirSync(path.join(dir, '.harness'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.harness', 'continue'), String(Date.now()));
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/agent') {
      const b = await body(req);
      if (!['claude', 'codex', 'sotnik'].includes(b.runner) || !b.prompt || String(b.prompt).length > 4000) return json(res, 400, { error: 'runner/prompt' });
      const r = startRun({ runner: b.runner, prompt: String(b.prompt), model: b.model ? String(b.model).replace(/[^\w.-]/g, '') : '' });
      return json(res, 200, { id: r.id });
    }
    const m = /^\/api\/runs\/([\w-]+)\/stop$/.exec(url.pathname);
    if (m) { const r = runs.get(m[1]); if (r?.stopRemote) r.stopRemote(); if (r?.proc) r.proc.kill('SIGTERM'); return json(res, 200, { ok: !!r }); }
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

// Reading a harness folder the same way everywhere: the local server (live mode)
// and the exporter (team mode, a static state.json built from the git repo).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SKIP_DIRS = new Set(['.git', '.obsidian', '.claude', '.agents', '.harness', 'node_modules', '.trash']);
const KEEP_DOT_FILES = new Set(['.mcp.json']);
const SHOW = /\.(md|json|canvas|css|html|mjs)$/;
const MAX_CONTENT = 20000;

export function walk(base, rel = '', out = []) {
  let entries = [];
  try { entries = fs.readdirSync(path.join(base, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === '.githooks' && !rel) { walk(base, r, out); continue; }
      if (e.name === '.claude' && !rel) { const sp = path.join(base, r, 'settings.json'); if (fs.existsSync(sp)) out.push({ path: `${r}/settings.json`, mtime: fs.statSync(sp).mtimeMs, content: redact(fs.readFileSync(sp, 'utf8').slice(0, MAX_CONTENT)) }); continue; }
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(base, r, out);
    } else if ((SHOW.test(e.name) || rel === '.githooks') && (!e.name.startsWith('.') || KEEP_DOT_FILES.has(e.name))) {
      const full = path.join(base, r);
      const st = fs.statSync(full);
      out.push({ path: r, mtime: st.mtimeMs, content: redact(fs.readFileSync(full, 'utf8').slice(0, MAX_CONTENT)) });
    }
  }
  return out;
}
// Anything shaped like a secret is masked before it leaves the process: file
// contents, run logs and /f/ responses. ${VAR} placeholders stay readable.
const SECRET_SHAPES = [
  /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/g, /\bgh[pousr]_[A-Za-z0-9]{30,}/g, /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/g, /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bapify_api_[A-Za-z0-9]{20,}/g, /\bkrsp_[A-Za-z0-9_-]{16,}/g, /(Bearer\s+)(?!\$)[A-Za-z0-9._~+/-]{20,}=*/g,
  /((?:api[_-]?key|apikey|exaApiKey|token|secret|password)["']?\s*[:=]\s*["']?)(?!\$\{)[A-Za-z0-9._-]{16,}/gi,
];
export function redact(text) {
  let out = String(text);
  for (const re of SECRET_SHAPES) out = out.replace(re, (m, pre) => (typeof pre === 'string' && m.startsWith(pre) ? `${pre}***` : '***'));
  return out;
}
export const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };
export const sh = (cmd, a, opts = {}) => { try { return execFileSync(cmd, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 6000, ...opts }).trim(); } catch { return null; } };

export function gitLog(dir) {
  const raw = sh('git', ['-C', dir, 'log', '--reverse', '--format=%h\t%s', '-n', '60']);
  return raw ? raw.split('\n').filter(Boolean).map((l) => { const [hash, msg] = l.split('\t'); return { hash, msg }; }) : [];
}


// the same folder lives in git: branch and remote (as a browser link) for the folder bar
export function gitInfo(dir) {
  const raw = sh('git', ['-C', dir, 'remote', 'get-url', 'origin']);
  const remote = raw ? raw.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '') : null;
  return { branch: sh('git', ['-C', dir, 'branch', '--show-current']), remote };
}


// Everything the page needs to draw a folder, minus agent runs (local only).
export function folderState(dir) {
  return {
    dir, name: path.basename(dir),
    files: walk(dir),
    harness: readJson(path.join(dir, '.harness', 'state.json'), {}),
    commits: gitLog(dir),
    git: gitInfo(dir),
    now: Date.now(),
  };
}

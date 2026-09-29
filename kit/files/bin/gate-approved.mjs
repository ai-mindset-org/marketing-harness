#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks `status: approved` in outputs/*.md
// until the newest checks report has a passing row for that file.
// Blocks through both channels: exit 2 + stderr, and a JSON deny on stdout.
// Escape hatch: HARNESS_GATE_OK=1 (only when the human says so).
import fs from 'node:fs';
import path from 'node:path';

const deny = (reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }) + '\n');
  process.stderr.write(`gate-approved: ${reason}\n`);
  process.exit(2);
};
const allow = () => process.exit(0);

if (process.env.HARNESS_GATE_OK === '1') allow();

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { allow(); } // unreadable input is not our business

const tool = input.tool_name;
const ti = input.tool_input || {};
if (tool !== 'Write' && tool !== 'Edit') allow();

const root = process.cwd();
const file = ti.file_path ? path.resolve(root, ti.file_path) : '';
const rel = file ? path.relative(root, file).split(path.sep) : [];
if (rel[0] !== 'outputs' || !file.endsWith('.md')) allow();

const text = tool === 'Write' ? ti.content : ti.new_string;
if (!/^status:\s*["']?approved["']?\s*$/m.test(text || '')) allow();

// newest report by date in the file name
const evalsDir = path.join(root, 'evals');
let reports = [];
try {
  reports = fs.readdirSync(evalsDir)
    .filter((f) => /^\{eval\} checks – \d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort();
} catch { /* no evals dir */ }
const base = path.basename(file, '.md');
const hint = 'Запусти `node bin/check.mjs`, поправь провалы, повтори. Выключатель HARNESS_GATE_OK=1 включает только человек.';
if (!reports.length) deny(`нет отчёта проверок в evals/. ${hint}`);

const newest = reports[reports.length - 1];
const report = fs.readFileSync(path.join(evalsDir, newest), 'utf8');
const row = report.split('\n').find((l) => l.startsWith('|') && l.includes(`[[${base}]]`));
if (!row) deny(`в отчёте «${newest}» нет строки для «${base}». ${hint}`);
const verdict = (/\*\*(pass|warn|fail)\*\*\s*\|?\s*$/.exec(row.trim()) || [])[1];
if (verdict !== 'pass') deny(`в отчёте «${newest}» вердикт для «${base}»: ${verdict || 'не найден'}. Нужен pass. ${hint}`);
allow();

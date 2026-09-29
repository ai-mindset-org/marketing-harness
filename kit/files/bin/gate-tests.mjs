#!/usr/bin/env node
// Runs gate-approved through the exact command written in .claude/settings.json (same wrapper, no shortcuts).
// Fixtures live in a temp dir; real evals/ is never touched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const kit = process.cwd();
const settings = JSON.parse(fs.readFileSync(path.join(kit, '.claude/settings.json'), 'utf8'));
const command = settings.hooks.PreToolUse.find((h) => h.matcher === 'Write|Edit').hooks[0].command;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-tests-'));
fs.symlinkSync(path.join(kit, 'bin'), path.join(tmp, 'bin'));
fs.mkdirSync(path.join(tmp, 'evals'));
fs.mkdirSync(path.join(tmp, 'outputs'));
const header = '| черновик | итог |\n|---|---|\n';
const reportName = (d) => path.join(tmp, 'evals', `{eval} checks – ${d}.md`);
process.chdir(tmp);

const approved = '---\nstatus: approved\n---\ntext';
const cases = [
  { name: 'Write approved без отчёта', input: { tool_name: 'Write', tool_input: { file_path: 'outputs/{post} none.md', content: approved } }, expect: 'deny' },
  { name: 'Write approved со строкой pass', report: '| [[{post} good]] | **pass** |\n', input: { tool_name: 'Write', tool_input: { file_path: 'outputs/{post} good.md', content: approved } }, expect: 'allow' },
  { name: 'Edit approved при строке fail', report: '| [[{post} bad]] | **fail** |\n', input: { tool_name: 'Edit', tool_input: { file_path: 'outputs/{post} bad.md', new_string: 'status: approved' } }, expect: 'deny' },
  { name: 'Write со статусом draft', input: { tool_name: 'Write', tool_input: { file_path: 'outputs/{post} d.md', content: '---\nstatus: draft\n---\n' } }, expect: 'allow' },
  { name: 'путь вне outputs', input: { tool_name: 'Write', tool_input: { file_path: 'scratch/note.md', content: approved } }, expect: 'allow' },
  { name: 'HARNESS_GATE_OK=1', env: { HARNESS_GATE_OK: '1' }, input: { tool_name: 'Write', tool_input: { file_path: 'outputs/{post} none.md', content: approved } }, expect: 'deny→allow' },
];

let failed = 0;
const lines = cases.map((c, i) => {
  fs.rmSync(reportName('2026-09-29'), { force: true });
  if (c.report) fs.writeFileSync(reportName('2026-09-29'), header + c.report);
  const r = spawnSync('sh', ['-c', command], { input: JSON.stringify(c.input), encoding: 'utf8', env: { ...process.env, HARNESS_GATE_OK: '', ...(c.env || {}) } });
  const wantDeny = c.expect === 'deny';
  const gotDeny = r.status === 2;
  // a deny must use both channels: stderr text and JSON on stdout
  const bothChannels = !gotDeny || (r.stderr.trim() && r.stdout.includes('"permissionDecision":"deny"'));
  const ok = gotDeny === wantDeny && bothChannels && (gotDeny || r.status === 0);
  if (!ok) failed++;
  return `${ok ? 'PASS' : 'FAIL'}  ${i + 1}. ${c.name.padEnd(32)} ждали ${wantDeny ? 'deny ' : 'allow'} · exit ${r.status}`;
});
console.log(lines.join('\n'));
console.log(failed ? `\n${failed} из ${cases.length} не совпали` : `\nвсе ${cases.length} PASS`);
process.chdir(kit);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);

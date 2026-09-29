#!/usr/bin/env node
// Team mode: freeze a harness folder into a static state.json the page can poll.
//   node tools/export-state.mjs --dir ~/harness/marketing-sprint --out web/team/state.json
// Secrets are masked by the same rules as the local server; agent runs are not exported.
import fs from 'node:fs';
import path from 'node:path';
import { folderState } from './folder-state.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
if (!args.dir || !args.out) { console.error('usage: export-state.mjs --dir <harness folder> --out <state.json>'); process.exit(2); }
const dir = path.resolve(args.dir.replace(/^~/, process.env.HOME));
const st = folderState(dir);
st.dir = st.name; // the local path stays on this machine
if (st.harness) st.harness.waiting = null;
st.exported = new Date().toISOString();
st.head = st.commits.length ? st.commits[st.commits.length - 1].hash : null;
fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(args.out, JSON.stringify(st));
console.log(`team state → ${args.out} · ${st.files.length} файлов · ${st.commits.length} коммитов · head ${st.head}`);

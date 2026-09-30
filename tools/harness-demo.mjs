#!/usr/bin/env node
// Grows a marketing harness inside an empty folder, phase by phase, with a git
// commit after each phase. The web page in live mode draws the folder as it grows.
//
//   node tools/harness-demo.mjs --dir ~/Demos/mh-2026-10-01 [--pace 1] [--agents] [--model sonnet]
//                               [--preset b2b-consultant|b2c-shop|saas-founder] [--answers my.json] [--stops]
// --pace 0 deploys the whole template instantly (still one commit per phase).
// --stops: after each phase the run waits until «продолжить» is pressed in the browser
// (the page shows a plain-language card about the phase, POST /api/continue releases it).
//
// --agents: phase 05–06 run real `claude -p` workers in parallel (researcher ∥
// extractor→writer, then critic, then weekly loop). Any worker that fails falls
// back to the scripted files, so the show goes on.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from './timeline.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def; };

const dir = opt('dir') ? path.resolve(opt('dir').replace(/^~/, process.env.HOME)) : null;
if (!dir) { console.error('usage: harness-demo.mjs --dir <empty folder> [--pace 1] [--agents] [--model sonnet] [--answers file.json]'); process.exit(2); }
if (fs.existsSync(dir) && fs.readdirSync(dir).filter((f) => f !== '.DS_Store').length) {
  console.error(`папка ${dir} не пустая. новый харнесс начинается с пустой папки: укажи новый путь.\nоткрыть эту папку: ${path.join(root, 'bin', 'open.sh')} ${dir}`); process.exit(2);
}
const PRESETS = fs.readdirSync(path.join(root, 'kit', 'answers')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
if (opt('preset') && !PRESETS.includes(opt('preset'))) { console.error(`нет пресета «${opt('preset')}». есть: ${PRESETS.join(' · ')}`); process.exit(2); }
const pace = Number(opt('pace', '1'));
const agents = flag('agents');
const model = opt('model', process.env.HARNESS_CLAUDE_MODEL || 'opus');
const stops = flag('stops');
const presetFile = opt('preset') ? path.join(root, 'kit', 'answers', `${opt('preset')}.json`) : null;
const answersOverride = {
  ...(presetFile ? JSON.parse(fs.readFileSync(presetFile, 'utf8')) : {}),
  ...(opt('answers') ? JSON.parse(fs.readFileSync(opt('answers'), 'utf8')) : {}),
};

const tl = buildTimeline(path.join(root, 'kit'), answersOverride);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G = '\x1b[90m', R = '\x1b[31m', B = '\x1b[1m', X = '\x1b[0m';

const state = {
  mode: agents ? 'agents' : 'scripted',
  startedAt: Date.now(),
  phase: null, phaseTitle: '', phases: tl.phases.map(({ id, title }) => ({ id, title })),
  questions: tl.questions, answers: tl.answers, answersShown: 0,
  narration: [], lanes: {},
};
// files keep the mode of their kit source: the pre-commit hook and the gate scripts stay executable
const w = (rel, text) => {
  const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text);
  try { const m = fs.statSync(path.join(root, 'kit', 'files', rel)).mode & 0o777; if (m & 0o111) fs.chmodSync(f, m); } catch { /* not from the kit */ }
};
const save = () => w('.harness/state.json', JSON.stringify(state, null, 1));
const say = (text) => { state.narration.push({ t: Date.now(), text }); state.narration = state.narration.slice(-14); save(); console.log(`${G}${state.phase || '··'}${X} ${text}`); };
const git = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
const lane = (id, patch) => { const meta = tl.lanes[id] || { title: id, skill: '' }; state.lanes[id] = { ...(state.lanes[id] || { title: meta.title, skill: meta.skill }), ...patch }; save(); };

function initFolder() {
  fs.mkdirSync(dir, { recursive: true });
  git('init', '-q', '-b', 'main');
  // Obsidian settings stay personal, only the graph colours are shared
  w('.gitignore', '.harness/\n.obsidian/*\n!.obsidian/graph.json\n.DS_Store\n');
  // Obsidian graph colours by layer, so the native graph view reads like ours.
  const group = (query, rgb) => ({ query, color: { a: 1, rgb } });
  w('.obsidian/graph.json', JSON.stringify({
    showOrphans: true, showTags: false, showAttachments: false,
    colorGroups: [
      group('path:context', 0x0a0a0a), group('path:rules', 0x555555), group('path:tools OR path:bin', 0x777777),
      group('path:skills', 0x2b2b2b), group('path:evals', 0x8a1a14), group('path:design OR path:guides', 0xd97757),
      group('path:sources OR path:research', 0x9a9a9a), group('path:nuclei', 0x444444),
      group('path:outputs', 0xd7261e), group('path:dashboards', 0xe9b400),
      group('path:roles', 0x3a3a3a), group('path:automations', 0xb05a3c), group('path:gates', 0x1f5fbf),
    ],
  }, null, 2));
  save();
}

function commit(msg) {
  try {
    git('add', '-A');
    git('-c', 'user.name=harness-demo', '-c', 'user.email=harness@aimindset.local', 'commit', '-q', '--allow-empty', '-m', msg);
    const hash = git('rev-parse', '--short', 'HEAD').trim();
    console.log(`${R}● ${hash}${X} ${B}${msg}${X}`);
  } catch (e) { console.error('commit failed', e.message); }
}

function mirrorSkills() {
  const script = path.join(dir, 'bin', 'sync-skills.mjs');
  if (fs.existsSync(script)) { try { execFileSync(process.execPath, [script], { cwd: dir, stdio: 'ignore' }); return; } catch { /* fall through */ } }
  const src = path.join(dir, 'skills');
  if (fs.existsSync(src)) fs.cpSync(src, path.join(dir, '.claude', 'skills'), { recursive: true });
}

async function applyEvent(e) {
  switch (e.type) {
    case 'phase':
      state.phase = e.id; state.phaseTitle = e.title; save();
      console.log(`\n${B}${e.id} · ${e.title}${X}`);
      break;
    case 'narrate': say(e.text); break;
    case 'answers': {
      const step = e.dwell / (tl.questions.length + 1) * pace;
      for (let i = 1; i <= tl.questions.length; i++) {
        await sleep(step); state.answersShown = i; save();
        const q = tl.questions[i - 1]; console.log(`   ${G}${q.q}${X} ${tl.answers[q.key]}`);
      }
      break;
    }
    case 'file': w(e.path, e.content); console.log(`   + ${e.path}`); break;
    case 'rename': {
      fs.mkdirSync(path.dirname(path.join(dir, e.to)), { recursive: true });
      try { git('mv', e.from, e.to); } catch { try { fs.renameSync(path.join(dir, e.from), path.join(dir, e.to)); } catch { /* already moved */ } }
      w(e.to, e.content); console.log(`   ↻ ${e.from} → ${e.to}`); break;
    }
    case 'mirror': mirrorSkills(); console.log('   ↳ skills/ → .claude/skills · .agents/skills'); break;
    case 'lane': lane(e.lane, { status: e.status, target: e.target, note: e.note || '' }); break;
    case 'commit': commit(e.msg); break;
  }
}

// ---------- agents mode (the parallel phase and the one after it) ----------
function runtimeMcp() {
  const cfgPath = path.join(dir, '.mcp.json');
  let cfg = { mcpServers: {} };
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { /* none */ }
  const out = { mcpServers: {} };
  for (const [name, s] of Object.entries(cfg.mcpServers || {})) {
    const vars = [...JSON.stringify(s).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
    if (vars.every((v) => process.env[v])) out.mcpServers[name] = s;
  }
  const p = path.join(dir, '.harness', 'mcp.runtime.json');
  w('.harness/mcp.runtime.json', JSON.stringify(out, null, 2));
  return { path: p, names: Object.keys(out.mcpServers) };
}

function runClaude(id, brief, { logName = id } = {}) {
  const mcp = runtimeMcp();
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Skill', 'Bash(node bin/*)'];
  if (mcp.names.includes('exa')) tools.push('mcp__exa__web_search_exa', 'mcp__exa__web_search_advanced_exa', 'mcp__exa__web_fetch_exa');
  if (mcp.names.includes('lms')) tools.push('mcp__lms');
  const a = ['-p', brief, '--model', model, '--permission-mode', 'acceptEdits', '--max-turns', '40', '--mcp-config', mcp.path, '--allowedTools', tools.join(',')];
  fs.mkdirSync(path.join(dir, '.harness', 'logs'), { recursive: true });
  const log = fs.openSync(path.join(dir, '.harness', 'logs', `${logName}.log`), 'a');
  return new Promise((resolve) => {
    const p = spawn('claude', a, { cwd: dir, stdio: ['ignore', log, log] });
    const timer = setTimeout(() => { p.kill('SIGTERM'); }, 10 * 60 * 1000);
    p.on('exit', (code) => { clearTimeout(timer); resolve(code === 0); });
    p.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}
const runNode = (script, a = []) => { try { execFileSync(process.execPath, [path.join(dir, script), ...a], { cwd: dir, stdio: 'ignore', timeout: 120000 }); return true; } catch { return false; } };
const count = (rel) => { try { return fs.readdirSync(path.join(dir, rel), { recursive: true }).filter((f) => String(f).endsWith('.md')).length; } catch { return 0; } };
const scripted = (prefixes, phaseIds) => {
  for (const { e, ph } of tagged) if (phaseIds.includes(ph) && (e.type === 'file') && prefixes.some((p) => e.path.startsWith(p))) w(e.path, e.content);
};

async function agentsPhase(P, Q) {
  const pTitle = tl.phases.find((x) => x.id === P).title;
  await applyEvent({ type: 'phase', id: P, title: `${pTitle} · живые` });
  const both = [P, Q];

  // ingest: LMS transcript through the MCP server, or the scripted source
  const hasLms = !!process.env.AIM_LMS_TOKEN;
  lane('ingest', { status: 'running', target: 'sources/', note: hasLms ? 'LMS MCP' : 'нет AIM_LMS_TOKEN – заготовка' });
  say(hasLms ? 'загрузчик тянет транскрипт занятия Кумара из LMS по MCP' : 'AIM_LMS_TOKEN не задан: загрузчик кладёт заготовку источника');
  const ingestOk = hasLms && await runClaude('ingest', 'По скиллу lms-ingest забери из LMS транскрипт сессии marketing-w1-practice (имена скрыты по умолчанию) и сохрани в sources/ по правилу {rule} naming: сжатый конспект 60–120 строк с таймкодами и полем source. Больше ничего не делай.');
  if (!ingestOk) scripted(['sources/'], both);
  lane('ingest', { status: 'done', target: null });

  const hasExa = !!process.env.EXA_API_KEY;
  lane('researcher', { status: 'running', target: 'research/', note: hasExa ? 'Exa MCP' : 'нет EXA_API_KEY – заготовка' });
  say(hasExa ? 'исследователь запущен: claude -p + Exa MCP' : 'EXA_API_KEY не задан: исследователь показывает заготовку');
  const researcher = hasExa
    ? runClaude('researcher', 'Ты исследователь маркетинг-харнесса. Прочитай AGENTS.md и tools/{tool} exa.md. По скиллу research-exa сделай скан «LinkedIn 2026: что ранжирует посты фаундеров и экспертов» и запиши research/ по правилу {rule} naming: таблица утверждение · ссылка · дата · уровень A/B/C и блок «что это значит для нас». Другие папки не трогай.')
    : sleep(9000 * pace).then(() => false);

  lane('extractor', { status: 'running', target: 'nuclei/', note: 'nucleus-extract' });
  lane('writer', { status: 'waiting', target: null, note: 'ждёт нуклеусы' });
  lane('designer', { status: 'waiting', target: null, note: 'ждёт брифы' });
  lane('critic', { status: 'waiting', target: null, note: 'ждёт пачку' });
  say('экстрактор и автор запущены одной цепочкой: нуклеусы → черновики');
  const chain = runClaude('chain', 'Прочитай AGENTS.md. Шаг 1: по скиллу nucleus-extract вынь 4 нуклеуса из файлов sources/ в nuclei/. Шаг 2: по скиллу content-factory сделай по одному черновику из каждого нуклеуса: два для LinkedIn (скилл linkedin-post) в outputs/linkedin/, один Telegram в outputs/telegram/, один бриф карусели (скилл carousel-brief) в outputs/carousel/. Имена и frontmatter по rules/{rule} naming.md, status: draft. Ничего не публикуй.', { logName: 'extractor-writer' });
  let chainDone = false; chain.then(() => { chainDone = true; });
  while (!chainDone) {
    await sleep(1500);
    if (count('outputs') > 0 && state.lanes.writer.status !== 'running') {
      lane('extractor', { status: 'done', target: null }); lane('writer', { status: 'running', target: 'outputs/', note: 'content-factory' });
      say('нуклеусы готовы, автор пишет черновики');
    }
  }
  if (!(await chain) || count('outputs') === 0) { say('цепочка не дошла до черновиков – показываю заготовку'); scripted(['nuclei/', 'outputs/'], both); }
  lane('extractor', { status: 'done', target: null }); lane('writer', { status: 'done', target: null });

  lane('designer', { status: 'running', target: 'outputs/', note: 'bin/render.mjs' });
  say('дизайнер рендерит карусель, превью LinkedIn и лендинг по дизайн-системе: код, без модели');
  if (!runNode('bin/render.mjs', ['all'])) scripted(['outputs/'], both);
  lane('designer', { status: 'done', target: null });

  lane('critic', { status: 'running', target: 'evals/', note: 'bin/check.mjs + slop-check' });
  say('критик: сначала проверки кодом, потом LLM-судья в отдельном контексте');
  runNode('bin/check.mjs');
  const criticOk = await runClaude('critic', 'Ты критик. Прочитай отчёт проверок в evals/ (файл {eval} checks). По скиллу slop-check оцени каждый черновик в outputs/ по rules/{rule} anti-slop.md и evals/{eval} rubric.md, запиши evals/ файл {eval} scorecard с датой: файл · балл · находки с цитатами · вердикт. Тексты не переписывай.');
  if (!criticOk) { say('критик не ответил – заготовка оценки'); scripted(['evals/{eval} scorecard'], both); }
  lane('critic', { status: 'done', target: null });

  if (!(await researcher)) scripted(['research/'], both);
  lane('researcher', { status: 'done', target: null });
  commit(`${P}: пачка 01 от живых агентов`);

  await applyEvent({ type: 'phase', id: Q, title: tl.phases.find((x) => x.id === Q).title });
  lane('critic', { status: 'running', target: 'dashboards/', note: 'weekly-loop' });
  say('недельная петля: срез по черновикам и оценкам, повторившиеся находки уходят в правила и в golden set');
  const loopOk = await runClaude('critic', 'По скиллу weekly-loop собери dashboards/ файл {dashboard} weekly с датой: таблица единица · код · канал · балл · статус · вердикт (до публикации вердикт testing) и сетка покрытия нуклеус × канал. Если в scorecard одна находка встретилась в двух черновиках, допиши строку в раздел «выучено на ошибках» rules/{rule} anti-slop.md и отрицательный пример в evals/{eval} golden-set.md.', { logName: 'loop' });
  if (!loopOk) scripted(['dashboards/'], both);
  lane('critic', { status: 'done', target: null });
  say('харнесс собран живыми агентами. следующая пачка начнётся с решений из среза');
  commit(`${Q}: недельный срез от агентов`);
}

// ---------- main ----------
console.log(`${B}marketing harness${X} → ${dir}\nрежим: ${state.mode} · темп ×${pace}${agents ? ` · модель ${model}` : ''}${opt('preset') ? ` · пресет ${opt('preset')}` : ''}\n`);
initFolder();
let t0 = Date.now();
// hold the run at a phase stop until the browser writes .harness/continue
async function waitAtStop(phaseId) {
  const ph = tl.phases.find((x) => x.id === phaseId);
  if (!stops || !ph?.stop) return;
  const since = Date.now();
  const flagFile = path.join(dir, '.harness', 'continue');
  state.waiting = phaseId; save();
  console.log(`${G}   ⏸ стоп после ${phaseId}: «${ph.stop.title}» · в браузере «продолжить»${X}`);
  for (;;) {
    await sleep(300);
    try { if (Number(fs.readFileSync(flagFile, 'utf8')) > since) break; } catch { /* not yet */ }
  }
  state.waiting = null; save();
  t0 += Date.now() - since;
}
const phaseOf = (() => { let cur = null; return (e) => (e.type === 'phase' ? (cur = e.id) : cur); })();
const tagged = tl.events.map((e) => ({ e, ph: phaseOf(e) }));
const pIdx = tl.phases.findIndex((x) => x.parallel);
const P = tl.phases[pIdx]?.id, Q = tl.phases[pIdx + 1]?.id, before = tl.phases[pIdx - 1]?.id;
const agentPhases = new Set(agents && P ? [P, Q] : []);
for (const { e, ph } of tagged) {
  if (agentPhases.has(ph)) continue;
  const wait = t0 + e.at * pace - Date.now();
  if (wait > 0) await sleep(wait);
  await applyEvent(e);
  if (e.type === 'commit') await waitAtStop(e.phase);
  if (agents && e.type === 'commit' && e.phase === before) { await agentsPhase(P, Q); break; }
}
state.phase = 'done'; save();
// gates on from the first human commit: pre-commit runs gitleaks and the checks
git('config', 'core.hooksPath', '.githooks');
let leaks = true; try { execFileSync('gitleaks', ['version'], { stdio: 'ignore' }); } catch { leaks = false; }
console.log(`\n${B}готово${X} · ${dir}\nгейты включены: core.hooksPath .githooks${leaks ? '' : ' · секрет-скан ждёт gitleaks: brew install gitleaks'}\nObsidian: открой папку как vault · история: git -C "${dir}" log --oneline\nдальше: claude или codex внутри папки, либо консоль агентов в браузере`);

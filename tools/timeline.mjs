// Builds one timeline from kit/manifest.json. Replay (web/scenario.json) and the
// live demo (tools/harness-demo.mjs) both consume it, so the two never drift.
//
// Kit files live under their FINAL names ("{rule} anti-slop.md"). A step may
// carry `early` – the plain name the file has before the naming rule appears.
// The `rename-all` step moves every early file to its final name and rewrites
// wikilinks, the way Obsidian does on rename.
import fs from 'node:fs';
import path from 'node:path';

export function renderTemplate(text, answers) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in answers ? answers[k] : m));
}

// "[[{rule} anti-slop]]" → "[[anti-slop]]" for the pre-naming era
export function stripTypeLinks(text) {
  return text.replace(/\[\[\{[a-z-]+\} /g, '[[').replace(/`((?:[\w-]+\/)*)\{[a-z-]+\} ([^`]+)`/g, '`$1$2`');
}

export function loadKit(kitDir, answersOverride) {
  const manifest = JSON.parse(fs.readFileSync(path.join(kitDir, 'manifest.json'), 'utf8'));
  const answers = {
    ...JSON.parse(fs.readFileSync(path.join(kitDir, 'answers.json'), 'utf8')),
    ...(answersOverride || {}),
  };
  // own product: a preset or an answers file changed what the folder is about
  Object.defineProperty(answers, '__own', { value: !!(answersOverride && answersOverride.product_short), enumerable: false });
  return { manifest, answers };
}

function readSrc(kitDir, step, answers) {
  const rel = step.src || path.join('files', step.path);
  const text = renderTemplate(fs.readFileSync(path.join(kitDir, rel), 'utf8'), answers);
  return answers.__own ? ownProduct(step.path || '', text) : text;
}

// A preset or own answers describe another product: its facts table starts empty and the
// sprint's facts move under «пример», so no text of the new product borrows the sprint's numbers.
function ownProduct(p, text) {
  if (/truth-pack\.md$/.test(p)) {
    const lines = text.split('\n');
    const head = lines.findIndex((l) => /^\| факт \|/.test(l));
    if (head < 0) return text;
    const rows = []; let i = head + 2;
    while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
    const own = rows.filter((r) => /^\| продукт \|/.test(r));
    const blank = ['цена', 'сроки и условия', 'главная цифра результата', 'кейс клиента'].map((f) => `| ${f} | заполни | источник | – |`);
    const example = rows.filter((r) => !/^\| продукт \|/.test(r));
    return [...lines.slice(0, head + 2), ...own, ...blank, ...lines.slice(i),
      '', '## пример: факты маркетинг-спринта AI Mindset', '',
      'Так выглядит заполненная таблица. Эти строки про спринт, для текстов твоего продукта они не годятся: замени их своими фактами с источником.', '',
      lines[head], lines[head + 1], ...example, ''].join('\n');
  }
  if (/\{context\} product\.md$/.test(p)) {
    return text.replace(/## чем отличаемся\n[\s\S]*?\n(?=## )/, '## чем отличаемся\n- заполни: две-три причины, почему покупают у тебя, а не у соседа по полке; каждая – с доказательством из [[{context} truth-pack]].\n\n');
  }
  return text;
}

export function buildTimeline(kitDir, answersOverride) {
  const { manifest, answers } = loadKit(kitDir, answersOverride);
  const events = [];
  const phases = [];
  const early = new Map(); // final path → early path, while the early name is live
  const preNaming = []; // files without an early name, written before the naming rule (links get rewritten)
  let named = false;
  let t = 0;

  const fileEvent = (at, st, lane) => {
    const content = readSrc(kitDir, st, answers);
    if (!named && st.early) {
      early.set(st.path, { early: st.early, step: st });
      return { at, type: 'file', path: st.early, content: stripTypeLinks(content), lane };
    }
    if (!named && /\.md$/.test(st.path)) {
      preNaming.push(st);
      return { at, type: 'file', path: st.path, content: stripTypeLinks(content), lane };
    }
    return { at, type: 'file', path: st.path, content, lane };
  };

  for (const ph of manifest.phases) {
    const start = t;
    events.push({ at: t, type: 'phase', id: ph.id, title: ph.title });
    if (!ph.parallel) {
      for (const st of ph.steps) {
        const type = st.type || 'file';
        if (st.note) events.push({ at: t, type: 'narrate', text: st.note, path: st.path || null });
        if (type === 'file') {
          events.push(fileEvent(t + Math.min(1200, st.dwell * 0.35), st));
        } else if (type === 'answers') {
          events.push({ at: t, type: 'answers', dwell: st.dwell });
        } else if (type === 'mirror') {
          events.push({ at: t + 800, type: 'mirror' });
        } else if (type === 'rename-all') {
          named = true;
          const list = [...early.entries()];
          const gap = Math.min(260, (st.dwell * 0.8) / Math.max(1, list.length));
          list.forEach(([finalPath, { early: earlyPath, step }], i) => {
            // the renamed file keeps the version it had (src), now with typed links
            events.push({ at: t + 600 + i * gap, type: 'rename', from: earlyPath, to: finalPath, content: readSrc(kitDir, step, answers) });
          });
          early.clear();
          // files that keep their names still get their links rewritten
          preNaming.forEach((step, i) => {
            events.push({ at: t + 600 + (list.length + i) * gap, type: 'file', path: step.path, content: readSrc(kitDir, step, answers) });
          });
          preNaming.length = 0;
        }
        t += st.dwell;
      }
    } else {
      const laneClock = {};
      let end = t;
      for (const st of ph.steps) {
        const lane = st.lane;
        const at = laneClock[lane] ?? t;
        const type = st.type || 'file';
        const meta = manifest.lanes[lane] || { title: lane, skill: '' };
        if (type === 'wait') {
          events.push({ at, type: 'lane', lane, status: 'waiting', title: meta.title, skill: meta.skill, target: null, note: st.note });
        } else {
          events.push({ at, type: 'lane', lane, status: 'running', title: meta.title, skill: st.skill || meta.skill, target: st.path, note: st.note });
          if (st.note) events.push({ at, type: 'narrate', text: `${meta.title} · ${st.note}`, path: st.path, lane });
          events.push(fileEvent(at + st.dwell, st, lane));
        }
        laneClock[lane] = at + st.dwell;
        end = Math.max(end, laneClock[lane]);
      }
      for (const [lane, at] of Object.entries(laneClock)) {
        const meta = manifest.lanes[lane] || { title: lane, skill: '' };
        events.push({ at, type: 'lane', lane, status: 'done', title: meta.title, skill: meta.skill, target: null });
      }
      t = end;
    }
    events.push({ at: t, type: 'commit', msg: ph.commit, phase: ph.id });
    phases.push({ id: ph.id, title: ph.title, start, end: t, parallel: !!ph.parallel, stop: ph.stop || null });
    t += 600;
  }
  events.sort((a, b) => a.at - b.at || order(a) - order(b));
  return { questions: manifest.questions, lanes: manifest.lanes, answers, phases, events, duration: t };
}

const ORDER = { phase: 0, narrate: 1, lane: 2, answers: 3, file: 4, rename: 5, mirror: 6, commit: 7 };
const order = (e) => ORDER[e.type] ?? 9;

/* marketing harness · live build v2
 * replay: plays web/scenario.json (built from kit/ by tools/build-scenario.mjs)
 * live:   polls /api/state of tools/harness-server.mjs; console dispatches claude / codex / sotnik
 */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  // replay: scenario.json · live: this computer's folder via the local server · team: the sprint folder from git, static state.json
  const MODE = ['live', 'team'].includes(qs.get('mode')) ? qs.get('mode') : 'replay';
  const TEAM = MODE === 'team';
  document.body.classList.toggle('live', MODE !== 'replay');
  document.body.classList.toggle('team', TEAM);
  document.querySelectorAll('.modes button').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === MODE);
    b.onclick = () => { const u = new URL(location.href); u.searchParams.set('mode', b.dataset.mode); location.href = u.toString(); };
  });

  // ---------- layers: one shape per abstraction ----------
  const LAYERS = {
    hub:       { label: 'хаб',        sym: 'diamond',  fill: true,    size: 360, glyph: '◆', ax: 0,     ay: -0.1 },
    context:   { label: 'контекст',   sym: 'square',   fill: true,    size: 160, glyph: '■', ax: -0.6,  ay: -0.62 },
    rule:      { label: 'правило',    sym: 'diamond',  fill: false,   size: 160, glyph: '◇', ax: -0.02, ay: -0.82 },
    role:      { label: 'роль',       sym: 'hexagon',  fill: false,   size: 150, glyph: '⬡', ax: -0.34, ay: -0.9 },
    tool:      { label: 'инструмент', sym: 'triangle', fill: false,   size: 150, glyph: '△', ax: 0.6,   ay: -0.62 },
    code:      { label: 'код',        sym: 'times',    fill: false,   size: 90,  glyph: '×', ax: 0.36,  ay: -0.3 },
    guide:     { label: 'гайд',       sym: 'asterisk', fill: false,   size: 120, glyph: '✳', ax: -0.3,  ay: -0.3 },
    skill:     { label: 'скилл',      sym: 'circle',   fill: false,   size: 150, glyph: '○', ax: 0.06,  ay: 0.12 },
    eval:      { label: 'eval',       sym: 'triangle', fill: true,    size: 150, glyph: '▲', ax: 0.86,  ay: 0.26 },
    design:    { label: 'дизайн',     sym: 'star',     fill: false,   size: 150, glyph: '☆', ax: 0.58,  ay: 0.5 },
    agent:     { label: 'агент',      sym: 'circle',   fill: 'accent', size: 230, glyph: '●', ax: 0.0,  ay: 0.47 },
    source:    { label: 'сырьё',      sym: 'square',   fill: false,   size: 130, glyph: '□', ax: -0.86, ay: 0.3 },
    research:  { label: 'ресёрч',     sym: 'wye',      fill: false,   size: 140, glyph: 'Y', ax: -0.8,  ay: -0.12 },
    nucleus:   { label: 'нуклеус',    sym: 'circle',   fill: true,    size: 70,  glyph: '•', ax: -0.42, ay: 0.82 },
    output:    { label: 'черновик',   sym: 'square',   fill: 'hair',  size: 140, glyph: '▢', ax: 0.28,  ay: 0.84 },
    dashboard: { label: 'срез',       sym: 'cross',    fill: true,    size: 160, glyph: '✚', ax: 0.86,  ay: -0.12 },
    automation:{ label: 'рутина',     sym: 'hourglass', fill: false,  size: 130, glyph: '⧗', ax: 0.34,  ay: -0.9 },
    gate:      { label: 'гейт',       sym: 'gate',     fill: false,   size: 140, glyph: '⊓', ax: 0.66,  ay: 0.06 },
    ghost:     { label: 'план',       sym: 'circle',   fill: false,   size: 60,  glyph: '◌' },
  };
  // two shapes d3 lacks: a hexagon for roles, an hourglass for scheduled routines
  const hexagon = { draw(c, size) { const r = Math.sqrt(size / 2.598); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; c[k ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); } c.closePath(); } };
  const hourglass = { draw(c, size) { const a = Math.sqrt(size) / 2; c.moveTo(-a, -a); c.lineTo(a, -a); c.lineTo(-a, a); c.lineTo(a, a); c.closePath(); } };
  const gate = { draw(c, size) { const a = Math.sqrt(size) / 2; c.moveTo(-a, a); c.lineTo(-a, -a); c.lineTo(a, -a); c.lineTo(a, a); c.moveTo(-a * 0.35, a); c.lineTo(-a * 0.35, -a * 0.2); c.lineTo(a * 0.35, -a * 0.2); c.lineTo(a * 0.35, a); } };
  const SYM = { hexagon, hourglass, gate, diamond: d3.symbolDiamond, square: d3.symbolSquare, triangle: d3.symbolTriangle, circle: d3.symbolCircle, wye: d3.symbolWye,
    cross: d3.symbolCross, star: d3.symbolStar, times: d3.symbolTimes || d3.symbolCross, asterisk: d3.symbolAsterisk || d3.symbolStar };
  const FOLDER_ORDER = ['', 'context', 'rules', 'roles', 'tools', 'skills', 'evals', 'design', 'guides', 'bin', 'sources', 'research', 'nuclei', 'outputs', 'dashboards', 'automations', 'gates'];
  const LANE_ORDER = ['ingest', 'researcher', 'extractor', 'writer', 'designer', 'critic'];
  const LANE_META = {
    ingest: { title: 'загрузчик', skill: 'lms-ingest' }, researcher: { title: 'исследователь', skill: 'research-exa' },
    extractor: { title: 'экстрактор', skill: 'nucleus-extract' }, writer: { title: 'автор', skill: 'content-factory' },
    designer: { title: 'дизайнер', skill: 'carousel-brief' }, critic: { title: 'критик', skill: 'slop-check' },
  };
  const CHANNELS = [['linkedin', 'LinkedIn'], ['telegram', 'Telegram'], ['carousel', 'карусель'], ['landing', 'лендинг']];

  function layerOf(p) {
    if (p === 'README.md' || p === 'CLAUDE.md' || p === 'AGENTS.md') return 'hub';
    if (p === '.mcp.json') return 'tool';
    const top = p.split('/')[0];
    if (/^bin\/(gate|guard)-/.test(p) || p.startsWith('.githooks/') || p === '.claude/settings.json') return 'gate';
    if (top === 'bin' || /\.(mjs|css)$/.test(p)) return top === 'design' ? 'design' : 'code';
    return ({ context: 'context', rules: 'rule', tools: 'tool', skills: 'skill', sources: 'source', research: 'research', nuclei: 'nucleus',
      outputs: 'output', evals: 'eval', dashboards: 'dashboard', design: 'design', guides: 'guide', roles: 'role', automations: 'automation', gates: 'gate' })[top] || 'source';
  }
  function frontmatter(text) {
    const m = /^---\n([\s\S]*?)\n---/.exec(text || '');
    const fm = {};
    if (m) m[1].split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); });
    return fm;
  }
  const base = (p) => p.split('/').pop().replace(/\.(md|json|canvas|html|css|mjs)$/, '');
  const norm = (s) => s.trim().replace(/\.md$/, '').toLowerCase();
  const bare = (s) => s.replace(/^\{[a-z-]+\}\s+/, '').replace(/\s+–\s+\d{4}-\d{2}-\d{2}$/, '');
  function parse(path, content) {
    const fm = frontmatter(content);
    const layer = layerOf(path);
    const isMd = path.endsWith('.md');
    let title = bare(base(path));
    if (layer === 'skill') title = fm.name || title;
    if (layer === 'nucleus') title = fm.id || title.split(' ')[0];
    if (layer === 'output') title = (path.includes('/covers/') ? '3:1 ' : '') + title.split(' ').slice(0, path.includes('/landing/') ? 3 : 1).join(' ') + (path.endsWith('.html') ? ' ⧉' : '');
    if (path === '.mcp.json') title = '.mcp.json';
    const links = [];
    if (isMd) {
      const prose = (content || '').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
      let m; while ((m = re.exec(prose))) links.push(norm(m[1]));
      const tick = /`([\w./{} –-]+\.(?:md|json|mjs|css))`/g;
      while ((m = tick.exec(content || ''))) if (!m[1].includes('<')) links.push(norm(m[1]));
    }
    if (path.endsWith('.html')) links.push(norm(path.replace(/\.html$/, '')));
    return { path, layer, title, fm, links: [...new Set(links)], content };
  }

  // ---------- store ----------
  const S = {};
  const renamedFrom = new Map();
  function reset() {
    Object.assign(S, {
      files: new Map(), commits: [], lanes: {}, wrote: {}, phase: null, narr: '', narrTag: 'сейчас',
      answersShown: 0, answersTyping: null, fresh: new Map(), ringed: new Set(), freshCommit: null, runs: [],
    });
    renamedFrom.clear();
  }
  reset();
  let META = { questions: [], answers: {}, phases: [], duration: 1 };
  const now = () => performance.now();
  let dirty = true;
  const markDirty = () => { dirty = true; };

  function resolveIndex() {
    const idx = new Map();
    for (const f of S.files.values()) {
      idx.set(norm(f.path), f.path);
      for (const k of [norm(base(f.path)), norm(bare(base(f.path)))]) if (!idx.has(k)) idx.set(k, f.path);
    }
    return idx;
  }
  function attribute(path) {
    for (const [id, l] of Object.entries(S.lanes)) if (l.status === 'running' && l.target && (path === l.target || path.startsWith(l.target))) return id;
    return null;
  }
  function upsertFile(path, content, lane, animate, born) {
    const prev = S.files.get(path);
    if (prev && prev.content === content) return;
    const f = parse(path, content);
    f.born = born ?? (prev ? prev.born : now());
    f.mtime = prev?.mtime;
    S.files.set(path, f);
    if (animate) { S.fresh.set(path, now()); S.ringed.delete(path); }
    const owner = lane || attribute(path);
    if (owner) (S.wrote[owner] ||= new Set()).add(path);
    markDirty();
  }
  function renameFile(from, to, content, animate) {
    const f = S.files.get(from);
    S.files.delete(from);
    renamedFrom.set(to, from);
    for (const set of Object.values(S.wrote)) if (set.delete(from)) set.add(to);
    upsertFile(to, content ?? f?.content ?? '', null, animate, f?.born);
    markDirty();
  }

  // ---------- graph ----------
  const svg = d3.select('#graph');
  const root = svg.append('g');
  const gLinks = root.append('g');
  const gNodes = root.append('g');
  const gFx = root.append('g');
  const zoom = d3.zoom().scaleExtent([0.35, 3]).on('zoom', (e) => root.attr('transform', e.transform));
  svg.call(zoom);
  let SEL = null; // path of the file open in the side panel, highlighted on graph and tree
  let jumpToPhase = null; // set by replay: phase index → its end state and card
  function select(p, focus) {
    SEL = p;
    if (nodeSel) nodeSel.classed('sel', (d) => d.id === SEL);
    renderTree();
    const row = document.querySelector('#tree .file.sel'); if (row) row.scrollIntoView({ block: 'nearest' });
    const n = p && nodeById.get(p);
    if (focus && n && Number.isFinite(n.x)) svg.transition().duration(500).call(zoom.translateTo, n.x, n.y);
  }
  let W = 800, H = 600;
  const nodeById = new Map();
  function linkStrength(l) {
    const a = l.source.layer || '', b = l.target.layer || '';
    if (a === 'hub' || b === 'hub') return 0.02;
    if (l.kind === 'plan') return 0.04;
    return a === b ? 0.18 : 0.07;
  }
  const sim = d3.forceSimulation()
    .force('link', d3.forceLink().id((d) => d.id).distance((l) => (String(l.kind).startsWith('agent') ? 80 : 60)).strength(linkStrength))
    .force('charge', d3.forceManyBody().strength((d) => (d.layer === 'ghost' ? -40 : -190)))
    .force('x', d3.forceX((d) => anchor(d).x).strength((d) => (d.layer === 'ghost' ? 0.015 : 0.18)))
    .force('y', d3.forceY((d) => anchor(d).y).strength((d) => (d.layer === 'ghost' ? 0.015 : 0.18)))
    .force('collide', d3.forceCollide((d) => Math.sqrt(LAYERS[d.layer].size) / 1.4 + 8))
    .alphaDecay(0.03)
    .on('tick', ticked);
  const VERTICAL = new Set(['source', 'research', 'eval', 'dashboard']);
  function anchor(d) {
    const L = LAYERS[d.layer];
    if (L.ax === undefined) return { x: d.x ?? W / 2, y: d.y ?? H / 2 };
    const off = d.slotN > 1 ? d.slot - (d.slotN - 1) / 2 : 0;
    const vertical = VERTICAL.has(d.layer);
    const step = off === 0 ? 0 : vertical ? Math.min(40, (H * 0.34) / d.slotN) : Math.min(70, (W * (d.layer === 'skill' ? 0.72 : 0.42)) / d.slotN);
    return { x: W / 2 + L.ax * W * 0.45 + (vertical ? 0 : off * step), y: H / 2 + L.ay * H * 0.42 + (vertical ? off * step : 0) };
  }
  function resize() {
    const r = document.getElementById('stage').getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(300, r.height);
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    sim.force('x').x((d) => anchor(d).x); sim.force('y').y((d) => anchor(d).y);
    sim.alpha(0.3).restart();
  }
  window.addEventListener('resize', resize);

  function buildGraph() {
    const idx = resolveIndex();
    const nodes = [], links = [];
    const ghosts = new Map();
    for (const f of S.files.values()) nodes.push({ id: f.path, layer: f.layer, title: f.title, file: f });
    for (const f of S.files.values()) {
      for (const t of f.links) {
        const target = idx.get(t);
        if (target) { if (target !== f.path) links.push({ source: f.path, target, kind: 'wiki' }); }
        else {
          const gid = `ghost:${t}`;
          if (!ghosts.has(gid)) ghosts.set(gid, { id: gid, layer: 'ghost', title: bare(t.split('/').pop()), key: t });
          links.push({ source: f.path, target: gid, kind: 'plan' });
        }
      }
    }
    nodes.push(...ghosts.values());
    for (const id of LANE_ORDER) {
      const l = S.lanes[id];
      if (!l) continue;
      const aid = `agent:${id}`;
      nodes.push({ id: aid, layer: 'agent', title: l.title || LANE_META[id].title, lane: id, running: l.status === 'running' });
      const kind = l.status === 'running' ? 'agent' : 'agent-idle';
      const wantSkill = l.skill || LANE_META[id].skill;
      const skillFile = [...S.files.values()].find((f) => f.layer === 'skill' && f.title === wantSkill);
      if (skillFile) links.push({ source: aid, target: skillFile.path, kind });
      for (const p of S.wrote[id] || []) if (S.files.has(p)) links.push({ source: aid, target: p, kind });
    }
    // console runs (live): one agent node per run, linked to the files it touched
    for (const r of S.runs) {
      const aid = `run:${r.id}`;
      nodes.push({ id: aid, layer: 'agent', title: r.runner, running: r.status === 'running' });
      for (const f of S.files.values()) {
        if (f.mtime && f.mtime >= r.startedAt && f.mtime <= (r.endedAt || Infinity) + 5000) links.push({ source: aid, target: f.path, kind: r.status === 'running' ? 'agent' : 'agent-idle' });
      }
    }
    return { nodes, links };
  }

  let linkSel, nodeSel, hoverId = null;
  function renderGraph() {
    const { nodes, links } = buildGraph();
    const byKey = new Map([...nodeById.values()].filter((n) => n.layer === 'ghost').map((n) => [n.key, n]));
    const next = nodes.map((n) => {
      const old = nodeById.get(n.id) || nodeById.get(renamedFrom.get(n.id));
      if (old) return Object.assign(old, n, { id: n.id });
      const g = byKey.get(norm(n.id)) || byKey.get(norm(base(n.id))) || byKey.get(norm(bare(base(n.id))));
      const a = anchor(n);
      const near = links.find((l) => l.target === n.id || l.source === n.id);
      const src = near && nodeById.get(near.source === n.id ? near.target : near.source);
      return Object.assign(n, g ? { x: g.x, y: g.y } : src ? { x: src.x + (Math.random() - 0.5) * 30, y: src.y + (Math.random() - 0.5) * 30 } : { x: a.x + (Math.random() - 0.5) * 40, y: a.y + (Math.random() - 0.5) * 40 });
    });
    nodeById.clear(); next.forEach((n) => nodeById.set(n.id, n));
    const byLayer = d3.group(next.filter((n) => n.layer !== 'ghost'), (n) => n.layer);
    for (const arr of byLayer.values()) arr.sort((a, b) => a.id.localeCompare(b.id)).forEach((n, i) => { n.slot = i; n.slotN = arr.length; });

    linkSel = gLinks.selectAll('line').data(links, (l) => `${l.source.id || l.source}→${l.target.id || l.target}`)
      .join('line').attr('class', (l) => `link ${l.kind}`);
    nodeSel = gNodes.selectAll('g.node').data(next, (d) => d.id).join(
      (enter) => {
        const g = enter.append('g').attr('class', 'node');
        g.append('path');
        g.append('text').attr('text-anchor', 'middle');
        g.call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
        g.on('click', (e, d) => d.file && openPreview(d.file.path))
          .on('mouseenter', (e, d) => { hoverId = d.id; highlight(); })
          .on('mouseleave', () => { hoverId = null; highlight(); });
        return g;
      });
    const dense = next.length > 70;
    svg.classed('dense', dense);
    nodeSel.attr('class', (d) => `node ${d.layer === 'ghost' ? 'ghost' : ''} ${d.layer === 'agent' ? 'agent' : ''} ${hiddenLayers.has(d.layer) ? 'off' : ''} L-${d.layer}`);
    nodeSel.classed('sel', (d) => d.id === SEL);
    linkSel.classed('off', (l) => hiddenLayers.has((nodeById.get(l.source.id || l.source) || {}).layer) || hiddenLayers.has((nodeById.get(l.target.id || l.target) || {}).layer));
    nodeSel.select('path').attr('d', (d) => d3.symbol(SYM[LAYERS[d.layer].sym], LAYERS[d.layer].size)())
      .attr('fill', (d) => { const f = LAYERS[d.layer].fill; return f === true ? '#0a0a0a' : f === 'accent' ? (d.running ? '#d7261e' : '#0a0a0a') : f === 'hair' ? '#e6e6e6' : '#fff'; })
      .attr('stroke', (d) => (d.layer === 'agent' ? (d.running ? '#d7261e' : '#0a0a0a') : null));
    nodeSel.select('text').text((d) => d.title).attr('dy', (d) => Math.sqrt(LAYERS[d.layer].size) / 1.5 + 11);
    nodeSel.selectAll('circle.pulse').remove();
    nodeSel.filter((d) => d.running).insert('circle', 'path').attr('class', 'pulse').attr('r', 14);

    const t = now();
    for (const [p, at] of [...S.fresh]) {
      if (t - at > 1800) { S.fresh.delete(p); S.ringed.delete(p); continue; }
      if (S.ringed.has(p)) continue;
      const n = nodeById.get(p);
      if (!n) continue;
      gFx.append('circle').attr('class', 'ring').attr('cx', n.x).attr('cy', n.y).attr('r', 6).datum(n)
        .on('animationend', function () { this.remove(); });
      S.ringed.add(p);
    }
    sim.nodes(next);
    sim.force('link').links(links);
    sim.alpha(Math.max(sim.alpha(), 0.45)).restart();
    highlight();
    document.getElementById('empty').style.opacity = S.files.size ? 0 : 1;
  }
  function ticked() {
    if (!linkSel) return;
    for (const d of sim.nodes()) { d.x = Math.max(26, Math.min(W - 26, d.x)); d.y = Math.max(18, Math.min(H - 22, d.y)); }
    linkSel.attr('x1', (l) => l.source.x).attr('y1', (l) => l.source.y).attr('x2', (l) => l.target.x).attr('y2', (l) => l.target.y);
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    gFx.selectAll('circle.ring').attr('cx', (d) => d.x).attr('cy', (d) => d.y);
  }
  function highlight() {
    if (!nodeSel) return;
    if (!hoverId) { nodeSel.classed('dim', false); linkSel.classed('dim', false).classed('hot', false); return; }
    const nb = new Set([hoverId]);
    linkSel.each((l) => { if (l.source.id === hoverId) nb.add(l.target.id); if (l.target.id === hoverId) nb.add(l.source.id); });
    nodeSel.classed('dim', (d) => !nb.has(d.id));
    linkSel.classed('dim', (l) => l.source.id !== hoverId && l.target.id !== hoverId).classed('hot', (l) => l.source.id === hoverId || l.target.id === hoverId);
  }

  // ---------- legend: click hides or shows a layer ----------
  const hiddenLayers = new Set();
  const ALL_LAYERS = () => [...document.querySelectorAll('#legend span[data-l]')].map((x) => x.dataset.l);
  function paintLegend() { document.querySelectorAll('#legend span[data-l]').forEach((x) => x.classList.toggle('off', hiddenLayers.has(x.dataset.l))); renderGraph(); }
  document.getElementById('legend').addEventListener('click', (e) => {
    const all = e.target.closest('[data-all]');
    if (all) { hiddenLayers.clear(); if (all.dataset.all === 'none') ALL_LAYERS().forEach((l) => hiddenLayers.add(l)); paintLegend(); return; }
    const el = e.target.closest('span[data-l]'); if (!el) return;
    const l = el.dataset.l;
    // alt or shift click: show only this layer
    if (e.altKey || e.shiftKey) { hiddenLayers.clear(); ALL_LAYERS().filter((x) => x !== l).forEach((x) => hiddenLayers.add(x)); }
    else if (hiddenLayers.has(l)) hiddenLayers.delete(l); else hiddenLayers.add(l);
    paintLegend();
  });
  document.getElementById('legend').innerHTML = ['hub', 'context', 'rule', 'role', 'tool', 'code', 'guide', 'skill', 'eval', 'design', 'agent', 'source', 'research', 'nucleus', 'output', 'dashboard', 'automation', 'gate', 'ghost']
    .map((k) => {
      const L = LAYERS[k];
      const d = d3.symbol(SYM[L.sym], Math.min(L.size, 110) * 0.8)();
      const fill = L.fill === true ? '#0a0a0a' : L.fill === 'accent' ? '#d7261e' : L.fill === 'hair' ? '#e6e6e6' : '#fff';
      const dash = k === 'ghost' ? ' stroke-dasharray="2 2" stroke="#aaa"' : ` stroke="${k === 'agent' ? '#d7261e' : '#0a0a0a'}"`;
      return `<span data-l="${k}" title="клик – скрыть или показать · alt-клик – только этот слой"><svg viewBox="-7 -7 14 14"><path d="${d}" fill="${fill}"${dash} stroke-width="1.2"/></svg>${L.label}</span>`;
    }).join('') + '<b class="lg-all"><button type="button" data-all="all" title="показать все слои">все</button><button type="button" data-all="none" title="скрыть все слои">ничего</button></b>';

  // ---------- panels ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function renderTree() {
    const groups = new Map();
    for (const f of S.files.values()) {
      const top = f.path.includes('/') ? f.path.split('/')[0] : '';
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top).push(f);
    }
    const rank = (g) => { const i = FOLDER_ORDER.indexOf(g); return i < 0 ? 99 : i; };
    const order = [...groups.keys()].sort((a, b) => rank(a) - rank(b));
    const t = now();
    document.getElementById('tree').innerHTML = order.map((g) => {
      const files = groups.get(g).sort((a, b) => a.path.localeCompare(b.path));
      return `<div class="fold"><b>${g ? `${esc(g)}/` : './'}</b> ${files.length}</div>` + files.map((f) => {
        const isNew = S.fresh.has(f.path) && t - S.fresh.get(f.path) < 1800;
        const name = g ? f.path.slice(g.length + 1) : f.path;
        return `<div class="file${isNew ? ' new' : ''}${f.path === SEL ? ' sel' : ''}" data-p="${esc(f.path)}" title="${esc(f.path)}"><span class="g">${LAYERS[f.layer].glyph}</span><span>${esc(name)}</span></div>`;
      }).join('');
    }).join('');
    document.getElementById('fileCount').textContent = S.files.size;
  }
  document.getElementById('tree').addEventListener('click', (e) => { const el = e.target.closest('.file'); if (el) openPreview(el.dataset.p); });

  function renderCommits() {
    const ol = document.getElementById('commits');
    ol.innerHTML = S.commits.map((c, i) => `<li class="${i === S.commits.length - 1 && S.freshCommit && now() - S.freshCommit < 2500 ? 'fresh' : ''}"><b>${esc(c.hash)}</b><span>${esc(c.msg)}</span></li>`).join('');
    ol.scrollTop = ol.scrollHeight;
    document.getElementById('commitCount').textContent = S.commits.length;
  }

  function renderAnketa(replayT) {
    const qs2 = META.questions;
    let shown = S.answersShown, partial = null;
    if (S.answersTyping && replayT !== undefined) {
      const { at, dwell } = S.answersTyping;
      const per = dwell / (qs2.length + 1);
      const p = Math.max(0, (replayT - at) / per);
      shown = Math.min(qs2.length, Math.floor(p));
      if (shown < qs2.length) partial = { i: shown, frac: p - shown };
    }
    document.getElementById('qa').innerHTML = qs2.map((q, i) => {
      const a = META.answers[q.key] || '';
      if (i < shown) return `<dt>${esc(q.q)}</dt><dd class="on">${esc(a)}</dd>`;
      if (partial && partial.i === i) return `<dt>${esc(q.q)}</dt><dd class="on typing">${esc(a.slice(0, Math.floor(a.length * partial.frac)))}</dd>`;
      return `<dt>${esc(q.q)}</dt><dd class="wait">…</dd>`;
    }).join('');
    document.getElementById('qaCount').textContent = `${partial ? partial.i : shown}/${qs2.length}`;
    document.getElementById('anketaP').classList.toggle('compact', !!S.phase && !['p00', 'p01'].includes(S.phase));
  }

  function renderLanes() {
    let active = 0;
    document.getElementById('lanes').innerHTML = LANE_ORDER.map((id) => {
      const l = S.lanes[id] || { status: 'idle' };
      const m = LANE_META[id];
      if (l.status === 'running') active++;
      const status = { idle: 'ждёт запуска', waiting: l.note || 'ждёт', running: 'пишет', done: 'готово' }[l.status] || l.status;
      const wrote = S.wrote[id] ? S.wrote[id].size : 0;
      return `<div class="lane ${l.status}"><i class="dot"></i><div><b>${esc(l.title || m.title)}</b><small>${esc(l.skill || m.skill)}</small></div>
        <div><div class="tgt">${l.status === 'running' ? `→ ${esc(bare(base(l.target || '')))}` : esc(status)}${wrote ? ` <small style="display:inline">· ${wrote} ф.</small>` : ''}</div><div class="bar"></div></div></div>`;
    }).join('');
    document.getElementById('laneCount').textContent = `${active} в работе`;
  }

  let lastMetrics = {};
  function renderDash() {
    const files = [...S.files.values()];
    const by = (l) => files.filter((f) => f.layer === l);
    const drafts = by('output').filter((f) => f.path.endsWith('.md'));
    const scores = drafts.map((f) => Number(f.fm.score)).filter((n) => !Number.isNaN(n) && n > 0);
    const nuclei = by('nucleus');
    const covered = new Set(); const cell = new Map();
    for (const o of drafts) {
      const nk = norm(bare((o.fm.nucleus || '').replace(/\[\[|\]\]/g, '')));
      cell.set(`${nk}|${(o.fm.channel || '').toLowerCase()}`, true); covered.add(nk);
    }
    const m = {
      'файлы': files.length, 'связи': linkSel ? linkSel.size() : 0, 'скиллы': by('skill').length, 'правила': by('rule').length,
      'инструм.': by('tool').length, 'evals': by('eval').length, 'черновики': drafts.length,
      'ср. балл': scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '–',
    };
    document.getElementById('metrics').innerHTML = Object.entries(m).map(([k, v]) => `<div class="m ${lastMetrics[k] !== undefined && lastMetrics[k] !== v ? 'up' : ''}"><b>${v}</b><span>${k}</span></div>`).join('');
    lastMetrics = m;
    const cov = document.getElementById('coverage');
    if (!nuclei.length) { cov.innerHTML = '<div class="cap">сетка покрытия нуклеус × канал появится с первыми нуклеусами</div>'; return; }
    cov.innerHTML = `<table><tr><th>нуклеус</th>${CHANNELS.map(([, t]) => `<th>${t}</th>`).join('')}</tr>` +
      nuclei.sort((a, b) => a.path.localeCompare(b.path)).map((n) => {
        const nk = norm(bare(base(n.path)));
        const any = covered.has(nk);
        return `<tr><td title="${esc(n.content.split('\n').find((l) => l.startsWith('# ')) || '')}">${esc(n.title)}</td>${CHANNELS.map(([c]) => `<td><i class="${cell.get(`${nk}|${c}`) ? 'f' : any ? '' : 'gap'}"></i></td>`).join('')}</tr>`;
      }).join('') + '</table><div class="cap">■ есть черновик · пунктир – нуклеус без единой единицы</div>';
  }

  // tools tab: live status from the server; replay – the tool cards of the folder
  let toolsLive = null;
  // tools tab: every card with its readiness on this computer, the skills that use it and how to set it up
  const TOOL_OF = { exa: 'exa', lms: 'lms', 'lms-api': 'lms', linkedin: 'linkedin', telegram: 'telegram', gemini: 'gemini', apify: 'apify', claude: 'claude-code', codex: 'codex', sotnik: 'codex', gh: 'git-github', obsidian: 'obsidian' };
  function renderTools() {
    const el = document.getElementById('tools');
    const cards = [...S.files.values()].filter((f) => f.layer === 'tool' && f.path.endsWith('.md')).sort((a, b) => a.path.localeCompare(b.path));
    if (!cards.length) { el.innerHTML = '<div class="cap">инструменты появятся в фазе 04 · все инструкции: <a href="access.html">подключения</a></div>'; return; }
    const idx = resolveIndex();
    const skillsOf = (p) => [...S.files.values()].filter((g) => g.layer === 'skill' && g.links.some((t) => idx.get(t) === p)).map((g) => g.path);
    el.innerHTML = cards.map((f) => {
      const slug = bare(base(f.path));
      const st = toolsLive ? toolsLive.filter((t) => TOOL_OF[t.id] === slug) : [];
      const ok = st.length && st.every((t) => t.ready);
      const why = (f.content.split('\n').find((l) => l.startsWith('**Зачем:**')) || '').replace('**Зачем:**', '').replace(/\[\[[^\]]*\]\]/g, '').replace(/`/g, '').trim().slice(0, 110);
      const sk = skillsOf(f.path);
      const state = st.map((t) => `${t.ready ? '●' : '○'} ${esc(t.what)}${!t.ready && t.env ? ` · <code>export ${esc(t.env)}=…</code>` : ''}`).join(' · ');
      return `<div class="trow ${ok ? 'ok' : st.length ? '' : 'link'}" data-p="${esc(f.path)}"><i></i><b>${esc(f.title)}</b><span>${esc(why)}</span>
        <div class="sub">${state ? `${state}<br>` : ''}<a class="set" data-p="${esc(f.path)}">как настроить →</a>${slug === 'lms' ? ' <a href="https://learn.aimindset.org/cabinet/api-keys" target="_blank" rel="noopener">ключ в LMS ↗</a>' : ''}${sk.length ? ` · скиллы: ${sk.map((x) => `<a data-p="${esc(x)}">${esc(bare(base(x)))}</a>`).join('')}` : ''}</div></div>`;
    }).join('') + `<div class="cap">${toolsLive ? 'статус – задан ли ключ на этом компьютере, значения не видны · ' : 'статус ключей виден в полном режиме (bin/open.sh) · '}все инструкции: <a href="access.html">подключения</a></div>`;
  }

  document.getElementById('tabBody').addEventListener('click', (e) => { const el = e.target.closest('.trow.link'); if (el) openPreview(el.dataset.p); });

  function renderPhases(progress) {
    const cur = META.phases.findIndex((p) => p.id === S.phase);
    const box = document.getElementById('phases');
    // build the chips once, then only flip classes: re-creating them every frame swallowed clicks
    const sig = META.phases.map((p) => p.id).join();
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.style.gridTemplateColumns = `repeat(${META.phases.length || 1}, minmax(0,1fr))`;
      box.innerHTML = META.phases.map((p, i) => `<div class="ph" data-i="${i}" title="${esc(p.title)} · клик – к карточке фазы">${p.id.slice(1)} · ${esc(p.title)}</div>`).join('');
    }
    [...box.children].forEach((el, i) => { const cls = i < cur || S.phase === 'done' ? 'ph done' : i === cur ? 'ph now' : 'ph'; if (el.className !== cls) el.className = cls; });
    const ph = META.phases[cur];
    document.getElementById('phaseLabel').textContent = S.phase === 'done' ? 'готово · харнесс собран' : ph ? `${ph.id.slice(1)} · ${ph.title}` : '00 · пустая папка';
    document.querySelector('#bar i').style.width = `${Math.min(100, progress * 100)}%`;
  }
  function renderNarr() {
    document.getElementById('narrText').textContent = S.narr || '–';
    document.getElementById('narrTag').textContent = S.narrTag;
  }
  const fmt = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  document.getElementById('tools').addEventListener('click', (e) => { const el = e.target.closest('[data-p]'); if (el && !e.target.closest('a[href]')) openPreview(el.dataset.p); });

  // ---------- tabs ----------
  document.getElementById('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tabpane').forEach((p) => { p.hidden = p.dataset.tab !== b.dataset.tab; });
    if (b.dataset.tab === 'tools' && MODE === 'live') loadTools();
    renderTools();
  });

  // ---------- preview: view · source · edit with live preview ----------
  const $ = (id) => document.getElementById(id);
  const PV = { path: null, mode: 'view', buffer: '', base: '', mtime: null, escArmed: false };
  let SESSION = null;
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-harness-token': SESSION ? SESSION.token : '' }, body: JSON.stringify(body || {}) })
    .then((r) => r.json()).catch(() => ({ error: 'сеть' }));
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const autolink = (h) => h.replace(/(^|[\s(«])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:ai|com|org|io|dev|app|co|me)(?:\/[^\s)<»,;]*)?)/gi,
    (m, pre, url) => (/^\S+@/.test(url) ? m : `${pre}<a href="${/^https?:/.test(url) ? url : `https://${url}`}" target="_blank" rel="noopener">${url}</a>`));
  function mdInline(s, idx) {
    return String(s).split(/(`[^`]+`)/).map((part) => (/^`[^`]+`$/.test(part) ? `<code>${esc(part.slice(1, -1))}</code>` : mdText(part, idx))).join('');
  }
  function mdText(s, idx) {
    return autolink(esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (m, t, label) => {
        const hit = idx && idx.get(norm(unesc(t)));
        return hit ? `<a class="wl" data-p="${esc(hit)}">${label || esc(bare(unesc(t)))}</a>` : `<a class="wl miss" title="файла ещё нет">${label || t}</a>`;
      })
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')).replace(/(<a [^>]*>)<a [^>]*>([^<]*)<\/a>/g, '$1$2');
  }
  const BLOCK = /^(#{1,3}\s|```|\s*[-*]\s|\s*\d+[.)]\s|\s*\||>|---+\s*$)/;
  function mdRender(text) {
    const idx = resolveIndex();
    const inl = (x) => mdInline(x, idx);
    let src = String(text || '').replace(/\r/g, '');
    let out = '';
    const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
    if (fm) { out += `<div class="fm">${esc(fm[1])}</div>`; src = src.slice(fm[0].length); }
    const L = src.split('\n');
    let i = 0;
    const take = (re, strip) => { const it = []; while (i < L.length && re.test(L[i])) it.push(L[i++].replace(strip, '')); return it; };
    while (i < L.length) {
      const l = L[i];
      if (/^```/.test(l)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; out += `<pre><code>${esc(b.join('\n'))}</code></pre>`; continue; }
      const h = /^(#{1,3})\s+(.*)$/.exec(l);
      if (h) { out += `<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`; i++; continue; }
      if (/^\s*\|/.test(l)) {
        const rows = take(/^\s*\|/, /^$/);
        const sep = (r) => /^\s*\|[\s:|-]+\|?\s*$/.test(r);
        const head = rows.length > 1 && sep(rows[1]);
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        out += `<table>${rows.filter((r) => !sep(r)).map((r, k) => `<tr>${cells(r).map((c) => (head && k === 0 ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
        continue;
      }
      if (/^\s*[-*]\s+/.test(l)) { out += `<ul>${take(/^\s*[-*]\s+/, /^\s*[-*]\s+/).map((x) => `<li>${inl(x)}</li>`).join('')}</ul>`; continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { out += `<ol>${take(/^\s*\d+[.)]\s+/, /^\s*\d+[.)]\s+/).map((x) => `<li>${inl(x)}</li>`).join('')}</ol>`; continue; }
      if (/^>/.test(l)) { out += `<blockquote>${take(/^>/, /^>\s?/).map(inl).join('<br>')}</blockquote>`; continue; }
      if (/^---+\s*$/.test(l)) { out += '<hr>'; i++; continue; }
      if (!l.trim()) { i++; continue; }
      const para = [l]; i++;
      while (i < L.length && L[i].trim() && !BLOCK.test(L[i])) para.push(L[i++]);
      out += `<p>${inl(para.join(' '))}</p>`;
    }
    return out;
  }

  const fileUrl = (p) => `/f/${p.split('/').map(encodeURIComponent).join('/')}`;
  function pvNote(t) { $('pvNote').textContent = t || ''; }
  function pvRender() {
    if (!PV.path) return;
    const f = S.files.get(PV.path);
    const editing = PV.mode === 'edit';
    const content = editing ? PV.buffer : (f ? f.content : '');
    const isHtml = PV.path.endsWith('.html'), isMd = PV.path.endsWith('.md');
    const rich = (isHtml || isMd) && PV.mode !== 'raw';
    $('pvEditor').hidden = !editing;
    $('pvBody').hidden = rich || editing;
    $('pvMd').hidden = !(rich && isMd);
    $('pvFrame').hidden = !(rich && isHtml);
    if (!rich && !editing) $('pvBody').textContent = content;
    if (rich && isMd) $('pvMd').innerHTML = mdRender(content);
    if (rich && isHtml) {
      const frame = $('pvFrame');
      if (MODE === 'live' && !editing) {
        const want = `${fileUrl(PV.path)}?v=${f?.mtime || 0}`;
        if (frame.dataset.src !== want) { frame.removeAttribute('srcdoc'); frame.src = want; frame.dataset.src = want; }
      } else {
        const dirBase = MODE === 'live' ? `<base href="${fileUrl(PV.path.split('/').slice(0, -1).join('/') + '/')}">` : '';
        const doc = dirBase + content;
        if (frame.dataset.doc !== doc) { frame.srcdoc = doc; frame.dataset.doc = doc; frame.dataset.src = ''; }
      }
    }
    for (const [id, m] of [['pvView', 'view'], ['pvRaw', 'raw'], ['pvEdit', 'edit']]) $(id).classList.toggle('on', PV.mode === m);
    $('pvSave').hidden = !editing;
    $('preview').classList.toggle('editing', editing);
    $('preview').classList.toggle('dirty', editing && PV.buffer !== PV.base);
  }
  function openPreview(p) {
    const f = S.files.get(p); if (!f) return;
    if (PV.mode === 'edit' && PV.buffer !== PV.base && PV.path !== p) pvNote(`правки в ${bare(base(PV.path))} не сохранены и сброшены`); else pvNote('');
    const idx = resolveIndex();
    const out = f.links.map((t) => idx.get(t)).filter(Boolean);
    const back = [...S.files.values()].filter((g) => g.links.some((t) => idx.get(t) === p)).map((g) => g.path);
    $('pvTitle').textContent = `${LAYERS[f.layer].glyph} ${f.title}`;
    $('pvPath').textContent = `${f.path} · ${LAYERS[f.layer].label}`;
    const a = (x) => `<a data-p="${esc(x)}">${esc(bare(base(x)))}</a>`;
    $('pvLinks').innerHTML = `→ ${out.length ? out.map(a).join('') : '–'}<br>← ${back.length ? back.map(a).join('') : '–'}`;
    PV.path = p; PV.mode = 'view'; PV.mtime = f.mtime; PV.escArmed = false;
    $('preview').hidden = false;
    $('preview').classList.toggle('full', !!(PV.full && p.endsWith('.html')));
    pvRender();
    select(p, true);
  }
  function closePreview() {
    if (PV.mode === 'edit' && PV.buffer !== PV.base && !PV.escArmed) { PV.escArmed = true; pvNote('есть несохранённые правки: ⌘S – сохранить, Esc ещё раз – закрыть без них'); return; }
    if ($('preview').classList.contains('full')) { $('preview').classList.remove('full'); PV.full = false; return; }
    PV.mode = 'view'; PV.escArmed = false; $('preview').hidden = true; $('preview').classList.remove('editing', 'dirty');
    select(null, false);
  }
  $('pvFull').onclick = () => { PV.full = !$('preview').classList.contains('full'); $('preview').classList.toggle('full', PV.full); };
  // the open file changed on disk (agent, Obsidian, another editor)
  function pvSync() {
    if ($('preview').hidden || !PV.path) return;
    const f = S.files.get(PV.path);
    if (!f) { pvNote('файл удалён или переименован'); return; }
    if (PV.mode === 'edit') {
      if (f.content !== PV.base) {
        if (PV.buffer === PV.base) { PV.buffer = PV.base = f.content; $('pvEditor').value = f.content; pvNote('файл обновился на диске, редактор подхватил'); pvRender(); }
        else pvNote('файл изменился на диске, пока ты правишь: сохранение перезапишет чужую правку');
      }
      return;
    }
    pvRender();
  }
  $('pvLinks').addEventListener('click', (e) => { const el = e.target.closest('a[data-p]'); if (el) openPreview(el.dataset.p); });
  $('pvMd').addEventListener('click', (e) => { const el = e.target.closest('a.wl[data-p]'); if (el) openPreview(el.dataset.p); });
  $('pvClose').onclick = closePreview;
  $('pvView').onclick = () => { if (PV.mode === 'edit' && PV.buffer !== PV.base) { pvNote('сначала сохрани правки или закрой панель'); return; } PV.mode = 'view'; pvRender(); };
  $('pvRaw').onclick = () => { if (PV.mode === 'edit' && PV.buffer !== PV.base) { pvNote('сначала сохрани правки или закрой панель'); return; } PV.mode = 'raw'; pvRender(); };
  $('pvEdit').onclick = () => {
    if (MODE !== 'live' || (!SESSION && !FSA)) return;
    const f = S.files.get(PV.path); if (!f) return;
    if (f.content.length >= 20000) { pvNote('файл длиннее 20 000 знаков: правь его в Obsidian или в редакторе'); return; }
    PV.mode = 'edit'; PV.buffer = PV.base = f.content; $('pvEditor').value = f.content; pvNote('правка с живым превью · ⌘S сохраняет и коммитит'); pvRender(); $('pvEditor').focus();
  };
  let pvTimer = null;
  $('pvEditor').addEventListener('input', (e) => { PV.buffer = e.target.value; PV.escArmed = false; $('preview').classList.toggle('dirty', PV.buffer !== PV.base); clearTimeout(pvTimer); pvTimer = setTimeout(pvRender, 180); });
  async function pvSave() {
    if (PV.mode !== 'edit' || (!SESSION && !FSA)) return;
    if (FSA) {
      try { await fsaWrite(PV.path, PV.buffer); PV.base = PV.buffer; upsertFile(PV.path, PV.buffer, null, true); pvNote('сохранено в файл · коммит – в терминале или GitHub Desktop'); } catch (err) { pvNote(`не сохранилось: ${err.message}`); }
      pvRender(); return;
    }
    const r = await post('/api/file', { path: PV.path, content: PV.buffer });
    if (r.ok) { PV.base = PV.buffer; upsertFile(PV.path, PV.buffer, null, true); pvNote(r.commit ? `сохранено · коммит ${r.commit}` : 'сохранено'); }
    else pvNote(`не сохранилось: ${r.error || 'ошибка'}`);
    pvRender();
  }
  $('pvSave').onclick = pvSave;
  // keep the rendered side at the same place as the text being edited
  $('pvEditor').addEventListener('scroll', (e) => {
    const t = e.target, r = t.scrollTop / Math.max(1, t.scrollHeight - t.clientHeight);
    const side = PV.path && PV.path.endsWith('.md') ? $('pvMd') : null;
    if (side) side.scrollTop = r * (side.scrollHeight - side.clientHeight);
  });
  async function openIn(app, p) {
    if (!SESSION) return;
    const r = await post('/api/open', { path: p, app });
    const msg = r.ok ? (r.hint || 'открыто') : `не открылось: ${r.error || 'ошибка'}`;
    if (p === '') { $('narrText').textContent = msg; } else pvNote(msg);
  }
  $('pvObs').onclick = () => openIn('obsidian', PV.path);
  $('pvApp').onclick = () => openIn('default', PV.path);
  $('pvFinder').onclick = () => openIn('finder', PV.path);
  $('openVault').onclick = () => openIn('obsidian', '');
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && PV.mode === 'edit' && !$('preview').hidden) { e.preventDefault(); pvSave(); }
  });

  // ---------- phase stops: a plain-language card after each phase ----------
  let STOPS = qs.get('stops') !== '0';
  let stopOpen = null, onStopGo = null;
  function setStops(v) { STOPS = v; $('stopsBtn').classList.toggle('on', v); $('stopsBtn').textContent = v ? 'стопы вкл' : 'стопы выкл'; }
  setStops(STOPS);
  function showStop(id, files, go) {
    const i = META.phases.findIndex((x) => x.id === id);
    const ph = META.phases[i];
    if (!ph || !ph.stop) return false;
    const idx = resolveIndex();
    $('stNum').textContent = `фаза ${id.slice(1)} · ${ph.title}`;
    $('stStep').textContent = `${i + 1} / ${META.phases.length}`;
    $('stTitle').textContent = ph.stop.title;
    $('stLead').innerHTML = mdInline(ph.stop.lead, idx);
    $('stPoints').innerHTML = (ph.stop.points || []).map((x) => `<li>${mdInline(x, idx)}</li>`).join('');
    const shown = files.filter((p) => S.files.has(p));
    $('stFiles').innerHTML = shown.length ? `<b>${id === 'p03' ? 'переименовано' : 'появилось'} · ${shown.length} файлов</b><div class="chips">${shown.map((p) => `<a data-p="${esc(p)}" title="${esc(p)}">${LAYERS[layerOf(p)].glyph} ${esc(bare(base(p)))}</a>`).join('')}</div>` : '';
    const nxt = META.phases[i + 1];
    $('stGo').textContent = nxt ? `дальше: ${nxt.title} →` : 'к финалу →';
    stopOpen = id; onStopGo = go;
    $('stop').hidden = false; $('stGo').focus();
    return true;
  }
  function closeStop(go) {
    const f = onStopGo;
    $('stop').hidden = true; stopOpen = null; onStopGo = null;
    if (go && f) f();
  }
  $('stGo').onclick = () => closeStop(true);
  $('stOff').onclick = () => { setStops(false); closeStop(true); };
  $('stFiles').addEventListener('click', (e) => { const a = e.target.closest('a[data-p]'); if (a) { closeStop(false); openPreview(a.dataset.p); } });
  $('stopsBtn').onclick = () => setStops(!STOPS);

  // ---------- render loop ----------
  function renderAll(progress, replayT) {
    if (dirty) { renderGraph(); renderTree(); renderCommits(); renderLanes(); renderDash(); renderNarr(); renderTools(); renderRuns(); pvSync(); dirty = false; }
    renderAnketa(replayT);
    renderPhases(progress);
  }
  let lastTree = 0;
  function treeTick() { const t = now(); if (S.fresh.size && t - lastTree > 500) { lastTree = t; renderTree(); } }

  // ---------- replay ----------
  function apply(e, animate) {
    switch (e.type) {
      case 'phase': S.phase = e.id; break;
      case 'narrate': S.narr = e.text; S.narrTag = e.lane ? 'агент' : `фаза ${(S.phase || '').slice(1)}`; break;
      case 'answers': S.answersTyping = { at: e.at, dwell: e.dwell }; break;
      case 'file': upsertFile(e.path, e.content, e.lane, animate); break;
      case 'rename': renameFile(e.from, e.to, e.content, animate); break;
      case 'mirror': S.narr = 'skills/ → .claude/skills и .agents/skills · зеркала обновлены'; break;
      case 'lane': S.lanes[e.lane] = { ...(S.lanes[e.lane] || {}), status: e.status, title: e.title, skill: e.skill, target: e.target, note: e.note }; break;
      case 'commit': S.commits.push({ hash: e.hash, msg: e.msg }); if (animate) S.freshCommit = now(); break;
    }
    markDirty();
  }

  async function startReplay() {
    const sc = await fetch('scenario.json', { cache: 'no-store' }).then((r) => r.json());
    META = { questions: sc.questions, answers: sc.answers, phases: sc.phases, duration: sc.duration };
    const phaseFiles = {};
    { let cur = null; for (const e of sc.events) { if (e.type === 'phase') cur = e.id; if (cur && (e.type === 'file' || e.type === 'rename')) (phaseFiles[cur] ||= new Set()).add(e.type === 'file' ? e.path : e.to); } }
    const R = { t: 0, i: 0, playing: qs.get('autoplay') !== '0', speed: Number(qs.get('speed') || 1), last: now() };
    const btnPlay = document.getElementById('play');
    const btnSpeed = document.getElementById('speed');
    const setPlay = (v) => { R.playing = v; btnPlay.textContent = v ? '❚❚' : '▶'; };
    function seek(t) {
      closeStop(false);
      reset(); nodeById.clear(); gFx.selectAll('*').remove();
      R.t = Math.max(0, Math.min(t, sc.duration)); R.i = 0;
      while (R.i < sc.events.length && sc.events[R.i].at <= R.t) apply(sc.events[R.i++], false);
      if (R.t >= sc.duration) S.phase = 'done';
      markDirty();
    }
    btnPlay.onclick = () => { if (R.t >= sc.duration) seek(0); setPlay(!R.playing); };
    document.getElementById('restart').onclick = () => { seek(0); setPlay(true); };
    const nextPhase = () => { const p = sc.phases.find((x) => x.start > R.t + 10); seek(p ? p.start : sc.duration); };
    document.getElementById('next').onclick = nextPhase;
    const prevPhase = () => {
      const i = Math.max(0, sc.phases.findLastIndex((x) => x.start <= R.t));
      seek(R.t - sc.phases[i].start > 1500 ? sc.phases[i].start + 1 : sc.phases[Math.max(0, i - 1)].start + 1);
    };
    document.getElementById('prev').onclick = prevPhase;
    document.getElementById('end').onclick = () => { seek(sc.duration); setPlay(false); };
    const speeds = [1, 2, 4, 0.5];
    btnSpeed.textContent = `${R.speed}×`;
    btnSpeed.onclick = () => { R.speed = speeds[(speeds.indexOf(R.speed) + 1) % speeds.length]; btnSpeed.textContent = `${R.speed}×`; };
    // a phase chip jumps to the end of that phase and opens its card; «продолжить» plays on from there
    jumpToPhase = (i) => {
      const ph = sc.phases[i]; if (!ph) return;
      seek(ph.end); setPlay(false);
      if (!showStop(ph.id, [...(phaseFiles[ph.id] || [])], () => setPlay(true))) setPlay(true);
    };
    document.getElementById('phases').addEventListener('click', (e) => { const el = e.target.closest('.ph'); if (el) jumpToPhase(Number(el.dataset.i)); });
    document.getElementById('bar').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * sc.duration); });
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (stopOpen) {
        if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); closeStop(true); }
        return;
      }
      if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
      if (e.code === 'ArrowRight') nextPhase();
      if (e.code === 'ArrowLeft') prevPhase();
      if (e.key === 's') setStops(!STOPS);
      if (e.code === 'End') { seek(sc.duration); setPlay(false); }
      if (e.key === 'r') { seek(0); setPlay(true); }
    });
    if (introWanted) {
      R.playing = false;
      $('intro').hidden = false; $('inGo').focus();
      $('inGo').onclick = () => introClose(() => setPlay(true));
      $('inEnd').onclick = () => introClose(() => { seek(sc.duration); setPlay(false); });
      window.addEventListener('keydown', function onIntroKey(e) { if ($('intro').hidden) { window.removeEventListener('keydown', onIntroKey, true); return; } if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); $('inGo').click(); } }, true);
    }
    const startPhase = sc.phases.find((x) => x.id === qs.get('phase'));
    if (qs.get('at') === 'end') { seek(sc.duration); setPlay(false); } else if (startPhase) { jumpToPhase(sc.phases.indexOf(startPhase)); } else setPlay(R.playing);
    function frame(t) {
      const dt = Math.min(200, t - R.last); R.last = t;
      if (R.playing) {
        R.t += dt * R.speed;
        while (R.i < sc.events.length && sc.events[R.i].at <= R.t) {
          const e = sc.events[R.i++];
          apply(e, true);
          if (e.type === 'commit' && STOPS && e.phase && showStop(e.phase, [...(phaseFiles[e.phase] || [])], () => setPlay(true))) { R.t = e.at; setPlay(false); markDirty(); break; }
        }
        if (R.t >= sc.duration) { R.t = sc.duration; S.phase = 'done'; setPlay(false); markDirty(); }
      }
      document.getElementById('clock').textContent = `${fmt(R.t)} / ${fmt(sc.duration)} · ${R.speed}×`;
      renderAll(R.t / sc.duration, R.t);
      treeTick();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------- live ----------
  async function loadTools() {
    try { toolsLive = (await fetch('/api/tools').then((r) => r.json())).tools; renderTools(); } catch { /* offline */ }
  }
  function renderRuns() {
    const el = document.getElementById('runs');
    el.innerHTML = S.runs.slice().reverse().map((r) => `<details class="run ${r.status}" ${r.status === 'running' ? 'open' : ''}><summary><i></i><b>${esc(r.runner)}</b> ${esc(r.prompt.slice(0, 70))}<span>${esc(r.status)}${r.endedAt ? ` · ${Math.round((r.endedAt - r.startedAt) / 1000)} с` : ''}</span>${r.status === 'running' ? `<button data-stop="${esc(r.id)}">стоп</button>` : ''}</summary><pre>${esc(r.tail || '')}</pre></details>`).join('')
      || '<div class="cap">запуски появятся здесь; каждый успешный заканчивается коммитом</div>';
  }
  async function startLive() {
    try {
      const sc = await fetch('scenario.json', { cache: 'no-store' }).then((r) => r.json());
      META = { questions: sc.questions, answers: sc.answers, phases: sc.phases, duration: sc.duration };
    } catch { /* live works without scenario */ }
    if (!TEAM) { try { SESSION = await fetch('/api/session').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }); document.getElementById('consoleHost').textContent = SESSION.serverHost; folderBar(); } catch { SERVERLESS = true; } }
    consolePane();
    if (SERVERLESS) await connectCard();
    if (introWanted) {
      $('inTitle').textContent = TEAM ? 'командный вид: рабочая папка спринта из git' : SERVERLESS ? 'живая папка: подключи свою папку' : 'живая папка: харнесс на этом компьютере';
      if (SERVERLESS && !TEAM) $('inPoints').innerHTML = '<li>на сайте папку можно выбрать прямо в браузере или перетащить из Finder: граф, поиск, правка файлов</li><li>агенты, Obsidian и коммиты – в полном режиме: <code>bin/open.sh</code> на своём компьютере, команды на следующем экране</li><li>командный вид – рабочая папка спринта из git, без установки</li>';
      if (TEAM) $('inPoints').innerHTML = '<li>граф собран из репозитория ai-mindset-org/marketing-harness-sprint и обновляется после каждого push</li><li>правка и агенты – у себя: клонируй репозиторий, bin/open.sh, коммит, push</li><li>клик по узлу открывает файл; ⌘K – поиск; пробел – заморозить картинку</li>';
      $('inGo').textContent = 'открыть граф →'; $('inEnd').hidden = true;
      $('intro').hidden = false; $('inGo').focus();
      $('inGo').onclick = () => introClose();
    }
    const hint = document.getElementById('liveHint');
    let started = null, fails = 0, liveSeen = new Set();
    async function poll() {
      if (LIVE_FROZEN || (SERVERLESS && !FSA && !TEAM)) { setTimeout(poll, 700); return; }
      try {
        const st = FSA ? await fsaState() : await fetch(TEAM ? 'team/state.json' : '/api/state', { cache: TEAM ? 'no-cache' : 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
        if (FSA) fsaBar(st);
        if (TEAM && st.git) { SESSION_T = st; teamBar(st); }
        fails = 0; hint.hidden = true;
        const h = st.harness || {};
        if (h.questions) META.questions = h.questions;
        if (h.answers) META.answers = h.answers;
        if (h.phases && h.phases.length) META.phases = h.phases;
        started = h.startedAt || started;
        const incoming = new Map(st.files.map((f) => [f.path, f]));
        const gone = [...S.files.keys()].filter((p) => !incoming.has(p));
        const fresh = st.files.filter((f) => !S.files.has(f.path));
        // rename = a path is gone and one with the same bare name appeared in the same folder
        for (const g of gone) {
          const dir = g.split('/').slice(0, -1).join('/');
          const match = fresh.find((f) => f.path.split('/').slice(0, -1).join('/') === dir && norm(bare(base(f.path))) === norm(bare(base(g))));
          if (match) { renameFile(g, match.path, match.content, true); fresh.splice(fresh.indexOf(match), 1); }
          else { S.files.delete(g); markDirty(); }
        }
        for (const f of st.files) { upsertFile(f.path, f.content, null, true); const x = S.files.get(f.path); if (x && x.mtime !== f.mtime) { x.mtime = f.mtime; markDirty(); } }
        if (JSON.stringify(h.lanes || {}) !== JSON.stringify(S.lanes)) { S.lanes = h.lanes || {}; markDirty(); }
        if (st.commits.length !== S.commits.length) { S.commits = st.commits; S.freshCommit = now(); markDirty(); }
        if (h.phase !== S.phase) { S.phase = h.phase; markDirty(); }
        // demo started with --stops waits at a phase until «продолжить»
        if (h.waiting && h.waiting !== stopOpen) {
          const fresh = [...S.files.keys()].filter((p) => !liveSeen.has(p));
          liveSeen = new Set(S.files.keys());
          showStop(h.waiting, fresh, () => post('/api/continue', { phase: h.waiting }));
        } else if (!h.waiting && stopOpen) closeStop(false);
        const runsSig = (list) => JSON.stringify(list.map((r) => [r.id, r.status, (r.tail || '').length]));
        if (runsSig(st.runs || []) !== runsSig(S.runs)) { S.runs = st.runs || []; markDirty(); }
        const last = (h.narration || []).slice(-1)[0];
        const runLive = S.runs.find((r) => r.status === 'running');
        const text = runLive ? `${runLive.runner} работает: ${runLive.prompt.slice(0, 90)}` : last?.text;
        if (text && text !== S.narr) { S.narr = text; S.narrTag = runLive ? 'агент' : (!h.phase || h.phase === 'done') ? 'готово' : `фаза ${h.phase.slice(1)}`; markDirty(); }
        S.answersShown = FSA ? 0 : (h.answersShown ?? META.questions.length);
        const cur = META.phases.findIndex((p) => p.id === S.phase);
        const progress = S.phase === 'done' || !h.phase ? 1 : cur < 0 ? 0 : (cur + 0.5) / META.phases.length;
        if (!h.phase) S.phase = 'done';
        document.getElementById('clock').textContent = TEAM ? `команда · ${st.name} · ${st.head || ''} · ${String(st.exported || '').slice(11, 16)} UTC` : FSA ? `папка в браузере · ${st.name}` : `live · ${started ? fmt(Date.now() - started) : '–'} · ${st.name}`;
        renderAll(progress);
      } catch (err) {
        if (++fails >= 2) {
          if (TEAM) { hint.hidden = false; hint.innerHTML = 'командный вид ещё не опубликован.<br>кто держит рабочую папку: <code>bin/publish-team.sh ~/harness/marketing-sprint</code><br>или открой <a href="?mode=replay">демо</a>.'; }
          else if (FSA) { hint.hidden = false; hint.textContent = 'папка недоступна: браузер отозвал доступ. нажми «другая папка» и выбери её снова.'; }
          else { SERVERLESS = true; connectCard(); }
        }
      }
      setTimeout(poll, TEAM ? 20000 : FSA ? 2000 : 700);
    }
    poll();
    setInterval(treeTick, 500);
    window.addEventListener('keydown', (e) => {
      if (stopOpen && (e.code === 'Enter' || (e.code === 'Space' && e.target.tagName !== 'TEXTAREA'))) { e.preventDefault(); closeStop(true); }
    });

    // console: model list follows the runner; Claude defaults to Opus
    const MODELS = {
      claude: [['opus', 'opus · по умолчанию'], ['sonnet', 'sonnet'], ['haiku', 'haiku']],
      codex: [['gpt-5.6-terra', 'terra · по умолчанию'], ['gpt-5.6-sol', 'sol · сложное'], ['gpt-5.6-luna', 'luna · короткое']],
    };
    const fillModels = () => { const list = MODELS[$('cRunner').value === 'claude' ? 'claude' : 'codex']; $('cModel').innerHTML = list.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); };
    $('cRunner').addEventListener('change', fillModels); fillModels();
    document.getElementById('consoleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = document.getElementById('cPrompt').value.trim();
      if (!prompt || !SESSION) return;
      const body = { runner: document.getElementById('cRunner').value, prompt, model: document.getElementById('cModel').value.trim() };
      const r = await fetch('/api/agent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-harness-token': SESSION.token }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ error: 'сеть' }));
      document.getElementById('cStatus').textContent = r.id ? `запущено: ${r.id}` : `ошибка: ${r.error}`;
    });
    document.getElementById('cPresets').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) document.getElementById('cPrompt').value = b.dataset.p; });
    document.getElementById('runs').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-stop]'); if (!b || !SESSION) return;
      e.preventDefault();
      await fetch(`/api/runs/${b.dataset.stop}/stop`, { method: 'POST', headers: { 'x-harness-token': SESSION.token } });
    });
  }

  // ---------- live sources: local server · folder picked in the browser · team json ----------
  let SERVERLESS = false; // no local server behind this page (content.aimindset.org)
  let FSA = null; // FileSystemDirectoryHandle of a folder picked in the browser
  const fsaCache = new Map();
  const FSA_SKIP = new Set(['.git', '.obsidian', '.claude', '.agents', '.harness', 'node_modules', '.trash']);
  const SHOW_RE = /\.(md|json|canvas|css|html|mjs)$/;
  async function fsaRead(fh, r, out) {
    const f = await fh.getFile();
    const c = fsaCache.get(r);
    if (c && c.mtime === f.lastModified && c.size === f.size) { out.push({ path: r, mtime: c.mtime, content: c.content }); return; }
    const content = (await f.text()).slice(0, 20000);
    fsaCache.set(r, { mtime: f.lastModified, size: f.size, content });
    out.push({ path: r, mtime: f.lastModified, content });
  }
  async function fsaWalk(dirH, rel, out) {
    for await (const [name, h] of dirH.entries()) {
      const r = rel ? `${rel}/${name}` : name;
      if (h.kind === 'directory') {
        if (name === '.githooks' && !rel) { await fsaWalk(h, r, out); continue; }
        if (name === '.claude' && !rel) { try { await fsaRead(await h.getFileHandle('settings.json'), `${r}/settings.json`, out); } catch { /* none */ } continue; }
        if (FSA_SKIP.has(name) || name.startsWith('.')) continue;
        await fsaWalk(h, r, out);
      } else if ((SHOW_RE.test(name) || rel === '.githooks') && (!name.startsWith('.') || name === '.mcp.json')) await fsaRead(h, r, out);
    }
    return out;
  }
  const fsaText = async (dirH, name) => (await (await dirH.getFileHandle(name)).getFile()).text();
  async function fsaGit() {
    const out = { commits: [], git: {} };
    try {
      const g = await FSA.getDirectoryHandle('.git');
      out.git.branch = (/ref: refs\/heads\/(.+)/.exec(await fsaText(g, 'HEAD')) || [])[1] || '';
      try { const u = (/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/.exec(await fsaText(g, 'config')) || [])[1]; if (u) out.git.remote = u.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, ''); } catch { /* no remote */ }
      try {
        const txt = await fsaText(await g.getDirectoryHandle('logs'), 'HEAD');
        out.commits = txt.trim().split('\n').map((l) => { const [meta, msg = ''] = l.split('\t'); return { hash: (meta.split(' ')[1] || '').slice(0, 7), msg }; })
          .filter((c) => /^commit/.test(c.msg)).map((c) => ({ hash: c.hash, msg: c.msg.replace(/^commit[^:]*: /, '') })).slice(-60);
      } catch { /* no reflog */ }
    } catch { /* not a git folder */ }
    return out;
  }
  async function fsaState() {
    const files = await fsaWalk(FSA, '', []);
    const g = await fsaGit();
    return { name: FSA.name, files, harness: {}, commits: g.commits, runs: [], git: g.git, now: Date.now() };
  }
  function fsaBar(st) {
    const g = st.git || {};
    $('fbPath').textContent = `${st.name} · папка в браузере`;
    $('fbGit').innerHTML = g.remote ? `git: ${esc(g.branch || '–')} → <a href="${esc(g.remote)}" target="_blank" rel="noopener">${esc(g.remote.replace(/^https:\/\/github\.com\//, 'github/'))}</a> · коммит – в терминале` : g.branch ? `git: ${esc(g.branch)} · коммит – в терминале` : 'без git: правки сохраняются в файлы';
  }
  // remember the picked folder between visits (IndexedDB keeps the handle; permission is asked again)
  const idb = (mode, fn) => new Promise((res) => {
    try {
      const r = indexedDB.open('marketing-harness', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('h');
      r.onsuccess = () => { try { const tx = r.result.transaction('h', mode); const q = fn(tx.objectStore('h')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => res(null); } catch { res(null); } };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  async function setFolder(h) {
    try { if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return; } catch { /* read-only is fine */ }
    FSA = h; fsaCache.clear(); reset(); nodeById.clear(); gFx.selectAll('*').remove(); markDirty();
    document.body.classList.add('fsa'); document.body.classList.remove('nosrc');
    $('connect').hidden = true; $('liveHint').hidden = true; $('empty').style.opacity = 0;
    idb('readwrite', (st) => st.put(h, 'last'));
    consolePane();
  }
  async function pickFolder() {
    if (!window.showDirectoryPicker) { $('fsaNote').textContent = 'этот браузер не открывает папки: Chrome, Arc или Edge, либо полный режим ниже'; return; }
    try { await setFolder(await window.showDirectoryPicker({ mode: 'readwrite', id: 'harness' })); } catch { /* cancelled */ }
  }
  async function connectCard() {
    $('connect').hidden = false; $('liveHint').hidden = true;
    if (!FSA) document.body.classList.add('nosrc');
    if (!window.showDirectoryPicker) $('fsaNote').textContent = 'в этом браузере выбор папки недоступен: Chrome, Arc, Edge';
    const last = await idb('readonly', (st) => st.get('last'));
    if (last && last.kind === 'directory') { $('resumeFolder').hidden = false; $('resumeFolder').textContent = `продолжить: ${last.name}`; $('resumeFolder').onclick = () => setFolder(last); }
  }
  $('pickFolder').onclick = pickFolder;
  if (qs.get('test') === '1') window.__mh = { setFolder }; // browser tests feed a fake folder handle
  $('pickAgain').onclick = pickFolder;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText($(b.dataset.copy).textContent.replace(/ /g, ' ')); b.textContent = 'скопировано'; b.classList.add('done'); setTimeout(() => { b.textContent = 'копировать'; b.classList.remove('done'); }, 1600); } catch { b.textContent = 'выдели и ⌘C'; }
  });
  // drop a folder from Finder onto the graph
  $('stage').addEventListener('dragover', (e) => { if (MODE === 'live' && !SESSION) { e.preventDefault(); $('stage').classList.add('drop'); } });
  $('stage').addEventListener('dragleave', () => $('stage').classList.remove('drop'));
  $('stage').addEventListener('drop', async (e) => {
    $('stage').classList.remove('drop');
    if (MODE !== 'live' || SESSION) return;
    e.preventDefault();
    const it = [...(e.dataTransfer.items || [])].find((x) => x.kind === 'file');
    if (it && it.getAsFileSystemHandle) { const h = await it.getAsFileSystemHandle(); if (h && h.kind === 'directory') setFolder(h); else $('fsaNote').textContent = 'перетащи папку целиком'; }
    else $('fsaNote').textContent = 'перетаскивание папок работает в Chrome, Arc и Edge';
  });
  async function fsaWrite(rel, content) {
    const parts = rel.split('/');
    let d = FSA;
    for (const seg of parts.slice(0, -1)) d = await d.getDirectoryHandle(seg, { create: true });
    const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
    await w.write(content); await w.close();
  }
  // new file in the current folder (local server or browser folder)
  $('newFileBtn').onclick = () => { $('newFile').hidden = !$('newFile').hidden; if (!$('newFile').hidden) $('nfPath').focus(); };
  $('newFile').addEventListener('submit', async (e) => {
    e.preventDefault();
    let rel = $('nfPath').value.trim().replace(/^\/+/, '');
    if (!rel || rel.includes('..') || rel.split('/').some((x) => x.startsWith('.'))) { $('nfPath').value = ''; $('nfPath').placeholder = 'путь внутри папки, без .. и скрытых'; return; }
    if (!/\.(md|json|css|html|mjs|canvas|txt)$/.test(rel)) rel += '.md';
    const name = bare(base(rel));
    const body = rel.endsWith('.md') ? `---\ntitle: ${name}\n---\n# ${name}\n\n` : '';
    if (FSA) await fsaWrite(rel, body);
    else if (SESSION) { const r = await post('/api/file', { path: rel, content: body }); if (!r.ok) { $('nfPath').value = ''; $('nfPath').placeholder = r.error || 'не создалось'; return; } }
    upsertFile(rel, body, null, true);
    $('newFile').hidden = true; $('nfPath').value = '';
    openPreview(rel); $('pvEdit').click();
  });
  // console tab: agents need the local server; elsewhere explain how and who pays
  function consolePane() {
    const off = !SESSION;
    $('consoleForm').hidden = off; $('runs').hidden = off; $('consoleOff').hidden = !off;
    if (!off) return;
    $('consoleOff').innerHTML = `<b>агенты запускаются на твоём компьютере</b>
      <p>эта страница открыта ${TEAM ? 'в командном виде' : FSA ? 'с папкой в браузере' : 'с сайта'}: у неё нет доступа к терминалу и ключам. консоль работает в полном режиме:</p>
      <div class="cmd"><code id="cmdOpen2">~/harness-engine/bin/open.sh ~/harness/marketing-sprint</code><button type="button" data-copy="cmdOpen2">копировать</button></div>
      <p class="cap">откроется localhost:4747 – эта же вкладка с выбором исполнителя и модели.</p>
      <b>исполнители и чем платишь</b>
      <table>
        <tr><td>claude · локально</td><td>твоя подписка Claude Pro или Max (или ключ API); модели opus · sonnet · haiku; запускается <code>claude -p</code> внутри папки</td></tr>
        <tr><td>codex · локально</td><td>подписка ChatGPT Plus, Pro или Business; модели terra · sol · luna</td></tr>
        <tr><td>сотник</td><td>Codex на сервере команды AI Mindset, подписка команды; нужен ssh-доступ к серверу (через Сашу Васильева); папка уезжает на сервер и возвращается каждые 4 секунды</td></tr>
      </table>
      <p class="cap">запуск агентов прямо с общего сайта требует отдельного сервиса с логинами и лимитами – он в планах; до него агенты живут локально или у Сотника.</p>`;
  }

  // ---------- search: ⌘K over files and phases ----------
  const QS = { list: [], i: 0 };
  function searchRun(q) {
    const t = q.trim().toLowerCase();
    const out = [];
    for (const f of S.files.values()) {
      const title = f.title.toLowerCase(), path = f.path.toLowerCase(), name = bare(base(f.path)).toLowerCase();
      let score = 0, hit = '';
      const aliases = String(f.fm.aliases || '').toLowerCase().replace(/[[\]"]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
      const ns = nameScore(t, name), ts = nameScore(t, title), as = Math.max(0, ...aliases.map((a) => nameScore(t, a) - 5));
      if (!t) score = 1;
      else if (Math.max(ns, ts, as) >= 60) score = Math.max(ns, ts, as);
      else if (String(f.fm.aliases || '').toLowerCase().includes(t)) score = 58;
      else if (path.includes(t)) score = 55;
      else if (ns || ts || as) score = Math.max(ns, ts, as);
      else {
        const k = (f.content || '').toLowerCase().indexOf(t);
        if (k >= 0) { score = 30; hit = f.content.slice(Math.max(0, k - 30), k + 70).replace(/\s+/g, ' '); }
      }
      if (score) out.push({ kind: 'file', p: f.path, glyph: LAYERS[f.layer].glyph, label: f.title, sub: f.path, hit, score });
    }
    META.phases.forEach((ph, i) => {
      const hay = `${ph.id} ${ph.title} ${ph.stop ? ph.stop.title + ' ' + ph.stop.lead : ''}`.toLowerCase();
      if (!t || hay.includes(t)) out.push({ kind: 'phase', i, glyph: '▸', label: `фаза ${ph.id.slice(1)} · ${ph.title}`, sub: ph.stop ? ph.stop.title : '', hit: '', score: t ? 70 : 0.5 });
    });
    QS.list = out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 40);
    QS.i = 0;
    searchPaint();
  }
  // filename first: exact · prefix · substring · all words · letters in order (typos, «лднг» → «лендинг»)
  function nameScore(t, name) {
    if (!t) return 0;
    if (name === t) return 130;
    if (name.startsWith(t)) return 115;
    const k = name.indexOf(t); if (k >= 0) return 100 - Math.min(20, k);
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every((w) => name.includes(w))) return 90;
    let i = 0, gaps = 0, last = -1;
    for (let j = 0; j < name.length && i < t.length; j++) if (name[j] === t[i]) { if (last >= 0) gaps += j - last - 1; last = j; i++; }
    return i === t.length && t.length >= 3 ? Math.max(35, 62 - gaps * 2) : 0;
  }
  const hl = (label, q) => { const t = q.trim().toLowerCase(); const k = t ? label.toLowerCase().indexOf(t) : -1; return k < 0 ? esc(label) : `${esc(label.slice(0, k))}<mark>${esc(label.slice(k, k + t.length))}</mark>${esc(label.slice(k + t.length))}`; };
  function searchPaint() {
    $('qres').innerHTML = QS.list.map((r, k) => `<li class="${k === QS.i ? 'on' : ''}" data-k="${k}"><span>${r.glyph}</span><span>${hl(r.kind === 'file' ? bare(base(r.p)) : r.label, $('q').value)}</span><small>${esc(r.kind === 'file' ? r.sub.split('/').slice(0, -1).join('/') || './' : 'карточка фазы')}</small>${r.hit ? `<span class="hit">…${esc(r.hit)}…</span>` : ''}</li>`).join('') || '<li><span></span><span>ничего не нашлось</span></li>';
    const on = $('qres').querySelector('li.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function searchPick(k) {
    const r = QS.list[k]; if (!r) return;
    searchClose();
    if (r.kind === 'file') openPreview(r.p);
    else if (jumpToPhase) jumpToPhase(r.i);
  }
  function searchOpen() { $('search').hidden = false; $('q').value = ''; searchRun(''); $('q').focus(); }
  function searchClose() { $('search').hidden = true; }
  $('searchBtn').onclick = searchOpen;
  $('q').addEventListener('input', (e) => searchRun(e.target.value));
  $('q').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); QS.i = Math.min(QS.list.length - 1, QS.i + 1); searchPaint(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); QS.i = Math.max(0, QS.i - 1); searchPaint(); }
    if (e.key === 'Enter') { e.preventDefault(); searchPick(QS.i); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); searchClose(); }
  });
  $('qres').addEventListener('click', (e) => { const li = e.target.closest('li[data-k]'); if (li) searchPick(Number(li.dataset.k)); });
  $('search').addEventListener('click', (e) => { if (e.target.id === 'search') searchClose(); });
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('search').hidden) searchOpen(); else searchClose(); return; }
    if (e.key === 'f' && !$('preview').hidden && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && PV.mode !== 'edit') $('pvFull').click();
  }, true);

  // ---------- space pauses everywhere; clicked buttons never keep focus ----------
  let LIVE_FROZEN = false;
  document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && e.detail > 0) b.blur(); });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || !$('search').hidden) return;
    if (MODE !== 'live' || !$('intro').hidden || stopOpen) return; // replay has its own handler; cards take space as «дальше»
    e.preventDefault();
    LIVE_FROZEN = !LIVE_FROZEN;
    $('narrTag').textContent = LIVE_FROZEN ? 'пауза' : 'сейчас';
    $('narrText').textContent = LIVE_FROZEN ? 'граф заморожен: папка меняется, картинка стоит. пробел – продолжить' : S.narr || '–';
  }, true);

  // ---------- Esc closes the top open layer: search · intro · phase card · new file · file panel ----------
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('search').hidden) searchClose();
    else if (!$('intro').hidden) introClose();
    else if (stopOpen) closeStop(false);
    else if (!$('newFile').hidden) $('newFile').hidden = true;
    else if (!$('preview').hidden) closePreview();
    else if (!$('connect').hidden && FSA) $('connect').hidden = true;
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);

  // ---------- intro: what this is, before the build starts ----------
  const introWanted = qs.get('intro') !== '0' && !qs.get('at') && !qs.get('phase');
  function introClose(go) { $('intro').hidden = true; if (go) go(); }

  // ---------- live folder bar: local path and its git remote ----------
  async function folderBar() {
    if (!SESSION) return;
    $('fbPath').textContent = SESSION.dir.replace(/^\/Users\/[^/]+/, '~');
    $('fbPath').title = SESSION.dir;
    const g = SESSION.git || {};
    $('fbGit').innerHTML = g.remote ? `git: ${esc(g.branch || 'main')} → <a href="${esc(g.remote)}" target="_blank" rel="noopener">${esc(g.remote.replace(/^https:\/\/github\.com\//, 'github/'))}</a>` : `git: ${esc(g.branch || '–')} · только локально (remote не задан)`;
  }
  $('openFinder').onclick = () => openIn('finder', '');
  let SESSION_T = null;
  function teamBar(st) {
    const g = st.git || {};
    $('fbPath').textContent = `${st.name} · общий вид`;
    $('fbGit').innerHTML = (g.remote ? `git: ${esc(g.branch || 'main')} → <a href="${esc(g.remote)}" target="_blank" rel="noopener">${esc(g.remote.replace(/^https:\/\/github\.com\//, 'github/'))}</a>` : 'git: –')
      + `<br><a href="team/${encodeURIComponent(st.name)}.zip" download>скачать папку zip</a> · <a data-copyval="gh repo clone ${esc((g.remote || '').replace(/^https:\/\/github\.com\//, ''))} ~/harness/${esc(st.name)}">копировать команду клонирования</a>`;
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-copyval]'); if (!a) return;
    try { await navigator.clipboard.writeText(a.dataset.copyval); a.textContent = 'скопировано'; } catch { a.textContent = a.dataset.copyval; }
  });

  resize();
  if (MODE === 'replay') startReplay(); else startLive();
})();

/* shared helpers of the document pages: kit docs, markdown, drawer */
window.HDOC = (() => {
  'use strict';
  // the open copy has no team state: Team links lead to the team's internal show
  if (/\.lab\.aimindset\.org$/.test(location.hostname)) document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('a[href*="mode=team"]').forEach((a) => { a.href = 'https://content.aimindset.org/marketing-harness/?mode=team'; a.title = 'Team: рабочая папка спринта – для команды AI Mindset, открывается во внутреннем показе'; }));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const norm = (s) => s.trim().replace(/\.md$/, '').toLowerCase();
  const base = (p) => p.split('/').pop().replace(/\.md$/, '');
  const bare = (s) => s.replace(/^\{[a-z-]+\}\s+/, '').replace(/\s+–\s+\d{4}-\d{2}-\d{2}$/, '');
  let DOCS = {};
  const index = new Map();
  async function load() {
    try { DOCS = (await fetch('kit-docs.json', { cache: 'no-store' }).then((r) => r.json())).docs || {}; } catch { DOCS = {}; }
    for (const p of Object.keys(DOCS)) { index.set(norm(p), p); index.set(norm(base(p)), p); if (!index.has(norm(bare(base(p))))) index.set(norm(bare(base(p))), p); }
    return DOCS;
  }
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (m, t, label) => {
        const hit = index.get(norm(unesc(t)));
        return hit ? `<a class="wl" data-doc="${esc(hit)}">${label || esc(bare(unesc(t)))}</a>` : `<a class="wl miss">${label || esc(bare(unesc(t)))}</a>`;
      })
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  const BLOCK = /^(#{1,3}\s|```|\s*[-*]\s|\s*\d+[.)]\s|\s*\||>|---+\s*$)/;
  function md(text) {
    let src = String(text || '').replace(/\r/g, '');
    let out = '';
    const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src);
    if (fm) src = src.slice(fm[0].length);
    const L = src.split('\n');
    let i = 0;
    const take = (re, strip) => { const it = []; while (i < L.length && re.test(L[i])) it.push(L[i++].replace(strip, '')); return it; };
    while (i < L.length) {
      const l = L[i];
      if (/^```/.test(l)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; out += `<pre><code>${esc(b.join('\n'))}</code></pre>`; continue; }
      const h = /^(#{1,3})\s+(.*)$/.exec(l);
      if (h) { out += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue; }
      if (/^\s*\|/.test(l)) {
        const rows = take(/^\s*\|/, /^$/);
        const sep = (r) => /^\s*\|[\s:|-]+\|?\s*$/.test(r);
        const head = rows.length > 1 && sep(rows[1]);
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        out += `<div class="tw"><table>${rows.filter((r) => !sep(r)).map((r, k) => `<tr>${cells(r).map((c) => (head && k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</table></div>`;
        continue;
      }
      if (/^\s*[-*]\s+/.test(l)) { out += `<ul>${take(/^\s*[-*]\s+/, /^\s*[-*]\s+/).map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`; continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { out += `<ol>${take(/^\s*\d+[.)]\s+/, /^\s*\d+[.)]\s+/).map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`; continue; }
      if (/^>/.test(l)) { out += `<blockquote>${take(/^>/, /^>\s?/).map(inline).join('<br>')}</blockquote>`; continue; }
      if (/^---+\s*$/.test(l)) { out += '<hr>'; i++; continue; }
      if (!l.trim()) { i++; continue; }
      const para = [l]; i++;
      while (i < L.length && L[i].trim() && !BLOCK.test(L[i])) para.push(L[i++]);
      out += `<p>${inline(para.join(' '))}</p>`;
    }
    return out;
  }
  function openDoc(p) {
    const d = document.getElementById('drawer');
    if (!DOCS[p]) return;
    d.querySelector('b').textContent = bare(base(p));
    d.querySelector('span').textContent = p;
    d.querySelector('.md').innerHTML = md(DOCS[p]);
    d.querySelector('.md').scrollTop = 0;
    d.hidden = false;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-doc]'); if (a) { e.preventDefault(); openDoc(a.dataset.doc); }
    if (e.target.closest('#drawer header button')) document.getElementById('drawer').hidden = true;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('drawer').hidden = true; });
  // ---------- ⌘K: page sections and kit documents ----------
  const box = document.createElement('div');
  box.id = 'search'; box.hidden = true;
  box.innerHTML = '<div class="box"><input id="q" autocomplete="off" spellcheck="false" placeholder="раздел страницы или файл набора…"><ol id="qres"></ol><div class="cap">↑↓ выбрать · Enter открыть · Esc закрыть</div></div>';
  document.body.appendChild(box);
  const QS = { list: [], i: 0 };
  function run(q) {
    const t = q.trim().toLowerCase();
    const out = [];
    document.querySelectorAll('section.panel > h2').forEach((h) => {
      const label = (h.querySelector('span') || h).textContent.replace(/\s+/g, ' ').trim();
      if (!t || label.toLowerCase().includes(t)) out.push({ kind: 'sec', el: h.parentElement, glyph: '§', label, sub: 'раздел', score: t ? 90 : 2 });
    });
    for (const [p, text] of Object.entries(DOCS)) {
      const label = bare(base(p)); const low = label.toLowerCase();
      let score = 0;
      if (!t) score = 1; else if (low.startsWith(t)) score = 100; else if (low.includes(t)) score = 80; else if (p.toLowerCase().includes(t)) score = 60; else if (text.toLowerCase().includes(t)) score = 30;
      if (score) out.push({ kind: 'doc', p, glyph: '▢', label, sub: p.split('/').slice(0, -1).join('/') || './', score });
    }
    QS.list = out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 40); QS.i = 0; paint();
  }
  function paint() {
    const ol = document.getElementById('qres');
    ol.innerHTML = QS.list.map((r, k) => `<li class="${k === QS.i ? 'on' : ''}" data-k="${k}"><span>${r.glyph}</span><span>${esc(r.label)}</span><small>${esc(r.sub)}</small></li>`).join('') || '<li><span></span><span>ничего не нашлось</span></li>';
    const on = ol.querySelector('li.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function pick(k) {
    const r = QS.list[k]; if (!r) return; close();
    if (r.kind === 'sec') r.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else openDoc(r.p);
  }
  function open() { box.hidden = false; const q = document.getElementById('q'); q.value = ''; run(''); q.focus(); }
  function close() { box.hidden = true; }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search]')) open();
    const li = e.target.closest('#qres li[data-k]'); if (li) pick(Number(li.dataset.k));
    if (e.target === box) close();
  });
  document.getElementById('q').addEventListener('input', (e) => run(e.target.value));
  document.getElementById('q').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); QS.i = Math.min(QS.list.length - 1, QS.i + 1); paint(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); QS.i = Math.max(0, QS.i - 1); paint(); }
    if (e.key === 'Enter') { e.preventDefault(); pick(QS.i); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  window.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (box.hidden) open(); else close(); } }, true);

  return { load, md, inline, esc, bare, base, openDoc, docs: () => DOCS, has: (p) => !!DOCS[p] };
})();

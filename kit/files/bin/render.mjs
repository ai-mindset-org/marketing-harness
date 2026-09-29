#!/usr/bin/env node
// Designer lane: markdown briefs → self-contained HTML in the field-instrument
// design system (design/assets/tokens.css). No model involved.
//   node bin/render.mjs carousel "outputs/carousel/{carousel} car-01 weekly loop.md"
//   node bin/render.mjs linkedin "outputs/linkedin/{post} li-01 fake winner.md"
//   node bin/render.mjs landing  "outputs/landing/{landing} harness kit.md"
//   node bin/render.mjs all [--pdf]      every brief in outputs/; --pdf needs Playwright
// Brief syntax: *word* → underlined key word, _word_ → serif italic accent.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tokens = fs.readFileSync(path.join(root, 'design/assets/tokens.css'), 'utf8');
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Lora:ital@1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const inline = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="key">$1</span>').replace(/(^|\s)_([^_]+)_/g, '$1<span class="it">$2</span>');
function frontmatter(t) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(t);
  const fm = {};
  if (m) m[1].split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); });
  return { fm, body: m ? t.slice(m[0].length) : t };
}
const page = (title, css, body, extraHead = '') => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${FONTS}<style>${tokens}\n${css}</style>${extraHead}</head><body>${body}</body></html>`;

// ---------- carousel: 1080×1350 slides, print = one slide per page ----------
function carousel(file) {
  const { fm, body } = frontmatter(fs.readFileSync(file, 'utf8'));
  const rows = body.split('\n').filter((l) => /^\|\s*\d+\s*\|/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const title = (/^#\s+(.+)/m.exec(body) || [])[1] || path.basename(file, '.md');
  const n = rows.length;
  const slides = rows.map(([num, text, visual], i) => {
    const dark = i === 0 || i === n - 1;
    const big = i === 0 || i === n - 1;
    return `<section class="slide ${dark ? 'night' : 'grid-bg'}">
  <header><span class="fig">fig. ${String(num).padStart(2, '0')}/${String(n).padStart(2, '0')} · <b>${esc(title.replace(/·.*$/, '').trim())}</b></span><span class="chip ${dark ? 'star' : ''}">${esc(fm.code || '')}</span></header>
  <div class="txt ${big ? 'big' : ''}">${inline(text)}</div>
  <footer><span class="label">${esc(visual || '')}</span><span class="label">AI Mindset · маркетинг-харнесс</span></footer>
</section>`;
  }).join('\n');
  const css = `@page{size:1080px 1350px;margin:0}
body{background:#d9d7cf;display:flex;flex-direction:column;align-items:center;gap:40px;padding:40px 0}
.slide{width:1080px;height:1350px;padding:72px;display:flex;flex-direction:column;justify-content:space-between;border:var(--frame);page-break-after:always;break-after:page}
.slide header,.slide footer{display:flex;justify-content:space-between;align-items:center;gap:24px}
.slide .fig{font-size:22px}.slide .chip{font-size:20px}.slide .label{font-size:16px}
.txt{font-weight:800;font-size:64px;line-height:1.06;letter-spacing:-.02em;max-width:900px}
.txt.big{font-size:92px}
.night .label{color:var(--cloud)} .night .chip{color:var(--ink)}
@media print{body{background:none;padding:0;gap:0}.slide{border:none}}
@media (max-width:1100px){.slide{transform:scale(.34);transform-origin:top center;margin-bottom:-890px}}`;
  return page(`${title} · карусель`, css, slides);
}

// ---------- LinkedIn preview: card with the fold at ~210 characters ----------
function linkedin(file) {
  const { fm, body } = frontmatter(fs.readFileSync(file, 'utf8'));
  const text = body.trim();
  const fold = 210;
  const cut = text.lastIndexOf(' ', fold);
  const head = text.slice(0, cut > 120 ? cut : fold);
  const len = text.replace(/\s+/g, ' ').length;
  const para = (s) => s.split(/\n{2,}/).map((p) => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`).join('');
  const css = `body{padding:48px 16px}
.wrap{max-width:560px;margin:0 auto;display:grid;gap:18px}
.card{background:#fff;border:var(--hairline);border-radius:10px;padding:18px 20px;font-family:system-ui,-apple-system,sans-serif;font-size:14.5px;line-height:1.5;color:#1d1d1d}
.who{display:flex;gap:10px;align-items:center;margin-bottom:12px}.ava{width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--paper);display:grid;place-content:center;font-family:var(--mono);font-size:14px}
.who b{display:block;font-size:14px}.who span{font-size:12px;color:#666}
.card p{margin:0 0 10px}.more{color:#666;cursor:pointer}.full{display:none}.card.open .full{display:block}.card.open .short{display:none}
.meta{display:flex;flex-wrap:wrap;gap:8px}`;
  const html = `<div class="wrap">
  <div class="fig">fig. LinkedIn · превью до публикации · <b>${esc(path.basename(file, '.md'))}</b></div>
  <div class="card" onclick="this.classList.toggle('open')">
    <div class="who"><div class="ava">AM</div><div><b>Автор поста</b><span>шапка профиля · 1 ч</span></div></div>
    <div class="short">${para(head)}<span class="more">…ещё</span></div>
    <div class="full">${para(text)}</div>
  </div>
  <div class="meta"><span class="chip">${esc(fm.code || 'без кода')}</span><span class="chip">${len} знаков · сгиб ${fold}</span><span class="chip ${Number(fm.score) >= 80 ? 'star' : ''}">судья ${esc(fm.score || '–')}</span><span class="chip">${esc(fm.status || 'draft')}</span></div>
  <div class="label">клик по карточке – развернуть · первые две строки решают, откроют ли пост</div>
</div>`;
  return page(`${path.basename(file, '.md')} · LinkedIn`, css, html);
}

// ---------- landing: instrument page with an onboarding quiz ----------
// Same language as the harness instrument: mono type, 1px frames, grid, layer
// glyphs, numbered panels, one red accent per screen.
function sections(body) {
  const out = {};
  let cur = null;
  for (const line of body.split('\n')) {
    const h = /^##\s+(.+)/.exec(line);
    if (h) { cur = h[1].trim().toLowerCase(); out[cur] = []; continue; }
    if (cur && line.trim()) out[cur].push(line.trim());
  }
  return out;
}
const items = (arr = []) => arr.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
const GLYPHS = ['■', '◇', '△', '○', '●', '✚', '▲', '☆'];
const MONO = '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">';
function landing(file) {
  const { fm, body } = frontmatter(fs.readFileSync(file, 'utf8'));
  const s = sections(body);
  const [headline = '', sub = ''] = s.hero || [];
  const meta = items(s.meta).map((m) => { const [k, ...v] = m.split(':'); return `<div class="row"><span>${esc(k)}</span><b>${esc(v.join(':').trim())}</b></div>`; }).join('');
  const figTitle = (s.fig || [])[0] || '';
  const steps = items(s.fig).map((x, i) => `<li><i>${GLYPHS[i % GLYPHS.length]}</i><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${inline(x)}</span></li>`).join('');
  const who = items(s['для кого']).map((x) => { const [k, ...v] = x.split(':'); return `<article><span class="tag">${esc(k)}</span><p>${inline(v.join(':').trim())}</p></article>`; }).join('');
  const take = items(s['что уносите']).map((x) => `<li>${inline(x)}</li>`).join('');
  const how = items(s['как проходит']).map((x, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${inline(x)}</span></li>`).join('');
  const quiz = items(s['квиз']).map((x) => x.split('|').map((p) => p.trim()));
  const faq = items(s.faq).map((x) => { const [q, a] = x.split('::'); return `<details><summary>${esc(q.trim())}</summary><p>${inline((a || '').trim())}</p></details>`; }).join('');
  const cta = (s.cta || [])[0] || 'записаться';
  const url = fm.cta_url || '#';
  const n = (k) => String(k).padStart(2, '0');
  const css = `:root{--bg:#fff;--ink:#0a0a0a;--soft:#dcdcdc;--hair:#ececec;--grid:#f1f1f1;--muted:#8a8a8a;--acc:#d7261e;--m:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
body{background:var(--bg);color:var(--ink);font-family:var(--m);font-size:14px;line-height:1.55}
.key{background:none;box-shadow:inset 0 -3px 0 var(--acc)}
.it{font-family:var(--m);font-style:normal;color:var(--acc)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
nav{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 0 12px;border-bottom:1px solid var(--ink)}
nav b{font-weight:800;letter-spacing:.06em}
.stamp{border:1px solid var(--ink);padding:3px 9px;font-size:12px;letter-spacing:.08em}
.lbl{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);border-bottom:1px dashed var(--soft);padding-bottom:6px;margin:0 0 14px}
.lbl em{font-style:normal;color:var(--ink);letter-spacing:.04em}
.hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:40px;align-items:end;padding:56px 0 40px}
h1{font-size:clamp(30px,4.6vw,54px);line-height:1.08;letter-spacing:-.035em;font-weight:800;margin:0;text-transform:lowercase}
.sub{margin:0 0 18px;font-size:14.5px}
.meta{border-top:1px solid var(--ink)}
.row{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px;padding:7px 0;border-bottom:1px dotted var(--soft)}
.row span{color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding-top:2px}
.row b{font-weight:500}
.panel{border:1px solid var(--ink);padding:12px 14px 16px;margin:0 0 28px;background:var(--bg)}
.fig{background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:32px 32px}
.fig h2{color:var(--ink);font-size:clamp(18px,2.4vw,26px);font-weight:700;letter-spacing:-.02em;margin:4px 0 18px;text-transform:lowercase}
.flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.flow li{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:10px 12px 12px;background:var(--bg);display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-content:start;position:relative}
.flow li i{font-style:normal;font-size:16px;line-height:1}
.flow li .n{color:var(--muted);font-size:11px;align-self:center}
.flow li span:last-child{grid-column:1 / -1;font-size:13px}
.flow li:not(:last-child)::after{content:"→";position:absolute;right:-7px;top:9px;background:var(--bg);color:var(--ink);font-size:12px;line-height:1;z-index:1}
.who{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.who article{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:12px 14px}
.who p{margin:10px 0 0}
.tag{display:inline-block;background:var(--ink);color:var(--bg);padding:2px 8px;font-size:11px;letter-spacing:.1em}
ul.take{list-style:none;margin:0;padding:0;columns:2;column-gap:32px}
ul.take li{break-inside:avoid;padding:6px 0 6px 20px;border-bottom:1px dotted var(--soft);position:relative}
ul.take li::before{content:"▢";position:absolute;left:0;color:var(--ink)}
ol.how{list-style:none;margin:0;padding:0}
ol.how li{display:grid;grid-template-columns:34px minmax(0,1fr);padding:7px 0;border-bottom:1px dotted var(--soft)}
ol.how .n{color:var(--muted)}
.quiz{border:1px solid var(--ink);padding:14px 16px;max-width:680px}
.quiz .cap{color:var(--muted);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.quiz .q{font-size:19px;font-weight:700;margin:6px 0 14px;letter-spacing:-.01em}
.quiz button{font:inherit;font-size:13px;color:var(--ink);background:var(--bg);border:1px solid var(--ink);padding:7px 12px;margin:0 6px 6px 0;cursor:pointer}
.quiz button:hover{background:var(--ink);color:var(--bg)}
.quiz .skip{border-color:var(--soft);color:var(--muted)}
.go{display:inline-block;background:var(--ink);color:var(--bg);padding:11px 18px;text-decoration:none;font-weight:500;border:1px solid var(--ink)}
.go:hover{background:var(--acc);border-color:var(--acc)}
details{border-bottom:1px dotted var(--soft);padding:9px 0}
summary{cursor:pointer;font-weight:500;list-style:none}
summary::before{content:"+ ";color:var(--muted)}
details[open] summary::before{content:"– "}
details p{margin:6px 0 0 16px;color:#333}
footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 0 28px;border-top:1px solid var(--ink);color:var(--muted);font-size:11.5px}
@media (max-width:760px){.wrap{padding:0 16px}.hero{grid-template-columns:minmax(0,1fr);gap:24px;padding:32px 0 28px}.who{grid-template-columns:minmax(0,1fr)}ul.take{columns:1}.flow li::after{display:none}.row{grid-template-columns:90px minmax(0,1fr)}}`;
  const html = `<div class="wrap">
<nav><b>AI MINDSET</b><span class="stamp">${esc(fm.code || '')}</span></nav>
<div class="hero"><div><div class="lbl"><span>01 · ${esc(fm.channel === 'landing' ? 'страница' : fm.channel || 'страница')}</span></div><h1>${inline(headline)}</h1></div><div><p class="sub">${inline(sub)}</p><div class="meta">${meta}</div></div></div>
<div class="panel fig"><div class="lbl"><span>fig. 1 · ${esc(figTitle)}</span><em>${n(items(s.fig).length)} шагов</em></div><h2>${inline(fm.fig_title || 'как устроено')}</h2><ol class="flow">${steps}</ol></div>
<div class="panel"><div class="lbl"><span>02 · для кого</span><em>${n(items(s['для кого']).length)}</em></div><div class="who">${who}</div></div>
<div class="panel"><div class="lbl"><span>03 · что уносите</span><em>${n(items(s['что уносите']).length)}</em></div><ul class="take">${take}</ul></div>
<div class="panel"><div class="lbl"><span>04 · как проходит</span></div><ol class="how">${how}</ol></div>
<div class="panel"><div class="lbl"><span>05 · три вопроса перед записью</span></div><div class="quiz" id="quiz"></div></div>
<div class="panel"><div class="lbl"><span>06 · вопросы</span></div>${faq}</div>
<footer><span>собрано харнессом · бриф ${esc(path.basename(file))}</span><span>код ${esc(fm.code || '')}</span></footer>
</div>
<script>
const Q=${JSON.stringify(quiz)};const base=${JSON.stringify(url)};const code=${JSON.stringify(fm.code || '')};const ans=[];
function show(i){const el=document.getElementById('quiz');
 if(i>=Q.length){const u=base+(base.includes('?')?'&':'?')+'utm_content='+encodeURIComponent(code+(ans.length?'-q'+ans.join(''):''));
  el.innerHTML='<div class="cap">готово · '+ans.length+' из '+Q.length+'</div><div class="q">${esc(cta)}</div><a class="go" href="'+u+'">${esc(cta)} →</a>';return;}
 const [q,...opts]=Q[i];el.innerHTML='<div class="cap">вопрос '+(i+1)+' / '+Q.length+'</div><div class="q">'+q+'</div>'+opts.map((o,k)=>'<button data-k="'+(k+1)+'">'+o+'</button>').join('')+'<button class="skip">пропустить</button>';
 el.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.k)ans.push(b.dataset.k);show(i+1);});}
show(0);
</script>`;
  return page(fm.title || 'лендинг', css, html, MONO);
}

// ---------- cli ----------
const out = (file, html) => { const p = file.replace(/\.md$/, '.html'); fs.writeFileSync(p, html); console.log(`→ ${path.relative(root, p)}`); return p; };
async function pdf(htmlPath) {
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch(); const pg = await b.newPage();
    await pg.goto(`file://${path.resolve(htmlPath)}`, { waitUntil: 'networkidle' });
    await pg.pdf({ path: htmlPath.replace(/\.html$/, '.pdf'), width: '1080px', height: '1350px', printBackground: true });
    await b.close(); console.log(`→ ${path.relative(root, htmlPath.replace(/\.html$/, '.pdf'))}`);
  } catch { console.log('PDF пропущен: нет Playwright (см. tools/{tool} playwright.md)'); }
}
const [mode = 'all', target] = process.argv.slice(2);
const list = (dir, re) => { try { return fs.readdirSync(path.join(root, dir)).filter((f) => re.test(f)).map((f) => path.join(root, dir, f)); } catch { return []; } };
const wantPdf = process.argv.includes('--pdf');
if (mode === 'carousel') { const p = out(target, carousel(target)); if (wantPdf) await pdf(p); }
else if (mode === 'linkedin') out(target, linkedin(target));
else if (mode === 'landing') out(target, landing(target));
else if (mode === 'all') {
  for (const f of list('outputs/carousel', /\.md$/)) { const p = out(f, carousel(f)); if (wantPdf) await pdf(p); }
  for (const f of list('outputs/linkedin', /^\{post\} li-.*\.md$/)) out(f, linkedin(f));
  for (const f of list('outputs/landing', /\.md$/)) out(f, landing(f));
} else { console.error('режимы: carousel <file> | linkedin <file> | landing <file> | all [--pdf]'); process.exit(2); }

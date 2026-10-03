import http from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const editable = new Set(['title', 'intro', 'ctaLabel']);
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const validSlug = (slug) => typeof slug === 'string' && /^[a-z0-9-]{1,64}$/.test(slug);
const pagePaths = (directory, slug) => slug === 'sample-course'
  ? { page: join(directory, 'page.json'), edits: join(directory, 'edits.jsonl') }
  : { page: join(directory, 'pages', `${slug}.json`), edits: join(directory, 'pages', `${slug}.edits.jsonl`) };

export async function loadPage(directory = root, slug = 'sample-course') {
  if (!validSlug(slug)) throw new Error('Invalid page slug');
  const paths = pagePaths(directory, slug);
  const page = JSON.parse(await readFile(paths.page, 'utf8'));
  if (page.slug !== slug) throw new Error('Page slug does not match its file');
  const shared = JSON.parse(await readFile(join(directory, 'shared.json'), 'utf8'));
  const events = (await readFile(paths.edits, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  for (const event of events) if (editable.has(event.field)) page[event.field] = event.value;
  return { page, shared, revision: events.length };
}

export function validateEdit(value) {
  return value && typeof value === 'object' && Object.keys(value).length === 3
    && editable.has(value.field)
    && Number.isInteger(value.revision) && value.revision >= 0
    && typeof value.value === 'string' && value.value.trim().length > 0 && value.value.length <= 500;
}

export function render({ page, shared, revision }) {
  const nav = shared.navigation.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('');
  const blocks = page.blocks.map((id) => {
    if (id === 'intro') return `<section id="intro"><p class="eyebrow">Учебная программа</p><h1>${escapeHtml(page.title)}</h1><p class="lead">${escapeHtml(page.intro)}</p></section>`;
    if (id === 'outcomes') return `<section id="outcomes"><h2>Что получится</h2><ul>${shared.outcomes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
    if (id === 'cta') return `<section id="cta" class="cta"><h2>Начните со своего проекта</h2><a class="button" href="#outcomes">${escapeHtml(page.ctaLabel)}</a></section>`;
    throw new Error(`Unknown block: ${id}`);
  }).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title)}</title><style>
  :root{font-family:system-ui,sans-serif;color:#1c2430;background:#f6f5f1}*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1.25rem 5vw;border-bottom:1px solid #d8d9d5}nav{display:flex;gap:1.25rem}a{color:inherit}main{max-width:920px;margin:auto;padding:0 5vw}section{padding:4rem 0;border-bottom:1px solid #d8d9d5}.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:.75rem}h1{font-size:clamp(2.8rem,8vw,6rem);line-height:.95;max-width:12ch;margin:.5rem 0 1.5rem}.lead{font-size:clamp(1.2rem,3vw,1.7rem);max-width:35ch}h2{font-size:clamp(1.7rem,4vw,2.4rem)}li{padding:.5rem 0}.button,button{display:inline-block;border:0;border-radius:999px;padding:.85rem 1.2rem;background:#1c2430;color:white;text-decoration:none;cursor:pointer}.cta{background:#e7ebdf;padding:2rem;border-radius:1.5rem;margin:3rem 0}aside{max-width:920px;margin:2rem auto;padding:1.5rem 5vw;border:1px dashed #858b89;border-radius:1rem}label{display:block;margin:.75rem 0 .25rem}input,textarea{width:100%;max-width:600px;font:inherit;padding:.75rem;border:1px solid #858b89;border-radius:.5rem}textarea{min-height:6rem}small{display:block;margin-top:.5rem}@media(max-width:600px){header{align-items:flex-start;flex-direction:column}nav{flex-wrap:wrap}section{padding:3rem 0}}
  </style></head><body><header><strong>${escapeHtml(shared.siteName)}</strong><nav aria-label="Разделы">${nav}</nav></header><main>${blocks}</main><aside><h2>Локальный редактор</h2><p>Правки сохраняются в журнале страницы.</p><form id="edit"><label for="field">Поле</label><select id="field"><option value="title">Заголовок</option><option value="intro">Введение</option><option value="ctaLabel">Кнопка</option></select><label for="value">Новый текст</label><textarea id="value" required maxlength="500"></textarea><p><button type="submit">Сохранить</button></p><small id="status">Ревизия ${revision}</small></form></aside><script>
  const endpoint='/api/edit?page='+encodeURIComponent(${JSON.stringify(page.slug)});
  const values=${JSON.stringify({ title: page.title, intro: page.intro, ctaLabel: page.ctaLabel }).replace(/</g, '\\u003c')};let revision=${revision};const field=document.querySelector('#field'),value=document.querySelector('#value'),status=document.querySelector('#status');function fill(){value.value=values[field.value]}field.addEventListener('change',fill);fill();document.querySelector('#edit').addEventListener('submit',async event=>{event.preventDefault();status.textContent='Сохраняем…';try{const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({field:field.value,value:value.value,revision})});if(!response.ok)throw new Error('Не сохранено: HTTP '+response.status);location.reload()}catch(error){status.textContent=error.message}});
  </script></body></html>`;
}

export function createServer(directory = root) {
  let saving = Promise.resolve();
  return http.createServer(async (request, response) => {
    const send = (status, body) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)); };
    const host = request.headers.host;
    if (!/^((localhost|127\.0\.0\.1)(:\d+)?)$/.test(host || '')) return send(403, { error: 'local_only' });
    const url = new URL(request.url, `http://${host}`);
    const slug = url.searchParams.get('page') || 'sample-course';
    if (!validSlug(slug)) return send(400, { error: 'invalid_page' });
    if (request.method === 'GET' && url.pathname === '/') {
      try { const html = render(await loadPage(directory, slug)); response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return response.end(html); }
      catch { return send(500, { error: 'render_failed' }); }
    }
    if (request.method !== 'POST' || url.pathname !== '/api/edit') return send(404, { error: 'not_found' });
    if (request.headers.origin && request.headers.origin !== `http://${host}`) return send(403, { error: 'origin_denied' });
    if (!request.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'json_required' });
    let raw = '';
    for await (const chunk of request) { raw += chunk; if (raw.length > 2048) return send(413, { error: 'too_large' }); }
    let edit; try { edit = JSON.parse(raw); } catch { return send(400, { error: 'invalid_json' }); }
    if (!validateEdit(edit)) return send(400, { error: 'invalid_edit' });
    const operation = saving.then(async () => {
      const current = await loadPage(directory, slug);
      if (edit.revision !== current.revision) return { status: 409, body: { error: 'revision_conflict', revision: current.revision } };
      const event = { id: randomUUID(), field: edit.field, value: edit.value, at: new Date().toISOString() };
      await appendFile(pagePaths(directory, slug).edits, `${JSON.stringify(event)}\n`, 'utf8');
      return { status: 200, body: { revision: current.revision + 1 } };
    });
    saving = operation.catch(() => {});
    try { const result = await operation; return send(result.status, result.body); }
    catch { return send(500, { error: 'save_failed' }); }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 8790);
  createServer().listen(port, '127.0.0.1', () => console.log(`Editable example: http://127.0.0.1:${port}/`));
}

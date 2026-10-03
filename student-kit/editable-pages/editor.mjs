import http from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const pageFields = ['kicker', 'title', 'intro', 'outcomesHeading', 'ctaTitle', 'ctaLabel'];
export const validSlug = (slug) => typeof slug === 'string' && /^[a-z0-9-]{1,64}$/.test(slug);
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function pagePaths(directory, slug) {
  return slug === 'sample-course'
    ? { page: join(directory, 'page.json'), legacy: null }
    : { page: join(directory, 'pages', `${slug}.json`), legacy: join(directory, 'pages', `${slug}.edits.jsonl`) };
}

async function readEvents(path) {
  try { return (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

export async function loadPage(directory = root, slug = 'sample-course') {
  if (!validSlug(slug)) throw new Error('Invalid page slug');
  const paths = pagePaths(directory, slug);
  let page = JSON.parse(await readFile(paths.page, 'utf8'));
  let shared = JSON.parse(await readFile(join(directory, 'shared.json'), 'utf8'));
  if (page.slug !== slug) throw new Error('Page slug does not match its file');
  for (const event of paths.legacy ? await readEvents(paths.legacy) : []) {
    if (pageFields.includes(event.field) && typeof event.value === 'string') page[event.field] = event.value;
  }
  const events = await readEvents(join(directory, 'edits.jsonl'));
  for (const event of events) {
    if (event.kind === 'overlay-v1') {
      if (event.shared) shared = event.shared;
      if (event.slug === slug && event.page) page = { ...page, ...event.page };
    } else if (slug === 'sample-course' && pageFields.includes(event.field) && typeof event.value === 'string') {
      page[event.field] = event.value;
    }
  }
  return { page, shared, revision: events.length };
}

function text(value, max = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
}

export function validateSnapshot(value, current) {
  if (!value || typeof value !== 'object' || !Number.isInteger(value.revision) || value.revision !== current.revision) return false;
  const page = value.page;
  const shared = value.shared;
  if (!page || !shared || Object.keys(page).sort().join('|') !== [...pageFields, 'blocks'].sort().join('|')) return false;
  if (Object.keys(shared).sort().join('|') !== ['siteName', 'navigation', 'outcomes'].sort().join('|')) return false;
  if (pageFields.some((field) => !text(page[field], field === 'title' ? 120 : 500))) return false;
  if (!Array.isArray(page.blocks) || page.blocks.length !== current.page.blocks.length || new Set(page.blocks).size !== page.blocks.length || page.blocks.some((id) => !current.page.blocks.includes(id))) return false;
  if (!text(shared.siteName, 80) || !Array.isArray(shared.navigation) || shared.navigation.length !== current.shared.navigation.length) return false;
  const expectedHrefs = current.shared.navigation.map((item) => item.href).sort().join('|');
  if (shared.navigation.some((item) => !item || Object.keys(item).sort().join('|') !== 'href|label' || !text(item.label, 80) || typeof item.href !== 'string')) return false;
  if (new Set(shared.navigation.map((item) => item.href)).size !== shared.navigation.length || shared.navigation.map((item) => item.href).sort().join('|') !== expectedHrefs) return false;
  const pageNavOrder = page.blocks.map((id) => `#${id}`).filter((href) => shared.navigation.some((item) => item.href === href));
  if (shared.navigation.map((item) => item.href).join('|') !== pageNavOrder.join('|')) return false;
  if (!Array.isArray(shared.outcomes) || shared.outcomes.length !== current.shared.outcomes.length || shared.outcomes.some((item) => !text(item, 200))) return false;
  return true;
}

export function render({ page, shared, revision }) {
  const nav = page.blocks.flatMap((id) => shared.navigation.filter((item) => item.href === `#${id}`)).map((item) => `<a href="${escapeHtml(item.href)}"><span data-edit-field="nav-label">${escapeHtml(item.label)}</span></a>`).join('');
  const blocks = page.blocks.map((id) => {
    if (id === 'intro') return `<section id="intro"><p class="eyebrow" data-edit-field="kicker">${escapeHtml(page.kicker)}</p><h1 data-edit-field="title">${escapeHtml(page.title)}</h1><p class="lead" data-edit-field="intro">${escapeHtml(page.intro)}</p></section>`;
    if (id === 'outcomes') return `<section id="outcomes"><h2 data-edit-field="outcomesHeading">${escapeHtml(page.outcomesHeading)}</h2><ul data-edit-slice-container>${shared.outcomes.map((item) => `<li data-edit-slice><span data-edit-field="outcome">${escapeHtml(item)}</span></li>`).join('')}</ul></section>`;
    if (id === 'cta') return `<section id="cta" class="cta"><h2 data-edit-field="ctaTitle">${escapeHtml(page.ctaTitle)}</h2><a class="button" href="#outcomes" data-edit-field="ctaLabel">${escapeHtml(page.ctaLabel)}</a></section>`;
    throw new Error(`Unknown block: ${id}`);
  }).join('');
  const config = JSON.stringify({ slug: page.slug, revision }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page.title)}</title><link rel="stylesheet" href="/overlay/site-edit-overlay-runtime.css"><style>
  :root{font-family:system-ui,sans-serif;color:#1c2430;background:#f6f5f1}*{box-sizing:border-box}body{margin:0;padding-bottom:90px}header{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1.25rem 5vw;border-bottom:1px solid #d8d9d5}nav{display:flex;gap:1.25rem}a{color:inherit}main{max-width:920px;margin:auto;padding:0 5vw}section{padding:4rem 0;border-bottom:1px solid #d8d9d5}.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:.75rem}h1{font-size:clamp(2.8rem,8vw,6rem);line-height:.95;max-width:12ch;margin:.5rem 0 1.5rem}.lead{font-size:clamp(1.2rem,3vw,1.7rem);max-width:35ch}h2{font-size:clamp(1.7rem,4vw,2.4rem)}li{padding:.5rem 0}.button{display:inline-block;border-radius:999px;padding:.85rem 1.2rem;background:#1c2430;color:white;text-decoration:none}.cta{background:#e7ebdf;padding:2rem;border-radius:1.5rem;margin:3rem 0}@media(max-width:600px){header{align-items:flex-start;flex-direction:column}nav{flex-wrap:wrap}section{padding:3rem 0}}
  </style></head><body><header><strong data-edit-field="siteName">${escapeHtml(shared.siteName)}</strong><nav aria-label="Разделы">${nav}</nav></header><main>${blocks}</main><script>window.SiteEditOverlayAutoConfig=false;window.StudentPageEditorConfig=${config};</script><script src="/overlay/site-edit-overlay-runtime.js"></script><script src="/overlay-adapter.js"></script></body></html>`;
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
      catch { return send(404, { error: 'page_not_found' }); }
    }
    const assets = { '/overlay/site-edit-overlay-runtime.js': ['overlay/site-edit-overlay-runtime.js', 'text/javascript'], '/overlay/site-edit-overlay-runtime.css': ['overlay/site-edit-overlay-runtime.css', 'text/css'], '/overlay-adapter.js': ['overlay-adapter.js', 'text/javascript'] };
    if (request.method === 'GET' && assets[url.pathname]) {
      const [path, type] = assets[url.pathname];
      try { const content = await readFile(join(root, path)); response.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' }); return response.end(content); }
      catch { return send(500, { error: 'asset_missing' }); }
    }
    if (request.method !== 'POST' || url.pathname !== '/api/edit') return send(404, { error: 'not_found' });
    if (request.headers.origin && request.headers.origin !== `http://${host}`) return send(403, { error: 'origin_denied' });
    if (!request.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'json_required' });
    let raw = '';
    for await (const chunk of request) { raw += chunk; if (Buffer.byteLength(raw) > 16000) return send(413, { error: 'too_large' }); }
    let snapshot; try { snapshot = JSON.parse(raw); } catch { return send(400, { error: 'invalid_json' }); }
    const operation = saving.then(async () => {
      const current = await loadPage(directory, slug);
      if (snapshot.revision !== current.revision) return { status: 409, body: { error: 'revision_conflict', revision: current.revision } };
      if (!validateSnapshot(snapshot, current)) return { status: 400, body: { error: 'invalid_snapshot' } };
      const event = { kind: 'overlay-v1', id: randomUUID(), slug, page: snapshot.page, shared: snapshot.shared, at: new Date().toISOString() };
      await appendFile(join(directory, 'edits.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');
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

import http from 'node:http';

const MAX_BODY = 4096;
const allowedFields = new Set(['id', 'name', 'contact', 'page', 'consent']);

export function validateLead(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).some((key) => !allowedFields.has(key))) return false;
  if (['name', 'contact', 'page'].some((key) => typeof value[key] === 'string' && /[\x00-\x1f\x7f]/.test(value[key]))) return false;
  return value.consent === true
    && typeof value.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 120
    && typeof value.contact === 'string' && value.contact.trim().length > 0 && value.contact.length <= 200
    && typeof value.page === 'string' && value.page.startsWith('/') && value.page.length <= 200;
}

export function formatLead(lead) {
  return `Новая заявка\nИмя: ${lead.name.trim()}\nКонтакт: ${lead.contact.trim()}\nСтраница: ${lead.page}\nID: ${lead.id}`;
}

export async function deliverLead(lead, config, fetcher = fetch) {
  if (!config.live) return { status: 'dry_run' };
  if (!config.token || !config.chatId) return { status: 'failed', reason: 'missing_config' };
  try {
    const response = await fetcher(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chatId, text: formatLead(lead) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (!response.ok || data.ok !== true || !data.result?.message_id) {
      return { status: 'failed', reason: 'telegram_rejected' };
    }
    return { status: 'delivered', messageId: data.result.message_id };
  } catch {
    return { status: 'failed', reason: 'telegram_unavailable' };
  }
}

export function createServer(config, fetcher = fetch) {
  const origin = config.allowedOrigin;
  return http.createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (request.url !== '/lead' || request.method !== 'POST') return send(404, { error: 'not_found' });
    if (!origin || request.headers.origin !== origin) return send(403, { error: 'origin_denied' });
    if (!request.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'json_required' });
    let raw = '';
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > MAX_BODY) return send(413, { error: 'body_too_large' });
    }
    let lead;
    try { lead = JSON.parse(raw); } catch { return send(400, { error: 'invalid_json' }); }
    if (!validateLead(lead)) return send(400, { error: 'invalid_lead' });
    const result = await deliverLead(lead, config, fetcher);
    if (result.status === 'failed') return send(502, result);
    return send(200, { id: lead.id, ...result });
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const config = {
    allowedOrigin: process.env.ALLOWED_ORIGIN,
    live: process.env.LIVE_SEND === '1',
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  };
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8787);
  createServer(config).listen(port, host, () => console.log(`Relay listening on ${host}:${port}; live=${config.live}`));
}

#!/usr/bin/env node
// MCP server (stdio) for the AI Mindset LMS public API v1 – read only.
// Token: personal access token in AIM_LMS_TOKEN (never stored in the folder).
//
//   MCP:  "lms": { "command": "node", "args": ["tools/mcp/lms.mjs"], "env": { "AIM_LMS_TOKEN": "${AIM_LMS_TOKEN}" } }
//   CLI:  node tools/mcp/lms.mjs cli health | me | sessions [lab] | session <id> | transcript <id> | chat <id>
//
// Transcripts and chats come with names hidden (redact_names=true) unless the token has pii:read
// and the caller asks otherwise.
import readline from 'node:readline';

const BASE = process.env.AIM_LMS_BASE || 'https://learn.aimindset.org';
const TOKEN = process.env.AIM_LMS_TOKEN || '';

async function api(path, { auth = true } = {}) {
  const headers = { accept: 'application/json' };
  if (auth) {
    if (!TOKEN) throw new Error('AIM_LMS_TOKEN не задан: создай персональный токен в кабинете LMS и добавь export AIM_LMS_TOKEN=… в ~/.zshrc');
    headers.authorization = `Bearer ${TOKEN}`;
  }
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`LMS ${res.status} ${path}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
}
const enc = encodeURIComponent;

const TOOLS = [
  { name: 'lms_health', description: 'Проверить, что API LMS отвечает. Без токена.', inputSchema: { type: 'object', properties: {} },
    run: () => api('/api/v1', { auth: false }) },
  { name: 'lms_me', description: 'Кто владелец токена, какие scopes и лабы доступны.', inputSchema: { type: 'object', properties: {} },
    run: () => api('/api/v1/me') },
  { name: 'lms_sessions', description: 'Список сессий (занятий) лабы. lab – канонический id лабы, например marketing, ain3, s26.',
    inputSchema: { type: 'object', properties: { lab: { type: 'string' }, limit: { type: 'number' } } },
    run: ({ lab, limit }) => api(`/api/v1/sessions?${lab ? `lab=${enc(lab)}&` : ''}limit=${Math.min(500, Number(limit) || 100)}`) },
  { name: 'lms_session', description: 'Детали одной сессии: название, дата, видео, длительность.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    run: ({ id }) => api(`/api/v1/sessions/${enc(id)}`) },
  { name: 'lms_transcript', description: 'Транскрипт сессии. Имена скрыты по умолчанию.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, redact_names: { type: 'boolean' } }, required: ['id'] },
    run: ({ id, redact_names = true }) => api(`/api/v1/sessions/${enc(id)}/transcript?redact_names=${redact_names === false ? 'false' : 'true'}`) },
  { name: 'lms_chat', description: 'Чат сессии. Имена скрыты по умолчанию.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, redact_names: { type: 'boolean' } }, required: ['id'] },
    run: ({ id, redact_names = true }) => api(`/api/v1/sessions/${enc(id)}/chat?redact_names=${redact_names === false ? 'false' : 'true'}`) },
];

const asText = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

// ---------- CLI ----------
if (process.argv[2] === 'cli') {
  const [cmd = 'health', arg] = process.argv.slice(3);
  const map = { health: 'lms_health', me: 'lms_me', sessions: 'lms_sessions', session: 'lms_session', transcript: 'lms_transcript', chat: 'lms_chat' };
  const tool = TOOLS.find((t) => t.name === map[cmd]);
  if (!tool) { console.error('команды: health | me | sessions [lab] | session <id> | transcript <id> | chat <id>'); process.exit(2); }
  tool.run(cmd === 'sessions' ? { lab: arg } : { id: arg })
    .then((r) => { console.log(asText(r)); })
    .catch((e) => { console.error(e.message); process.exit(1); });
} else {
  // ---------- MCP over stdio: newline-delimited JSON-RPC 2.0 ----------
  const send = (msg) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...msg })}\n`);
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', async (line) => {
    let req;
    try { req = JSON.parse(line); } catch { return; }
    const { id, method, params = {} } = req;
    if (id === undefined) return; // notifications need no answer
    try {
      if (method === 'initialize') {
        return send({ id, result: { protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'aim-lms', version: '1.0.0' } } });
      }
      if (method === 'ping') return send({ id, result: {} });
      if (method === 'tools/list') {
        return send({ id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
      }
      if (method === 'tools/call') {
        const tool = TOOLS.find((t) => t.name === params.name);
        if (!tool) return send({ id, error: { code: -32602, message: `unknown tool ${params.name}` } });
        try {
          const out = await tool.run(params.arguments || {});
          return send({ id, result: { content: [{ type: 'text', text: asText(out).slice(0, 200000) }] } });
        } catch (e) {
          return send({ id, result: { content: [{ type: 'text', text: e.message }], isError: true } });
        }
      }
      return send({ id, error: { code: -32601, message: `method ${method} not found` } });
    } catch (e) {
      return send({ id, error: { code: -32603, message: e.message } });
    }
  });
}

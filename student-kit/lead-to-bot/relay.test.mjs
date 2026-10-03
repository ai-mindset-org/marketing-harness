import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, deliverLead, validateLead } from './relay.mjs';

const lead = { id: 'sample-001', name: 'Student', contact: 'student@example.test', page: '/course', consent: true };

test('validates the bounded contract', () => {
  assert.equal(validateLead(lead), true);
  assert.equal(validateLead({ ...lead, consent: false }), false);
  assert.equal(validateLead({ ...lead, extra: 'x' }), false);
  assert.equal(validateLead({ ...lead, name: 'Student\nFake status' }), false);
});

test('dry run does not call Telegram', async () => {
  const result = await deliverLead(lead, { live: false }, () => { throw new Error('called'); });
  assert.equal(result.status, 'dry_run');
});

test('Telegram failure is reported as failure', async () => {
  const result = await deliverLead(lead, { live: true, token: 'example', chatId: '123' }, async () => ({ ok: false, json: async () => ({ ok: false }) }));
  assert.equal(result.status, 'failed');
});

test('HTTP endpoint rejects another origin and accepts a dry run', async () => {
  const server = createServer({ allowedOrigin: 'http://localhost:4173', live: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/lead`;
    const request = (origin) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(lead) });
    assert.equal((await request('http://other.test')).status, 403);
    const response = await request('http://localhost:4173');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'dry_run');
  } finally { server.close(); }
});

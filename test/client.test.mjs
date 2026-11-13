import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { ask } from '../skills/decisio-integrate/assets/client.mjs';

const body = { state: 'A ticket', questions: { queue: { type: 'choice', instructions: 'Which queue?', criteria: { billing: null, access: null } } } };
async function endpoint(t, reply) {
  const server = createServer(reply);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}
const good = { answers: { queue: { type: 'choice', choice: 'billing', probabilities: { billing: 0.8, access: 0.2 } } } };

test('sends the complete request to the decision route and returns its typed answer', async (t) => {
  let received;
  const baseUrl = await endpoint(t, async (req, res) => {
    assert.equal(req.url, '/v1/systemone');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['content-type'], 'application/json');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received = JSON.parse(Buffer.concat(chunks));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(good));
  });
  const result = await ask(body, { baseUrl });
  assert.deepEqual(received, body);
  assert.equal(result.answers.queue.choice, 'billing');
  assert.equal(result.answers.queue.certified, undefined);
});

test('reports an HTTP error before treating its body as an answer', async (t) => {
  const baseUrl = await endpoint(t, (_req, res) => { res.statusCode = 503; res.end('{"detail":"not ready"}'); });
  await assert.rejects(ask(body, { baseUrl }), /HTTP 503/);
});

test('bounds a stalled request with the configured timeout', async (t) => {
  const baseUrl = await endpoint(t, () => {});
  await assert.rejects(ask(body, { baseUrl, timeoutMs: 30 }), /timed out/);
});

test('rejects missing named answers before business code reads them', async (t) => {
  const baseUrl = await endpoint(t, (_req, res) => res.end('{"answers":{}}'));
  await assert.rejects(ask(body, { baseUrl }), /queue/);
});

test('rejects a selected key that was not offered', async (t) => {
  const baseUrl = await endpoint(t, (_req, res) => res.end(JSON.stringify({ answers: { queue: { type: 'choice', choice: 'refund', probabilities: { refund: 1 } } } })));
  await assert.rejects(ask(body, { baseUrl }), /queue/);
});

test('rejects invalid probability distributions', async (t) => {
  const baseUrl = await endpoint(t, (_req, res) => res.end(JSON.stringify({ answers: { queue: { type: 'choice', choice: 'billing', probabilities: { billing: 0.8, access: 0.8 } } } })));
  await assert.rejects(ask(body, { baseUrl }), /probabilit/);
});

test('accepts an explicitly uncertified answer without promoting it', async (t) => {
  const baseUrl = await endpoint(t, (_req, res) => res.end(JSON.stringify({ answers: { queue: { ...good.answers.queue, certified: false, certified_reason: 'below_threshold' } } })));
  const result = await ask(body, { baseUrl });
  assert.equal(result.answers.queue.certified, false);
});

for (const [name, question, answer] of [
  ['yes/no', { type: 'noul', instructions: 'Is it urgent?' }, { type: 'noul', noul: 0.6 }],
  ['score', { type: 'score', instructions: 'How severe?', criteria: ['Low', 'High'] }, { type: 'score', score: 0.7, probabilities: { '0': 0.3, '1': 0.7 } }],
]) {
  test(`reads a ${name} answer under its request name`, async (t) => {
    const baseUrl = await endpoint(t, (_req, res) => res.end(JSON.stringify({ answers: { check: answer } })));
    const result = await ask({ state: 'A ticket', questions: { check: question } }, { baseUrl });
    assert.deepEqual(result.answers.check, answer);
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../skills/decisio-integrate/assets/client.py', import.meta.url));
async function exercise(t, reply, request, timeout = '1000') {
  const root = fileURLToPath(new URL('../.test-work/', import.meta.url));
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'python-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'request.json');
  writeFileSync(file, JSON.stringify(request));
  const server = createServer(reply);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return run('python3', [script, file], { env: { ...process.env, DECISIO_BASE_URL: `http://127.0.0.1:${server.address().port}`, DECISIO_TIMEOUT_MS: timeout } });
}
const request = { state: 'A ticket', questions: { urgent: { type: 'noul', instructions: 'Is it urgent?' } } };

test('Python posts JSON and reads the named yes/no answer', async (t) => {
  const result = await exercise(t, (req, res) => {
    assert.equal(req.url, '/v1/systemone');
    assert.equal(req.method, 'POST');
    res.end('{"answers":{"urgent":{"type":"noul","noul":0.6,"certified":false}}}');
  }, request);
  assert.equal(JSON.parse(result.stdout).answers.urgent.noul, 0.6);
  assert.equal(JSON.parse(result.stdout).answers.urgent.certified, false);
});

test('Python reports HTTP errors', async (t) => {
  await assert.rejects(exercise(t, (_req, res) => { res.statusCode = 422; res.end('{"detail":"invalid"}'); }, request), (error) => error.code === 1 && /HTTP 422/.test(error.stderr));
});

test('Python times out instead of waiting without a bound', async (t) => {
  await assert.rejects(exercise(t, () => {}, request, '30'), (error) => error.code === 1 && /timed out/.test(error.stderr));
});

test('Python refuses a Boolean in place of a probability', async (t) => {
  await assert.rejects(exercise(t, (_req, res) => res.end('{"answers":{"urgent":{"type":"noul","noul":true}}}'), request), (error) => error.code === 1 && /Invalid yes\/no probability/.test(error.stderr));
});

test('Python stops a trickling response at the overall deadline', async (t) => {
  const started = performance.now();
  await assert.rejects(exercise(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const tick = setInterval(() => res.write(' '), 10);
    const finish = setTimeout(() => { clearInterval(tick); res.end('{"answers":{"urgent":{"type":"noul","noul":0.6}}}'); }, 600);
    res.on('close', () => { clearInterval(tick); clearTimeout(finish); });
  }, request, '80'), (error) => error.code === 1 && /timed out/.test(error.stderr));
  assert.ok(performance.now() - started < 500, 'client waited beyond the response budget');
});

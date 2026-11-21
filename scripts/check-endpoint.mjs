// The setup skill's own checks against a running decisio server: health, models and the bundled request.
// Usage: node scripts/check-endpoint.mjs http://127.0.0.1:8000
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const json = async (path, init) => {
  const r = await fetch(base + path, init);
  const body = await r.text();
  assert.ok(r.ok, `${path} answered ${r.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
};

const health = await json('/health');
assert.equal(health.ok, true, '/health is not ok');
const models = await json('/v1/models');
assert.ok(JSON.stringify(models).length > 2, '/v1/models is empty');

for (const skill of ['decisio-setup', 'decisio-request']) {
  const request = JSON.parse(readFileSync(`skills/${skill}/assets/request.json`, 'utf8'));
  const response = await json('/v1/systemone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  for (const [name, question] of Object.entries(request.questions)) {
    const answer = response.answers?.[name];
    assert.equal(answer?.type, question.type, `${skill}: no ${question.type} answer for "${name}"`);
    if (question.type === 'choice') {
      const options = Object.keys(question.criteria);
      assert.ok(options.includes(answer.choice), `${skill}: "${name}" chose ${answer.choice}, not one of its options`);
      assert.deepEqual(Object.keys(answer.probabilities).sort(), [...options].sort(), `${skill}: "${name}" has probabilities for other options`);
      const total = Object.values(answer.probabilities).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(total - 1) < 1e-3, `${skill}: "${name}" probabilities add up to ${total}`);
    }
  }
}
console.log(`endpoint: health, models and the bundled request answer as the skills expect (${base})`);

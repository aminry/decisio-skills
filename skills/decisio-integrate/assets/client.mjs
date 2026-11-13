// Copy into your backend and keep business actions in a separate policy function.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const probability = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function validate(body, result) {
  if (!body.questions || !Object.keys(body.questions).length) throw new Error('A request needs named questions');
  for (const [name, question] of Object.entries(body.questions)) {
    const answer = result?.answers?.[name];
    if (!answer || answer.type !== question.type) throw new Error(`Invalid or missing answer: ${name}`);
    if (question.type === 'noul') {
      if (!probability(answer.noul)) throw new Error(`Invalid yes/no probability: ${name}`);
      continue;
    }
    const probabilities = answer.probabilities;
    const keys = question.type === 'choice' ? Object.keys(question.criteria) : question.criteria.map((_, i) => String(i));
    if (!probabilities || Object.keys(probabilities).length !== keys.length || !keys.every((key) => probability(probabilities[key])) || Math.abs(Object.values(probabilities).reduce((a, b) => a + b, 0) - 1) > 1e-5) throw new Error(`Invalid probabilities: ${name}`);
    if (question.type === 'choice' && !Object.hasOwn(question.criteria, answer.choice)) throw new Error(`Invalid choice: ${name}`);
    if (question.type === 'score' && !(typeof answer.score === 'number' && Number.isFinite(answer.score) && answer.score >= 0 && answer.score <= keys.length - 1)) throw new Error(`Invalid score: ${name}`);
  }
  return result;
}

export async function ask(body, { baseUrl = process.env.DECISIO_BASE_URL ?? 'http://127.0.0.1:8000', timeoutMs = Number(process.env.DECISIO_TIMEOUT_MS ?? 10000) } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Set a positive integer timeout in milliseconds');
  const url = new URL(baseUrl.replace(/\/$/, '') + '/v1/systemone');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS endpoint');
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`decisio HTTP ${response.status}`);
    return validate(body, await response.json());
  } catch (error) {
    if (error.name === 'TimeoutError') throw new Error('decisio request timed out', { cause: error });
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await ask(JSON.parse(readFileSync(process.argv[2] ?? 'request.json', 'utf8'))), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

// The latest decisio on PyPI, which the skills install: it must be at or above the floor the skills rely on
// (minDecisio in package.json). Prints version=<x.y.z> for a GitHub Actions output.
import { readFileSync } from 'node:fs';

const floor = JSON.parse(readFileSync('package.json', 'utf8')).minDecisio;
const parts = (v) => v.split('.').map(Number);
const atLeast = (a, b) => { const [x, y] = [parts(a), parts(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };

const response = await fetch('https://pypi.org/pypi/decisio/json');
if (!response.ok) throw new Error(`PyPI answered ${response.status}`);
const latest = (await response.json()).info.version;
if (!/^\d+\.\d+\.\d+$/.test(latest)) throw new Error(`unexpected latest version ${latest}`);
if (!atLeast(latest, floor)) {
  console.error(`decisio ${latest} on PyPI is below the skills' floor ${floor}`);
  process.exit(1);
}
console.error(`decisio ${latest} on PyPI is at or above the skills' floor ${floor}`);
console.log(`version=${latest}`);

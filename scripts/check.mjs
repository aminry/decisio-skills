import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { names } from './install.mjs';

const problems = [];
for (const name of names) {
  const root = resolve('skills', name);
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const front = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? '';
  if (!front.includes(`name: ${name}\n`) || !/^description: .{25,}$/m.test(front)) problems.push(`${name}: invalid name or description`);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8');
    if (/TODO|\bTBD\b/.test(text)) problems.push(`${file}: unfinished content`);
    if (file.endsWith('.md')) for (const match of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      if (/^https?:/.test(match[1])) continue;
      const target = resolve(dirname(file), match[1]);
      if (!target.startsWith(root + '/') || !existsSync(target)) problems.push(`${file}: resource is missing or outside its skill: ${match[1]}`);
    }
  }
  const ui = readFileSync(join(root, 'agents/openai.yaml'), 'utf8');
  if (!ui.includes(`$${name}`)) problems.push(`${name}: prompt does not invoke this skill`);
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log('skills: three self-contained workflows, valid metadata and resource links');

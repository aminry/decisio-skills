import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
export const names = ['decisio-setup', 'decisio-request', 'decisio-integrate'];
const marker = '.decisio-skill.json';
const hash = (data) => createHash('sha256').update(data).digest('hex');
const isRelativeFile = (file) => typeof file === 'string' && file.length > 0 && !file.includes('\\') && file.split('/').every((p) => p && p !== '.' && p !== '..') && !file.includes(':');

function noSymlinks(base, file) {
  let path = base;
  for (const part of file.split('/')) {
    path = join(path, part);
    try { if (lstatSync(path).isSymbolicLink()) throw new Error(`Refusing symlink: ${path}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function filesIn(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Skill packages must contain regular files, not symlinks');
    return entry.isDirectory() ? filesIn(path, base) : [relative(base, path).split(sep).join('/')];
  });
}

function readManaged(target, name) {
  if (!existsSync(target)) return null;
  if (!existsSync(join(target, marker))) throw new Error(`${name} already exists and is not managed by this installer`);
  const record = JSON.parse(readFileSync(join(target, marker), 'utf8'));
  if (record.package !== 'decisio-skills' || record.name !== name || !record.files || typeof record.files !== 'object' || Array.isArray(record.files)) throw new Error(`Invalid install record for ${name}`);
  for (const [file, expected] of Object.entries(record.files)) {
    if (!isRelativeFile(file) || file === marker || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Invalid managed file in ${name}`);
    noSymlinks(target, file);
    if (existsSync(join(target, file)) && hash(readFileSync(join(target, file))) !== expected) throw new Error(`${name}/${file} was modified; preserve your changes before updating or uninstalling`);
  }
  return record;
}

function removeEmpty(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory()) removeEmpty(join(dir, entry.name));
  if (readdirSync(dir).length === 0) rmdirSync(dir);
}

/** Install or remove only the selected package's files, after checking every target. */
export function installSkills({ host, project = process.cwd(), scope = 'project', home = homedir(), skills = names, update = false, action = 'install' } = {}) {
  if (!['claude', 'codex'].includes(host)) throw new Error('Choose --host claude or --host codex');
  if (!['project', 'user'].includes(scope)) throw new Error('Choose --scope project or --scope user');
  if (!['install', 'uninstall'].includes(action)) throw new Error('Choose install or uninstall');
  if (!skills.length || skills.some((name) => !names.includes(name))) throw new Error('Unknown skill; choose a decisio skill from this package');
  const base = realpathSync(resolve(scope === 'user' ? home : project));
  const discovery = host === 'claude' ? '.claude/skills' : '.agents/skills';
  noSymlinks(base, discovery);
  const destination = join(base, discovery);
  const operations = [...new Set(skills)].map((name) => {
    noSymlinks(base, `${discovery}/${name}/${marker}`);
    const target = join(destination, name);
    const managed = readManaged(target, name);
    if (action === 'uninstall') return { name, target, managed };
    const source = join(root, 'skills', name);
    const files = Object.fromEntries(filesIn(source).map((file) => [file, hash(readFileSync(join(source, file)))]));
    for (const file of Object.keys(files)) {
      if (!isRelativeFile(file) || file === marker) throw new Error('Invalid package file');
      noSymlinks(target, file);
      if (managed && existsSync(join(target, file)) && !(file in managed.files)) throw new Error(`${name}/${file} already exists outside the managed package`);
    }
    const same = managed?.version === config.version && JSON.stringify(managed.files) === JSON.stringify(files);
    if (managed && !same && !update) throw new Error(`${name} is installed; use --update to replace the managed package`);
    return { name, source, target, files, managed, same };
  });

  return operations.map(({ name, source, target, files, managed, same }) => {
    if (action === 'uninstall') {
      if (!managed) return { name, status: 'absent', target };
      for (const file of Object.keys(managed.files)) if (existsSync(join(target, file))) unlinkSync(join(target, file));
      unlinkSync(join(target, marker));
      removeEmpty(target);
      return { name, status: 'removed', target };
    }
    if (same && Object.keys(files).every((file) => existsSync(join(target, file)))) return { name, status: 'already installed', target };
    mkdirSync(target, { recursive: true });
    for (const file of Object.keys(managed?.files ?? {})) if (!(file in files) && existsSync(join(target, file))) unlinkSync(join(target, file));
    for (const file of Object.keys(files)) {
      mkdirSync(dirname(join(target, file)), { recursive: true });
      writeFileSync(join(target, file), readFileSync(join(source, file)));
    }
    writeFileSync(join(target, marker), JSON.stringify({ package: 'decisio-skills', version: config.version, name, files }, null, 2) + '\n');
    return { name, status: managed ? 'updated' : 'installed', target };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      host: { type: 'string' }, project: { type: 'string' }, scope: { type: 'string', default: 'project' },
      skill: { type: 'string', multiple: true }, update: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
    } });
    if (values.help) {
      console.log('node scripts/install.mjs install|uninstall --host claude|codex [--project PATH] [--scope project|user] [--skill NAME] [--update]');
    } else {
      if (positionals.length > 1) throw new Error('Provide one action: install or uninstall');
      const result = installSkills({ ...values, skills: values.skill ?? names, action: positionals[0] ?? 'install' });
      for (const item of result) console.log(`${item.name}: ${item.status} at ${item.target}`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

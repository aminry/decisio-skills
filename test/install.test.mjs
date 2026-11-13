import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkills } from '../scripts/install.mjs';

function fixture(t) {
  const root = fileURLToPath(new URL('../.test-work/', import.meta.url));
  mkdirSync(root, { recursive: true });
  const project = mkdtempSync(join(root, 'project with spaces-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  return project;
}

test('installs self-contained skills into the selected host only', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  const target = join(project, '.agents/skills/decisio-request');
  assert.ok(readFileSync(join(target, 'SKILL.md'), 'utf8').includes('name: decisio-request'));
  assert.ok(existsSync(join(target, 'references/questions.md')));
  assert.equal(existsSync(join(project, '.claude')), false);
});

test('Claude installation uses its own discovery directory', (t) => {
  const project = fixture(t);
  installSkills({ host: 'claude', project, skills: ['decisio-setup'] });
  assert.ok(existsSync(join(project, '.claude/skills/decisio-setup/SKILL.md')));
  assert.equal(existsSync(join(project, '.agents')), false);
});

test('repeated installation is harmless and preserves user files', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  const extra = join(project, '.agents/skills/decisio-request/notes.txt');
  writeFileSync(extra, 'my notes');
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  assert.equal(readFileSync(extra, 'utf8'), 'my notes');
});

test('preflights collisions before installing any selected skill', (t) => {
  const project = fixture(t);
  mkdirSync(join(project, '.agents/skills/decisio-request'), { recursive: true });
  assert.throws(() => installSkills({ host: 'codex', project, skills: ['decisio-setup', 'decisio-request'] }), /already exists/);
  assert.equal(existsSync(join(project, '.agents/skills/decisio-setup')), false);
});

test('updates refuse local edits even when explicitly requested', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  const file = join(project, '.agents/skills/decisio-request/SKILL.md');
  writeFileSync(file, 'my customized instructions');
  assert.throws(() => installSkills({ host: 'codex', project, skills: ['decisio-request'], update: true }), /modified/);
  assert.equal(readFileSync(file, 'utf8'), 'my customized instructions');
});

test('uninstall removes only managed files, leaving notes and other skills', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request', 'decisio-setup'] });
  const extra = join(project, '.agents/skills/decisio-request/notes.txt');
  writeFileSync(extra, 'keep');
  installSkills({ host: 'codex', project, action: 'uninstall', skills: ['decisio-request'] });
  assert.equal(existsSync(join(project, '.agents/skills/decisio-request/SKILL.md')), false);
  assert.equal(readFileSync(extra, 'utf8'), 'keep');
  assert.ok(existsSync(join(project, '.agents/skills/decisio-setup/SKILL.md')));
});

test('rejects a symlinked discovery directory', (t) => {
  const project = fixture(t);
  const outside = join(project, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(project, '.agents'));
  assert.throws(() => installSkills({ host: 'codex', project }), /symlink/);
  assert.equal(existsSync(join(outside, 'skills')), false);
});

test('rejects traversal and unsupported host names', (t) => {
  const project = fixture(t);
  assert.throws(() => installSkills({ host: 'codex', project, skills: ['../outside'] }), /Unknown skill/);
  assert.throws(() => installSkills({ host: 'other', project }), /host/);
});

test('personal scope is explicit and stays in the selected home', (t) => {
  const project = fixture(t);
  const home = join(project, 'personal');
  mkdirSync(home);
  installSkills({ host: 'claude', project, scope: 'user', home, skills: ['decisio-integrate'] });
  assert.ok(existsSync(join(home, '.claude/skills/decisio-integrate/SKILL.md')));
  assert.equal(existsSync(join(project, '.claude')), false);
});

test('updates managed files while preserving extra files', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  const folder = join(project, '.agents/skills/decisio-request');
  const marker = join(folder, '.decisio-skill.json');
  const record = JSON.parse(readFileSync(marker, 'utf8'));
  record.version = '0.0.1';
  writeFileSync(marker, JSON.stringify(record));
  writeFileSync(join(folder, 'notes.txt'), 'keep');
  assert.throws(() => installSkills({ host: 'codex', project, skills: ['decisio-request'] }), /--update/);
  const result = installSkills({ host: 'codex', project, skills: ['decisio-request'], update: true });
  assert.equal(result[0].status, 'updated');
  assert.equal(readFileSync(join(folder, 'notes.txt'), 'utf8'), 'keep');
});

test('a forged ownership record cannot remove files outside its skill', (t) => {
  const project = fixture(t);
  installSkills({ host: 'codex', project, skills: ['decisio-request'] });
  const folder = join(project, '.agents/skills/decisio-request');
  const marker = join(folder, '.decisio-skill.json');
  const record = JSON.parse(readFileSync(marker, 'utf8'));
  record.files['../precious.txt'] = '0'.repeat(64);
  writeFileSync(marker, JSON.stringify(record));
  const precious = join(project, '.agents/skills/precious.txt');
  writeFileSync(precious, 'keep');
  assert.throws(() => installSkills({ host: 'codex', project, action: 'uninstall', skills: ['decisio-request'] }), /Invalid managed file/);
  assert.equal(readFileSync(precious, 'utf8'), 'keep');
});

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const updater = path.join(projectRoot, 'scripts', 'Update-SkillIndex.mjs');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'skill-index-fixture-'));
const root = path.join(fixture, 'skills');
const output = path.join(fixture, 'SKILL_INDEX.json');

async function skill(directory, content) {
  const target = path.join(root, directory);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'SKILL.md'), content, 'utf8');
}

async function refresh() {
  const { stdout } = await run(process.execPath, [updater, '--output', output, '--project-root', fixture, '--root', `fixture=${root}`]);
  return JSON.parse(stdout.trim());
}

try {
  await skill('alpha', '---\ndescription: Alpha description\n---\n# Alpha\n');
  await skill('beta', '# Beta\nBeta fallback description.\n');
  assert.deepEqual(await refresh(), { mode: 'incremental', added: 2, reparsed: 0, unchanged: 0, removed: 0 });
  assert.deepEqual(await refresh(), { mode: 'incremental', added: 0, reparsed: 0, unchanged: 2, removed: 0 });
  await rename(path.join(root, 'beta'), path.join(root, 'gamma'));
  assert.deepEqual(await refresh(), { mode: 'incremental', added: 1, reparsed: 0, unchanged: 1, removed: 1 });
  await rm(path.join(root, 'alpha'), { recursive: true });
  assert.deepEqual(await refresh(), { mode: 'incremental', added: 0, reparsed: 0, unchanged: 1, removed: 1 });
  const index = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(index.unique_skill_count, 1);
  assert.equal(index.skills[0].id, 'gamma');
  console.log('Update-SkillIndex fixture validation passed.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}

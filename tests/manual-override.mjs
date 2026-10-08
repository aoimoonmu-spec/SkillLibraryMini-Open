import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writer = path.join(root, 'skill', 'skill-library', 'scripts', 'apply-metadata.mjs');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'skill-library-manual-'));
const userData = path.join(fixture, 'user-data');
const skillDirectory = path.join(fixture, 'skills', 'alpha');
const skillFile = path.join(skillDirectory, 'SKILL.md');
const indexPath = path.join(fixture, 'SKILL_INDEX.json');
const inputPath = path.join(fixture, 'analysis.json');

try {
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(skillFile, '# Alpha\n', 'utf8');
  await writeFile(indexPath, JSON.stringify({ skills: [{ id: 'alpha', name: 'alpha', paths: [{ skill_md: skillFile }] }] }), 'utf8');
  await mkdir(userData, { recursive: true });
  await writeFile(path.join(userData, 'skill-metadata.json'), JSON.stringify({ version: 1, entries: {
    alpha: { chineseName: { value: '人工中文名', manualOverride: true }, oneLineSummary: { value: '旧简介', manualOverride: false } },
  } }), 'utf8');
  await writeFile(path.join(userData, 'skill-analysis-queue.json'), JSON.stringify({ version: 1, items: [{ skillId: 'alpha' }] }), 'utf8');
  await writeFile(inputPath, JSON.stringify({ entries: [{ originalName: 'alpha', chineseName: 'AI 中文名', oneLineSummary: 'AI 新简介', primaryCategory: 'engineering', tags: ['test'], capabilities: [], suitableFor: [], notSuitableFor: [], dependencies: 'unknown', platform: 'unknown', source: 'unknown', relationshipHints: 'unknown' }] }), 'utf8');
  await run(process.execPath, [writer, '--input', inputPath], { env: { ...process.env, SKILL_LIBRARY_USER_DATA_DIR: userData, SKILL_INDEX_PATH: indexPath } });
  const metadata = JSON.parse(await readFile(path.join(userData, 'skill-metadata.json'), 'utf8'));
  const queue = JSON.parse(await readFile(path.join(userData, 'skill-analysis-queue.json'), 'utf8'));
  assert.deepEqual(metadata.entries.alpha.chineseName, { value: '人工中文名', manualOverride: true });
  assert.equal(metadata.entries.alpha.oneLineSummary.value, 'AI 新简介');
  assert.equal(queue.items.length, 0);
  console.log('Field-level manualOverride validation passed.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}

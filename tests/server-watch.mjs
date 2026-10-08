import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'skill-library-watch-'));
const codexHome = path.join(fixture, 'codex-home');
const agentsHome = path.join(fixture, 'agents-home');
const projectRoot = path.join(fixture, 'project');
const temporaryUserData = path.join(fixture, 'user-data');
const temporaryProgramData = path.join(fixture, 'program-data');

async function writeSkill(home, name, description) {
  const directory = path.join(home, 'skills', name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'SKILL.md'), `---\ndescription: ${description}\n---\n# ${name}\n`, 'utf8');
}

async function waitFor(check, label) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

await writeSkill(codexHome, 'alpha', 'Alpha initial description.');
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    SKILL_LIBRARY_PORT: '0', SKILL_LIBRARY_CODEX_HOME: codexHome, SKILL_LIBRARY_AGENTS_HOME: agentsHome,
    SKILL_LIBRARY_PROJECT_ROOT: projectRoot, SKILL_LIBRARY_USER_DATA_DIR: temporaryUserData,
    SKILL_LIBRARY_PROGRAM_DATA_ROOT: temporaryProgramData, SKILL_LIBRARY_WATCH_DEBOUNCE_MS: '250', SKILL_LIBRARY_WATCH_ROOT_POLL_MS: '250',
  },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let started = false;

try {
  const address = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server startup timed out.')), 15_000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/Skill Library Mini: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { started = true; clearTimeout(timer); resolve(match[1]); }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.once('error', reject);
    child.once('exit', (code) => { if (!started) reject(new Error(`Server stopped before startup: ${code}`)); });
  });
  const api = async (pathname) => fetch(`${address}${pathname}`).then(async (response) => {
    if (!response.ok) throw new Error(`${pathname}: ${response.status}`);
    return response.json();
  });
  const initial = await api('/api/skills');
  assert.deepEqual(initial.skills.map((skill) => skill.id), ['alpha']);
  assert.equal(initial.analysisQueue.items[0]?.skillId, 'alpha');
  const alphaHash = initial.analysisQueue.items[0].contentHash;
  await writeFile(path.join(temporaryUserData, 'skill-metadata.json'), JSON.stringify({ version: 1, entries: { alpha: { lastAnalyzedHash: alphaHash } } }), 'utf8');
  assert.equal((await api('/api/skills')).analysisQueue.items.length, 0);

  const initialVersion = (await api('/api/version')).version;
  await writeSkill(codexHome, 'beta', 'Beta added after startup.');
  await waitFor(async () => {
    const data = await api('/api/skills');
    return data.libraryVersion > initialVersion && data.skills.some((skill) => skill.id === 'beta');
  }, 'new Skill discovery');
  const afterAdd = await api('/api/skills');
  assert.ok(afterAdd.analysisQueue.items.some((item) => item.skillId === 'beta' && item.reason === 'new'));

  const versionAfterAdd = afterAdd.libraryVersion;
  await writeSkill(codexHome, 'alpha', 'Alpha changed after analysis.');
  await waitFor(async () => {
    const data = await api('/api/skills');
    return data.libraryVersion > versionAfterAdd && data.analysisQueue.items.some((item) => item.skillId === 'alpha' && item.reason === 'changed');
  }, 'modified Skill requeue');

  const versionAfterChange = (await api('/api/version')).version;
  await rm(path.join(codexHome, 'skills', 'beta'), { recursive: true, force: true });
  await waitFor(async () => {
    const data = await api('/api/skills');
    return data.libraryVersion > versionAfterChange && !data.skills.some((skill) => skill.id === 'beta');
  }, 'deleted Skill removal');
  const persisted = JSON.parse(await readFile(path.join(codexHome, 'SKILL_INDEX.json'), 'utf8'));
  assert.equal(persisted.unique_skill_count, 1);
  console.log(JSON.stringify({ server: 'passed', startupScan: true, watcherAdd: true, watcherChange: true, watcherDelete: true }));
} finally {
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
  await rm(fixture, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'skill-library-shutdown-'));
const codexHome = path.join(fixture, 'codex-home');
const skillDir = path.join(codexHome, 'skills', 'alpha');

try {
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '# Alpha\n', 'utf8');
  Object.assign(process.env, {
    SKILL_LIBRARY_PORT: '0', SKILL_LIBRARY_CODEX_HOME: codexHome,
    SKILL_LIBRARY_AGENTS_HOME: path.join(fixture, 'agents-home'), SKILL_LIBRARY_PROJECT_ROOT: path.join(fixture, 'project'),
    SKILL_LIBRARY_USER_DATA_DIR: path.join(fixture, 'user-data'), SKILL_LIBRARY_PROGRAM_DATA_ROOT: path.join(fixture, 'program-data'),
    SKILL_LIBRARY_WATCH_ROOT_POLL_MS: '250',
  });
  const { startServer, stopServer } = await import(`${pathToFileURL(path.join(root, 'server.mjs')).href}?shutdown-test=${Date.now()}`);
  const address = await startServer();
  assert.equal((await fetch(`${address}/api/health`).then((response) => response.json())).ok, true);
  await stopServer();
  await assert.rejects(fetch(`${address}/api/health`));
  console.log('Server watcher shutdown validation passed.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryUserData = await mkdtemp(path.join(os.tmpdir(), 'skill-library-user-data-'));
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: { ...process.env, SKILL_LIBRARY_PORT: '0', SKILL_LIBRARY_USER_DATA_DIR: temporaryUserData },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
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
  const skills = await fetch(`${address}/api/skills`).then((response) => response.json());
  assert.ok(skills.skills.length > 0);
  assert.equal(skills.categories.length, 12);
  assert.ok(Array.isArray((await fetch(`${address}/api/packs`).then((response) => response.json())).packs));
  const targetSkill = skills.skills[0].id;
  const state = { ...skills.state, favorites: [...new Set([...(skills.state.favorites || []), targetSkill])] };
  const saved = await fetch(`${address}/api/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) }).then((response) => response.json());
  assert.ok(saved.favorites.includes(targetSkill));
  const diskState = JSON.parse(await readFile(path.join(temporaryUserData, 'user-state.json'), 'utf8'));
  assert.ok(diskState.favorites.includes(targetSkill));
  console.log(JSON.stringify({ server: 'passed', skills: skills.skills.length, categories: skills.categories.length, userData: temporaryUserData }));
} finally {
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
  await rm(temporaryUserData, { recursive: true, force: true });
}

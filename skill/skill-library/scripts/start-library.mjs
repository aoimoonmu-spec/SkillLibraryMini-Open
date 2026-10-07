import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const userData = process.env.SKILL_LIBRARY_USER_DATA_DIR || (process.platform === 'win32'
  ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'SkillLibraryMini')
  : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'SkillLibraryMini')
  : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'SkillLibraryMini'));
const indexPath = process.env.SKILL_INDEX_PATH || path.join(userData, 'skill-index.json');
const env = { ...process.env, SKILL_LIBRARY_PORT: '0', SKILL_LIBRARY_USER_DATA_DIR: userData, SKILL_INDEX_PATH: indexPath, SKILL_INDEX_UPDATER: path.join(root, 'scripts', 'update-index.mjs'), SKILL_LIBRARY_PROGRAM_DATA_ROOT: path.join(root, 'data') };
const run = (file, args = [], options = {}) => spawn(process.execPath, [file, ...args], { cwd: root, env, stdio: options.stdio || 'inherit' });
const updater = run(path.join(root, 'scripts', 'update-index.mjs'), ['--output', indexPath, '--project-root', process.cwd()]);
const open = (url) => { const command = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]; const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore', windowsHide: true }); child.unref(); };
const healthy = (url) => new Promise((resolve) => get(`${url}/api/health`, (response) => resolve(response.statusCode === 200)).on('error', () => resolve(false)));
updater.once('exit', (code) => {
  if (code !== 0) { process.exitCode = code || 1; return; }
  const server = run(path.join(root, 'server', 'server.mjs'), [], { stdio: ['ignore', 'pipe', 'inherit'] }); let output = '';
  server.stdout.on('data', async (chunk) => { output += chunk; const address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]; if (address && await healthy(address)) { console.log(`Skill Library Mini 已就绪：${address}`); open(address); server.stdout.removeAllListeners('data'); server.stdout.pipe(process.stdout); } });
});

const { app, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

let window;
let server;
const smoke = process.env.SKILL_LIBRARY_SMOKE === '1';

const runtimeRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'skill-library')
  : path.join(__dirname, 'runtime');
const icon = path.join(runtimeRoot, 'assets', 'SkillLibraryMini.ico');

function stopServer() {
  if (server && !server.killed) server.kill();
  server = undefined;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverFile = path.join(runtimeRoot, 'server.mjs');
    let output = '';
    const timeout = setTimeout(() => {
      stopServer();
      reject(new Error('Skill Library Mini server did not start within 15 seconds.'));
    }, 15_000);
    server = spawn(process.execPath, [serverFile], {
      cwd: runtimeRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        SKILL_LIBRARY_PORT: '0',
        SKILL_LIBRARY_CODEX_HOME: path.join(os.homedir(), '.codex'),
        SKILL_LIBRARY_PROGRAM_DATA_ROOT: path.join(runtimeRoot, 'data'),
        SKILL_LIBRARY_USER_DATA_DIR: path.join(app.getPath('appData'), 'SkillLibraryMini'),
      },
    });
    server.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/Skill Library Mini: (http:\/\/127\.0\.0\.1:\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    server.stderr.on('data', (chunk) => console.error(`[skill-library-server] ${chunk}`));
    server.once('error', (error) => { clearTimeout(timeout); reject(error); });
    server.once('exit', (code) => {
      if (!output.includes('Skill Library Mini:')) {
        clearTimeout(timeout);
        reject(new Error(`Skill Library Mini server exited before startup (${code}).`));
      }
    });
  });
}

async function openWindow() {
  const address = await startServer();
  window = new BrowserWindow({
    width: 1360, height: 900, minWidth: 980, minHeight: 680,
    title: 'Skill Library Mini', icon, show: false, backgroundColor: '#f4f5f8',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  await window.loadURL(address);
  if (smoke) {
    const health = await fetch(`${address}/api/health`).then((response) => response.json());
    const library = await fetch(`${address}/api/skills`).then((response) => response.json());
    if (!health.ok || !Array.isArray(library.skills)) throw new Error('Desktop smoke API check failed.');
    console.log(JSON.stringify({ desktop: 'passed', skills: library.skills.length, categories: library.categories?.length ?? 0 }));
    return app.quit();
  }
  window.once('ready-to-show', () => window.show());
}

app.setAppUserModelId('com.skilllibrarymini.app');
app.whenReady().then(openWindow).catch((error) => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', stopServer);
app.on('will-quit', stopServer);

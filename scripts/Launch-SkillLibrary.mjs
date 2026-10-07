#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = path.join(root, 'server.mjs');
const port = Number(process.env.SKILL_LIBRARY_PORT || 32147);
const address = `http://127.0.0.1:${port}`;

try {
  const health = await fetch(`${address}/api/health`, { signal: AbortSignal.timeout(2_000) });
  if (health.ok) {
    const commands = { win32: ['rundll32.exe', ['url.dll,FileProtocolHandler', address]], darwin: ['open', [address]], linux: ['xdg-open', [address]] };
    const command = commands[process.platform];
    if (command) spawn(command[0], command[1], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    process.exit(0);
  }
} catch { /* Server is not running; start it below. */ }

spawn(process.execPath, [server, '--open'], { cwd: root, detached: true, stdio: 'ignore', windowsHide: true }).unref();

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const runtime = path.join(root, 'desktop', 'electron', 'runtime');

await rm(runtime, { recursive: true, force: true });
await mkdir(path.join(runtime, 'data'), { recursive: true });
await Promise.all([
  cp(path.join(root, 'app'), path.join(runtime, 'app'), { recursive: true }),
  cp(path.join(root, 'server.mjs'), path.join(runtime, 'server.mjs')),
  cp(path.join(root, 'scripts', 'Update-SkillIndex.mjs'), path.join(runtime, 'scripts', 'Update-SkillIndex.mjs')),
  cp(path.join(root, 'app', 'assets', 'SkillLibraryMini.ico'), path.join(runtime, 'assets', 'SkillLibraryMini.ico')),
]);

const packs = JSON.parse(await readFile(path.join(root, 'data', 'skill-packs.json'), 'utf8'));
const safePacks = {
  version: packs.version,
  packs: (packs.packs || []).map(({ historyEvidence, ...pack }) => ({
    ...pack,
    evidence: (pack.evidence || []).filter((item) => !/历史|聊天|C:\\Users/i.test(item)),
  })),
};
await writeFile(path.join(runtime, 'data', 'skill-packs.json'), JSON.stringify(safePacks, null, 2), 'utf8');
for (const name of ['source-graph.json', 'repo-cache.json', 'repo-version-cache.json']) {
  await writeFile(path.join(runtime, 'data', name), name === 'source-graph.json' ? '{"records":[]}' : name === 'repo-cache.json' ? '{"entries":[]}' : '{"skillVersions":{},"repos":[]}', 'utf8');
}
console.log(`Prepared clean runtime: ${runtime}`);

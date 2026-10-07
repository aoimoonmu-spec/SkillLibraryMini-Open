#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2); const inputPath = args[args.indexOf('--input') + 1];
if (!inputPath) throw new Error('需要 --input <metadata.json>。');
const userData = process.env.SKILL_LIBRARY_USER_DATA_DIR || (process.platform === 'win32' ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'SkillLibraryMini') : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'SkillLibraryMini') : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'SkillLibraryMini'));
const indexPath = process.env.SKILL_INDEX_PATH || path.join(userData, 'skill-index.json'); const metadataPath = path.join(userData, 'skill-metadata.json'); const relationsPath = path.join(userData, 'skill-relations.json'); const queuePath = path.join(userData, 'skill-analysis-queue.json');
const readJson = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; } };
const writeJson = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(tmp, file); };
const mutable = ['chineseName', 'oneLineSummary', 'primaryCategory', 'tags', 'capabilities', 'suitableFor', 'notSuitableFor', 'dependencies', 'platform', 'source', 'relationshipHints'];
const payload = await readJson(path.resolve(inputPath), null); if (!payload || !Array.isArray(payload.entries)) throw new Error('输入必须包含 entries 数组。');
const index = await readJson(indexPath, null); if (!index?.skills) throw new Error(`索引不可用：${indexPath}`);
const metadata = await readJson(metadataPath, { version: 1, entries: {} }); const relations = await readJson(relationsPath, { version: 1, entries: {} }); const queue = await readJson(queuePath, { version: 1, items: [] }); const accepted = new Set();
for (const incoming of payload.entries) {
  const skill = index.skills.find((item) => item.id === incoming.skillId || item.name === incoming.originalName); if (!skill) continue;
  const raw = await readFile(skill.paths?.[0]?.skill_md, 'utf8'); const hash = createHash('sha256').update(`${skill.id}\0${raw}`).digest('hex').slice(0, 20);
  const previous = metadata.entries[skill.id] || {}; const next = { ...previous, originalName: skill.name, lastAnalyzedHash: hash, lastAnalyzedAt: new Date().toISOString() };
  for (const key of mutable) next[key] = previous[key]?.manualOverride ? previous[key] : { value: incoming[key] ?? 'unknown', manualOverride: false };
  metadata.entries[skill.id] = next; accepted.add(skill.id);
  const previousRelation = relations.entries?.[skill.id]; relations.entries ||= {}; relations.entries[skill.id] = previousRelation?.manualOverride ? previousRelation : { value: incoming.relationshipHints ?? 'unknown', manualOverride: false };
}
queue.items = (queue.items || []).filter((item) => !accepted.has(item.skillId)); await writeJson(metadataPath, metadata); await writeJson(relationsPath, relations); await writeJson(queuePath, queue); console.log(JSON.stringify({ written: accepted.size, metadataPath, relationsPath, queuePath }));

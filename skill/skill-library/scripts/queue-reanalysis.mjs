#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const skillId = process.argv[2]; if (!skillId) throw new Error('需要 Skill 名称或 id。');
const userData = process.env.SKILL_LIBRARY_USER_DATA_DIR || (process.platform === 'win32' ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'SkillLibraryMini') : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'SkillLibraryMini') : path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'SkillLibraryMini'));
const indexPath = process.env.SKILL_INDEX_PATH || path.join(userData, 'skill-index.json'); const queuePath = path.join(userData, 'skill-analysis-queue.json');
const readJson = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; } };
const writeJson = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await rename(tmp, file); };
const index = await readJson(indexPath, null); const skill = index?.skills?.find((item) => item.id === skillId || item.name === skillId); if (!skill) throw new Error(`未找到 Skill：${skillId}`);
const file = skill.paths?.[0]?.skill_md; const raw = await readFile(file, 'utf8'); const contentHash = createHash('sha256').update(`${skill.id}\0${raw}`).digest('hex').slice(0, 20);
const queue = await readJson(queuePath, { version: 1, items: [] }); queue.items = (queue.items || []).filter((item) => item.skillId !== skill.id); queue.items.push({ skillId: skill.id, name: skill.name, skillMdPath: file, contentHash, reason: 'forced', queuedAt: new Date().toISOString() }); await writeJson(queuePath, queue); console.log(JSON.stringify(queue.items.at(-1)));

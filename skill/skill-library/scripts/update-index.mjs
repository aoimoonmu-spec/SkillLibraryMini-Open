#!/usr/bin/env node
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const defaultProjectRoot = process.cwd();

function parseArgs(argv) {
  const args = { roots: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--full') args.full = true;
    else if (value === '--output') args.output = argv[++index];
    else if (value === '--project-root') args.projectRoot = argv[++index];
    else if (value === '--root') {
      const [kind, ...parts] = String(argv[++index] || '').split('=');
      if (kind && parts.length) args.roots.push({ kind, path: parts.join('=') });
    }
    else if (value === '--help') args.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: node Update-SkillIndex.mjs [--full] [--output FILE] [--project-root DIR] [--root KIND=DIR]');
}

function defaultRoots(projectRoot) {
  const home = os.homedir();
  return [
    { kind: 'codex-global', path: path.join(home, '.codex', 'skills') },
    { kind: 'agents-global', path: path.join(home, '.agents', 'skills') },
    { kind: 'project-agents', path: path.join(projectRoot, '.agents', 'skills') },
    { kind: 'project-codex', path: path.join(projectRoot, '.codex', 'skills') },
  ];
}

function normalizedPath(file) { return path.resolve(file); }

async function walkSkillFiles(root) {
  const results = [];
  async function visit(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name === 'SKILL.md') results.push(target);
    }
  }
  await visit(root);
  return results;
}

function metadataFromContent(file, content) {
  const name = path.basename(path.dirname(file));
  const title = content.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
  const frontmatter = content.match(/^---\s*$([\s\S]*?)^---\s*$/m)?.[1] || '';
  let description = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim() || '';
  if (!description) {
    description = content.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(#|---|name:|description:)/i.test(line))
      .slice(0, 2)
      .join(' ');
  }
  const displayName = title || name;
  const keywords = [...new Set(`${name} ${displayName} ${description}`.toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 2))].slice(0, 32);
  return { key: name.toLowerCase(), name, display_name: displayName, description, keywords, changed: true };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function atomicWriteJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, file);
}

function unchangedMetadata(source) {
  return {
    key: source.id, name: source.name, display_name: source.display_name,
    description: source.description, keywords: Array.isArray(source.keywords) ? source.keywords : [], changed: false,
  };
}

async function updateIndex({ outputPath, roots, full }) {
  const old = !full && existsSync(outputPath) ? await readJson(outputPath, null) : null;
  const oldByPath = new Map();
  const oldByKey = new Map();
  for (const skill of old?.skills || []) {
    oldByKey.set(skill.id, skill);
    for (const info of skill.paths || []) oldByPath.set(normalizedPath(info.skill_md), { skill, info });
  }

  const seenPaths = new Set();
  const groups = new Map();
  const counters = { added: 0, reparsed: 0, unchanged: 0 };
  for (const root of roots) {
    if (!existsSync(root.path)) continue;
    for (const file of await walkSkillFiles(root.path)) {
      const absolute = normalizedPath(file);
      const modifiedUtc = (await stat(file)).mtime.toISOString();
      seenPaths.add(absolute);
      const prior = oldByPath.get(absolute);
      const previousModified = prior?.info?.modified_utc ? new Date(prior.info.modified_utc).toISOString() : null;
      let meta;
      if (prior && previousModified === modifiedUtc) {
        meta = unchangedMetadata(prior.skill);
        counters.unchanged += 1;
      } else {
        meta = metadataFromContent(file, await readFile(file, 'utf8'));
        if (prior) counters.reparsed += 1;
        else counters.added += 1;
      }
      if (!groups.has(meta.key)) {
        const previous = oldByKey.get(meta.key);
        groups.set(meta.key, {
          id: meta.key, name: meta.name, display_name: meta.display_name, description: meta.description,
          chinese_intro: previous && !meta.changed ? previous.chinese_intro : '',
          keywords: meta.keywords,
          paths: [],
          suitable_for: previous && !meta.changed ? (previous.suitable_for || []) : [],
          not_suitable_for: previous && !meta.changed ? (previous.not_suitable_for || []) : [],
          dependencies_or_cost: previous && !meta.changed ? previous.dependencies_or_cost : '未确认',
        });
      }
      groups.get(meta.key).paths.push({ root_kind: root.kind, skill_md: absolute, modified_utc: modifiedUtc });
    }
  }
  const removed = old ? [...oldByPath.keys()].filter((file) => !seenPaths.has(file)).length : 0;
  const skills = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  const index = {
    schema_version: 2,
    generated_utc: new Date().toISOString(),
    refresh_rule: '刷新时只遍历 Skill 目录与 SKILL.md 元数据；仅新增或修改的 SKILL.md 会被读取和解析。路径消失视为删除，路径变化视为删除加新增。',
    scan_roots: roots.map((root) => ({ kind: root.kind, path: normalizedPath(root.path), exists: existsSync(root.path) })),
    unique_skill_count: skills.length,
    installed_path_count: skills.reduce((total, skill) => total + skill.paths.length, 0),
    last_refresh: { mode: full ? 'full' : 'incremental', ...counters, removed },
    skills,
  };
  await atomicWriteJson(outputPath, index);
  return index.last_refresh;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) printHelp();
else {
  const projectRoot = path.resolve(args.projectRoot || process.env.SKILL_LIBRARY_PROJECT_ROOT || defaultProjectRoot);
  const outputPath = path.resolve(args.output || process.env.SKILL_INDEX_PATH || path.join(os.homedir(), '.codex', 'SKILL_INDEX.json'));
  const roots = args.roots.length ? args.roots.map((root) => ({ ...root, path: path.resolve(root.path) })) : defaultRoots(projectRoot);
  console.log(JSON.stringify(await updateIndex({ outputPath, roots, full: Boolean(args.full) })));
}

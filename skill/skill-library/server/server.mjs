import { createServer } from 'node:http';
import { copyFile, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverFile = fileURLToPath(import.meta.url);
const serverRoot = path.dirname(serverFile);
// The development server lives beside app/, while the installable Skill keeps it in server/.
const root = existsSync(path.join(serverRoot, '..', 'app')) ? path.resolve(serverRoot, '..') : serverRoot;
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === serverFile;
const appRoot = path.join(root, 'app');
const codexHome = process.env.SKILL_LIBRARY_CODEX_HOME || path.join(os.homedir(), '.codex');
const agentsHome = process.env.SKILL_LIBRARY_AGENTS_HOME || path.join(os.homedir(), '.agents');
const projectRoot = path.resolve(process.env.SKILL_LIBRARY_PROJECT_ROOT || root);
const legacyDataRoot = process.env.SKILL_LIBRARY_DATA_ROOT;
const programDataRoot = path.resolve(process.env.SKILL_LIBRARY_PROGRAM_DATA_ROOT || legacyDataRoot || path.join(root, 'data'));
function defaultUserDataRoot() {
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'SkillLibraryMini');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'SkillLibraryMini');
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'SkillLibraryMini');
}
const userDataRoot = path.resolve(process.env.SKILL_LIBRARY_USER_DATA_DIR || legacyDataRoot || defaultUserDataRoot());
const indexPath = process.env.SKILL_INDEX_PATH || path.join(codexHome, 'SKILL_INDEX.json');
const nodeUpdaterPath = process.env.SKILL_INDEX_UPDATER || path.join(codexHome, 'scripts', 'Update-SkillIndex.mjs');
const legacyWindowsUpdaterPath = path.join(codexHome, 'scripts', 'Update-SkillIndex.ps1');
const statePath = path.join(userDataRoot, 'user-state.json');
const introCachePath = path.join(userDataRoot, 'intro-cache.json');
const packOverridesPath = path.join(userDataRoot, 'skill-relations-overrides.json');
const historyEvidencePath = path.join(userDataRoot, 'skill-history-evidence.json');
const metadataPath = path.join(userDataRoot, 'skill-metadata.json');
const analysisQueuePath = path.join(userDataRoot, 'skill-analysis-queue.json');
const packsPath = path.join(programDataRoot, 'skill-packs.json');
const sourceGraphPath = path.join(programDataRoot, 'source-graph.json');
const repoCachePath = path.join(programDataRoot, 'repo-cache.json');
const repoVersionCachePath = path.join(programDataRoot, 'repo-version-cache.json');
const port = Number(process.env.SKILL_LIBRARY_PORT || 32147);
const launchDesktop = process.argv.includes('--open');
const buildCacheOnly = process.argv.includes('--build-cache');
let lastHeartbeat = Date.now();
let heartbeatMonitor;
let libraryVersion = 1;
let lastLibrarySync = null;
let refreshInFlight = null;
let refreshDebounce;
let watcherRootMonitor;
const skillWatchers = new Map();
const watcherDebounceMs = Math.max(500, Number(process.env.SKILL_LIBRARY_WATCH_DEBOUNCE_MS || 900));
const watcherRootPollMs = Math.max(2_000, Number(process.env.SKILL_LIBRARY_WATCH_ROOT_POLL_MS || 10_000));

const categories = [
  ['visual', '图片 / 视觉设计'], ['media', '视频 / 音频'], ['web', '网页 / APP 开发'],
  ['game', '游戏开发'], ['research', '学习 / 研究'], ['writing', '写作 / 内容创作'],
  ['automation', '效率 / 自动化'], ['data', '数据 / 分析'], ['engineering', '编程 / 工程'],
  ['agent', 'AI / Agent 工具'], ['business', '商业 / 运营'], ['other', '其他 / 未分类'],
];
const categoryLabels = Object.fromEntries(categories);
const categoryMatchers = [
  ['media', /\b(video|audio|subtitle|caption|voice|podcast)\b|剪辑|视频|音频|字幕/],
  ['game', /\b(game|unity|unreal|taptap)\b|游戏/],
  ['writing', /\b(write|writer|article|copywriting|wechat)\b|写作|文章|内容创作|公众号|改稿/],
  ['business', /\b(business|market|seo|sales|conversion|niche)\b|商业|运营|营销|定位|转化/],
  ['data', /\b(data|spreadsheet|excel|dashboard|analytics)\b|数据|表格|统计/],
  ['web', /\b(frontend|website|web app|html|css|react|expo|webview)\b|网页|前端|应用开发/],
  ['visual', /\b(image|visual|figma|illustrat|photo|poster|photobook|holo)\b|视觉设计|图片|海报|插画|封面/],
  ['engineering', /\b(code|typescript|python|test|debug|build|review)\b|编程|工程|测试|代码/],
  ['automation', /\b(automation|workflow|productivity|organize)\b|自动化|效率|整理/],
  ['research', /\b(research|learn|reading|study)\b|调研|学习|阅读|研究/],
  ['agent', /\b(agent|mcp|codex|llm)\b|智能体|技能路由|模型工具/],
];

function skillScanRoots() {
  return [...new Set([
    path.resolve(codexHome, 'skills'),
    path.resolve(agentsHome, 'skills'),
    path.resolve(projectRoot, '.codex', 'skills'),
    path.resolve(projectRoot, '.agents', 'skills'),
  ])];
}

const defaultState = () => ({
  version: 1, theme: 'system', view: 'grid', favorites: [], recent: [],
  overrides: {}, tags: {}, metadataOverrides: {},
});
const defaultPackOverrides = () => ({ version: 1, members: {}, entries: {} });

async function ensureDataFiles() {
  await mkdir(userDataRoot, { recursive: true });
  const personalFiles = [
    [statePath, 'user-state.json', defaultState()],
    [introCachePath, 'intro-cache.json', { version: 1, entries: {} }],
    [packOverridesPath, 'skill-relations-overrides.json', defaultPackOverrides()],
    [historyEvidencePath, 'skill-history-evidence.json', { evidence: [] }],
    [metadataPath, 'skill-metadata.json', { version: 1, entries: {} }],
    [analysisQueuePath, 'skill-analysis-queue.json', { version: 1, items: [] }],
  ];
  for (const [target, legacyName, fallback] of personalFiles) {
    if (existsSync(target)) continue;
    const legacy = path.join(programDataRoot, legacyName);
    if (existsSync(legacy)) await copyFile(legacy, target);
    else await writeFile(target, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function writeJson(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

function plain(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }

function classify(skill, raw = '') {
  const haystack = plain([skill.description, skill.chinese_intro, raw.slice(0, 6000), ...(skill.keywords || []), ...(skill.suitable_for || [])].join(' ')).toLowerCase();
  return categoryMatchers.find(([, matcher]) => matcher.test(haystack))?.[0] || 'other';
}

function baseTags(skill, category) {
  const tags = [...new Set((skill.keywords || []).filter((item) => item.length > 1).slice(0, 6))];
  return [categoryLabels[category], ...tags].slice(0, 6);
}

function activePaths(skill) {
  return (skill.paths || []).map((entry) => entry.skill_md).filter((file) => typeof file === 'string' && existsSync(file));
}

function activePathInfo(skill) {
  return (skill.paths || []).find((entry) => typeof entry.skill_md === 'string' && existsSync(entry.skill_md)) || null;
}

function fingerprint(skill, raw) {
  return createHash('sha256').update(`${skill.id}\0${raw}`).digest('hex').slice(0, 20);
}

async function analysisQueue(index) {
  await ensureDataFiles();
  const metadata = await readJson(metadataPath, { version: 1, entries: {} });
  const previous = await readJson(analysisQueuePath, { version: 1, items: [] });
  const previousBySkill = new Map((previous.items || []).map((item) => [item.skillId, item]));
  const items = [];
  for (const skill of index.skills) {
    const pathInfo = activePathInfo(skill); const file = pathInfo?.skill_md || null;
    // Older indexes do not have analysis_hash. Read only those legacy files once;
    // normal queue checks reuse the hash produced by the incremental indexer.
    const contentHash = pathInfo?.analysis_hash || (file ? fingerprint(skill, await readFile(file, 'utf8')) : fingerprint(skill, ''));
    const entry = metadata.entries?.[skill.id];
    const reason = !entry ? 'new' : entry.lastAnalyzedHash !== contentHash ? 'changed' : null;
    if (reason) {
      const prior = previousBySkill.get(skill.id);
      const queuedAt = prior?.contentHash === contentHash && prior?.reason === reason ? prior.queuedAt : new Date().toISOString();
      items.push({ skillId: skill.id, name: skill.name, skillMdPath: file || null, contentHash, reason, queuedAt });
    }
  }
  const queue = { version: 1, items };
  if (JSON.stringify(previous.items) !== JSON.stringify(items)) await writeJson(analysisQueuePath, queue);
  return queue;
}

function extractHeadings(raw) {
  return [...raw.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => match[1].trim()).filter(Boolean).slice(0, 8);
}

function sourceSummary(raw, fallback) {
  const body = raw.replace(/^---[\s\S]*?---\s*/m, '');
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith('```') && !line.startsWith('- ') && !line.startsWith('|'));
  return plain(lines.slice(0, 2).join(' ')) || fallback || '原始文档未提供可识别的摘要。';
}

function chineseName(skill) {
  return /[\u4e00-\u9fff]/.test(skill.display_name || '') ? skill.display_name : `${skill.name} 工具`;
}

function buildIntro(skill, raw) {
  let sourceDescription = plain(skill.description).replace(/^\|$/, '');
  if (!sourceDescription || /^[>|-]+$/.test(sourceDescription)) sourceDescription = sourceSummary(raw, '原始文档未提供可识别的摘要。');
  const sourceIntro = plain(skill.chinese_intro);
  const headings = extractHeadings(raw);
  const suitable = Array.isArray(skill.suitable_for) && skill.suitable_for.length ? skill.suitable_for : [`当任务涉及「${sourceDescription}」时使用。`];
  const unsuitable = Array.isArray(skill.not_suitable_for) && skill.not_suitable_for.length ? skill.not_suitable_for : ['原始文档未说明明确的不适用范围；请先核对原始 SKILL.md。'];
  const prerequisites = plain(skill.dependencies_or_cost) || '原始文档未说明。';
  return {
    originalName: skill.name,
    chineseName: chineseName(skill),
    oneLine: sourceIntro && !sourceIntro.startsWith('用于处理') ? sourceIntro : `面向「${chineseName(skill)}」的本地 Skill 工具；核心用途以原始说明为准。`,
    category: classify(skill, raw),
    capabilities: headings.length ? headings.map((heading) => `原始文档覆盖：${heading}`) : [`核心说明：${sourceDescription}`],
    suitable,
    unsuitable,
    limitations: ['资料库只展示说明，不会执行原始文档中的任何命令。', '未在原始文档中明确的信息均不作为已验证能力。'],
    examples: [
      `“我需要处理与 ${skill.name} 相关的工作，先说明可行性和前提。”`,
      `“请使用 ${skill.name}，先读取实际 SKILL.md，再按其规则完成任务。”`,
      `“请判断 ${skill.name} 是否适合当前任务，并说明限制。”`,
    ],
    usage: `在 Codex 中明确引用 ${skill.name}，并要求先读取其实际 SKILL.md。`,
    prerequisites,
    sourceDescription,
  };
}

async function getIndex() {
  const index = await readJson(indexPath, null);
  if (!index || !Array.isArray(index.skills)) throw new Error('SKILL_INDEX.json 不存在或格式无效。');
  return index;
}

async function getState() { await ensureDataFiles(); return readJson(statePath, defaultState()); }

async function getSourceContext() {
  const [graph, repoCache, versionCache] = await Promise.all([readJson(sourceGraphPath, { records: [] }), readJson(repoCachePath, { entries: [] }), readJson(repoVersionCachePath, { skillVersions: {}, repos: [] })]);
  const bySkill = new Map((graph.records || []).map((record) => [record.skillId, { ...record, version: versionCache.skillVersions?.[record.skillId] || null }]));
  return { bySkill, repoCache, versionCache };
}

async function getHistoryContext(index) {
  const source = await readJson(historyEvidencePath, { evidence: [] });
  const known = new Set(index.skills.map((skill) => skill.id));
  const evidence = (source.evidence || []).map((item) => ({ ...item, installedSkillNames: (item.skillNames || []).filter((id) => known.has(id)) }));
  const bySkill = new Map();
  for (const item of evidence) for (const skillId of item.installedSkillNames) {
    const values = bySkill.get(skillId) || []; values.push(item); bySkill.set(skillId, values);
  }
  return { evidence, bySkill };
}

async function getPackContext(index, history = null) {
  history ||= await getHistoryContext(index);
  await ensureDataFiles();
  const [source, overrides] = await Promise.all([readJson(packsPath, { packs: [] }), readJson(packOverridesPath, defaultPackOverrides())]);
  const known = new Set(index.skills.map((skill) => skill.id));
  const historicalFor = (packId) => history.evidence.filter((item) => item.linkedPackId === packId);
  const sourcePacks = [
    ...(source.packs || []).map((pack) => {
      const historyEvidence = historicalFor(pack.id);
      return historyEvidence.length ? { ...pack, historyEvidence, evidence: [...pack.evidence, ...historyEvidence.map((item) => `历史使用关系：${item.notes}`)] } : pack;
    }),
    ...history.evidence.filter((item) => item.libraryPack && (item.installedSkillNames.length > 1 || item.libraryPack.historyOnly)).map((item) => ({
      ...item.libraryPack,
      members: item.installedSkillNames.map((skillId) => ({ skillId, role: skillId === item.mainEntry ? 'entry' : 'companion', standaloneAllowed: true, order: null })),
      historyEvidence: [item],
      evidence: [`历史使用关系：${item.notes}`],
    })),
  ];
  const packOverrides = overrides.members || {};
  const packs = sourcePacks.map((sourcePack) => {
    const ids = new Set();
    const members = (sourcePack.members || []).filter((member) => {
      const change = packOverrides[member.skillId];
      return known.has(member.skillId) && (!change || change.packId === undefined || change.packId === sourcePack.id);
    }).map((member) => {
      ids.add(member.skillId); const change = packOverrides[member.skillId] || {};
      return { ...member, ...change, skillId: member.skillId };
    });
    for (const [skillId, change] of Object.entries(packOverrides)) if (change.packId === sourcePack.id && known.has(skillId) && !ids.has(skillId)) members.push({ skillId, role: change.role || 'companion', standaloneAllowed: change.standaloneAllowed !== false, order: Number.isFinite(change.order) ? change.order : null });
    const entrySkill = overrides.entries?.[sourcePack.id] && members.some((member) => member.skillId === overrides.entries[sourcePack.id]) ? overrides.entries[sourcePack.id] : sourcePack.entrySkill;
    return { ...sourcePack, entrySkill: members.some((member) => member.skillId === entrySkill) ? entrySkill : null, members };
  }).filter((pack) => pack.members.length > 1 || pack.historyOnly);
  const bySkill = new Map();
  for (const pack of packs) for (const member of pack.members) {
    const relation = { packId: pack.id, packName: pack.name, chineseName: pack.chineseName, role: member.skillId === pack.entrySkill ? 'entry' : member.role, standaloneAllowed: member.standaloneAllowed !== false, order: member.order ?? null, relationStatus: pack.relationStatus, relationType: pack.relationType || 'pack' };
    const values = bySkill.get(member.skillId) || []; values.push(relation); bySkill.set(member.skillId, values);
  }
  return { packs, bySkill, overrides, history };
}

function metadataValue(entry, field, fallback) {
  const value = entry?.[field];
  return value && typeof value === 'object' && 'value' in value ? value.value : (value ?? fallback);
}

function publicSkill(skill, state, cache = null, relations = [], source = null, metadata = null) {
  const override = state.overrides?.[skill.id] || {};
  const profile = cache?.entries?.[skill.id]?.intro;
  const entry = metadata?.entries?.[skill.id];
  const category = override.category || metadataValue(entry, 'primaryCategory', profile?.category || 'other');
  const tags = [...new Set([...(metadataValue(entry, 'tags', profile?.tags || baseTags(skill, category)) || []), ...(override.tags || state.tags?.[skill.id] || [])])].slice(0, 8);
  const paths = activePaths(skill);
  return {
    id: skill.id, name: skill.name, displayName: skill.display_name || skill.name,
    chineseName: metadataValue(entry, 'chineseName', profile?.chineseName || chineseName(skill)), description: profile?.sourceDescription || plain(skill.description), oneLine: metadataValue(entry, 'oneLineSummary', profile?.oneLine || '尚未 AI 整理。'),
    category, categoryLabel: categoryLabels[category], tags, paths, pathCount: (skill.paths || []).length,
    available: paths.length > 0, changed: false,
    favorite: (state.favorites || []).includes(skill.id), recent: (state.recent || []).includes(skill.id), relations, source,
  };
}

async function getPublicSkills() {
  const [index, state, cache, sourceContext, metadata] = await Promise.all([getIndex(), getState(), readJson(introCachePath, { version: 1, entries: {} }), getSourceContext(), readJson(metadataPath, { version: 1, entries: {} })]);
  const historyContext = await getHistoryContext(index);
  const packContext = await getPackContext(index, historyContext);
  const queue = await analysisQueue(index); const waiting = new Set(queue.items.map((item) => item.skillId));
  const skills = index.skills.map((skill) => ({ ...publicSkill(skill, state, cache, packContext.bySkill.get(skill.id) || [], sourceContext.bySkill.get(skill.id) || null, metadata), analysisStatus: waiting.has(skill.id) ? 'unorganized' : 'organized' })).sort((a, b) => a.name.localeCompare(b.name));
  return { index, state, packContext, sourceContext, queue, skills };
}

async function detailFor(id) {
  const [index, state, cache, sourceContext, metadata] = await Promise.all([getIndex(), getState(), readJson(introCachePath, { version: 1, entries: {} }), getSourceContext(), readJson(metadataPath, { version: 1, entries: {} })]);
  const historyContext = await getHistoryContext(index);
  const packContext = await getPackContext(index, historyContext);
  const skill = index.skills.find((item) => item.id === id);
  if (!skill) return null;
  const paths = activePaths(skill);
  const raw = paths.length ? await readFile(paths[0], 'utf8') : '';
  const hash = fingerprint(skill, raw);
  let entry = cache.entries?.[id];
  const stale = Boolean(entry && cache.version === 3 && entry.fingerprint !== hash);
  if (cache.version !== 3 || !entry) {
    entry = { fingerprint: hash, generatedAt: new Date().toISOString(), intro: buildIntro(skill, raw) };
    cache.entries ||= {}; cache.entries[id] = entry; await writeJson(introCachePath, cache);
  }
  const organized = metadata.entries?.[id];
  if (organized) entry = { ...entry, intro: { ...entry.intro,
    chineseName: metadataValue(organized, 'chineseName', entry.intro.chineseName),
    oneLine: metadataValue(organized, 'oneLineSummary', entry.intro.oneLine),
    category: metadataValue(organized, 'primaryCategory', entry.intro.category),
    capabilities: metadataValue(organized, 'capabilities', entry.intro.capabilities),
    suitable: metadataValue(organized, 'suitableFor', entry.intro.suitable),
    unsuitable: metadataValue(organized, 'notSuitableFor', entry.intro.unsuitable),
    prerequisites: metadataValue(organized, 'dependencies', entry.intro.prerequisites),
  } };
  const current = publicSkill(skill, state, cache, packContext.bySkill.get(id) || [], sourceContext.bySkill.get(id) || null, metadata);
  const related = index.skills
    .filter((item) => item.id !== id)
    .map((item) => publicSkill(item, state, cache, packContext.bySkill.get(item.id) || [], sourceContext.bySkill.get(item.id) || null, metadata))
    .filter((item) => item.category === current.category || item.tags.some((tag) => current.tags.includes(tag)))
    .slice(0, 3)
    .map((item) => ({ ...item, reason: item.category === current.category ? '属于同一主分类，可用于相邻任务。' : '与当前 Skill 共享功能或平台标签。' }));
  return { ...current, intro: entry.intro, raw, allPaths: skill.paths || [], related, stale, historyEvidence: historyContext.bySkill.get(id) || [], packs: packContext.packs.filter((pack) => current.relations.some((relation) => relation.packId === pack.id)) };
}

function publicPack(pack, skills) {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const members = pack.members.map((member) => ({ ...member, skill: byId.get(member.skillId) })).filter((member) => member.skill);
  return { ...pack, members, memberCount: members.length, entry: pack.entrySkill ? byId.get(pack.entrySkill) || null : null };
}

async function updatePackMember(input) {
  const index = await getIndex(); if (!index.skills.some((skill) => skill.id === input.skillId)) throw new Error('Skill 不存在。');
  const source = await readJson(packsPath, { packs: [] }); const validPack = input.packId === null || source.packs?.some((pack) => pack.id === input.packId);
  if (!validPack) throw new Error('Skill Pack 不存在。');
  const overrides = await readJson(packOverridesPath, defaultPackOverrides()); overrides.members ||= {};
  overrides.members[input.skillId] = { packId: input.packId, role: ['entry', 'child', 'companion', 'independent'].includes(input.role) ? input.role : 'companion', standaloneAllowed: input.standaloneAllowed !== false, order: Number.isInteger(input.order) && input.order >= 0 ? input.order : null };
  await writeJson(packOverridesPath, overrides); return overrides;
}

async function updatePackEntry(input) {
  const index = await getIndex(); const context = await getPackContext(index); const pack = context.packs.find((item) => item.id === input.packId);
  if (!pack || !pack.members.some((member) => member.skillId === input.entrySkill)) throw new Error('主入口必须是该 Pack 的成员。');
  const overrides = await readJson(packOverridesPath, defaultPackOverrides()); overrides.entries ||= {}; overrides.entries[input.packId] = input.entrySkill;
  await writeJson(packOverridesPath, overrides); return overrides;
}

async function refreshIntro(id) {
  const [index, cache] = await Promise.all([getIndex(), readJson(introCachePath, { version: 3, entries: {} })]);
  const skill = index.skills.find((item) => item.id === id);
  if (!skill) return null;
  const paths = activePaths(skill);
  const raw = paths.length ? await readFile(paths[0], 'utf8') : '';
  cache.version = 3; cache.entries ||= {};
  cache.entries[id] = { fingerprint: fingerprint(skill, raw), generatedAt: new Date().toISOString(), intro: buildIntro(skill, raw) };
  await writeJson(introCachePath, cache);
  return cache.entries[id];
}

async function buildAllIntros() {
  const index = await getIndex();
  const cache = await readJson(introCachePath, { version: 1, entries: {} });
  cache.entries ||= {};
  const rebuild = cache.version !== 3;
  cache.version = 3;
  let updated = 0;
  for (const skill of index.skills) {
    const paths = activePaths(skill);
    const raw = paths.length ? await readFile(paths[0], 'utf8') : '';
    const hash = fingerprint(skill, raw);
    if (rebuild || !cache.entries[skill.id] || cache.entries[skill.id].fingerprint !== hash) {
      cache.entries[skill.id] = { fingerprint: hash, generatedAt: new Date().toISOString(), intro: buildIntro(skill, raw) };
      updated += 1;
    }
  }
  await writeJson(introCachePath, cache);
  return { updated, total: index.skills.length };
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function text(res, status, payload, type = 'text/plain; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(payload); }

async function requestBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 2_000_000) throw new Error('请求内容过大。'); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function validateState(input) {
  const state = defaultState();
  state.theme = ['system', 'light', 'dark'].includes(input.theme) ? input.theme : 'system';
  state.view = ['grid', 'list'].includes(input.view) ? input.view : 'grid';
  state.favorites = [...new Set((input.favorites || []).filter((id) => typeof id === 'string'))].slice(0, 500);
  state.recent = [...new Set((input.recent || []).filter((id) => typeof id === 'string'))].slice(0, 10);
  state.overrides = typeof input.overrides === 'object' && input.overrides ? input.overrides : {};
  state.tags = typeof input.tags === 'object' && input.tags ? input.tags : {};
  state.metadataOverrides = typeof input.metadataOverrides === 'object' && input.metadataOverrides ? input.metadataOverrides : {};
  return state;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let output = ''; let error = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { error += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error || `索引脚本退出码：${code}`)));
  });
}

function runUpdater() {
  const bundledUpdaterPath = path.join(root, 'scripts', 'Update-SkillIndex.mjs');
  const updater = [nodeUpdaterPath, bundledUpdaterPath].find((file) => existsSync(file));
  if (updater) return runCommand(process.execPath, [updater, '--project-root', projectRoot], { windowsHide: true, cwd: root });
  if (process.platform === 'win32' && existsSync(legacyWindowsUpdaterPath)) {
    return runCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', legacyWindowsUpdaterPath], { windowsHide: true });
  }
  return Promise.reject(new Error('未找到跨平台索引刷新器。请先提供 Update-SkillIndex.mjs。'));
}

function updaterSummary(output) {
  try { return JSON.parse(output); } catch { return { added: 0, reparsed: 0, removed: 0, unchanged: 0 }; }
}

async function refreshLibrary(reason = 'manual') {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const output = await runUpdater();
    const summary = updaterSummary(output);
    const index = await getIndex();
    const queue = await analysisQueue(index);
    const changed = Number(summary.added || 0) + Number(summary.reparsed || 0) + Number(summary.removed || 0);
    if (changed) libraryVersion += 1;
    lastLibrarySync = { reason, changed, summary, queued: queue.items.length, at: new Date().toISOString() };
    return { output, index, queue, ...lastLibrarySync, version: libraryVersion };
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

function scheduleLibraryRefresh(reason = 'filesystem') {
  clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(() => {
    refreshLibrary(reason).catch((error) => console.error(`Skill Library automatic refresh failed: ${error.message}`));
  }, watcherDebounceMs);
  refreshDebounce.unref?.();
}

function watchSkillRoot(rootPath) {
  const listener = () => scheduleLibraryRefresh('filesystem');
  try {
    return watch(rootPath, { recursive: true }, listener);
  } catch {
    // The required platforms support recursive watches; a non-recursive
    // fallback still catches root-level creation and is reconciled by polling.
    return watch(rootPath, listener);
  }
}

function ensureSkillWatchers() {
  const roots = new Set(skillScanRoots());
  for (const [rootPath, watcher] of skillWatchers) {
    if (roots.has(rootPath) && existsSync(rootPath)) continue;
    watcher.close(); skillWatchers.delete(rootPath);
  }
  for (const rootPath of roots) {
    if (!existsSync(rootPath) || skillWatchers.has(rootPath)) continue;
    try {
      const watcher = watchSkillRoot(rootPath);
      watcher.on('error', () => { watcher.close(); skillWatchers.delete(rootPath); });
      watcher.unref?.();
      skillWatchers.set(rootPath, watcher);
    } catch {
      // A missing or transient directory is retried by the lightweight root poll.
    }
  }
}

function startSkillWatchers() {
  ensureSkillWatchers();
  if (!watcherRootMonitor) {
    watcherRootMonitor = setInterval(ensureSkillWatchers, watcherRootPollMs);
    watcherRootMonitor.unref?.();
  }
}

function stopSkillWatchers() {
  clearTimeout(refreshDebounce); clearInterval(watcherRootMonitor); watcherRootMonitor = null;
  for (const watcher of skillWatchers.values()) watcher.close();
  skillWatchers.clear();
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json; charset=utf-8' };
async function serveStatic(res, urlPath) {
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.resolve(appRoot, relative);
  if (!file.startsWith(path.resolve(appRoot) + path.sep) || !existsSync(file)) return text(res, 404, 'Not found');
  const info = await stat(file); if (!info.isFile()) return text(res, 404, 'Not found');
  text(res, 200, await readFile(file), mime[path.extname(file)] || 'application/octet-stream');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, libraryVersion, lastSync: lastLibrarySync });
    if (req.method === 'GET' && url.pathname === '/api/version') return json(res, 200, { version: libraryVersion, lastSync: lastLibrarySync, refreshing: Boolean(refreshInFlight) });
    if (req.method === 'GET' && url.pathname === '/api/skills') {
      const { index, state, skills, packContext, sourceContext, queue } = await getPublicSkills();
      const sourceRecords = [...sourceContext.bySkill.values()];
      return json(res, 200, { skills, packs: packContext.packs.map((pack) => publicPack(pack, skills)), state, analysisQueue: queue, libraryVersion, lastSync: lastLibrarySync, counts: { unique: index.unique_skill_count, paths: index.installed_path_count, githubConfirmed: sourceRecords.filter((record) => record.repoKey).length }, categories });
    }
    if (req.method === 'GET' && url.pathname === '/api/packs') { const { skills, packContext } = await getPublicSkills(); return json(res, 200, { packs: packContext.packs.map((pack) => publicPack(pack, skills)) }); }
    if (req.method === 'GET' && url.pathname === '/api/detail') {
      const detail = await detailFor(url.searchParams.get('id') || ''); return detail ? json(res, 200, detail) : json(res, 404, { error: 'Skill 不存在。' });
    }
    if (req.method === 'POST' && url.pathname === '/api/refresh-intro') { const entry = await refreshIntro((await requestBody(req)).id); return entry ? json(res, 200, entry) : json(res, 404, { error: 'Skill 不存在。' }); }
    if (req.method === 'POST' && url.pathname === '/api/state') { const state = validateState(await requestBody(req)); await writeJson(statePath, state); return json(res, 200, state); }
    if (req.method === 'POST' && url.pathname === '/api/pack-member') return json(res, 200, await updatePackMember(await requestBody(req)));
    if (req.method === 'POST' && url.pathname === '/api/pack-entry') return json(res, 200, await updatePackEntry(await requestBody(req)));
    if (req.method === 'POST' && url.pathname === '/api/heartbeat') { lastHeartbeat = Date.now(); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && url.pathname === '/api/refresh') { const result = await refreshLibrary('manual'); return json(res, 200, { ...result.summary, unique: result.index.unique_skill_count, paths: result.index.installed_path_count, version: result.version }); }
    if (req.method === 'GET' && url.pathname === '/api/analysis-queue') { const index = await getIndex(); return json(res, 200, await analysisQueue(index)); }
    if (req.method === 'GET' && url.pathname === '/api/backup') { const [state, cache, packOverrides] = await Promise.all([getState(), readJson(introCachePath, { version: 1, entries: {} }), readJson(packOverridesPath, defaultPackOverrides())]); return json(res, 200, { format: 1, exportedAt: new Date().toISOString(), state, introCache: cache, packOverrides }); }
    if (req.method === 'POST' && url.pathname === '/api/backup') {
      const backup = await requestBody(req);
      if (backup?.format !== 1 || !backup.state || typeof backup.state !== 'object') return json(res, 400, { error: '备份格式无效。' });
      await writeJson(statePath, validateState(backup.state));
      if (backup.introCache?.version === 1 && typeof backup.introCache.entries === 'object') await writeJson(introCachePath, backup.introCache);
      if (backup.packOverrides?.version === 1 && typeof backup.packOverrides === 'object') await writeJson(packOverridesPath, backup.packOverrides);
      return json(res, 200, { ok: true });
    }
    return serveStatic(res, url.pathname);
  } catch (error) { return json(res, 500, { error: error instanceof Error ? error.message : '未知错误。' }); }
});

server.on('close', () => {
  clearInterval(heartbeatMonitor); heartbeatMonitor = null;
  stopSkillWatchers();
});

export function startServer() {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(`http://127.0.0.1:${server.address().port}`);
    server.once('error', reject);
    ensureDataFiles().then(async () => {
      try {
        await refreshLibrary('startup');
      } catch (error) {
        if (!existsSync(indexPath)) throw error;
        console.error(`Skill Library startup scan failed; using the last valid index: ${error.message}`);
      }
      startSkillWatchers();
      server.listen(port, '127.0.0.1');
    }).catch(reject);
    server.once('listening', () => {
      const address = `http://127.0.0.1:${server.address().port}`;
      server.removeListener('error', reject);
      if (!heartbeatMonitor) heartbeatMonitor = setInterval(() => { if (Date.now() - lastHeartbeat > 45_000) server.close(() => process.exit(0)); }, 10_000).unref();
      resolve(address);
    });
  });
}

export function stopServer() {
  if (!server.listening) { stopSkillWatchers(); return Promise.resolve(); }
  return new Promise((resolve) => server.close(resolve));
}

export function openBrowser(address) {
  const commands = {
    win32: ['rundll32.exe', ['url.dll,FileProtocolHandler', address]],
    darwin: ['open', [address]],
    linux: ['xdg-open', [address]],
  };
  const command = commands[process.platform];
  if (!command) return false;
  const browser = spawn(command[0], command[1], { detached: true, stdio: 'ignore', windowsHide: true });
  browser.unref();
  return true;
}

if (isMainModule) {
  await ensureDataFiles();
  if (buildCacheOnly) { console.log(JSON.stringify(await buildAllIntros())); process.exit(0); }
  const address = await startServer();
  console.log(`Skill Library Mini: ${address}`);
  if (launchDesktop) openBrowser(address);
}

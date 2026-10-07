import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexPath = process.env.SKILL_INDEX_PATH || path.join(os.homedir(), '.codex', 'SKILL_INDEX.json');
const graphPath = path.join(root, 'data', 'source-graph.json');
const repoCachePath = path.join(root, 'data', 'repo-cache.json');
const now = new Date().toISOString();

// These mappings are only used where local provenance or a verified public source
// identifies an exact repository. Everything else remains deliberately unconfirmed.
const knownRepos = {
  wewrite: { key: 'github:imraywang/wewrite', url: 'https://github.com/imraywang/wewrite', evidence: 'GitHub 的 skills/wewrite/SKILL.md 与本地入口的模块路由一致。' },
  'opc-orchestrator': { key: 'github:easychen/opc-methodology', url: 'https://github.com/easychen/opc-methodology', evidence: '公开仓库资料列出同一组 9 个 OPC Skills；本地 orchestrator 也明确编排这些成员。' },
  'taptap-cli': { key: 'github:taptap/cli', url: 'https://github.com/taptap/cli', evidence: 'TapTap 官方安装资料说明 CLI 随附并同步 Skills；本地总入口列出同一业务域成员。' },
  'cangjie-skill': { key: 'github:kangarooking/cangjie-skill', url: 'https://github.com/kangarooking/cangjie-skill', evidence: '本地能力包位于 cangjie-skill 根目录；同一安装树内的源包元数据指向该仓库。' },
  'naval-almanack': { key: 'github:kangarooking/cangjie-skill', url: 'https://github.com/kangarooking/cangjie-skill', evidence: '本地 source_pack 元数据为 books/naval-almanack-skill；公开资料记录相同仓库与相对目录。' },
  image: { key: 'github:smixs/visual-skills', url: 'https://github.com/smixs/visual-skills', evidence: '本地 SKILL.md 署名 Source: smixs/visual-skills。' },
  video: { key: 'github:smixs/visual-skills', url: 'https://github.com/smixs/visual-skills', evidence: '本地 SKILL.md 署名 Source: smixs/visual-skills。' },
  'creative-director': { key: 'github:smixs/creative-director-skill', url: 'https://github.com/smixs/creative-director-skill', evidence: '本地 SKILL.md 署名 Source: smixs/creative-director-skill。' },
  'baoyu-article-illustrator': { key: 'github:JimLiu/baoyu-skills', url: 'https://github.com/JimLiu/baoyu-skills', evidence: '本地 frontmatter homepage 指向该仓库。' },
  'guizang-ppt-skill': { key: 'github:op7418/guizang-ppt-skill', url: 'https://github.com/op7418/guizang-ppt-skill', evidence: '本地正文明确标注 canonical repository。' },
  'guizang-social-card-skill': { key: 'github:op7418/guizang-social-card-skill', url: 'https://github.com/op7418/guizang-social-card-skill', evidence: '本地 README 的项目徽章、发布资源链接与安装 URL 均指向该仓库。' },
  'gzh-design-skill': { key: 'github:isjiamu/gzh-design-skill', url: 'https://github.com/isjiamu/gzh-design-skill', evidence: '本地 README 的发布资源与克隆地址均指向该仓库。' },
  'mono-color': { key: 'github:yanliudesign/mono-color-skill', url: 'https://github.com/yanliudesign/mono-color-skill', evidence: '本地 README 的项目版本/Stars 徽章与克隆地址均指向该仓库。' },
  'humanizer-zh': { key: 'github:op7418/Humanizer-zh', url: 'https://github.com/op7418/Humanizer-zh', evidence: '本地 README 明确提供该中文 Skill 的 npx 安装与 git clone 地址。' },
  'xhs-research': { key: 'github:kunhai1994/xhs-research', url: 'https://github.com/kunhai1994/xhs-research', evidence: '本地中英文 README 明确给出该 Skill 的安装仓库 URL；其他 GitHub 链接仅标注为依赖或参考。' },
  'screenshot-to-html': { key: 'github:sevzq/screenshot-to-html', url: 'https://github.com/sevzq/screenshot-to-html', evidence: '本地 README 的项目 Stars 徽章与安装地址均指向该仓库。' },
  'leos-six-department-directing-team-skill-v1': { key: 'github:MasterLeos/leos-six-department-directing-team-skill-v1', url: 'https://github.com/MasterLeos/leos-six-department-directing-team-skill-v1', evidence: '本地 README 明确要求从该仓库根目录安装 Skill。' },
};

const repoFamilies = {
  wewrite: ['wewrite', 'wewrite-learn', 'wewrite-publish', 'wewrite-review', 'wewrite-rewrite', 'wewrite-stats', 'wewrite-style', 'wewrite-topic', 'wewrite-visual', 'wewrite-write'],
  opc: ['opc-asset-ops', 'opc-business-model-design', 'opc-conversion-loop', 'opc-dashboard-review', 'opc-mvp-designer', 'opc-niche-positioning', 'opc-orchestrator', 'opc-resource-audit', 'opc-value-proposition'],
  taptap: ['taptap-app-edit', 'taptap-asset-library', 'taptap-cli', 'taptap-dashboard-stats', 'taptap-identity', 'taptap-materials', 'taptap-package-management', 'taptap-publish-game', 'taptap-qualification', 'taptap-test-plan'],
  naval: ['acceptance', 'decision-heuristics', 'game-selection', 'happiness-skill', 'honesty-communication', 'hourly-rate-time', 'identity-work', 'judgment-training', 'life-meaning', 'long-term-compounding', 'monkey-mind-meditation', 'naval-almanack', 'naval-almanack-single', 'peer-selection', 'principal-agent', 'productize-yourself', 'rational-buddhism', 'reading-metaskill', 'screen-detox', 'self-liberation', 'wealth-structure'],
  smixsVisual: ['image', 'video'],
};
const familyFor = (id) => Object.entries(repoFamilies).find(([, ids]) => ids.includes(id))?.[0] || null;
const repoFor = (id) => {
  const direct = knownRepos[id]; if (direct) return direct;
  const family = familyFor(id);
  if (family === 'wewrite') return knownRepos.wewrite;
  if (family === 'opc') return knownRepos['opc-orchestrator'];
  if (family === 'taptap') return knownRepos['taptap-cli'];
  if (family === 'naval') return knownRepos['naval-almanack'];
  if (family === 'smixsVisual') return knownRepos.image;
  return null;
};
const text = (value = '') => String(value).replace(/\s+/g, ' ').trim();
const urls = (raw) => [...new Set([...raw.matchAll(/https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/g)].map((match) => `https://github.com/${match[1].replace(/\.git$/, '')}`))];
const frontmatter = (raw) => raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/m)?.[1] || '';
const references = (raw, ids, id) => ids.filter((candidate) => candidate !== id && new RegExp(`(^|[^\\w-])${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w-])`, 'm').test(raw));
function localRoot(file) {
  const normalized = file.replace(/\\/g, '/');
  const match = normalized.match(/^(.*\/skills\/[^/]+)/);
  return match ? match[1] : path.dirname(file).replace(/\\/g, '/');
}
function nearbyFiles(file) {
  const folder = path.dirname(file);
  const parent = path.dirname(folder);
  const candidates = ['README.md', 'readme.md', 'package.json', 'manifest.json', 'skill.json'];
  return [...new Set(candidates.flatMap((name) => [path.join(folder, name), path.join(parent, name)]).filter(existsSync))];
}
const documentSummary = (raw = '') => text(raw.replace(/^---[\s\S]*?---\s*/m, '').split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('```')).slice(0, 8).join(' ')).slice(0, 500);

const index = JSON.parse(await readFile(indexPath, 'utf8'));
const ids = index.skills.map((skill) => skill.id);
const records = [];
for (const skill of index.skills) {
  const paths = (skill.paths || []).map((entry) => entry.skill_md).filter((file) => existsSync(file));
  const file = paths[0] || null;
  const raw = file ? await readFile(file, 'utf8') : '';
  const relatedDocs = file ? await Promise.all(nearbyFiles(file).map(async (item) => {
    const content = await readFile(item, 'utf8');
    return { path: path.relative(path.dirname(file), item).replace(/\\/g, '/'), bytes: Buffer.byteLength(content), summary: documentSummary(content) };
  })) : [];
  const repo = repoFor(skill.id);
  // Missing local provenance is not evidence that no provenance exists. Keep
  // the record conservative until an external source can be verified.
  const sourceStatus = file?.replace(/\\/g, '/').includes('/.system/') ? 'Codex / OpenAI 系统 Skill' : repo ? 'GitHub 来源已确认' : skill.id === 'aihot' ? '第三方非 GitHub 来源' : '来源待确认';
  const referencesFound = references(raw, ids, skill.id);
  records.push({
    skillId: skill.id,
    localName: skill.display_name || skill.name,
    localPaths: paths,
    localSourcePath: file ? localRoot(file) : null,
    localRelativeDirectory: file ? path.relative(localRoot(file), path.dirname(file)).replace(/\\/g, '/') : null,
    hasReadmeOrManifest: relatedDocs.map((item) => item.path),
    relatedLocalDocs: relatedDocs,
    localDocumentReadAt: now,
    localDocumentBytes: Buffer.byteLength(raw),
    localFrontmatter: text(frontmatter(raw)).slice(0, 2500),
    localGitHubUrls: urls(raw),
    repoKey: repo?.key || null,
    repoUrl: repo?.url || urls(raw)[0] || null,
    sourceStatus,
    repoEvidence: repo?.evidence || (skill.id === 'aihot' ? '本地 README 明确给出 aihot.news 的官方安装清单、安装脚本与 API 契约；未提供 GitHub 主仓库。' : urls(raw).length ? '本地 SKILL.md 中出现 GitHub 链接；尚未确认它是否为该 Skill 的主仓库。' : '本地文档未提供可核验的来源仓库。'),
    sourceFamily: familyFor(skill.id),
    sameRepoSkillCount: 0,
    skillReferences: referencesFound,
    relationshipEvidence: referencesFound.length ? `本地 SKILL.md 直接提及：${referencesFound.join(', ')}` : null,
  });
}
const groups = new Map();
for (const record of records) { const key = record.repoKey || `local:${record.localSourcePath || record.skillId}`; const group = groups.get(key) || []; group.push(record); groups.set(key, group); }
for (const recordsInGroup of groups.values()) for (const record of recordsInGroup) record.sameRepoSkillCount = recordsInGroup.length;
const sourceGroups = [...groups.entries()].map(([key, members]) => ({
  key, repoUrl: members[0].repoUrl, confirmed: Boolean(members[0].repoKey), memberSkillIds: members.map((member) => member.skillId).sort(), memberCount: members.length,
  evidence: [...new Set(members.map((member) => member.repoEvidence))],
})).sort((a, b) => b.memberCount - a.memberCount || a.key.localeCompare(b.key));
const repoCache = {
  version: 1, generatedAt: now,
  entries: sourceGroups.filter((group) => group.repoUrl).map((group) => ({ repoKey: group.key, repoUrl: group.repoUrl, lastFetched: now, localSkillIds: group.memberSkillIds, sourceEvidence: group.evidence, githubStatus: group.confirmed ? 'public-reference-verified' : 'github-link-in-local-doc-needs-confirmation', comparison: '仅记录本地与公开文档可见的路由/成员一致性；不把 GitHub 新能力写回本地介绍。' })),
};
await writeFile(graphPath, JSON.stringify({ version: 1, generatedAt: now, skillCount: records.length, records, sourceGroups }, null, 2), 'utf8');
await writeFile(repoCachePath, JSON.stringify(repoCache, null, 2), 'utf8');
console.log(JSON.stringify({ skills: records.length, sourceGroups: sourceGroups.length, confirmedGitHubSources: records.filter((record) => record.repoKey).length, multiSkillSources: sourceGroups.filter((group) => group.memberCount > 1).length }));

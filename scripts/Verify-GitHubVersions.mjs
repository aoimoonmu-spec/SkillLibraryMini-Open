import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const graph = JSON.parse(await readFile(path.join(root, 'data', 'source-graph.json'), 'utf8'));
const outputPath = path.join(root, 'data', 'repo-version-cache.json');
const now = new Date().toISOString();
const sha = (value) => createHash('sha256').update(value).digest('hex');

// Only locally established paths belong here. An absent path stays "无法比较".
const confirmedRemotePaths = {
  'github:op7418/guizang-ppt-skill': { 'guizang-ppt-skill': 'SKILL.md' },
  'github:smixs/creative-director-skill': { 'creative-director': 'SKILL.md' },
};
const lsRemote = (url) => execFileSync('git', ['ls-remote', url, 'HEAD', 'refs/heads/*'], { encoding: 'utf8', timeout: 30000, windowsHide: true });
const parseRemote = (output) => {
  const pairs = output.split(/\r?\n/).filter(Boolean).map((line) => line.split('\t'));
  const head = pairs.find(([, ref]) => ref === 'HEAD')?.[0] || null;
  const branch = pairs.find(([commit, ref]) => commit === head && /^refs\/heads\//.test(ref))?.[1]?.replace('refs/heads/', '') || null;
  return { head, branch };
};
const records = graph.records.filter((record) => record.repoKey && record.repoUrl);
const groups = [...new Map(records.map((record) => [record.repoKey, { key: record.repoKey, url: record.repoUrl, records: [] }])).values()];
for (const record of records) groups.find((group) => group.key === record.repoKey).records.push(record);

const cache = { version: 2, checkedAt: now, transport: 'git-ls-remote + raw.githubusercontent.com', repos: [], skillVersions: {} };
for (const group of groups) {
  const entry = { repoKey: group.key, repoUrl: group.url, checkedAt: now, remoteDefaultBranch: null, remoteLatestCommit: null, remoteLatestTag: null, remoteStatus: 'remote-check-unfinished', error: null, skills: [] };
  try {
    const remote = parseRemote(lsRemote(`${group.url}.git`));
    entry.remoteLatestCommit = remote.head;
    entry.remoteDefaultBranch = remote.branch;
    entry.remoteStatus = remote.head ? 'git-ls-remote-checked' : 'remote-check-unfinished';
  } catch (error) { entry.error = error instanceof Error ? error.message : String(error); }
  for (const record of group.records) {
    const localPath = record.localPaths?.[0] || null;
    const remoteSkillPath = confirmedRemotePaths[group.key]?.[record.skillId] || null;
    const version = { localSourceStatus: 'GitHub 来源已确认', repoUrl: group.url, localPath, localVersion: null, localCommit: null, localTag: null, remoteLatestCommit: entry.remoteLatestCommit, remoteLatestTag: null, remoteDefaultBranch: entry.remoteDefaultBranch, remoteSkillPath, comparisonStatus: '无法比较', comparisonSummary: remoteSkillPath ? '公开 raw 文件读取受限，未比较文件内容。' : '本地证据未提供可确认的仓库内 SKILL.md 相对路径。', checkedAt: now };
    if (localPath) { try { version.localVersion = sha(await readFile(localPath, 'utf8')).slice(0, 16); } catch { /* retain unknown */ } }
    entry.skills.push({ skillId: record.skillId, ...version });
    cache.skillVersions[record.skillId] = version;
  }
  cache.repos.push(entry);
}
await writeFile(outputPath, JSON.stringify(cache, null, 2), 'utf8');
console.log(JSON.stringify({ repos: cache.repos.length, checked: cache.repos.filter((repo) => repo.remoteStatus === 'git-ls-remote-checked').length, versions: Object.keys(cache.skillVersions).length }));

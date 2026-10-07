---
name: skill-library
description: Open, refresh, organize, re-analyze, or recommend locally installed Agent Skills with the bundled visual Skill Library UI.
---

# Skill Library

Use this Skill for: “打开 Skill Library”, “整理我的 Skill Library”, “刷新 Skill Library”, “重新分析 <Skill>”, or “我想做 <任务>，推荐 Skill”。

## Open / refresh

Run `node scripts/start-library.mjs`. It refreshes the bundled index, starts the bundled `server/server.mjs`, waits for `/api/health`, and opens the system default browser. Do not use Electron.

## Organize incrementally

Read the user-data `skill-analysis-queue.json`. Analyze only entries that are new, lack metadata, have a changed `contentHash`, or were explicitly forced. For each queued entry, read its local `SKILL.md` (and README only when needed), then write `skill-metadata.json` in user data with: originalName, chineseName, oneLineSummary, primaryCategory, tags, capabilities, suitableFor, notSuitableFor, dependencies, platform, source, relationshipHints, lastAnalyzedHash, lastAnalyzedAt.

Use `unknown` / `未确认` where evidence is insufficient. Never modify third-party SKILL.md, README, or Skill files. The same evidence-backed relationship hints are retained in user-data `skill-relations.json`. Remove only successfully analyzed entries from the queue.

Before write-back, create a JSON object with an `entries` array and invoke `node scripts/apply-metadata.mjs --input <file>`. Each mutable metadata field is `{ value, manualOverride }`; preserve a field when its `manualOverride` is true. Do not use one whole-Skill override. For “重新分析 <Skill>”, first run `node scripts/queue-reanalysis.mjs <Skill>` and then analyze that queued entry.

## Recommend

Use the local index, metadata and verified Pack/Suite evidence. Recommend rather than execute or install Skills.

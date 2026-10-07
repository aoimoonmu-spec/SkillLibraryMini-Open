# Skill Library Mini

[English](README.md) | [简体中文](README.zh-CN.md)

> Browse, understand, and organize your local AI Agent Skills.

## Install as Codex Skill

Skill Library Mini v1 runs as the `skill-library` Codex Skill with a local visual UI. Install the `skill/skill-library` directory as a Codex Skill, then ask Codex to:

- Open Skill Library
- Organize my Skill Library
- Refresh Skill Library
- Re-analyze `<Skill>`
- Recommend Skills for a task

The Skill scans local Skill directories, stores generated metadata in your user-data directory, starts a loopback-only server, and opens the existing browser UI. It does not require Electron for v1.

## What it does

- Scan local Codex, Agents, and project Skill directories
- Browse Skills with categories, search, favorites, recent views, Packs, Suites, and details
- Keep source `SKILL.md` files read-only
- Let Codex incrementally create Chinese metadata and relationship hints without an extra AI API
- Preserve per-field manual overrides when metadata is refreshed

## Privacy and data

- Processing is local by default.
- The repository ships no installed third-party Skills, local Skill indexes, personal metadata, favorites, browsing history, manual overrides, or chat-history evidence.
- The app does not upload Skill content or call an AI API automatically.
- Codex organization is only performed when the user explicitly requests it.

## Repository layout

- `skill/skill-library/` — installable Skill, UI, server, scripts, schemas, and safe defaults
- `app/`, `server.mjs`, `scripts/` — development source for the same local UI
- `data/defaults/`, `data/schemas/`, `data/examples/` — public-safe data only
- `desktop/` — experimental desktop wrapper source; not the v1 distribution path

## Experimental desktop build

Electron and Windows packaging remain experimental and are not the recommended installation method. They are retained for future evaluation only.

## Third-party content

This repository does not redistribute third-party Skill source files or their `SKILL.md` documents. The experimental Electron package manifest and lockfile identify optional build dependencies; no `node_modules` or runtime bundle is committed. See [THIRD_PARTY.md](THIRD_PARTY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Do not commit local Skill content or user data.

## License

License TBD. No open-source license has been selected for this repository yet.

# Architecture

Skill Library Mini v1 is an installable Codex Skill with a local browser UI.

- `skill/skill-library/` is self-contained and is the product entry point.
- The bundled Node server scans local Skill folders and serves the UI on loopback only.
- User data is stored in the platform user-data directory, not in the repository or third-party Skill folders.
- Codex may write incremental metadata through the bundled scripts; no new AI API is used.
- Electron code is experimental and not part of the v1 install path.

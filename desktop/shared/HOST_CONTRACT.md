# Desktop host contract

A future Windows or macOS host wraps the existing local service; it does not reimplement Skill, Pack, recommendation, search, or user-state logic.

1. Ship the UI, `server.mjs`, reviewed default data, and the platform runtime together.
2. Set `SKILL_LIBRARY_PROGRAM_DATA_ROOT` to bundled default data and `SKILL_LIBRARY_USER_DATA_DIR` to the platform user-data directory.
3. Start `server.mjs` with `SKILL_LIBRARY_PORT=0` and wait for its printed loopback URL.
4. Load that URL in the native WebView.
5. Stop the service when the application exits.

The host owns window title, icon, installer and lifecycle only.

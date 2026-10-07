# App bridge contract (planned)

This contract is intentionally descriptive until a desktop host is chosen. The project-local `skill-library` Skill must not assume a hard-coded developer path or browser URL.

## Required launcher operations

| Operation | Expected result |
| --- | --- |
| `status` | Reports installed / unavailable and the App version when known. |
| `open` | Starts the installed App without opening a browser shell. |
| `refresh` | Requests an explicit local scan and index refresh. |
| `candidates` | Returns a bounded local candidate summary for a user task, including relevant Skill / Pack names and metadata. |

If no registered launcher is found, return **unavailable**. The calling Skill should give installation directions only; it must not create an installation itself.

`candidates` is a retrieval aid, not a recommendation engine. It must return only enough local names, descriptions, categories, tags and Pack context for Codex to reason about the task without sending the entire library by default.

# Third-party content review

## Scope

The public release candidate contains no third-party Skill source directory, `SKILL.md`, local Skill index, metadata cache, relationship history, or installed runtime.

## Included dependency metadata

`desktop/electron/package.json` and `package-lock.json` remain only for an experimental desktop build. They describe dependencies that a developer may install separately. `node_modules` and Electron runtime files are not committed.

## Attribution and redistribution

No third-party Skill documentation or source code is redistributed by this repository. Users' installed Skills remain on their own machines and are only read locally at runtime. Before enabling the experimental desktop build, maintainers should review the licenses of the dependencies recorded in its lockfile.

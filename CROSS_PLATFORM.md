# Skill Library Mini 跨平台源码说明

## 当前支持状态

| 能力 | Windows | macOS | 说明 |
| --- | --- | --- | --- |
| Node 服务与本地网页 | 已验证 | 源码兼容，待 macOS 实机验证 | 仅依赖 Node 标准库。 |
| Skill 索引刷新 | 已验证 | 源码兼容，待 macOS 实机验证 | 使用 `Update-SkillIndex.mjs`。 |
| 默认浏览器打开 | 已验证 | 源码兼容 | 分别使用系统 URL 打开命令。 |
| Windows `.cmd` / `.vbs` 快捷启动 | 已验证 | 不适用 | 仅作为 Windows 兼容入口。 |
| 原生桌面宿主 | 未选择 | 未选择 | 可由 Electron、Tauri 或其他宿主调用 `startServer()`。 |

## Skill 扫描路径

`scripts/Update-SkillIndex.mjs` 默认扫描：

- `~/.codex/skills`
- `~/.agents/skills`
- `<当前项目>/.codex/skills`
- `<当前项目>/.agents/skills`

调用时可用 `--project-root <目录>` 指定项目根目录；也可重复使用 `--root kind=/绝对路径` 覆盖默认扫描根目录。索引刷新只读取新增或修改的 `SKILL.md`，路径消失视为删除，重命名视为删除加新增。

## 用户数据与默认数据

程序默认资料仍位于项目 `data/`，包括 Pack 定义、来源图谱和版本缓存。以下个人可变数据独立存放：

- 收藏、最近查看、主题、手动分类和标签
- 中文介绍缓存
- 手动 Pack 覆盖
- 历史关系证据

默认用户目录：

- Windows：`%APPDATA%/SkillLibraryMini/`
- macOS：`~/Library/Application Support/SkillLibraryMini/`
- Linux：`$XDG_DATA_HOME/SkillLibraryMini/`，未设置时为 `~/.local/share/SkillLibraryMini/`

首次启动会从旧项目 `data/` **复制**已有个人文件到用户目录；旧文件不会删除或覆盖。桌面宿主可通过 `SKILL_LIBRARY_USER_DATA_DIR` 指定自己的用户数据目录，通过 `SKILL_LIBRARY_PROGRAM_DATA_ROOT` 指定随应用分发的默认资料目录。

## 刷新索引

优先运行：

```text
node ~/.codex/scripts/Update-SkillIndex.mjs --project-root <项目根目录>
```

旧的 `Update-SkillIndex.ps1` 仍保留，只在 Windows 且 Node 脚本不存在时作为兼容回退。服务本身不再强依赖 PowerShell。

## 启动与宿主边界

`server.mjs` 默认只启动本地 HTTP 服务。`startServer()` 是宿主可复用入口；`openBrowser(address)` 是可选行为：Windows 打开默认浏览器，macOS 使用 `open`，Linux 使用 `xdg-open`。只有显式传入 `--open` 才会触发浏览器打开。

未来 Electron、Tauri 或其他桌面宿主应：

1. 启动 `server.mjs`，将 `SKILL_LIBRARY_PORT=0` 以自动选择端口；
2. 从标准输出读取实际的本地地址；
3. 将地址加载进原生 WebView；
4. 在窗口退出时终止服务子进程；
5. 将程序默认资料与用户数据目录分别传入环境变量。

## 仍存在的平台差异

- Windows `.cmd`、`.vbs` 与 PowerShell 启动脚本仅是兼容入口，不适用于 macOS。
- 现有来源记录保留历史 Windows 本地路径，作为来源证据；不应批量改写为 macOS 路径。
- macOS 的文件权限、代码签名、应用图标和实际桌面宿主行为仍需在 macOS 机器上验证。

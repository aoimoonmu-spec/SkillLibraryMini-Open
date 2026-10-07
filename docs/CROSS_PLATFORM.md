# 跨平台状态

## 现有源码

当前本地服务使用 Node 的 `os.homedir()`、`path.join()` 与 `path.resolve()` 处理路径，可在 Windows 与 macOS 的 Node 环境中运行。Skill 扫描支持：

- `~/.codex/skills`
- `~/.agents/skills`
- 当前项目的 `.codex/skills`
- 当前项目的 `.agents/skills`

用户数据目录设计为：

- Windows：`%APPDATA%/SkillLibraryMini/`
- macOS：`~/Library/Application Support/SkillLibraryMini/`

索引刷新优先使用 `scripts/Update-SkillIndex.mjs`；旧 PowerShell 脚本仅作为 Windows 兼容回退。扫描结果完全动态，不依赖当前机器的 Skill 或 Pack 数量。

## 尚未完成的发布层

当前未接入 Electron、Tauri、Neutralino 或其他正式桌面宿主，也没有生成安装包。未来宿主应按 [Host Contract](../desktop/shared/HOST_CONTRACT.md) 启动服务、加载本地 URL、传入用户数据目录并在窗口关闭后退出服务。

Windows 已验证本地 Node 服务的现有功能；macOS 仍需在真实 macOS 环境中完成运行、文件权限、图标与打包验证。

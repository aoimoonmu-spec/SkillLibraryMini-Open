# macOS 安装（发布后）

> 当前尚未发布 DMG；以下是正式 Release 的目标流程。

1. 根据 Mac 芯片下载 `SkillLibraryMini-macOS-arm64.dmg` 或 `SkillLibraryMini-macOS-x64.dmg`。
2. 打开 DMG。
3. 将 **Skill Library Mini** 拖入 `Applications`。
4. 在“应用程序”中双击启动。

普通用户不需要安装 Node.js、npm、Rust、SDK、编译器或命令行工具。

首次启动会扫描：

- `~/.codex/skills`
- `~/.agents/skills`
- 当前项目目录下的 `.codex/skills`
- 当前项目目录下的 `.agents/skills`

正式发布前仍需处理 Apple Code Signing、Notarization 和 Gatekeeper；本轮只记录要求，不做签名或发布。

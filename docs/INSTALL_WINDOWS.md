# Windows 安装（发布后）

> 当前尚未发布安装包；以下是正式 Release 的目标流程。

## 安装版

1. 下载 `SkillLibraryMini-Windows-Setup-x64.exe`。
2. 双击运行安装程序。
3. 按安装向导完成安装；默认建议创建桌面快捷方式。
4. 从开始菜单或桌面打开 **Skill Library Mini**。

普通用户不需要安装 Node.js、npm、Rust、SDK、编译器或命令行工具。

## 默认扫描位置

首次启动会扫描：

- `%USERPROFILE%\\.codex\\skills`
- `%USERPROFILE%\\.agents\\skills`
- 当前项目目录下的 `.codex\\skills`
- 当前项目目录下的 `.agents\\skills`

若没有发现 Skill，App 应显示空状态和实际扫描位置；这不是安装失败。

不需要的用户可使用 [便携版说明](PORTABLE.md)。

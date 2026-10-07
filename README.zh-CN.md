# Skill Library Mini

[English](README.md) | [简体中文](README.zh-CN.md)

> 浏览、理解并整理你本地安装的 AI Agent Skills。

## 作为 Codex Skill 安装

Skill Library Mini v1 以 `skill-library` Codex Skill 加本地可视化 UI 的方式运行。将 `skill/skill-library` 目录安装为 Codex Skill 后，可直接对 Codex 说：

- 打开 Skill Library
- 整理我的 Skill Library
- 刷新 Skill Library
- 重新分析 `<Skill>`
- 为一个任务推荐可用的 Skill

该 Skill 会扫描本地 Skill 目录，把生成的 metadata 保存到系统用户数据目录，启动只监听本机回环地址的服务，并打开现有浏览器 UI。v1 不依赖 Electron。

## 功能

- 扫描本地 Codex、Agents 与项目级 Skill 目录
- 使用分类、搜索、收藏、最近查看、Pack、Suite 与详情浏览 Skill
- 保持原始 `SKILL.md` 只读
- 由 Codex 增量生成中文 metadata 与关系提示，不接入额外 AI API
- metadata 刷新时保留字段级人工修改

## 隐私与数据

- 默认在本地处理。
- 仓库不包含已安装的第三方 Skill、本地 Skill 索引、个人 metadata、收藏、浏览历史、手动覆盖或历史聊天证据。
- 应用不会上传 Skill 内容，也不会自动调用 AI API。
- 只有用户明确要求时，Codex 才会执行整理。

## 仓库结构

- `skill/skill-library/` — 可安装的 Skill、UI、server、scripts、schema 与安全默认数据
- `app/`、`server.mjs`、`scripts/` — 同一套本地 UI 的开发源码
- `data/defaults/`、`data/schemas/`、`data/examples/` — 仅包含可公开数据
- `desktop/` — 实验性桌面宿主源码，不是 v1 的分发路线

## 实验性桌面构建

Electron 与 Windows 打包仍处于实验状态，不是推荐安装方式，仅为后续评估保留。

## 第三方内容

仓库不再分发第三方 Skill 源文件或其 `SKILL.md`。实验性 Electron 的 manifest 与 lockfile 只记录可选构建依赖；不会提交 `node_modules` 或 runtime bundle。详见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## 贡献

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。不要提交本地 Skill 内容或用户数据。

## 许可证

License TBD：本仓库尚未选择开源许可证。

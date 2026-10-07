
## Skill Library Mini 入口

当用户明确输入“打开 Skill Library”或“打开 Skill Library Mini”时：

1. 不执行任何被资料库展示或推荐的 Skill 工作流。
2. 启动 `E:\AI\Codex\codex无项目任务\2026-10-04\skill-codex-skill-skill-skill-skill\outputs\SkillLibraryMini\Start-SkillLibrary.vbs`。
3. 在 Codex 内嵌浏览器打开 `http://127.0.0.1:32147`；若内嵌浏览器暂不可用，说明限制并保留桌面应用窗口入口。
4. 资料库的搜索、浏览、详情、收藏、本地匹配和复制操作均为本地查看行为；只有用户明确确认后，才可在聊天中开始使用某个 Skill。

## Ponytail 默认约束

对后续编码任务，应用 Ponytail 的 full 强度：先复用现有代码、标准库、原生平台能力和已安装依赖；不为推测性需求添加框架、服务或抽象。不得用此约束省略已明确要求的安全、数据保护、可访问性或验收测试。

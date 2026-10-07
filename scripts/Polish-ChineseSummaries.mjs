import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cachePath = path.join(root, 'data', 'intro-cache.json');
const summaries = {
  'opc-value-proposition':'为一人企业的候选客户群设计价值主张，并协助选出最有说服力的一条。',
  'opc-resource-audit':'从八个维度盘点创始人的资源、能力与可调用资产，作为一人企业起点。',
  'wewrite-learn':'从人工改稿、范文与公众号排版中沉淀写作偏好和可复用的风格资产。',
  'holo-card-studio':'把用户素材制作成可收藏的全息箔卡或双图翻转光栅卡。',
  'neat-freak':'在项目收尾时核对文档、规则与产物，整理可追溯的交付状态。',
  'taptap-qualification':'识别 TapTap 上架所需资质，准备非敏感材料草稿并处理增量提审或撤回。',
  'taptap-materials':'盘点本地游戏物料，并为上传 TapTap 做素材编排和准备。',
  'storage-analyzer':'只读分析 macOS 或 Windows 的磁盘空间占用，不删除任何文件。',
  'douyin-video-search':'按关键词检索抖音视频并返回可继续分析的结果。',
  'wewrite-rewrite':'把已有公众号文章实质改写为小红书图文或抖音口播，并检查与源稿的相似度。',
  'wewrite-topic':'结合热点、用户需求与历史表现，为公众号生成并排序可写的选题。',
  'wewrite-visual':'为公众号文章生成封面和必要配图，或只交付可复用的图片提示词。',
  'opc-dashboard-review':'用轻量指标、瓶颈分析与止损逻辑复盘一人企业的经营健康度。',
  'jev-browser-use':'通过 TypeSafe Jev 执行快速、可控的浏览器操作。',
  'douyin-blogger-analysis':'采集抖音博主内容、视频与截图，分析其创作方式和账号表现。',
  'guizang-social-card-skill':'制作归藏风格社交图卡、动态照片卡和素材优先的图文拼图版式。',
  'fashion-to-techpack':'把服装概念图、草图或参考款转成可供打样的技术包和开发说明。',
  'image':'为 Nano Banana 或 GPT Image 编写带模型、尺寸和质量建议的可直接使用图像提示词。',
  'hypit':'结合素材、脚本与生成组件，在 Hypit 中策划并制作视频内容。',
  'taptap-cli':'作为 TapTap 开发者后台的共享执行规范和业务路由总入口。',
  'mono-color':'将主题、句子或文章想法转成原创单色或受控双色的编辑视觉图。',
  'create-photo-flipbook-ui':'理解用户照片与风格需求后，制作本地可浏览的二维翻页相册界面。',
  'taptap-app-edit':'维护 TapTap 游戏资料、素材规格、包体槽位、审核、发布与版本历史。',
  'taptap-test-plan':'按 TapTap 规则准备并执行游戏测试计划。',
  'review-agent':'以只读方式审查指定代码变更，优先找出会导致缺陷的具体问题。',
  'expo-native-ui':'为 Expo 原生界面开发提供适配移动端的组件与实现约束。',
  'opc-mvp-designer':'为已选定的一人企业机会定义最小可验证实验和 MVP。',
  'opc-asset-ops':'把一人企业中可重复交付的成果沉淀为可复用、可复利的资产。',
  'taptap-asset-library':'检索和收录 TapTap 游戏图片素材，整理真实截图并做本地规则校验。',
  'wewrite-publish':'将 Markdown 排版为公众号预览，并仅在明确授权时推送草稿箱。',
  'taptap-publish-game':'按 TapTap 后台流程创建新的游戏条目并推进发布。',
  'songyue-marketingdx':'诊断中文营销方案的目标、逻辑与可执行性，找出关键缺口。',
  'wewrite-style':'完成公众号首次风格设置，或重新配置后续写作所用的风格规则。',
  'taptap-identity':'识别 TapTap 开发者身份、登录态、developerId、appId 与可操作资源。',
  'opc-orchestrator':'编排全部 OPC 阶段，按上下文把一人企业任务路由到对应 Skill。',
  'taptap-dashboard-stats':'查询 TapTap 开发者后台的游戏数据表现。',
  'xiaohongshu-search-full':'按关键词完整检索小红书笔记，提取正文、话题、图片等字段。',
  'opc-conversion-loop':'从触达、线索获取到购买，设计一人企业的转化闭环。',
  'seo-geo':'同时优化网站的传统搜索可见性与生成式 AI 搜索表达。',
  'wewrite-review':'核对文章的事实、观点、实用性和账号声音，改稿复审后才放行成稿。',
  'wewrite-write':'在选题确定后完成公众号文章任务书、证据主张、素材整理与初稿。',
  'xiaohongshu-note-detail':'按笔记 ID 读取小红书笔记详情、作者信息和评论。',
  'opc-business-model-design':'用精简版商业模式画布为一人企业设计可行的收入与交付结构。',
  'opc-niche-positioning':'结合市场地图与客户细分，寻找并定位可行的细分市场。',
  'travel-memory-card-duo':'把一张用户旅行或生活照片转成一组相互呼应的双图记忆卡。',
  'xiaohongshu-user-profile':'按用户 ID 读取小红书用户资料及其已发布笔记列表。',
  'wewrite-stats':'回填公众号文章阅读、分享和点赞数据，并给出选题、标题与框架调整建议。',
  'skill-installer':'从精选列表或 GitHub 仓库路径安装 Codex Skill。',
  'travel-memory-sticker-card':'把用户照片转成一张横向、带安静编辑插画风格的旅行记忆贴纸卡。',
  'find-skills':'在用户寻找现成能力时发现合适的 Agent Skill，并给出安装建议。',
  'leos-six-department-directing-team-skill-v1':'为 AI 长片、剧集与叙事视频提供六角色导演协作方法。',
  'taptap-package-management':'诊断 TapTap 游戏包体管理问题，并提供自测入口。'
};
const cache = JSON.parse(await readFile(cachePath, 'utf8'));
let updated = 0;
for (const [id, oneLine] of Object.entries(summaries)) {
  const entry = cache.entries?.[id];
  if (!entry?.intro) continue;
  if (entry.intro.oneLine !== oneLine) { entry.intro.oneLine = oneLine; entry.polishedAt = new Date().toISOString(); updated += 1; }
}
await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
console.log(JSON.stringify({ updated, requested: Object.keys(summaries).length }));

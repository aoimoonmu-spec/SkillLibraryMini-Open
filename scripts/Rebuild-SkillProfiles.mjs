import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const indexPath = process.env.SKILL_INDEX_PATH || path.join(os.homedir(), '.codex', 'SKILL_INDEX.json');
const cachePath = new URL('../data/intro-cache.json', import.meta.url);
const labels = { visual:'图片 / 视觉设计', media:'视频 / 音频', web:'网页 / APP 开发', game:'游戏开发', research:'学习 / 研究', writing:'写作 / 内容创作', automation:'效率 / 自动化', data:'数据 / 分析', engineering:'编程 / 工程', agent:'AI / Agent 工具', business:'商业 / 运营', other:'其他 / 未分类' };
const groups = {
  visual:'imagegen,image,holo-card-studio,guizang-social-card-skill,guizang-ppt-skill,mono-color,create-photo-flipbook-ui,baoyu-article-illustrator,wewrite-visual,travel-memory-card-duo,travel-memory-sticker-card,fashion-to-techpack,awesome-design-md-picker,frontend-design',
  media:'video,hypit,leos-six-department-directing-team-skill-v1,douyin-video-search,douyin-blogger-analysis',
  web:'vercel-react-native-skills,expo-native-ui,ui-image-to-code,screenshot-to-code,screenshot-to-html,gzh-design-skill',
  game:'taptap-qualification,taptap-materials,taptap-cli,taptap-app-edit,taptap-test-plan,taptap-asset-library,taptap-publish-game,taptap-identity,taptap-dashboard-stats,taptap-package-management',
  research:'cangjie-skill,reading-metaskill,hv-analysis,xhs-research,xiaohongshu-search-full,xiaohongshu-note-detail,xiaohongshu-user-profile,aihot,douyin-blogger-analysis,judgment-training,rational-buddhism',
  writing:'wewrite,wewrite-learn,wewrite-rewrite,wewrite-topic,wewrite-publish,wewrite-review,wewrite-write,wewrite-style,wewrite-stats,khazix-writer,humanizer-zh,markdown-pdf-skill',
  automation:'jev-browser-use,storage-analyzer,neat-freak,opc-asset-ops,review-agent',
  data:'opc-dashboard-review',
  engineering:'skill-creator,skill-installer,openai-docs,find-skills',
  agent:'leader,opc-orchestrator',
  business:'opc-value-proposition,opc-resource-audit,opc-mvp-designer,opc-conversion-loop,opc-business-model-design,opc-niche-positioning,chestnut-geo,seo-geo,songyue-insight,songyue-marketingdx,principal-agent,creative-director,long-term-compounding,productize-yourself,wealth-structure,hourly-rate-time',
};
const categoryById = Object.fromEntries(Object.entries(groups).flatMap(([category, csv]) => csv.split(',').map((id) => [id, category])));
const names = Object.fromEntries([
  ['imagegen','AI 图像生成与编辑'],['image','图像提示词设计'],['holo-card-studio','全息与光栅卡片制作'],['creative-director','创意概念策划与审稿'],['chestnut-geo','AI 搜索可见性诊断'],['storage-analyzer','磁盘空间只读分析'],['video','AI 视频导演与提示词'],['hypit','视频创意制作'],['ui-image-to-code','界面截图转可编辑前端代码'],['screenshot-to-code','截图转响应式前端代码'],['screenshot-to-html','截图高保真 HTML 还原'],['frontend-design','前端界面视觉设计'],['awesome-design-md-picker','界面视觉方向选择器'],['skill-creator','Codex Skill 创建与维护'],['skill-installer','Codex Skill 安装'],['find-skills','Skill 发现与安装建议'],['openai-docs','Codex 与 OpenAI 官方文档查询'],['jev-browser-use','浏览器操作自动化'],['review-agent','代码审查代理'],['mono-color','原创单色视觉生成'],['create-photo-flipbook-ui','照片翻页书界面制作'],['baoyu-article-illustrator','文章配图规划与生成'],['fashion-to-techpack','服装设计稿转技术包'],['guizang-social-card-skill','社交媒体图卡制作'],['guizang-ppt-skill','网页演示文稿制作'],['markdown-pdf-skill','Markdown 排版导出 PDF'],['aihot','AI 新闻查询'],['songyue-insight','消费者洞察挖掘'],['songyue-marketingdx','中文营销方案诊断'],['seo-geo','网站 SEO 与 AI 搜索优化'],['xhs-research','小红书调研'],['xiaohongshu-search-full','小红书笔记搜索'],['xiaohongshu-note-detail','小红书笔记与评论读取'],['xiaohongshu-user-profile','小红书用户资料读取'],['douyin-video-search','抖音视频搜索'],['douyin-blogger-analysis','抖音博主分析'],['leader','Agent 任务书编写'],['neat-freak','知识与项目收尾治理'],['opc-orchestrator','一人企业流程编排'],['cangjie-skill','长内容蒸馏为可执行能力'],['gzh-design-skill','公众号文章 HTML 排版'],['expo-native-ui','Expo 原生界面开发'],['vercel-react-native-skills','React Native 与 Expo 开发规范'],['leos-six-department-directing-team-skill-v1','AI 叙事视频导演协作'],['travel-memory-card-duo','旅行记忆双图卡制作'],['travel-memory-sticker-card','旅行记忆贴纸卡制作'],['taptap-app-edit','TapTap 游戏资料维护'],['taptap-asset-library','TapTap 游戏素材库管理'],['taptap-cli','TapTap 命令行协作规范'],['taptap-dashboard-stats','TapTap 后台数据查询'],['taptap-identity','TapTap 开发者身份与资源识别'],['taptap-materials','TapTap 本地物料盘点'],['taptap-package-management','TapTap 包体管理诊断'],['taptap-publish-game','TapTap 新游戏创建与发布'],['taptap-qualification','TapTap 上架资质准备'],['taptap-test-plan','TapTap 游戏测试计划']
]);
const featured = {
  'frontend-design': { oneLine:'为新界面或现有界面重塑明确的视觉方向、排版层级与非模板化细节。', tags:['UI设计','信息层级','视觉精修','前端'], suitable:['需要优化卡片布局、视觉层级、字体与留白的现有界面。'], unsuitable:['不替代具体业务数据整理，也不负责把 Skill 文档批量分类。'], limitations:['提供设计判断与自检方法；实现仍需在项目代码中完成。'] },
  'skill-creator': { oneLine:'用于创建或维护 Codex Skill 的说明、边界与配套资源，适合核对 Skill 元数据应如何被准确表达。', tags:['Skill管理','文档结构','Codex','规范'], suitable:['需要审视 Skill 描述、能力边界和使用说明的结构时。'], unsuitable:['不直接批量替 Skill Library 写入分类，也不负责 UI 视觉精修。'], limitations:['其目标是 Skill 本体维护；资料库的数据整理仍需要逐条核对原始文档。'] },
  'ui-image-to-code': { oneLine:'将授权的界面截图、设计图或网站视觉转成可编辑前端代码，并以视觉一致性为目标反复校验。', tags:['UI还原','前端开发','截图转代码','视觉校验'], suitable:['已有明确的卡片截图或设计参考，需要高保真还原或修正实现时。'], unsuitable:['不整理 Skill 中文资料，也不适合没有视觉参考的纯数据分类任务。'], limitations:['需要授权的界面参考；不应读取不可见源码或复刻未授权界面。'] },
  'screenshot-to-html': { oneLine:'把界面截图转为高保真、可编辑的 HTML，适合以明确视觉参考修复页面结构。', tags:['HTML','UI还原','高保真复刻'], suitable:['已有卡片或页面截图，且目标是还原布局和样式时。'], unsuitable:['不负责 Skill 内容分类、中文说明与推荐策略。'], limitations:['效果取决于参考图清晰度；不是通用视觉策略工具。'] },
  'screenshot-to-code': { oneLine:'从网站或 App 截图识别组件与布局，并生成可工作的响应式前端代码。', tags:['UI还原','React','响应式'], suitable:['有截图并希望将界面结构落到代码时。'], unsuitable:['不做 Skill 数据治理或中文资料提炼。'], limitations:['需要明确视觉输入；生成结果仍需在目标项目中验证。'] },
};
const qa = {
  'acceptance':{name:'困境三选项：改变、接受或离开',oneLine:'帮助在难以改变的处境中辨别该行动、离开还是停止内耗并真正接受。'},
  'game-selection':{name:'识别攀比与地位游戏',oneLine:'用零和地位、正和财富与内在单人游戏的框架处理攀比、妒忌与外部评价。'},
  'principal-agent':{name:'利益绑定与委托代理判断',oneLine:'分析职业、组织和合作中“谁承担后果、谁获得收益”，判断激励是否真正绑定。'},
  'creative-director':{name:'创意概念策划与审稿',oneLine:'用结构化创意方法从 brief 中提炼洞察、生成概念并反复审稿优化。'},
  'judgment-training':{name:'长期判断力训练',oneLine:'以基础学科、心智模型和长期后果训练方向判断，而不是给出即时执行步骤。'},
  'happiness-skill':{name:'幸福与欲望管理',oneLine:'通过减少欲望契约、活在当下和习惯训练，处理持续的不满足与焦虑。'},
  'naval-almanack-single':{name:'《纳瓦尔宝典》全书咨询路由',oneLine:'作为《纳瓦尔宝典》财富、判断、幸福与人生议题的总入口，再路由到具体能力卡。'},
  'decision-heuristics':{name:'重大选择决策启发式',oneLine:'用“无法决定先答否”和短期痛苦原则，处理长期锁定型人生选择。'},
  'screen-detox':{name:'屏幕使用与多巴胺戒断',oneLine:'识别消费型屏幕活动的触发与替代习惯，制定不影响工作屏幕的戒断方法。'},
  'long-term-compounding':{name:'长期复利合作判断',oneLine:'用信任、声誉与正和博弈判断项目和合作是否值得长期投入。'},
  'productize-yourself':{name:'个人优势产品化定位',oneLine:'从特殊知识、责任感与杠杆中识别可规模化的个人职业或副业方向。'},
  'honesty-communication':{name:'诚实沟通与反馈边界',oneLine:'用事实优先、具体表扬与一般批评，处理拒绝、反馈和不想说场面话的沟通。'},
  'naval-almanack':{name:'《纳瓦尔宝典》主题路由',oneLine:'用于查询本书概览或尚未拆成独立 Skill 的幸福、关系、哲学与人生主题。'},
  'wealth-structure':{name:'财富结构与杠杆判断',oneLine:'用责任、产权、杠杆与避免出局的框架审视收入结构和商业选择。'},
  'peer-selection':{name:'同伴与关系圈选择',oneLine:'用价值观、长期共事与“最常接触五人”的原则审视朋友、伴侣和圈子。'},
  'guizang-ppt-skill':{name:'横向网页演示文稿制作',oneLine:'生成带演讲者视图、动效和主题模板的单文件横向翻页 HTML 演示文稿。'},
  'identity-work':{name:'身份认知与自我形象重塑',oneLine:'通过放下固有身份看清现实，并用新的自我形象替代短期意志力对抗。'},
  'life-meaning':{name:'生命意义与存在困惑梳理',oneLine:'围绕个人创造意义、愿意承担的痛苦与死亡意识，讨论虚无感和人生方向。'},
  'monkey-mind-meditation':{name:'冥想与反刍思维观察',oneLine:'把失控的内心独白当作可观察对象，以“调试模式”练习专注和冥想。'},
  'self-liberation':{name:'期望边界与情绪解放',oneLine:'区分他人期望与真实约定，处理愤怒、取悦他人与时间自主权。'},
  'markdown-pdf-skill':{name:'Markdown 专业 PDF 排版',oneLine:'将含中文、表格、图片和分页要求的 Markdown 导出为经过版式与渲染校验的 PDF。'},
  'hourly-rate-time':{name:'时间资产与外包决策',oneLine:'以个人时薪和时间成本筛选琐事、外包选择与生活方式升级。'},
  'rational-buddhism':{name:'可证伪的信念与内在练习',oneLine:'用亲自测试与可证伪性判断玄学或灵修主张，同时保留经验证有益的内在练习。'}
  ,
  'awesome-design-md-picker':{name:'界面视觉风格选择器',oneLine:'先以本地可视化选择器比较界面风格，再由用户确定唯一的 DESIGN.md 设计方向。',sourceDescription:'为尚未确定视觉方向的网页或 App 提供风格预览与人工选择流程；选定后以对应 DESIGN.md 指导实现。',capabilities:['提供本地视觉选择器，让用户比较 UI、网站或 App 的设计语言。','等待用户明确选中风格后，读取该风格对应的 DESIGN.md。','将选定设计系统用于后续界面实现，同时保留项目原有功能与品牌约束。'],suitable:['尚未确定 UI 视觉方向，且希望先比较可见选项再做设计决策。'],unsuitable:['用户已经指定具体设计风格，或任务与界面视觉设计无关时。'],limitations:['它只负责让用户选择视觉方向，不会自行替项目改版或决定风格。','首次使用可能需要本地准备公开设计资料；不需要付费 API。'],examples:['“为这个新 App 展示几个可选的界面视觉方向，我来选。”'],usage:'在 Codex 中引用该 Skill，打开本地选择器并等待用户点击确认，再读取所选 DESIGN.md。',prerequisites:'需要用户在可视化选择器中作出明确选择。'},
  'baoyu-article-illustrator':{name:'文章插图策划与生成',oneLine:'按文章结构定位最值得配图的位置，并用“类型 × 风格 × 配色”统一规划和生成插图。',sourceDescription:'先分析文章论点和段落，再确定配图位置、视觉类型与统一风格；默认在出图前让用户确认方案。',capabilities:['识别文章中需要信息图、场景图、流程图、对比图等视觉辅助的位置。','用类型、风格、配色三维组合规划整组插图，并为每张图保存可复现的提示词文件。','根据当前运行环境选择可用的原生图像生成能力；在生成前默认要求用户确认。'],suitable:['需要为长文、教程或方法论文章规划一组风格一致的插图时。'],unsuitable:['只需一张独立图片、无需分析文章结构，或不希望进行任何图像生成时。'],limitations:['需要可用的栅格图像生成能力；找不到可用后端时会暂停询问。','不以 SVG、HTML 或 Canvas 代替应生成的栅格插图。'],examples:['“分析这篇教程，给出 3 张配图的位置、用途和统一视觉方案。”'],usage:'提供文章文件或正文；先确认插图方案，再生成并交付带提示词记录的图片。',prerequisites:'需要文章内容；实际生成前需要用户确认，可能取决于当前可用图像后端。'},
  'cangjie-skill':{name:'长内容蒸馏为可执行能力',oneLine:'把书籍、课程或长视频文字稿中的方法论拆成可验证、可复用的 Skill 能力包。',sourceDescription:'面向书籍、课程、播客和长视频转写等长内容，提炼其中的方法论、决策框架与原则，并编译为可调用能力。',capabilities:['按整书理解、并行提取、三重验证、能力卡构造和压力测试的流程蒸馏长内容。','保留候选、淘汰原因、术语表和阶段状态，支持审计与中断后续跑。','把能力包编译为单入口或少量独立 Skill，并执行格式与引用校验。'],suitable:['希望把已提供文本的书籍、课程、访谈或转写稿转成长期可复用能力时。'],unsuitable:['只需要摘要、书评，或没有原文而希望凭记忆提炼内容时。'],limitations:['必须提供可访问的内容文本、元信息和使用目的；首次使用建议先试点一份内容。','输出 Skill 前要经过验证与压力测试，不是快速摘要流程。'],examples:['“把这本书的 PDF 蒸馏为一个可调用的能力包，并保留验证轨迹。”'],usage:'提供内容文件、标题作者或发布信息与使用目的；按阶段确认后再编译交付。',prerequisites:'需要原文或可访问转写文本，不接受仅凭记忆蒸馏。'},
  'chestnut-geo':{name:'AI 搜索可见性与 GEO 诊断',oneLine:'审计 AI 如何理解、提及和推荐专家型品牌，并据此制定关键词与内容修正方向。',sourceDescription:'针对小企业、自由职业者和知识服务品牌，先以公开证据诊断 AI 搜索认知，再形成可执行的 GEO 关键词与内容策略。',capabilities:['收集官网、社媒、第三方提及与竞品证据，梳理品牌当前的语义足迹。','在可访问平台上批量审计 AI 回答，区分“知道品牌”“关联专业能力”“商业推荐”和“可信证明”。','生成关键词地图、诊断报告、待确认的定位问题，以及校准后的执行与复测方案。'],suitable:['想确认 AI 搜索或聊天产品是否能正确理解、引用或推荐自己的服务、品牌或专业能力时。'],unsuitable:['只想做传统关键词堆砌、保证排名，或缺少任何可公开核实的品牌信息时。'],limitations:['不承诺 AI 推荐、排名或曝光结果；登录、验证码和平台限制可能需要用户协助。','不使用虚假评价、伪造引用或黑帽操纵。'],examples:['“审计 ChatGPT、DeepSeek 等是否把我的咨询服务和正确专业关键词关联起来。”'],usage:'提供品牌名称、网站或主页和目标市场；先完成证据诊断，再与用户校准策略。',prerequisites:'需要可公开检索的品牌线索；跨平台采集可能受登录或访问限制。'},
  'imagegen':{name:'AI 位图图像生成与编辑',oneLine:'生成或修改照片、插画、纹理、素材图与透明抠图；默认使用 Codex 内置图像能力。',sourceDescription:'用于需要新建或编辑栅格图像的项目视觉资产，区分全新生成与保留原图要素的编辑。',capabilities:['生成项目所需的照片、插画、产品图、素材图、UI 模拟图和透明背景图。','编辑当前对话中可见的图片；本地编辑目标需先加载查看后再进入内置编辑流程。','为多张不同资产分别组织提示词并检查主题、构图、文字与约束是否符合要求。'],suitable:['需要可交付的位图视觉资产，或要对现有图片进行改图、换背景、去物和透明抠图时。'],unsuitable:['需要保持现有 SVG、图标库或代码原生图形一致性，或仅需简单 HTML/CSS 图形时。'],limitations:['默认内置工具不需要 OPENAI_API_KEY；只有用户明确选择 CLI/API 备用路径时才需要该密钥。','项目引用的最终图片必须移动或复制到项目目录；默认不覆盖已有资产。'],examples:['“生成一张透明背景的产品剪影，并保存为项目的新素材版本。”'],usage:'说明是生成还是编辑、目标用途、约束及参考图角色；生成后检查结果再交付。',prerequisites:'编辑本地图片时需先在当前对话中加载；CLI 备用模式需用户明确确认。'},
  'openai-docs':{name:'OpenAI 与 Codex 官方文档查询',oneLine:'围绕 Codex、OpenAI 产品和 API，优先检索并引用当前官方文档回答具体问题。',sourceDescription:'为 Codex、ChatGPT Work、OpenAI API、模型、SDK、Agent、评测和产品设置提供当前且可引用的官方资料。',capabilities:['先按用户的具体问题检索并打开官方 OpenAI 页面，再给出有来源的答复。','处理 Codex 设置、模型、价格、自动化、故障排查，以及 API、SDK、Agent、评测和模型迁移问题。','根据任务只加载一条必要的专业路径，避免无关文档与非官方来源。'],suitable:['需要当前、可引用的 Codex 或 OpenAI 产品/API 事实、配置或迁移指引时。'],unsuitable:['普通的软件开发问题仅顺带提到 Codex，或不需要 OpenAI 官方资料时。'],limitations:['只以 OpenAI 官方文档站点为来源；未被官方资料证实的价格、资格或可用性会明确保留不确定性。'],examples:['“查阅官方文档，说明这个 Codex 设置项当前如何配置。”'],usage:'提出明确的 OpenAI 或 Codex 问题；Skill 会先检索对应官方页面再回答。',prerequisites:'需要能访问官方文档；不需要 API 密钥来做只读资料查询。'},
  'vercel-react-native-skills':{name:'React Native 与 Expo 性能规范',oneLine:'为 React Native 与 Expo 项目提供列表、动画、导航、原生模块和渲染性能的实现准则。',sourceDescription:'一套按优先级整理的 React Native 与 Expo 工程实践，用于移动端 UI、性能优化与原生能力接入。',capabilities:['针对大列表虚拟化、列表项缓存、图片加载和渲染开销提供优先级最高的性能规则。','覆盖动画 GPU 属性、Reanimated、导航、Safe Area、图片、菜单和原生弹窗等 UI 实现模式。','补充状态订阅、渲染条件、字体与原生依赖配置、monorepo 组织等工程约束。'],suitable:['开发 React Native 或 Expo App，尤其需要优化列表、动画、媒体、原生模块或移动端 UI 时。'],unsuitable:['纯 Web 项目、没有 React Native/Expo 技术栈，或只需要视觉灵感而不涉及移动端实现时。'],limitations:['它提供规则与示例，不会替项目自动完成性能测量或原生构建验证。','具体规则需按任务读取对应文件，不能仅凭目录名推断。'],examples:['“检查这个 Expo 列表的渲染和图片加载，按优先级给出可执行优化。”'],usage:'在 React Native/Expo 任务中引用该 Skill，再按涉及领域读取对应规则文件。',prerequisites:'适用于 React Native 或 Expo 项目；原生模块修改仍需在目标平台构建验证。'},
  'video':{name:'AI 视频导演、分镜与提示词',oneLine:'把已有脚本或场景转成可生成的 AI 视频分镜、镜头表与模型适配提示词。',sourceDescription:'面向 Seedance、Kling、Veo 等 AI 视频任务，结合导演、编剧与剪辑方法组织镜头、连续性、灯光、声音与节奏。',capabilities:['将已有场景或脚本整理为单条提示词、多镜头提示词、分镜表、提示词审计或导演阐述。','按目标模型读取对应规则，处理镜头语言、角色连续性、运镜、灯光、声音和时长约束。','在输出前检查戏剧结构、镜头职责和每个镜头的具体细节，避免只有漂亮画面的空泛提示。'],suitable:['已有故事、脚本或场景，需要为 AI 视频生成器制作镜头设计、分镜或模型化提示词时。'],unsuitable:['只有模糊创意、尚无脚本或场景时；此时文档要求先走创意概念与脚本开发。'],limitations:['不同视频模型有各自语法和能力边界，需按用户指定或任务线索选择一种模型规则。','该 Skill 负责导演与提示词工作，不保证外部视频生成平台的成片质量或可用性。'],examples:['“把这段广告脚本拆成适用于 Kling 的 6 个连续镜头提示词。”'],usage:'提供已有场景、脚本或待审提示词，并说明目标模型；按规定阅读对应模型资料后产出。',prerequisites:'需要已有叙事素材或明确镜头目标；指定模型时需遵循其专属提示词规则。'}
};
const purpose = { visual:'视觉素材生成、编辑或视觉方向设计', media:'视频、音频或影像内容制作', web:'网页或 App 界面实现与还原', game:'TapTap 游戏开发者后台相关流程', research:'资料检索、阅读或研究分析', writing:'中文内容创作、改写、编辑或发布', automation:'本地流程、浏览器或项目整理自动化', data:'经营数据复盘与指标分析', engineering:'Codex Skill、官方文档或工程流程维护', agent:'Agent 任务拆解与编排', business:'商业定位、营销、转化或经营决策' };
const scenarios = { visual:'需要产出或审视视觉资产与视觉方向', media:'需要规划、检索或制作影像内容', web:'需要实现、还原或优化网页与 App 界面', game:'需要处理 TapTap 游戏资料、包体、测试或发布流程', research:'需要收集资料、分析平台内容或学习方法', writing:'需要完成文章、选题、改写、审稿或公众号发布', automation:'需要执行可重复的本地操作、浏览器操作或项目收尾', data:'需要根据已取得的数据做指标解读', engineering:'需要维护 Skill、查询官方产品资料或处理工程规范', agent:'需要把工作拆成可执行的 Agent 任务', business:'需要完成商业定位、价值主张、营销或增长判断', other:'原始文档未足以可靠判断主用途' };
function clean(text='') { return String(text).replace(/\s+/g,' ').replace(/^[-|>\s]+/,'').replace(/^["']+|["']+$/g,'').trim(); }
function headings(raw) { return [...raw.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m)=>clean(m[1])).filter(Boolean).slice(0,6); }
function docDescription(raw) { const match=raw.match(/^description:\s*(?:\|\s*)?\n?([\s\S]*?)(?=\n(?:source_|tags:|related_skills:|license:|metadata:|---)|\n---)/m); return clean(match?.[1] || ''); }
function hash(skill, raw) { return createHash('sha256').update(`${skill.id}\0${raw}`).digest('hex').slice(0,20); }
function category(skill) { return categoryById[skill.id] || 'other'; }
function chineseName(skill) { if (names[skill.id]) return names[skill.id]; if (/[\u4e00-\u9fff]/.test(skill.display_name || '')) return clean(skill.display_name).replace(/^.+?—\s*/, ''); return `${skill.name}（${labels[category(skill)]}）`; }
function build(skill, raw) {
  const c = category(skill); const special = featured[skill.id]; const title = chineseName(skill); const source = docDescription(raw) || clean(skill.description) || clean(raw.split(/\r?\n/).find((line)=>line && !line.startsWith('#') && !line.startsWith('---')));
  const tags = special?.tags || [labels[c], ...(c==='web'?['前端开发','界面实现']:c==='business'?['商业分析','项目规划']:c==='research'?['资料整理','研究']:c==='writing'?['内容创作','编辑']:c==='game'?['TapTap','游戏运营']:c==='agent'?['Agent管理','任务拆解']:c==='automation'?['自动化','本地工具']:c==='visual'?['视觉设计','素材处理']:c==='media'?['视频制作','内容生产']:c==='engineering'?['Skill管理','工程规范']:c==='data'?['数据分析']:[])];
  const checked = qa[skill.id];
  const derived = clean(source.split(/[。.!！]/)[0]).slice(0,120);
  return { originalName:skill.name, chineseName:checked?.name || title, oneLine:checked?.oneLine || special?.oneLine || derived || `原始 SKILL.md 未提供可用的简短摘要；请在详情中查看能力边界。`, category:c, tags:[...new Set(tags)].slice(0,6), capabilities:checked?.capabilities || (headings(raw).length ? headings(raw).map((item)=>`原始文档章节：${item}`) : [source || '原始文档未明确说明。']), suitable:checked?.suitable || special?.suitable || [scenarios[c]], unsuitable:checked?.unsuitable || special?.unsuitable || ['与该 Skill 的主用途不一致时不应使用；请以原始 SKILL.md 为准。'], limitations:checked?.limitations || special?.limitations || ['资料库只展示说明，不会执行文档中的命令。','原始文档未明确说明的能力不作推断。'], examples:checked?.examples || [`“请先读取 ${skill.name} 的实际 SKILL.md，再判断是否适合当前任务。”`,`“请使用 ${skill.name} 完成与其主用途一致的工作，并说明前提与限制。”`], usage:checked?.usage || `在 Codex 中明确引用 ${skill.name}，先读取实际 SKILL.md 后再执行。`, prerequisites:checked?.prerequisites || '请以原始 SKILL.md 中的依赖、账号、API 与费用说明为准。', sourceDescription:checked?.sourceDescription || source || '原始文档未明确说明。' };
}
const index = JSON.parse(await readFile(indexPath,'utf8')); const previous = JSON.parse(await readFile(cachePath,'utf8'));
const entries = {}; let rewritten=0;
for (const skill of index.skills) { const file=skill.paths.find((p)=>existsSync(p.skill_md))?.skill_md; const raw=file?await readFile(file,'utf8'):''; entries[skill.id]={ fingerprint:hash(skill,raw), generatedAt:new Date().toISOString(), intro:build(skill,raw) }; rewritten++; }
await writeFile(cachePath, JSON.stringify({version:3, generatedAt:new Date().toISOString(), qualityPass:'manual-taxonomy-v1', rewritten, entries},null,2),'utf8');
console.log(JSON.stringify({processed:index.skills.length,rewritten,previousVersion:previous.version}));

// DeerFlow 源码精讲 · 8 卷 20 章。slug 规则 df{卷}-c{章}。
// 基于 bytedance/deer-flow v2.1.0 真实源码逐文件分析。
export const VOLUMES = [
  {
    id: 'df0',
    index: 0,
    title: '导论：全景架构与工程骨架',
    subtitle: 'Landscape & Skeleton',
    theme: '先把 deer-flow 这个「LangGraph-based agent system」看成一个整体：它是什么、版本与定位、monorepo 怎么切分、技术栈选型，以及一条命令背后 make/serve/docker 是怎么把前后端 + 沙箱拉起来的。',
    chapters: [
      { slug: 'df0-c1', title: 'DeerFlow 是什么：定位、版本与整体架构', topic: '全景', hook: '它不是「planner→researcher→coder」的老式多 agent，而是一个 lead agent + 中间件栈 + subagents + sandbox 的工业级 harness。先建立整体架构心智图。', minutes: 90, hasContent: true },
      { slug: 'df0-c2', title: 'Monorepo 结构与技术栈：backend / harness / frontend', topic: '结构', hook: 'uv workspace 把 backend 拆成 app（gateway 应用）与 packages/harness/deerflow（可复用内核）；前端是 Next.js App Router。逐目录看清职责边界。', minutes: 90, hasContent: true },
      { slug: 'df0-c3', title: '构建与运行体系：Makefile、serve.sh、langgraph.json 与 Docker', topic: '运行', hook: '`make dev` 背后发生了什么？langgraph.json 如何把 graph、auth、checkpointer 三个入口点声明给运行时？pyproject / package.json 的依赖说明了架构选型。', minutes: 90, hasContent: true },
    ],
  },
  {
    id: 'df1',
    index: 1,
    title: '后端网关层：FastAPI Gateway',
    subtitle: 'The FastAPI Gateway',
    theme: 'gateway 是一个套在 LangGraph 运行时之上、对外兼容 LangGraph Platform 协议的 FastAPI 应用。看它如何启动、如何把一个 run 请求变成 SSE 流，以及四层鉴权怎么 fail-closed。',
    chapters: [
      { slug: 'df1-c1', title: '启动与生命周期：create_app、lifespan 与运行时单例', topic: '启动', hook: 'create_app 注册中间件与 18 个路由；lifespan 里 langgraph_runtime 用 AsyncExitStack 依次拉起 StreamBridge / checkpointer / store / RunManager。顺序即不变量。', minutes: 120, hasContent: true },
      { slug: 'df1-c2', title: 'SSE 流式链路：从 /runs/stream 到 StreamBridge 再到浏览器', topic: '流式', hook: '一个 run 如何变成 text/event-stream？router→start_run→后台 run_agent（生产者）→StreamBridge→sse_consumer（消费者）。逐函数追踪事件、心跳与断线重连。', minutes: 150, hasContent: true },
      { slug: 'df1-c3', title: '鉴权体系：AuthMiddleware、JWT、CSRF 与内部可信调用', topic: '安全', hook: 'AuthMiddleware 对非公共路径 fail-closed；JWT 用 token_version 实现「改密即吊销」；CSRF 双提交 Cookie；internal token 让 IM 渠道 worker 可信代用户行事。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'df2',
    index: 2,
    title: 'Agent 核心：工厂与中间件栈',
    subtitle: 'Agent Core: Factory & Middleware Stack',
    theme: 'deer-flow 的「智能」不在某个 god class，而在 langchain.agents.create_agent 这个底座之上叠的两层工厂与二十余个 AgentMiddleware。这是全课程最该读懂的一层。',
    chapters: [
      { slug: 'df2-c1', title: '两层工厂：create_deerflow_agent 与 make_lead_agent', topic: '工厂', hook: 'config-free 的 SDK 工厂 vs config-driven 的 App 工厂，中间隔着原始 create_agent。两条装配路径并不连通——这是最容易讲错的点。', minutes: 120, hasContent: true },
      { slug: 'df2-c2', title: '中间件栈：二十余个 AgentMiddleware 逐个拆解', topic: '中间件', hook: 'ToolOutputBudget、Sandbox、Summarization、Memory、Subagent、LoopDetection、Clarification……每个 middleware 实现哪个 hook、解决什么问题、为什么排在这个位置。', minutes: 180, hasContent: true },
      { slug: 'df2-c3', title: 'ThreadState 与记忆子系统：状态、reducer 与异步写回', topic: '状态', hook: 'ThreadState 给每个 state 字段配 reducer（sandbox_id 冲突直接 fail-closed）；记忆按 user×agent 隔离，after_agent 入队 + LLM 异步去抖动归纳，永不阻塞请求路径。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'df3',
    index: 3,
    title: 'Subagents 与工具体系',
    subtitle: 'Subagents & Tools',
    theme: 'lead agent 通过 task 工具把子任务委派给 subagent；工具则统一用 LangChain BaseTool 组织，并能动态接入 MCP。看清 agent→tool→subagent 这条调用链。',
    chapters: [
      { slug: 'df3-c1', title: '工具体系：BaseTool、内置工具目录与 MCP 动态接入', topic: '工具', hook: '工具如何定义、注册、按 skill 策略过滤；tool_search 如何把海量 MCP 工具「延迟暴露」给模型以省 token。', minutes: 120, hasContent: true },
      { slug: 'df3-c2', title: 'Subagents：registry、executor、task 工具与委派调用链', topic: '委派', hook: 'general_purpose / bash_agent 等 subagent 如何定义；task 工具如何 spawn 并运行一个子 agent；token_collector 与 status_contract 怎么把子 agent 的进度回传父 agent。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'df4',
    index: 4,
    title: 'Sandbox：沙箱执行体系',
    subtitle: 'The Sandbox',
    theme: 'agent 的一切 bash / 文件操作都落到一个 Sandbox 实例上。看 Sandbox/Provider 抽象、本地沙箱与容器化 aio-sandbox 的取舍，以及「本地沙箱不是安全边界」这一核心安全论断。',
    chapters: [
      { slug: 'df4-c1', title: 'Sandbox 抽象与 Provider：本地沙箱 vs 容器化 aio-sandbox', topic: '抽象', hook: 'Sandbox 接口（execute_command/read/write/glob/grep）、SandboxProvider 按 thread 发 id；LocalSandbox 靠路径映射模拟虚拟路径，AioSandbox 靠容器 bind-mount 真隔离。', minutes: 150, hasContent: true },
      { slug: 'df4-c2', title: '安全模型与注入：host bash 门控、路径校验与 SandboxMiddleware', topic: '安全', hook: 'is_host_bash_allowed 为什么默认禁本地 bash；路径白名单 + relative_to 逃逸检查 + 输出遮蔽；SandboxMiddleware 如何懒初始化并把 sandbox_id 写回 state。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'df5',
    index: 5,
    title: 'Runtime：流式、持久化与运行管理',
    subtitle: 'Runtime: Streaming & Persistence',
    theme: 'gateway 与 agent 之间的运行时层：StreamBridge 解耦生产者/消费者，事件可落 jsonl 或 db，checkpointer/store 持久化线程状态，RunManager 管 run 的全生命周期。',
    chapters: [
      { slug: 'df5-c1', title: 'StreamBridge 与事件：生产者/消费者解耦与持久化', topic: '流式', hook: 'StreamEvent、心跳/结束哨兵、Last-Event-ID 重放；事件如何落 jsonl/db；run_agent 如何把 LangGraph 的多种 stream_mode 逐条 publish。', minutes: 150, hasContent: true },
      { slug: 'df5-c2', title: 'Checkpointer、Store 与 RunManager：状态持久化与 run 生命周期', topic: '持久化', hook: 'make_checkpointer（langgraph.json 声明的入口）如何在 sqlite/postgres 间选择；RunManager 的 create_or_reject / cancel / 孤儿 run 回收。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'df6',
    index: 6,
    title: 'Skills 与配置加载',
    subtitle: 'Skills & Configuration',
    theme: '「Skill」是 deer-flow 把领域知识渐进式喂给模型的机制；配置系统则用一份 config.yaml 驱动模型、沙箱、记忆、渠道等一切，并支持热加载。',
    chapters: [
      { slug: 'df6-c1', title: 'Skills 技能系统：markdown frontmatter、安装、权限与 slash', topic: '技能', hook: 'SKILL.md 的结构、installer/parser/security_scanner 的安装链、tool_policy 的权限收敛，以及 /skill-name 显式激活如何确定性注入。', minutes: 120, hasContent: true },
      { slug: 'df6-c2', title: '配置加载流程：config.yaml 的发现、合并、校验与热重载', topic: '配置', hook: 'get_app_config 如何按 mtime 热加载；模型/LLM 配置怎么解析；为什么 lifespan 故意不缓存 config 快照。附配置 schema 全景树。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'df7',
    index: 7,
    title: '前端架构与全链路协同',
    subtitle: 'Frontend & End-to-End',
    theme: 'Next.js 前端如何用 LangGraph SDK 消费后端 SSE，把流式事件渲染成消息、工具调用与产物；最后把 IM 渠道也接进同一条 run 链路，闭合整个系统。',
    chapters: [
      { slug: 'df7-c1', title: '前端架构：Next.js App Router 与 core 模块切分', topic: '前端', hook: 'src/app 的路由、src/core/* 的领域模块（api/messages/threads/streamdown/artifacts）、状态管理与 workspace UI 的组织方式。', minutes: 120, hasContent: true },
      { slug: 'df7-c2', title: '前后端流式时序：一次对话从点击到逐字渲染的全链路', topic: '时序', hook: '把网关 SSE、StreamBridge、消息模型串起来：UI 发消息→SDK useStream→/runs/stream→流式事件→core/messages 解析→streamdown 渲染。一张端到端时序图。', minutes: 150, hasContent: true },
      { slug: 'df7-c3', title: 'IM 渠道接入：Channel 抽象与 inbound→agent run', topic: '渠道', hook: 'Feishu/Slack/Telegram 等如何统一成 Channel；ChannelManager 如何带 internal-token + CSRF 伪装成可信浏览器调用，把外部消息变成一次 agent run。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'df8',
    index: 8,
    title: '附录：提示词全集与实战拆解',
    subtitle: 'Prompts & A Worked Trace',
    theme: '把 deer-flow 各环节用到的系统提示词全部扒下来、逐字译成中文（含主链路、后台 LLM、工具描述与中间件注入文本），讲清「静态模板 + 每轮动态注入」的组装规则；最后用一个真实 case，把一次对话内部的状态流转、LLM 调用、子代理执行完整拆给你看。',
    chapters: [
      { slug: 'df8-c1', title: '提示词全集（一）：交互主链路提示词', topic: '提示词·主链路', hook: '主智能体大模板（全文）、完整的子代理编排段、技能段与 /skill 激活、子代理自身提示词、每轮动态注入——逐段中文翻译 + 组装规则。', minutes: 150, hasContent: true },
      { slug: 'df8-c2', title: '提示词全集（二）：后台 LLM、工具描述与中间件注入', topic: '提示词·后台/工具', hook: '记忆更新与事实抽取、标题/摘要/建议、安全扫描、tool_search；以及喂给模型的工具描述（task/ask_clarification/沙箱七件套等）和各中间件向对话里注入的文本——逐条扒全译中。', minutes: 150, hasContent: true },
      { slug: 'df8-c3', title: '实战拆解：一次对话内部到底发生了什么', topic: '实战·全流程', hook: '以「上传 CSV 让它分析并出报告」为例，逐步拆解状态流转（ThreadState）→ 多次 LLM 调用 → 子代理并行执行 → SSE 事件时间线 → 收尾与记忆更新。', minutes: 150, hasContent: true },
    ],
  },
]

export const FLAT_CHAPTERS = VOLUMES.flatMap((v) =>
  v.chapters.map((c) => ({ ...c, volumeId: v.id, volumeIndex: v.index, volumeTitle: v.title })),
)

export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length
export const TOTAL_MINUTES = FLAT_CHAPTERS.reduce((sum, c) => sum + (c.minutes || 0), 0)

export function findChapterBySlug(slug) {
  const idx = FLAT_CHAPTERS.findIndex((c) => c.slug === slug)
  if (idx === -1) return { chapter: null, prev: null, next: null }
  return {
    chapter: FLAT_CHAPTERS[idx],
    prev: idx > 0 ? FLAT_CHAPTERS[idx - 1] : null,
    next: idx < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[idx + 1] : null,
  }
}

export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}

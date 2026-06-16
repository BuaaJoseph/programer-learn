// 从零构建生产级 Agent · 手写 forge CLI：9 卷 33 章。slug 规则 ba{卷}-c{章}。
// 每一章对应 forge 仓库里的一段真实代码，按卷推进可运行的里程碑。
export const VOLUMES = [
  {
    id: 'ba0',
    index: 0,
    title: '准备与蓝图',
    subtitle: 'Setup & Blueprint',
    theme: '先看清要造的东西长什么样，再把一个空文件夹变成能跑的 TypeScript 工程，最后让它第一次开口和 LLM 说话。',
    chapters: [
      { slug: 'ba0-c1', title: '我们要造一个什么样的 Agent', topic: '蓝图 / 预览', hook: '终点是一个能 npm i -g 安装、敲 forge 就能用的编码 Agent。先把整张地图摊开：33 章怎么一步步长成它。', minutes: 90, hasContent: true },
      { slug: 'ba0-c2', title: '脚手架：从空文件夹到能跑的 TS 工程', topic: '工程脚手架', hook: 'package.json、tsconfig、tsx、bin 入口、严格模式——把一个能 forge 一声就响应的最小骨架立起来。', minutes: 120, hasContent: true },
      { slug: 'ba0-c3', title: 'Hello LLM：第一次调用 Claude', topic: '第一次 LLM 调用', hook: '装上 @anthropic-ai/sdk，写第一段 messages.create，让 forge 把你的话发给 Claude 再把回答打印出来。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ba1',
    index: 1,
    title: 'Agent 内核',
    subtitle: 'The Agent Core',
    theme: '这一卷是全课程的心脏：把消息历史、工具契约、主循环、读/写工具、调度规则一块块拼出来，让 forge 真正能改你的代码。',
    chapters: [
      { slug: 'ba1-c1', title: '消息历史：Agent 的工作记忆', topic: 'messages 模型', hook: 'system + user + assistant + tool_result 排成一个扁平列表，就是 Agent 的全部记忆。先把这个数据结构定清楚。', minutes: 120, hasContent: true },
      { slug: 'ba1-c2', title: '工具契约：怎么告诉模型「你有哪些手」', topic: '工具契约 / schema', hook: 'name + description + input_schema 三件套定义一个工具；execute 负责真正干活。先立一套可扩展的工具注册表。', minutes: 120, hasContent: true },
      { slug: 'ba1-c3', title: '主循环 v1：让它自己转起来', topic: 'Agent 主循环', hook: '一个 while 循环：调模型→有 tool_use 就执行并回灌→没有就停。几十行代码，forge 第一次像个 Agent。', minutes: 150, hasContent: true },
      { slug: 'ba1-c4', title: '只读工具：read / list / glob / grep', topic: '只读工具', hook: '先给它一双「眼睛」：读文件、列目录、按 glob 找文件、用正则搜内容——安全、可并行的探索能力。', minutes: 150, hasContent: true },
      { slug: 'ba1-c5', title: '写工具：write / edit / bash', topic: '写工具', hook: '再给它一双「手」：写文件、精确字符串替换、执行 shell。从这一刻起 forge 能真正动你的项目了。', minutes: 150, hasContent: true },
      { slug: 'ba1-c6', title: '工具调度：并行只读、串行写', topic: '工具调度', hook: '一轮里模型可能点名多个工具。只读的并发跑省时间，会改状态的必须串行——把调度规则写进主循环。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ba2',
    index: 2,
    title: '像样的 CLI',
    subtitle: 'A Real CLI',
    theme: '内核能跑了，但还不好用。这一卷把它包装成一个真正的命令行应用：可交互的 REPL、逐字流式输出、斜杠命令。',
    chapters: [
      { slug: 'ba2-c1', title: 'REPL：可交互的对话循环', topic: 'REPL', hook: '用 readline 搭一个「问→答→再问」的交互外壳，维护多轮会话，Ctrl-C 优雅退出。', minutes: 120, hasContent: true },
      { slug: 'ba2-c2', title: '流式渲染：让回答一个字一个字蹦出来', topic: '流式输出', hook: '用 messages.stream 边收边打印，工具调用实时显示「正在读 X / 正在改 Y」，体验立刻不一样。', minutes: 150, hasContent: true },
      { slug: 'ba2-c3', title: '斜杠命令：/help /clear /model …', topic: '斜杠命令', hook: '在 REPL 里拦截以 / 开头的输入，做成一套可扩展的本地命令系统，不走 LLM 也能控制 forge。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ba3',
    index: 3,
    title: '安全与人在回路',
    subtitle: 'Safety & Human-in-the-Loop',
    theme: '能改代码、能跑命令的 Agent 必须可控。这一卷加上权限模型、危险操作确认、审计日志——让 forge 能被信任。',
    chapters: [
      { slug: 'ba3-c1', title: '权限模型：Deny > Ask > Allow', topic: '权限', hook: '不是所有工具都该静默执行。设计一套按工具+参数匹配的权限规则，决定哪些放行、哪些必须问你。', minutes: 150, hasContent: true },
      { slug: 'ba3-c2', title: '危险确认：动手前先停一下', topic: '危险确认 / HITL', hook: 'rm -rf、写到 .git、改系统文件……在执行前弹出确认，把「人在回路」做成一道真实的闸门。', minutes: 120, hasContent: true },
      { slug: 'ba3-c3', title: '审计日志：每一步都留痕', topic: '审计', hook: '把每次工具调用、每次确认、每次 LLM 往返写成结构化日志，事后可回放、可排查、可信任。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ba4',
    index: 4,
    title: '上下文工程',
    subtitle: 'Context Engineering',
    theme: '上下文是 Agent 最稀缺的资源。这一卷做 system prompt、AGENTS.md 项目记忆、token 预算统计，以及快满时的自动压缩。',
    chapters: [
      { slug: 'ba4-c1', title: 'System Prompt：给 Agent 立人设和规矩', topic: 'system prompt', hook: '一份好的 system prompt 决定 forge 的行为基线：身份、工具使用纪律、输出风格、安全约束。', minutes: 120, hasContent: true },
      { slug: 'ba4-c2', title: 'AGENTS.md：让 forge 记住这个项目', topic: '项目记忆', hook: '启动时读取项目根的 AGENTS.md，把项目约定注入上下文——这就是 Agent 的「长期记忆」。', minutes: 120, hasContent: true },
      { slug: 'ba4-c3', title: 'Token 预算：随时知道还剩多少', topic: 'token 预算', hook: '用 count_tokens 估算每轮上下文占用，把「离上限还有多远」实时显示出来，为压缩做准备。', minutes: 120, hasContent: true },
      { slug: 'ba4-c4', title: '自动压缩：上下文快满了怎么续命', topic: '自动压缩', hook: '逼近上限时，让模型把早期历史总结成一段摘要、替换掉原始消息——forge 由此能跑很长的任务。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'ba5',
    index: 5,
    title: '规划与子代理',
    subtitle: 'Planning & Subagents',
    theme: '面对大任务，Agent 需要会规划、会分而治之。这一卷实现 TodoWrite 任务清单、只读的计划模式、隔离上下文的子代理。',
    chapters: [
      { slug: 'ba5-c1', title: 'TodoWrite：把大任务拆成清单', topic: '任务清单', hook: '给 forge 一个待办工具：拆步骤、标状态、同时只能有一个进行中——让长任务不跑偏、可追踪。', minutes: 120, hasContent: true },
      { slug: 'ba5-c2', title: '计划模式：先想清楚再动手', topic: '计划模式', hook: '一种「只读探索、产出计划、等你批准」的模式：动手前先给方案，避免一上来就乱改。', minutes: 120, hasContent: true },
      { slug: 'ba5-c3', title: '子代理：用 Task 隔离上下文', topic: '子代理', hook: '把独立子任务丢给一个跑在干净上下文里的子代理，它只回传结果摘要——主上下文不被中间过程塞爆。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'ba6',
    index: 6,
    title: '扩展性',
    subtitle: 'Extensibility',
    theme: '一个能长久用的工具必须可配置、可换模型、可接外部能力。这一卷做配置系统、Provider 抽象层、接入 MCP。',
    chapters: [
      { slug: 'ba6-c1', title: '配置系统：项目级与全局级', topic: '配置', hook: '~/.forge 与项目 .forge 两级配置：模型、权限、API key、自定义 prompt 都能配，按优先级合并。', minutes: 120, hasContent: false },
      { slug: 'ba6-c2', title: 'Provider 抽象：把模型换成可插拔的', topic: 'Provider 抽象', hook: '把「调用 LLM」收敛到一个薄接口后，默认 Claude，但能轻松切换或新增 Provider，不动主循环。', minutes: 150, hasContent: false },
      { slug: 'ba6-c3', title: 'MCP：接入外部工具生态', topic: 'MCP', hook: '实现一个 MCP 客户端，把外部 MCP server 暴露的工具动态注册进 forge 的工具表——能力即插即用。', minutes: 150, hasContent: false },
    ],
  },
  {
    id: 'ba7',
    index: 7,
    title: '生产化',
    subtitle: 'Production Hardening',
    theme: '从「能跑」到「能放心交付」。这一卷做会话持久化与 --resume、成本与延迟统计、可观测性、自动化测试。',
    chapters: [
      { slug: 'ba7-c1', title: '会话持久化与 --resume', topic: '会话恢复', hook: '把每次会话存盘，支持 forge --resume 接着上次继续——长任务、断点续聊的基础。', minutes: 120, hasContent: false },
      { slug: 'ba7-c2', title: '成本与延迟：每次往返花了多少', topic: '成本 / 延迟', hook: '统计每轮 token 用量、估算花费、记录耗时，让 forge 对自己的开销心里有数、可优化。', minutes: 120, hasContent: false },
      { slug: 'ba7-c3', title: '可观测性：结构化日志与调试开关', topic: '可观测性', hook: '加一个 --debug/--verbose 开关，把内部往返、工具输入输出结构化打出来，排错不再靠猜。', minutes: 120, hasContent: false },
      { slug: 'ba7-c4', title: '测试：给 Agent 写自动化测试', topic: '测试', hook: '工具单测 + 主循环用假 Provider 做集成测试——没有测试的 Agent 不敢重构、不敢发布。', minutes: 150, hasContent: false },
    ],
  },
  {
    id: 'ba8',
    index: 8,
    title: '打包与发布',
    subtitle: 'Package & Ship',
    theme: '最后一公里：把 forge 打包成单文件、发布到 npm、写好文档，让任何人都能像装 Claude Code 一样装上它。',
    chapters: [
      { slug: 'ba8-c1', title: 'bin 打包：编译成可分发的产物', topic: '打包', hook: '用 tsc/构建工具把 TS 编译成 JS、配好 bin 与 shebang，让它脱离开发环境也能跑。', minutes: 120, hasContent: false },
      { slug: 'ba8-c2', title: '发布到 npm：让别人能 npm i -g', topic: 'npm 发布', hook: '配 package.json 的 files/bin/engines，npm publish，再 npm i -g forge 真机验证——它真的装上了。', minutes: 120, hasContent: false },
      { slug: 'ba8-c3', title: '文档与 README：让人会用、敢用', topic: '文档', hook: '写清安装、配置、用法、安全说明——一个没有文档的工具等于不存在。', minutes: 90, hasContent: false },
      { slug: 'ba8-c4', title: '毕业项目：用 forge 改造 forge', topic: '毕业项目', hook: '终极验证：用你亲手造的 forge，去给 forge 自己加一个新功能。它能自举，你就毕业了。', minutes: 150, hasContent: false },
    ],
  },
]

export const FLAT_CHAPTERS = VOLUMES.flatMap((vol) =>
  vol.chapters.map((ch) => ({ ...ch, volumeId: vol.id, volumeIndex: vol.index, volumeTitle: vol.title })),
)
export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length
export const TOTAL_MINUTES = FLAT_CHAPTERS.reduce((sum, ch) => sum + ch.minutes, 0)
export function findChapterBySlug(slug) {
  const i = FLAT_CHAPTERS.findIndex((ch) => ch.slug === slug)
  if (i === -1) return { chapter: null, prev: null, next: null }
  return { chapter: FLAT_CHAPTERS[i], prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null, next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null }
}
export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}

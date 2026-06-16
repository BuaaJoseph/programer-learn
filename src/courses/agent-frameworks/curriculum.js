// 主流 Agent 开发框架 · 原理解析与实战：9 卷 20 章。slug 规则 af{卷}-c{章}。
// 6 个 Python 框架 + 1 个 Java 框架(Spring AI)，全程用百炼(Qwen)作模型后端。
export const VOLUMES = [
  {
    id: 'af0',
    index: 0,
    title: '导论：框架全景与统一前提',
    subtitle: 'Landscape & Setup',
    theme: '先想清楚「为什么需要框架、它们都在解决什么」，把主流框架按范式归类，再约定全程用百炼(Qwen)接入，打好统一的模型后端底座。',
    chapters: [
      { slug: 'af0-c1', title: '为什么需要 Agent 框架', topic: '动机', hook: '裸调 SDK 也能写 Agent，那框架到底帮你省了什么？工具调用循环、多 Agent、状态、记忆、可观测——这些重复的脚手架就是框架的价值。', minutes: 90, hasContent: true },
      { slug: 'af0-c2', title: '全景地图：主流框架与范式分类', topic: '范式分类', hook: '代码行动、轻量循环+handoff、类型安全、图/状态机、角色协作、数据/RAG、企业 Java——把七个主角按范式摆上同一张地图。', minutes: 90, hasContent: true },
      { slug: 'af0-c3', title: '统一前提：用百炼(Qwen)作模型后端', topic: '环境/接入', hook: '所有框架都能用自定义 base_url 接百炼的 OpenAI 兼容端点。先写一个「裸兼容调用」打底，再约定后面各框架怎么接同一个 Qwen。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'af1',
    index: 1,
    title: 'smolagents：代码行动',
    subtitle: 'Code-as-Action',
    theme: 'Hugging Face 的极简框架，主打「Agent 写并执行 Python 代码来行动」。最轻、最适合建立 Agent/工具/循环的直觉。',
    chapters: [
      { slug: 'af1-c1', title: 'smolagents 原理：CodeAgent 与代码行动', topic: '原理', hook: 'CodeAgent 每一步生成并执行一段 Python，而不是输出 JSON 工具调用——更少步数、更自然地组合工具。约 1000 行的极简 ReAct 循环。', minutes: 120, hasContent: true },
      { slug: 'af1-c2', title: '实战：用 smolagents + 百炼解一道多步题', topic: '实战', hook: 'OpenAIServerModel 接百炼，写一个 CodeAgent 在一步代码里循环计算+筛选，直观感受 code-as-action 的省步数。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'af2',
    index: 2,
    title: 'OpenAI Agents SDK：轻量循环 + handoff',
    subtitle: 'Lightweight + Handoff',
    theme: 'OpenAI 官方轻量框架、Swarm 的生产级继任者。极少抽象，靠 Agent + Handoff + Guardrail 组织多 Agent。',
    chapters: [
      { slug: 'af2-c1', title: 'OpenAI Agents SDK 原理：Agent/Handoff/Guardrail', topic: '原理', hook: 'Agent、Runner、Handoff(控制权交接)、Guardrail(并行校验可中断)、Session、Tracing——少量原语拼出多 Agent 系统。', minutes: 120, hasContent: true },
      { slug: 'af2-c2', title: '实战：客服分诊多 Agent + 输入护栏（接百炼）', topic: '实战', hook: '关键四步把 SDK 接到百炼(走 chat_completions)，做一个 triage→专家 Agent 的分诊路由，并加一道输入护栏拦截越权请求。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af3',
    index: 3,
    title: 'PydanticAI：类型安全与结构化',
    subtitle: 'Type-Safe & Structured',
    theme: 'Pydantic 团队出品，把 FastAPI 式的类型安全与依赖注入带到 Agent：结构化输出、deps 注入、可测试。',
    chapters: [
      { slug: 'af3-c1', title: 'PydanticAI 原理：output_type、deps 与工具', topic: '原理', hook: '泛型 Agent 绑定 model/deps/output 类型；output_type + BaseModel 自动校验重试；deps + RunContext 做依赖注入——低魔法、可测试。', minutes: 120, hasContent: true },
      { slug: 'af3-c2', title: '实战：工单分级（结构化输出 + 依赖注入，接百炼）', topic: '实战', hook: 'OpenAIChatModel + OpenAIProvider 接百炼，做一个返回结构化 Triage 的客服 Agent，用 deps 注入查余额，并演示用 override 写测试。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af4',
    index: 4,
    title: 'LangGraph：图与状态机',
    subtitle: 'Graphs & State Machines',
    theme: 'LangChain 生态的编排层，1.0 已 GA。用显式状态图掌控复杂、长流程、可持久、可人审的 Agent。',
    chapters: [
      { slug: 'af4-c1', title: 'LangGraph 原理：StateGraph/条件边/checkpointer/interrupt', topic: '原理', hook: '把 Agent 建成一张带类型状态的图：节点改状态、条件边做路由、checkpointer 给持久与记忆、interrupt 做人审闸门。', minutes: 150, hasContent: true },
      { slug: 'af4-c2', title: '实战：带记忆与人工审批的 ReAct 图（接百炼）', topic: '实战', hook: 'ChatOpenAI 接百炼 + create_react_agent + checkpointer 演示多轮记忆，再加一个 interrupt 审批节点，体会「控制力」。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af5',
    index: 5,
    title: 'CrewAI：角色协作',
    subtitle: 'Role-Based Crews',
    theme: '已脱离 LangChain 的独立框架，用「角色 + 任务 + 流程」组织一队会协作的 Agent，适合研究、创作类多视角工作。',
    chapters: [
      { slug: 'af5-c1', title: 'CrewAI 原理：Agent/Task/Crew/Process 与 Flows', topic: '原理', hook: '角色(role/goal/backstory)+任务+Crew 协作；Process 选 sequential/hierarchical；Flows 做事件驱动的确定性编排。Crews 与 Flows 怎么配合。', minutes: 120, hasContent: true },
      { slug: 'af5-c2', title: '实战：Researcher→Writer 两角色出报告（接百炼）', topic: '实战', hook: 'LLM(openai/qwen-plus) 接百炼，搭一个研究员+撰稿人顺序协作的 Crew，用 context 串起任务，kickoff 产出一篇报告。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af6',
    index: 6,
    title: 'LlamaIndex：数据与 RAG 驱动',
    subtitle: 'Data & RAG',
    theme: '以「连接 LLM 与你的数据」为核心：索引/检索 + Agent + 事件驱动 Workflows，最适合做知识库与文档问答。',
    chapters: [
      { slug: 'af6-c1', title: 'LlamaIndex 原理：索引/检索 + Agent + Workflows', topic: '原理', hook: 'VectorStoreIndex/query engine 是数据层，FunctionAgent/AgentWorkflow 是 Agent 层，Workflows 1.0 用事件驱动把步骤串起来。', minutes: 150, hasContent: true },
      { slug: 'af6-c2', title: '实战：chat-with-your-docs 知识助手（接百炼）', topic: '实战', hook: 'OpenAILike(is_chat_model=True) 接百炼(注意这个坑)，建索引→QueryEngineTool→FunctionAgent，二十行做一个能查你文档的 Agent。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af7',
    index: 7,
    title: 'Spring AI：Java 生态的 Agent 集成',
    subtitle: 'Spring AI (Java)',
    theme: 'Spring 官方的 AI 框架，把 LLM 调用变成「又一个被 Spring 管理的依赖」。最适合已有 Spring Boot 后端要加 AI 能力的 Java 团队。',
    chapters: [
      { slug: 'af7-c1', title: 'Spring AI 原理：ChatClient、Advisors、工具调用', topic: '原理', hook: 'ChatClient 流式 API + 自动配置/依赖注入；Advisors 做记忆与 RAG；@Tool 声明式工具；.entity() 结构化输出——Spring 风格的 AI。', minutes: 120, hasContent: true },
      { slug: 'af7-c2', title: '实战：Spring Boot 接百炼（含 base-url 拼接坑）', topic: '实战', hook: 'OpenAI starter 覆盖 base-url 接百炼——重点讲那个最易踩的坑：base-url 写到 compatible-mode 为止、不带 /v1，否则双 v1 报 404。', minutes: 150, hasContent: true },
      { slug: 'af7-c3', title: '实战进阶：@Tool 工具调用 + 结构化输出 + RAG/Alibaba', topic: '实战', hook: '一个 REST 接口：注入 ChatClient + @Tool 工具 + .entity() 自动映射 record；再看 Spring AI Alibaba 原生 DashScope 与 RAG advisor。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'af8',
    index: 8,
    title: '横向对比与选型',
    subtitle: 'Compare & Choose',
    theme: '把七个框架放在一起对比：范式、能力、适用场景。给一套选型决策树，并总结统一接国产模型的经验与趋势。',
    chapters: [
      { slug: 'af8-c1', title: '范式总览与选型决策树', topic: '选型', hook: '一张表对比七框架的范式/抽象/适用场景，再给一棵决策树：按任务复杂度、团队栈、部署环境，帮你选对框架。', minutes: 120, hasContent: true },
      { slug: 'af8-c2', title: '统一接国产模型的经验与趋势', topic: '总结/趋势', hook: '七种 base_url 接法对照(AsyncOpenAI/ChatOpenAI/LiteLlm/OpenAIProvider/OpenAIServerModel/LLM/Spring base-url)，以及 MCP/A2A 互操作、框架收敛的走向。', minutes: 90, hasContent: true },
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

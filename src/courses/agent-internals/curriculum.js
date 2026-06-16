// Agent 执行原理 · 拆解 Claude Code：4 卷 15 章。slug 规则 ai{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'ai1',
    index: 1,
    title: '执行原理',
    subtitle: 'How It Works',
    theme: 'Agent 不是「更聪明的模型」，而是「模型 + 脚手架」。这一卷把主循环、上下文、自动压缩这三块地基打牢。',
    chapters: [
      { slug: 'ai1-c1', title: '同样的 LLM，为什么能力天差地别', topic: '模型 vs 脚手架', hook: '同一个 Claude，在聊天框里只能给建议，在 Claude Code 里却能改完一整天的代码——差距全在「脚手架」上。', minutes: 120, hasContent: true },
      { slug: 'ai1-c2', title: 'Agent 主循环：收集—行动—验证—重复', topic: '主循环', hook: 'Claude Code 的核心其实是一个朴素的 while 循环：模型回复里只要还有工具调用就继续，直到给出纯文本才停。', minutes: 120, hasContent: true },
      { slug: 'ai1-c3', title: '上下文里到底装了什么、满了怎么办', topic: '上下文工程 / 压缩', hook: 'system prompt、工具定义、CLAUDE.md、历史、工具结果……上下文是有限资源；快满时 Agent 会自动压缩续命。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ai2',
    index: 2,
    title: '精讲一次「帮我重构项目」',
    subtitle: 'Trace a Real Task',
    theme: '把一条真实的重构任务从头到尾摊开：每轮和 LLM 交互了什么、上下文存了什么、步骤怎么定、为什么停下来问你。',
    chapters: [
      { slug: 'ai2-c1', title: '从指令到完成：一次重构的完整内部轨迹', topic: '任务轨迹', hook: '输入「帮我重构这个项目」之后，Agent 内部一轮轮地探索、规划、改码、跑测试、修错——我们逐轮回放。', minutes: 150, hasContent: true },
      { slug: 'ai2-c2', title: '每一轮到底发给 LLM 什么', topic: 'LLM 调用解剖', hook: '拆开一次 LLM 调用的 messages：system + 历史 + 工具结果怎么拼、token 花在哪、模型凭什么决定下一步。', minutes: 120, hasContent: true },
      { slug: 'ai2-c3', title: '执行步骤是怎么定的：探索、计划与 Todo', topic: '规划 / TodoWrite', hook: '为什么先探索再动手、计划模式只读不改、TodoWrite 还规定「同时只能有一个进行中」——都是为了不跑偏。', minutes: 120, hasContent: true },
      { slug: 'ai2-c4', title: '为什么要停下来问你：权限与人在回路', topic: '权限 / HITL', hook: 'Deny>Ask>Allow 的权限规则、危险操作前的确认——可中断、可审查，是 Agent 能被信任、能上生产的前提。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ai3',
    index: 3,
    title: '换任务、换角度',
    subtitle: 'Different Tasks',
    theme: '同一套机制，面对不同任务会跑出不同路径。这一卷讲工具调度、子代理隔离，以及三类任务的执行差异。',
    chapters: [
      { slug: 'ai3-c1', title: '工具调用的本质：意图—执行—回灌', topic: '工具调度', hook: '模型只生成「调用意图」，真正执行的是 harness；只读工具可并行、写工具要串行，结果再回灌给模型。', minutes: 120, hasContent: true },
      { slug: 'ai3-c2', title: '子代理：复杂任务的分而治之', topic: '子代理 / 上下文隔离', hook: '子代理跑在独立上下文里、只把结果摘要回传——它是「上下文隔离器」，不是复杂的多 Agent 编排。', minutes: 120, hasContent: true },
      { slug: 'ai3-c3', title: '三类任务对比：查 bug / 加功能 / 大重构', topic: '任务类型', hook: '为什么有的任务一轮搞定、有的要几十轮？把三类任务的内部执行轨迹并排看，规律就出来了。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'ai4',
    index: 4,
    title: '横向对比与设计哲学',
    subtitle: 'Compare & Build',
    theme: '同样是 Agent，架构选择天差地别。对比单主循环与图编排、拆解 deer-flow 与 opencode，最后亲手复刻一个最小 Agent。',
    chapters: [
      { slug: 'ai4-c1', title: '单主循环 vs 图编排：两种范式', topic: '架构范式', hook: 'Claude Code 用单主循环+子代理，deer-flow 用 LangGraph 多角色图——这是两种处理复杂任务的根本思路。', minutes: 120, hasContent: true },
      { slug: 'ai4-c2', title: 'deer-flow 拆解：LangGraph 多角色编排', topic: 'deer-flow', hook: 'coordinator→planner→(人审计划)→research_team→researcher/coder→reporter：一张图把多角色协作显式编排出来。', minutes: 150, hasContent: true },
      { slug: 'ai4-c3', title: 'opencode 拆解：厂商无关与 client-server', topic: 'opencode', hook: 'TS 核心 server + Go TUI、HTTP/SSE、75+ provider——同样的 Agent 骨架，换一套工程取舍。', minutes: 120, hasContent: true },
      { slug: 'ai4-c4', title: '为什么「保持简单」常常赢', topic: '设计哲学', hook: '单写手原则、上下文连续性、多 Agent 的 token 与协调代价——简单的单主循环为什么常常比花哨编排更可靠。', minutes: 120, hasContent: true },
      { slug: 'ai4-c5', title: '动手：复刻一个最小 Agent 主循环', topic: '动手实现', hook: '用几十行代码把 LLM + 工具 + while 循环 + 上下文拼起来，亲手感受脚手架如何把模型变成 Agent。', minutes: 180, hasContent: true },
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

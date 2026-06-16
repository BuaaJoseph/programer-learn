export const meta = {
  slug: 'agent-internals',
  title: 'Agent 执行原理：拆解 Claude Code',
  shortTitle: 'Agent 执行原理',
  subtitle: 'How Coding Agents Really Work',
  categoryId: 'agent',
  subCategoryId: 'dev',
  level: '进阶',
  cover: '🛠️',
  coverScene: 'agentloop',
  accent: '#5b21b6',
  pricing: 'free',
  description:
    '把 Claude Code 这类编码 Agent 掰开揉碎：模型 vs 脚手架、Agent 主循环、上下文与自动压缩、子代理、权限与人在回路。再用「帮我重构项目」等大量真实任务轨迹讲清内部怎么跑，并横向对比 deer-flow、opencode，最后动手复刻一个最小 Agent。',
  audience: [
    '会用 Claude Code/Cursor，但想搞懂「它内部到底怎么跑」的工程师',
    '要自己做 Agent、想知道脚手架该怎么设计的开发者',
    '好奇「为什么同一个 LLM 套不同框架能力差这么多」的人',
  ],
  outcomes: [
    '讲清 Agent = 模型 + 脚手架，以及主循环、上下文工程、自动压缩',
    '能沿一条真实任务轨迹说清每轮和 LLM 交互了什么、步骤怎么定、为何问用户',
    '理解工具调用、子代理隔离与不同任务类型的内部执行差异',
    '看懂单主循环 vs 图编排(deer-flow)、opencode 的取舍，并能复刻最小 Agent',
  ],
}

export default meta

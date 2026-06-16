// 课程元信息。平台靠这份数据把课程挂到对应分类下、渲染卡片与详情页。
export const meta = {
  slug: 'llm-handbook',
  title: '大模型学习手册 · 从原理到 Agent',
  shortTitle: '大模型学习手册',
  subtitle: 'From LLM Internals to Agents',
  // 归属：服务端 / agent 开发
  categoryId: 'server',
  subCategoryId: 'agent',
  level: '进阶',
  cover: '🤖',
  coverScene: 'attention',
  accent: '#4f46e5',
  pricing: 'free', // free | paid，付费逻辑后续接入
  description:
    '用「直白讲清概念 + 举例子 + 动手实践」的方式，把大语言模型的内部原理与 Agent 开发，从下一个词预测一路讲到能上线的多 Agent 系统。',
  audience: [
    '会编程、用过 LLM API，但说不清模型内部到底在做什么的工程师',
    '想从「调 API」进阶到「自己搭 Agent / 多 Agent 系统」的开发者',
    '需要把 LLM 应用真正送上生产环境的团队',
  ],
  outcomes: [
    '看懂 next-token、注意力、Transformer 等核心原理，不再把模型当黑箱',
    '掌握 Prompt 工程、结构化输出、微调与 RAG 的取舍与落地',
    '从零搭出带工具调用、记忆、护栏的自主 Agent 与多 Agent 协作系统',
    '具备可观测性、成本优化与部署上线的生产化能力',
  ],
}

export default meta

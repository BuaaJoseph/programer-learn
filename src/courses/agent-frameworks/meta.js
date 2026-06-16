export const meta = {
  slug: 'agent-frameworks',
  title: '主流 Agent 开发框架：原理解析与实战',
  shortTitle: 'Agent 框架解析',
  subtitle: 'Mainstream Agent Frameworks, Explained & Built',
  categoryId: 'agent',
  subCategoryId: 'dev',
  level: '实战',
  cover: '🧩',
  coverScene: 'frameworks',
  accent: '#0d9488',
  pricing: 'free',
  description:
    '一次把当下主流的 Agent 开发框架讲透：每个框架「实现了什么、适合什么场景」，再用它写一个能跑的小 case。覆盖 smolagents（代码行动）、OpenAI Agents SDK（轻量+handoff）、PydanticAI（类型安全）、LangGraph（图/状态机）、CrewAI（角色协作）、LlamaIndex（数据/RAG），外加 Java 生态的 Spring AI。全程用阿里云百炼（Qwen）作模型后端，并贯穿一条副线：同一类任务在不同框架里怎么实现、如何统一接国产模型。',
  audience: [
    '要选型/上手 Agent 框架，想搞清各框架取舍的工程师',
    '学过《从零构建 Agent》、想横向看主流框架怎么做的人',
    'Java 后端想用 Spring AI 接入大模型与工具调用的开发者',
  ],
  outcomes: [
    '说清主流 Agent 框架的范式分类与各自解决的问题',
    '能用每个框架写出一个可运行的小 case，并接入百炼/Qwen',
    '掌握 handoff、guardrail、状态图、角色协作、RAG、工具调用等核心机制',
    '会按场景/团队/部署做框架选型，并掌握统一接国产模型的方法',
  ],
}

export default meta

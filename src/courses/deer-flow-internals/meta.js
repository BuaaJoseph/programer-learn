export const meta = {
  slug: 'deer-flow-internals',
  title: 'DeerFlow 源码精讲：字节开源 Agent 框架架构全解析',
  shortTitle: 'DeerFlow 源码精讲',
  subtitle: 'ByteDance deer-flow Internals, Source by Source',
  categoryId: 'agent',
  subCategoryId: 'dev',
  level: '源码',
  cover: '🦌',
  coverScene: 'frameworks',
  accent: '#c2410c',
  pricing: 'free',
  description:
    '不是读 README，而是逐文件、逐函数地拆解字节跳动开源 Agent 框架 deer-flow（v2.1.0）。从 monorepo 全景、FastAPI 网关与 SSE 流式链路，到 lead agent + 二十余个 AgentMiddleware 的装配栈、Subagents 委派、Sandbox 沙箱执行、Runtime 流式/持久化、Skills 技能系统、配置热加载，再到 Next.js 前端如何用 LangGraph SDK 消费流式响应——每个关键结论都附带真实文件路径、类/函数名与源码片段。配总体架构图、前后端时序图、模块依赖图、agent/tool/sandbox 调用链路图、配置加载流程图。',
  audience: [
    '想深入一个工业级 Agent 框架内部实现、而不止于 API 用法的工程师',
    '要做 Agent 平台选型 / 二次开发 / 自建 harness 的架构师',
    '学过 LangGraph / LangChain，想看「真实生产代码怎么组织中间件、流式、沙箱」的人',
  ],
  outcomes: [
    '能画出 deer-flow 的整体架构与请求时序，说清每一层的职责边界',
    '读懂 lead agent 的两层工厂与中间件栈装配顺序，知道每个 middleware 在解决什么',
    '掌握 SSE 流式链路（StreamBridge）、Subagent 委派、Sandbox 隔离、配置热加载的源码实现',
    '具备对 deer-flow 做定制中间件 / 自定义工具 / 接入新渠道的源码级能力',
  ],
}

export default meta

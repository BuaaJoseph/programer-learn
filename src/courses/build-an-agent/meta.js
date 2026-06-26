export const meta = {
  slug: 'build-an-agent',
  title: '从零构建生产级 Agent：手写一个 forge CLI',
  shortTitle: '从零构建 Agent',
  subtitle: 'Build a Production-Grade Coding Agent from Scratch',
  categoryId: 'agent',
  subCategoryId: 'dev',
  level: '实战',
  cover: '🔨',
  coverScene: 'forge',
  accent: '#b45309',
  pricing: 'free',
  description:
    '跟着课程，从一个空文件夹开始，用 Node + TypeScript 亲手写出一个真正能用、能像 Claude Code 一样 npm 安装的编码 Agent —— forge。每一章对应仓库里的一段真实代码：从主循环、工具契约、读写工具，到 CLI 流式渲染、权限与人在回路、上下文工程与自动压缩、子代理、Provider 抽象与 MCP，最后打包发布到 npm。最后一卷再对照字节开源框架 DeerFlow，把 forge 重构成可插拔的中间件架构，补齐沙箱隔离、澄清中断、失控护栏、工具输出预算、学习型记忆与技能系统。学完你不只是「会用 Agent」，而是「能造一套敢放生产的 agent harness」。',
  repo: 'https://github.com/BuaaJoseph/forge',
  audience: [
    '会写代码、想彻底搞懂编码 Agent 内部实现的工程师',
    '想做自己的 Agent / CLI 工具，需要一套可借鉴的生产级骨架',
    '学过《Agent 执行原理》、想把原理落到真实代码上的人',
  ],
  outcomes: [
    '从零搭出一个 Node+TS 的 CLI Agent，理解 bin、打包与 npm 发布全流程',
    '亲手实现 Agent 主循环、工具契约与读/写/执行工具，并做好并发与串行调度',
    '做出流式 REPL、斜杠命令、权限与危险确认、审计日志等生产必备能力',
    '掌握 system prompt、AGENTS.md 记忆、token 预算与自动压缩等上下文工程',
    '实现计划模式、TodoWrite 与子代理，抽象 Provider 层并接入 MCP',
    '对照 DeerFlow 把主循环重构成中间件架构，并补齐沙箱、澄清中断、失控护栏、工具输出预算、学习型记忆与技能系统',
  ],
}

export default meta

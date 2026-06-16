export const meta = {
  slug: 'claude-skills',
  title: 'Claude Code Skill 开发：从原理到范式',
  shortTitle: 'Skill 开发',
  subtitle: 'Writing Agent Skills for Claude Code',
  categoryId: 'server',
  subCategoryId: 'agent',
  level: '进阶',
  cover: '🧩',
  coverScene: 'skilldoc',
  accent: '#7a4fc0',
  pricing: 'free',
  description:
    '以 Claude Code 为例，讲透 Skill 在 Agent 执行中如何被处理：三层渐进式加载、何时加载全文、如何触发。再讲清 SKILL.md 结构与写法、何时拆 reference、怎么调用脚本与 MCP，介绍 skill-creator 等工具，并拆解多个官方优秀 Skill 的原文。',
  audience: [
    '在用 Claude Code，想把重复工作沉淀成 Skill 的开发者',
    '想搞懂 Skill 渐进式加载、触发机制到底怎么回事的人',
    '要为团队/插件编写可复用、可触发、可维护 Skill 的工程师',
  ],
  outcomes: [
    '讲清 Skill 的三层渐进式加载与完整执行过程，知道什么时候加载全文',
    '掌握 SKILL.md 的结构与 frontmatter，写出能被准确触发的 description',
    '知道何时拆 reference、如何让 Skill 调用脚本与 MCP 工具',
    '会用 skill-creator 等工具，并能照着官方优秀 Skill 的范式来写',
  ],
}

export default meta

// Claude Code Skill 开发：3 卷 7 章。slug 规则 s{卷}-c{章}。
export const VOLUMES = [
  {
    id: 's1',
    index: 1,
    title: 'Skill 是什么与执行机制',
    subtitle: 'How Skills Work',
    theme: 'Skill 是给 Agent 的「按需说明书」。看懂它的三层渐进式加载与执行过程，你才知道为什么它既省 token 又能在需要时提供完整指引。',
    chapters: [
      { slug: 's1-c1', title: 'Skill 是什么、解决什么问题', topic: 'Skill 概念', hook: 'Skill 把「某类任务该怎么做」沉淀成一份带触发条件的说明书，让 Agent 在合适的时候自动取用。', minutes: 90, hasContent: true },
      { slug: 's1-c2', title: '渐进式加载：Skill 在执行中如何被处理', topic: '渐进式加载 / 执行过程', hook: '元数据始终在场、正文触发时才加载、reference 按需才读——三层渐进式披露是 Skill 的核心机制。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 's2',
    index: 2,
    title: '写好一个 Skill',
    subtitle: 'Authoring Skills',
    theme: '一个好 Skill 的价值，八成在 description 和结构上。这一卷讲清 SKILL.md 怎么写、何时拆 reference、怎么调脚本与 MCP。',
    chapters: [
      { slug: 's2-c1', title: 'SKILL.md 的结构与 frontmatter', topic: 'SKILL.md 结构', hook: 'SKILL.md = YAML 元数据 + Markdown 正文 + 可选的 reference/scripts/assets，目录名就是命令名。', minutes: 120, hasContent: true },
      { slug: 's2-c2', title: '怎么写好 Skill：description、正文与 reference', topic: '写作最佳实践', hook: 'description 决定能不能被触发、正文决定做得好不好、reference 决定上下文省不省——三者各司其职。', minutes: 120, hasContent: true },
      { slug: 's2-c3', title: '让 Skill 调用脚本与 MCP 工具', topic: '脚本 / MCP 集成', hook: 'Skill 不只是文字：它能注入命令输出、调用捆绑脚本，并通过 allowed-tools 预批准 MCP 工具。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 's3',
    index: 3,
    title: '工具与优秀范式',
    subtitle: 'Tools & Patterns',
    theme: '不必从零硬写。用 skill-creator 起步，再照着官方优秀 Skill 的范式打磨——这一卷给工具用法和可抄的范本。',
    chapters: [
      { slug: 's3-c1', title: '写 Skill 的工具：skill-creator 实战', topic: 'skill-creator', hook: 'skill-creator 是 Anthropic 官方的「写 Skill 的 Skill」：交互式生成结构、跑 eval、优化 description。', minutes: 90, hasContent: true },
      { slug: 's3-c2', title: '优秀 Skill 范式：拆解 3 个官方 Skill', topic: '范式分析', hook: '拿 pdf、docx、skill-creator 三个官方 Skill 的原文逐句拆，看好的 description 与正文长什么样。', minutes: 150, hasContent: true },
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
  return {
    chapter: FLAT_CHAPTERS[i],
    prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null,
    next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null,
  }
}

export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}

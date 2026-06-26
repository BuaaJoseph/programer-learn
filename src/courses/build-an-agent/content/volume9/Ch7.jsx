import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const skillMd = `---
name: release-checklist
description: 发布前的检查与打 tag 流程。当用户要「发版/release/打 tag」时使用。
allowed-tools: [bash, read, edit]
---

# 发布清单

1. 跑 \`npm test\` 确认全绿
2. 更新 CHANGELOG.md（从上一个 tag 到 HEAD 的提交）
3. \`npm version <patch|minor|major>\`
4. \`git push --follow-tags\`
…（更长的步骤、注意事项、回滚方法都写在这里）`

const loadSrc = `// skills/load.ts —— 启动时只读「门面」(frontmatter)，不读正文
import matter from 'gray-matter'   // 解析 YAML frontmatter

export interface SkillMeta {
  name: string
  description: string
  allowedTools?: string[]
  file: string                 // SKILL.md 的绝对路径（正文按需再读）
}

export async function loadSkillMetas(dir: string): Promise<SkillMeta[]> {
  const metas: SkillMeta[] = []
  for (const file of await findSkillFiles(dir)) {     // ~/.forge/skills/*/SKILL.md
    const { data } = matter(await readFile(file, 'utf8'))
    if (!data.name || !data.description) continue       // name/description 必填
    metas.push({ name: data.name, description: data.description,
                 allowedTools: data['allowed-tools'], file })
  }
  return metas
}`

const promptSrc = `// 注入 system prompt 的，只有「目录」——正文让模型按需 read_file 自己取
export function renderSkillsSection(metas: SkillMeta[]): string {
  if (!metas.length) return ''
  const list = metas.map((m) =>
    \`  <skill name="\${m.name}" path="\${m.file}">\${m.description}</skill>\`).join('\\n')
  return \`<技能系统>
你有一组「技能」——针对特定任务的最佳实践工作流。
渐进加载：当用户的请求匹配某个技能，先用 read_file 读它的 path 指向的 SKILL.md，再按其中步骤执行。
不要一上来就读所有技能正文，只在用到时才读。
<可用技能>
\${list}
</可用技能>
</技能系统>\`
}`

const mwSrc = `// middleware/skill.ts —— /skill-name 显式激活：直接把整份 SKILL.md 内联
export function skillMiddleware(metas: SkillMeta[]): Middleware {
  return {
    name: 'skill',
    async beforeAgent(c) {
      const first = firstUserText(c.messages)
      const m = first.match(/^\\/([a-z0-9-]+)\\s*([\\s\\S]*)/i)   // 形如 /release-checklist 帮我发版
      if (!m) return
      const meta = metas.find((s) => s.name === m[1])
      if (!meta) return
      const body = await readFile(meta.file, 'utf8')
      // 显式激活 → 确定性注入整份正文，优先于模型「猜哪个技能相关」
      c.messages.unshift({ role: 'user', content: [{ type: 'text',
        text: \`<技能激活>\\n用户本轮显式激活了「\${meta.name}」技能，请优先遵循：\\n\\n\${body}\\n</技能激活>\` }] })
    },
  }
}`

export default function Ch7() {
  return (
    <article>
      <Lead>
        最后一块拼图：<strong>技能（Skills）</strong>。你想让 forge 会「按你们团队的发版流程发版」「按规范写组件」，但这些知识太长，
        全塞进 system prompt 既费 token 又冲淡重点。DeerFlow 的答案是 <strong>渐进式加载</strong>：system prompt 里只放技能的「目录」，
        模型用到哪个才去 <code>read_file</code> 读哪个的正文。这一章给 forge 补上同款技能系统，本卷收官。
      </Lead>

      <h2>一、一个技能就是一个 SKILL.md</h2>
      <CodeBlock lang="md" title="~/.forge/skills/release-checklist/SKILL.md" code={skillMd} />
      <p>
        结构和 DeerFlow 完全一致：<strong>YAML frontmatter（门面）+ Markdown 正文（细节）</strong>。frontmatter 里 <code>name</code> /
        <code>description</code> 必填，可选 <code>allowed-tools</code>（这个技能允许用哪些工具）。
      </p>

      <h2>二、渐进式加载：只把「目录」放进 prompt</h2>
      <p>启动时<strong>只解析 frontmatter</strong>，绝不读正文：</p>
      <CodeBlock lang="ts" title="skills/load.ts" code={loadSrc} />
      <CodeBlock lang="ts" title="skills/prompt.ts" code={promptSrc} />
      <KeyIdea title="为什么不把正文全塞进去">
        假设你有 20 个技能、每个 2000 字。全塞进 system prompt 就是 4 万字的常驻开销，且大部分跟当前任务无关，反而稀释模型注意力。
        渐进加载只放<strong>名字 + 一句描述 + 路径</strong>（几百字），模型一看「哦这个任务匹配 release-checklist」，才 <code>read_file</code>
        把那一份正文读进来。这正是 DeerFlow <code>&lt;skill_system&gt;</code> 的 Progressive Loading——<strong>按需付费的上下文</strong>。
      </KeyIdea>

      <h2>三、/skill 显式激活：别让模型猜</h2>
      <p>
        有时你很明确就要用某个技能，不想赌模型会不会自己挑中。那就用斜杠命令显式激活——<strong>确定性</strong>地把整份正文注入：
      </p>
      <CodeBlock lang="ts" title="middleware/skill.ts" code={mwSrc} />
      <p>
        这对应 DeerFlow 的 <code>SkillActivationMiddleware</code>：用户以 <code>/skill-name</code> 开头时，运行时直接把整份 SKILL.md 内联注入，
        并把斜杠后的文本作为本轮任务——<strong>显式激活优先于模型的相关性猜测</strong>。注意它和第 2 卷的本地斜杠命令（/help /clear）不冲突：
        那些是 CLI 直接处理、不进 LLM；<code>/skill-name</code> 是注入上下文后照常走模型。
      </p>

      <Callout variant="note" title="allowed-tools：技能还能收紧权限">
        DeerFlow 的技能可以用 <code>allowed-tools</code> 把 Agent 的工具集<strong>收窄</strong>到这个技能允许的范围（fail-closed）。
        forge 可以把它接到第 3 卷的权限系统：激活某技能时，只放行它声明的工具。一个「只读调研技能」就能保证期间不会发生任何写操作。
      </Callout>

      <h2>四、本卷收官：forge 长成了一个 harness</h2>
      <p>
        七章下来，我们对照 DeerFlow 给 forge 补齐了：<strong>中间件架构</strong>（地基）、<strong>沙箱</strong>（隔离）、<strong>澄清中断</strong>（HITL）、
        <strong>失控护栏</strong>（循环/悬空/错误/重试）、<strong>工具输出预算</strong>、<strong>学习型记忆</strong>、<strong>技能系统</strong>。
        加上前八卷的内核、CLI、权限、上下文工程、子代理、Provider/MCP、持久化与发布——forge 已经不只是「一个编码 Agent」，
        而是一个<strong>结构清晰、能力可插拔、敢放生产的 agent harness</strong>。
      </p>
      <Example title="你现在能做什么">
        想给 forge 加能力？写一个中间件，插进链里。想换隔离方式？实现一个新沙箱后端。想加领域知识？丢一个 SKILL.md。
        想接公司内部工具？挂一个 MCP server。<strong>主循环再也不用动</strong>——这就是一套好架构的终极回报，也是 DeerFlow 给我们上的最后一课。
      </Example>

      <Summary
        points={[
          '技能 = SKILL.md（frontmatter 门面 + Markdown 正文），结构与 DeerFlow 一致；name/description 必填，可选 allowed-tools。',
          '渐进式加载：启动只解析 frontmatter，system prompt 只放「名字+描述+路径」的目录，模型用到才 read_file 正文——按需付费的上下文。',
          '/skill-name 显式激活由中间件确定性内联整份正文，优先于模型猜测（对应 SkillActivationMiddleware）；与 CLI 本地斜杠命令不冲突。',
          'allowed-tools 可接权限系统收紧工具集；至此 forge 对照 DeerFlow 补齐七项能力，从「编码 Agent」长成「可插拔、敢放生产的 harness」。',
        ]}
      />
    </article>
  )
}

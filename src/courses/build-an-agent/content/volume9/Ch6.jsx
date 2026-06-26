import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const shapeSrc = `// memory/types.ts —— 学习型记忆的结构（精简自 DeerFlow 的 memory.json）
export interface Memory {
  user: {
    workContext: string       // 角色/项目/技术栈（1-3 句）
    preferences: string       // 沟通/工具/风格偏好
    topOfMind: string         // 最近在关注的几件事
  }
  facts: { content: string; category: 'preference' | 'context' | 'correction'; confidence: number }[]
  updatedAt: string
}`

const injectSrc = `// middleware/memory.ts —— 读侧：每轮把记忆注入为「系统提醒」，而不是写进 system prompt
export function memoryMiddleware(store: MemoryStore): Middleware {
  let injected = false
  return {
    name: 'memory',
    async beforeAgent(c) {
      if (injected) return
      const mem = await store.load(c.ctx.cwd)
      if (!mem) return
      // 注入到「第一条用户消息之前」的一条隐藏提醒里
      c.messages.unshift({ role: 'user', content: [{ type: 'text',
        text: \`<系统提醒>\\n<记忆>\\n\${renderMemory(mem)}\\n</记忆>\\n</系统提醒>\` }] })
      injected = true
    },
    // 写侧见下：任务结束后异步归纳
    async afterAgent(c) {
      queueMemoryUpdate(store, c.ctx.cwd, recentTurns(c.messages))
    },
  }
}`

const updateSrc = `// memory/updater.ts —— 写侧：用一次「后台 LLM 调用」把对话归纳进记忆
const MEMORY_UPDATE_PROMPT = \`你是记忆管理器。读「当前记忆」和「最近对话」，输出更新后的记忆。
- 提取关于用户的稳定事实、偏好、纠正（带 category 与 confidence）
- 用户纠正过你的地方，记为 category="correction"，confidence>=0.95
- 只保留对未来对话有用的信息；与新信息矛盾的旧事实要删除
- 不要记录一次性的、会话临时的东西（比如某次上传的文件）
只返回 JSON：{ user:{...}, facts:[...] }\`

export async function updateMemory(store, cwd, conversation) {
  const current = await store.load(cwd)
  // 注意：这是「后台」调用，不阻塞用户的下一句——去抖动后再跑
  const json = await provider.completeJSON(MEMORY_UPDATE_PROMPT, { current, conversation })
  await store.save(cwd, { ...json, updatedAt: new Date().toISOString() })
}`

export default function Ch6() {
  return (
    <article>
      <Lead>
        第 4 卷的 <code>AGENTS.md</code> 是<strong>静态记忆</strong>——你手写项目约定，forge 启动时读进来。但它不会「学习」：你纠正过它十次的同一个错，
        下次它照犯。DeerFlow 有一套<strong>学习型记忆</strong>：任务结束后用一次后台 LLM 调用把对话归纳成结构化记忆，下次自动注入。
        这一章给 forge 补上这个能「越用越懂你」的记忆系统。
      </Lead>

      <h2>一、两种记忆，互补而非替代</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th></th><th>AGENTS.md（第 4 卷）</th><th>学习型记忆（本章）</th></tr></thead>
          <tbody>
            <tr><td>谁写的</td><td>你手写</td><td>forge 自己归纳</td></tr>
            <tr><td>内容</td><td>项目约定、构建命令</td><td>你的偏好、被纠正过的事实</td></tr>
            <tr><td>更新</td><td>手动改文件</td><td>每次任务后自动更新</td></tr>
            <tr><td>对应 DeerFlow</td><td>SOUL.md / 项目配置</td><td><code>agents/memory/</code> 子系统</td></tr>
          </tbody>
        </table>
      </div>

      <h2>二、记忆长什么样</h2>
      <CodeBlock lang="ts" title="memory/types.ts" code={shapeSrc} />
      <p>
        结构精简自 DeerFlow 的 <code>memory.json</code>（它还分 history 的近期/早期/长期等小节）。关键是带 <code>category</code> 和
        <code>confidence</code>：尤其是 <code>correction</code> 类——「用户纠正过我什么」是最该牢记的高价值信息。
      </p>

      <h2>三、读侧：注入为「系统提醒」，而不是塞进 system prompt</h2>
      <CodeBlock lang="ts" title="middleware/memory.ts" code={injectSrc} />
      <KeyIdea title="为什么不写进 system prompt（一个重要细节）">
        直觉上记忆该放 system prompt。但 DeerFlow 故意<strong>不这么做</strong>：它让 system prompt 保持<strong>完全静态</strong>（跨用户/会话一字不差），
        把记忆和日期改由 <code>DynamicContextMiddleware</code> 每轮注入到第一条用户消息前的 <code>&lt;system-reminder&gt;</code> 里。
        原因是 <strong>prefix-cache</strong>：system prompt 不变，模型侧的前缀缓存才能命中，省钱省延迟。我们给 forge 抄这个做法——
        记忆走 <code>beforeAgent</code> 注入消息流，而不是进 <code>buildSystemPrompt</code>。
      </KeyIdea>

      <h2>四、写侧：后台 LLM 归纳，不阻塞用户</h2>
      <CodeBlock lang="ts" title="memory/updater.ts" code={updateSrc} />
      <p>
        记忆不是 Agent 主动写的，而是任务结束后（<code>afterAgent</code>）把「最近对话」入队，<strong>去抖动后在后台</strong>用一个专门的
        memory-update prompt 调 LLM 归纳成 JSON 写回。关键是<strong>不能阻塞用户的下一句</strong>——对应 DeerFlow 的
        <code>MemoryMiddleware.after_agent</code> + <code>MemoryUpdateQueue</code> + 专用线程池的异步去抖动写回。
      </p>
      <Callout variant="warn" title="只记该记的">
        DeerFlow 的更新 prompt 里有一条很实际的规则：<strong>不要把「上传文件」之类会话临时的东西写进长期记忆</strong>（它们下次就不在了，记了反而误导）。
        我们也照抄。记忆要的是「稳定偏好 + 被纠正的事实」，不是流水账。
      </Callout>

      <Example title="越用越懂你">
        第一次你纠正 forge：「提交信息别写那么啰嗦，一行就行」。任务结束后这条被归纳成
        <code>{'{ content: "用户偏好一行式 commit message", category: "preference", confidence: 0.95 }'}</code>。
        下次新会话，记忆注入后 forge 一上来就用一行式提交——你不用再说第二遍。这就是静态 AGENTS.md 给不了的东西。
      </Example>

      <Summary
        points={[
          'AGENTS.md 是手写静态记忆，不会学习；学习型记忆（对应 DeerFlow agents/memory/）任务后自动归纳、越用越懂你，两者互补。',
          '记忆结构带 category/confidence，尤其重视 correction 类——「用户纠正过我什么」是最高价值信息。',
          '读侧走 beforeAgent 注入为 <系统提醒> 消息而非 system prompt——为了让 system prompt 保持静态、命中 prefix-cache（抄 DeerFlow DynamicContextMiddleware）。',
          '写侧在 afterAgent 入队、去抖动后后台 LLM 归纳成 JSON 写回，绝不阻塞用户下一句；只记稳定偏好/纠正，不记会话临时的东西。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const beforeSrc = `// 主循环 v1：所有「业务智能」都硬塞在循环体里，越长越乱
while (true) {
  injectMemory(messages)              // 上下文工程
  maybeCompact(messages)              // 自动压缩
  const res = await provider.complete(messages)
  recordTokens(res)                   // 成本统计
  messages.push({ role: 'assistant', content: res.content })
  const toolUses = res.content.filter((b) => b.type === 'tool_use')
  if (toolUses.length === 0) break
  for (const tu of toolUses) {
    if (!await checkPermission(tu)) ... // 权限
    audit(tu)                          // 审计
    const out = await runTool(tu)
    out = truncateIfHuge(out)          // 输出预算
    ...
  }
}
// 再想加「循环检测」「澄清中断」「沙箱」…… 这个函数会膨胀成一坨无法测试的泥球`

const mwTypeSrc = `// middleware/types.ts —— 一个中间件 = 在几个固定时机插手的对象
import type { Message, ContentBlock, ToolUseBlock, ToolResult } from '../types.js'
import type { ToolContext } from '../tools/types.js'

export interface AgentContext {
  messages: Message[]
  system: string
  ctx: ToolContext          // cwd / 权限 / 日志 …
  signal: AbortSignal
  /** 跨中间件共享的小黑板（沙箱 id、token 统计、循环计数…）。 */
  scratch: Record<string, unknown>
}

export interface Middleware {
  name: string
  /** 整个任务开始前跑一次（注入记忆、解析项目配置）。 */
  beforeAgent?(c: AgentContext): Promise<void> | void
  /** 每次调用模型前（压缩历史、注入动态上下文）。 */
  beforeModel?(c: AgentContext): Promise<void> | void
  /** 每次模型返回后（记 token、检测循环、剥离危险 tool_use）。 */
  afterModel?(c: AgentContext, res: { content: ContentBlock[] }): Promise<void> | void
  /** 包裹一次工具执行（权限、审计、输出预算、错误转 tool_result）。 */
  wrapTool?(tu: ToolUseBlock, next: () => Promise<ToolResult>): Promise<ToolResult>
}`

const loopSrc = `// agent.ts —— 主循环退化成「只负责转圈」，智能全在中间件里
export async function runAgent(c: AgentContext, mw: Middleware[], provider: Provider) {
  await runHook(mw, 'beforeAgent', c)

  for (let turn = 0; turn < maxTurns; turn++) {
    await runHook(mw, 'beforeModel', c)
    const res = await provider.complete(c.messages, c.system, c.signal)
    await runHook(mw, 'afterModel', c, res)        // 可能改写 res.content
    c.messages.push({ role: 'assistant', content: res.content })

    const toolUses = res.content.filter((b) => b.type === 'tool_use')
    if (toolUses.length === 0) break               // 正常收尾

    const results = await dispatch(toolUses, (tu) =>
      // 工具执行被一层层 wrapTool 包住（洋葱模型）
      composeWrap(mw, tu, () => runTool(tu, c.ctx)),
    )
    c.messages.push({ role: 'user', content: results })
  }
}

// 把 wrapTool 串成洋葱：mw[0].wrap( mw[1].wrap( … runTool ) )
function composeWrap(mw: Middleware[], tu: ToolUseBlock, base: () => Promise<ToolResult>) {
  return mw.reduceRight((next, m) =>
    m.wrapTool ? () => m.wrapTool!(tu, next) : next, base)()
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        到第 8 卷结束，forge 已经是个能用的编码 Agent。但如果你回头看 <code>runAgent</code> 这个函数，会发现一个危险信号：
        权限、审计、压缩、成本、token——所有能力都<strong>硬塞在同一个 while 循环里</strong>，函数越长越没法测、越没法加新东西。
        字节的 DeerFlow 给了我们一个标准答案：<strong>把主循环掏空，所有「业务智能」拆成一个个可插拔的中间件</strong>。
        这一卷就以 DeerFlow 的真实实现为蓝本，给 forge 补上它欠缺的那些生产级能力——而这一章先把地基换成中间件架构。
      </Lead>

      <h2>一、问题：主循环正在变成一坨泥球</h2>
      <CodeBlock lang="ts" title="主循环 v1 的困境（反面教材）" code={beforeSrc} />
      <p>
        每加一个能力，就往循环体里塞几行。等到要加「循环检测」「澄清即中断」「沙箱隔离」时，这个函数会膨胀到无法阅读、无法单测——
        因为每个关注点都和别人纠缠在一起。这正是 DeerFlow 团队踩过、并用架构解决掉的问题。
      </p>
      <Callout variant="note" title="DeerFlow 是怎么做的">
        DeerFlow 的主循环本体几乎是空的——它直接用 LangChain 的 <code>create_agent</code> 跑 ReAct 循环，而把压缩、记忆、循环检测、
        澄清、安全审计等<strong>二十多个关注点</strong>全部拆成 <code>AgentMiddleware</code>，按固定顺序叠在循环上
        （见 <code>backend/packages/harness/deerflow/agents/factory.py</code> 与 <code>agents/middlewares/</code> 目录）。
        我们没有 LangChain，但可以把同样的思想搬进 forge。
      </Callout>

      <h2>二、定义中间件：四个插手时机</h2>
      <p>
        一个中间件就是一个对象，能在四个固定时机插手。这组钩子对应 DeerFlow 的 <code>before_agent</code> / <code>before_model</code> /
        <code>after_model</code> / <code>wrap_tool_call</code>：
      </p>
      <CodeBlock lang="ts" title="middleware/types.ts" code={mwTypeSrc} />
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>钩子</th><th>时机</th><th>本卷哪一章用它</th></tr></thead>
          <tbody>
            <tr><td><code>beforeAgent</code></td><td>任务开始前一次</td><td>学习型记忆注入（c6）、沙箱准备（c2）</td></tr>
            <tr><td><code>beforeModel</code></td><td>每次调模型前</td><td>动态上下文注入（c6）、压缩（已有，可迁移）</td></tr>
            <tr><td><code>afterModel</code></td><td>每次模型返回后</td><td>循环检测、悬空修复、安全剥离（c4）</td></tr>
            <tr><td><code>wrapTool</code></td><td>包裹一次工具执行</td><td>沙箱（c2）、澄清拦截（c3）、输出预算（c5）、错误自愈（c4）</td></tr>
          </tbody>
        </table>
      </div>
      <KeyIdea title="scratch：中间件之间的共享黑板">
        中间件之间<strong>不直接通信</strong>，而是通过 <code>AgentContext.scratch</code> 这块共享小黑板交换数据（沙箱 id、循环计数、token 统计…）。
        这正是 DeerFlow 用 <code>ThreadState</code> 做的事——只不过我们用一个简单的字典代替带 reducer 的状态图。
      </KeyIdea>

      <h2>三、掏空主循环</h2>
      <CodeBlock lang="ts" title="agent.ts（中间件版主循环）" code={loopSrc} />
      <p>
        看 <code>composeWrap</code>：它用 <code>reduceRight</code> 把所有 <code>wrapTool</code> 串成一个洋葱——<code>mw[0]</code> 在最外层、
        最先碰到工具调用，<code>runTool</code> 在最里层。这与 DeerFlow（以及 Express/Koa）的中间件模型完全一致。
        而 <code>beforeModel</code> 按顺序执行、<code>afterModel</code> 按逆序分发，正是洋葱的两半。
      </p>

      <h2>四、顺序即语义</h2>
      <p>
        中间件的<strong>排列顺序不是风格，而是语义</strong>。举个本卷后面会遇到的例子：负责「剥离被安全策略截断的半截 tool_use」的中间件，
        必须排在「循环检测」之前——否则那半截调用会被误计入循环计数。DeerFlow 在
        <code>agents/middlewares/__init__.py</code> 的装配注释里反复强调这一点。我们给 forge 定一个清晰的默认顺序：
      </p>
      <CodeBlock
        lang="ts"
        title="agent/middlewares/index.ts —— 默认装配顺序"
        code={`export function defaultMiddlewares(opts): Middleware[] {
  return [
    sandboxMiddleware(opts.sandbox),      // c2：先把工具关进围栏
    memoryMiddleware(opts.memory),        // c6：beforeAgent 注入学习型记忆
    skillMiddleware(opts.skills),         // c7：技能渐进加载 / slash 激活
    toolBudgetMiddleware(),               // c5：超大输出落盘
    clarificationMiddleware(),            // c3：拦截 ask_user → 中断
    safetyMiddleware(),                   // c4：剥离危险/半截 tool_use（afterModel 先跑）
    loopDetectionMiddleware(),            // c4：循环检测（在 safety 之后）
    errorHealingMiddleware(),             // c4：工具错误转 tool_result
  ]
}`}
      />

      <Example title="这一章给后面六章铺好了路">
        从现在起，本卷每一章都只做一件事：<strong>写一个新的中间件</strong>，插进上面的链里。沙箱、澄清、护栏、输出预算、记忆、技能——
        全都是一个个独立、可单测、可开关的文件，而 <code>runAgent</code> 再也不用动。这就是 DeerFlow 教给我们的最重要的一课。
      </Example>

      <Summary
        points={[
          'forge 的主循环把所有能力硬塞在一起，正在变成无法测试的泥球——DeerFlow 用中间件架构解决了同样的问题。',
          '定义 Middleware 接口的四个钩子（beforeAgent/beforeModel/afterModel/wrapTool），对应 DeerFlow 的 before_agent/before_model/after_model/wrap_tool_call。',
          '主循环退化成「只负责转圈」，wrapTool 用 reduceRight 串成洋葱；中间件之间靠 AgentContext.scratch 共享黑板（对应 DeerFlow 的 ThreadState）。',
          '中间件的装配顺序是语义而非风格；本卷后续每章都只是「写一个新中间件插进链里」，runAgent 不再改动。',
        ]}
      />
    </article>
  )
}

import { useState } from 'react'
import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Figure from '@/components/illustrations/Figure.jsx'
import LoopStepper from '@/courses/build-an-agent/illustrations/LoopStepper.jsx'

// 小插图：循环的三种「停因」对照——正常收尾 / 安全阀触顶 / 致命错误。
function StopReasons() {
  const [pick, setPick] = useState('done')
  const cases = {
    done: {
      label: '正常收尾',
      color: 'var(--green)',
      desc: '模型这轮没有 tool_use → 任务完成，break，返回 finalText。这是我们想要的停。',
    },
    cap: {
      label: '安全阀触顶',
      color: 'var(--rose)',
      desc: 'turn 转满 maxTurns 仍未收尾 → 被迫 break。任务可能没做完，生产版应回报 max_turns。',
    },
    fatal: {
      label: '致命错误',
      color: 'var(--rose)',
      desc: 'provider.complete 自己抛异常（网络/鉴权/限流）→ 循环内无法自愈，往上抛。注意它不同于「工具失败」。',
    },
  }
  const controls = (
    <>
      {Object.entries(cases).map(([k, v]) => (
        <button key={k} className={`fig-btn ${pick === k ? 'active' : ''}`} onClick={() => setPick(k)}>{v.label}</button>
      ))}
    </>
  )
  const cur = cases[pick]
  return (
    <Figure caption="主循环会因三类性质完全不同的原因停下：只有「没有 tool_use」是正常收尾；触顶和致命错误都是异常的停，上层应当能区分。" controls={controls}>
      <svg viewBox="0 0 460 120" width="460" role="img" aria-label="循环停机的三种原因">
        <rect x="18" y="44" width="96" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="66" y="65" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">while 循环</text>
        <line x1="114" y1="61" x2="160" y2="61" stroke={cur.color} strokeWidth="1.6" markerEnd="url(#sr-a)" />
        <rect x="160" y="40" width="120" height="42" rx="8" fill="var(--bg-subtle)" stroke={cur.color} />
        <text x="220" y="66" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={cur.color}>{cur.label}</text>
        <defs>
          <marker id="sr-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill={cur.color} /></marker>
        </defs>
        <rect x="18" y="92" width="424" height="22" rx="6" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="28" y="107" fontFamily="var(--sans)" fontSize="10.5" fill="var(--ink)">{cur.desc}</text>
      </svg>
    </Figure>
  )
}

const pseudoSrc = `// 主循环的本质：一段几乎不含智能的 while 循环
messages.push({ role: 'user', content: userInput })

while (true) {
  const res = await model.complete(messages)   // 把整份历史发给模型
  messages.push({ role: 'assistant', content: res.content })

  const toolUses = res.content.filter((b) => b.type === 'tool_use')
  if (toolUses.length === 0) break              // 纯文本 → 活干完了，停

  const results = await runTools(toolUses)      // 执行工具
  messages.push({ role: 'user', content: results })  // 结果回灌，再转一圈
}

return finalText  // 把最终答案交还用户`

const stopReasonSrc = `// stop_reason：模型为什么停下这一轮。不同值要不同对待。
switch (res.stopReason) {
  case 'end_turn':
    // 模型自己觉得说完了。配合「没有 tool_use」即可收尾。
    break

  case 'tool_use':
    // 模型停下是为了等工具结果——执行工具、回灌、再转一圈。
    // （forge 实际不读这个字段，而是直接看 content 里有没有 tool_use，更可靠。）
    break

  case 'max_tokens':
    // 输出被 maxTokens 截断了！回复可能是「半句话」，
    // 甚至 tool_use 的 input JSON 都没写完——这种残缺结果直接回灌会很危险。
    // 生产级做法：要么调大 maxTokens 重试，要么提示模型「接着上次继续」。
    break

  case 'stop_sequence':
    // 命中了你设的停止串。在我们的循环里一般用不到。
    break
}`

const reactSrc = `// 主循环跑出来的 messages，本质上就是一条 ReAct 轨迹（Reason + Act 交替）：
//
//   user:      把端口从 3000 改成 8080
//   assistant: [Reason] 我得先找到端口定义在哪
//              [Act]    grep "3000"
//   user:      [Observe] server.ts:12:  const PORT = 3000
//   assistant: [Reason] 找到了，在 server.ts 第 12 行，用 edit 精确替换
//              [Act]    edit server.ts  3000 -> 8080
//   user:      [Observe] 已修改 server.ts
//   assistant: [Reason] 改完了，没有更多动作
//              (无 tool_use) -> 循环停
//
// 「Reason→Act→Observe」三步在我们的循环里分别对应：
//   text 块（想）/ tool_use 块（做）/ tool_result（看到结果）。
// 我们没有显式写 ReAct，但循环结构天然就长成了它的样子。`

const agentSrc = `import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from './types.js'
import type { Tool, ToolContext } from './tools/types.js'
import type { Provider } from './provider/types.js'
import { buildToolRegistry } from './tools/index.js'

export interface AgentOptions {
  provider: Provider
  tools: Tool[]
  system: string
  cwd: string
  maxTokens?: number
  /** 安全阀：单次任务最多转多少轮，防止失控空转。 */
  maxTurns?: number
  /** 把内部事件回调给上层（CLI 用它做展示）。 */
  onEvent?: (e: AgentEvent) => void
}

export type AgentEvent =
  | { type: 'assistant_text'; text: string }
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; output: string; isError: boolean }

// Agent 主循环：维护一份扁平消息历史，反复「调模型 → 执行工具 → 回灌」，直到模型不再调用工具。
export class Agent {
  private provider: Provider
  private registry: Map<string, Tool>
  private toolList: Tool[]
  private system: string
  private ctx: ToolContext
  private maxTokens: number
  private maxTurns: number
  private onEvent?: (e: AgentEvent) => void
  /** 跨多次 runTurn 持续累积的会话历史。 */
  messages: Message[] = []

  constructor(opts: AgentOptions) {
    this.provider = opts.provider
    this.toolList = opts.tools
    this.registry = buildToolRegistry(opts.tools)
    this.system = opts.system
    this.ctx = { cwd: opts.cwd }
    this.maxTokens = opts.maxTokens ?? 8192
    this.maxTurns = opts.maxTurns ?? 50
    this.onEvent = opts.onEvent
  }

  /** 处理用户的一条输入，跑到模型给出最终文本为止，返回最终回答。 */
  async runTurn(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: [{ type: 'text', text: userInput }] })

    let finalText = ''
    for (let turn = 0; turn < this.maxTurns; turn++) {
      const res = await this.provider.complete({
        system: this.system,
        messages: this.messages,
        tools: this.toolList,
        maxTokens: this.maxTokens,
      })
      this.messages.push({ role: 'assistant', content: res.content })

      const text = res.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('')
      if (text) this.onEvent?.({ type: 'assistant_text', text })

      const toolUses = res.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
      if (toolUses.length === 0) {
        finalText = text
        break // 没有工具调用 = 活干完了，停。
      }

      const results = await this.runTools(toolUses)
      this.messages.push({ role: 'user', content: results })
    }
    return finalText
  }

  // 工具调度：把一轮里的工具调用按「只读」分两组。
  // 只读的并发执行（互不影响、省时间）；写的串行执行（会改状态、保一致性）。
  private async runTools(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]> {
    const reads = toolUses.filter((t) => this.registry.get(t.name)?.readOnly)
    const writes = toolUses.filter((t) => !this.registry.get(t.name)?.readOnly)

    const readResults = await Promise.all(reads.map((t) => this.execOne(t)))
    const writeResults: ToolResultBlock[] = []
    for (const t of writes) writeResults.push(await this.execOne(t))

    // 回灌顺序按模型原始调用顺序排列，便于它对应。
    const byId = new Map<string, ToolResultBlock>()
    for (const r of [...readResults, ...writeResults]) byId.set(r.tool_use_id, r)
    return toolUses.map((t) => byId.get(t.id)!)
  }

  private async execOne(call: ToolUseBlock): Promise<ToolResultBlock> {
    const tool = this.registry.get(call.name)
    this.onEvent?.({ type: 'tool_start', name: call.name, input: call.input })
    if (!tool) {
      const msg = \`未知工具：\${call.name}\`
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
    try {
      const r = await tool.execute(call.input, this.ctx)
      this.onEvent?.({ type: 'tool_end', name: call.name, output: r.output, isError: !!r.isError })
      return { type: 'tool_result', tool_use_id: call.id, content: r.output, is_error: r.isError }
    } catch (err) {
      const msg = \`工具异常：\${(err as Error).message}\`
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
  }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          前两章我们把「记忆」（messages 历史）和「类型边界」都备齐了，但它们还只是一堆静态的数据结构——
          躺在那儿，不会动。这一章，我们要给 forge 装上心跳：一个会<strong>自己转起来</strong>的主循环。
          它把消息历史、Provider、工具三者拼到一起，反复地「调模型 → 执行工具 → 回灌结果」，
          直到模型说「我说完了」。这段循环的代码短得惊人，逻辑也朴素得近乎无聊——
          但正是它，把一个「一问一答的聊天机器人」变成了一个「能真正干活的 Agent」。这是全课程最核心的一章。
        </p>
      </Lead>

      <h2>主循环的本质：一个 while 循环</h2>
      <p>
        别被「Agent」这个词唬住。剥掉所有外壳，主循环就是一个 <code>while</code> 循环，干三件事：
      </p>
      <ol>
        <li>把<strong>整份</strong> messages 历史发给模型，拿回一轮回复（assistant 消息）。</li>
        <li>
          检查这轮回复里有没有 <code>tool_use</code>。
          <strong>有</strong>，就去执行这些工具，把每个 <code>tool_result</code> 追加回历史，然后<strong>再转一圈</strong>。
        </li>
        <li>
          <strong>没有</strong> tool_use（即模型给的是纯文本、<code>stop_reason=end_turn</code>），
          说明活干完了——跳出循环，把最终文本交还用户。
        </li>
      </ol>
      <p>
        就这么三步，转上几圈，模型就能「读文件 → 看到内容 → 决定改哪里 → 改 → 确认 → 汇报」地把一整件事办完。
        下面这个小工具，跟着一条真实任务（改端口号）点一遍，盯住右下角的 <code>stop_reason</code>：
        只要它不是 <code>end_turn</code>，循环就继续转。
      </p>

      <LoopStepper />

      <KeyIdea title="循环本身几乎不含智能，智能全在模型和工具里">
        <p>
          盯着上面的循环你会发现：它不做任何「思考」。它不决定该用哪个工具、不理解文件内容、不规划步骤——
          这些<strong>全部</strong>是模型的事；真正的动作（读文件、跑命令）<strong>全部</strong>是工具的事。
          循环只负责一件最机械的搬运：把历史递给模型、把模型要的工具结果递回去，如此往复。
          但恰恰是这个「无脑」的循环，把模型那种「一次只能回一句话」的单回合能力，
          缝合成了「能连续行动、能根据结果调整、能把一件复杂的事办到底」的 Agent。
          智能是模型给的，但<strong>能动手</strong>是循环给的。
        </p>
      </KeyIdea>

      <h2>先建立直觉：12 行伪代码</h2>
      <p>
        在看真实代码之前，先用一段去掉所有干扰的伪代码，把骨架刻进脑子里。
        把它读三遍，确保你能不看代码复述出来：
      </p>

      <CodeBlock lang="ts" title="主循环的本质（伪代码）" code={pseudoSrc} />

      <p>
        全部精华就在这里：<code>push</code> 用户输入 → 进 <code>while</code> → 调模型 → <code>push</code> assistant →
        没工具就 <code>break</code>，有工具就执行、<code>push</code> 结果、继续。
        真实的 forge 代码，无非是给这段骨架补上类型、事件回调、安全阀和工具调度——但骨架，一根没多。
      </p>

      <h2>forge 的真实主循环：src/agent.ts</h2>
      <p>
        下面是 forge 仓库里 <code>src/agent.ts</code> 的<strong>逐字</strong>内容。比伪代码长，但你会发现它和那 12 行
        是同一个东西。先通读，再看下面一段段拆解。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts" code={agentSrc} />

      <h3>AgentOptions：构造 Agent 需要的一切</h3>
      <p>
        这是创建一个 Agent 实例时要交给它的全部配置。逐项看：
      </p>
      <ul>
        <li><code>provider</code>：模型适配器。主循环只通过它的 <code>complete()</code> 跟模型对话，不关心背后是哪家。</li>
        <li><code>tools</code>：这个 Agent 能用的工具清单，会被注册成一张「名字 → 工具」的查找表。</li>
        <li><code>system</code>：系统提示词。注意它<strong>单独传</strong>，不进 messages（呼应上一章）。</li>
        <li><code>cwd</code>：当前工作目录。会被包进 <code>ToolContext</code>，工具据此知道在哪个项目里操作。</li>
        <li><code>maxTokens?</code>：单轮回复的最大输出 token 数，缺省 8192。</li>
        <li><code>maxTurns?</code>：<strong>安全阀</strong>——单次任务最多转多少圈，缺省 50。下面专门讲它，这是性命攸关的一个字段。</li>
        <li><code>onEvent?</code>：事件回调。主循环跑的时候，会通过它把「模型说了什么」「某个工具开始/结束了」实时吐给上层。</li>
      </ul>

      <h3>AgentEvent：把内部事件喊给 CLI 看</h3>
      <p>
        主循环在闷头转，但用户得看到进度——不然就是对着一个卡住的光标干等。
        <code>AgentEvent</code> 是一个可辨识联合，定义了三种循环内部会发出的事件：
      </p>
      <ul>
        <li><code>assistant_text</code>：模型这一轮产出了一段文本（可能是中途的思考，也可能是最终答案）。</li>
        <li><code>tool_start</code>：某个工具<strong>开始</strong>执行了，带上工具名和参数。CLI 可以打印「正在读取 package.json…」。</li>
        <li><code>tool_end</code>：某个工具<strong>执行完了</strong>，带上输出和是否出错。</li>
      </ul>
      <p>
        关键在于：内核<strong>不直接打印任何东西</strong>。它只发事件，怎么展示是 CLI 层的事。
        这样同一个 Agent 内核，既能驱动一个花哨的终端 UI，也能跑在测试里、跑在脚本里——展示与逻辑彻底分离。
      </p>

      <h3>messages：跨多轮持续累积</h3>
      <p>
        注意 <code>messages</code> 是<strong>实例字段</strong>，不是 <code>runTurn</code> 里的局部变量。
        这意味着用户可以连续多次调用 <code>runTurn</code>（一问、再追问、再追问），
        每次新输入都<strong>追加</strong>到同一份历史末尾，模型因此「记得」之前聊过的一切。
        一次 <code>runTurn</code> 内部可能转很多圈，而多次 <code>runTurn</code> 之间共享同一条时间线——这就是「会话」。
      </p>

      <h3>runTurn 的 for 循环与 maxTurns 安全阀</h3>
      <p>
        伪代码里我写的是 <code>while (true)</code>，但真实代码用的是
        <code>for (let turn = 0; turn &lt; this.maxTurns; turn++)</code>。差别就在 <code>maxTurns</code>：
        循环最多转这么多圈，到顶了无论模型在干嘛都强制停下。这不是优化，是<strong>保命</strong>。
      </p>
      <p>
        循环体内的逻辑和伪代码一一对应：<code>provider.complete</code> 调模型 → 把 <code>res.content</code> 作为
        assistant 消息 push 进历史 → 抽文本、发事件 → 找 tool_use → 没有就 <code>break</code>、有就执行并回灌。
      </p>

      <h3>怎么从一轮回复里抽出文本</h3>
      <p>
        <code>res.content</code> 是一个混合数组，里面可能既有 text 块又有 tool_use 块。要拿纯文本，就
        <code>filter</code> 出 <code>type === 'text'</code> 的块、取它们的 <code>.text</code>、<code>join</code> 起来。
        那个看着吓人的 <code>(b): b is Extract&lt;ContentBlock, &#123; type: 'text' &#125;&gt;</code> 是 TypeScript 的
        <strong>类型谓词</strong>：它告诉编译器「filter 之后剩下的都是 text 块」，于是后面 <code>b.text</code> 才不会报错。
        逻辑上，它等价于伪代码里那句朴素的「取出所有文本」。
      </p>

      <h3>判断 toolUses 为空就停</h3>
      <p>
        这是整个循环的「刹车」：<code>filter</code> 出所有 <code>tool_use</code> 块，
        如果 <code>toolUses.length === 0</code>，说明模型这轮没要任何工具——它认为话说完了。
        于是把刚抽出的 <code>text</code> 记为 <code>finalText</code>，<code>break</code> 出循环，返回给用户。
        注意：判断「停不停」靠的是「有没有 tool_use」这个<strong>事实</strong>，简单可靠；
        <code>stop_reason</code> 只是模型给的提示，真正决定权在我们手里这个 filter。
      </p>

      <h3>停机条件：到底有几种「该停」的理由？</h3>
      <p>
        一个 Agent 循环的健壮性，几乎全体现在「它什么时候停、怎么停」上。归拢一下，forge 这个循环会因为<strong>三类</strong>原因停下，
        三类的「性质」完全不同，绝不能混为一谈：
      </p>
      <ul>
        <li>
          <strong>正常收尾（该停）</strong>：模型这一轮没有任何 <code>tool_use</code>——它认为任务完成、给出了最终文本。这是我们<strong>想要</strong>的停。
        </li>
        <li>
          <strong>安全阀触顶（被迫停）</strong>：转够了 <code>maxTurns</code> 圈还没收尾，强制 <code>break</code>。这是<strong>异常</strong>的停，
          意味着任务可能没真正完成，上层应当感知到「是撞上限停的，不是正常停的」。
        </li>
        <li>
          <strong>致命错误（崩了）</strong>：<code>provider.complete</code> 本身抛异常（网络断了、鉴权失败、限流）。
          注意这<strong>不同于工具失败</strong>——工具失败会变成 tool_result 回灌、循环继续；而调模型这一步炸了，是没法在循环内自愈的，得往上抛。
        </li>
      </ul>
      <p>
        一个值得记住的设计取舍：forge 故意<strong>不</strong>区分「正常停」和「触顶停」的返回值（都返回 <code>finalText</code>），
        这是本卷为了讲清主干刻意做的简化。生产级实现通常会额外返回一个 <code>stopReason: 'completed' | 'max_turns'</code>，
        让 CLI 能提示用户「我转到上限了，可能没做完，要不要让我接着干？」——这正是简化版和生产版的一道分水岭。
      </p>

      <StopReasons />

      <h3>stop_reason：模型自己给的「我为什么停」</h3>
      <p>
        上面 forge 靠「有没有 tool_use」这个事实来决定停不停，那 Provider 返回的 <code>stopReason</code> 字段还有什么用？
        它是模型<strong>自报</strong>的停下原因，几种值的处置策略很不一样，其中一个尤其是隐藏的坑：
      </p>
      <CodeBlock lang="ts" title="stop_reason 的几种取值与处置" code={stopReasonSrc} />
      <Callout variant="warn" title="最阴的坑：max_tokens 截断会产出「半个 tool_use」">
        <p>
          <code>'end_turn'</code> 和 <code>'tool_use'</code> 都好办，真正会咬人的是 <code>'max_tokens'</code>：
          模型的输出被你设的 <code>maxTokens</code> 硬生生切断了。如果切在一段文本中间，顶多是回复不完整；
          但如果切在一个 <code>tool_use</code> 的 <code>input</code> JSON 中间——你拿到的就是个<strong>参数残缺甚至无法解析</strong>的工具调用。
          这时若照常去执行，轻则参数错乱、重则触发 API 报错。所以严谨的循环会在回灌前检查 stop_reason：
          若是 <code>max_tokens</code>，要么调大上限重试，要么提示模型「上次被截断了，请重发完整的调用」。
          forge 本卷为保持主干清爽暂未处理它，但你心里要清楚这个坑的存在。
        </p>
      </Callout>

      <Callout variant="warn" title="maxTurns：没有它，一次失控就能烧光你的钱">
        <p>
          想象模型陷进了一个怪圈：读文件 → 觉得不对 → 再读 → 还是不对 → 再读……每一圈都是一次真金白银的 API 调用，
          每一圈历史都更长、token 更贵。如果循环是 <code>while (true)</code> 且没有上限，它会一直转下去，
          直到撞上模型上下文上限报错，而那之前，你的账单已经涨了几十上百倍。
          <code>maxTurns</code> 就是那道熔断闸：转到 50 圈还没收尾，强制停。
          生产级的 Agent，<strong>必须</strong>有这道阀门——它不是锦上添花，是底线。哪怕你只写一个玩具，也请第一天就加上。
        </p>
      </Callout>

      <h3>runTools：只读并行、写串行</h3>
      <p>
        一轮里模型可能<strong>同时</strong>发起多个工具调用（比如一口气读三个文件）。怎么执行它们？
        <code>runTools</code> 按工具的 <code>readOnly</code> 标志分两组：
      </p>
      <ul>
        <li>
          <strong>只读工具并行执行</strong>（<code>Promise.all</code>）。读文件、搜索这类操作互不影响、不改变任何状态，
          一起跑能省下大把等待时间。
        </li>
        <li>
          <strong>写工具串行执行</strong>（<code>for</code> 循环逐个 <code>await</code>）。写文件、跑命令会改变世界，
          并行会撞车（两个写同一个文件谁先谁后？），所以一个一个来，保一致性。
        </li>
      </ul>
      <p>
        执行完后，再用一个 <code>id → result</code> 的 Map，把结果<strong>按模型原始调用顺序</strong>重排回去——
        因为我们打乱了执行顺序，但回灌时要让模型能对得上号（呼应上一章 id 配对那一节）。
        这里你只要先抓住「只读并行、写串行」这个直觉就够了；read-only 工具的定义下一章讲，
        调度的更多细节（并发上限、写工具的相互依赖等）留到本卷最后一章细抠。
      </p>

      <h3>execOne：连异常也变成 is_error 回灌</h3>
      <p>
        <code>execOne</code> 执行<strong>单个</strong>工具调用，是整个机制里最该「稳」的一环。它分三种情况：
      </p>
      <ul>
        <li><strong>工具不存在</strong>：模型叫了个没注册的工具名，不崩，回一条 <code>is_error: true</code> 的「未知工具」结果。</li>
        <li><strong>正常执行</strong>：调 <code>tool.execute</code>，把输出和它自己的 <code>isError</code> 标志回灌。</li>
        <li>
          <strong>工具抛异常</strong>：用 <code>try/catch</code> 兜住，把异常信息塞进 <code>content</code>、置 <code>is_error: true</code> 回灌。
        </li>
      </ul>
      <p>
        三种情况的共同点：<strong>绝不让异常冒泡出去中断主循环</strong>。
        工具炸了，就把「它炸了」如实告诉模型，让模型自己决定换条路——这正是上一章「出错也要如实回传」的落地。
        而且每一步都配了 <code>tool_start</code>/<code>tool_end</code> 事件，CLI 全程可见。
      </p>

      <Callout variant="note" title="主循环不关心背后是哪个模型">
        <p>
          通读一遍 <code>agent.ts</code>，你找不到任何一个字符提到「Claude」「Anthropic」或某个具体的 API。
          主循环只认 <code>Provider</code> 这个接口，通过 <code>provider.complete(...)</code> 跟模型说话。
          至于这个 Provider 背后接的是哪家模型、用的是哪个 SDK——内核<strong>一无所知，也不需要知道</strong>。
          （具体的 Claude Provider 我们在后面的卷里实现。）
          这种干净的解耦，正是上一章我们不嫌麻烦、自己定义 <code>Message</code> / <code>ContentBlock</code> 类型换来的回报：
          内核与厂商之间有一条清晰的边界，换模型时内核一行都不用动。
        </p>
      </Callout>

      <h2>这个循环，其实就是 ReAct</h2>
      <p>
        如果你读过 Agent 相关的论文或博客，一定见过 <strong>ReAct</strong>（Reasoning + Acting）这个名字。
        很多人把它当成某种高深的「框架」或「prompt 技巧」，但说穿了，ReAct 描述的就是
        「<strong>推理（Reason）→ 行动（Act）→ 观察结果（Observe）</strong>」这样一个不断循环的过程——
        而这，正是我们这一章手搓出来的主循环。换句话说，<strong>你已经实现了 ReAct，只是没给它起这个名字</strong>。
      </p>
      <CodeBlock lang="ts" title="主循环跑出的 messages 就是一条 ReAct 轨迹" code={reactSrc} />
      <p>
        三者一一对应：模型的 <strong>text 块</strong>是「想」（Reason），<strong>tool_use 块</strong>是「做」（Act），
        forge 回灌的 <strong>tool_result</strong>是「看到结果」（Observe）。它们在 messages 里交替沉淀，就是一条 ReAct 轨迹。
        早期的 ReAct 论文是靠在 prompt 里硬写「Thought: … Action: … Observation: …」的文本格式、再用正则把动作解析出来；
        而今天有了原生的 <code>tool_use</code> 内容块，这套「格式约定 + 解析」被厂商内化进了模型和 API，
        我们只要按结构读写消息就行。<strong>原理没变，工程上干净了一个数量级。</strong>
      </p>
      <Callout variant="note" title="为什么不需要「显式规划」步骤？">
        <p>
          有些 Agent 框架会强制模型先产出一份「计划」（plan），再逐步执行。forge 这个循环里没有这一步——
          因为「下一步做什么」每一轮都由模型<strong>临场</strong>根据最新的观察结果决定（这正是 ReAct 相对「先规划后执行」的优势：
          它能根据中途看到的东西<strong>动态调整</strong>，不会一条道走到黑）。
          显式规划在某些超长任务里有用（能减少跑偏），但它也更僵硬、更贵。本卷选最朴素的 ReAct 式循环，
          是因为它用最少的机制就能覆盖绝大多数任务——先掌握这个，再谈花活。
        </p>
      </Callout>

      <Example title="跑一次会发生什么">
        <p>
          把抽象的循环落到一个具体场景。你对 forge 说：「这个项目用的什么测试框架？」跟着循环走一遍：
        </p>
        <ol>
          <li>
            <strong>第 1 圈</strong>：你的问题作为 user 消息进历史，整份历史发给模型。
            模型没法凭空知道答案，于是它发起一次 <code>tool_use</code>：读 <code>package.json</code>。
            这一轮回复里有 tool_use → 不停，继续。
          </li>
          <li>
            <strong>forge 执行</strong>：<code>runTools</code> 看到这是个只读工具，跑它，
            拿到 <code>package.json</code> 的内容，包成 <code>tool_result</code> 追加回历史（role 是 user）。
          </li>
          <li>
            <strong>第 2 圈</strong>：又把（现在更长的）整份历史发给模型。这次模型看到了文件内容，
            发现 <code>devDependencies</code> 里有 <code>vitest</code>，于是给出一段<strong>纯文本</strong>：
            「这个项目用的是 Vitest。」——没有 tool_use。
          </li>
          <li>
            <strong>停</strong>：<code>toolUses.length === 0</code>，<code>break</code>。
            把「这个项目用的是 Vitest」作为 <code>finalText</code> 返回，交还给你。
          </li>
        </ol>
        <p>
          注意全程发生了「读 → 看 → 答」三步，而这三步是模型<strong>自己</strong>串起来的；
          循环只是忠实地把历史和结果搬来搬去。这就是 Agent。
        </p>
      </Example>

      <Summary
        points={[
          '主循环的本质是一个 while 循环：每圈把整份 messages 历史发给模型，有 tool_use 就执行并回灌、再转一圈，纯文本（无 tool_use）就停。',
          '循环本身几乎不含智能——智能在模型、动作在工具；循环只负责搬运，但正是它把单回合问答缝成了能干活的 Agent。',
          'runTurn 用 for 循环 + maxTurns 安全阀代替 while(true)：到了上限强制停，防止失控空转把账单和上下文烧爆。',
          '判断停不停靠「filter 出的 tool_use 是否为空」这个事实，而非只信模型给的 stop_reason。',
          'messages 是实例字段、跨多次 runTurn 累积，这就是「会话」；一次 runTurn 内部则可能转很多圈。',
          'runTools 把只读工具并行（省时间）、写工具串行（保一致性），再按原始调用顺序重排结果以便模型对号。',
          'execOne 把工具不存在、正常、抛异常三种情况统一成 tool_result 回灌，异常绝不冒泡中断循环——让模型自己纠偏。',
          'AgentEvent + onEvent 把内部事件吐给 CLI 展示，内核自身不打印，做到展示与逻辑分离。',
          '主循环只认 Provider 接口、不关心背后是哪个模型，这是上一章自定义类型换来的解耦回报。',
        ]}
      />
    </>
  )
}

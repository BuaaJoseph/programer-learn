import { useState } from 'react'
import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

function CompactionFigure() {
  const [mode, setMode] = useState('full')
  const rounds = Array.from({ length: 8 }, (_, i) => i + 1)
  const keep = 3
  return (
    <figure style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, margin: '16px 0' }}>
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode('full')}
          style={{ marginRight: 8, fontWeight: mode === 'full' ? 700 : 400 }}
        >
          全量压缩
        </button>
        <button
          type="button"
          onClick={() => setMode('recent')}
          style={{ fontWeight: mode === 'recent' ? 700 : 400 }}
        >
          保留近 {keep} 轮
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 4,
            background: '#cfe8ff',
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          摘要
        </div>
        {rounds.map((r) => {
          const kept = mode === 'recent' && r > rounds.length - keep
          return (
            <div
              key={r}
              style={{
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 13,
                background: kept ? '#d6f5d6' : '#f0f0f0',
                color: kept ? '#1a1a1a' : '#aaa',
                textDecoration: kept ? 'none' : 'line-through',
              }}
            >
              第{r}轮
            </div>
          )
        })}
      </div>
      <figcaption style={{ fontSize: 13, color: '#666', marginTop: 10 }}>
        {mode === 'full'
          ? '全量压缩：所有轮次都被浓缩进一条摘要，最新细节也会变糊。'
          : `保留近 ${keep} 轮：旧历史压成摘要，最近 ${keep} 轮原文（绿色）原样保留，最新细节无损。`}
      </figcaption>
    </figure>
  )
}

const compactionCode = `import type { Message } from './types.js'

// 自动压缩：上下文快满时，把早期历史「总结成一段摘要」替换掉原始消息，给会话续命。
// 这里负责两件准备工作：把结构化消息渲染成纯文本记录、提供压缩用的 system 指令。

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…(截断)' : s
}

// 把 messages（含工具调用/结果块）摊平成一段可读的纯文本记录，喂给模型去总结。
// 之所以先摊平成文本，是为了避免把 tool_use/tool_result 块原样塞进一个无工具定义的请求里。
export function renderTranscript(messages: Message[]): string {
  const lines: string[] = []
  for (const m of messages) {
    for (const b of m.content) {
      if (b.type === 'text') {
        lines.push(\`【\${m.role === 'user' ? '用户' : '助手'}】\${b.text}\`)
      } else if (b.type === 'tool_use') {
        lines.push(\`【助手·调用工具】\${b.name}(\${truncate(JSON.stringify(b.input), 300)})\`)
      } else if (b.type === 'tool_result') {
        lines.push(\`【工具结果\${b.is_error ? '·出错' : ''}】\${truncate(b.content, 600)}\`)
      }
    }
  }
  return lines.join('\\n')
}

export const COMPACTION_SYSTEM = \`你是一个对话压缩器。下面是一个编码 Agent 与用户的工作记录。
请把它压缩成一段简洁但信息完整的中文摘要，必须保留：
- 用户的原始目标与任何明确要求/约束
- 已经做出的修改（涉及的文件路径）与关键决定
- 重要的发现、结论、踩过的坑
- 尚未完成的待办事项
不要寒暄，不要复述无关细节，只输出摘要正文。\``

const compactMethodCode = `// 自动压缩：把当前历史摊平成文本、让模型总结成一段摘要，再用这段摘要替换整个历史。
// 这样上下文从「一长串原始消息」缩成「一段摘要」，会话得以继续而不溢出窗口。
private async compact(): Promise<void> {
  const before = this.messages.length
  const transcript = renderTranscript(this.messages)
  const res = await this.provider.complete({
    system: COMPACTION_SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: transcript }] }],
    tools: [],
    maxTokens: 2048,
  })
  const summary = res.content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  // 用摘要重置历史。保留为一条 user 消息，作为后续对话的“前情提要”。
  this.messages = [{ role: 'user', content: [{ type: 'text', text: \`【前情提要（自动压缩）】\\n\${summary}\` }] }]
  this.needCompact = false
  this.audit.log({ type: 'llm_round', model: this.provider.model, stopReason: 'compaction', usage: res.usage })
  this.onEvent?.({ type: 'compacted', before, after: this.messages.length })
}`

const triggerCode = `for (let turn = 0; turn < this.maxTurns; turn++) {
  // 在每轮开始前（消息历史处于完整状态时）检查是否需要压缩。
  if (this.needCompact) await this.compact()
  // …调用模型、处理工具…
}`

const cliEventCode = `case 'compacted':
  process.stdout.write(\`\\n\${DIM}（上下文已自动压缩：\${e.before} 条 → \${e.after} 条）\${RESET}\\n\`)
  break`

const keepRecentCode = `// 进阶策略：只压缩较旧的部分，保留最近 N 轮原文不动。
// 这样最新的上下文（最可能被立刻用到）保持高保真，旧历史才被浓缩。
private async compactKeepRecent(keep = 6): Promise<void> {
  if (this.messages.length <= keep) return // 还不够长，没必要压
  const head = this.messages.slice(0, -keep) // 待压缩的旧历史
  const tail = this.messages.slice(-keep)    // 原样保留的近 N 轮

  const transcript = renderTranscript(head)
  const res = await this.provider.complete({
    system: COMPACTION_SYSTEM,
    messages: [{ role: 'user', content: [{ type: 'text', text: transcript }] }],
    tools: [],
    maxTokens: 2048,
  })
  const summary = res.content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  // 摘要在前、近 N 轮原文在后：既腾出空间，又不损失最新细节。
  this.messages = [
    { role: 'user', content: [{ type: 'text', text: \`【前情提要（自动压缩）】\\n\${summary}\` }] },
    ...tail,
  ]
  this.needCompact = false
}`

export default function Ch4() {
  return (
    <article>
      <Lead>
        上一章我们让 forge 学会了「看见」自己快撑满了：当 token 占用逼近窗口上限，就把
        <code>needCompact</code> 置真。但置真只是报警，不解决问题。这一章我们实现真正的「续命」手术：
        把一长串原始历史摊平成文本，让模型总结成一段摘要，再用这段摘要换回大量上下文空间。
        做完这步，forge 就能跑那种几十上百轮、几小时不间断的大任务，而不会半路撞墙。
      </Lead>

      <h2>1. 为什么是「总结」而不是「截断」</h2>
      <p>
        当历史太长，最容易想到的办法是截断——丢掉最早的几轮消息。这很省事，但代价是直接
        <strong>丢信息</strong>：用户最初定的目标、约束、已经改过的文件、踩过的坑，往往就在最早那几轮里，
        一截就没了，后面 Agent 越跑越跑偏。
      </p>
      <p>
        更聪明的做法是「总结」：让模型把整段历史读完，输出一段保留关键信息的摘要，再用这段摘要
        <strong>替换</strong>原始的一长串消息。信息没丢（只是浓缩了），体积却大幅下降。
      </p>

      <KeyIdea title="自动压缩的本质">
        自动压缩 = 用一段摘要换回大量上下文空间。它是 Agent 能跑长任务的关键：原始历史可能是几万 token，
        摘要只有几百 token，省下来的空间全部留给后续真正的工作。
      </KeyIdea>

      <h2>2. 一个关键工程细节：先摊平成文本</h2>
      <p>
        实现压缩时有个非常容易踩的坑：<strong>不要直接把原始 messages 数组发去总结</strong>。
        因为历史里混着 <code>tool_use</code> 和 <code>tool_result</code> 块，它们和工具定义、和彼此的配对关系
        是强绑定的。你新发一个「请帮我总结」的请求时，这个请求并没有声明任何工具定义，把这些块原样塞进去，
        模型 API 会因为「引用了未定义的工具 / 配对断裂」直接报错。
      </p>
      <p>
        最稳妥的做法是先把所有消息<strong>摊平成一段纯文本记录</strong>（transcript）：每个块按类型转成一行
        人类可读的文字。这样发去总结的就是普通文本，和工具系统彻底解耦，怎么发都不会出问题。
      </p>

      <Callout variant="warn" title="别把结构化消息直接发去总结">
        历史里的 <code>tool_use</code>/<code>tool_result</code> 块依赖工具定义和严格配对。
        一个用于总结的新请求没有工具定义，把这些块原样塞进去会触发 API 报错。
        正确姿势：先 <code>renderTranscript</code> 摊平成纯文本，再发去总结。
      </Callout>

      <h2>3. 摊平与压缩指令模块</h2>
      <p>
        新建 <code>src/compaction.ts</code>，它负责压缩前的两件准备工作：把结构化消息渲染成纯文本记录、
        提供压缩用的 system 指令。
      </p>

      <CodeBlock lang="ts" title="src/compaction.ts" code={compactionCode} />

      <p>逐段拆解这个模块：</p>
      <ul>
        <li>
          <code>truncate</code>：单个工具结果可能巨长（比如一次 grep 命中几千行）。如果原样摊进 transcript，
          光这一条就能把总结请求撑爆。所以对工具输入截到 300 字、工具结果截到 600 字，超出的部分用
          <code>…(截断)</code> 标记。摘要本来就只需要要点，细节截掉无妨。
        </li>
        <li>
          <code>renderTranscript</code>：遍历每条消息的每个块，按块类型转成带中文标记的一行——
          文本块标 <code>{'【用户】'}</code>/<code>{'【助手】'}</code>，工具调用标
          <code>{'【助手·调用工具】'}</code> 加函数名和参数，工具结果标
          <code>{'【工具结果】'}</code>（出错时加 <code>·出错</code>）。最后用换行
          <code>join('\n')</code> 拼成一整段。这样模型读到的就是一份清晰的「会话记录」。
        </li>
        <li>
          <code>COMPACTION_SYSTEM</code>：这是整个压缩质量的命门。它明确列出摘要<strong>必须保留</strong>
          四类信息——用户原始目标与约束、已做的改动（含文件路径）与关键决定、重要发现/结论/踩过的坑、
          尚未完成的待办。压缩做得好不好，几乎完全取决于这条指令写得够不够具体。
        </li>
      </ul>

      <h2>4. Agent 的压缩动作</h2>
      <p>
        准备工作就绪，给 Agent 加一个 <code>compact</code> 方法，它把上面三块串起来：摊平 → 总结 → 替换。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（compact 方法）" code={compactMethodCode} />

      <p>这个方法做了五件事：</p>
      <ol>
        <li>记下压缩前的消息条数 <code>before</code>，用于事后给用户一个直观反馈。</li>
        <li>
          <code>renderTranscript</code> 把当前整段历史摊平成文本，然后发一个
          <strong>空 tools</strong>（<code>tools: []</code>）+ <code>COMPACTION_SYSTEM</code> 的请求去总结。
          空 tools 很关键——这是个纯总结任务，不需要也不应该再触发任何工具。
        </li>
        <li>从返回里抽出所有 text 块拼接成 <code>summary</code>，去掉首尾空白。</li>
        <li>
          用一条 <code>role: 'user'</code> 的「前情提要」消息<strong>替换整个</strong> <code>messages</code>。
          为什么是 user 角色？因为它要作为后续对话的开场背景，让模型把它当成「我已知的前情」往下接。
        </li>
        <li>
          把 <code>needCompact</code> 复位、记一条审计（<code>stopReason: 'compaction'</code>）、
          发一个 <code>compacted</code> 事件给 UI 层。
        </li>
      </ol>

      <h2>5. 触发时机：每轮开始前</h2>
      <p>
        压缩方法有了，剩下的问题是<strong>什么时候调用它</strong>。答案是：在主循环每一轮开始的最前面。
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（触发点）" code={triggerCode} />

      <Callout variant="warn" title="压缩只能在每轮开始前做">
        时机不是随便选的。每轮开始前，<code>messages</code> 处于<strong>完整且自洽</strong>的状态——
        不会卡在某个 <code>tool_use</code> 和它对应的 <code>tool_result</code> 之间。
        如果你在工具执行到一半、配对还没补齐时就压缩，重置历史会直接破坏这对配对，下一次请求必然 API 报错。
        所以这个检查必须放在循环顶部、调用模型之前。
      </Callout>

      <h2>6. CLI 里的反馈</h2>
      <p>
        压缩是后台动作，但用户应该知道它发生了——否则会困惑「为什么 token 突然降了」。在 <code>onEvent</code>
        里处理 <code>compacted</code> 事件，用暗色文字打一行提示就够了。
      </p>

      <CodeBlock lang="ts" title="src/cli.ts（onEvent 片段）" code={cliEventCode} />

      <p>
        用 <code>DIM</code>/<code>RESET</code> 包成灰色，是因为这不是任务本身的输出，只是个状态提示，
        不该抢用户的注意力。
      </p>

      <Example title="一次长任务里的压缩">
        <p>
          你让 forge 做一个大重构：重命名一个核心模块、改掉所有引用它的地方。任务跑了几十轮——
          读文件、改文件、跑测试、再修。随着历史越堆越长，token 占用一路涨到阈值，某一轮结束时
          <code>needCompact</code> 被置真。
        </p>
        <p>
          下一轮开始前，循环顶部的检查命中，<code>compact</code> 启动：它把这几十轮的工作记录摊平成一段长文本，
          交给模型总结成一条「前情提要」——里面写着原始目标、已经改过哪些文件、测试现在是什么状态、还差哪几处没改。
          这条提要替换掉整段历史，token 占用从接近满格<strong>骤降</strong>回几百。
        </p>
        <p>
          你在终端只看到一行灰色的「（上下文已自动压缩：47 条 → 1 条）」，然后任务若无其事地继续往下跑，
          模型读着那条前情提要，接着把剩下的引用改完。整个续命过程对用户几乎无感。
        </p>
      </Example>

      <Callout variant="note" title="取舍：摘要必然丢细节">
        压缩本质是有损的——摘要再好也不可能等于原文，一些细枝末节会被丢掉。这正是为什么
        <code>COMPACTION_SYSTEM</code> 要把「必须保留什么」写得那么死。更精细的策略（比如只压缩较旧的部分、
        保留最近 N 轮的原文不动）是进阶优化，能进一步减少信息损失。本课程用「全量压成一段」的最简版本，
        目的是把原理讲透；理解了它，再做分段保留只是工程量的事。
      </Callout>

      <h2>7. 压缩策略对比：全量 vs 保留近 N 轮</h2>
      <p>
        本章实现的是最简的「全量压缩」：把整段历史压成一条摘要。它讲原理最清楚，但不是唯一打法。
        更常用于生产的是「保留近 N 轮」：只把较旧的部分压成摘要，最近几轮原文原封不动留着。
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>全量压缩（本章）</th>
            <th>保留近 N 轮</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>实现复杂度</td>
            <td>最低，一条摘要换全部</td>
            <td>略高，要切分 head / tail</td>
          </tr>
          <tr>
            <td>最新细节保真</td>
            <td>最近一轮也被摘要，细节会糊</td>
            <td>近 N 轮原文保留，最新细节无损</td>
          </tr>
          <tr>
            <td>压缩后体积</td>
            <td>最小（全是摘要）</td>
            <td>稍大（含近 N 轮原文）</td>
          </tr>
          <tr>
            <td>适用场景</td>
            <td>教学、对最新细节不敏感的任务</td>
            <td>长任务，刚发生的上下文最关键</td>
          </tr>
        </tbody>
      </table>
      <p>点下面的按钮，直观看看两种策略保留了什么、丢掉了什么：</p>
      <CompactionFigure />
      <CodeBlock lang="ts" title="src/agent.ts（进阶：保留近 N 轮）" code={keepRecentCode} />
      <p>
        关键直觉是：<strong>越新的上下文，越可能马上被用到</strong>。模型接下来要决策的依据，大概率藏在最近几轮里——
        刚读的文件、刚跑的测试输出。把这些原文留着、只浓缩远处的旧历史，能在「省空间」和「不丢刚发生的细节」之间取得更好的平衡。
        注意切分时要保证 tail 自身是<strong>自洽</strong>的（不要从一对 tool_use / tool_result 中间切开），否则又会触发配对报错。
      </p>

      <h2>8. 摘要质量与信息丢失</h2>
      <p>
        压缩是有损操作，这件事躲不掉。问题不是「丢不丢」，而是「丢的是不是要紧的」。摘要质量几乎完全由两个因素决定：
        <code>COMPACTION_SYSTEM</code> 写得够不够具体，以及给摘要的 <code>maxTokens</code> 够不够。
      </p>
      <ul>
        <li>
          <strong>指令越具体，丢得越准。</strong> 「请总结一下」会丢掉文件路径、待办这类要命的细节；
          而本章那条明确列出「必须保留目标 / 改动 / 结论 / 待办」的指令，等于给模型一张「不准丢」的清单。
        </li>
        <li>
          <strong>maxTokens 别给太小。</strong> 给 2048 是个合理起点；给太小，模型会被迫丢掉它本想保留的内容。
          但也别无限大——摘要越长，省下的空间越少，压缩的意义就被稀释。
        </li>
        <li>
          <strong>具体的东西最容易丢。</strong> 精确的行号、变量名、报错原文、临时拍板的小决定——这些细节最难在摘要里完整保留，
          也最容易在压缩后让 Agent「记不清当时为什么这么做」。这正是「保留近 N 轮」想缓解的痛点。
        </li>
      </ul>
      <Callout variant="warn" title="边界情况：压缩本身也可能失败或失真">
        <ul>
          <li><strong>摘要请求本身要花钱、要时间</strong>，而且它也是一次模型调用，有可能失败——要有重试或降级（比如退回截断）。</li>
          <li><strong>历史极长时，连摘要请求都可能超窗</strong>。这就是为什么要先 <code>truncate</code> 每条工具结果，必要时还得分批摘要再摘要。</li>
          <li><strong>摘要可能「自信地说错」</strong>。模型总结时也会犯错、漏掉关键约束。对长程关键任务，可考虑把原始目标这类铁律单独固定保留，不交给摘要。</li>
        </ul>
      </Callout>

      <h2>9. 何时触发：时机的几种选择</h2>
      <p>
        本章用的触发条件是「上一轮 <code>usage</code> 越过 80% → 下一轮开始前压缩」。这是<strong>事后阈值触发</strong>。
        但「何时触发」其实还有别的维度可调：
      </p>
      <ul>
        <li><strong>事前预检触发：</strong>发送前用 <code>countTokens</code> 估算，超了就先压再发，永不撞墙（上一章讲过，代价是多一次调用）。</li>
        <li><strong>固定轮数触发：</strong>每 N 轮强制压一次。简单粗暴，但不看实际占用，可能压早了或压晚了。</li>
        <li><strong>手动触发：</strong>给用户一个 <code>/compact</code> 命令，让他在自己觉得合适时主动压。把控制权交还给人。</li>
      </ul>
      <Callout variant="tip" title="工程经验：触发点永远放在「自洽边界」">
        无论用哪种触发条件，真正执行压缩的<strong>位置</strong>都必须在 messages 完整自洽的时刻——也就是每轮循环顶部、
        没有悬空的 tool_use / tool_result。触发<strong>条件</strong>可以灵活，触发<strong>位置</strong>不能将就，
        否则重置历史会破坏配对、下一次请求必报错。把「判断要不要压」和「在哪压」分开想，就不会乱。
      </Callout>

      <h2>10. 第 4 卷小结</h2>
      <p>
        到这里，第 4 卷「上下文工程」的四件套全部凑齐了。回头看，它们各管一摊、合起来让 forge 既「懂规矩」
        又「跑得久」：
      </p>
      <ul>
        <li><strong>system prompt（人设）</strong>：告诉 Agent 它是谁、该怎么行事。</li>
        <li><strong>AGENTS.md（项目记忆）</strong>：把项目的约定和背景注入上下文，让它「懂这个项目」。</li>
        <li><strong>token 预算（看见占用）</strong>：实时知道上下文用了多少、还剩多少。</li>
        <li><strong>自动压缩（续命）</strong>：快满时把历史浓缩成摘要，让长任务跑得下去。</li>
      </ul>

      <KeyIdea title="上下文工程四件套">
        人设 + 项目记忆 + token 预算 + 自动压缩，构成了一个能持续工作的 Agent 的上下文基础。
        前两个决定它「懂不懂规矩」，后两个决定它「能不能跑得久」。四件齐全，forge 才算真正能上手干活。
      </KeyIdea>

      <p>
        下一卷我们进入更高阶的话题——<strong>规划与子代理</strong>：如何让 Agent 先想清楚再动手，
        以及如何把一个大任务拆给多个专职的子代理并行处理。
      </p>

      <Summary
        points={[
          '压缩优于截断：截断丢信息，压缩用一段摘要保住关键信息、缩小体积，是 Agent 跑长任务的关键。',
          '先摊平成纯文本再总结：历史里的 tool_use/tool_result 块依赖工具定义和配对，直接发去总结会 API 报错。',
          'compaction.ts 提供 renderTranscript（结构化消息→带标记的纯文本）和 COMPACTION_SYSTEM（明确要保留目标/改动/结论/待办）。',
          'compact 方法：摊平 → 用空 tools 请求总结 → 用一条「前情提要」user 消息替换整个 messages → 复位 needCompact、记审计、发事件。',
          '压缩必须在每轮开始前做：此时 messages 完整自洽，不会卡在 tool_use 与 tool_result 之间，否则破坏配对报错。',
          '压缩有损，靠 system 指令保住关键信息；分段保留最近 N 轮是进阶优化，本课程用全量压成一段讲清原理。',
          '第 4 卷小结：人设 + 项目记忆 + token 预算 + 自动压缩 四件套，让 forge 既懂规矩又跑得久。',
        ]}
      />
    </article>
  )
}

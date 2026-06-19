import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const providerTypesCode = `export interface Provider {
  /** 这个 provider 当前使用的模型标识，用于展示与日志。 */
  readonly model: string
  /** 这个模型的上下文窗口大小（token 数），用于 token 预算与自动压缩。 */
  readonly contextWindow: number
  /** 发一轮请求，拿回模型这一轮的完整回复。 */
  complete(params: CompleteParams): Promise<AssistantTurn>
  /** 估算给定 system + messages + tools 会占用多少输入 token（用于预算）。 */
  countTokens(params: Omit<CompleteParams, 'onTextDelta' | 'maxTokens'>): Promise<number>
}`

const claudeProviderCode = `constructor(opts: { model?: string; apiKey?: string; contextWindow?: number } = {}) {
  this.model = opts.model ?? DEFAULT_MODEL
  // Claude 4.x 系列上下文窗口为 1M token；保守留作默认，可由配置覆盖。
  this.contextWindow = opts.contextWindow ?? 1_000_000
  // 不传 apiKey 时，SDK 会自动读取环境变量 ANTHROPIC_API_KEY。
  this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {})
}

async countTokens(params: Omit<CompleteParams, 'onTextDelta' | 'maxTokens'>): Promise<number> {
  const res = await this.client.messages.countTokens({
    model: this.model,
    system: params.system,
    messages: params.messages.map(toSdkMessage),
    tools: params.tools.map(toSdkTool),
  })
  return res.input_tokens
}`

const agentUsageCode = `// token 预算：用本轮真实的输入 token 估算上下文占用，逼近窗口就标记压缩。
const limit = this.provider.contextWindow
this.onEvent?.({ type: 'context_usage', used: res.usage.inputTokens, limit })
if (res.usage.inputTokens > limit * this.compactThreshold) this.needCompact = true`

const eventTypeCode = `| { type: 'context_usage'; used: number; limit: number } // 本轮上下文 token 占用`

const cliRenderCode = `case 'context_usage': {
  const pct = ((e.used / e.limit) * 100).toFixed(0)
  process.stdout.write(\`\${DIM}[ctx \${(e.used / 1000).toFixed(1)}k/\${(e.limit / 1000).toFixed(0)}k · \${pct}%]\${RESET}\\n\`)
  break
}`

const precheckCode = `// 进阶：发送前预检。先估算这次请求会占多少 token，超窗就先压缩再发。
async function ensureFits(agent: Agent): Promise<void> {
  const estimated = await agent.provider.countTokens({
    system: agent.system,
    messages: agent.messages,
    tools: agent.tools,
  })
  const limit = agent.provider.contextWindow
  // 留出生成回复的余量（maxTokens）：输入 + 预期输出都要塞进窗口。
  const budget = limit - agent.maxTokens
  if (estimated > budget * agent.compactThreshold) {
    await agent.compact() // 从不让请求真的撞墙
  }
}`

export default function Ch3() {
  return (
    <article>
      <Lead>
        上下文窗口是有限资源。对话越长、读的文件越多，塞进模型的输入 token
        就越多——撑过上限，要么报错，要么被悄悄截断。这一章我们给 forge 加上 token
        预算：每轮都知道占了多少、离上限还有多远，为下一章的自动压缩打好地基。
      </Lead>

      <KeyIdea title="先量化，再治理">
        token 预算是自动压缩的前提。你没法管理一个看不见的东西——必须先能精确「看见」每一轮的上下文占用，
        才谈得上在合适的时机去压缩它。
      </KeyIdea>

      <h2>先搞懂：token 到底是什么</h2>
      <p>
        预算的单位是 token，但 token 既不是「字符」也不是「单词」。它是 <strong>tokenizer</strong>（分词器）把文本切成的一个个小片段。
        现代模型用的是 BPE（Byte Pair Encoding）一类的子词算法：高频的词组会被合并成一个 token，低频的内容会被拆成更碎的片段。
      </p>
      <ul>
        <li>常见英文单词，往往 1 个词 ≈ 1 个 token（<code>{'" the"'}</code> 是一个 token，连前面的空格一起）。</li>
        <li>中文按字甚至更碎，<strong>一个汉字常常占 1~2 个 token</strong>，所以同样信息量的中文通常比英文更费 token。</li>
        <li>代码里的缩进、符号、罕见标识符会被切得很碎，<code>{'getUserById'}</code> 可能被拆成好几个 token。</li>
        <li>数字、URL、base64 这类「无规律」字符串特别费 token——一串长 hash 能顶一整句话。</li>
      </ul>
      <Callout variant="tip" title="为什么不能用 length / 4 糊弄">
        网上流传「1 token ≈ 4 字符」的经验法则，对纯英文散文还凑合，对中文、代码、JSON 会严重失真。
        预算是要拿来决定「该不该压缩」的硬决策，估错了要么过早压缩丢信息、要么撑爆窗口报错。
        所以正经做法是调真正的 tokenizer / <code>count_tokens</code> 接口，别自己拍脑袋乘系数。
      </Callout>

      <h2>上下文窗口：那个不能超的天花板</h2>
      <p>
        上下文窗口（context window）是模型一次能「看见」的 token 总量上限，<strong>输入和输出共享同一个窗口</strong>。
        这点很多人会忽略：如果窗口是 1M，你的输入已经占了 999k，那留给模型生成回复的空间就只剩 1k——
        它可能话说一半就被掐断。所以做预算时，真正可用的不是整个窗口，而是<strong>窗口减去你为输出预留的 maxTokens</strong>。
      </p>
      <KeyIdea title="预算的分母不是窗口，是「窗口 − 输出余量」">
        可用输入预算 = contextWindow − maxTokens（预留给生成）。
        逼近的是这条线，而不是窗口本身。忽略输出余量，会在「看起来还没满」时就被截断。
      </KeyIdea>

      <h2>token 占用从哪里来</h2>
      <p>
        要知道一轮请求占了多少 token，有两种来源：
      </p>
      <ul>
        <li>
          <strong>请求前估算</strong>：用 <code>count_tokens</code> 接口，不真正调用模型生成内容，
          只算「如果把这些 system + messages + tools 发出去会占多少输入 token」。便宜，适合做主动预检。
        </li>
        <li>
          <strong>请求后实测</strong>：每轮回复里本来就带着 <code>usage.input_tokens</code>，
          这是这一轮真实的输入 token 数，零额外成本。
        </li>
      </ul>

      <Callout variant="tip" title="forge 的取舍">
        forge 用<strong>事后实测</strong>（<code>usage.input_tokens</code>）做实时预算——因为它本来就在每轮回复里，
        不花一次额外调用；同时保留<strong>事前估算</strong>（<code>countTokens</code>）作为一种能力，
        留给需要「发送前预检」的主动场景。两者不冲突：一个免费看后视镜，一个花点钱看前路。
      </Callout>

      <h2>给 Provider 加 countTokens 能力</h2>
      <p>
        先扩接口。Provider 上新增两样东西：<code>contextWindow</code>（窗口大小，预算的分母）
        和 <code>countTokens</code>（估算方法）。
      </p>
      <CodeBlock
        lang="ts"
        title="src/provider/types.ts（接口扩展）"
        code={providerTypesCode}
      />
      <p>
        <code>contextWindow</code> 是个只读数字，告诉调用方「这个模型一共能装多少 token」；
        <code>countTokens</code> 接收和 <code>complete</code> 几乎一样的参数（去掉了流式回调
        <code>onTextDelta</code> 和生成上限 <code>maxTokens</code>，因为估算不生成内容），返回一个
        token 数。
      </p>

      <h2>Claude Provider 的实现</h2>
      <CodeBlock
        lang="ts"
        title="src/provider/claude.ts（contextWindow + countTokens）"
        code={claudeProviderCode}
      />
      <p>
        构造函数里把 <code>contextWindow</code> 默认设成 1_000_000——Claude 4.x 系列的窗口是 1M token。
        为什么做成可配置？因为不同模型窗口不同，把它交给配置覆盖，换模型时不用改代码。
      </p>
      <p>
        <code>countTokens</code> 直接调 SDK 的 <code>messages.countTokens</code>：这是专门的估算接口，
        传进去和 <code>create</code> 一样的 <code>system</code> / <code>messages</code> / <code>tools</code>，
        它返回 <code>input_tokens</code>。注意 messages 和 tools 仍要走 <code>toSdkMessage</code> /
        <code>toSdkTool</code> 转换成 SDK 期望的形状。
      </p>
      <Callout variant="tip" title="为什么 tools 也要一起传给 count_tokens">
        一个常见误区是「只算 messages，忘了 tools」。但工具定义（名字、描述、参数 JSON Schema）是<strong>每轮都随请求发送</strong>的，
        而且往往不小——十几个工具的 schema 加起来轻松上千 token。漏算 tools，预算会系统性偏低，导致你以为还很空、实际已经逼近上限。
        所以 <code>countTokens</code> 的入参必须和 <code>complete</code> 完全对齐：system + messages + tools，一个都不能少。
      </Callout>
      <Callout variant="warn" title="边界情况：估算值和实际不必逐 token 相等">
        <code>count_tokens</code> 给的是「这次输入」的 token 数，但实际计费里可能还掺着 prompt caching 的命中/写入、
        服务端为某些块附加的隐藏 token 等。把它当成<strong>可靠的预算依据</strong>没问题，但别指望它和账单逐 token 对得上。
        预算要的是「够准到能做对压缩决策」，不是会计级精确。
      </Callout>

      <h2>Agent 侧的实时预算</h2>
      <p>
        真正的预算逻辑在主循环里。每拿到一轮回复 <code>res</code>，就用它自带的
        <code>usage.inputTokens</code> 和窗口大小一比：
      </p>
      <CodeBlock
        lang="ts"
        title="src/agent.ts（context_usage 事件）"
        code={agentUsageCode}
      />
      <p>
        配套加一个事件类型：
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（事件类型）" code={eventTypeCode} />
      <p>
        逻辑很直白：每轮把 <code>res.usage.inputTokens</code> 当作「这轮上下文占了多少」，
        通过 <code>context_usage</code> 事件抛出去（让 CLI 能展示）；再拿它和
        <code>limit * this.compactThreshold</code> 比——超过阈值（默认 0.8，即占满 80%）就把
        <code>{'this.needCompact'}</code> 置为 <code>true</code>，下一章的压缩动作会读这个标志。
      </p>
      <Callout variant="tip" title="零成本预算">
        这里没有任何额外的网络请求。<code>usage</code> 是模型回复里天然带的字段，
        我们只是读了它、和窗口比了一下。预算几乎不花一分钱。
      </Callout>

      <h2>CLI 端怎么展示</h2>
      <p>
        既然 <code>context_usage</code> 事件已经抛出来了，CLI 的 <code>onEvent</code>
        里可以顺手把它渲染成一行暗色提示，让用户对「还剩多少」有直观感知：
      </p>
      <CodeBlock lang="ts" title="src/cli.ts（可选：渲染 context_usage）" code={cliRenderCode} />
      <p>
        效果类似 <code>{'[ctx 12.3k/1000k · 1%]'}</code> 这样的一行灰字。这是纯展示、完全可选——
        不渲染也不影响预算逻辑，但加上之后体验好很多。
      </p>

      <Example title="预算怎么随对话增长">
        <p>
          想象一次真实会话里 token 占用的曲线：
        </p>
        <ul>
          <li>开场：只有 system prompt 和一句提问，几 k token，离 1M 远得很。</li>
          <li>读了个大文件：一个工具结果把几万行代码塞进上下文，瞬间涨到几十 k。</li>
          <li>来回多轮：每轮都把全部历史重发，占用稳步累积，慢慢逼近 800k 的阈值。</li>
          <li>触发标记：某一轮 <code>inputTokens</code> 越过 80%，<code>needCompact</code> 被置真——
          下一轮开始前就该压缩了（正是下一章的内容）。</li>
        </ul>
      </Example>

      <h2>预算策略对比</h2>
      <p>
        「什么时候算、算谁、怎么用」其实有好几种打法，forge 选的只是其中一种。理解全景能帮你在不同场景下选对：
      </p>
      <table>
        <thead>
          <tr>
            <th>策略</th>
            <th>怎么做</th>
            <th>成本</th>
            <th>代价</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>事后实测（forge 默认）</td>
            <td>读回复自带的 <code>usage.inputTokens</code></td>
            <td>零（白送）</td>
            <td>滞后一轮：本轮已经发出去了才知道占用</td>
          </tr>
          <tr>
            <td>事前预检</td>
            <td>发送前用 <code>countTokens</code> 估算</td>
            <td>一次额外接口调用</td>
            <td>多花钱、多一点延迟，但从不撞墙</td>
          </tr>
          <tr>
            <td>本地估算</td>
            <td>本地跑 tokenizer 库算</td>
            <td>近乎零、无网络</td>
            <td>需自带分词器，且和服务端口径未必完全一致</td>
          </tr>
        </tbody>
      </table>
      <p>
        forge 选「事后实测」是因为它免费、够用：滞后一轮的代价，被「阈值设在 80% 而非 100%」吸收掉了——
        预留的那 20% 缓冲，正好够覆盖「下一轮才反应过来」的延迟。这是一个用阈值换接口调用的经典工程取舍。
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（进阶：发送前预检）" code={precheckCode} />
      <p>
        预检版的关键差别在于：分母用的是 <code>{'limit - maxTokens'}</code>，把输出余量也算进去；而且压缩动作发生在<strong>发送之前</strong>，
        所以理论上永远不会真的触达窗口上限。代价就是每轮多一次 <code>countTokens</code> 调用。

      </p>

      <Callout variant="note" title="更主动的策略：发送前预检">
        有了 <code>countTokens</code>，还能玩一种更主动的打法：<strong>发送前</strong>先估算这次请求会占多少 token，
        如果会超窗，就先压缩再发，从不让请求真的撞上墙。forge 目前选了更简单的「事后实测 + 标记下一轮压缩」——
        够用，而且省掉一次 <code>count_tokens</code> 调用。等你需要更稳的保障时，再升级到预检也不迟。
      </Callout>

      <h2>工程经验：预算里几个真实的坑</h2>
      <ul>
        <li>
          <strong>不同模型的 tokenizer 不一样。</strong> 同一段文本，换个模型家族切出来的 token 数可能差一截。
          所以 <code>contextWindow</code> 和 token 计数都得跟着具体模型走，不能用一套数字套所有模型。
        </li>
        <li>
          <strong>工具结果是占用暴涨的头号元凶。</strong> 一次 <code>cat</code> 大文件、一次命中几千行的 grep，单条工具结果就能吃掉几十 k token。
          预算曲线往往不是平滑上升，而是被某次工具调用「一脚踹上去」。这也是为什么下一章压缩时要对工具结果做截断。
        </li>
        <li>
          <strong>阈值别贴着 100% 设。</strong> 设太高（比如 0.98）会让你几乎没有缓冲，事后实测的滞后一轮就可能直接撞墙；
          设太低（比如 0.5）又会过早、过频地压缩，白丢信息也白花压缩的钱。0.8 是个经过实践检验的折中起点。
        </li>
      </ul>

      <h2>承上启下</h2>
      <p>
        到这里，forge 已经能在每一轮「看见」自己占了多少上下文，并在逼近窗口时主动举手
        （把 <code>needCompact</code> 置真）。但它现在只会举手，还不会真正动手。
      </p>
      <KeyIdea title="看得见，才管得住">
        预算解决的是「感知」问题——下一章解决「行动」问题：当 <code>needCompact</code>
        亮起时，如何把臃肿的历史压成一段摘要，腾出空间继续对话，而不丢掉关键信息。
      </KeyIdea>

      <Summary
        points={[
          '上下文窗口有限，撑爆会报错或被截断；token 预算是管理它的第一步。',
          'token 占用有两种来源：事前用 count_tokens 估算（花钱预检），事后用 usage.input_tokens 实测（零成本）。',
          'Provider 接口新增 contextWindow（窗口大小）和 countTokens（估算方法），后者直接调 SDK 的 messages.countTokens。',
          'contextWindow 可配置，因为不同模型窗口不同；Claude 4.x 默认 1M token。',
          'Agent 主循环每轮用 res.usage.inputTokens 和窗口比，超过 compactThreshold（默认 0.8）就把 needCompact 置真。',
          'context_usage 事件可在 CLI 端渲染成一行提示，让用户感知剩余空间——可选但好用。',
          '下一章：当 needCompact 亮起，实现真正的历史压缩动作。',
        ]}
      />
    </article>
  )
}

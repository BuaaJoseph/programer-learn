import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const costTs = `import type { Usage } from './types.js'

// 成本与延迟统计：累计每轮 token 用量、估算花费、记录耗时，让 forge 对自己的开销心里有数。
export interface Pricing {
  /** 每百万输入 token 美元价。 */
  inputPerM: number
  /** 每百万输出 token 美元价。 */
  outputPerM: number
}

// 价格表（美元/百万 token）。新模型按需补充。
export const PRICING: Record<string, Pricing> = {
  'claude-opus-4-8': { inputPerM: 5, outputPerM: 25 },
  'claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15 },
  'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
}

export class CostTracker {
  inputTokens = 0
  outputTokens = 0
  rounds = 0
  totalMs = 0

  add(usage: Usage, ms: number): void {
    this.inputTokens += usage.inputTokens
    this.outputTokens += usage.outputTokens
    this.rounds += 1
    this.totalMs += ms
  }

  estimateUsd(model: string): number {
    const p = PRICING[model]
    if (!p) return 0
    return (this.inputTokens / 1e6) * p.inputPerM + (this.outputTokens / 1e6) * p.outputPerM
  }

  summary(model: string): string {
    const usd = this.estimateUsd(model)
    const avg = this.rounds ? Math.round(this.totalMs / this.rounds) : 0
    return \`轮数 \${this.rounds} · 输入 \${this.inputTokens} tok · 输出 \${this.outputTokens} tok · 约 $\${usd.toFixed(4)} · 平均延迟 \${avg}ms\`
  }
}`

const agentTs = `const t0 = Date.now()
const res = await this.provider.complete({
  system,
  messages: this.messages,
  tools,
  maxTokens: this.maxTokens,
  onTextDelta: (delta) => this.onEvent?.({ type: 'assistant_delta', text: delta }),
})
this.cost.add(res.usage, Date.now() - t0)`

const agentSummaryTs = `/** 成本/延迟统计摘要（供 /cost 命令使用）。 */
costSummary(): string {
  return this.cost.summary(this.provider.model)
}`

const commandTs = `{
  name: 'cost',
  description: '查看本次会话的 token 用量、估算花费与平均延迟',
  run(_args, ctx) {
    ctx.print(ctx.agent.costSummary())
  },
},`

const costOutput = `> /cost
轮数 8 · 输入 45200 tok · 输出 3100 tok · 约 $0.3035 · 平均延迟 2140ms`

const cachedPricing = `export interface Pricing {
  inputPerM: number
  outputPerM: number
  /** 写入缓存的输入 token 价（通常略高于普通输入）。 */
  cacheWritePerM?: number
  /** 命中缓存的输入 token 价（通常是普通输入的一个零头）。 */
  cacheReadPerM?: number
}`

const cachedUsage = `// 命中缓存的部分按"缓存读"价计，未命中的按普通输入价计
const cached = usage.cacheReadTokens ?? 0
const fresh = usage.inputTokens - cached
const cost =
  (fresh / 1e6) * p.inputPerM +
  (cached / 1e6) * (p.cacheReadPerM ?? p.inputPerM) +
  (usage.outputTokens / 1e6) * p.outputPerM`

const budgetGuard = `// 软预算告警：累计花费越过阈值就提示，但不强制中断
checkBudget(model: string, softUsd: number): string | null {
  const spent = this.estimateUsd(model)
  if (spent >= softUsd) {
    return \`⚠ 本次会话已花约 $\${spent.toFixed(2)}，超过预算 $\${softUsd.toFixed(2)}\`
  }
  return null
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        forge 跑起来之后，它会自己一轮一轮地调用模型、调用工具，token 在悄悄涨、钱在悄悄花、延迟在悄悄累。
        这一章给 forge 装一块「仪表盘」：每轮记下用了多少 token、花了多少时间，会话结束随时能查。
      </Lead>

      <h2>为什么要算成本和延迟</h2>
      <p>
        手动调一次模型，你大概知道花了多少。但 Agent 不一样——它为了完成一个任务可能自己往返八轮、十轮，
        每轮都把越来越长的对话历史重新发一遍。输入 token 像滚雪球一样增长，钱也跟着涨，而你完全没感觉。
        延迟同理：一轮两秒看着还行，八轮排下来就是十几秒的等待，体验直接劝退。
      </p>
      <p>
        看不见的东西没法优化。你不知道哪一轮最贵、平均要等多久，就只能凭感觉瞎调。
        所以第一步永远是「让数字显形」。
      </p>

      <KeyIdea>
        可度量才可优化。成本与延迟是 Agent 的「仪表盘」——先看得见每次往返花了多少 token、多少钱、多少时间，
        才谈得上去压缩、去提速。
      </KeyIdea>

      <h2>先搞懂 token 计费模型</h2>
      <p>
        在动手累加之前，得先理解钱是怎么算出来的，否则统计出来的数字你也读不懂。LLM 计费有三条必须刻进脑子的规律：
      </p>
      <ul>
        <li>
          <strong>按 token 计，不是按字数</strong>：一个 token 大约是 4 个英文字符、或不到一个汉字到一个汉字。
          代码、中文、特殊符号的 token 密度都不同，所以「估 token」永远只能近似，精确值要么调 <code>countTokens</code>、
          要么以返回的 <code>usage</code> 为准。
        </li>
        <li>
          <strong>输入和输出分开计价，且输出贵得多</strong>：看价格表里 opus 是输入 5、输出 25——输出是输入的 5 倍。
          直觉上的误区是「让模型少说话省钱」，但真相往往相反：<strong>输入才是大头</strong>，因为每轮都要把整段历史重发一遍。
        </li>
        <li>
          <strong>成本随轮数二次方增长</strong>：第 1 轮发 1 段历史，第 8 轮要发前 7 轮的全部历史。
          所以一个 8 轮任务的输入总量，远不止单轮的 8 倍。这就是为什么长会话的账单会「失控」。
        </li>
      </ul>
      <table>
        <thead>
          <tr><th>项</th><th>计价方</th><th>典型量级</th><th>优化抓手</th></tr>
        </thead>
        <tbody>
          <tr><td>输入 token</td><td>较便宜，但随历史滚雪球</td><td>大头</td><td>上下文压缩、提示缓存</td></tr>
          <tr><td>输出 token</td><td>单价贵几倍</td><td>通常较小</td><td>限制 maxTokens、要求简洁</td></tr>
          <tr><td>缓存读 token</td><td>普通输入的零头</td><td>命中越多越省</td><td>稳定前缀 + 缓存</td></tr>
          <tr><td>延迟</td><td>不计费但耗体验</td><td>每轮秒级</td><td>流式、并行工具、换快模型</td></tr>
        </tbody>
      </table>

      <h2>数据从哪来：零额外成本</h2>
      <p>
        好消息是，我们要的数据本来就有。每轮 LLM 回复里都带着 <code>usage</code>（输入/输出 token），
        卷 4 做预算控制时已经用过它。这一章只是把它<strong>累加</strong>起来，再按价格表换算成钱。
      </p>
      <p>
        延迟更简单：用 <code>Date.now()</code> 把 <code>complete</code> 调用一头一尾包住，相减就是这一轮的往返耗时。
        没有额外的 API 调用，没有额外的网络开销——纯粹是把已经到手的信息记下来。
      </p>
      <Callout variant="note">
        <strong>为什么宁可用平台返回的 usage，也不自己数 token？</strong>因为「真值」只有平台知道：它把 system、工具定义、
        历史、缓存命中全部算进去后才得出最终计费 token，你在客户端再聪明也只能估。所以统计要以 <code>res.usage</code> 为准，
        客户端的 <code>countTokens</code> 只用于「发请求前的预算预判」，两者职责不同。
      </Callout>

      <h2>成本模块：src/cost.ts</h2>
      <p>新建一个独立模块，专门管价格表和累计统计：</p>
      <CodeBlock lang="ts" title="src/cost.ts" code={costTs} />
      <p>逐段看：</p>
      <ul>
        <li>
          <code>Pricing</code> / <code>PRICING</code>：价格表，单位是美元/百万 token。注意输入和输出<strong>分开计价</strong>，
          输出通常比输入贵好几倍（这里 opus 是 5 对 25）。新模型上线就往这张表里补一行。
        </li>
        <li>
          <code>CostTracker.add</code>：每轮调用一次，把这轮的 <code>usage.inputTokens</code>、
          <code>usage.outputTokens</code> 累加进去，同时 <code>rounds</code> 加一、<code>totalMs</code> 累加耗时。
        </li>
        <li>
          <code>estimateUsd</code>：按价格表把累计 token 换算成美元。除以 <code>1e6</code> 是因为价格按百万 token 计。
          遇到表里没有的模型直接返回 <code>0</code>，不报错——估算工具不该因为缺一行价格就崩。
        </li>
        <li>
          <code>summary</code>：把所有数字拼成一行人类可读的字符串，包含轮数、输入/输出 token、估算花费和平均延迟
          （<code>{'totalMs / rounds'}</code>，rounds 为 0 时返回 0 避免除零）。
        </li>
      </ul>

      <Callout variant="warn">
        <strong>为什么价格表硬编码在代码里是个已知妥协？</strong>厂商随时可能调价，硬编码意味着改价要发新版本。
        工程上更稳的做法是把价格抽到一份配置文件或环境变量，甚至允许 <code>0</code> 价（缺表）时降级为「只显示 token、不显示美元」。
        forge 选硬编码是为了教学清晰——真上生产，记得把这张表挪到可热更新的地方，并明确标注「估算、以账单为准」。
      </Callout>

      <h2>Agent 侧埋点：测量与累加</h2>
      <p>
        在主循环里，给 <code>complete</code> 调用前后各放一个时间戳，调用结束后把这轮的 <code>usage</code> 和耗时交给 tracker：
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（测量与累加）" code={agentTs} />
      <p>
        <code>t0 = Date.now()</code> 记下起点，<code>await</code> 完成后 <code>{'Date.now() - t0'}</code> 就是这一轮往返的毫秒数；
        <code>this.cost.add(res.usage, ...)</code> 把这轮的 token 用量和耗时一并累加。一行埋点，干净利落。
      </p>
      <Callout variant="note">
        <strong>边界情况：流式下这个延迟测的是什么？</strong>因为 <code>await</code> 要等整个流读完才返回，所以测的是
        「<strong>到最后一个 token 落地</strong>」的总时长，而不是「首 token 到达」（TTFB）。两者对体验意义不同：
        TTFB 决定「等多久才看到第一个字」，总时长决定「等多久才能继续」。要细分，可在 <code>onTextDelta</code> 第一次触发时
        再打一个时间戳，专门统计首字延迟。
      </Callout>
      <p>再给 Agent 暴露一个查询方法，供命令调用：</p>
      <CodeBlock lang="ts" title="src/agent.ts（查询方法）" code={agentSummaryTs} />
      <p>
        <code>costSummary</code> 直接把当前 provider 的模型名传给 tracker，让它按对应价格算钱并返回那行摘要。
      </p>

      <h2>/cost 命令</h2>
      <p>最后把它接到斜杠命令上，用户随时敲 <code>/cost</code> 就能看：</p>
      <CodeBlock lang="ts" title="src/commands.ts（/cost）" code={commandTs} />

      <Example title="一次 /cost 的输出">
        <p>跑了几轮对话后，用户敲下 <code>/cost</code>：</p>
        <CodeBlock lang="text" code={costOutput} />
        <p>
          一眼就能读出：这次会话已经往返了 8 轮，输入累计 4.5 万 token（历史越滚越长，这是大头），
          输出 3100 token，估算花了三毛多美元，平均每轮等 2.1 秒。
        </p>
      </Example>

      <h2>省钱的三板斧：缓存、压缩、选型</h2>

      <h3>提示缓存：让重复的前缀按零头计价</h3>
      <p>
        Agent 每轮都重发 system 提示 + 工具定义 + 历史，这一大段前缀<strong>几乎一模一样</strong>。提示缓存的思路是：
        把这段稳定前缀在平台侧缓存住，下一轮命中缓存的部分按「缓存读」价计——通常只是普通输入价的一个零头。
        要吃到这个红利，价格表和换算逻辑都得升级：
      </p>
      <CodeBlock lang="ts" title="src/cost.ts（带缓存的价格）" code={cachedPricing} />
      <CodeBlock lang="ts" title="src/cost.ts（命中缓存的换算）" code={cachedUsage} />
      <Callout variant="tip">
        缓存命中的前提是<strong>前缀稳定且足够长</strong>。所以工程上要把「最不变的内容」放最前面（system → 工具定义 → 早期历史），
        变动的（最新用户输入）放最后。一个常见误区是每轮往 system 里塞当前时间戳之类的动态串，前缀一变缓存全失效，
        白白多花钱——稳定前缀是缓存能省钱的命根子。
      </Callout>

      <h3>批处理：把不急的活攒起来打折跑</h3>
      <p>
        如果你的场景是「跑一批离线任务」（比如给 200 个文件批量生成摘要），而不是交互式对话，那么<strong>批处理</strong>
        往往能拿到显著折扣，代价是结果不实时返回（异步、稍后取）。判断标准很简单：<strong>用户在不在等？</strong>
        在等就走实时（forge 的交互模式），不在等就攒成批走折扣通道。这是延迟和成本之间一个非常实在的取舍。
      </p>

      <h3>延迟优化：四个不花钱的提速点</h3>
      <ul>
        <li><strong>流式输出</strong>：先让用户看到字在动，感知延迟骤降——总时长没变，但「等待焦虑」没了。</li>
        <li><strong>并行工具调用</strong>：同一轮模型要求调多个互不依赖的工具时，<code>Promise.all</code> 并行跑而非串行。</li>
        <li><strong>上下文压缩降轮内输入</strong>：输入少了，模型处理也快，延迟和成本一起降。</li>
        <li><strong>简单任务换快模型</strong>：呼应卷 6 的 Provider 抽象——haiku 比 opus 快也便宜，分类/格式化这类活根本用不着旗舰模型。</li>
      </ul>

      <h2>预算告警：花超了得有人喊一声</h2>
      <p>
        有了累计花费，就能加一道<strong>软预算告警</strong>：越过阈值时提示，但<strong>不强制中断</strong>对话——
        因为粗暴掐断一个跑到一半的任务，伤害可能比多花几毛钱更大。把决定权留给用户：
      </p>
      <CodeBlock lang="ts" title="src/cost.ts（软预算告警）" code={budgetGuard} />
      <p>
        在每轮 <code>cost.add</code> 之后调一次 <code>checkBudget</code>，返回非空就打印那行警告（且整个会话只提示一次，
        避免刷屏）。「软」是关键设计选择：告警负责<strong>知情</strong>，而不是<strong>替用户做决定</strong>。
        真要硬上限（到顶即停），那是另一种产品取向，适合无人值守的自动化场景。
      </p>

      <Callout variant="tip">
        有了这块仪表盘，优化就有了抓手：输入 token 偏高，就上<strong>上下文压缩</strong>（裁剪/摘要历史，直接降输入）；
        轮数偏多，就检查是不是有<strong>不必要的工具往返</strong>，能合并就合并；钱实在敏感，就在简单任务上
        <strong>切更便宜的模型</strong>（呼应卷 6 的 Provider 抽象，换模型只是改一行配置）。
      </Callout>

      <Callout variant="note">
        这里给出的是<strong>估算</strong>——按公开价格表乘以 token 数算出来的近似值。
        真实账单以平台为准：提示缓存命中会大幅降低输入价、批处理另有折扣、不同区域价格也可能不同。
        把它当作「数量级参考」和「优化前后的相对对比」，而不是精确到分的财务记录。
      </Callout>

      <h2>下一章</h2>
      <p>
        成本和延迟告诉你「花了多少、等了多久」，但当 forge 行为不对劲时，仪表盘上的数字救不了你——
        你需要看到「内部到底发生了什么」：发了什么 prompt、模型想调哪个工具、工具返回了什么。
        下一章做<strong>可观测性</strong>，给 forge 加一个调试开关，把这些过程都打出来。
      </p>

      <KeyIdea>
        成本与延迟是仪表盘，看的是「多少」；可观测性是行车记录仪，看的是「为什么」。两者合起来，forge 才真正可运维。
      </KeyIdea>

      <Summary
        points={[
          'Agent 会自己多轮往返，token、花费、延迟都在悄悄累积，看得见才优化得了。',
          'token 计费三规律：按 token 不按字、输入输出分开计价且输出更贵、成本随轮数滚雪球（输入是大头）。',
          '数据零额外成本：usage 本就在每轮回复里累加（以平台 usage 为真值），延迟用 Date.now() 包住 complete 调用测量。',
          'src/cost.ts 用 PRICING 价格表（输入输出分开计价）+ CostTracker 累计 token 与耗时，estimateUsd 估算花费，summary 拼可读摘要。',
          'Agent 主循环里一行埋点 cost.add(res.usage, Date.now() - t0)，并暴露 costSummary 供查询；流式下测的是总时长非首字延迟。',
          '/cost 命令随时打印「轮数 · 输入/输出 token · 约 $花费 · 平均延迟」一行统计。',
          '省钱三板斧：提示缓存（稳定前缀按零头计价）、批处理（不急的活攒起来打折）、选型（简单任务换快模型）。',
          '软预算告警只知情不中断，把决定权留给用户；它是估算，真实账单以平台为准。',
        ]}
      />
    </article>
  )
}

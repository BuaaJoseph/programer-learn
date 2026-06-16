import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const providerTypes = `import type { AssistantTurn, Message } from '../types.js'
import type { Tool } from '../tools/types.js'

export interface CompleteParams {
  system: string
  messages: Message[]
  tools: Tool[]
  maxTokens: number
  /** 流式文本回调：每收到一段增量文本就调用一次。用于让回答逐字蹦出来。 */
  onTextDelta?: (delta: string) => void
}

export interface Provider {
  /** 这个 provider 当前使用的模型标识，用于展示与日志。 */
  readonly model: string
  /** 这个模型的上下文窗口大小（token 数），用于 token 预算与自动压缩。 */
  readonly contextWindow: number
  /** 发一轮请求，拿回模型这一轮的完整回复。 */
  complete(params: CompleteParams): Promise<AssistantTurn>
  /** 估算给定 system + messages + tools 会占用多少输入 token（用于预算）。 */
  countTokens(params: Omit<CompleteParams, 'onTextDelta' | 'maxTokens'>): Promise<number>
}`

const claudeProviderSketch = `export const DEFAULT_MODEL = 'claude-opus-4-8'

export class ClaudeProvider implements Provider {
  readonly model: string
  readonly contextWindow: number
  // …构造时读 model/contextWindow，apiKey 不传则走环境变量
}`

const providerIndex = `import type { Provider } from './types.js'
import { ClaudeProvider } from './claude.js'

// Provider 工厂：把「选哪个 LLM」收敛到一处。默认 Claude，新增 Provider 只需在这里注册一行。
// 主循环、工具、CLI 都只依赖 Provider 接口，不关心背后是谁——这就是薄抽象层的价值。
export interface ProviderConfig {
  provider?: string
  model?: string
  contextWindow?: number
}

export function createProvider(cfg: ProviderConfig = {}): Provider {
  const name = cfg.provider ?? 'claude'
  switch (name) {
    case 'claude':
      return new ClaudeProvider({ model: cfg.model, contextWindow: cfg.contextWindow })
    default:
      throw new Error(\`未知 provider「\${name}」。目前内置：claude。新增 provider 只需实现 Provider 接口并在 createProvider 注册。\`)
  }
}

export type { Provider } from './types.js'`

export default function Ch2() {
  return (
    <article>
      <Lead>
        从卷 1 起，我们写主循环时其实就偷偷做了一件正确的事：把「调用 LLM」这件事，从来没有写成直接 new 一个 Anthropic 客户端，
        而是收敛进了一个叫 <code>Provider</code> 的接口。主循环、工具调用、CLI——它们谁都不知道背后跑的是 Claude 还是别的什么。
        这一章我们把这层抽象彻底讲透，再加一个工厂 <code>createProvider</code>，做到三件事：按配置选 Provider、换模型不动主循环、新增 Provider 只加一行。
      </Lead>

      <h2>回顾：为什么一开始就抽象</h2>
      <p>
        回看前面所有卷的代码，你会发现一个一以贯之的纪律：内核从不直接依赖 Anthropic SDK。
        主循环需要发请求，它调的是 <code>provider.complete(...)</code>；token 预算要算占用，调的是 <code>provider.countTokens(...)</code>；
        要展示「当前用的是什么模型」，读的是 <code>provider.model</code>；自动压缩要知道窗口多大，读的是 <code>provider.contextWindow</code>。
        整个内核眼里只有这四样东西，从来不关心它们背后是 <code>messages.stream</code> 还是别的什么 HTTP 调用。
      </p>

      <KeyIdea>
        薄抽象层 = 内核与具体厂商解耦。主循环、工具、CLI 全都只依赖 <code>Provider</code> 接口（<code>model</code> / <code>contextWindow</code> /{' '}
        <code>complete</code> / <code>countTokens</code>），不关心背后是 Claude 还是别人。换模型、换厂商，核心逻辑一行都不用碰。
      </KeyIdea>

      <h2>接口本体：一个 Provider 必须能做的事</h2>
      <p>
        先看接口的逐字定义。注意它有多薄——对外暴露的只有四样东西，外加一个可选的流式回调。这就是「成为一个 Provider」的全部门槛。
      </p>

      <CodeBlock lang="ts" title="src/provider/types.ts" code={providerTypes} />

      <p>
        <code>CompleteParams</code> 描述「发一轮请求要带什么」：系统提示、历史消息、可用工具、本轮最大输出 token，以及一个可选的{' '}
        <code>onTextDelta</code> 流式回调，让模型的回答能逐字蹦出来而不是憋到最后一次性出现。
        <code>Provider</code> 接口本身只有两个只读属性和两个方法。任何模型——不管它是 Claude、是 OpenAI、还是你本地跑的开源模型——
        只要能实现这四样，就能直接插进 forge 跑起来。
      </p>

      <h2>默认实现：ClaudeProvider</h2>
      <p>
        <code>ClaudeProvider</code> 是这个接口的默认实现，它在卷 0、卷 2、卷 4 里被一步步建成。它的职责说白了就是「翻译」：
        把 forge 内部的 <code>Message</code> / <code>Tool</code> 形状翻译成 Anthropic SDK 认识的形状，调用 <code>messages.stream</code> 拿到流式结果，
        再把结果翻译回 forge 内部的 <code>AssistantTurn</code>。所有 Anthropic 特有的「方言」——参数名、消息块结构、thinking 块的处理——都被关在这一个类里。
      </p>

      <Callout variant="note">
        所有厂商方言都收在 <code>claude.ts</code> 这一个文件里。这是抽象的关键纪律：具体厂商的怪癖只允许出现在它自己的 Provider 实现中，
        绝不外溢到主循环或工具层。所以以后加新厂商，写的是一个新文件，不会污染任何已有代码。
      </Callout>

      <p>这里贴一小段它的类声明示意，让你对它的样子有个印象：</p>

      <CodeBlock lang="ts" title="src/provider/claude.ts（节选）" code={claudeProviderSketch} />

      <h2>工厂：把「选哪个 Provider」收敛到一处</h2>
      <p>
        有了接口和实现，还差一个问题：运行时到底实例化哪个 Provider？答案不该散落在各处，而该收敛到一个工厂函数里。下面是 <code>src/provider/index.ts</code> 的完整内容。
      </p>

      <CodeBlock lang="ts" title="src/provider/index.ts" code={providerIndex} />

      <p>
        <code>createProvider</code> 按配置里的 <code>provider</code> 字段选实现，缺省就是 <code>claude</code>；
        碰到不认识的名字，它给出一句清晰的报错，并直接告诉调用者扩展方式（实现接口 + 注册一行）。
        这正是上一章 <code>loadConfig</code> 跑完之后该调用它的地方：配置负责「想要什么」，工厂负责「把它造出来」。
      </p>

      <Example title="新增一个 Provider 要改哪里">
        <p>假设你现在想接入 OpenAI，或者一个本地跑的开源模型。需要动的地方一共两处：</p>
        <ol>
          <li>新建一个 class（比如 <code>OpenAIProvider</code>），实现 <code>Provider</code> 接口——也就是把 <code>model</code> / <code>contextWindow</code> / <code>complete</code> / <code>countTokens</code> 这四样填上，把该厂商的方言全收在这个文件里。</li>
          <li>在 <code>createProvider</code> 的 <code>switch</code> 里加一个 <code>case</code>，把名字映射到新 class。</li>
        </ol>
        <p>
          就这样。主循环、工具、CLI、权限系统、上下文压缩——一行都不用动。它们只认 <code>Provider</code> 接口，根本感知不到背后多了个厂商。
          这就是当初忍着不写「直接 new 一个客户端」、坚持先抽象的回报。
        </p>
      </Example>

      <h2>呼应 /model 命令</h2>
      <p>
        还记得卷 2 里那个 <code>/model</code> 命令吗？它能在会话进行中切换模型。现在你应该看穿它的本质了：它做的事，
        无非就是 <code>new</code> 一个新的 Provider，然后通过 <code>agent.setProvider(...)</code> 塞回 agent。
        老的对话历史照旧，下一轮请求自动走新模型。
      </p>

      <Callout variant="tip">
        运行时换模型（<code>/model</code>）和启动时按配置选模型（<code>createProvider</code>），走的是同一套抽象。
        前者是「换一个 Provider 实例」，后者是「造第一个 Provider 实例」，落点都是同一个 <code>Provider</code> 接口。一套抽象，两个入口。
      </Callout>

      <Callout variant="warn">
        别天真地以为所有厂商长得一样。不同厂商的能力和参数其实差异不小：有的支持 thinking 块、有的不支持；
        token 计数方式各家不同（有的有专门的计数端点，有的只能本地估算）；流式事件的结构也各有各的形状。
        Provider 实现的难点正在这里——每个实现都要在内部把这些差异处理干净，对外却必须保持那个统一的、薄薄的接口。
        抽象不是没有成本，成本被你藏进了各自的 Provider 文件里，换来的是内核的纯净。
      </Callout>

      <h2>卷内衔接</h2>
      <p>
        把这一章和上一章连起来看：<strong>配置</strong>负责回答「选什么」（哪个 provider、哪个 model、多大窗口），
        <strong>Provider 抽象</strong>负责回答「怎么换」（统一接口 + 工厂）。两者合起来，forge 就不再被锁死在任何一个模型或厂商上了。
      </p>

      <KeyIdea>
        配置（选什么）+ Provider 抽象（怎么换）= forge 不被任何单一模型绑架。模型只是一个可插拔的零件，而不是写死在内核里的依赖。
      </KeyIdea>

      <p>
        下一章我们把「可扩展」这件事从模型本身延伸到工具生态：接入 MCP（Model Context Protocol），
        让 forge 能动态挂载外部工具服务器。如果说 Provider 让你能换「大脑」，那 MCP 就是让你能换「手」。
      </p>

      <Summary
        points={[
          'forge 从卷 1 起就把「调用 LLM」收敛进 Provider 接口，内核只认 model / contextWindow / complete / countTokens 四样东西。',
          'Provider 接口很薄：两个只读属性 + complete/countTokens 两个方法，外加可选的 onTextDelta 流式回调。',
          'ClaudeProvider 是默认实现，职责是把 forge 形状翻译成 Anthropic SDK 形状再翻译回来；所有厂商方言都关在 claude.ts 一个文件里。',
          'createProvider 工厂按配置的 provider 字段选实现，默认 claude，未知名字给出清晰报错并指明扩展方式。',
          '新增 Provider 只需两步：实现接口、在 switch 加一个 case；主循环/工具/CLI/权限/压缩一行不动。',
          '/model 运行时换模型和启动时按配置选模型走同一套抽象，落点都是 Provider 接口。',
          '厂商差异（thinking、token 计数、流式结构）由各自 Provider 实现内部消化，对外保持统一接口——这是抽象的难点也是它的价值。',
          '配置（选什么）+ Provider 抽象（怎么换）让 forge 不被单一模型锁死；下一章用 MCP 把扩展从模型延伸到工具生态。',
        ]}
      />
    </article>
  )
}

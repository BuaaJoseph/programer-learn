import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LoopStepper from '@/courses/build-an-agent/illustrations/LoopStepper.jsx'

const typesSrc = `// forge 的核心类型。我们刻意定义自己的消息/内容类型，而不是直接散用 SDK 的类型，
// 这样「Agent 内核」与「具体某个 LLM Provider」之间有一层清晰的边界（见 src/provider）。

/** 一段文本输出。 */
export interface TextBlock {
  type: 'text'
  text: string
}

/** 模型发起的一次工具调用（它只给「意图」，真正执行的是 forge）。 */
export interface ToolUseBlock {
  type: 'tool_use'
  /** SDK 生成的唯一 id，回灌结果时要原样带回。 */
  id: string
  /** 工具名，对应工具注册表里的某个工具。 */
  name: string
  /** 模型填好的参数。 */
  input: Record<string, unknown>
}

/** 一次工具执行的结果，回灌给模型。 */
export interface ToolResultBlock {
  type: 'tool_result'
  /** 必须与对应 tool_use 的 id 一致，模型靠它把结果和调用对上。 */
  tool_use_id: string
  content: string
  /** 工具执行是否出错；出错时也要如实告诉模型，让它自己纠偏。 */
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

/** 扁平消息历史里的一条消息。system 单独传，不进 messages 列表。 */
export interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
}

/** 模型一轮回复里的「用量」信息，用于成本/上下文统计。 */
export interface Usage {
  inputTokens: number
  outputTokens: number
}

/** Provider 返回的一轮完整结果。 */
export interface AssistantTurn {
  /** 这一轮的全部内容块（文本 + 工具调用）。 */
  content: ContentBlock[]
  /** 模型为什么停下：end_turn 表示没有更多工具调用、可以收尾。 */
  stopReason: string | null
  usage: Usage
}`

const roundtripSrc = `messages = [
  // 第 1 条：用户的问题
  { role: 'user', content: [
    { type: 'text', text: '北京现在几点？' },
  ]},

  // 第 2 条：模型决定调工具（注意它没有直接回答，而是发起了 tool_use）
  { role: 'assistant', content: [
    { type: 'text', text: '我查一下当前时间。' },
    { type: 'tool_use', id: 'tu_01', name: 'get_time',
      input: { timezone: 'Asia/Shanghai' } },
  ]},

  // 第 3 条：forge 执行工具后，把结果当成「用户输入」喂回去
  { role: 'user', content: [
    { type: 'tool_result', tool_use_id: 'tu_01',
      content: '2026-06-16 21:40:12' },
  ]},

  // 第 4 条：模型拿到结果，给出最终回答
  { role: 'assistant', content: [
    { type: 'text', text: '北京现在是 21:40。' },
  ]},
]`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个 Agent 之所以能「记住」你上一句说了什么、上一步工具返回了什么，靠的不是什么神秘的状态机，
          而是一份朴素到有点反直觉的东西：<em>一个按时间排好序的消息数组</em>。
          模型本身是无状态的——每次请求，我们都要把<strong>整段历史</strong>原封不动重新喂给它。
          所以这一章不写逻辑，只做一件事：把 forge 的「工作记忆」这件事想清楚，并定义出它的核心类型。
          后面所有的循环、工具、上下文管理，都建立在这几个类型之上。
        </p>
      </Lead>

      <h2>记忆，就是一个扁平的消息列表</h2>
      <p>
        别把「记忆」想复杂了。在 forge 里，Agent 的全部工作记忆就是一个变量：<code>messages</code>，
        一个数组。数组里每个元素是一条消息（<code>Message</code>），按发生的先后顺序排列。
        每条消息有两个东西：它是谁说的（<code>role</code>），以及它说了什么（<code>content</code>）。
      </p>
      <ul>
        <li>
          <strong>role 只有两种</strong>：<code>'user'</code> 和 <code>'assistant'</code>。
          用户和模型轮流说话，一来一回。
        </li>
        <li>
          <strong>system prompt 不进 messages</strong>。系统提示词（你是谁、能用哪些工具、要守哪些规矩）
          是单独一个参数传给模型的，它不属于这条时间线，更不会随着对话变长。把它和 messages 混在一起，
          是初学者常犯的结构性错误。
        </li>
        <li>
          <strong>content 不是一个字符串，而是一个「内容块数组」</strong>。
          这一点最关键：一条消息里可能既有文字，又有一次（甚至多次）工具调用。
          一个字符串装不下这些，所以我们用 <code>ContentBlock[]</code>。
        </li>
      </ul>

      <p>内容块（<code>ContentBlock</code>）一共三类，对应对话里会出现的三种「东西」：</p>
      <ul>
        <li><code>text</code>：一段文本。用户的提问、模型的回答，都是文本块。</li>
        <li>
          <code>tool_use</code>：模型发起的一次工具调用。注意——它只表达<em>意图</em>
          （「我想用 get_time 这个工具，参数是这些」），真正去执行的是 forge，不是模型。
        </li>
        <li>
          <code>tool_result</code>：工具执行完的结果，回灌给模型。
        </li>
      </ul>

      <Example title="一段真实的 messages 长这样">
        <p>
          以「北京现在几点」为例，一轮带工具调用的完整往返，在 messages 里会沉淀成<strong>四条消息</strong>，
          顺序是：用户文本 → assistant（带 tool_use）→ user（带 tool_result）→ assistant 文本。
          盯着下面这四条，把顺序和角色对上：
        </p>
        <CodeBlock lang="ts" title="一轮工具往返沉淀下来的 messages" code={roundtripSrc} />
        <p>
          看清楚第 3 条：工具结果的 <code>role</code> 是 <code>'user'</code>，
          不是什么 <code>'tool'</code> 角色。这是本章最容易踩的坑，下面专门讲。
        </p>
      </Example>

      <h2>历史是怎么一轮轮变长的</h2>
      <p>
        每经过一轮（模型回一次、可能伴随一次工具调用与结果），messages 就在<strong>末尾</strong>追加几条，
        然后整个数组再次完整发给模型。它从不被截断、从不被改写（至少在这一卷里不会），只会不断变长。
        下面这个小工具，你可以一步步点，直观看到历史如何累积：
      </p>

      <LoopStepper />

      <p>
        这也解释了为什么后面卷会有「上下文管理」这一课：历史只增不减，token 也只增不减，
        总有一天会撑爆模型的上下文窗口。但那是后话——现在，先让结构正确。
      </p>

      <h2>forge 的真实类型：src/types.ts</h2>
      <p>
        下面是 forge 仓库里 <code>src/types.ts</code> 的<strong>逐字</strong>内容。
        它不长，但每个字段都有讲究。先通读一遍，再看下面的逐块拆解。
      </p>

      <CodeBlock lang="ts" title="src/types.ts" code={typesSrc} />

      <h3>TextBlock：最简单的那个</h3>
      <p>
        一个 <code>type: 'text'</code> 标签加一段 <code>text</code>。没什么好说的，
        但注意它带了 <code>type</code> 这个判别字段——这是「可辨识联合（discriminated union）」的关键，
        让 TypeScript 能靠 <code>block.type</code> 收窄类型，也让我们后面遍历 content 时能 <code>switch</code> 分发。
      </p>

      <h3>ToolUseBlock：模型给意图，forge 来执行</h3>
      <p>
        三个字段。<code>name</code> 指向工具注册表里的某个工具，<code>input</code> 是模型按工具的 schema 填好的参数
        （类型是 <code>Record&lt;string, unknown&gt;</code>，因为不同工具参数结构千差万别，内核不该假设它长什么样）。
        最要命的是 <code>id</code>：它是 SDK 为这次调用生成的唯一标识。<strong>记住它，下面要用它配对。</strong>
      </p>

      <h3>ToolResultBlock：结果靠 id 找回它的调用</h3>
      <p>
        <code>content</code> 是工具执行的输出（统一成字符串回灌）。
        <code>tool_use_id</code> 是整个机制的命门：它必须等于对应 <code>ToolUseBlock</code> 的 <code>id</code>。
      </p>

      <KeyIdea title="id 与 tool_use_id 必须配对">
        <p>
          模型可能在<strong>一轮里同时发起多个</strong>工具调用（比如同时查天气和查时间）。
          当多个结果一起回灌时，模型靠 <code>tool_result.tool_use_id === tool_use.id</code> 这条规则，
          把「哪个结果对应哪次调用」对上号。配错了 id，模型就会张冠李戴。
          所以 forge 执行工具时，必须把发起调用时的那个 <code>id</code> 原样带回结果里——一个字符都不能改。
        </p>
      </KeyIdea>

      <p>
        还有 <code>is_error?</code>。工具会失败：文件不存在、命令报错、参数非法。
        新手的本能是「失败了就抛异常、把循环中断」，但在 Agent 里这是错的。
      </p>

      <Callout variant="tip" title="出错也要如实回传，让模型自己纠偏">
        <p>
          工具出错时，正确做法是把错误信息塞进 <code>content</code>、把 <code>is_error</code> 置为 <code>true</code>，
          照常回灌给模型。模型看到「上次那个路径不存在」，往往会自己换个路径重试，或者改用别的工具。
          这种「让模型在循环里自我修正」的能力，恰恰是 Agent 比一次性问答强大的地方。
          你替它把错误吞掉，等于剥夺了它纠错的机会。
        </p>
      </Callout>

      <h3>Message：把角色和内容块绑在一起</h3>
      <p>
        就是 <code>role + content[]</code>。注释里再强调一次：<code>role</code> 没有 <code>'system'</code>——
        system prompt 走单独的参数，不进这个列表。这是结构性约束，写进类型里就不会忘。
      </p>

      <h3>Usage 与 AssistantTurn：把一轮回复收成一个整体</h3>
      <p>
        <code>Usage</code> 记录这一轮花了多少 token（输入、输出分开），用于成本核算和上下文占用统计。
        <code>AssistantTurn</code> 则是 Provider 调用模型后返回的「一轮完整结果」，它把三样东西打包在一起：
      </p>
      <ul>
        <li><code>content</code>：这一轮模型产出的全部内容块（可能是纯文本，也可能含若干 tool_use）。</li>
        <li>
          <code>stopReason</code>：模型为什么停下。<code>'end_turn'</code> 表示它说完了、没有更多工具要调，
          循环可以收尾；如果是因为要调工具而停，我们就得去执行工具、把结果回灌、再转一圈。
          下一章的主循环，正是靠读这个字段决定「继续转还是停」。
        </li>
        <li><code>usage</code>：这一轮的用量。</li>
      </ul>
      <p>
        为什么不直接返回一个 <code>content[]</code> 就完事？因为内核需要 <code>stopReason</code> 来驱动循环、
        需要 <code>usage</code> 来做统计——把它们和内容收在同一个对象里，调用方一次就拿全，不用东拼西凑。
      </p>

      <h2>为什么不直接用 SDK 的类型？</h2>
      <Callout variant="note" title="自定义类型，是为了给内核和 Provider 划一条边界">
        <p>
          Anthropic 的 SDK 自带一套消息/内容块类型，我们大可以直接 import 来用。但 forge 没有这么做，
          而是定义了自己的 <code>Message</code>、<code>ContentBlock</code>、<code>AssistantTurn</code>。
          原因只有一个：<strong>解耦</strong>。Agent 内核（循环、工具调度、历史管理）只认 forge 自己的类型，
          它根本不知道底下接的是哪家模型。具体某个 LLM 厂商的 SDK 类型，被关在 <code>src/provider</code> 这一层里，
          由 Provider 负责把厂商格式翻译成 forge 格式、再翻译回去。
        </p>
        <p>
          这样一来，换 Provider（卷 6 我们就会接第二家模型）时，内核一行都不用改——只新写一个 Provider 适配器即可。
          这层薄薄的边界，是「生产级」和「能跑就行」之间的分水岭。
        </p>
      </Callout>

      <Summary
        points={[
          'Agent 的工作记忆就是一个扁平、按时间排序的 messages 数组；模型无状态，每轮都要把整段历史重新发给它。',
          'role 只有 user 和 assistant 两种；system prompt 单独传参，不进 messages。',
          '一条消息的 content 是「内容块数组」，三类块：text、tool_use（模型给意图）、tool_result（forge 回灌结果）。',
          'ToolUseBlock.id 与 ToolResultBlock.tool_use_id 必须配对，模型靠它把结果对回调用，多工具并发时尤其关键。',
          '工具出错要如实回传（is_error=true），把纠错的机会留给模型，而不是吞掉异常。',
          'tool_result 的 role 是 user——它是我们代表环境喂回去的输入，不是单独的角色。',
          'AssistantTurn 把一轮的 content + stopReason + usage 收成整体，stopReason 驱动下一章的主循环。',
          '刻意定义自己的类型而非直接用 SDK 类型，是为了给内核与 Provider 划清边界，方便日后换模型（呼应卷 6）。',
        ]}
      />
    </>
  )
}

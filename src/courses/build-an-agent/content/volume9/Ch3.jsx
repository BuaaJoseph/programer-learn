import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const toolSrc = `// tools/ask-user.ts —— 一个「占位」工具：它本身几乎什么都不做
import type { Tool } from './types.js'

export const askUserTool: Tool = {
  name: 'ask_user',
  description:
    '当请求缺信息、有歧义、有多种方案、或要确认高风险操作时，向用户提问并暂停。' +
    '必须在开始动手之前调用，不要带着假设硬干。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '要问用户的问题' },
      kind: { type: 'string', enum: ['missing_info', 'ambiguous', 'approach_choice', 'risk_confirm'] },
      options: { type: 'array', items: { type: 'string' }, description: '可选项（如果是选择题）' },
    },
    required: ['question', 'kind'],
  },
  // 真正的逻辑不在这里，而在中间件里——execute 只是占位
  async execute() {
    return { content: '（由 clarification 中间件处理）' }
  },
}`

const mwSrc = `// middleware/clarification.ts —— 拦截 ask_user，中断主循环、等用户回答
export function clarificationMiddleware(): Middleware {
  return {
    name: 'clarification',
    async wrapTool(tu, next) {
      if (tu.name !== 'ask_user') return next()      // 别的工具照常执行

      const { question, options } = tu.input as AskInput
      // 1) 把问题抛给 CLI 层，拿到用户输入（阻塞等待）
      const answer = await promptUser(question, options)
      // 2) 用用户的回答作为这次 tool_result，喂回模型
      return { content: answer }
    },
  }
}

// 注意：这是「问完即续」的轻量版。若要做成 DeerFlow 那种「彻底中断本次 run、
// 用户下一条消息才续」，把 wrapTool 改成抛一个 Interrupt 信号，由主循环 break
// 并把状态存盘，下次 --resume 时带着用户回答续上（见第 7 卷会话持久化）。`

const promptModeSrc = `// system prompt 里加一段「先澄清后行动」的纪律（对照 DeerFlow clarification_system）
export const CLARIFY_DISCIPLINE = \`
<澄清纪律>
工作流顺序：先澄清 → 再规划 → 后动手。
开始任何文件改动之前，先在思考里检查：信息是否缺失？需求是否有歧义？是否有多种合理方案？是否是高风险操作？
只要命中任意一条，必须先调用 ask_user 工具提问，不要带着假设直接开干。
绝不要「先动手、再中途问」。准确比快更重要。
</澄清纪律>\`;`

export default function Ch3() {
  return (
    <article>
      <Lead>
        forge 现在有个毛病：你说「把配置改一下」，它不问「改哪个配置、改成什么」，直接猜一个就动手——猜错了就是白干甚至帮倒忙。
        DeerFlow 把「<strong>先澄清后行动</strong>」做成了一等公民：一个 <code>ask_clarification</code> 工具 + 一个会<strong>中断执行</strong>的中间件，
        外加 system prompt 里大段的澄清纪律。这一章给 forge 补上同款能力。
      </Lead>

      <h2>一、为什么澄清要做成「工具 + 中断」</h2>
      <p>
        最朴素的想法是让模型「用文字问一句」。但那样问完模型往往<strong>自己接着往下编</strong>，根本没真的停下来等你。
        DeerFlow 的解法很巧妙：把「提问」做成一个工具调用，再用中间件拦截这个调用、<strong>真正中断本轮执行</strong>、把控制权交还用户。
      </p>
      <KeyIdea title="DeerFlow 的两段式设计">
        DeerFlow 的 <code>ask_clarification</code> 工具体几乎是<strong>空壳</strong>（只返回一句「processed by middleware」），
        真正的逻辑在 <code>ClarificationMiddleware</code>：它在 <code>wrap_tool_call</code> 里拦截这个调用，用
        <code>Command(goto=END)</code> 直接结束本次 run、把问题抛给用户（见 <code>agents/middlewares/clarification_middleware.py</code>）。
        「工具作为信号、中间件作为执行」——这正是上一卷中间件架构的威力。
      </KeyIdea>

      <h2>二、ask_user 工具（占位）</h2>
      <CodeBlock lang="ts" title="tools/ask-user.ts" code={toolSrc} />
      <p>
        注意 <code>execute</code> 是个占位——它永远不会被真正执行，因为中间件会先把这个调用拦下来。<code>kind</code> 枚举直接搬了
        DeerFlow 的五类澄清场景（缺信息 / 歧义 / 方案选择 / 风险确认）。
      </p>

      <h2>三、拦截它的中间件</h2>
      <CodeBlock lang="ts" title="middleware/clarification.ts" code={mwSrc} />
      <Callout variant="note" title="两种中断强度">
        上面是「问完即续」的轻量版：阻塞等用户输入，把回答当 tool_result 喂回去，循环继续。DeerFlow 用的是「彻底中断」版——
        结束本次 run，用户的下一条消息才算续上（靠 checkpointer 恢复上下文）。在 CLI 里两种都合理：交互式 REPL 用轻量版体验更顺；
        要做成可 <code>--resume</code> 的长任务，就用彻底中断版 + 第 7 卷的会话持久化。
      </Callout>

      <h2>四、把纪律写进 system prompt</h2>
      <p>
        光有工具还不够，得让模型<strong>知道什么时候该用它</strong>。这就要在 system prompt 里加一段澄清纪律——直接对照 DeerFlow 的
        <code>&lt;clarification_system&gt;</code>：
      </p>
      <CodeBlock lang="ts" title="prompt/clarify.ts" code={promptModeSrc} />
      <p>
        把 <code>CLARIFY_DISCIPLINE</code> 拼进第 4 卷的 <code>buildSystemPrompt</code> 即可。配合工具与中间件，三件套齐活：
        <strong>prompt 教它何时问、工具让它能问、中间件保证问了就真的停。</strong>
      </p>

      <Example title="一个对比">
        没有澄清：「优化一下这个函数」→ forge 直接按自己理解重写（可能改了你不想动的地方）。
        有澄清：「优化一下这个函数」→ forge 先 <code>ask_user(question="你说的优化是指性能、可读性还是内存？", kind="ambiguous")</code> →
        你答「性能」→ 它才动手。一个工具的代价，换来「不再帮倒忙」。
      </Example>

      <Summary
        points={[
          'forge 缺少「先澄清后行动」机制，遇到模糊需求会自己猜着动手；DeerFlow 把澄清做成一等公民。',
          'ask_user 工具是占位空壳，真正逻辑在 clarification 中间件——对应 DeerFlow「工具作为信号、中间件作为执行」的两段式设计。',
          '中间件在 wrapTool 里拦截 ask_user：轻量版阻塞等用户回答当 tool_result 续上；彻底中断版结束 run、靠 --resume 续接。',
          'system prompt 加一段澄清纪律（kind 枚举抄 DeerFlow 五类场景），三件套配合：prompt 教它何时问、工具让它能问、中间件保证真的停。',
        ]}
      />
    </article>
  )
}

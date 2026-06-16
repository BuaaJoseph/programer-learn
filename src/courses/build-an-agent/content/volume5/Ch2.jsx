import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const agentSwitchCode = `/** 计划模式：只读探索、产出计划、不改任何东西。 */
private planMode = false

/** 开/关计划模式。开启后只允许只读工具、要求先给计划。 */
setPlanMode(on: boolean): void {
  this.planMode = on
}

get inPlanMode(): boolean {
  return this.planMode
}`

const agentApplyCode = `// 计划模式：只给只读工具，并在 system 末尾加上「只调研、给计划、别动手」的约束。
const tools = this.planMode ? this.toolList.filter((t) => t.readOnly) : this.toolList
const system = this.planMode ? this.system + PLAN_MODE_SUFFIX : this.system

const res = await this.provider.complete({
  system,
  messages: this.messages,
  tools,
  maxTokens: this.maxTokens,
  onTextDelta: (delta) => this.onEvent?.({ type: 'assistant_delta', text: delta }),
})`

const planSuffixCode = `const PLAN_MODE_SUFFIX = \`

# 计划模式（重要）
当前处于计划模式：你只能使用只读工具（read/list/glob/grep）调研，绝对不要修改文件或执行写操作。
请先把相关代码看清楚，然后用文字给出一份清晰的分步计划，等待用户批准后再退出计划模式动手。\``

const planCommandCode = `{
  name: 'plan',
  description: '开/关计划模式（只读调研、先给计划再动手）',
  run(_args, ctx) {
    const on = !ctx.agent.inPlanMode
    ctx.agent.setPlanMode(on)
    ctx.print(on ? '已进入计划模式：forge 只会调研并给出计划，不会修改任何东西。' : '已退出计划模式。')
  },
},`

const interactionDemo = `you> /plan
forge> 已进入计划模式：forge 只会调研并给出计划，不会修改任何东西。

you> 帮我把鉴权模块换成 JWT
forge> [read]  src/auth/session.ts
forge> [grep]  "createSession" → 命中 4 处
forge> [read]  src/auth/middleware.ts
forge> [grep]  "req.session" → 命中 9 处

forge> 调研完成，这是我的计划（请审阅，确认后退出计划模式让我执行）：
  1. 新增 src/auth/jwt.ts：封装 sign / verify，密钥读环境变量 JWT_SECRET。
  2. 改写 createSession：签发 JWT 而非写内存 session，返回 token。
  3. 改写 middleware：从 Authorization 头取 token、verify、挂到 req.user。
  4. 清理旧的 session 存储与相关 import，更新受影响的 4 处调用点。

you> 计划看起来没问题
you> /plan
forge> 已退出计划模式。

you> 按计划执行
forge> [edit]  src/auth/jwt.ts（新建）
forge> [edit]  src/auth/session.ts
forge> [edit]  src/auth/middleware.ts
forge> [bash]  npm test → 通过`

export default function Ch2() {
  return (
    <article>
      <Lead>
        有些任务一上来就改代码，简直是在拆没看过图纸的炸弹。鉴权要换 JWT、要重构核心模块——这种活儿，正确姿势是先把现场看清楚、给一份方案、让人点头，然后才动手。这一章我们给 forge 装上「计划模式」：开启后它只能用只读工具调研、产出一份分步计划，等你批准再动手。
      </Lead>

      <h2>为什么要计划模式</h2>
      <p>
        模型很「热心」，你说一句「换成 JWT」，它可能立刻开始编辑文件——但它还没看清楚现有鉴权是怎么写的、有几个调用点、会不会牵一发动全身。结果就是「一上来就乱改」，改到一半发现方向错了，留下一地半成品。
      </p>
      <p>
        复杂、高风险的任务，需要一个「先想清楚再动手」的闸门：让 Agent 先<strong>只读探索</strong>，看清相关代码；再用文字<strong>给出方案</strong>；由<strong>人来确认</strong>这个方案对不对；确认之后才放它去动手。这就是计划模式要解决的问题。
      </p>

      <KeyIdea>
        计划模式 = 强制「只读探索 → 给计划 → 等批准」三步走。它把「要不要动手、按什么方案动手」的决定权，从模型手里交回给人。
      </KeyIdea>

      <h2>实现思路：一个开关，两道保险</h2>
      <p>
        计划模式本质上是 Agent 上的一个布尔开关。开启后，每次调用模型前会多做两件事：
      </p>
      <ol>
        <li>
          <strong>过滤工具表</strong>：传给模型的工具列表，过滤成只剩只读工具（read/list/glob/grep）。写操作的工具<em>根本不在表里</em>——模型物理上没法调用一个它看不到的工具。
        </li>
        <li>
          <strong>追加约束</strong>：在 system prompt 末尾拼上一段文字，要求模型「只调研、给计划、别动手」。
        </li>
      </ol>

      <Callout variant="tip">
        关键是<strong>双管齐下</strong>：物理限制（只给只读工具）+ 提示约束（system 追加）。只靠提示约束是不可靠的——模型可能「忘了」或被绕过；但只要工具表里没有写工具，它再想改也无从下手。提示是态度，工具表才是底线。
      </Callout>

      <h2>Agent 侧的开关</h2>
      <p>
        先在 Agent 上加一个状态字段和一对存取方法。开关本身很朴素，复杂度都在「怎么用它」。
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（计划模式开关）" code={agentSwitchCode} />
      <p>
        <code>setPlanMode</code> 由外部（斜杠命令）调用来切换，<code>inPlanMode</code> 让外部能读当前状态——比如命令里要判断「现在是开还是关」好做切换。
      </p>

      <h2>主循环里让开关生效</h2>
      <p>
        真正干活的地方在主循环调用模型之前。根据 <code>planMode</code> 决定这一轮用哪份工具表、哪份 system。
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（计划模式生效）" code={agentApplyCode} />
      <p>
        再看那段追加的约束文案常量，它是一段多行模板字符串：
      </p>
      <CodeBlock lang="ts" title="src/agent.ts（约束文案常量）" code={planSuffixCode} />
      <p>
        两行代码各管一道保险。<code>{'this.toolList.filter((t) => t.readOnly)'}</code> 在<strong>调用模型之前</strong>就把写工具拿掉——即便模型脑子里想着「我要 edit 这个文件」，工具表里也没有 edit 可调，请求层面就不可能发生写操作。<code>PLAN_MODE_SUFFIX</code> 则用自然语言再强化一遍意图，告诉模型现在该干嘛（看清楚、给计划、等批准）。两者叠加，缺一不可。
      </p>

      <h2>怎么开关：一个 /plan 命令</h2>
      <p>
        用户切换计划模式，靠一个斜杠命令 <code>/plan</code>，每按一次就反转一次状态。
      </p>
      <CodeBlock lang="ts" title="src/commands.ts（/plan 命令）" code={planCommandCode} />
      <p>
        这呼应卷 2 的斜杠命令注册表——加一个命令，就是往表里加一项。命令通过 <code>ctx.agent</code> 拿到 Agent 实例：读 <code>inPlanMode</code> 算出要切到的新状态，再调 <code>setPlanMode</code> 落地，最后 <code>ctx.print</code> 给用户一句反馈。命令本身不碰任何业务逻辑，只是个开关的遥控器。
      </p>

      <Example title="一次计划模式的交互">
        <p>从进入计划模式，到调研、给计划、批准、退出、执行的完整一轮：</p>
        <CodeBlock lang="text" code={interactionDemo} />
        <p>
          注意计划模式期间，forge 只出现了 read/grep；直到用户 <code>/plan</code> 退出、明确说「按计划执行」之后，edit/bash 才登场。
        </p>
      </Example>

      <Callout variant="note">
        这里的「批准」目前靠用户手动操作：看完计划觉得 OK，自己 <code>/plan</code> 退出，再让它执行。更顺滑的做法是计划产出后，forge 直接问一句「批准吗？」，用户一键确认就自动转入执行——这属于体验优化，原理完全一致：依然是「只读探索 → 给计划 → 等人点头 → 才动手」。
      </Callout>

      <h2>衔接下一章</h2>
      <p>
        计划模式管的是「动手前先想清楚」。但还有另一类问题：有些子任务本身过程很长——要读几十个文件、grep 一大堆结果，这些中间产物会把主对话的上下文塞爆，挤掉真正重要的信息。这时候需要的不是「先想」，而是「隔离」：把这种重活儿丢给一个独立的子代理去跑，只把结论带回主线程。
      </p>

      <KeyIdea>
        计划模式解决「动手前先想」，子代理解决「长任务别污染主上下文」。下一章我们让 forge 学会派活儿给子代理，把脏活累活隔离在外。
      </KeyIdea>

      <Summary
        points={[
          '计划模式 = 强制「只读探索 → 给计划 → 等批准」，把动手的决定权交回给人。',
          '实现是一个布尔开关：开启后过滤工具表（只剩只读工具）+ 追加 system 约束，双保险。',
          '物理限制（看不到写工具就调不了）比提示约束更可靠，两者叠加最稳。',
          'Agent 暴露 setPlanMode / inPlanMode，由 /plan 斜杠命令负责切换。',
          '当前批准靠用户手动 /plan 退出再执行；自动「批准吗」是体验优化，原理不变。',
          '下一章：用子代理隔离长任务，避免读太多文件把主上下文塞爆。',
        ]}
      />
    </article>
  )
}

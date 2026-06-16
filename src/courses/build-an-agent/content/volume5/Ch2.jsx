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

const closedLoopCode = `// 计划-批准-执行 的状态闭环。计划模式只是其中「探索 + 计划」两环的开关，
// 「批准」和「执行」发生在退出计划模式之后。
//
//   ┌─────────────────────────── 计划模式 on ──────────────────────────┐
//   │  ① 只读探索            ② 产出文字计划                              │
//   │  read/grep/list/glob ──▶ "我打算这样改：1... 2... 3..."          │
//   └──────────────────────────────────────────────────────────────────┘
//                                   │
//                                   ▼  ③ 人审阅
//                          ┌── 不满意 ──▶ 继续在计划模式里调研、改计划
//                          └── 批准 ──▶ /plan 退出
//                                   │
//                                   ▼  ④ 计划模式 off：写工具回归，按计划执行
//                          edit / bash / write ...`

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

      <h2>底层原理：为什么「先想后做」对模型尤其重要</h2>
      <p>
        人类工程师即便不写计划，脑子里也有一份隐式的方案；而模型是<strong>自回归</strong>地一个 token 一个 token 往外吐——
        它没有「先在内心打个草稿再落笔」的机制，写出来的就是它当下全部的「想法」。这带来一个微妙后果：
        <strong>如果你不给它一个专门「只许想、不许做」的阶段，它的思考和行动是搅在一起的——边想边改，方案随手就变成了既成事实。</strong>
      </p>
      <p>
        计划模式相当于人为给模型切出一段「纯思考时间」：这一轮你产出的只能是文字方案，不可能落地成文件改动。
        这有点像把「设计评审」从「写代码」里强行剥离出来。研究和实践都反复印证：
        <strong>让模型先用自然语言把方案完整说一遍（thinking / planning），再去执行，正确率显著高于让它直接动手</strong>——
        因为它在「说计划」的过程中，自己就会发现矛盾、补上漏掉的调用点。计划模式把这种「先说后做」从一个建议变成了一道硬约束。
      </p>

      <Callout variant="tip">
        换个角度：直接动手的代价是<strong>不对称</strong>的。想错了，重新想一遍很便宜；但做错了，要回滚一堆文件改动、
        甚至已经跑过的命令产生了副作用，很贵。计划模式就是用「便宜的多想一轮」去换「避免昂贵的做错回滚」。
        任务越复杂、越高风险，这笔交易越划算。
      </Callout>

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

      <p>
        为什么不能只靠提示？这触及一个安全设计的通用原则：<strong>能用机制（mechanism）保证的，别只靠策略（policy）规劝。</strong>
        提示约束是「策略」——它依赖模型自觉遵守，而模型在长对话、被复杂指令干扰、甚至遇到 prompt injection 时都可能违背它。
        工具过滤是「机制」——写工具压根不在这一轮的请求里，模型就算被诱导得想改文件，也<em>没有可调用的句柄</em>，
        请求层面就发不出写操作。这跟操作系统不靠「请进程别访问别人的内存」而是靠 MMU 硬隔离，是同一种思路。
      </p>

      <Callout variant="warn">
        常见误区：以为「在 system prompt 里写得足够严厉」就够了。实践里，越长的对话、越绕的用户指令，
        纯提示约束被突破的概率越高。把它当<strong>第二道</strong>保险可以，当<strong>唯一</strong>保险一定出事。
        真正兜底的永远是「写工具不在表里」这条物理事实。
      </Callout>

      <h2>计划-批准-执行：一个完整闭环</h2>
      <p>
        别把计划模式孤立地看成「一个只读开关」。它其实是一条闭环里的前半段，整条链路是：
        <strong>探索 → 计划 →（人）批准 → 执行</strong>。计划模式负责把前两环锁在「绝对安全」的只读空间里，
        后两环则发生在退出计划模式之后。画成图：
      </p>
      <CodeBlock lang="ts" title="计划-批准-执行闭环" code={closedLoopCode} />
      <p>
        这条闭环和卷里讲过的<strong>权限确认 / HITL（Human-in-the-Loop）</strong>是同一思想的两种粒度。
        权限确认是<em>细粒度</em>的：每个危险操作单独弹一次「确认吗」。计划模式是<em>粗粒度</em>的：
        在动手之前，先把<em>整套</em>方案一次性摆给人看、一次性批准。两者互补——
        计划模式让人审「方案对不对」，权限确认让人审「这一步具体做不做」。复杂任务往往两者都用：先批方案，执行时关键写操作再逐个确认。
      </p>

      <Callout variant="note">
        可以这样记：权限确认问的是「<strong>这一刀</strong>下不下」，计划模式问的是「<strong>整张手术方案</strong>批不批」。
        前者防的是单个危险动作，后者防的是「方向就错了，每一刀都白挨」。
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

      <h2>边界情况与工程经验</h2>
      <ul>
        <li>
          <strong>计划模式里模型「憋不住想动手」</strong>：它有时会在计划文字里写「我现在就去改 xxx」，
          然后发现没有 edit 工具可调。这不是 bug——工具表已经物理拦住了。但体验上最好让 system 文案讲清楚
          「现在只能给计划」，免得它反复尝试一个不存在的工具、浪费轮次。
        </li>
        <li>
          <strong>只读其实也不是绝对安全</strong>：read/grep 本身不写盘，但若被允许跑任意 bash，理论上仍能产生副作用。
          所以「只读工具集」要老实——把 bash 这类能写的工具排除在计划模式之外（我们的过滤靠的就是每个工具诚实标注的
          <code>readOnly</code>）。<strong>工具的 readOnly 标注是否准确，直接决定计划模式的安全边界。</strong>
        </li>
        <li>
          <strong>计划过期</strong>：批准计划和执行之间若隔了很久、代码被别人改动过，原计划可能已经不成立。
          严谨的做法是执行前让模型快速复核一眼。本课从简，但生产系统值得留意。
        </li>
        <li>
          <strong>别对小事开计划模式</strong>：改个错别字也要先调研给计划再批准，纯属仪式负担。
          计划模式是给「高风险、多文件、牵一发动全身」的任务用的。
        </li>
      </ul>

      <Callout variant="tip">
        一个对比帮你定位它：TodoWrite（上一章）解决「<strong>怎么一步步走稳</strong>」，是执行期的进度管理；
        计划模式解决「<strong>该不该走、走哪条路</strong>」，是执行前的方案闸门。前者作用于「做的过程」，后者作用于「做之前」。
        理想流程常是：计划模式里产出方案 → 批准 → 退出后用 TodoWrite 把方案拆成清单逐项落地。
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

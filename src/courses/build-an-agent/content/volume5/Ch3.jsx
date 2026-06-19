import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const taskToolCode = `import type { Tool } from './types.js'

// task：把一个独立子任务交给「子代理」处理。子代理在隔离的上下文里自己跑很多轮，
// 只把最终结果摘要回传给主代理——本质是个「上下文隔离器」，避免几十个文件内容污染主上下文。
//
// 真正怎么跑一个子代理由上层注入（run 闭包），这样本文件不直接依赖 Agent，避免循环依赖。
export function makeTaskTool(run: (prompt: string, cwd: string) => Promise<string>): Tool {
  return {
    name: 'task',
    // 标记只读：派生子代理这个动作本身不写盘；子代理内部真正的写操作会各自走权限闸门。
    readOnly: true,
    description:
      '把一个范围明确但过程冗长的子任务交给子代理处理（它有完整工具、独立上下文，只回传结果摘要）。适合「在整个仓库里找出所有 X 并整理」这类会读很多文件的调研任务，避免污染主上下文。给它一个自包含、目标清晰的 prompt。',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: '子任务的一句话描述（便于展示）。' },
        prompt: { type: 'string', description: '交给子代理的完整任务说明，必须自包含。' },
      },
      required: ['prompt'],
    },
    async execute(input, ctx) {
      const prompt = String(input.prompt ?? '')
      if (!prompt) return { output: 'task 需要一个非空的 prompt。', isError: true }
      const result = await run(prompt, ctx.cwd)
      return { output: result || '(子代理没有返回文本结果)' }
    },
  }
}`

const indexCode = `// 子代理：用主代理的核心工具 + 独立上下文跑子任务，共用主代理的确认通道。
// 注意子代理的工具里不含 task 本身，避免无限递归派生。
let agent: Agent
const taskTool = makeTaskTool(async (prompt, cwd) => {
  const sub = new Agent({
    provider,
    tools: ALL_TOOLS,
    system: buildSystemPrompt(cwd),
    cwd,
    audit,
    maxTurns: 30,
    confirm: (req) => agent.requestConfirm(req),
  })
  return sub.runTurn(prompt)
})

// 主代理的完整工具表 = 核心工具 + 任务清单 + 子代理。
const tools: Tool[] = [...ALL_TOOLS, makeTodoTool(todos), taskTool]`

const requestConfirmCode = `/** 走当前确认回调问一句（供子代理复用主代理的确认通道）。 */
requestConfirm(req: ConfirmRequest): Promise<boolean> {
  return this.confirm ? this.confirm(req) : Promise.resolve(false)
}`

const recursionGuardCode = `// 递归防护：子代理的工具表里故意没有 task，所以它无法再派子代理。
// 这等于把递归深度硬钉死在 1 层——主代理可派子代理，子代理到此为止。
//
//   主代理   [..ALL_TOOLS, todo, task]   ← 有 task，能派活
//      │ task(...)
//      ▼
//   子代理   [..ALL_TOOLS]               ← 没有 task，派不了活，干完就回
//
// 如果哪天真要支持多层（极少需要），别靠「希望模型克制」，要显式传一个深度计数：
function makeTaskTool(run: (p: string, cwd: string, depth: number) => Promise<string>, maxDepth = 1) {
  // execute 里：if (ctx.depth >= maxDepth) return { output: '已达最大子代理深度，请直接处理。', isError: true }
  // 用机制（计数）兜底，而不是用提示（求模型别套娃）兜底。
}`

const costTableNote = `// 一次 task 的成本账（粗略量级，帮你判断值不值得派）：
//   - 多一轮主代理的「决定派活 + 读回摘要」往返
//   - 子代理自己从零跑 N 轮（每轮一次模型调用 + 工具）
//   - 子代理整段历史的 token 都要花钱，只是不进主上下文而已
//
// 所以 task 省的是「主上下文空间」，花的是「总 token 和时延」。
// 它是一笔用「钱和时间」换「主上下文清醒」的交易——值不值，看任务大小。`

export default function Ch3() {
  return (
    <article>
      <Lead>
        到现在为止，forge 的主代理一直在「同一根上下文」里干所有事。但有些子任务天生又长又脏：
        「在全仓库找出所有调用旧 <code>fetchUser</code> API 的地方并整理」——它要 grep、要 read 几十个文件，
        中间过程一大堆。如果这些全堆进主上下文，主历史很快就被中间产物撑爆，主代理反而看不清自己在干嘛。
        这一章，我们给 forge 装上最后一块大件：子代理（Task）。
      </Lead>

      <h2>子代理到底是什么</h2>
      <p>
        先把误解掐掉：子代理不是「多 Agent 编排框架」，不是一张预先画好的 Agent 协作图。它的真身朴素得多——
        它是一个<strong>上下文隔离器</strong>。
      </p>
      <p>
        主代理遇到一个独立、自包含的子任务，把它整段丢给子代理。子代理在自己<strong>全新的、干净的</strong>上下文里跑很多轮：
        读 50 个文件、grep 十几次、来回推理都行。这一切都发生在子代理的上下文里，跟主代理毫无关系。
        最后，子代理只把一段<strong>结果摘要</strong>作为 <code>tool_result</code> 回传给主代理。
      </p>

      <KeyIdea>
        子代理的本质是「上下文隔离器」：把一个会读很多文件、过程冗长的子任务，扔进一个独立空白上下文里跑，
        最后只回传一小段摘要。主代理读了 30 个文件的脏活，主上下文里却只多出了那一段摘要——这就是隔离的全部意义。
      </KeyIdea>

      <h2>上下文隔离的底层原理</h2>
      <p>
        要理解它为什么值钱，得先记住一个硬约束：<strong>上下文窗口是有限且昂贵的稀缺资源。</strong>
        每多塞一个文件全文进主对话，都会带来三重代价：① 占掉窗口空间，逼近上限后老消息会被挤掉（信息丢失）；
        ② 每一轮都要把这堆 token 重新喂给模型，钱按 token 烧、延迟也涨；③ 真正重要的信号被海量中间产物<strong>稀释</strong>，
        模型注意力被噪声分散，反而做得更差——这就是俗称的「context rot / 上下文腐烂」。
      </p>
      <p>
        子代理的解法干净利落：让那 30 个文件的全文只活在<strong>子代理的</strong>上下文里，主代理从头到尾只看到最后那段摘要。
        本质上这是一种<strong>分治 + 信息压缩</strong>：把「读很多 → 得出结论」这个高熵过程，封装进一个用完即弃的隔离空间，
        对外只暴露低熵的结论。主上下文因此始终保持清醒、连贯。
      </p>

      <Callout variant="tip">
        类比一下：主代理像项目经理，子代理像你派去「把整个仓库摸一遍」的实习生。你不需要实习生把他翻过的每一页都念给你听，
        你只要他最后那张「我发现了这 7 处」的纸条。中间他读了多少资料，是<em>他的</em>认知成本，不该变成<em>你的</em>记忆负担。
      </Callout>

      <h2>子代理 vs 多 Agent 编排：一个关键澄清</h2>
      <p>
        这是初学者最容易混淆的地方，值得单独拎出来对比：
      </p>
      <table>
        <thead>
          <tr><th></th><th>单主循环 + 按需子代理（本课）</th><th>多 Agent 编排框架</th></tr>
        </thead>
        <tbody>
          <tr><td>结构</td><td>始终一根主循环，临时派一次性子代理</td><td>预先定义多个角色 Agent + 协作图</td></tr>
          <tr><td>子代理生命周期</td><td>用完即弃，跑完就回收</td><td>常驻、互相收发消息</td></tr>
          <tr><td>派子代理的目的</td><td>隔离上下文 / 压缩信息</td><td>角色分工 / 并行协作</td></tr>
          <tr><td>可调试性</td><td>高：永远知道谁在哪根上下文里干了啥</td><td>低：消息满天飞，状态难追</td></tr>
          <tr><td>复杂度</td><td>低，几乎只是「一个会跑子任务的工具」</td><td>高，要管调度、通信、死锁</td></tr>
        </tbody>
      </table>
      <p>
        我们做的是<strong>前者</strong>，而且刻意只做前者。它不是「多 Agent 框架的残缺版」，而是一个不同的、更克制的设计点——
        把子代理降格成一个普通工具（<code>task</code>），不引入任何协作语义。这正是 Claude Code 同款的范式：
        <strong>简单到几乎不像「多代理」，但解决了真问题（上下文隔离），且永远好调试。</strong>
      </p>

      <h2>为什么需要它</h2>
      <p>子代理带来的好处其实就两条，但都很值：</p>
      <ul>
        <li>
          <strong>省主上下文</strong>：中间过程（一堆文件全文、一堆 grep 结果）不会污染主代理的历史。主代理只看到结论。
        </li>
        <li>
          <strong>可限定范围</strong>：你给子代理一个自包含的 prompt，它就只盯着这一件事干，不会被主对话里别的话题带跑。
        </li>
      </ul>

      <Callout variant="tip">
        什么时候该派 <code>task</code>？范围明确、过程长、会读很多东西的<strong>调研类</strong>子任务——
        「找出所有 X 并整理」「把整个 src 下的导出符号列个清单」之类。
        什么时候<strong>别</strong>派？简单一两步就能搞定的事（改一个文件、跑一次命令），直接在主循环里做更省事，
        派子代理反而多一趟往返开销。
      </Callout>

      <h2>避免循环依赖：注入一个 run 回调</h2>
      <p>
        实现 task 工具时，有个很自然的冲动：在 <code>task.ts</code> 里直接 <code>import {'{'} Agent {'}'}</code> 然后 <code>new Agent(...)</code>。
        但这会立刻引出循环依赖——<code>agent.ts</code> 要用工具，工具又要 import <code>Agent</code>，
        <code>task.ts</code> ↔ <code>agent.ts</code> 互相咬住。
      </p>
      <p>
        我们的做法是：task 工具<strong>不知道</strong>怎么跑一个子代理，它只接收一个 <code>run</code> 回调，
        由上层（<code>index.ts</code>）把「怎么造一个子代理并跑它」这件事注入进来。逐字看实现：
      </p>

      <CodeBlock lang="ts" title="src/tools/task.ts" code={taskToolCode} />

      <p>逐段拆开：</p>
      <ul>
        <li>
          <strong>为什么注入 <code>run</code> 而不直接 <code>new Agent</code></strong>：
          <code>makeTaskTool</code> 接收一个 <code>{'(prompt, cwd) => Promise<string>'}</code> 的闭包。
          这样 <code>task.ts</code> 完全不 import <code>Agent</code>，依赖方向只剩单向（<code>index.ts</code> 知道两边），
          彻底断开 <code>task.ts</code> ↔ <code>agent.ts</code> 的循环。
        </li>
        <li>
          <strong><code>readOnly: true</code> 的理由</strong>：派生一个子代理这个动作本身不会写盘。
          至于子代理内部真正去写文件、跑命令——那些危险操作会在子代理自己那一侧各自经过权限闸门确认，不靠这里兜底。
          所以 task 工具本身标记为只读是诚实的。
        </li>
        <li>
          <strong><code>description</code> 怎么写</strong>：它直接引导模型「什么时候用」（范围明确、过程长、读很多文件的调研）
          和「prompt 要自包含」。模型读到这段描述，就知道别拿它干琐碎小事，也知道要把任务说清楚。
        </li>
        <li>
          <strong><code>execute</code></strong>：先校验 <code>prompt</code> 非空（空了直接报错返回），
          然后调注入进来的 <code>run(prompt, ctx.cwd)</code>，最后把子代理的返回文本作为 <code>output</code> 回传。
          兜一个底：如果子代理没返回任何文本，给一句占位说明。
        </li>
      </ul>

      <h2>在入口把子代理装配起来</h2>
      <p>
        真正「怎么跑一个子代理」的逻辑放在 <code>index.ts</code>。这里就是我们注入给 <code>makeTaskTool</code> 的那个 <code>run</code> 闭包：
      </p>

      <CodeBlock lang="ts" title="src/index.ts（装配子代理）" code={indexCode} />

      <p>逐段讲解：</p>
      <ul>
        <li>
          <strong>子代理是一个全新的 <code>Agent</code></strong>：<code>new Agent({'{'} ... {'}'})</code> 一造出来，它就有自己空白的 <code>messages</code>。
          这就是「隔离」的物理实现——它跟主代理不共享任何历史。
        </li>
        <li>
          <strong>工具用 <code>ALL_TOOLS</code>，故意不含 <code>task</code></strong>：子代理拿到的是核心读写工具，
          但工具表里<strong>没有 task</strong>。这是有意为之——防止子代理又派子代理、再派子代理，无限递归下去。
          主代理才有 task，子代理只干活。
        </li>
        <li>
          <strong><code>maxTurns: 30</code> 给小一点</strong>：子任务应该是聚焦的，给它一个比主代理更紧的轮数上限，
          既够它读几十个文件，也防止它在隔离上下文里失控空转。
        </li>
        <li>
          <strong><code>confirm</code> 复用主代理的确认通道</strong>：<code>{'confirm: (req) => agent.requestConfirm(req)'}</code>。
          子代理要执行危险写操作时，确认请求仍然弹回给<strong>用户</strong>——安全这条线不因为「在子代理里」就打折。
        </li>
        <li>
          <strong>为什么是 <code>let agent</code> 先声明</strong>：<code>taskTool</code> 必须先于 <code>agent</code> 构造（它要进 <code>tools</code> 数组），
          但闭包里又要引用 <code>agent.requestConfirm</code>——而闭包真正<strong>运行</strong>是在 <code>agent</code> 已经存在之后。
          所以用 <code>let</code> 先声明、闭包里延迟引用，构造顺序和运行顺序就都对上了。
        </li>
      </ul>

      <h2>递归防护：为什么子代理不能再派子代理</h2>
      <p>
        上面那条「<code>ALL_TOOLS</code> 故意不含 <code>task</code>」看似随手，其实是整个设计里最重要的一道安全闸。
        设想一下若不这么做：子代理拿到 task 工具 → 它又派一个孙代理 → 孙代理再派…… 这是一棵会指数爆炸的递归树，
        分分钟把你的 token 预算和 API 限额烧穿。把 task 从子代理工具表里拿掉，等于把<strong>递归深度硬钉死在 1 层</strong>：
      </p>
      <CodeBlock lang="ts" title="递归防护：深度钉死在 1 层" code={recursionGuardCode} />
      <p>
        注意这里的工程哲学：我们靠<strong>机制</strong>（工具表里没有 task）而不是<strong>提示</strong>（求模型「别套娃」）来防递归。
        提示会被模型违背，机制不会。万一哪天真要支持有限的多层嵌套（极少数场景），也不能放开了让它自由递归，
        而要显式传一个 <code>depth</code> 计数、到顶就拒绝——同样是用机制兜底。
      </p>

      <Callout variant="warn">
        这是和上一章计划模式一脉相承的原则：<strong>安全边界要用机制保证，不要寄望于模型自觉。</strong>
        计划模式靠「写工具不在表里」，递归防护靠「task 不在子代理表里」，本质是同一招：把不该发生的事，
        从「请它别做」降级成「它根本没法做」。
      </Callout>

      <h2>并发：能不能一次派好几个子代理</h2>
      <p>
        既然子代理上下文彼此隔离、互不依赖，一个自然的想法是：把多个独立调研任务<strong>并行</strong>派出去，
        总时延就能从「N 个任务串行相加」压成「最慢那个」。技术上完全可行——若模型在一轮里返回多个 <code>task</code> tool_use，
        主循环用 <code>Promise.all</code> 同时跑它们的 <code>run</code> 即可，因为它们不共享任何可变状态，天然无竞态。
      </p>
      <p>
        但要并行，得先想清楚两个边界：① <strong>确认通道的争用</strong>——若两个子代理同时要写文件、同时弹「确认吗」，
        终端 UI 得能把这两个确认排好队，否则会互相盖掉；② <strong>成本会同时翻倍</strong>，几个子代理一起烧 token。
        本课实现是串行的（一个 task 跑完再跑下一个），简单可靠；并行是一个清晰的进阶方向，原理不变，难点全在「共享资源的协调」。
      </p>

      <Callout variant="note">
        并发的甜区是「多个<em>互不依赖</em>的只读调研」——比如「分别统计 src、test、docs 三个目录的导出符号」。
        一旦子任务之间有依赖（B 要用 A 的结果），就别并行了，老老实实串起来或者干脆合成一个子代理。
      </Callout>

      <h2>成本权衡：什么时候这笔账划算</h2>
      <p>
        子代理不是白嫖的隔离。它省的是「主上下文空间」，花的是「总 token + 时延」——派一次 task，
        子代理要从零跑好几轮，每轮都是真金白银的模型调用，只是这些 token 不进主上下文而已。
      </p>
      <CodeBlock lang="ts" title="一次 task 的成本账" code={costTableNote} />
      <p>
        所以判断标准很实在：<strong>当「中间产物的体量」远大于「最终摘要的体量」时，派子代理才划算。</strong>
        要读 30 个文件最后只产出一张 7 行清单——隔离收益巨大，值得派。反过来，只需读 1 个文件就能答的事，
        派子代理纯属多绕一圈：多花一轮往返、多烧一段独立历史，省下的那点上下文还不够付路费。
      </p>

      <h2>Agent 侧的配合：requestConfirm</h2>
      <p>
        上面闭包里调的 <code>agent.requestConfirm(req)</code>，正是我们在前面（确认通道那一卷）给 <code>Agent</code> 留的口子。
        它让子代理能借道主代理的确认回调：
      </p>

      <CodeBlock lang="ts" title="src/agent.ts（requestConfirm）" code={requestConfirmCode} />

      <p>
        逻辑很直白：如果当前 <code>Agent</code> 配了 <code>confirm</code> 回调就走它问一句，没配就保守地返回 <code>false</code>（拒绝）。
        主代理的 <code>confirm</code> 是接到真实用户的，子代理通过 <code>agent.requestConfirm</code> 转一道，就接上了同一个用户。
      </p>

      <Example title="子代理隔离上下文的一次调用">
        <p>主代理收到任务：「把所有还在用旧 <code>fetchUser</code> API 的地方找出来，统一整理一下。」</p>
        <ol>
          <li>主代理判断这是个会读很多文件的调研任务，调 <code>task(prompt: "在整个仓库里搜索所有调用 fetchUser 的位置，逐个打开确认是不是旧 API 的用法，整理成清单……")</code>。</li>
          <li>子代理在<strong>自己干净的上下文</strong>里开跑：grep 了几轮、打开并读了大约 30 个文件、逐个比对、做笔记。这一大堆中间过程全在子代理上下文里。</li>
          <li>子代理跑完，只回传一段摘要：「共 7 处使用旧 <code>fetchUser</code>，分别在 <code>src/user/list.ts:42</code>、<code>src/auth/login.ts:18</code> ……（含行号与简述）」。</li>
          <li>主代理拿到的，<strong>只有</strong>这段摘要。那 30 个文件的全文，一个字都没进主上下文。</li>
        </ol>
      </Example>

      <Callout variant="warn">
        两个常见坑：
        <br />
        ① 子代理<strong>不会自动知道</strong>主对话里聊过什么——它的上下文是空白的。所以 prompt 必须写清楚、自包含，
        别假设它知道「刚才那个文件」「我们说的那个函数」。
        <br />
        ② 别滥用 <code>task</code>。简单一两步的事直接在主循环做；每派一次子代理都有额外的往返成本（多一轮模型、多一段上下文）。
      </Callout>

      <Callout variant="note">
        这正是「单主循环 + 按需子代理」的范式（Claude Code 同款）：始终只有一根主循环在推进，需要隔离脏活时临时派一个子代理。
        它<strong>不是</strong>预先编排好的多 Agent 协作图。好处是：保持简单、主上下文连续、出问题好调试——
        你永远清楚是谁、在哪根上下文里、干了什么。
      </Callout>

      <h2>第 5 卷小结</h2>
      <p>这一卷我们给 forge 装齐了「应对大任务」的三件套：</p>
      <ul>
        <li><strong>TodoWrite</strong>：把大任务拆成可追踪的清单，让代理自己记着进度、一项项推进。</li>
        <li><strong>计划模式</strong>：先想清楚再动手，把方案摆出来，避免一上来就乱改。</li>
        <li><strong>子代理（Task）</strong>：把会读很多文件的调研类脏活隔离到独立上下文，只把摘要带回主线。</li>
      </ul>

      <KeyIdea>
        拆解（TodoWrite）+ 先想后做（计划模式）+ 隔离调研（子代理），三者合起来，让 forge 从「只能干一两步的小工具」
        变成「能从容啃下大任务」的代理。而它们的共同底色都是：<strong>保持单主循环、保持上下文清醒</strong>。
      </KeyIdea>

      <p>
        下一卷我们换个维度——讲<strong>扩展性</strong>：配置系统、Provider 抽象（不绑死在一家模型上）、以及接入 MCP。
        让 forge 从「能用」走向「可长期演进」。
      </p>

      <Summary
        points={[
          '子代理的本质是「上下文隔离器」，不是多 Agent 编排：把冗长子任务丢进独立空白上下文跑，只回传摘要。',
          'task 工具不直接 import Agent，而是接收一个 run 回调由 index.ts 注入，断开 task.ts ↔ agent.ts 的循环依赖。',
          'task 标记 readOnly:true：派生动作本身不写盘，子代理内部的写各自走权限闸门。',
          '子代理用 ALL_TOOLS 但故意不含 task，防止无限递归派生；maxTurns 给小一点保持聚焦。',
          '子代理通过 agent.requestConfirm 复用主代理的确认通道，危险写操作仍弹给真实用户确认。',
          'prompt 必须自包含——子代理不知道主对话上下文；简单的事别滥用 task，省往返成本。',
          '这是「单主循环 + 按需子代理」范式：简单、上下文连续、好调试。',
          '第 5 卷三件套（TodoWrite + 计划模式 + 子代理）让 forge 从容应对大任务；下一卷讲扩展性。',
        ]}
      />
    </article>
  )
}

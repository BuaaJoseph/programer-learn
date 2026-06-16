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

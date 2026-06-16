import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const typesSrc = `// 工具契约：一个工具 = 给模型看的「说明书」(name/description/inputSchema) + forge 真正执行的 execute。

/** JSON Schema（简化版），用来告诉模型某个工具该怎么填参数。 */
export interface JSONSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

/** 工具执行时能拿到的运行环境。后续卷会往里加权限、日志等。 */
export interface ToolContext {
  /** 工作目录，所有相对路径以它为基准。 */
  cwd: string
}

/** 一次工具执行的结果。 */
export interface ToolResult {
  /** 回灌给模型的文本。 */
  output: string
  /** 是否出错。 */
  isError?: boolean
}

export interface Tool {
  /** 工具名，必须唯一，模型用它点名调用。 */
  name: string
  /** 给模型看的说明：什么时候用、注意什么。写得越清楚模型用得越准。 */
  description: string
  /** 参数的 JSON Schema。 */
  inputSchema: JSONSchema
  /**
   * 是否只读。只读工具(read/list/glob/grep)互不影响、可并行；
   * 写工具(write/edit/bash)会改状态，必须串行。主循环靠这个标记调度。
   */
  readOnly: boolean
  /** 真正干活的地方。入参是模型填好的参数，出参是要回灌的结果。 */
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}`

const echoSrc = `import type { Tool } from './types.js'

// 一个最小的工具：把传进来的 text 原样回显。
// 它没有副作用、不碰文件系统，所以是只读的。
export const echoTool: Tool = {
  // ① name：模型点名调用时用的唯一标识。
  name: 'echo',

  // ② description：告诉模型「什么时候该用我」。
  description:
    '把给定的文本原样返回。仅用于演示工具调用的链路，' +
    '不要用它来读文件或执行命令。',

  // ③ inputSchema：模型按这个结构填参数。
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '要原样回显的文本。',
      },
    },
    required: ['text'],
  },

  // ④ readOnly：不改任何状态，主循环可以放心并行调度它。
  readOnly: true,

  // ⑤ execute：forge 真正执行的地方。input 是模型填好的参数。
  async execute(input, _ctx) {
    const text = String(input.text ?? '')
    return { output: text }
  },
}`

const indexSrc = `import type { Tool } from './types.js'
import { readTool } from './read.js'
import { listTool } from './list.js'
import { globTool } from './glob.js'
import { grepTool } from './grep.js'
import { writeTool } from './write.js'
import { editTool } from './edit.js'
import { bashTool } from './bash.js'

// 工具注册表：主循环从这里拿到全部工具，按名字派发执行。
// 新增一个工具 = 在这里加一行。
export const ALL_TOOLS: Tool[] = [
  // 只读（眼睛）
  readTool,
  listTool,
  globTool,
  grepTool,
  // 写（手）
  writeTool,
  editTool,
  bashTool,
]

export function buildToolRegistry(tools: Tool[] = ALL_TOOLS): Map<string, Tool> {
  const map = new Map<string, Tool>()
  for (const t of tools) map.set(t.name, t)
  return map
}

export type { Tool } from './types.js'`

const schemaShapesSrc = `// inputSchema 不只是「列出字段名」——它在用类型/约束给模型「划框框」。
// 框越准，模型瞎填的空间越小。几种常用写法：

inputSchema: {
  type: 'object',
  properties: {
    // 1) 枚举：把取值锁死在有限集合里，模型几乎不可能填错
    mode: { type: 'string', enum: ['read', 'append', 'overwrite'],
      description: '写入模式。' },

    // 2) 数字范围：给上下界，避免模型填出离谱的值
    limit: { type: 'number', minimum: 1, maximum: 100,
      description: '最多返回多少条，默认 20。' },

    // 3) 数组：声明元素类型，模型才知道每一项该放什么
    paths: { type: 'array', items: { type: 'string' },
      description: '一批文件路径。' },

    // 4) 布尔开关：天然只有 true/false，描述说清「开了会怎样」
    recursive: { type: 'boolean',
      description: '是否递归子目录；默认 false。' },
  },
  required: ['mode'],
}`

const descBadGoodSrc = `// description 是模型选不选你、怎么用你的「唯一情报」。同一个工具，两种写法天差地别：

// ❌ 太干：只说「是什么」，模型不知道何时该用、有什么坑
description: '执行 SQL。'

// ✅ 到位：说清「干什么 / 何时用 / 边界与禁忌」
description:
  '对只读副本执行一条 SELECT 查询并返回结果（最多 1000 行）。' +
  '用于回答关于业务数据的统计类问题。' +
  '只允许 SELECT；不要用它做 INSERT/UPDATE/DELETE——写操作请用 mutate_db 工具。' +
  '查询前若不确定表结构，先调用 describe_table。'`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章我们把 Agent 的「记忆」想清楚了：模型发起 <code>tool_use</code> 表达意图，forge 执行后用
          <code>tool_result</code> 回灌。但有个前提一直被跳过——模型怎么知道它<strong>有哪些工具可调</strong>、
          每个工具<strong>该填什么参数</strong>？答案就是这一章要立的「工具契约」。
          工具是 Agent 的「手」：没有手，模型只会说话；有了手，它才能读文件、改代码、跑命令。
          这一章不实现任何具体工具，只做两件事：定义一个工具长什么样（契约），以及把所有工具登记起来（注册表）。
        </p>
      </Lead>

      <h2>一个工具，是两半东西拼起来的</h2>
      <p>
        别被「工具」这个词唬住。在 forge 里，一个工具就是两半东西：
      </p>
      <ul>
        <li>
          <strong>给模型看的「说明书」</strong>：包含 <code>name</code>（叫什么）、
          <code>description</code>（干什么用、什么时候用）、<code>inputSchema</code>（要填哪些参数）。
          这半东西会随请求一起发给模型，是模型做决策的全部依据。
        </li>
        <li>
          <strong>forge 真正执行的 <code>execute</code></strong>：一段普通的代码。
          模型永远看不到它，也不会运行它——它只属于 forge。
        </li>
      </ul>
      <p>
        这两半的分工，是理解整个 Agent 工具机制的钥匙。模型只读说明书，然后产出一个「意图」：
        「我要调 <code>read</code>，参数是 <code>{'{ path: \'README.md\' }'}</code>」。
        到此为止，模型的活就干完了。接下来真正打开文件、读出内容的，是 forge 调用那个工具的
        <code>execute</code>。模型从头到尾<strong>没有也不可能</strong>碰过你的文件系统。
      </p>

      <KeyIdea title="意图与执行，是两件必须分开的事">
        <p>
          模型负责<strong>决策</strong>（调哪个工具、填什么参数），forge 负责<strong>执行</strong>（真正去读、去写、去跑）。
          这条分界线永远不能模糊。模型再聪明，它也只是吐出一段 JSON 意图；
          所有对真实世界的操作——文件、网络、shell——都发生在 forge 这一侧，由你写的 <code>execute</code> 完成。
          这意味着安全边界、权限校验、错误处理，统统由 forge 把关，而不是寄希望于模型「自觉」。
          记住这条，后面所有关于沙箱、权限、审批的设计才讲得通。
        </p>
      </KeyIdea>

      <h2>说明书写得好不好，直接决定模型用得准不准</h2>
      <p>
        模型不读你的源码，它只读 <code>description</code> 和 <code>inputSchema</code>。
        这意味着：工具好不好用，一大半取决于这两段文字写得清不清楚。
        同样一个工具，描述含糊，模型就会在该用它的时候不用、不该用的时候乱用、或者参数填得乱七八糟；
        描述到位，模型几乎不会出错。把它当成「写给一个聪明但没看过代码的同事的接口文档」来对待。
      </p>

      <Callout variant="tip" title="写说明书的几条经验">
        <p>
          <strong>description 要写「什么时候用 / 注意什么」，而不只是「这是什么」。</strong>
          比如不要只写「读取文件」，而要写「读取一个文本文件的内容；用于查看已知路径的文件，
          如果还不知道文件在哪，先用 glob 或 grep 定位」。把使用边界、和别的工具的分工都点出来。
        </p>
        <p>
          <strong>每个参数都要带 description。</strong> 哪怕字段名看起来很显然（比如 <code>path</code>），
          也要写一句，说明它是绝对路径还是相对路径、相对谁。模型对参数语义的判断，全靠这一句。
        </p>
        <p>
          <strong>required 一定要准。</strong> 漏标必填项，模型可能省略关键参数导致执行失败；
          多标了，又会逼模型瞎编一个它本不需要的值。required 列表就是「不给我我没法干活」的那些字段，不多不少。
        </p>
      </Callout>

      <p>
        把上面这条「干 / 何时用 / 边界」掰开看，最直观的就是好坏对比。下面同一个查询工具，
        干巴巴的写法和到位的写法，给模型的「情报量」差着量级：
      </p>
      <CodeBlock lang="ts" title="description 的反例与正例" code={descBadGoodSrc} />
      <p>
        注意正例里那两句「<strong>不要用它做写操作，写请用 mutate_db</strong>」「<strong>不确定表结构先 describe_table</strong>」——
        这是 description 工程里最值钱的部分：<strong>主动划清和邻居工具的分工，并指明前置步骤</strong>。
        模型选工具时其实是在做一道阅读理解，你把边界和协作关系写进去，它就很少会越界或漏步骤。
        反过来，如果两个工具描述含糊、职责重叠，模型就会在它们之间反复横跳、选错。
      </p>

      <h3>inputSchema 的进阶：用约束给模型「划框框」</h3>
      <p>
        forge 内核里的 <code>JSONSchema</code> 是简化版，但 JSON Schema 本身能表达的约束远不止「字段名 + 类型」。
        在真实工具里，你应当尽量用 <code>enum</code>、<code>minimum/maximum</code>、<code>items</code> 这些约束把参数空间收紧——
        <strong>框划得越准，模型瞎填的余地越小，执行前就能挡掉一批非法输入</strong>：
      </p>
      <CodeBlock lang="ts" title="几种常用的参数约束写法" code={schemaShapesSrc} />
      <Callout variant="note" title="schema 约束是「第一道闸」，但不是「唯一一道」">
        <p>
          有了 <code>enum</code> / <code>minimum</code> 这些约束，是不是 execute 里就可以省掉校验了？<strong>不能。</strong>
          schema 约束依赖模型「自觉遵守」和厂商「是否强校验」——多数厂商会尽量约束模型输出，但<strong>不保证</strong>百分百合法。
          所以正确的姿势是：schema 负责<strong>引导</strong>模型（让它大概率填对），execute 里仍要把 <code>input</code> 当不可信输入做<strong>防御性校验</strong>
          （回想上一章 echo 工具里的 <code>String(input.text ?? '')</code>）。两道闸叠加，才是生产级的稳。
        </p>
      </Callout>

      <h2>forge 的真实契约：src/tools/types.ts</h2>
      <p>
        下面是 forge 仓库里 <code>src/tools/types.ts</code> 的<strong>逐字</strong>内容。
        通篇不过四个 interface，但每个字段都在为后面几章埋伏笔。先通读，再看逐字段拆解。
      </p>

      <CodeBlock lang="ts" title="src/tools/types.ts" code={typesSrc} />

      <h3>JSONSchema：写给模型的参数说明</h3>
      <p>
        这是个刻意简化过的 JSON Schema：一个 <code>type: 'object'</code>，一份 <code>properties</code>
        （每个参数的名字、类型、描述），外加一个可选的 <code>required</code> 数组。
        它的唯一用途，就是告诉模型「这个工具的参数长什么样、哪些必填」。
        注意 <code>properties</code> 的值类型是 <code>unknown</code>——我们不想在内核里把整套 JSON Schema 规范都建模出来，
        够用就好，复杂度留给真正需要的工具自己处理。
      </p>

      <h3>ToolContext：所有相对路径的基准</h3>
      <p>
        工具执行时，光有模型填的参数还不够，它还需要知道「在哪个目录下干活」。
        <code>ToolContext.cwd</code> 就是这个工作目录：<strong>所有相对路径都以它为基准</strong>。
        模型说「读 <code>src/main.ts</code>」，到底读的是哪个 <code>src</code>？就是 <code>cwd</code> 下的那个。
        把 <code>cwd</code> 收进一个统一的上下文对象，而不是让每个工具各自去 <code>process.cwd()</code>，
        是为了让执行环境可控、可测试——后续卷我们还会往 <code>ToolContext</code> 里加权限、日志、审批回调等，
        现在先占好这个位置。
      </p>

      <h3>ToolResult：连失败也要如实回灌</h3>
      <p>
        一次执行的结果只有两个字段：<code>output</code>（要回灌给模型的文本）和可选的 <code>isError</code>。
        这里和上一章的 <code>ToolResultBlock.is_error</code> 一脉相承：工具失败时，
        不要抛异常中断循环，而要把错误信息塞进 <code>output</code>、把 <code>isError</code> 置为 <code>true</code>，
        照常回灌。模型看到「文件不存在」，往往会自己换条路重试。失败也是信息，要如实给模型。
      </p>

      <h3>Tool：把五件套绑成一个工具</h3>
      <p>
        前面说的「两半东西」，在 <code>Tool</code> 这个 interface 里凑齐了：
        <code>name</code> + <code>description</code> + <code>inputSchema</code> 是给模型看的说明书，
        <code>execute</code> 是 forge 执行的代码。中间还夹着一个最容易被忽视、但分量极重的字段：<code>readOnly</code>。
      </p>

      <Callout variant="note" title="readOnly：决定一个工具走「并行只读道」还是「串行写道」">
        <p>
          <code>readOnly</code> 不是给模型看的，它是给<strong>主循环调度器</strong>看的。
          只读工具（<code>read</code>、<code>list</code>、<code>glob</code>、<code>grep</code>）只是「看」，
          彼此互不影响，可以<strong>并行</strong>同时跑，省时间；写工具（<code>write</code>、<code>edit</code>、<code>bash</code>）
          会改变状态，并行跑可能互相踩踏（比如同时编辑同一个文件），必须<strong>串行</strong>一个个来。
          模型一轮里可能同时发起多个工具调用，主循环正是靠每个工具的 <code>readOnly</code> 标记，
          把它们分进「并行只读道」和「串行写道」分别调度。这套调度，正是本卷最后一章的主题——
          现在你只要知道：这个布尔值不是装饰，它是后面那套并发模型的地基。
        </p>
      </Callout>

      <Example title="一个最小工具长什么样">
        <p>
          光看 interface 还不够直观。我们手写一个最小的 <code>echo</code> 工具——它把传入的文本原样返回，
          没有任何副作用。麻雀虽小，<code>name</code> / <code>description</code> / <code>inputSchema</code> /
          <code>readOnly</code> / <code>execute</code> 五件套一个不少。盯着注释编号，把每件套对上：
        </p>
        <CodeBlock lang="ts" title="src/tools/echo.ts（演示用，非 forge 真实工具）" code={echoSrc} />
        <p>
          看 <code>execute</code>：它拿到的 <code>input</code> 是模型按 schema 填好的参数，
          类型是 <code>Record&lt;string, unknown&gt;</code>，所以我们用 <code>String(input.text ?? '')</code>
          先做一道防御性取值——模型填的东西，永远要当成「不可信输入」来校验。
          它不碰 <code>ctx</code>，因为 echo 不需要工作目录；真正的文件工具就会用上 <code>ctx.cwd</code> 了。
        </p>
      </Example>

      <h2>工具注册表：主循环按名字派发</h2>
      <p>
        定义了一堆工具之后，主循环怎么找到它们？模型回传的 <code>tool_use</code> 里只有一个 <code>name</code>
        字符串，forge 得靠它快速找到对应的 <code>Tool</code> 去执行。这就是「注册表」要解决的事。
        forge 用两层结构：一个<strong>数组</strong>登记全部工具（发给模型时要遍历它），
        再从数组建一个 <code>name → Tool</code> 的 <strong>Map</strong>（执行时按名字 O(1) 查找）。
      </p>

      <CodeBlock lang="ts" title="src/tools/index.ts" code={indexSrc} />

      <p>
        <code>ALL_TOOLS</code> 就是那个数组。它有意分成两组排列：先「只读（眼睛）」、后「写（手）」。
        这个分组不是为了好看——它和上面讲的 <code>readOnly</code> 一脉相承，
        读代码的人扫一眼就知道哪些工具会改状态、哪些不会，心里对调度行为有数。
      </p>
      <p>
        <code>buildToolRegistry</code> 把数组折成 Map：遍历每个工具，以 <code>t.name</code> 为键塞进去。
        之后主循环拿到模型给的工具名，<code>map.get(name)</code> 一下就拿到要执行的 <code>Tool</code>，
        调它的 <code>execute</code>。它默认吃 <code>ALL_TOOLS</code>，但也允许传入自定义工具集——
        这在测试时很有用，可以只注册一两个工具来隔离验证。
      </p>

      <Callout variant="tip" title="扩展性：新增一个工具 = 加一行">
        <p>
          这套结构最舒服的地方在于它的扩展成本。后两章我们要实现 <code>read</code>、<code>write</code>、
          <code>bash</code> 等一个个真实工具，每写好一个，要做的「接线」工作只有：在 <code>ALL_TOOLS</code>
          数组里 <code>import</code> 进来、加上一行。主循环、注册表、Provider 翻译层，统统不用动。
          工具的「定义」和「调度」彻底解耦了——这正是契约带来的红利。
        </p>
      </Callout>

      <h3>为什么是「数组 + Map」两层，而不只用一个？</h3>
      <p>
        新手会问：直接用一个 Map 当注册表不就行了，何必既留数组又建 Map？因为这两层服务于<strong>两个不同的消费者</strong>，
        各自的访问模式不一样：
      </p>
      <table>
        <thead>
          <tr><th>结构</th><th>谁在用</th><th>访问模式</th><th>为何合适</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ALL_TOOLS</code> 数组</td>
            <td>Provider（发请求前）</td>
            <td>整体遍历，翻译成 SDK 的 tools 列表</td>
            <td>需要稳定顺序、要全量取出</td>
          </tr>
          <tr>
            <td><code>name → Tool</code> 的 Map</td>
            <td>主循环（执行时）</td>
            <td>按模型给的名字 O(1) 查单个</td>
            <td>查找快、不必线性扫数组</td>
          </tr>
        </tbody>
      </table>
      <p>
        数组保留了「顺序」与「可遍历」，Map 提供了「按键秒查」。
        用 Map 从数组派生（而不是反过来），保证两者永远一致、单一数据源——改 <code>ALL_TOOLS</code> 一处，两边同步更新。
      </p>

      <Callout variant="note" title="工具不是越多越好：注册表也是「上下文预算」的一部分">
        <p>
          每多注册一个工具，它的 <code>name</code> + <code>description</code> + <code>inputSchema</code> 都要随每一次请求发给模型，
          占着输入 token，也占着模型的注意力。工具一多，模型反而容易<strong>选错</strong>或<strong>在相似工具间犹豫</strong>。
          所以「能扩展」不等于「应该无限堆」。真实工程里有两种常见对策：一是把职责相近的工具<strong>合并</strong>
          （比如不做 read_file/read_lines/read_head 三个，而做一个带参数的 read）；二是按场景<strong>动态裁剪</strong>注册表——
          <code>buildToolRegistry(tools)</code> 之所以允许传入自定义工具集，正是为这种「这个会话只放它该用的那几个工具」留的口子。
        </p>
      </Callout>

      <h2>契约和厂商无关</h2>
      <Callout variant="note" title="自定义 JSONSchema，由 Provider 层翻译成 SDK 格式">
        <p>
          你可能会问：Anthropic 的 SDK 调用工具时要的是 <code>input_schema</code> 字段，
          forge 这里却叫 <code>inputSchema</code>、还自定义了一套 <code>JSONSchema</code> 类型，对得上吗？
          对得上——但<strong>不是在这一层对</strong>。和上一章「自定义消息类型」一个道理：
          forge 的工具契约是厂商无关的，真正调用 LLM 时，由 <code>src/provider</code> 这一层
          把 forge 的 <code>Tool</code> 翻译成某家 SDK 要的 <code>input_schema</code> 格式（这层翻译后面专门讲）。
        </p>
        <p>
          所以现在你完全不用关心哪家模型、哪个字段名。本章立的契约，只是 forge 自己内部对「工具」的统一约定。
          换模型、换厂商，工具定义一行都不用改，只改 Provider 那层翻译——这又是「生产级」和「能跑就行」的分水岭。
        </p>
      </Callout>

      <Summary
        points={[
          '一个工具 = 给模型看的说明书（name / description / inputSchema）+ forge 真正执行的 execute，两半各司其职。',
          '意图与执行必须分开：模型只产出「调哪个工具、填什么参数」的意图，所有真实操作都由 forge 的 execute 完成。',
          'description 和 inputSchema 是模型做决策的全部依据，要写清「什么时候用 / 注意什么」、每个参数都带 description、required 要准。',
          'ToolContext.cwd 是所有相对路径的基准；后续卷会往 ToolContext 里加权限、日志等。',
          'ToolResult.isError 让失败也能如实回灌给模型，把纠错机会留给它，而不是抛异常中断循环。',
          'readOnly 是给主循环调度器看的：只读工具可并行（并行只读道），写工具必串行（串行写道），这是本卷最后一章调度的地基。',
          '注册表用「数组（遍历发给模型）+ name→Tool 的 Map（按名字派发执行）」两层结构，新增工具 = 在 ALL_TOOLS 加一行。',
          'forge 的 JSONSchema 是自定义的、厂商无关的契约，调用 LLM 时由 Provider 层翻译成 SDK 的 input_schema。',
          'read / write 等具体工具的实现是后两章的事，本章只立契约和注册表。',
        ]}
      />
    </>
  )
}

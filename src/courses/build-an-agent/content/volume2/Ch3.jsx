import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const commandsSrc = `import type { Agent } from './agent.js'
import { ALL_TOOLS } from './tools/index.js'
import { ClaudeProvider } from './provider/claude.js'

// 斜杠命令：以 / 开头的输入不发给 LLM，而是在本地直接处理。
// 这套系统刻意做成「注册表 + 统一派发」，加一个命令 = 往 COMMANDS 里加一项。

export interface CommandContext {
  agent: Agent
  /** 打印一行到终端。 */
  print: (s: string) => void
  /** 请求退出 REPL。 */
  quit: () => void
}

export interface SlashCommand {
  name: string
  description: string
  run(args: string, ctx: CommandContext): void
}

export const COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    description: '列出所有可用命令',
    run(_args, ctx) {
      ctx.print('可用命令：')
      for (const c of COMMANDS) ctx.print(\`  /\${c.name.padEnd(8)} \${c.description}\`)
    },
  },
  {
    name: 'clear',
    description: '清空当前会话历史，从头开始',
    run(_args, ctx) {
      ctx.agent.clearHistory()
      ctx.print('（已清空会话历史）')
    },
  },
  {
    name: 'model',
    description: '查看或切换模型，例如 /model claude-opus-4-8',
    run(args, ctx) {
      const next = args.trim()
      if (!next) {
        ctx.print(\`当前模型：\${ctx.agent.model}\`)
        return
      }
      ctx.agent.setProvider(new ClaudeProvider({ model: next }))
      ctx.print(\`已切换模型：\${next}\`)
    },
  },
  {
    name: 'tools',
    description: '列出已注册的工具',
    run(_args, ctx) {
      ctx.print('已注册工具：')
      for (const t of ALL_TOOLS) {
        ctx.print(\`  \${t.name.padEnd(7)} \${t.readOnly ? '[只读]' : '[写] '} \${t.description.slice(0, 40)}…\`)
      }
    },
  },
  {
    name: 'exit',
    description: '退出 forge',
    run(_args, ctx) {
      ctx.quit()
    },
  },
]

export function isCommand(input: string): boolean {
  return input.startsWith('/')
}

export function runCommand(input: string, ctx: CommandContext): void {
  const [name, ...rest] = input.slice(1).split(/\\s+/)
  const cmd = COMMANDS.find((c) => c.name === name)
  if (!cmd) {
    ctx.print(\`未知命令 /\${name}，输入 /help 查看全部。\`)
    return
  }
  cmd.run(rest.join(' '), ctx)
}`

const replSrc = `if (isCommand(input)) {
  runCommand(input, {
    agent,
    print: (s) => console.log(s),
    quit: () => {
      quitting = true
      rl.close()
    },
  })
  if (quitting) break
  rl.prompt()
  continue
}`

const sessionSrc = `forge › /help
可用命令：
  /help     列出所有可用命令
  /clear    清空当前会话历史，从头开始
  /model    查看或切换模型，例如 /model claude-opus-4-8
  /tools    列出已注册的工具
  /exit     退出 forge

forge › /model
当前模型：claude-sonnet-4-6

forge › /model claude-opus-4-8
已切换模型：claude-opus-4-8

forge › /clear
（已清空会话历史）

forge › /tools
已注册工具：
  read    [只读] 读取指定文件的内容，可选行范围…
  list    [只读] 列出目录下的文件与子目录…
  bash    [写]  执行一条 shell 命令并返回 stdout/stderr…
  write   [写]  把内容写入文件，覆盖或新建…
  edit    [写]  在文件里做精确的字符串替换…

forge › /exit
再见。`

const parseSrc = `// runCommand 第一行：把 "/model claude-opus-4-8" 拆成 名字 + 参数串
const [name, ...rest] = input.slice(1).split(/\\s+/)
//        ^name='model'   ^rest=['claude-opus-4-8']
// 注意这套解析的「设计边界」：按空白切，名字是第一段，其余原样 join 回去。
// 它不识别引号、不解析 --flag、不做转义——因为命令的参数交给各自的 run 去理解，
// 派发层只负责「切出名字，把剩下的整块交给命令」。`

const completeSrc = `// 一个最小的命令补全器：按已输入的前缀，从 COMMANDS 里筛出候选。
// 接到 readline 的 completer 选项上，用户敲 Tab 就能补全命令名。
function completer(line: string): [string[], string] {
  if (!line.startsWith('/')) return [[], line] // 不是命令，不补全
  const prefix = line.slice(1)
  const hits = COMMANDS
    .map((c) => '/' + c.name)
    .filter((name) => name.startsWith('/' + prefix))
  // readline 约定：返回 [匹配列表, 被匹配的原串]
  return [hits.length ? hits : [], line]
}

// 用法：createInterface({ input, output, prompt, completer })`

export default function Ch3() {
  return (
    <article>
      <Lead>
        上一章我们把 REPL 的输入分成了两条路：普通文本交给 <code>agent.runTurn</code> 去找模型，
        以 <code>/</code> 开头的输入交给 <code>runCommand</code> 在本地处理。这一章，我们把那条「本地路」补全——
        实现 forge 的斜杠命令系统：<code>/help</code>、<code>/clear</code>、<code>/model</code>、<code>/tools</code>、<code>/exit</code>。
        这是第 2 卷的收尾，做完它，forge 就从「能跑的内核」长成了「顺手的 CLI」。
      </Lead>

      <h2>一、为什么要有斜杠命令</h2>
      <p>
        想象你正在和 agent 对话。突然你想看看现在用的是哪个模型，或者想把跑歪了的会话清空重来，
        又或者只是想退出。这些操作有一个共同点：它们不是「任务」，而是「控制 forge 本身」的动作。
      </p>
      <p>
        如果把「清空会话」也发给模型，模型会一脸茫然地把它当成一句话来回答——既浪费了一次 LLM 调用，
        又得不到你要的效果。这类操作应该在本地<strong>即时、确定地</strong>完成，连网络都不该碰。
      </p>

      <KeyIdea title="斜杠命令 = 不经过模型的本地控制面板">
        以 <code>/</code> 开头的输入，是给 forge 自己看的元命令，不是给模型的任务。
        它们在本地同步执行、立即返回，既不消耗 token，也不进入对话历史。
        你可以把它想成程序的「控制面板」：调参数、看状态、清场子、关电源，全在本地按钮上完成。
      </KeyIdea>

      <h3>命令与自然语言任务的本质区别</h3>
      <p>
        把这两类输入摆在一起对比，它们几乎在每个维度上都站在对立面——这也正是「为什么要把它们彻底分流」的根据：
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>斜杠命令（/clear 等）</th>
            <th>自然语言任务（交给模型）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>处理在哪</td>
            <td>本地，连网络都不碰</td>
            <td>发往模型，走网络往返</td>
          </tr>
          <tr>
            <td>结果是否确定</td>
            <td>确定、可预测、每次都一样</td>
            <td>概率性、每次措辞可能不同</td>
          </tr>
          <tr>
            <td>延迟</td>
            <td>零延迟，同步立即返回</td>
            <td>秒级，要等模型生成</td>
          </tr>
          <tr>
            <td>成本</td>
            <td>免费，不消耗 token</td>
            <td>消耗输入/输出 token</td>
          </tr>
          <tr>
            <td>是否进对话历史</td>
            <td>不进，纯控制操作</td>
            <td>进，累积成多轮上下文</td>
          </tr>
        </tbody>
      </table>
      <p>
        看清这张表，「分流」的必要性就不言而喻了：用确定、免费、零延迟的本地代码去干那些<strong>不需要智能</strong>的活，
        把昂贵、概率性的模型调用留给真正需要思考的任务。把 <code>/clear</code> 发给模型，就像为了关灯而打电话问客服怎么关——
        既慢又贵还未必关得对。
      </p>

      <h2>二、设计：注册表 + 统一派发</h2>
      <p>
        最容易想到的写法，是在 REPL 里堆一长串 <code>if (input === '/help') ... else if (input === '/clear') ...</code>。
        能用，但每加一个命令都要去改那坨分支，而且帮助文本、命令名、执行逻辑散落各处，很难保持同步。
      </p>
      <p>
        forge 采用更干净的做法：把每个命令抽象成一个对象，统一放进一个数组 <code>COMMANDS</code>。
        每个命令自带三样东西——名字、描述、执行函数。派发时只做一件事：按名字到数组里查表，找到就执行。
      </p>

      <Callout variant="tip" title="为什么注册表比 if-else 好">
        <p>「加一个命令 = 往数组里加一项」，这是注册表设计最大的好处：</p>
        <ul>
          <li><strong>扩展是加法</strong>：新命令是 push 一个对象，不需要去碰派发逻辑，改动是局部的、零散的。</li>
          <li><strong>数据即文档</strong>：<code>/help</code> 直接遍历 <code>COMMANDS</code> 自我列举，描述永远和实现长在一起，不会漏更新。</li>
          <li><strong>派发只有一处</strong>：查表逻辑写一次，所有命令共用；未知命令的友好提示也只需要处理一次。</li>
        </ul>
      </Callout>

      <p>
        这背后其实是个有名字的设计取向：<strong>用数据驱动取代控制流分支</strong>。一长串 <code>if-else</code>
        把「有哪些命令」编码进了<strong>控制流</strong>里——命令的存在性、它的行为、它的文档全揉在分支结构中，
        加一个就得动一次那段逻辑（这违反「开闭原则」：对扩展开放、对修改关闭）。而注册表把「有哪些命令」变成了一份
        <strong>数据</strong>——<code>COMMANDS</code> 这个数组。派发逻辑写死一次后就再也不动，要变的只是数据。
        软件工程里有句老话：「能用数据表达的，就别用代码表达。」斜杠命令注册表正是这句话的一个干净样本。
      </p>

      <h2>三、完整的命令模块</h2>
      <p>下面是 forge 真实的 <code>src/commands.ts</code>，一字未改。先通读一遍，再逐段拆解。</p>

      <CodeBlock lang="ts" title="src/commands.ts" code={commandsSrc} />

      <h3>CommandContext：把「能力」注入给命令</h3>
      <p>
        注意 <code>run</code> 拿到的第二个参数 <code>ctx</code>。命令本身并不知道「打印」要打到哪里、「退出」该怎么退，
        它只声明自己需要这两种能力，由外面注入进来：
      </p>
      <ul>
        <li><code>print(s)</code>：打印一行。命令不关心它最终是 <code>console.log</code>、写日志文件，还是塞进测试的缓冲区。</li>
        <li><code>quit()</code>：请求退出。命令不关心退出是设标志位、调 <code>rl.close()</code>，还是 <code>process.exit</code>。</li>
        <li><code>agent</code>：命令操作的对象本体，用来读模型、清历史、换 provider。</li>
      </ul>
      <p>
        为什么不让命令直接 <code>console.log</code> / <code>process.exit</code>？因为那样命令就和「具体的终端」「具体的进程」焊死了。
        注入之后，命令变成纯粹的逻辑：<strong>解耦</strong>（命令不依赖运行环境）、<strong>可测试</strong>
        （测试时传一个收集字符串的 <code>print</code>、一个置标志的 <code>quit</code>，就能断言命令的行为，完全不碰真实终端）。
      </p>
      <p>
        往深一层说，<code>CommandContext</code> 是一份精心收窄的<strong>能力清单</strong>：它只暴露命令<strong>该有</strong>的那几样能力，
        多一样都不给。命令拿不到 <code>process</code>、拿不到 <code>rl</code>、拿不到文件系统句柄——它能做的事，被这个 <code>ctx</code>
        的形状严格框死了。这有两重好处：一是<strong>安全边界清晰</strong>，命令不可能越界去干它不该干的事（比如某个命令偷偷
        <code>process.exit</code> 把进程硬杀）；二是<strong>替换运行环境零成本</strong>，哪天把 REPL 换成 Web 后端，
        只要在那边重新实现一份 <code>print</code>（推到 WebSocket）和 <code>quit</code>（关会话），同一套命令一行不改就能跑。
        这正是<strong>依赖注入</strong>在这个小系统里的具体收益。
      </p>

      <h3>SlashCommand 三件套</h3>
      <p>每个命令就是一个对象，三个字段各司其职：</p>
      <ul>
        <li><code>name</code>：命令名，用户输入 <code>/name</code> 时按它匹配。</li>
        <li><code>description</code>：一句话说明，<code>/help</code> 列表里展示的就是它。</li>
        <li><code>run(args, ctx)</code>：执行函数。<code>args</code> 是命令名后面的参数串，<code>ctx</code> 是上面那套注入的能力。</li>
      </ul>

      <h3>逐个命令</h3>
      <ul>
        <li>
          <strong><code>/help</code></strong>：遍历 <code>COMMANDS</code> 自我列举。它不维护任何写死的清单，
          列表永远等于实际注册的命令——这正是注册表「数据即文档」的体现。<code>padEnd(8)</code> 把命令名对齐成一列，输出更整齐。
        </li>
        <li>
          <strong><code>/clear</code></strong>：调 <code>ctx.agent.clearHistory()</code> 把对话历史清空，
          下一句话就是全新的开始。适合上一轮跑偏、或者想换个话题省点上下文的时候。
        </li>
        <li>
          <strong><code>/model</code></strong>：无参时打印 <code>ctx.agent.model</code> 看当前模型；
          有参时用 <code>{'setProvider(new ClaudeProvider({ model: next }))'}</code> 换一个新的 provider。
          这里正好呼应第 1 卷的 Provider 解耦——换模型只是替换一个 provider 实例，主循环一行都不用动。
        </li>
        <li>
          <strong><code>/tools</code></strong>：遍历 <code>ALL_TOOLS</code> 列出工具表，标出每个工具是 <code>[只读]</code> 还是 <code>[写]</code>，
          再截一段描述。让你随时知道这个 agent 手里到底握着哪些家伙。
        </li>
        <li>
          <strong><code>/exit</code></strong>：调 <code>ctx.quit()</code>。命令只表达「我要退出」这个意图，
          至于怎么退，是 REPL 注入的 <code>quit</code> 说了算。
        </li>
      </ul>

      <Callout variant="note" title="有状态命令 vs 无状态命令">
        <p>
          细看这五个命令，它们其实分两类。<code>/help</code> 和 <code>/tools</code> 是<strong>纯查询</strong>——
          只读不写，遍历点数据打出来，跑一百遍系统状态都不变。而 <code>/clear</code>、<code>/model</code>、<code>/exit</code>
          是<strong>有副作用</strong>的——它们改 Agent 的历史、换 provider、要求退出。区分这两类很有用：
          纯查询命令天生安全，随便点；有副作用的命令则要想清楚「改了之后会怎样」。注意一个共性——
          所有副作用都<strong>通过 <code>ctx</code> 这个收窄的口子发生</strong>（改历史调 <code>ctx.agent.clearHistory()</code>、
          退出调 <code>ctx.quit()</code>），命令自己不直接碰外部世界。这让「这个命令会动什么」一目了然，审计起来也方便。
        </p>
      </Callout>

      <h3>分流与派发</h3>
      <p>
        模块底部两个函数完成「认出命令」和「执行命令」：
      </p>
      <ul>
        <li>
          <code>isCommand(input)</code>：用 <code>startsWith('/')</code> 判断这行输入是不是斜杠命令。REPL 靠它分流。
        </li>
        <li>
          <code>runCommand(input, ctx)</code>：先 <code>slice(1)</code> 去掉开头的 <code>/</code>，再按空白切成
          <code>{'[名字, ...参数]'}</code>；拿名字去 <code>COMMANDS</code> 里 <code>find</code>。
          命中就把剩下的参数 <code>join(' ')</code> 拼回字符串交给 <code>run</code>；没命中就给一句友好提示，引导用户去看 <code>/help</code>，
          而不是静默失败。
        </li>
      </ul>

      <h3>命令解析：这套切法的边界在哪</h3>
      <p>
        <code>runCommand</code> 的第一行就是整个解析的核心，简单到只有一句，但它划定的「能解析什么、不能解析什么」值得说清：
      </p>

      <CodeBlock lang="ts" title="命令解析（runCommand 首行）" code={parseSrc} />

      <p>
        这套解析<strong>故意做得很薄</strong>：按空白 <code>split</code>，第一段当命令名，剩下的 <code>join</code> 回原样交给命令。
        它<strong>不识别引号</strong>（<code>/cmd "a b"</code> 会被切成 <code>a</code> 和 <code>b</code> 两段），
        <strong>不解析 <code>--flag</code> 选项</strong>，<strong>不做转义</strong>。这不是偷懒，是有意的设计取舍——
        派发层只负责「认出是哪个命令、把后面整块原样递过去」，<strong>怎么理解参数是每个命令自己的事</strong>。
        像 <code>/model</code> 直接 <code>args.trim()</code> 当模型名用，根本不需要花哨的参数解析。
      </p>
      <p>
        这个边界的好处是：派发层永远不变，复杂度被推到真正需要它的少数命令里。哪天某个命令确实要处理带空格的参数或选项，
        它在自己的 <code>run</code> 里引入一个小解析器就行，不会污染所有其他命令。<strong>把简单留在公共层、把复杂关进局部</strong>，
        是这类可扩展系统反复出现的智慧。还有一个常被忽略的边界：<code>find</code> 用的是<strong>精确匹配</strong>命令名，
        所以 <code>/MODEL</code>、<code>/mod</code> 都不会命中——大小写敏感、不做前缀模糊。这是有意为之，
        确定性比「猜用户想要哪个」更重要，猜错的代价（比如把 <code>/clear</code> 猜成别的）可能很难受。
      </p>

      <Callout variant="note" title="未知命令为什么不能静默失败">
        <p>
          <code>runCommand</code> 在 <code>find</code> 不到时，没有默默什么都不做，而是打一句
          <code>未知命令 /xxx，输入 /help 查看全部</code>。这是交互式工具的基本素养：<strong>用户每一次输入都该得到反馈</strong>。
          静默失败是最坏的体验——用户敲了 <code>/quit</code>（其实命令叫 <code>/exit</code>），程序毫无反应，
          他会以为是不是卡了、是不是没生效，反复试、越试越慌。一句友好的「没这个命令，去看 /help」既纠正了错误、
          又指明了出路，把一次挫败变成一次引导。注意它还<strong>没有把这行误输入发给模型</strong>——
          因为 <code>isCommand</code> 已经认定它是命令（以 <code>/</code> 开头），分流早已发生，这里只是命令内部没找到匹配项。
        </p>
      </Callout>

      <h2>四、它怎么接进 REPL</h2>
      <p>
        回到上一章的 <code>repl.ts</code>。读到一行输入后，先用 <code>isCommand</code> 分流；
        是命令，就地构造 <code>CommandContext</code> 调 <code>runCommand</code>，处理完直接进入下一轮，根本不碰 <code>agent.runTurn</code>。
        下面这段就是那个分支，逐字摘录：
      </p>

      <CodeBlock lang="ts" title="src/repl.ts（节选）" code={replSrc} />

      <p>
        看注入的两样能力怎么落地：<code>print</code> 就是 <code>console.log</code>，把字符串打到终端；
        <code>quit</code> 把外层的 <code>quitting</code> 标志置真、并 <code>rl.close()</code> 关掉 readline。
        随后 <code>if (quitting) break</code> 跳出主循环，否则 <code>rl.prompt()</code> 重新出提示符、
        <code>continue</code> 进入下一轮。命令系统对主循环的侵入，就只有这么一小块。
      </p>

      <h2>五、命令与 LLM 路由的边界：谁先看到输入</h2>
      <p>
        这一章和上一章合起来，其实定义了 forge 最关键的一条<strong>路由规则</strong>：每一行输入，先问 <code>isCommand</code>，
        是命令走本地、不是命令才交给模型。这个顺序不能反，而且这条边界划在哪里，是个值得深想的设计问题。
      </p>
      <p>
        forge 选的是<strong>语法路由</strong>——靠一个显式的 <code>/</code> 前缀来区分意图，规则是机械的、零歧义的、零成本的。
        另一条路是<strong>语义路由</strong>：不要前缀，让模型自己判断「用户这句话是想执行控制操作，还是想交代任务」。
        两者各有适用场景，但对一个命令行工具来说，语法路由几乎总是更好的选择：
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>语法路由（/ 前缀）</th>
            <th>语义路由（让模型判断）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>判断成本</td>
            <td>一次 <code>startsWith('/')</code>，免费即时</td>
            <td>得先调一次模型来分类，慢且费 token</td>
          </tr>
          <tr>
            <td>确定性</td>
            <td>100% 确定，规则写死</td>
            <td>概率性，可能把任务误判成命令、反之亦然</td>
          </tr>
          <tr>
            <td>用户心智</td>
            <td>清晰：打 / 就是控制，否则是任务</td>
            <td>模糊：「清空一下」到底算不算命令？</td>
          </tr>
          <tr>
            <td>可发现性</td>
            <td>/help 一列就全清楚</td>
            <td>用户得猜哪些话会被当成控制操作</td>
          </tr>
        </tbody>
      </table>
      <KeyIdea title="确定性的事交给代码，含糊的事才交给模型">
        <p>
          这是贯穿整个 Agent 工程的一条准绳。「清空历史」「换模型」「退出」这些意图<strong>本身就清晰确定</strong>，
          根本不需要语言理解——用一个 <code>/</code> 前缀让用户显式声明，比花一次模型调用去「猜」要又快又准又便宜。
          模型的智能很宝贵，应该花在<strong>真正含糊、真正需要理解和推理</strong>的地方（「帮我把这个函数重构得更易读」），
          而不是浪费在「这句话是不是想退出」这种本可以零成本判定的事上。把确定的留给代码、把含糊的留给模型——
          这条边界划得对，整个系统才会既快又省又可靠。
        </p>
      </KeyIdea>

      <h2>六、跑起来看看</h2>
      <Example title="一次控制台交互">
        <CodeBlock lang="text" title="终端会话" code={sessionSrc} />
      </Example>
      <p>
        整段交互里，没有一次走到模型：<code>/help</code> 现列命令、<code>/model</code> 即时显示和切换、
        <code>/clear</code> 一句话清空、<code>/tools</code> 摊开工具表、<code>/exit</code> 干净退出。
        全是本地的、确定的、零延迟的——这正是斜杠命令该有的手感。
      </p>

      <h2>七、可发现性：补全与帮助</h2>
      <p>
        一套命令系统好不好用，一半看功能，另一半看<strong>用户能不能发现和记住它们</strong>。forge 已经有了 <code>/help</code>——
        这是可发现性的底线，一行就把所有命令连同描述列出来。但还有一个体验上的大提升点：<strong>Tab 补全</strong>。
        用户敲半个 <code>/mo</code> 按下 Tab，自动补成 <code>/model</code>，既省键又顺手地告诉用户「有这么个命令」。
      </p>
      <p>
        好消息是，因为命令是<strong>注册表里的数据</strong>，补全器几乎不用额外信息——直接拿 <code>COMMANDS</code>
        按前缀筛一遍就行。<code>node:readline</code> 的 <code>createInterface</code> 正好接受一个 <code>completer</code> 选项：
      </p>

      <CodeBlock lang="ts" title="给 readline 加上命令补全（示意）" code={completeSrc} />

      <p>
        <code>completer</code> 的约定很简单：拿到当前这行 <code>line</code>，返回一个二元组
        <code>{'[匹配列表, 被匹配的原串]'}</code>，readline 会据此决定按 Tab 时怎么补。我们的实现只在 <code>/</code>
        开头时才工作：取出前缀，从 <code>COMMANDS</code> 里挑出所有 <code>name</code> 以该前缀打头的，作为候选返回。
        这里再次兑现了注册表「数据即文档」的红利——<strong>新加的命令自动就能被补全</strong>，因为补全器读的就是那同一份
        <code>COMMANDS</code>，你不用在任何别处再登记一次。<code>/help</code> 自我列举、补全自动覆盖、描述长在命令上，
        三件事共享同一份真相，永远不会各说各话。
      </p>

      <h2>八、它天生就为扩展而生</h2>
      <Callout variant="note" title="后续卷会往里加更多命令">
        <p>
          这套系统的形状决定了它好扩展。后面几卷我们还会陆续往 <code>COMMANDS</code> 里加：
        </p>
        <ul>
          <li><code>/resume</code>：恢复之前保存的会话，接着之前的上下文继续聊。</li>
          <li><code>/cost</code>：查看本次会话累计消耗的 token 与花费。</li>
          <li><code>/plan</code>：切换到计划模式，让 agent 先规划再动手。</li>
        </ul>
        <p>
          每一个都只是往数组里 push 一个对象，派发逻辑、REPL 主循环全都不用动——因为它本来就是为「加一行就扩展」设计的。
        </p>
      </Callout>

      <p>
        值得点一句：这套注册表的边界也有它「不该越」的地方。斜杠命令适合做<strong>确定的、本地的、轻量的控制操作</strong>；
        一旦某个「命令」开始需要语言理解、需要多步推理、需要调工具——那它就不该是斜杠命令，而该回到自然语言、交给模型。
        比如不要妄图做一个 <code>/refactor &lt;描述&gt;</code> 去硬解析用户的重构意图，那是模型的活。把命令系统克制在它擅长的范围内，
        它才一直是那个「又快又确定的控制面板」，而不会膨胀成一个蹩脚的、半吊子的自然语言解析器。

      </p>

      <h2>第 2 卷小结</h2>
      <p>
        三章走下来，forge 完成了一次从「内核」到「产品」的蜕变：第 1 章把一次性脚本变成可交互的 REPL 循环；
        第 2 章接上流式输出，让回答逐字蹦出来；这一章补齐了本地控制命令，让你能在不打断对话的前提下操控 forge 自己。
      </p>

      <KeyIdea title="从「能跑的内核」到「好用的 CLI」">
        第 1 卷给了 forge 一颗能跑的心脏；第 2 卷给它穿上了交互的外衣——可对话、能流式、有控制面板。
        到此它已经是个用起来顺手的命令行 agent 了。但「顺手」还不等于「敢用」：下一卷，我们给它加上安全与人在回路——
        工具权限、危险操作的人工确认、操作审计，让你敢把真实的文件系统和 shell 交到它手里。
      </KeyIdea>

      <Summary
        points={[
          '斜杠命令是「控制 forge 本身」的本地元命令：以 / 开头，不发给模型、不进对话历史、不消耗 token。它和自然语言任务在处理位置/确定性/延迟/成本/是否进历史上几乎全维度对立。',
          '设计成「注册表 + 统一派发」：COMMANDS 数组里每项有 name/description/run，加命令就是 push 一项，派发只查表一处。本质是「用数据驱动取代控制流分支」，遵循开闭原则——派发逻辑写死后不再改，要变的只是数据。',
          'CommandContext 把 print/quit/agent 作为收窄的能力清单注入给命令，命令拿不到 process/rl/fs，越界不了——既划清安全边界，又让换运行环境（如换成 Web 后端）时命令零改动。解耦且可测试。',
          'isCommand 用 startsWith(\'/\') 分流，runCommand 解析「/名字 参数...」：按空白切、名字第一段、其余原样 join。解析故意做得薄（不识别引号/flag/转义、精确大小写匹配命令名），复杂度推给真正需要的命令自己处理。未命中给友好提示，绝不静默失败。',
          '五个命令分纯查询（/help、/tools，只读安全）与有副作用（/clear、/model、/exit）两类，所有副作用都经 ctx 这个口子发生；/model 换 provider 呼应 Provider 解耦。',
          '命令与 LLM 的路由边界：forge 用语法路由（/ 前缀，免费/确定/清晰）而非语义路由（让模型猜，慢/概率性/含糊）。准绳是「确定的事交给代码、含糊的事才交给模型」——把宝贵的模型智能留给真正需要理解推理的任务。',
          '可发现性靠 /help 自我列举 + Tab 补全（readline 的 completer 直接按前缀筛 COMMANDS）：注册表「数据即文档」让新命令自动被列出、被补全，三处共享同一份真相不会脱节。',
          '这套系统为扩展而生，后续卷会加 /resume、/cost、/plan；但要克制——需要语言理解/多步推理的意图不该做成命令，那是模型的活。第 2 卷至此把 forge 从内核打磨成了好用的 CLI。',
        ]}
      />
    </article>
  )
}

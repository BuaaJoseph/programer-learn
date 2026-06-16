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

      <h2>五、跑起来看看</h2>
      <Example title="一次控制台交互">
        <CodeBlock lang="text" title="终端会话" code={sessionSrc} />
      </Example>
      <p>
        整段交互里，没有一次走到模型：<code>/help</code> 现列命令、<code>/model</code> 即时显示和切换、
        <code>/clear</code> 一句话清空、<code>/tools</code> 摊开工具表、<code>/exit</code> 干净退出。
        全是本地的、确定的、零延迟的——这正是斜杠命令该有的手感。
      </p>

      <h2>六、它天生就为扩展而生</h2>
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
          '斜杠命令是「控制 forge 本身」的本地元命令：以 / 开头，不发给模型、不进对话历史、不消耗 token。',
          '设计成「注册表 + 统一派发」：COMMANDS 数组里每项有 name/description/run，加命令就是 push 一项，派发只查表一处。',
          'CommandContext 把 print/quit/agent 作为能力注入给命令，命令不依赖具体终端或进程——解耦且可测试。',
          'isCommand 用 startsWith(\'/\') 分流，runCommand 解析「/名字 参数...」、查表执行、未命中给友好提示。',
          '五个命令各司其职：/help 自我列举、/clear 清历史、/model 看/切模型（呼应 Provider 解耦）、/tools 列工具、/exit 退出。',
          '这套系统为扩展而生，后续卷会加 /resume、/cost、/plan；第 2 卷至此把 forge 从内核打磨成了好用的 CLI。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const replSrc = `import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import type { Agent } from './agent.js'
import { isCommand, runCommand } from './commands.js'

const DIM = '\\x1b[2m'
const RED = '\\x1b[31m'
const RESET = '\\x1b[0m'

// REPL：一个「问→答→再问」的交互外壳。负责读输入、分流（斜杠命令 vs 交给 Agent）、优雅退出。
// 回答的流式渲染由 agent 的 onEvent 完成（见 index.ts 的事件渲染器）。
export async function startRepl(agent: Agent): Promise<void> {
  console.log(\`forge · 模型 \${agent.model}（输入 /help 看命令，/exit 退出）\\n\`)
  const rl = createInterface({ input: stdin, output: stdout, prompt: 'forge> ' })

  let quitting = false
  // Ctrl-C：不直接杀进程，提示一下再优雅关闭，避免任务跑一半被硬切。
  rl.on('SIGINT', () => {
    console.log(\`\\n\${DIM}（再次 Ctrl-C 或输入 /exit 退出）\${RESET}\`)
    rl.prompt()
  })

  rl.prompt()
  for await (const line of rl) {
    const input = line.trim()
    if (!input) {
      rl.prompt()
      continue
    }

    if (isCommand(input)) {
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
    }

    try {
      await agent.runTurn(input)
      process.stdout.write('\\n\\n')
    } catch (err) {
      console.error(\`\${RED}出错：\${(err as Error).message}\${RESET}\`)
    }
    rl.prompt()
  }
  rl.close()
  console.log('再见。')
}`

const indexSrc = `const provider = new ClaudeProvider()
const agent = new Agent({
  provider,
  tools: ALL_TOOLS,
  system: SYSTEM_PROMPT,
  cwd: process.cwd(),
  onEvent: (e) => {
    // 事件渲染器：把 Agent 的内部事件画到终端（流式文本、工具调用等）。下一章详解。
  },
})

await startRepl(agent)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        <p>
          卷 1 我们造出了一个能读会写、自己循环、还能并发调度的 Agent 内核：一个 <code>Agent</code> 类，
          <code>runTurn</code> 跑完一整轮「思考→调用工具→再思考」，<code>onEvent</code> 把内部发生的事回调给上层。
          但它现在只是一个类，没人能「用」它。卷 2 要把这个内核包装成一个像样的命令行工具 forge。
          本章先做最外层的那个壳——REPL，也就是你敲下 <code>forge</code> 之后看到的那个能一句一句对话的交互界面。
        </p>
      </Lead>

      <h2>什么是 REPL</h2>
      <p>
        REPL 是 Read-Eval-Print-Loop 的缩写：<strong>读</strong>一行输入 → <strong>求值</strong>（处理它）→
        <strong>打印</strong>结果 → 回到开头再<strong>读</strong>下一行。Python 解释器、Node 的交互终端，都是 REPL。
        对我们的 Agent 来说，这个循环就是「问 → 答 → 再问」的多轮对话外壳：你打一句话，Agent 干活并回答，
        然后光标又回到提示符，等你打下一句。
      </p>

      <KeyIdea title="REPL 本身不含智能">
        <p>
          REPL 一点「聪明」都没有，它不思考、不调用模型、不执行工具。它唯一的职责是<strong>把人和 Agent 内核接起来</strong>：
          读一行输入、判断这行是斜杠命令还是要交给 Agent 的任务、调用 <code>agent.runTurn</code>、并且能优雅退出。
          所有智能都在卷 1 的内核里。把「交互」和「智能」彻底分开，是这一章最重要的设计取向。
        </p>
      </KeyIdea>

      <h2>Node 自带的 readline</h2>
      <p>
        做交互终端不需要任何第三方库，Node 内置的 <code>node:readline</code> 模块就够了。核心就三步：
      </p>
      <ul>
        <li>
          用 <code>createInterface({'{ input: stdin, output: stdout, prompt: \'forge> \' }'}</code> 建一个交互界面，
          告诉它从标准输入读、往标准输出写、提示符长什么样。
        </li>
        <li>
          调 <code>rl.prompt()</code> 把提示符 <code>forge&gt;</code> 打到屏幕上，光标停在那儿等你输入。
        </li>
        <li>
          用 <code>for await (const line of rl)</code> 逐行读取——每当你按下回车，循环体就拿到一行新输入。
        </li>
      </ul>
      <p>
        <code>readline</code> 还顺手帮我们处理了行编辑（左右移动光标、退格）和历史（上下箭头翻之前输入过的行），
        这些都是终端用户的肌肉记忆，自己实现会很烦，白嫖即可。
      </p>

      <h2>forge 真实的 REPL 模块</h2>
      <p>
        下面是 forge 里 <code>src/repl.ts</code> 的完整内容，麻雀虽小五脏俱全。先整体看一遍，再逐段拆。
      </p>

      <CodeBlock lang="ts" title="src/repl.ts" code={replSrc} />

      <h3>顶部的 ANSI 颜色码</h3>
      <p>
        <code>DIM</code>、<code>RED</code>、<code>RESET</code> 这几个常量是 ANSI 转义序列。
        终端约定：遇到 <code>{'\\x1b['}</code>（即 ESC 加左方括号）开头的一小段控制码，就不把它当普通字符显示，
        而是当成「指令」。<code>{'\\x1b[31m'}</code> 表示「接下来的字打成红色」，<code>{'\\x1b[2m'}</code> 表示「暗色」，
        <code>{'\\x1b[0m'}</code> 是 RESET，表示「样式归零，恢复默认」。所以上色的写法永远是
        <strong>颜色码 + 文本 + RESET</strong>，否则颜色会一直「漏」到后面的输出上。我们只用了暗色和红色：
        暗色拿来印不打扰人的提示，红色拿来印错误。
      </p>

      <h3>startRepl 接收一个 agent</h3>
      <p>
        函数签名是 <code>startRepl(agent: Agent)</code>。REPL 不自己 new 一个 Agent，而是由外面（<code>index.ts</code>）
        装配好再传进来。这样 REPL 完全不关心 Agent 用的是哪个模型、挂了哪些工具，它只认 <code>agent.runTurn</code>
        和 <code>agent.model</code> 这两个口子。开头那行 <code>console.log</code> 打一句欢迎语，把当前模型名亮出来，
        并提示用户可以 <code>/help</code> 和 <code>/exit</code>。
      </p>

      <h3>为什么用 for await...of 而不是回调</h3>
      <p>
        老式的 readline 写法是 <code>rl.on('line', cb)</code>，每来一行就触发一次回调。问题在于：处理一行要 <code>await
        agent.runTurn(input)</code>，这是个耗时的异步过程。如果用回调，多行输入可能并发地踩进来，
        逻辑会很难控制。而 <code>for await (const line of rl)</code> 把异步迭代写成了顺序的样子——
        循环体里的 <code>await</code> 没结束，就不会进下一次迭代取下一行。一问一答天然串行，读起来也像同步代码，
        这正是 REPL 想要的节奏。
      </p>

      <h3>空行跳过</h3>
      <p>
        <code>const input = line.trim()</code> 先去掉首尾空白。如果用户只敲了个回车，<code>input</code> 是空串，
        我们直接 <code>rl.prompt()</code> 重新打提示符、<code>continue</code> 进下一轮，
        不去打扰 Agent。一个小细节，但能避免「空输入也触发一次模型调用」这种浪费。
      </p>

      <h3>isCommand 分流</h3>
      <p>
        拿到非空输入后，第一件事是判断它是不是斜杠命令：<code>isCommand(input)</code> 检查它是不是以 <code>/</code> 开头。
        是的话，交给 <code>runCommand</code> 在<strong>本地</strong>处理（比如 <code>/help</code> 打印帮助、<code>/exit</code> 退出），
        根本不碰模型。我们传给它一个小小的「能力包」：<code>agent</code> 本身、一个 <code>print</code> 函数让命令往屏幕打字、
        一个 <code>quit</code> 函数让命令能要求退出。<code>quit</code> 会把 <code>quitting</code> 置真并关掉 readline，
        随后 <code>if (quitting) break</code> 跳出主循环。
      </p>
      <Callout variant="note" title="斜杠命令下一章细讲">
        <p>
          <code>isCommand</code> 和 <code>runCommand</code> 来自 <code>./commands.js</code>，本章只把它们当黑盒分流用。
          斜杠命令系统的完整实现（怎么注册命令、怎么解析参数、怎么扩展）放到第三章专门讲。这里你只需要知道：
          凡是 <code>/</code> 开头的输入，REPL 都不交给 Agent，而是就地处理掉。
        </p>
      </Callout>

      <h3>普通输入交给 agent.runTurn</h3>
      <p>
        不是命令，那就是一个真正的任务。<code>await agent.runTurn(input)</code> 跑完一整轮对话——
        这一行背后是卷 1 那套循环：模型思考、可能调几个工具、再思考、最后给出回答。
        跑完后我们 <code>process.stdout.write('\\n\\n')</code> 补两个换行，把这一轮和下一个提示符隔开，视觉上清爽。
        整段包在 <code>try/catch</code> 里：哪怕这一轮出错（网络抖动、工具抛异常），我们也只用红色印一条错误，
        <strong>绝不让整个 REPL 崩掉</strong>。错误打完，循环继续，用户还能接着用。这对交互式程序极其重要——
        一次失败不该让你丢掉整个会话。
      </p>
      <p>
        你可能会问：Agent 的回答到底是怎么显示到屏幕上的？注意 <code>runTurn</code> 并没有 <code>return</code> 一段文本让我们打印。
        答案是回答靠 Agent 的 <code>onEvent</code> 回调<strong>流式</strong>地画出来——模型吐字的同时就在终端上一点点出现。
        这个事件渲染器装在 <code>index.ts</code> 里，渲染的细节是下一章的主角。
      </p>

      <h3>SIGINT：为什么不直接硬杀</h3>
      <p>
        默认情况下按 Ctrl-C，Node 会直接结束进程。但想象一下：Agent 正跑到一半，刚改了半个文件、工具调用还没收尾，
        你手一抖按了 Ctrl-C，进程被硬切，可能留下烂摊子。所以我们监听 <code>rl.on('SIGINT')</code>，
        第一次 Ctrl-C 不退出，只用暗色印一句「再次 Ctrl-C 或输入 /exit 退出」，然后重新打提示符。
        想真退出，要么再来一下、要么走 <code>/exit</code> 的正规通道。给用户一个「确认」的缓冲，是交互工具的基本礼貌。
      </p>

      <h2>入口：index.ts 怎么把它启动起来</h2>
      <p>
        <code>repl.ts</code> 只管「交互」，它不知道也不该知道怎么造一个 Agent。装配的活在入口 <code>index.ts</code> 里干：
        准备好 Provider、工具集、系统提示词，组装出 <code>agent</code>，再把它喂给 <code>startRepl</code>。
      </p>

      <CodeBlock lang="ts" title="src/index.ts（节选）" code={indexSrc} />

      <Callout variant="note" title="装配与交互，职责分离">
        <p>
          <code>index.ts</code> 负责<strong>装配</strong>：new 出 <code>ClaudeProvider</code>、传入 <code>ALL_TOOLS</code> 和
          <code>SYSTEM_PROMPT</code>、设好工作目录、挂上 <code>onEvent</code> 事件渲染器，最后 <code>await startRepl(agent)</code>。
          <code>repl.ts</code> 负责<strong>交互</strong>：读输入、分流、调 <code>runTurn</code>、优雅退出。
          这样换模型、加工具只动 <code>index.ts</code>，改交互体验只动 <code>repl.ts</code>，两边互不干扰。
          那个空着的 <code>onEvent</code> 回调就是下一章要填满的地方。
        </p>
      </Callout>

      <h2>多轮会话是免费的</h2>
      <p>
        REPL 是个循环，但 Agent 的对话历史并不会每轮清零。卷 1 里 <code>Agent</code> 内部维护了一个 <code>messages</code> 数组，
        它<strong>跨多次 <code>runTurn</code> 累积</strong>：第一轮的提问和回答留在历史里，第二轮调用时会一并带给模型。
        所以我们在 REPL 这层<strong>什么都不用做</strong>，多轮上下文就自动有了——你第二句完全可以说「再改一下刚才那个文件」，
        Agent 知道「刚才那个」指的是哪个。
      </p>

      <Example title="一次多轮交互">
        <p><code>forge&gt;</code> 帮我看看 src/repl.ts 里有没有处理 Ctrl-C</p>
        <p>有的。它监听了 SIGINT，第一次按 Ctrl-C 不会退出，只打印一句提示……</p>
        <p><code>forge&gt;</code> 那把那句提示改成英文</p>
        <p>好，我把 src/repl.ts 里那句中文提示改成了 "(Press Ctrl-C again or type /exit to quit)"……</p>
        <p><code>forge&gt;</code> 顺便给它也加上颜色</p>
        <p>已经用暗色包了起来，和你原来的风格一致……</p>
        <p>
          注意第二、第三句都没说清「哪个文件」「哪句提示」，但 Agent 全程知道在聊 <code>src/repl.ts</code> ——
          这就是历史累积带来的多轮上下文，REPL 一行额外代码都没写。
        </p>
      </Example>

      <Callout variant="tip" title="一定要给用户留好出口">
        <p>
          交互式程序最容易翻车的地方就是退出。Ctrl-C、EOF（Ctrl-D，会让 <code>for await</code> 自然结束）、
          <code>/exit</code> 这几条路都要走得通，否则用户会觉得「被卡住了、关不掉」。我们的 REPL 三条都覆盖了：
          <code>/exit</code> 走 <code>quit()</code>、Ctrl-D 让循环自然收尾、Ctrl-C 给两次确认。退出时还补一句「再见。」，
          让用户确信程序是正常结束的，而不是崩了。
        </p>
      </Callout>

      <Summary
        points={[
          'REPL 是「读—求值—打印—循环」，对 Agent 而言就是「问→答→再问」的交互外壳，它本身不含智能。',
          'REPL 的唯一职责：读输入、把斜杠命令和普通任务分流、调用 agent.runTurn、优雅退出。',
          'Node 内置的 node:readline 就够用：createInterface 建界面，rl.prompt() 打提示符，for await...of 串行逐行读。',
          'for await...of 让一问一答天然串行，比 on(\'line\') 回调更好控制异步流程。',
          'try/catch 兜住单轮错误、SIGINT 给退出确认、空行直接跳过——这些细节决定交互工具好不好用。',
          'index.ts 负责装配（Provider+工具+Agent+事件渲染器），repl.ts 负责交互，职责分离。',
          '多轮上下文是免费的：Agent 的 messages 历史跨 runTurn 累积，REPL 无需任何额外代码。',
          '下一章：填满那个空着的 onEvent，让 Agent 的回答一个字一个字地从终端里蹦出来。',
        ]}
      />
    </article>
  )
}

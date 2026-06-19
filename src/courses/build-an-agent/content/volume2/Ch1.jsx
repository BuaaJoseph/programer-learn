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

const loopShapeSrc = `// REPL 的本质，剥掉所有细节后，就是这么一个 while(true)：
while (true) {
  const line = await read()      // Read：阻塞等一行输入
  const result = evaluate(line)  // Eval：处理它（分流 / 交给 Agent）
  print(result)                  // Print：把结果显示出来
}                                // Loop：回到开头，再读下一行
// node:readline 的 for await...of 把这个 while(true) 包装得更漂亮，
// 并顺手处理了 EOF（输入流结束时循环自然终止）。`

const rawModeSrc = `// 演示：不用 readline，自己监听原始按键会是什么样
import { stdin } from 'node:process'

stdin.setRawMode(true)   // 进入 raw mode：每个按键立即到达，不等回车
stdin.resume()
stdin.setEncoding('utf8')

stdin.on('data', (key) => {
  // 现在每按一个键都会触发：方向键是 '\\x1b[C' 这种转义序列，
  // 退格是 '\\x7f'，Ctrl-C 是 '\\x03'……全得自己解析。
  // 行编辑、历史、光标移动——statementreadline 替你做的这一切，都要自己写。
  if (key === '\\x03') process.exit()  // Ctrl-C
  process.stdout.write(key)
})`

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
      <p>
        把它的骨架抽出来，REPL 其实简单到可以一眼看完——它就是一个永远不退出的循环，每一圈做四件事：
      </p>

      <CodeBlock lang="ts" title="REPL 的骨架（伪代码）" code={loopShapeSrc} />

      <p>
        这四个字母 R-E-P-L 各自对应一个明确的阶段，理解它们的分界很重要：<strong>Read</strong> 是「阻塞等一行」——
        在用户没敲回车之前，程序停在那里什么都不干，这是 REPL 和「批处理脚本」最大的区别；<strong>Eval</strong>
        是「拿这行去做点什么」，对我们而言就是分流和调用 Agent；<strong>Print</strong> 是把结果呈现出来；
        <strong>Loop</strong> 则保证一轮结束后程序不会退出，而是回头再等下一行。少了 Loop，它就退化成只能跑一次的脚本；
        少了 Read 的阻塞，它就变成 CPU 空转的死循环。四者缺一不可。
      </p>

      <KeyIdea title="REPL 本身不含智能">
        <p>
          REPL 一点「聪明」都没有，它不思考、不调用模型、不执行工具。它唯一的职责是<strong>把人和 Agent 内核接起来</strong>：
          读一行输入、判断这行是斜杠命令还是要交给 Agent 的任务、调用 <code>agent.runTurn</code>、并且能优雅退出。
          所有智能都在卷 1 的内核里。把「交互」和「智能」彻底分开，是这一章最重要的设计取向。
        </p>
      </KeyIdea>

      <h2>事件循环：阻塞等输入为什么不卡死整个程序</h2>
      <p>
        新手第一次看到 REPL 常有个困惑：<code>for await (const line of rl)</code> 在「等用户输入」时，
        程序不是应该卡在那一行、什么都干不了吗？如果 Agent 内部还有定时器、还有别的异步任务，它们岂不都被冻住了？
        答案藏在 Node 的<strong>事件循环</strong>里。
      </p>
      <p>
        Node 是单线程的，但它的单线程跑的是一个「事件循环」：它不会傻等任何 I/O。当代码 <code>await</code> 一行输入时，
        Node 做的不是「占着 CPU 死等」，而是<strong>把这个等待登记到 libuv，然后立刻腾出线程去处理别的事件</strong>——
        定时器到点了就跑定时器，别的 Promise resolve 了就接着跑它的后续。等到 stdin 上真的来了一行数据，
        操作系统通知 libuv，libuv 再把对应的回调塞回事件循环队列，你的 <code>for await</code> 这才被唤醒、拿到那行输入。
      </p>
      <Callout variant="note" title="「阻塞」是语义上的，不是占用 CPU 的">
        <p>
          所以 REPL 里那个「阻塞等输入」是<strong>异步阻塞</strong>：从你代码的视角看，执行确实停在 <code>await</code> 那一行、
          下一行要等输入来了才跑；但从进程的视角看，线程<strong>一刻也没闲着死等</strong>，它在期间照常处理其它事件。
          这正是 Node 能用单线程扛住大量并发连接的根基。如果换成真正的同步阻塞（比如某些语言里的 <code>readLine()</code>
          直接占住线程），那才是会冻住一切的「假死」。理解这点，你才会明白为什么 REPL 等输入时，
          Agent 后台的网络请求、流式回调依然能正常推进。
        </p>
      </Callout>

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

      <h3>readline 底层在替你做什么</h3>
      <p>
        <code>readline</code> 看着轻巧，背后却挡掉了一大堆脏活。终端默认工作在「行缓冲模式」（cooked / canonical mode）：
        操作系统会把你敲的字符先攒在内核缓冲区里，直到你按回车才整行交给程序，期间退格、Ctrl-W 删词这些都由终端驱动处理。
        但「上下箭头翻历史」「左右箭头在行内移动光标」「Ctrl-A 跳到行首」这类功能，行缓冲模式给不了——
        它们需要程序<strong>逐键</strong>地接管输入。<code>readline</code> 内部正是为此切到了能拿到每个按键的模式，
        自己实现了一套行编辑器：维护当前这行的字符串、光标位置、历史栈，把方向键、退格、各种快捷键的转义序列一一翻译成编辑动作，
        最后在你按回车时才吐出完整的一行给 <code>for await</code>。
      </p>
      <p>
        想直观感受它替你扛了多少，看看「不用 readline、自己监听原始按键」会是什么光景：
      </p>

      <CodeBlock lang="ts" title="如果不用 readline（仅作对比，forge 里不这么写）" code={rawModeSrc} />

      <p>
        在 raw mode 下，每个按键都<strong>立刻、单独</strong>到达，而且都是裸的字节：方向键是 <code>{'\\x1b[C'}</code>
        这样的转义序列，退格是 <code>{'\\x7f'}</code>，Ctrl-C 是 <code>{'\\x03'}</code>。你要自己拼接当前行、自己处理退格删字、
        自己解析方向键移动光标、自己维护历史……写完才发现，你不过是在重新发明 <code>readline</code>。所以这里的工程经验是：
        <strong>能用标准库的交互能力就别自己造</strong>，把精力留给真正有价值的部分（也就是 Agent）。
      </p>

      <h2>TTY 与非 TTY：交互式工具必须考虑的运行环境</h2>
      <p>
        还有一个容易被忽略的边界：forge 不一定总是跑在真人面前的终端里。<strong>TTY</strong>（teletypewriter 的缩写）
        指的是连接着真实终端的输入输出——有光标、能上色、能逐键交互。但同一个程序也可能被这样调用：
        <code>echo "帮我读 a.ts" | forge</code>，或者 <code>forge &lt; tasks.txt</code>，这时 stdin 不是终端，而是一个管道或文件，
        即<strong>非 TTY</strong>。
      </p>
      <p>
        这两种场景的行为期望完全不同。在 TTY 下，用户希望看到提示符、看到逐字流式、看到漂亮的颜色；
        在非 TTY 下（比如脚本里、CI 里），提示符和颜色码反而是噪音，会污染管道的输出，下游程序拿到一堆 <code>{'\\x1b['}</code>
        转义码会很懵。判断当前是不是 TTY 很简单——<code>process.stdout.isTTY</code> 为真就是。
        成熟的 CLI 通常会据此分支：非 TTY 时关掉颜色、不打提示符、甚至读完一整批输入就直接退出，而不是停下来等下一行。
      </p>
      <Callout variant="tip" title="工程经验：把 isTTY 当成功能开关">
        <p>
          forge 这一章为了聚焦主线，默认按 TTY 写。但当你把它做成真要分发的工具时，<code>isTTY</code> 几乎是所有「呈现层」
          决策的总开关：要不要上色（<code>stdout.isTTY</code>）、要不要打提示符、要不要显示 spinner 动画。
          另一个常见做法是同时尊重环境变量 <code>NO_COLOR</code>——这是社区约定，只要它被设置，无论是不是 TTY 都不上色。
          把这些判断收敛到一处，整个工具的「自适应」行为就清晰可控了。
        </p>
      </Callout>

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
      <p>
        这里有个经典的<strong>常见误区</strong>值得点名：忘了写 RESET。如果你只写 <code>{'\\x1b[31m'}</code> + 文本、
        漏掉结尾的 <code>{'\\x1b[0m'}</code>，那么从这段红字之后<strong>一直到下一次出现 RESET</strong>，
        终端上所有的输出——包括你后面正常的回答、提示符，甚至 REPL 退出后 shell 的提示符——都会被染红。
        因为 ANSI 是「状态机」：它不是「给这段文字上色」，而是「从现在起切换到这个样式」，你不主动切回去，它就一直保持。
        所以把上色封装成 <code>color(s) = 颜色码 + s + RESET</code> 这样「自带收尾」的小函数，是个能省掉无数怪 bug 的好习惯。
      </p>

      <h3>startRepl 接收一个 agent</h3>
      <p>
        函数签名是 <code>startRepl(agent: Agent)</code>。REPL 不自己 new 一个 Agent，而是由外面（<code>index.ts</code>）
        装配好再传进来。这样 REPL 完全不关心 Agent 用的是哪个模型、挂了哪些工具，它只认 <code>agent.runTurn</code>
        和 <code>agent.model</code> 这两个口子。开头那行 <code>console.log</code> 打一句欢迎语，把当前模型名亮出来，
        并提示用户可以 <code>/help</code> 和 <code>/exit</code>。
      </p>
      <p>
        这种「依赖从外部传入、而不是在内部 new」的写法，就是<strong>依赖注入</strong>。它换来的好处在写测试时立刻兑现：
        你可以传一个假的 <code>agent</code>（<code>runTurn</code> 只是把输入原样记下来）进去，就能在不碰真实模型、不发任何网络请求的前提下，
        验证 REPL 的分流逻辑、退出逻辑是否正确。如果 REPL 内部硬编码 <code>new Agent(...)</code>，测试就被迫连真模型，又慢又贵又不稳定。
        「谁用谁负责装配」这条原则，会贯穿整个 forge。
      </p>

      <h3>为什么用 for await...of 而不是回调</h3>
      <p>
        老式的 readline 写法是 <code>rl.on('line', cb)</code>，每来一行就触发一次回调。问题在于：处理一行要 <code>await
        agent.runTurn(input)</code>，这是个耗时的异步过程。如果用回调，多行输入可能并发地踩进来，
        逻辑会很难控制。而 <code>for await (const line of rl)</code> 把异步迭代写成了顺序的样子——
        循环体里的 <code>await</code> 没结束，就不会进下一次迭代取下一行。一问一答天然串行，读起来也像同步代码，
        这正是 REPL 想要的节奏。
      </p>
      <p>
        把两种写法摊开对比，差别一目了然：
      </p>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th><code>rl.on('line', cb)</code> 回调</th>
            <th><code>for await...of</code> 异步迭代</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>处理一行要 await 时</td>
            <td>下一行可能在上一行还没处理完时就触发回调，<strong>并发交叠</strong></td>
            <td>循环体的 await 不结束就不取下一行，<strong>天然串行</strong></td>
          </tr>
          <tr>
            <td>代码形态</td>
            <td>逻辑被切碎进回调，控制流跳来跳去</td>
            <td>顺序的同步式写法，try/catch 也能正常包住</td>
          </tr>
          <tr>
            <td>背压（用户狂敲回车）</td>
            <td>回调堆积，全挤进来一起跑</td>
            <td>迭代器自动「攒着」，处理完一行才取下一行</td>
          </tr>
          <tr>
            <td>错误处理</td>
            <td>回调里抛错容易逃逸成未捕获异常</td>
            <td>一个 try/catch 就把整轮兜住</td>
          </tr>
        </tbody>
      </table>
      <p>
        最后这一列「背压」尤其关键：想象用户在 Agent 还在跑长任务时连按了三下回车又输入了三行。
        用 <code>for await</code>，这三行会被 readline 的可读流<strong>缓冲</strong>起来，当前这轮 <code>await</code> 一结束，
        循环才回头取下一行——它们排着队一个一个来，秩序井然。这是异步迭代器内建的流量控制，你一行额外代码都不用写。
      </p>

      <h3>空行跳过</h3>
      <p>
        <code>const input = line.trim()</code> 先去掉首尾空白。如果用户只敲了个回车，<code>input</code> 是空串，
        我们直接 <code>rl.prompt()</code> 重新打提示符、<code>continue</code> 进下一轮，
        不去打扰 Agent。一个小细节，但能避免「空输入也触发一次模型调用」这种浪费。
      </p>
      <p>
        别小看这一行。在交互式工具里，用户「不小心多按一下回车」是高频事件——可能在等回答时手痒、可能在粘贴多行文本时带了空行。
        每一次空输入若都走到 <code>agent.runTurn</code>，就是一次实打实的 token 消耗和网络往返，既花钱又让模型对着空串犯迷糊。
        <code>trim()</code> 还顺手解决了「只敲了几个空格」的情况。这类「过滤掉无意义输入」的守卫，是 Eval 阶段第一件该做的事。
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
        这里的 <code>try/catch</code> 是交互式程序的<strong>生命线</strong>，值得展开说。一次性脚本崩了无所谓，重跑就是；
        但 REPL 承载的是一个<strong>有状态的长会话</strong>——里面攒着十几轮对话历史、用户辛苦喂进去的上下文。
        如果第八轮因为网络抖了一下抛了异常、而你没接住，进程直接退出，那前面七轮全打水漂。所以原则是：
        <strong>把会引发单轮失败的操作牢牢圈在 try 里，让错误降级成「打一行红字」而不是「整个程序阵亡」</strong>。
        哪些错误该在这里兜？网络超时、API 限流、工具执行失败、模型返回了畸形数据——这些都属于「这一轮没成、但下一轮还能试」的可恢复错误。
        而像「内存耗尽」这种真正的致命错误，本来也不是一个 catch 能救的，那是另一个层面的事。
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
      <p>
        往底层说一层：Ctrl-C 在终端里会被转换成一个 <strong>SIGINT 信号</strong>发给前台进程。默认的信号处理行为就是终止进程，
        这也是为什么平时按 Ctrl-C 程序就没了。一旦你给 readline 注册了 <code>'SIGINT'</code> 监听器，
        就<strong>接管</strong>了这个信号，默认的「终止」行为被你的回调替代——于是按下 Ctrl-C 只会触发你那句提示，进程安然无恙。
        这套机制和几个相近的「退出途径」要分清楚：
      </p>
      <table>
        <thead>
          <tr>
            <th>触发方式</th>
            <th>底层是什么</th>
            <th>forge 的处理</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ctrl-C</td>
            <td>SIGINT 信号</td>
            <td>被 <code>rl.on('SIGINT')</code> 接管，给确认提示，不退出</td>
          </tr>
          <tr>
            <td>Ctrl-D</td>
            <td>EOF（输入流结束）</td>
            <td><code>for await</code> 自然结束，循环收尾后打「再见。」</td>
          </tr>
          <tr>
            <td><code>/exit</code></td>
            <td>普通文本输入</td>
            <td>命令调 <code>quit()</code> → 置标志 + <code>rl.close()</code> → break</td>
          </tr>
        </tbody>
      </table>
      <p>
        三条路殊途同归（程序最终都干净退出），但触发机制完全不同。<strong>常见误区</strong>是只处理了 <code>/exit</code>
        而忘了 Ctrl-D：用户在管道场景或习惯性按 Ctrl-D 时，如果程序没让 <code>for await</code> 正常收尾，就可能卡住或报怪错。
        好在用 <code>for await...of</code> 读取时，EOF 会让迭代器自然终止——这又是选对读取方式带来的免费红利。
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
      <p>
        这背后是「<strong>状态归属</strong>」的一个清醒选择：会话历史属于 Agent，不属于 REPL。REPL 只是个无状态的搬运工，
        它每一轮做的事都一样（读、分流、调、回），自己不记任何东西。把状态收在 Agent 里有几个直接好处：
        REPL 可以随时被替换成别的前端（Web、GUI）而不丢历史；测试 REPL 时不必伪造历史；
        而像 <code>/clear</code> 这样「清空历史」的命令，只要调 <code>agent.clearHistory()</code> 就行，
        REPL 完全不用知道历史长什么样。<strong>谁拥有状态，谁负责管理它</strong>——这条边界划清楚了，整个系统就不容易乱。
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

      <h2>交互式程序设计的几条共性原则</h2>
      <p>
        forge 的 REPL 虽小，却踩中了几乎所有交互式命令行程序都该遵守的原则。把它们提炼出来，换个工具也照样适用：
      </p>
      <ul>
        <li>
          <strong>永远给用户反馈。</strong>启动时打欢迎语、出错时打红字、退出时打「再见。」——不要让用户对着沉默的光标猜程序状态。
          一个没有任何反馈的等待，会让人怀疑是不是卡死了。
        </li>
        <li>
          <strong>单次失败可恢复。</strong>用 try/catch 把每一轮的错误隔离开，让长会话能熬过个别的意外。
          这是 REPL 和脚本最本质的态度差异。
        </li>
        <li>
          <strong>退出途径要齐全且优雅。</strong>Ctrl-C、Ctrl-D、显式命令，三条路都走得通，且都能把活儿收尾干净。
        </li>
        <li>
          <strong>分清「命令」与「内容」。</strong>给用户一个清晰的入口（这里是 <code>/</code> 前缀）去区分「我在控制程序」和「我在给程序喂任务」，
          避免两者混淆。
        </li>
        <li>
          <strong>过滤无意义输入。</strong>空行、纯空白直接跳过，别让它们浪费昂贵的下游操作。
        </li>
        <li>
          <strong>自适应运行环境。</strong>用 <code>isTTY</code> 等信号判断自己是跑在真人面前还是管道里，据此决定上不上色、打不打提示符。
        </li>
      </ul>

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
          'REPL 是「读—求值—打印—循环」，对 Agent 而言就是「问→答→再问」的交互外壳，它本身不含智能。骨架就是一个 while(true)：阻塞读一行、求值、打印、回头再读。',
          'REPL 的唯一职责：读输入、把斜杠命令和普通任务分流、调用 agent.runTurn、优雅退出。',
          '事件循环让「阻塞等输入」只是语义阻塞而非占用 CPU：await 时 Node 腾出线程去处理别的事件，输入到了再唤醒，所以等输入不会冻住后台任务。',
          'Node 内置的 node:readline 就够用：createInterface 建界面，rl.prompt() 打提示符，for await...of 串行逐行读。它底层切到逐键模式，替你实现了行编辑、历史、光标移动——自己用 raw mode 重写等于重新发明轮子。',
          'TTY 与非 TTY 行为不同：用 process.stdout.isTTY（及 NO_COLOR 约定）当总开关，决定上不上色、打不打提示符，让工具能既给真人用、也能进管道。',
          'for await...of 让一问一答天然串行（比 on(\'line\') 回调更好控制异步、自带背压、try/catch 能整轮兜住），EOF 还会让循环自然收尾。',
          'ANSI 是状态机：上色必须配 RESET 收尾，否则颜色会一直漏到后续输出甚至 shell 提示符——把上色封成自带收尾的小函数最稳。',
          'try/catch 兜住单轮错误是长会话的生命线；SIGINT/EOF/exit 三条退出路殊途同归但机制不同；空行直接跳过避免浪费——这些细节决定交互工具好不好用。',
          'index.ts 负责装配（Provider+工具+Agent+事件渲染器），repl.ts 负责交互，职责分离；依赖注入让 REPL 可测、可换前端。',
          '多轮上下文是免费的：会话状态归 Agent（messages 跨 runTurn 累积），REPL 是无状态搬运工，无需任何额外代码。',
          '下一章：填满那个空着的 onEvent，让 Agent 的回答一个字一个字地从终端里蹦出来。',
        ]}
      />
    </article>
  )
}

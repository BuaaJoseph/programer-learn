import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import LoopStepper from '@/courses/build-an-agent/illustrations/LoopStepper.jsx'

const installCode = `# 全局安装（和你装任何一个 CLI 工具没区别）
npm i -g @buaajoseph/forge

# 进入某个真实项目目录
cd my-project

# 敲一个字：forge，回车进入交互
forge

# 然后你就对着光标说人话——
> 帮我重构这个项目：把 utils.js 里的工具函数按职责拆成多个模块，
  更新所有 import，并跑一遍测试确认没破坏。

# forge 会：读相关文件 → 规划改动 → 逐个改文件 →
#   运行 npm test → 把失败的用例再修一轮 → 最后告诉你它都干了什么`

const finalShape = `$ forge
forge v1.0.0 · model: claude-opus-4-8 · cwd: ~/my-project

> 把 README 里过时的安装步骤更新成 pnpm

· 读取 README.md
· 读取 package.json（确认包管理器）
· 编辑 README.md（3 处替换）
· 完成：已把安装命令从 npm 切到 pnpm，并补了一行 corepack 提示。

> /exit`

const loopPseudo = `// 这就是整个 Agent 的「心跳」，伪代码不到 20 行：
async function runTurn(history) {
  while (true) {
    // 1. 把当前完整对话历史发给模型
    const res = await callModel(history)
    // 2. 把模型这轮的回复（可能含工具调用）追加进历史
    history.push({ role: 'assistant', content: res.content })

    // 3. 模型没要工具 → 这轮任务收尾，跳出循环
    const toolUses = res.content.filter((b) => b.type === 'tool_use')
    if (toolUses.length === 0) return res

    // 4. 模型要工具 → 逐个执行，把结果以 tool_result 回灌历史
    const results = []
    for (const call of toolUses) {
      const out = await runTool(call.name, call.input) // 读文件 / 改代码 / 跑命令
      results.push({ type: 'tool_result', tool_use_id: call.id, content: out })
    }
    history.push({ role: 'user', content: results })
    // 5. 回到步骤 1，带着新结果再问一次
  }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          这门课只有一个目标：带你<strong>从零手写一个能真正干活的编码 Agent</strong>，
          一个叫 <code>forge</code> 的命令行工具。学完之后，你不只是「会用」别人的 Agent，
          而是能把它<strong>拆开、看懂、再亲手造一个</strong>——并且发布到 npm 上让全世界 install。
          这一章先不写代码，我们站在山顶看一眼全程：终点长什么样，路怎么走。
        </p>
      </Lead>

      <h2>一、终点长什么样</h2>
      <p>
        先看结局，你才知道每一章是在为谁打工。课程的最终产物是 <code>forge</code>：
        一个像 Claude Code 一样的命令行编码 Agent。它的使用方式朴素到几乎无聊——
        安装、敲名字、说人话：
      </p>
      <CodeBlock lang="bash" title="forge 的安装与使用" code={installCode} />
      <p>
        注意上面这段交互里没有任何「魔法 API」。你装的是一个普通的 npm 全局包，
        跑的是一个普通的命令行程序。神奇的地方在于：当你对它说「帮我重构这个项目」，
        它能<strong>自己决定先读哪些文件、改什么、要不要跑测试、测试挂了怎么补救</strong>，
        而这一切都是你将在后面几卷里一行行写出来的逻辑。运行起来大概是这个画面：
      </p>
      <CodeBlock lang="bash" title="一次真实会话的样子" code={finalShape} />

      <h2>二、编码 Agent 是怎么来的</h2>
      <p>
        要理解 forge 长什么样，先得知道它属于哪一类东西、为什么这类东西是最近两年才冒出来的。
        把时间线拉开看，「让模型帮你写代码」这件事经历了三个清晰的台阶：
      </p>
      <ul>
        <li>
          <strong>第一台阶 · 补全（completion）。</strong>最早是 IDE 里的行内补全：
          你打半行，它接下半行。模型只看光标周围那点上下文，<strong>没有动作能力</strong>——
          它不会去读隔壁文件，更不会跑命令。本质上是一个超级聪明的输入法。
        </li>
        <li>
          <strong>第二台阶 · 对话（chat）。</strong>聊天框出现后，你可以贴一段代码问「这里为什么报错」，
          它给你一段解释和修法。比补全强多了，但<strong>闭环在你手上</strong>：模型给建议，
          复制、粘贴、保存、跑测试、把报错再贴回去——这些全是你在做。模型每一轮都「失忆」，
          只看得见你这次贴进去的东西。
        </li>
        <li>
          <strong>第三台阶 · 代理（agent）。</strong>这才是 forge 所在的层级。
          模型不再只是「出主意」，而是被授予了一组<strong>工具（tools）</strong>——读文件、写文件、
          跑命令——并被放进一个<strong>循环</strong>里：它自己读、自己改、自己跑测试、看到报错自己再修，
          直到任务完成才停下来交还给你。从「给建议」到「自己动手把活干完」，这一步的跨越，
          就是「Agent」这个词真正的含金量。
        </li>
      </ul>
      <p>
        为什么是最近才能做？因为第三台阶有两个硬前提：模型得<strong>足够会用工具</strong>
        （准确地决定调哪个工具、传什么参数），还得<strong>足够会规划</strong>
        （把一个模糊任务拆成有序的小步，并根据中途结果调整）。这两项能力直到近一两代模型才稳定到能商用。
        Claude Code、Cursor 的 Agent 模式、各种「AI 工程师」，本质都是这个台阶上的产物——
        形态各异，但内核是同一个：<strong>模型 + 工具 + 循环</strong>。
      </p>

      <Example title="同是编码 Agent，形态可以差很远">
        <ul>
          <li>
            <strong>CLI 型（forge / Claude Code）：</strong>跑在终端里，直接操作你机器上的真实文件系统，
            天然贴合「在某个项目目录里干活」的场景。装一次，任何项目都能用，也最容易脚本化、塞进 CI。
          </li>
          <li>
            <strong>IDE 内嵌型（Cursor 等）：</strong>长在编辑器里，能复用 IDE 已有的语法树、跳转、
            diff 视图，改动可视化体验好，但和某个具体编辑器绑定。
          </li>
          <li>
            <strong>云端/网页型：</strong>在远端容器里跑，适合「派一个任务，过会儿来收 PR」的异步模式，
            但你看不见、摸不着它的运行环境。
          </li>
        </ul>
        <p>
          这门课选 <strong>CLI 型</strong>，不是因为它最酷，而是因为它<strong>最能暴露内核</strong>：
          没有 IDE 帮你兜底，主循环、工具、权限、上下文每一块你都得亲手写，学到的东西最扎实。
        </p>
      </Example>

      <h2>三、Agent = 模型 + 脚手架</h2>
      <p>
        很多人以为「Agent 的能力来自模型」。这只对了一半。一个赤裸的模型，
        本身只会做一件事：给它一段文字，它吐出下一段文字。它不能读你的文件，
        不能改代码，不能跑命令，甚至记不住三分钟前发生了什么。
        让它「长出手脚」的，是包在外面的那一圈代码——我们管它叫<strong>脚手架（scaffold）</strong>。
      </p>

      <KeyIdea title="Agent = 模型 + 脚手架">
        <p>
          <strong>模型（Claude）负责「想」</strong>：理解任务、做判断、决定下一步该调用哪个工具。
          <strong>脚手架（forge 这套代码）负责「手脚和纪律」</strong>：主循环、工具实现、
          CLI 交互、权限确认、上下文管理。同一个模型，裸用和套上一套好脚手架，
          能力天差地别——后者才是把「会聊天」变成「会干活」的关键。这门课写的，
          几乎全部是脚手架。
        </p>
      </KeyIdea>

      <p>
        这个划分不只是好记，它还解释了一个常被误解的现象：<strong>为什么同一个模型，
        别人的 Agent 能干活，自己随手写的却老是「跑偏」？</strong>差距几乎全在脚手架里——
        工具描述写得清不清楚、报错有没有结构化地回灌给模型、上下文有没有在变长后被合理压缩、
        危险操作有没有被拦下来确认。模型是公共资源，谁都能调；
        <strong>脚手架才是一个 Agent 真正的工程含量所在</strong>，也是这门课要反复打磨的东西。
      </p>

      <Callout variant="warn" title="常见误区：以为「换个更强的模型」就能解决一切">
        <p>
          初学者最容易踩的坑，是把 Agent 表现不好都归咎于「模型不够聪明」。
          但现实里，绝大多数「Agent 变笨」的问题——反复读同一个文件、改错地方、
          循环停不下来、把项目搞坏——根因都在脚手架：历史没管好、工具结果格式混乱、
          缺少停止条件。换更强的模型往往只能盖住症状，<strong>把脚手架写对才是治本</strong>。
          这也是为什么本课程把大量篇幅花在「看起来不起眼」的循环、工具契约、上下文工程上。
        </p>
      </Callout>

      <h2>四、它的心脏：一个朴素的 while 循环</h2>
      <p>
        如果要把 forge 的核心压缩成一句话，那就是：
        <strong>一个不停地把消息历史发给模型的 while 循环</strong>。
        流程极其简单——把当前对话历史发给模型；如果模型说「我要调用某个工具」，
        就执行那个工具，把结果塞回历史里，再发一次；如果模型直接给了一段纯文本（不再要工具），
        循环就停下，这一轮任务结束。
      </p>
      <p>
        文字描述总是抽象，下面这张交互插图跟着一条真实任务走一遍，
        你点一步看一步，亲眼看着消息历史怎么一轮轮变长直到收尾：
      </p>
      <LoopStepper />
      <p>
        把这张图刻在脑子里。后面无论我们加多少花活——流式渲染、权限、子代理、压缩——
        最里层那个心跳，永远是这个循环。为了让你提前有个具体印象，下面是这个循环
        几乎不加修饰的伪代码（真实实现会在第 1 卷一行行写出来）：
      </p>
      <CodeBlock lang="ts" title="Agent 主循环（伪代码预览）" code={loopPseudo} />
      <p>
        盯着这段看，有三个细节值得现在就埋进脑子，它们后面每一卷都会回来找你：
      </p>
      <ul>
        <li>
          <strong>历史是「只增不改」的账本。</strong>每一轮，模型的回复和工具结果都被
          <em>追加</em>进 <code>history</code>，从不删改。模型之所以「记得上文」，
          靠的就是你每次都把这本越来越厚的账本完整地重新发给它——它本身是无状态的。
        </li>
        <li>
          <strong>停止条件是「模型不再要工具」。</strong>循环不是跑固定次数，
          而是由模型自己决定何时收尾。这意味着「如何让它别陷进死循环、别该停的时候不停」，
          本身就是一门要专门处理的工程（卷 5、卷 7 会碰）。
        </li>
        <li>
          <strong>工具结果必须配对回灌。</strong>每个 <code>tool_use</code> 都带一个 id，
          回灌的 <code>tool_result</code> 必须用同一个 id 对上号。这套「契约」是 Agent 能连贯运转的地基，
          也是卷 1 的重头戏。
        </li>
      </ul>

      <h2>五、全课程地图：9 卷 33 章</h2>
      <p>
        我们不会一口气把 forge 倒给你，而是像它自己干活那样：一步一步、可验证地造。
        整门课分 9 卷 33 章，每一卷都是一个能独立运行、肉眼可见进步的里程碑：
      </p>
      <ul>
        <li><strong>卷 0 · 准备与蓝图</strong>：搭好工程脚手架，完成第一次对 Claude 的真实调用。</li>
        <li><strong>卷 1 · Agent 内核</strong>：消息历史、工具契约、主循环、读/写工具、调度——这是整个课程的心脏。</li>
        <li><strong>卷 2 · 像样的 CLI</strong>：REPL 交互、流式渲染、斜杠命令，让它从「能跑」变「好用」。</li>
        <li><strong>卷 3 · 安全与人在回路</strong>：权限模型、危险操作确认、审计日志，让它敢放进真项目。</li>
        <li><strong>卷 4 · 上下文工程</strong>：system prompt、AGENTS.md 记忆、token 预算、自动压缩。</li>
        <li><strong>卷 5 · 规划与子代理</strong>：TodoWrite 待办、计划模式、子代理拆解大任务。</li>
        <li><strong>卷 6 · 扩展性</strong>：配置系统、Provider 抽象、MCP 接入外部工具。</li>
        <li><strong>卷 7 · 生产化</strong>：会话恢复 <code>--resume</code>、成本与延迟、可观测性、测试。</li>
        <li><strong>卷 8 · 打包发布</strong>：bin 打包、npm 发布、文档，以及毕业项目——<strong>用 forge 改造 forge</strong>。</li>
      </ul>
      <p>
        这个顺序不是随意排的，它对应着一条<strong>从「能动」到「敢用」再到「好用、可扩展、可上线」</strong>的成熟度曲线。
        卷 1 让它<em>能动</em>（有了心跳和手脚）；卷 2–3 让它<em>敢用</em>（人能舒服地交互，且不会一不留神毁掉项目）；
        卷 4–5 让它<em>聪明地用</em>（在有限上下文里管好记忆、会规划大任务）；卷 6–8 让它<em>长期地用</em>
        （可配置、可扩展、可观测、能发布）。每往上一层，下面那层都必须先稳。这也回应了第三节那句话：
        地基（卷 0–1）不稳，越往上盖越痛苦。
      </p>

      <h2>六、为什么是这套技术选型</h2>
      <Callout variant="note" title="Node + TypeScript，默认 Claude，但留一层薄抽象">
        <p>
          我们用 <strong>Node + TypeScript</strong> 来写 forge：生态成熟、和 Claude Code 同源、
          通过 npm 分发也最省心，一条 <code>npm i -g</code> 谁都能装。模型默认用
          <strong> Claude（<code>claude-opus-4-8</code>）</strong>。
          但我们不会把 Claude 的调用硬编码进主循环——中间会隔一层<strong>薄薄的 Provider 抽象</strong>，
          把「怎么调模型」和「Agent 怎么思考」解耦。这样以后要换模型、换厂商，
          改的是一个文件，而不是整套内核。
        </p>
      </Callout>
      <p>
        把选型理由讲透一点，省得你日后疑惑「为什么不是别的」：
      </p>
      <ul>
        <li>
          <strong>为什么是 Node，而不是 Python？</strong>编码 Agent 是个<strong>分发优先</strong>的东西——
          你希望用户一行 <code>npm i -g</code> 就装好，而不是先教他建虚拟环境、装解释器。
          npm 的全局 bin 机制天然适配 CLI 工具；Node 的事件循环也很契合 Agent 这种「大量等待
          网络 I/O（模型响应、文件读写）」的负载。Python 当然也能写，但在「做成一个谁都能装的命令行工具」
          这件事上，Node 的路最平。
        </li>
        <li>
          <strong>为什么一定要 TypeScript？</strong>Agent 的代码里到处是「形状不定」的数据：
          模型返回的内容块数组、可能为 null 的工具参数、各种联合类型的事件。这类代码<strong>最怕的就是
          运行时才发现某个值是 undefined</strong>——而 Agent 跑在一个长循环里，
          一个没处理的边界情况可能要循环好几轮才暴露，调试成本极高。TypeScript 把这些问题在编译期就逼出来，
          对 Agent 这种「长链路、多分支」的程序价值尤其大。
        </li>
        <li>
          <strong>为什么默认 Claude？</strong>编码 Agent 对模型的「工具使用」和「长程规划」能力要求极高，
          而这正是 Claude（本课用 <code>claude-opus-4-8</code>）的强项。同时它和 Claude Code 同源，
          你学到的东西能直接对照官方实现去印证。
        </li>
        <li>
          <strong>为什么还要隔一层抽象？</strong>因为「怎么调模型」是会变的（换版本、换厂商、走代理），
          而「Agent 怎么思考」（主循环、工具调度）应该是稳定的。把易变的东西关进一个小盒子里，
          是工程上最朴素也最值钱的一条原则——卷 6 会把这层 Provider 抽象正式落地。
        </li>
      </ul>

      <h2>七、这门课怎么学</h2>
      <Callout variant="tip" title="边读边敲，顺着 git log 走">
        <p>
          每一章都对应仓库 <code>https://github.com/BuaaJoseph/forge</code> 里的真实代码，
          不是教学玩具。最高效的学法是<strong>边读边敲</strong>：跟着章节自己写一遍，
          再用 <code>git log</code> 顺着提交历史读官方实现，对比你和它的差异。
          代码会骗不了人——当你的 forge 第一次成功改完一个文件并跑过测试，
          你就真正理解了「Agent」这三个字。
        </p>
      </Callout>
      <p>
        再补一条实战经验：<strong>不要追求一次写对，要追求每一步都能跑、能验证。</strong>
        Agent 项目最折磨人的地方在于「错误会被循环放大」——一个小 bug 可能要等到第三轮工具调用才显形，
        到时候你已经分不清是哪一步出的问题。对策就是像 forge 自己干活那样：小步前进，每加一块就立刻
        跑一下、看输出对不对，再加下一块。这门课的章节切分本身就是按这个节奏设计的，跟着走就行。
      </p>

      <Callout variant="warn" title="先有画面，再写代码">
        <p>
          本章故意不写一行实现。如果你现在还觉得「主循环」「工具契约」这些词有点虚，
          完全正常——记住第四节那张循环图就够了。从下一章起，我们就动手搭脚手架，
          让 forge 第一次开口说话。
        </p>
      </Callout>

      <Summary points={[
        'forge 是我们要亲手造的终点：一个 npm 全局安装、敲 forge 进交互、能读改代码并跑测试的命令行编码 Agent。',
        '编码助手经历了补全 → 对话 → 代理三个台阶，forge 属于第三层：模型 + 工具 + 循环，能自己把活干完而不只是给建议。',
        'Agent = 模型 + 脚手架：模型负责「想」，脚手架（主循环、工具、CLI、权限、上下文）负责「手脚和纪律」，本课程写的几乎全是脚手架；多数「Agent 变笨」的根因在脚手架而非模型。',
        'forge 的心脏是一个朴素 while 循环：发历史给模型 → 要工具就执行并回灌（带 id 配对）→ 给纯文本就停；历史只增不改，模型靠每次重发完整历史来「记得上文」。',
        '全程 9 卷 33 章，对应从「能动」到「敢用」再到「好用、可扩展、可上线」的成熟度曲线，每卷都是能独立运行的里程碑。',
        '技术选型 Node + TypeScript（分发优先、类型安全护住长链路多分支）、默认 Claude（claude-opus-4-8）但隔一层 Provider 抽象；学法是对照官方仓库边读边敲、小步可验证地前进。',
      ]} />
    </>
  )
}

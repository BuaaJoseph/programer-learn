import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
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

      <h2>二、Agent = 模型 + 脚手架</h2>
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

      <h2>三、它的心脏：一个朴素的 while 循环</h2>
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
        最里层那个心跳，永远是这个循环。
      </p>

      <h2>四、全课程地图：9 卷 33 章</h2>
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

      <h2>五、为什么是这套技术选型</h2>
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

      <h2>六、这门课怎么学</h2>
      <Callout variant="tip" title="边读边敲，顺着 git log 走">
        <p>
          每一章都对应仓库 <code>https://github.com/BuaaJoseph/forge</code> 里的真实代码，
          不是教学玩具。最高效的学法是<strong>边读边敲</strong>：跟着章节自己写一遍，
          再用 <code>git log</code> 顺着提交历史读官方实现，对比你和它的差异。
          代码会骗不了人——当你的 forge 第一次成功改完一个文件并跑过测试，
          你就真正理解了「Agent」这三个字。
        </p>
      </Callout>

      <Callout variant="warn" title="先有画面，再写代码">
        <p>
          本章故意不写一行实现。如果你现在还觉得「主循环」「工具契约」这些词有点虚，
          完全正常——记住第三节那张循环图就够了。从下一章起，我们就动手搭脚手架，
          让 forge 第一次开口说话。
        </p>
      </Callout>

      <Summary points={[
        'forge 是我们要亲手造的终点：一个 npm 全局安装、敲 forge 进交互、能读改代码并跑测试的命令行编码 Agent。',
        'Agent = 模型 + 脚手架：模型负责「想」，脚手架（主循环、工具、CLI、权限、上下文）负责「手脚和纪律」，本课程写的几乎全是脚手架。',
        'forge 的心脏是一个朴素 while 循环：发历史给模型 → 要工具就执行并回灌 → 给纯文本就停。',
        '全程 9 卷 33 章，从蓝图到内核、CLI、安全、上下文、规划、扩展、生产化，最终打包发布并用 forge 改造 forge。',
        '技术选型 Node + TypeScript、默认 Claude（claude-opus-4-8）但隔一层 Provider 抽象；学法是对照官方仓库边读边敲、顺着 git log 走。',
      ]} />
    </>
  )
}

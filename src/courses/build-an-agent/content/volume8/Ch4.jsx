import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const enterForge = `cd forge
forge`

const forgeSession = `forge> /plan
（进入计划模式：从这里开始，forge 只读、只想，不动你的文件）

forge> 给项目新增一个只读工具 tree：递归打印目录树，
       跳过 node_modules/.git，仿照 src/tools/list.ts 的风格，
       并在 src/tools/index.ts 注册、补一条单测

  → forge 调 read 看 src/tools/list.ts，学它的工具契约写法
  → 调 read 看 src/tools/index.ts，看清工具是怎么注册进数组的
  → 调 glob 扫一眼 test/ 目录，确认测试该放哪、怎么写
  → 输出一份分步计划：
      1. 新建 src/tools/tree.ts，导出符合契约的 tree 工具
      2. 在 src/tools/index.ts 的 tools 数组里登记 tree
      3. 在 test/tools.test.ts 加一条单测，断言树形输出且跳过 node_modules

forge> /plan
（看完计划满意，再次 /plan 退出计划模式，解开写权限）

forge> 按计划执行

  → 调 write 新建 src/tools/tree.ts      —— 弹出确认，你按 y
  → 调 edit  改 src/tools/index.ts        —— 弹出确认，你按 y
  → 调 write 加 test/tools.test.ts        —— 弹出确认，你按 y
  → 调 bash 跑 npm test                    —— 绿了，新工具有测试护航`

const verify = `# 在 forge 改完 forge 之后，自己再确认一遍
npm test          # 单测全绿：tree 工具行为符合预期
npm run build     # 构建通过：bin 能正常打包

# 闭环：测试 + 构建都过，就能发一个新版本
npm version patch
npm publish`

export default function Ch4() {
  return (
    <article>
      <Lead>
        先说一句：恭喜你。九卷三十三章前，你面对的是一个空文件夹；现在，
        你手里是一个能 <code>npm install</code>、能在终端里跟你对话、能读你的代码、
        能改你的文件、还会自己跑测试的真实编码 Agent —— forge 已经成型了。
        这一章，我们用一个终极验证给整门课画上句号：
        <strong>用你亲手造的 forge，去给 forge 自己加一个新功能。</strong>
        当它能自举（自己改自己），你就真的毕业了。
      </Lead>

      <h2>先回头看看我们造了什么</h2>

      <KeyIdea>
        forge 不是凭空冒出来的一个大程序，而是九层薄薄的能力，一卷一卷叠起来的。
        把它们串成一张地图，你会发现每一块都不神秘：
      </KeyIdea>

      <ul>
        <li><strong>卷 0 · 准备与蓝图</strong>：搭脚手架，第一次把消息发给 Claude 并拿到回复。</li>
        <li><strong>卷 1 · Agent 内核</strong>：消息历史、工具契约、主循环、读/写工具、工具调度 —— 这是整个 Agent 的心脏。</li>
        <li><strong>卷 2 · 像样的 CLI</strong>：REPL 交互、流式输出、斜杠命令，让它用起来像个工具。</li>
        <li><strong>卷 3 · 安全与人在回路</strong>：权限分级、危险操作确认、审计日志，让它敢放进真实项目。</li>
        <li><strong>卷 4 · 上下文工程</strong>：system prompt、<code>AGENTS.md</code>、token 预算、对话自动压缩。</li>
        <li><strong>卷 5 · 规划与子代理</strong>：<code>TodoWrite</code> 任务清单、计划模式、子代理拆活。</li>
        <li><strong>卷 6 · 扩展性</strong>：配置系统、Provider 抽象、MCP 接入外部能力。</li>
        <li><strong>卷 7 · 生产化</strong>：会话 <code>--resume</code>、成本与延迟、可观测性、测试。</li>
        <li><strong>卷 8 · 打包发布</strong>：bin 打包、npm 发布、写文档，然后 —— 毕业。</li>
      </ul>

      <p>
        一句话把它压缩成你能随口讲出来的形状：
        <strong>forge = 朴素主循环 + 一组工具 + 一层薄 Provider + 安全闸门 + 上下文管理 + 可扩展 + 可交付。</strong>
        每一个加号，都是你亲手写过的一卷。
      </p>

      <h2>毕业项目：用 forge 给 forge 加一个新工具</h2>

      <p>
        理论复述一万遍，不如让它真刀真枪干一件事。我们给它一道具体、边界清晰、
        一晚上能做完的题目：<strong>新增一个只读工具 <code>tree</code></strong> —— 递归打印目录树。
        题目刻意选「只读」，因为它安全、好验收，又足够碰到工具系统的每一层。
      </p>

      <Example title="毕业任务书">
        <p><strong>目标</strong>：给 forge 增加一个内置工具 <code>tree</code>，递归打印目录结构，自动跳过 <code>node_modules</code> 与 <code>.git</code>。</p>
        <p><strong>验收标准</strong>：</p>
        <ul>
          <li>在 <code>src/tools/</code> 下新建 <code>tree.ts</code>，导出一个符合现有工具契约的工具（name、description、参数 schema、execute）。</li>
          <li>在 <code>src/tools/index.ts</code> 里把 <code>tree</code> 注册进工具数组，让模型能发现并调用它。</li>
          <li>模型在对话里能正确调用 <code>tree</code>，拿到树形文本结果。</li>
          <li>补一条单测：给一个临时目录，断言输出包含子文件、且不包含 <code>node_modules</code>。</li>
        </ul>
      </Example>

      <h2>怎么用 forge 来做这件事</h2>

      <p>进到 forge 自己的仓库，把它启动起来 —— 这一次，被改造的代码库就是它自己：</p>

      <CodeBlock lang="bash" code={enterForge} />

      <p>
        接下来不用你写一行 TypeScript。你只要像跟一个靠谱同事说话那样，把任务交给它。
        下面这段，正是你和 forge 的一次完整对话，以及它在背后会怎么干：
      </p>

      <CodeBlock lang="text" code={forgeSession} />

      <p>
        留意这一段里，forge 把你前面学的机制几乎全用上了：
        <strong>计划模式</strong>（卷 5）让它先只读、先想清楚再动手；
        <strong>只读探索</strong>（卷 1 的 read/glob）让它照着 <code>list.ts</code> 的真实风格来写，而不是凭空捏造；
        <strong>写工具 + 确认</strong>（卷 1 的 write/edit、卷 3 的危险确认）让每一次落盘都经过你点头；
        <strong>跑测试验证</strong>（卷 1 的 bash 工具、卷 7 的测试）让它在交活之前自己先检查一遍。
      </p>

      <KeyIdea>
        当 forge 能可靠地参与改进它自己 —— 读懂自己的代码、按你的计划动手、改完自己验证 ——
        它就从一个「跑得起来的玩具」，变成了一件「敢交给它干活的工具」。
        自举，是 Agent 成熟的分水岭。
      </KeyIdea>

      <h2>验证毕业：跑通自举闭环</h2>

      <p>
        forge 说它干完了，但「毕业」不靠它一张嘴。回到你这边，再亲手确认一遍：
      </p>

      <CodeBlock lang="bash" code={verify} />

      <p>
        测试全绿、构建通过，新工具就有了测试护航。这时候你可以心安理得地
        <code>npm version patch && npm publish</code>，发出一个带着 <code>tree</code> 工具的新版本。
        于是闭环成了：<strong>forge 改 forge → 测试 → 发布</strong>。
        下一次你用的，就是它刚帮你升级过的自己。这就是自举。
      </p>

      <Callout variant="tip">
        毕业不是终点，是你可以自由发挥的起点。几个值得继续往下走的方向：
        <ul>
          <li><strong>更聪明的压缩</strong>：只压缩较旧的历史、保留最近 N 轮原文，省 token 又不丢上下文。</li>
          <li><strong>流式里实时渲染工具进度</strong>：让用户看到「正在读 X、正在跑测试」，而不是干等。</li>
          <li><strong>更多内置工具</strong>：grep、apply-patch、运行单个测试文件……工具越好用，Agent 越能干。</li>
          <li><strong>复用同一个内核做 Web / IDE 前端</strong>：CLI 只是一层皮，主循环可以接任何界面。</li>
          <li><strong>接更多 Provider 与 MCP server</strong>：换模型、连数据库、调外部 API，能力随插随用。</li>
        </ul>
      </Callout>

      <Callout variant="note">
        最后回扣一下我们出发时的承诺：你现在不只是「会用 Agent」，而是「理解并能造 Agent」。
        市面上那些编码 Agent —— Claude Code 也好、别的也好 —— 拆开看，本质都是这一套
        <strong>「模型 + 脚手架」</strong>：一个会调用工具的模型，外加一圈循环、工具、权限和上下文管理。
        模型不是你写的，但那圈脚手架，你已经从头到尾亲手搭过一遍了。
      </Callout>

      <p>
        谢谢你一路走到这里。三十三章里有不少地方是硬骨头 —— 主循环的边界、确认流程的取舍、
        token 预算的精打细算 —— 你都啃下来了。forge 的完整代码在
        {' '}<a href="https://github.com/BuaaJoseph/forge" target="_blank" rel="noreferrer">github.com/BuaaJoseph/forge</a>，
        它现在是你的了：去给它加你想要的工具、改成你顺手的样子、用在你每天的项目里，
        把它打磨成真正趁手的兵器。这门课结束了，但你和 forge 的故事，才刚开始。
      </p>

      <Summary points={[
        'Agent 的本质是「模型 + 脚手架」：模型负责思考与决策，脚手架负责让它能感知和行动。',
        '主循环是整个 Agent 的心脏：发消息 → 收工具调用 → 执行工具 → 把结果喂回去，循环到收敛。',
        '工具契约（name / description / 参数 schema / execute）是模型与你的代码之间清晰的接口。',
        '安全闸门（权限分级、危险确认、审计）是让 Agent 敢进真实项目的前提。',
        '上下文工程（system prompt、AGENTS.md、token 预算、自动压缩）决定了它聪明还是健忘。',
        '可扩展（配置、Provider、MCP）与可交付（打包、发布、测试），让它从脚本长成产品 —— 最终能自举改进自己。',
      ]} />
    </article>
  )
}

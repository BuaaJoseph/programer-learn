import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LlmTurn from '@/courses/agent-internals/illustrations/LlmTurn.jsx'

const messagesShape = `messages = [
  // 1) system prompt：你是谁、规则、风格（每轮都带，但内容固定）
  { role: "system", content: "你是一个编码 Agent……" },

  // 2) 工具定义：每个工具的 name / description / 参数 schema
  //    （description 本质是写给模型看的「说明书」）
  tools = [
    { name: "Read",  description: "读取一个文件……", input_schema: {...} },
    { name: "Edit",  description: "对文件做精确替换……", input_schema: {...} },
    { name: "Bash",  description: "执行一条 shell 命令……", input_schema: {...} },
    ...
  ],

  // 3) CLAUDE.md：项目约定，作为上下文注入
  { role: "user", content: "<project-memory>本项目用 jest 测试……</project-memory>" },

  // 4) 对话历史：从你的第一句指令开始，逐轮累积
  { role: "user",      content: "帮我重构 auth 模块……" },
  { role: "assistant", content: [ { type: "tool_use", name: "Grep", input: {...} } ] },

  // 5) 上一轮的工具结果：刚刚执行完的那次调用返回了什么
  { role: "user", content: [ { type: "tool_result", content: "auth.js: 600 行……" } ] },
]`

const turn5 = `// 重构任务进行到第 5 轮时，这一轮发出去的 messages（示意）
[
  system:    "你是编码 Agent……"                  // 几百 token，固定
  tools:     [Read, Edit, Bash, Grep, TodoWrite]  // 上千 token，固定
  CLAUDE.md: "用 jest；不要提交到 main……"          // 固定

  // —— 以下是越滚越长的部分 ——
  user:      "帮我重构 auth 模块……"               // 第 1 轮
  assistant: [tool_use Grep …]                     // 第 1 轮模型的动作
  user:      [tool_result "auth 在 4 处被引用"]     // 第 1 轮结果
  assistant: [tool_use Read src/auth.js]           // 第 2 轮
  user:      [tool_result "<auth.js 全文 600 行>"]  // 第 2 轮结果（很占 token）
  assistant: [tool_use TodoWrite …]                // 第 2 轮
  user:      [tool_result "Todo 已记录"]            // 第 3 轮
  assistant: "auth.js 被 4 处引用，要保留兼容入口吗？" // 第 3 轮：发问
  user:      "保留 auth.js 当兼容入口"              // 你的回答
  assistant: [tool_use Edit src/login.js …]        // 第 4 轮
  user:      [tool_result "已创建 login.js"]        // ← 第 4 轮结果

  //  ↑ 模型读完上面这一切，现在要输出「第 5 轮的动作」
]`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说，Agent 是一轮轮收敛的。那「一轮」具体是什么？答案朴素到惊人：<strong>一轮，就是一次 LLM 调用</strong>。
          而一次 LLM 调用，本质是把一个 <em>messages</em> 数组发给模型，模型读完，输出「下一个工具调用」或「最终文本」。
          这一章我们把这个数组彻底拆开——搞懂里面装了什么，你就搞懂了 Agent 的「燃料」是怎么烧的。
        </p>
      </Lead>

      <h2>一次调用，发出去的是什么</h2>
      <p>
        模型本身是无状态的：它不「记得」上一轮，每一轮都是把<strong>当前全部上下文</strong>重新发一遍。这个上下文，
        就是一个 messages 数组，固定由五部分拼成：
      </p>
      <CodeBlock lang="javascript" title="一次 LLM 调用的 messages 结构" code={messagesShape} />

      <h3>逐块看：每一部分干什么</h3>
      <ul>
        <li>
          <strong>system prompt</strong>：定义 Agent 的身份、行为规则、输出风格。每轮都带，但内容基本固定。
        </li>
        <li>
          <strong>工具定义</strong>：列出模型这一轮<em>可以</em>调用的工具，每个含 <code>name</code>、<code>description</code>、
          参数 <code>schema</code>。关键认知——<code>description</code> 不是给人看的注释，它是<strong>写给模型看的说明书</strong>：
          模型完全靠这段文字来判断「这个工具是干嘛的、什么时候该用、参数怎么填」。description 写得烂，模型就会用错工具。
        </li>
        <li>
          <strong>CLAUDE.md</strong>：项目级约定（用什么测试框架、什么不能碰），作为上下文注入，相当于常驻的项目备忘。
        </li>
        <li>
          <strong>对话历史</strong>：从你的第一句指令起，你说的、模型每轮的动作，逐轮累积。
        </li>
        <li>
          <strong>上一轮工具结果</strong>：刚执行完的那次工具调用返回了什么（文件内容、命令输出、报错），塞回来让模型看见。
        </li>
      </ul>

      <LlmTurn />

      <h2>举例：重构任务的第 5 轮长什么样</h2>
      <p>
        抽象的结构不好记，我们把上一章那个重构任务，停在<strong>第 5 轮开始前</strong>，看看这一刻发给模型的 messages
        实际长什么样：
      </p>
      <CodeBlock lang="javascript" title="第 5 轮的 messages（示意）" code={turn5} />
      <p>
        看清楚了吗？前三块（system / tools / CLAUDE.md）几乎一字没变；真正在<strong>疯长</strong>的，是后面的对话历史
        和工具结果——每多走一轮，就多压进去一对「模型的动作 + 执行的结果」。模型就是读着这一整坨，
        才知道「我已经拆了 login.js，下一步该拆 session.js 还是补测试」。
      </p>

      <KeyIdea title="模型凭什么决定下一步">
        <p>
          模型决策的依据，<strong>百分之百来自这个 messages 数组</strong>，没有别的。它不会回忆、不会查库、不会偷看磁盘——
          凡是没塞进 messages 的信息，对它就不存在。所以「让 Agent 表现好」的本质，永远是
          <strong>把对的东西放进上下文、把没用的挤出去</strong>。这也是为什么 Agent 工程的核心就是上下文工程。
        </p>
      </KeyIdea>

      <h2>token 花在哪：为什么历史和结果增长最快</h2>
      <p>
        每一轮调用都按 messages 的总长度计费和计 token。三块固定部分（system / tools / CLAUDE.md）是一笔常数开销；
        真正失控的是<strong>累积的对话历史</strong>和<strong>工具结果</strong>——尤其工具结果：一次 <code>Read</code> 整个
        600 行的 auth.js，就能塞进去几千个 token，而且<strong>之后每一轮都还带着它</strong>。
      </p>
      <Example title="同一份文件内容，被重复计费">
        <p>
          第 2 轮模型 Read 了 auth.js 全文（约 4000 token）。到了第 5、第 8、第 12 轮，只要这条 tool_result
          还在历史里，这 4000 token 就被<strong>反复发送、反复计费</strong>。这就是为什么长会话越到后面越贵、越慢——
          不是模型变笨了，是它每轮要重读的「卷宗」越来越厚。
        </p>
      </Example>

      <Callout variant="warn" title="上下文是有上限的">
        <p>
          messages 的总长度受<strong>上下文窗口</strong>限制（比如 200K token）。历史和工具结果无限增长，迟早会撞顶。
          这正是后面要讲的压缩、裁剪、子 Agent 隔离等机制存在的根本原因——它们都是在跟「上下文越滚越大」这件事作斗争。
          现在你只需记住：每多读一个大文件、每多跑一轮，都在往这个会越来越满的桶里加水。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        知道了 token 的去向，你就有了几条实用直觉。第一，<strong>别让 Agent 漫无目的地 Read 大文件</strong>：
        能 Grep 定位、只读相关片段，就别整文件吞，因为它会一直挂在上下文里。第二，<strong>长会话适时另起炉灶</strong>：
        当一个任务彻底做完，开新会话比在塞满的旧会话里继续更快更省。第三，理解了「模型只看 messages」，
        你就明白<strong>把上下文喂对</strong>才是让 Agent 变强的真正杠杆，而不是反复念「请认真一点」。
      </p>

      <Practice title="用伪 JSON 写出一轮 messages">
        <p>
          挑你自己的一个小任务（比如「给 README 加一节安装说明」），假设 Agent 已经走到第 3 轮，
          用伪 JSON <strong>手写出</strong>这一轮的 messages 数组：标出 system、tools、CLAUDE.md，
          以及前两轮累积的 <code>tool_use</code> 和 <code>tool_result</code>。
        </p>
        <p>
          写完数一数：哪一块最长？如果让任务再多走 5 轮，最先撑爆上下文的会是哪一块？
          (提示：几乎一定是工具结果。) 这个练习能把「上下文工程」从抽象概念变成你手上的肌肉记忆。
        </p>
      </Practice>

      <Summary
        points={[
          '一轮 = 一次 LLM 调用 = 把一个 messages 数组发给模型，模型输出下一个工具调用或最终文本。',
          'messages 固定五块：system prompt、工具定义、CLAUDE.md、对话历史、上一轮工具结果。',
          '工具的 description 是写给模型看的说明书，模型靠它判断何时用、怎么用这个工具。',
          '模型无状态，决策完全基于当前 messages；没塞进去的信息对它就不存在。',
          'system/tools/CLAUDE.md 是常数开销，历史和工具结果随轮次累积、增长最快、被反复计费。',
          '上下文窗口有上限，控制读入的内容与会话长度，是让 Agent 又快又省的关键。',
        ]}
      />
    </>
  )
}

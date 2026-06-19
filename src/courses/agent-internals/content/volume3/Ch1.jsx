import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ToolDispatch from '@/courses/agent-internals/illustrations/ToolDispatch.jsx'

const toolUseCode = `// 模型并不会真的去读文件，它只产出一段「调用意图」
{
  "type": "tool_use",
  "id": "toolu_01abc",
  "name": "Read",
  "input": { "file_path": "/src/app.js" }
}

// harness 真正执行后，把结果作为 tool_result 回灌给模型
{
  "type": "tool_result",
  "tool_use_id": "toolu_01abc",
  "content": "1  import express from 'express'\\n2  ..."
}`

const parallelCode = `// 同一轮里，模型一次产出三个只读调用 —— harness 可并行执行
[
  { "name": "Read", "input": { "file_path": "a.js" } },
  { "name": "Read", "input": { "file_path": "b.js" } },
  { "name": "Grep", "input": { "pattern": "TODO" } }
]

// 而连续修改同一片状态的写调用，必须一个接一个串行
[
  { "name": "Edit", "input": { "file_path": "a.js", "old": "x", "new": "y" } },
  { "name": "Edit", "input": { "file_path": "a.js", "old": "y", "new": "z" } }
]`

const loopCode = `// harness 主循环的伪代码：它不停地「发消息 → 看回复 → 执行工具 → 再发消息」
let messages = [systemPrompt, userTask]

while (true) {
  const resp = await model.generate(messages, { tools })

  // 模型这一轮没要工具，纯文本回答 —— 循环结束
  if (resp.stop_reason !== 'tool_use') {
    messages.push(resp)
    break
  }

  // 模型要了一批工具调用：harness 逐个（或并行）真正执行
  const results = await runTools(resp.tool_uses)

  // 把这一轮的「意图」和「结果」都拼回上下文，进入下一轮
  messages.push(resp)            // assistant 的 tool_use
  messages.push(...results)      // 对应的 tool_result
}`

const errorResultCode = `// 工具执行失败时，harness 不会崩，而是把错误也包成 tool_result 喂回去
{
  "type": "tool_result",
  "tool_use_id": "toolu_01abc",
  "is_error": true,
  "content": "ENOENT: no such file or directory, open '/src/app.js'"
}

// 模型读到这段错误后，往往会自我纠偏：先 Glob 找一下真实路径，再重试 Read`

const schemaCode = `// 工具的「名字 + 描述 + 参数 schema」会被原样拼进上下文
// 这段 JSON Schema 既是给 harness 校验参数用的，也是给模型「看懂」用的
{
  "name": "Edit",
  "description": "在文件中做一次精确字符串替换。old_string 必须在文件中唯一出现，否则报错。",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_path":  { "type": "string", "description": "要修改文件的绝对路径" },
      "old_string": { "type": "string", "description": "被替换的原文，需精确匹配且唯一" },
      "new_string": { "type": "string", "description": "替换后的新文本" }
    },
    "required": ["file_path", "old_string", "new_string"]
  }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          很多人以为「Agent 调用工具」是模型自己伸手去读了文件、跑了命令。其实模型从头到尾只会做一件事：
          生成文字。所谓工具调用，不过是模型按约定格式吐出一段<strong>调用意图</strong>，
          真正动手执行的是它外面那层程序——我们叫它 <em>harness</em>。这一章拆开「意图—执行—回灌」这个循环。
        </p>
      </Lead>

      <h2>模型只生成意图，不执行任何东西</h2>
      <p>
        当你给模型挂上一组工具，模型能做的依然只有 next-token prediction。区别在于：它被训练成在该用工具时，
        生成一段结构化的 <em>tool_use</em> 文本——里面写着「我想调用哪个工具、传什么参数」。
        这段文本本身什么也不会发生，它只是一个<strong>请求</strong>。
      </p>
      <p>
        拿到这个请求后，是 harness（也就是 Claude Code 这类客户端程序）去真正打开文件、执行命令、调用 API，
        然后把执行结果包成一段 <em>tool_result</em> 文本，重新拼回上下文，再让模型读着这个结果继续往下生成。
        模型从不碰你的磁盘，它碰的永远只是文字。
      </p>
      <p>
        为什么要这么设计？因为这把<strong>「决策」和「执行」彻底解耦</strong>了。模型作为一个概率文本生成器，
        天然是不可信、不可控的——你不会希望一个会「幻觉」的东西直接握着 <code>rm -rf</code> 的权柄。
        把执行权留在 harness 手里，意味着所有危险动作都要先过一道你自己写的程序：可以校验参数、可以弹出确认、
        可以拦截危险命令、可以记录审计日志。模型负责「想做什么」，harness 负责「准不准做、怎么做」，
        这道闸门是整个 Agent 安全模型的地基。
      </p>
      <p>
        底层上，这套约定由模型供应商的 API 直接支持：你在请求里传一个 <code>tools</code> 数组，
        模型回复时的 <code>stop_reason</code> 会变成 <code>{'tool_use'}</code>，并在 <code>content</code> 里
        给出一个或多个 <code>{'tool_use'}</code> 块。模型并不是「学会了调用函数」，而是被后训练（post-training）
        强化成在合适时机产出这种特定结构的文本——本质仍是预测下一个 token，只不过这串 token 长得像一次函数调用。
      </p>

      <Example title="一次 Read 背后的两段文字">
        <p>模型产出意图，harness 执行并把结果回灌——你看到的「读文件」其实是这两段文字的往返：</p>
        <CodeBlock lang="json" title="意图与回灌" code={toolUseCode} />
        <p>
          注意 <code>tool_use</code> 里的 <code>id</code> 和 <code>tool_result</code> 里的 <code>tool_use_id</code> 是配对的——
          harness 靠它把「哪个结果对应哪次调用」对上号，尤其在一轮里发了好几个调用时。
        </p>
      </Example>

      <ToolDispatch />

      <h3>这个往返不是一次，而是一个循环</h3>
      <p>
        单看一次 Read 像是「问一句答一句」，但真实的 Agent 是把这个往返<strong>套进一个循环</strong>里反复跑的：
        模型产出意图 → harness 执行 → 结果回灌 → 模型读着结果再产出下一个意图……直到模型觉得活干完了、
        不再要工具，循环才停。这个循环就是 Agent 的「心跳」，所谓「跑了几十轮」说的就是这个循环转了几十圈。
      </p>
      <CodeBlock lang="javascript" title="harness 主循环的骨架" code={loopCode} />
      <p>
        看清这段骨架，你就明白了几件事：第一，<strong>是 harness 而不是模型在控制流程</strong>——
        模型只在每一圈被「叫醒」一次，吐一段文字就又睡过去了，它没有持续运行的进程。第二，
        所谓「上下文越来越长」是因为每一圈的意图和结果都被 <code>push</code> 进了 <code>messages</code>，
        循环转得越多，喂给模型的历史就越厚（这也是后面几章要讲压缩的根源）。第三，
        循环的<strong>终止条件由模型说了算</strong>：它不再要工具时才停——这意味着一个跑飞的模型可能在循环里反复打转，
        所以真实 harness 还会加上「最大轮数」「超时」这类硬性熔断。
      </p>

      <h3>执行失败怎么办：错误也是一种结果</h3>
      <p>
        工具不一定每次都成功：文件不存在、命令返回非零、网络超时……一个常见误区是以为出错就该让循环崩掉。
        恰恰相反，成熟的 harness 会把<strong>错误本身也包成 tool_result</strong> 回灌给模型，让它有机会自我纠偏。
      </p>
      <CodeBlock lang="json" title="把错误回灌给模型" code={errorResultCode} />
      <p>
        这其实是 Agent 比传统脚本「显得聪明」的关键来源之一：脚本遇到异常就 throw 终止，而 Agent 把异常当成
        一条新信息读进去，然后改用别的办法。代价是你得防着它在错误里<strong>原地打转</strong>——
        反复用同样的错参数重试同一个工具。工程上常见的兜底是：连续同样的失败超过 N 次就强行中断，或把累计的报错摘要后再喂回去。
      </p>

      <h2>调度规则：只读可并行，写操作要串行</h2>
      <p>
        模型在一轮里可以一次性产出多个工具调用。harness 拿到这一批后，要决定怎么执行。规则其实很朴素，
        关键看这个工具会不会<strong>改变状态</strong>：
      </p>
      <ul>
        <li>
          <strong>只读工具</strong>（<code>Read</code>、<code>Grep</code>、<code>Glob</code>）彼此互不影响——
          读 a.js 和读 b.js 谁先谁后都一样，所以可以<strong>并行</strong>，省时间。
        </li>
        <li>
          <strong>写工具</strong>（<code>Edit</code>、<code>Bash</code> 等会改文件或环境的）必须<strong>串行</strong>。
          因为它们之间可能有依赖：第二次 Edit 要改的内容，正是第一次 Edit 刚写进去的；若并行，结果就乱了。
        </li>
      </ul>
      <p>
        这条规则的理论名字叫<strong>可交换性（commutativity）</strong>：两个操作如果交换执行顺序、结果不变，
        它们就是可交换的，可交换的操作才能安全并行。读操作天然可交换；写操作通常不可交换。
        数据库领域里这套思路已经成熟几十年了——读读不冲突、读写和写写要加锁，Agent 的工具调度不过是把同样的
        道理搬到了「文件系统 + 子进程」这个更松散的环境里。
      </p>

      <Example title="同时读三个文件 vs 连续改三个文件">
        <p>同样是「三个调用」，调度待遇完全不同：</p>
        <CodeBlock lang="json" title="并行 vs 串行" code={parallelCode} />
        <p>
          上面三个只读调用可以一起发出去、一起等结果，几乎是「同时」完成；下面两个对同一文件的 Edit 则必须
          排队，第一个落盘了第二个才能动手——否则它根本找不到要替换的 <code>y</code>。
        </p>
      </Example>

      <Callout variant="info" title="一个容易被忽略的边界：读写混在同一批">
        <p>
          真实里模型常常一口气产出「读 A、读 B、写 A」这样混合的一批。这时不能简单地「只读全并行、写全串行」就完事——
          那个写 A 必须排在读 A <strong>之后</strong>（否则读到的是改前还是改后？语义就乱了）。所以保守的 harness 往往采用
          一个更稳的策略：<strong>一旦这一批里出现写操作，就整批退化为串行</strong>，按模型给出的顺序老老实实一个个执行。
          牺牲一点速度，换来「顺序即语义」的确定性。
        </p>
      </Callout>

      <KeyIdea title="并行的前提是无副作用">
        <p>
          能不能并行，本质问的是「换个顺序结果会不会变」。只读操作没有副作用、可交换，所以放心并行；
          写操作会留下痕迹、彼此可能依赖，所以老老实实串行，用顺序换取<strong>一致性</strong>。
          这也是为什么 harness 不会傻乎乎把所有调用都丢出去——它得先按工具类型分类。
        </p>
      </KeyIdea>

      <h3>并发也有上限</h3>
      <p>
        并行不是越多越好。社区对主流 harness 的分析提到，一次并行执行的工具数量通常有个上限，
        大约在 <strong>10 个</strong>左右（且可配置）。超出的调用会排队等下一批。原因很现实：
        同时打开太多文件、跑太多子进程，既吃机器资源，也让出错时难以追溯。
      </p>
      <p>
        除了机器资源，还有两个常被忽视的现实约束。一是<strong>外部速率限制</strong>：如果并行的工具背后是
        网络 API（比如同时发十几个 HTTP 请求），很容易撞上对方的 rate limit，反而比串行更慢、更易失败。
        二是<strong>可观测性</strong>：十个子进程同时往终端刷日志，输出交织在一起，人根本看不清是哪个出的错——
        把并发压到个位数，本质是在「速度」和「可调试」之间取一个工程上的折中。这也提醒你：
        给自定义工具设计时，别假设它一定独占机器，要考虑它被并行十份同时跑会不会出问题。
      </p>

      <h2>工具描述就是 prompt</h2>
      <p>
        模型怎么知道有哪些工具、什么时候该用？答案是：每个工具的<strong>名字、描述、参数 schema</strong>，
        会被原原本本拼进模型的上下文里。换句话说，<em>工具描述本身就是 prompt 的一部分</em>。
        描述写得含糊，模型就容易选错工具、传错参数；描述写得清楚，模型用起来就准。
      </p>
      <CodeBlock lang="json" title="一个工具定义长什么样" code={schemaCode} />
      <p>
        注意这段定义里的 <code>description</code> 字段——「old_string 必须在文件中唯一出现」这句话不是给人看的注释，
        而是直接写给模型的指令。模型读到它，就会在调用前自己多读几行上下文、把 <code>old_string</code> 取得够长以保证唯一。
        这就是「描述即 prompt」的实感：你在 schema 里多写一句约束，省下的是模型在循环里撞错、重试的好几轮。
        反过来，schema 还有第二重作用——harness 拿它来<strong>校验参数</strong>，模型若漏传了 <code>required</code> 字段，
        harness 可以直接驳回并把校验错误回灌，根本不用真去执行。
      </p>
      <p>
        但这带来一个矛盾：工具越多，塞进上下文的描述就越长，既占 token，又让模型在一堆相似工具里挑花眼。
        于是出现了<em>工具搜索</em>与<em>延迟加载</em>的做法——平时只把工具的名字列给模型，
        等它确实要用某个工具时，再按需把那个工具的完整定义（参数 schema 等）取过来。
        这样既保住了选择面，又不让上下文被几十上百个工具定义撑爆。
      </p>

      <h3>常见误区：把工具描述当文档，而不是当 prompt</h3>
      <p>
        很多人第一次写工具描述，习惯按 API 文档的腔调写——「本接口用于查询用户信息」。但模型不是在「查 API 手册」，
        它是在<strong>当下这一刻判断要不要用、怎么用</strong>。所以好的描述更像是写给一个聪明但没看过你代码库的新同事的便条：
        什么时候<strong>该</strong>用它、什么时候<strong>不该</strong>用它、有哪些坑要避开、参数有哪些隐含约束。
        举个对比——
      </p>
      <ul>
        <li>
          <strong>差</strong>：<code>{'"description": "搜索文件"'}</code>。模型看不出它和别的搜索工具有何区别，也不知道边界。
        </li>
        <li>
          <strong>好</strong>：「按文件名的 glob 模式搜索路径（如 <code>{'**/*.ts'}</code>），<strong>不</strong>搜文件内容；
          要按内容搜请用 Grep。结果按修改时间排序。」——既说清职责，又主动把它和 Grep 划清界线，模型就不会拿它去搜内容。
        </li>
      </ul>

      <Callout variant="warn" title="工具不是越多越好">
        <p>
          给 Agent 挂一大堆工具看似强大，实则常常变弱：长长的工具描述挤占上下文，相似工具互相干扰，
          模型反而更容易选错。先给最常用的几个，把描述打磨清楚，再用延迟加载兜住长尾，
          往往比一股脑全挂上去更可靠。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        理解「意图—执行—回灌」这个循环，你就抓住了 Agent 的命脉：模型负责<strong>决定做什么</strong>，
        harness 负责<strong>怎么安全地做</strong>。想让 Agent 跑得快，就让它多产出可并行的只读调用；
        想让它跑得稳，就接受写操作必须串行的代价。想让它选对工具，与其堆数量，不如把<strong>工具描述当 prompt 来写</strong>，
        并用工具搜索给长尾工具留位置。
      </p>
      <p>
        再往实战里落一层：当你自己用 Claude Code 或基于 SDK 搭 Agent 时，这套循环模型能帮你定位绝大多数「诡异行为」。
        Agent 卡住不动？多半是它在循环里反复撞同一个工具错误——去看回灌的 tool_result 里有没有反复出现的 <code>is_error</code>。
        Agent 改文件改串了？检查是不是一批里读写混排、顺序被打乱。Agent 老选错工具？别急着换模型，
        先把那两个相似工具的 <code>description</code> 改清楚，把边界划明白。
        几乎所有问题，都能在「意图、执行、回灌」这三段里找到根。
      </p>

      <Practice title="判断哪些调用能并行">
        <p>
          假设模型在一轮里产出了下面这组调用，请判断 harness 会怎么安排它们、哪些能并行、哪些必须串行，并说明理由：
        </p>
        <ul>
          <li><code>Read("config.json")</code></li>
          <li><code>Grep("apiKey", "src/")</code></li>
          <li><code>Edit("config.json", old, new)</code></li>
          <li><code>Read("README.md")</code></li>
          <li><code>Bash("npm test")</code></li>
        </ul>
        <p>
          提示：先把它们分成「只读」和「会改状态」两类；再想想 <code>Edit</code> 改的 config.json 和读 config.json
          之间、<code>Edit</code> 和 <code>Bash("npm test")</code> 之间，顺序换一换结果会不会变。给出一个你认为安全的执行顺序。
        </p>
      </Practice>

      <Summary
        points={[
          '工具调用的本质是「意图—执行—回灌」：模型只生成结构化的 tool_use 意图，真正执行的是 harness，再把 tool_result 回灌给模型。',
          '模型从不直接碰磁盘或环境，它产出的永远只是文字；tool_use_id 负责把调用和结果配对。',
          '这套往返被套进一个 harness 主循环：模型产出意图→执行→回灌→再产出，直到模型不再要工具；流程由 harness 控制，并靠最大轮数/超时熔断。',
          '工具执行失败时错误也会被包成 tool_result 回灌，让模型自我纠偏；但要防它在同一错误上原地打转。',
          '调度规则看副作用（可交换性）：只读工具（Read/Grep/Glob）可交换、可并行；写工具（Edit/Bash）有依赖、必须串行；读写混在一批时保守做法是整批退化为串行。',
          '并行有上限，主流 harness 一次大约并行 10 个工具左右且可配置，超出的排队；上限还受外部速率限制与可观测性约束。',
          '工具的名字、描述与参数 schema 会拼进上下文，所以工具描述就是 prompt——要写边界与约束而非 API 文档；schema 同时被 harness 用来校验参数。',
          '工具太多会撑爆上下文且干扰选择，可用工具搜索/延迟加载：平时只列名字，按需再取完整定义。',
        ]}
      />
    </>
  )
}

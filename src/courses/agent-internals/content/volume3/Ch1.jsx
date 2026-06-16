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

      <Example title="一次 Read 背后的两段文字">
        <p>模型产出意图，harness 执行并把结果回灌——你看到的「读文件」其实是这两段文字的往返：</p>
        <CodeBlock lang="json" title="意图与回灌" code={toolUseCode} />
        <p>
          注意 <code>tool_use</code> 里的 <code>id</code> 和 <code>tool_result</code> 里的 <code>tool_use_id</code> 是配对的——
          harness 靠它把「哪个结果对应哪次调用」对上号，尤其在一轮里发了好几个调用时。
        </p>
      </Example>

      <ToolDispatch />

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

      <Example title="同时读三个文件 vs 连续改三个文件">
        <p>同样是「三个调用」，调度待遇完全不同：</p>
        <CodeBlock lang="json" title="并行 vs 串行" code={parallelCode} />
        <p>
          上面三个只读调用可以一起发出去、一起等结果，几乎是「同时」完成；下面两个对同一文件的 Edit 则必须
          排队，第一个落盘了第二个才能动手——否则它根本找不到要替换的 <code>y</code>。
        </p>
      </Example>

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

      <h2>工具描述就是 prompt</h2>
      <p>
        模型怎么知道有哪些工具、什么时候该用？答案是：每个工具的<strong>名字、描述、参数 schema</strong>，
        会被原原本本拼进模型的上下文里。换句话说，<em>工具描述本身就是 prompt 的一部分</em>。
        描述写得含糊，模型就容易选错工具、传错参数；描述写得清楚，模型用起来就准。
      </p>
      <p>
        但这带来一个矛盾：工具越多，塞进上下文的描述就越长，既占 token，又让模型在一堆相似工具里挑花眼。
        于是出现了<em>工具搜索</em>与<em>延迟加载</em>的做法——平时只把工具的名字列给模型，
        等它确实要用某个工具时，再按需把那个工具的完整定义（参数 schema 等）取过来。
        这样既保住了选择面，又不让上下文被几十上百个工具定义撑爆。
      </p>

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
          '调度规则看副作用：只读工具（Read/Grep/Glob）可交换、可并行；写工具（Edit/Bash）有依赖、必须串行以保一致性。',
          '并行有上限，主流 harness 一次大约并行 10 个工具左右且可配置，超出的排队执行。',
          '工具的名字与描述会拼进上下文，所以工具描述就是 prompt——写得清楚模型才用得准。',
          '工具太多会撑爆上下文且干扰选择，可用工具搜索/延迟加载：平时只列名字，按需再取完整定义。',
        ]}
      />
    </>
  )
}

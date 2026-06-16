import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import SubagentIsolation from '@/courses/agent-internals/illustrations/SubagentIsolation.jsx'

const taskCallCode = `// 主代理派出一个子代理，只交代「任务 + 它需要的工具」
{
  "name": "Task",
  "input": {
    "description": "找出所有调用旧 API 的地方",
    "prompt": "在整个仓库里搜索对 oldFetch() 的调用，逐个确认是真实调用而非注释或字符串，最后只回传一份文件清单。",
    "subagent_type": "Explore"
  }
}

// 子代理在自己的上下文里读了几十个文件、跑了多轮搜索，
// 但回传给主代理的只有一段摘要：
{
  "type": "tool_result",
  "content": "命中 7 处：\\n- src/user.js:42\\n- src/order.js:88\\n- ..."
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          有些子任务很「脏」：要翻几十个文件、跑十几轮搜索、刷出一屏屏日志，可你最后只想要一句结论。
          如果这些中间过程全堆进主对话，主上下文很快就被噪音塞满。子代理（<em>Task</em> 工具）正是为此而生——
          它本质上是一个<strong>上下文隔离器</strong>：把脏活关在一个独立的房间里干完，只把干净的结论端出来。
        </p>
      </Lead>

      <h2>子代理是什么</h2>
      <p>
        子代理不是什么神秘的「第二个 AI」，它就是主代理通过 <code>Task</code> 工具发起的一次<strong>独立运行</strong>。
        它有四个关键特征：
      </p>
      <ul>
        <li><strong>独立上下文</strong>：它有自己的上下文窗口，从一张白纸开始，不背主对话的历史包袱。</li>
        <li><strong>自己的 system 与工具集</strong>：它有自己的系统提示、自己被授予的那一小撮工具。</li>
        <li><strong>只回传摘要</strong>：它处理完一个独立子任务后，只把<strong>最终结果</strong>作为 tool_result 回传父上下文，中间过程留在自己屋里。</li>
        <li><strong>可并行、可限权</strong>：主代理能同时派出多个子代理，且只给每个子代理它真正需要的工具。</li>
      </ul>

      <Example title="派一个子代理去全仓库找旧 API 调用">
        <p>
          假设你要把 <code>oldFetch()</code> 全部换掉，第一步得先找全。这件事会翻遍仓库、读很多文件——典型的「脏活」，
          交给子代理最合适：
        </p>
        <CodeBlock lang="json" title="Task：找旧 API 调用" code={taskCallCode} />
        <p>
          子代理可能读了 30 个文件、做了多轮 Grep，但这些都不会进主上下文。主代理拿到的只是那份七行清单，
          干净、聚焦，正好用来规划下一步的修改。
        </p>
      </Example>

      <SubagentIsolation />

      <h2>为什么要用子代理</h2>
      <p>它的价值可以归到三点，且都直接对应上一章讲的「上下文是稀缺资源」：</p>
      <ul>
        <li>
          <strong>省主上下文</strong>：搜索、调研这类动作会产出大量中间垃圾，隔离在子代理里，
          主上下文就只留结论，能撑得更久、看得更清。
        </li>
        <li>
          <strong>聚焦</strong>：子代理只盯一个独立子任务，系统提示和工具都为它量身定制，干扰更少、更容易做好。
        </li>
        <li>
          <strong>隔离权限</strong>：可以只给子代理只读工具去调研，不给它写权限，把「能搜」和「能改」分开，更安全。
        </li>
      </ul>
      <p>
        Anthropic 自己描述这种模式时说得很直白：让详细的搜索、调研在子代理里进行，<strong>主代理只负责综合各路结果</strong>。
        主代理像项目负责人，子代理像被派出去的调查员——负责人不需要看调查员翻过的每一页纸，只需要那份结案报告。
      </p>

      <KeyIdea title="子代理 = 上下文隔离器">
        <p>
          理解子代理只需记住一句话：它把「过程」和「结论」分开。过程（几十个文件、满屏日志）留在隔离的上下文里随它去，
          结论（一段摘要）才回到主线。它解决的核心问题不是「让 AI 更聪明」，而是
          <strong>不让主上下文被中间过程塞爆</strong>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="隔离是有代价的">
        <p>
          正因为子代理从白纸起步，它<strong>拿不到主上下文里的隐含约束</strong>——你在主对话里随口定下的命名规范、
          上一步刚发现的坑、项目特有的口味，子代理统统不知道。所以派活时要把它需要的背景<strong>显式写进任务描述</strong>，
          别指望它「自己懂」。隔离省下了上下文，代价就是这份信息不会自动流过去。
        </p>
      </Callout>

      <h2>它不是「多 Agent 编排」</h2>
      <p>
        别把子代理想成那种复杂的多 Agent 协作系统——一堆 Agent 互相对话、协商、扮演不同角色。这里的子代理朴素得多：
        主代理派出去、子代理干完一个独立子任务、回传摘要，关系就结束了。它是一个<strong>工具</strong>，
        不是一套编排框架。把它当成「带隔离的一次性外包」来理解，恰到好处。
      </p>

      <h2>这对你意味着什么</h2>
      <p>
        当你发现一个步骤会产生大量你最终并不关心的中间内容——全仓库搜索、读一大批文件、跑探索性命令——
        那就是动用子代理的信号。设计时问自己三件事：<strong>这个子任务是否独立</strong>？
        <strong>它最终只需回传什么摘要</strong>？<strong>它最少需要哪些工具</strong>？想清楚这三点，
        子代理就能既省上下文又安全。
      </p>

      <Practice title="设计一个「代码审查子代理」">
        <p>
          你要派一个子代理去审查一个 Pull Request。请设计它，至少回答：
        </p>
        <ul>
          <li><strong>目标</strong>：它要产出什么？（提示：一份按严重程度分类的问题清单，而不是把 diff 重复一遍）</li>
          <li><strong>该给哪些工具</strong>：它需要 <code>Read</code>、<code>Grep</code> 这类只读工具吗？该不该给它 <code>Edit</code> 或 <code>Bash</code>？为什么？</li>
          <li><strong>该回传什么摘要</strong>：哪些中间过程应当留在子代理里、不回主上下文？</li>
          <li><strong>要显式交代哪些隐含约束</strong>：项目的代码规范、本次改动的关注点，怎样写进任务描述才不会丢？</li>
        </ul>
      </Practice>

      <Summary
        points={[
          '子代理（Task 工具）本质是上下文隔离器：把会产生大量中间内容的独立子任务关进一个独立运行里。',
          '它有自己的上下文窗口、自己的 system 与工具集，处理完只把最终结果摘要作为 tool_result 回传父上下文。',
          '用它的三大理由：省主上下文、聚焦单一子任务、按需限权（比如只给只读工具去调研）。',
          'Anthropic 的用法是让详细搜索/调研在子代理里进行，主代理只综合结果，像负责人只看结案报告。',
          '代价：子代理从白纸起步，拿不到主上下文的隐含约束，必须把背景显式写进任务描述。',
          '它不是复杂的多 Agent 编排，而是一个带隔离的一次性工具——派出、干完、回传摘要即结束。',
        ]}
      />
    </>
  )
}

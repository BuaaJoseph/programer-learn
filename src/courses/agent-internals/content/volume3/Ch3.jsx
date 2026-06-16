import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import TaskCompare from '@/courses/agent-internals/illustrations/TaskCompare.jsx'

const tasksCode = `查 bug:   「修一下登录按钮点了没反应的问题」
加功能:   「给用户设置页加一个深色模式开关，记住选择」
大重构:   「把整个项目的状态管理从 Redux 迁移到 Zustand」`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          为什么同样一句指令，有的 Agent 一轮就交活，有的要折腾几十轮？不是模型时好时坏，而是
          <strong>任务本身的形状不同</strong>。这一章把三类最常见的开发任务——查 bug、加功能、大重构——
          的内部执行路径并排摆出来，你会看到：任务越大越开放，用到的脚手架机制就越多，轮数也越多。
        </p>
      </Lead>

      <h2>三类任务，三条路径</h2>
      <p>
        先看三个真实形态的指令，它们的「确定性」和「广度」差异极大：
      </p>
      <CodeBlock lang="text" title="三类任务的典型指令" code={tasksCode} />

      <h3>查 bug：范围小，几轮收敛</h3>
      <p>
        bug 通常有明确症状、明确落点。Agent 的路径很短：定位（读几个相关文件、搜一下报错）→ 改一处 → 验证。
        范围小、目标清晰，<strong>几轮就能收敛</strong>，一般<strong>不需要计划、也不需要子代理</strong>，
        更不用反复问你。这就是「直接干」的典型。
      </p>

      <h3>加功能：要规划，约十轮</h3>
      <p>
        加功能比修 bug 开放：要在已有结构里找合适的落点、可能动到好几个文件、改完还要验证。
        路径变长——通常会<strong>先做个轻量规划</strong>，<strong>可能问你一次</strong>（比如「开关默认开还是关」），
        然后多次修改与验证交替，<strong>大约十轮上下</strong>。它用到的脚手架比查 bug 多一层：规划。
      </p>

      <h3>大重构：规划 + 子代理 + 多次人审，几十轮</h3>
      <p>
        大重构是最开放的：影响面遍布全项目、充满不确定。它几乎会动用所有脚手架——
        <strong>先规划</strong>、派<strong>子代理去调研</strong>（全仓库找出所有受影响的地方，见上一章）、
        分批修改并<strong>多次请人审阅</strong>、过程中还要<strong>压缩上下文</strong>以免被海量中间信息撑爆，
        往往要跑<strong>几十轮</strong>。
      </p>

      <Example title="同一个动词「改」，三种执行路径">
        <p>把三类任务的内部路径并排看，差异一目了然：</p>
        <ul>
          <li>
            <strong>查 bug</strong>　轮数：几轮｜计划：否｜子代理：否｜问用户：基本不问｜上下文压缩：不需要
          </li>
          <li>
            <strong>加功能</strong>　轮数：约十轮｜计划：轻量｜子代理：通常不必｜问用户：可能一次｜上下文压缩：一般不需要
          </li>
          <li>
            <strong>大重构</strong>　轮数：几十轮｜计划：是｜子代理：是（调研）｜问用户：多次人审｜上下文压缩：需要
          </li>
        </ul>
      </Example>

      <TaskCompare />

      <KeyIdea title="确定性与广度决定脚手架">
        <p>
          决定一个任务跑几轮、用哪些机制的，是两个维度：<strong>确定性</strong>（目标和落点有多清楚）和
          <strong>广度</strong>（影响多少代码）。越确定、越窄，就越接近「直接干」；越开放、越宽，
          就越需要规划、子代理、人审、上下文压缩这些脚手架来兜住复杂度。轮数多不是浪费，是任务形状的必然结果。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="给错脚手架两头都坏">
        <p>
          给小任务套大流程——让 Agent 为一个一行 bug 先写计划、再派子代理调研——是纯浪费，又慢又啰嗦。
          反过来，给大重构按小任务「直接干」，则极可能跑飞：没规划就乱改、不调研就漏掉受影响处、不请人审就把全项目带沟里。
          关键是<strong>给任务配相称的脚手架</strong>。
        </p>
      </Callout>

      <h2>这对你意味着什么</h2>
      <p>
        派活之前，先在心里给任务定个位：它确定吗？它宽吗？答案会直接告诉你该不该「先规划」。
        症状明确、落点单一的，放手让它直接干；要碰好几个文件、有取舍要定的，让它先简单规划、必要时问你一句；
        牵动全局、充满未知的，就别指望一口气吃完——明确要求它先规划、用子代理调研、并安排你来把关。
        <strong>你对任务形状判断得越准，Agent 表现得就越稳。</strong>
      </p>

      <Practice title="给你自己的三个任务归类并预测路径">
        <p>
          从你正在做的项目里挑三个真实任务，分别归入「查 bug / 加功能 / 大重构」，然后为每个预测它的执行路径：
        </p>
        <ul>
          <li>它大概要跑<strong>几轮</strong>？</li>
          <li>需要<strong>先规划</strong>吗？</li>
          <li>会用到<strong>子代理</strong>去调研吗？</li>
          <li>过程中<strong>该不该问你（或请你审）</strong>？几次？</li>
        </ul>
        <p>
          填完后回头检查：你的预测和「确定性 + 广度」这两个维度对得上吗？如果一个任务你说不准它属于哪类，
          那往往说明它<strong>还没拆够细</strong>——先把它拆成更确定的子任务再派。
        </p>
      </Practice>

      <Summary
        points={[
          '同一句指令轮数差很多，根源不是模型，而是任务形状：取决于它的确定性与广度。',
          '查 bug：范围小、目标清晰，几轮收敛，通常不需要计划、子代理或反复问用户——典型「直接干」。',
          '加功能：较开放，需轻量规划、可能问一次、多次改与验证交替，约十轮。',
          '大重构：最开放，几乎用上全部脚手架——规划、子代理调研、多次人审、上下文压缩，跑几十轮。',
          '任务越大越开放，用到的脚手架机制越多、轮数越多；给错脚手架（小任务套大流程或反之）两头都坏。',
          '派活前先判断任务的确定性与广度来决定「直接干」还是「先规划」；判断不准往往说明任务还没拆够细。',
        ]}
      />
    </>
  )
}

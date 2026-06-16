import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果说 LangChain 给了你「链」，那 LangGraph 给你的是一张「图」。它是 LangChain
        生态里专门负责底层编排的框架，用来构建那些长期运行、有状态、需要被严格控制的 Agent。
        本章我们把它的核心原理一次讲透：StateGraph、条件边、checkpointer 与 interrupt。
      </Lead>

      <h2>它是什么，为什么重要</h2>
      <p>
        LangGraph 是 LangChain 团队推出的低层编排框架。它不替你「想」，而是替你「管」——
        管控流走哪、管状态存什么、管什么时候停下来等人。<strong>LangGraph 1.0 已于
        2025 年 10 月正式 GA</strong>，官方承诺在 2.0 发布前不会破坏现有 API，可以放心
        用于生产。Uber、LinkedIn、Klarna 等公司都在用它支撑真实业务的 Agent。
      </p>

      <KeyIdea>
        把 Agent 建成一张可控的状态图——这是 LangGraph 的世界观。相比让模型自由发挥，
        显式的图给你最强的控制力：每一步走向、每一份状态、每一个暂停点都清清楚楚。
      </KeyIdea>

      <h2>核心抽象</h2>
      <h3>StateGraph + 类型化 State</h3>
      <ul>
        <li>
          整张图运行在一个共享的、带类型定义的 <code>State</code> 上。State 通常是一个
          带类型注解的字典（如 <code>TypedDict</code>），声明了这张图里会流动哪些字段。
        </li>
      </ul>

      <h3>节点 node</h3>
      <ul>
        <li>
          一个节点就是一个函数：输入当前 <code>state</code>，输出对 state 的更新。节点可以是
          一次 LLM 调用、一次工具执行，或任意 Python 逻辑。
        </li>
      </ul>

      <h3>边 / 条件边</h3>
      <ul>
        <li>
          普通边把两个节点固定连起来。<strong>条件边（conditional edges）</strong>则用一个
          路由函数，根据当前 state 决定「下一跳去哪个节点」。正是靠条件边，你才能构造出
          ReAct 循环、分支选择、循环回退这些复杂控制流。
        </li>
      </ul>

      <h3>reducer</h3>
      <ul>
        <li>
          reducer 定义某个 state 字段「如何合并更新」。例如消息列表常用
          <code>add_messages</code> 做追加合并，数值或列表也可以用
          <code>operator.add</code>。没有 reducer 时，新值会直接覆盖旧值。
        </li>
      </ul>

      <h3>checkpointer / 持久化</h3>
      <ul>
        <li>
          配上 checkpointer 后，图会在<strong>每个节点之后保存一份 state 快照</strong>。
          这带来三件事：记忆（同一 <code>thread_id</code> 跨轮次记住上下文）、可恢复
          （崩溃后从断点继续）、容错。它是「长期运行 Agent」的根基。
        </li>
      </ul>

      <h3>interrupt / 人在回路</h3>
      <ul>
        <li>
          <code>interrupt()</code> 让图在某个点<strong>暂停</strong>，把一个请求抛给外部，
          等待人类输入。外部用 <code>Command(resume=...)</code> 把决定传回去，图就从断点
          继续。这就是「人审闸门」的实现方式——危险动作执行前先停下等人批准。
        </li>
      </ul>

      <h3>预制件 create_react_agent</h3>
      <ul>
        <li>
          如果你只想要一个开箱即用的 ReAct agent，不必自己画图：
          <code>create_react_agent</code> 已经把「调模型 → 调工具 → 再调模型」的循环图
          搭好了，传入 model、tools（可选 checkpointer）即可。
        </li>
      </ul>

      <h2>它的范式</h2>
      <p>
        LangGraph 的范式是<strong>图编排 / 显式状态机</strong>：低层、可控。它不像高层
        框架那样把流程藏起来，而是要求你把控制流明明白白画出来。这换来的是可调试性和
        生产可靠性。
      </p>

      <Example title="为什么要显式状态图">
        想象一个跑几十分钟、要调十几个工具、中途可能失败重试、还要在转账前等人审批的
        长任务。如果完全交给模型「自由发挥」，你几乎无法调试它走偏的那一步，也无法在
        崩溃后从中间恢复。而把「下一步走哪、状态存什么、何时停下等人」显式画成一张图，
        每一步都可观测、可断点续跑、可在关键处插入人审。复杂长任务里，可控性比灵活性更值钱。
      </Example>

      <h2>适合 / 不适合</h2>
      <p>
        <strong>适合：</strong>复杂、长期运行、多步骤的工作流；需要显式控制流、循环、
        持久化执行、人审闸门、确定性分支的场景；以及对生产可靠性要求高的 Agent 系统。
      </p>
      <p>
        <strong>不适合：</strong>极简单的单次调用，或简单的线性链——这种情况用裸 LangChain
        就够了，套上 LangGraph 反而是过度设计。另外要清楚：它的学习曲线较陡，<strong>不是
        可视化拖拽工具</strong>，而是要写代码定义图。
      </p>

      <Callout variant="tip">
        下一章我们就动手：用 <code>langchain-openai</code> 的 <code>ChatOpenAI</code> 接上
        阿里云百炼的 OpenAI 兼容端点跑 Qwen，配合 <code>create_react_agent</code> +
        checkpointer + interrupt，做一个带记忆和人工审批的理财助手。
      </Callout>

      <Summary
        points={[
          'LangGraph 是 LangChain 生态的底层编排框架，1.0 已于 2025-10 GA，用于构建长期运行、有状态的 Agent。',
          '核心抽象：类型化 State 上跑的 StateGraph、输入输出 state 的节点、用路由函数决定下一跳的条件边。',
          'reducer 定义 state 字段如何合并（如 add_messages、operator.add）。',
          'checkpointer 在每个节点后保存状态，带来记忆、可恢复与容错；同一 thread_id 跨轮记上下文。',
          'interrupt() 暂停等外部输入，Command(resume=...) 续跑，用来做人审闸门。',
          'create_react_agent 是开箱即用的 ReAct 预制件；范式是显式状态机，控制力最强但学习曲线较陡。',
          '适合复杂长任务与生产可靠性场景，简单线性链用裸 LangChain 即可，别过度设计。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const stateCode = `from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages


# State 是整张图共享的"内存"。Annotated 的第二个参数是 reducer，
# 决定节点返回的同名字段如何"合并"进现有 State。
class State(TypedDict):
    # add_messages：把新消息追加到列表，而不是整体覆盖
    messages: Annotated[list, add_messages]


graph = StateGraph(State)`

const nodeEdgeCode = `def call_model(state: State) -> dict:
    # 节点是普通函数：入参是当前 State，返回值是"对 State 的局部更新"
    reply = llm.invoke(state["messages"])
    return {"messages": [reply]}  # 经 add_messages 追加进 messages


graph.add_node("model", call_model)
graph.add_edge(START, "model")   # 固定边：START 之后一定走 model
graph.add_edge("model", END)`

const condEdgeCode = `def route(state: State) -> str:
    """路由函数：读 State，返回下一个节点的名字（字符串）。"""
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"      # 模型要调工具 → 去 tools 节点
    return END              # 没有工具调用 → 结束


# 条件边：从 model 出发，由 route 决定下一跳，可路由到 tools 或 END
graph.add_conditional_edges("model", route, {"tools": "tools", END: END})
# tools 跑完再回到 model，形成 ReAct 循环
graph.add_edge("tools", "model")`

const checkpointCode = `from langgraph.checkpoint.memory import InMemorySaver

app = graph.compile(checkpointer=InMemorySaver())

# thread_id 是一次"会话"的标识。同一个 thread_id 的多次 invoke 共享历史。
config = {"configurable": {"thread_id": "user-42"}}
app.invoke({"messages": [{"role": "user", "content": "你好"}]}, config)
app.invoke({"messages": [{"role": "user", "content": "我刚说了什么？"}]}, config)
# 第二次调用能"记得"第一次——因为 checkpointer 在每个节点后存了档`

const interruptCode = `from langgraph.types import interrupt, Command


def approval_node(state: State) -> dict:
    # interrupt() 会让整张图在此处"暂停"，把 payload 抛回给调用方
    decision = interrupt({"question": "是否批准这笔操作？"})
    # 当外部用 Command(resume=...) 续跑时，decision 拿到 resume 的值
    if decision == "approve":
        return {"messages": [{"role": "system", "content": "已批准"}]}
    return {"messages": [{"role": "system", "content": "已拒绝"}]}


# 触发暂停的那次 invoke，返回值里会带 "__interrupt__"
result = app.invoke({"messages": [...]}, config)
if "__interrupt__" in result:
    payload = result["__interrupt__"][0].value     # 拿到 interrupt 抛出的内容
    app.invoke(Command(resume="approve"), config)  # 把人的决定喂回去`

const prebuiltCode = `from langgraph.prebuilt import create_react_agent

# 一行造出一个完整的 ReAct Agent：内部已经帮你画好
# model → (条件边) → tools → model 的循环图
agent = create_react_agent(
    model=llm,
    tools=[get_balance, transfer_money],
    checkpointer=InMemorySaver(),
)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果说 LangChain 给了你「链」，那 LangGraph 给你的是一张「图」。它是 LangChain
        生态里专门负责底层编排的框架，用来构建那些长期运行、有状态、需要被严格控制的 Agent。
        本章我们把核心原理一次讲透：StateGraph、条件边、checkpointer 与 interrupt——
        理解了这四件套，你就理解了 LangGraph 的世界观。
      </Lead>

      <h2>它是什么，为什么重要</h2>
      <p>
        LangGraph 由 <strong>LangChain 团队</strong>出品，定位是 LangChain 生态的「底层编排框架」，
        专门服务于长期运行、有状态的 Agent。它不替你「想」，而是替你「管」——管控制流走哪条路、
        管状态里存什么、管什么时候停下来等人。<strong>LangGraph 1.0 已于 2025 年 10 月 22 日
        与 LangChain 1.0 一起正式 GA</strong>，官方承诺在 2.0 发布前不会破坏现有 API，最新版本
        约 v1.2.5，可以放心用于生产。Uber、LinkedIn、Klarna 等公司都在用它支撑真实业务的 Agent。
      </p>

      <KeyIdea>
        把 Agent 建成一张可控的状态图——这是 LangGraph 的世界观。相比让模型「自由发挥」，
        显式的图给你最强的控制力：每一步走向、每一份状态、每一个暂停点都清清楚楚、可调试、可恢复。
      </KeyIdea>

      <h2>起源：LangChain 为何在 2024 推出 LangGraph</h2>
      <p>
        早期的 LangChain 以「链（Chain）」为核心抽象：把若干步骤串成一条流水线，A 的输出喂给 B，
        B 喂给 C。这对线性任务很顺手，但 Agent 的本质是<strong>带反馈的循环</strong>——
        模型先想、调工具、看结果、再想、再调，直到任务完成。这种「有环、有状态」的控制流，
        链式抽象天生不擅长表达：你很难在一条直链里优雅地表达「如果工具失败就重试」「让人审一下再继续」。
      </p>
      <p>
        于是 LangChain 团队在 2024 年抽出底层，推出 LangGraph，把编排重新建模为
        <strong>有向图 + 共享状态</strong>。节点是计算步骤，边是控制流，条件边负责动态路由，
        于是「循环」「分支」「重试」「暂停」全都成了图上一等公民。
        2025 年 10 月的 1.0 GA 是一个分水岭：API 稳定、向后兼容承诺、配套
        LangSmith 可观测与 LangGraph Platform 部署，标志着它从「实验框架」变成「生产基座」。
      </p>

      <h2>设计理念：状态机，而非黑盒循环</h2>
      <p>
        很多 Agent 框架把循环藏在框架内部，你只看到「输入问题 → 吐出答案」，中间发生了什么是个黑盒。
        LangGraph 反其道而行：让你<strong>显式地把循环画出来</strong>。每个节点你自己写，每条边你自己连，
        每个暂停点你自己定。代价是要多写一点结构代码，回报是：
      </p>
      <ul>
        <li><strong>显式</strong>：控制流写在图里，一眼看清 Agent 会怎么走。</li>
        <li><strong>可控</strong>：条件边由你写的路由函数决定，模型不能「越界」。</li>
        <li><strong>可调试</strong>：每个节点的输入输出都能看到，配合 LangSmith 能逐步回放。</li>
        <li><strong>可恢复</strong>：checkpointer 在每个节点后存档，崩溃后可从断点续跑。</li>
        <li><strong>可人审</strong>：interrupt 让图在任意节点暂停，等人拍板再继续。</li>
      </ul>

      <h2>架构总览</h2>
      <ArchDiagram framework="langgraph" />
      <p>
        把数据流走一遍：你 <code>invoke</code> 一个输入，它进入图的 <code>START</code>；
        命中某个<strong>节点</strong>，节点函数读取并更新 <code>State</code>（更新经 reducer 合并）；
        到达<strong>条件边</strong>时，路由函数读 State 决定下一跳——可能回到自己形成循环、可能分支、可能去 END；
        每个节点执行后，<strong>checkpointer</strong> 把当前 State 存档（关联到 thread_id）；
        如果节点里调用了 <code>interrupt()</code>，整张图<strong>暂停</strong>，把 payload 抛回给你，
        等你用 <code>Command(resume=...)</code> 续跑；直到走到 <code>END</code>，本次执行结束。
      </p>

      <h2>核心组件逐个详解</h2>
      <h3>StateGraph 与类型化 State</h3>
      <p>
        整张图运行在一个共享的、带类型定义的 <code>State</code> 上。State 通常是一个
        <code>TypedDict</code>（也可用 Pydantic 模型）。关键在于每个字段可以带一个
        <strong>reducer</strong>：节点返回同名字段时，reducer 决定「怎么合并进现有 State」。
        最常用的是 <code>add_messages</code>（追加消息）和 <code>operator.add</code>（列表拼接）。
      </p>
      <CodeBlock lang="python" title="State 与 reducer" code={stateCode} />
      <Callout>
        没写 reducer 的字段，默认行为是<strong>整体覆盖</strong>；写了 reducer（如 add_messages）
        才是<strong>合并/追加</strong>。消息历史几乎一定要用 add_messages，否则每个节点都会把历史冲掉。
      </Callout>

      <h3>节点 node 与边 edge</h3>
      <p>
        节点是普通函数：入参是当前 <code>State</code>，返回值是「对 State 的局部更新」（一个字典）。
        <code>add_node</code> 注册节点，<code>add_edge</code> 连固定边（从 A 之后一定走 B），
        <code>START</code> 和 <code>END</code> 是两个特殊端点。
      </p>
      <CodeBlock lang="python" title="add_node / add_edge" code={nodeEdgeCode} />

      <h3>条件边 add_conditional_edges</h3>
      <p>
        这是 LangGraph 表达「智能」的地方。条件边接一个<strong>路由函数</strong>：读 State，
        返回下一个节点的名字（字符串）。靠它，你能画出 ReAct 循环（模型 ↔ 工具来回）、
        多路分支、重试逻辑——而且路由规则是你写死的代码，不受模型摆布。
      </p>
      <CodeBlock lang="python" title="条件边与路由函数" code={condEdgeCode} />

      <h3>checkpointer 持久化</h3>
      <p>
        <code>compile(checkpointer=...)</code> 给图装上「存档器」。它在<strong>每个节点执行后</strong>
        把当前 State 快照存下来，关联到一个 <code>thread_id</code>。开发期用
        <code>InMemorySaver</code>（进程内存）；生产用 <code>SqliteSaver</code> / <code>PostgresSaver</code>
        落盘。它一次性带来三种能力：<strong>跨轮记忆、断点恢复、容错</strong>。
      </p>
      <CodeBlock lang="python" title="InMemorySaver 与 thread_id" code={checkpointCode} />

      <h3>interrupt + Command(resume)</h3>
      <p>
        在节点里调用 <code>interrupt(payload)</code>，整张图会<strong>暂停</strong>在这里，
        把 payload 抛回给调用方；外部决定好后，用 <code>Command(resume=值)</code> 再次 invoke，
        图从暂停处继续，<code>interrupt()</code> 的返回值就是你 resume 进来的那个值。
        触发暂停的那次返回结果里会带 <code>{'__interrupt__'}</code> 这个键，用它来检测「是否需要人介入」。
      </p>
      <CodeBlock lang="python" title="interrupt 暂停 + Command 续跑" code={interruptCode} />

      <h3>create_react_agent 预制件</h3>
      <p>
        如果你只想要一个标准 ReAct Agent，不想手画图，用预制件
        <code>create_react_agent</code>：传入模型、工具、checkpointer，它内部就帮你建好了
        「模型 → 条件边 → 工具 → 模型」的循环图。下一章的实战代码就用它。
      </p>
      <CodeBlock lang="python" title="create_react_agent" code={prebuiltCode} />

      <h2>「图」vs「链」vs「自由循环」</h2>
      <p>
        三种编排哲学，对应三种复杂度：
      </p>
      <table>
        <thead>
          <tr><th>方式</th><th>控制流</th><th>适合</th><th>短板</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>链（裸 LangChain）</td>
            <td>线性、固定</td>
            <td>简单流水线、单次问答</td>
            <td>不擅长循环、分支、状态</td>
          </tr>
          <tr>
            <td>自由循环（黑盒 Agent）</td>
            <td>模型自己决定</td>
            <td>原型、轻量任务</td>
            <td>不可控、难调试、难恢复</td>
          </tr>
          <tr>
            <td>显式图（LangGraph）</td>
            <td>图 + 条件边，你定规则</td>
            <td>复杂长任务、生产可靠性</td>
            <td>要写结构代码、学习曲线陡</td>
          </tr>
        </tbody>
      </table>
      <Example title="条件边如何实现 ReAct">
        ReAct 的本质就是一个两节点循环：<code>model</code> 节点让大模型思考并可能发起工具调用，
        条件边检查「最后一条消息里有没有 tool_calls」——有就路由到 <code>tools</code> 执行，
        执行完用固定边回到 <code>model</code>；没有就路由到 <code>END</code> 结束。
        循环、终止条件、工具调用，全都写在图里，清清楚楚。
      </Example>

      <h2>持久化与记忆</h2>
      <p>
        checkpointer 是 LangGraph 区别于「无状态链」的灵魂。它带来三件事：
      </p>
      <ul>
        <li>
          <strong>跨轮记忆</strong>：同一个 <code>thread_id</code> 的多次 invoke 共享历史，
          Agent 自然「记得」上一轮说了什么——你不用手动拼接对话历史。
        </li>
        <li>
          <strong>断点恢复</strong>：进程崩溃或被 interrupt 暂停后，凭 thread_id 就能从最近一次存档继续，
          不必从头重跑。
        </li>
        <li>
          <strong>容错</strong>：每个节点后都有快照，单个节点失败重试时状态不会丢。
        </li>
      </ul>
      <Callout>
        开发用 InMemorySaver（重启即丢）；生产务必换成 <code>SqliteSaver</code> 或
        <code>PostgresSaver</code>，把存档真正落盘，这样记忆与恢复才能跨进程、跨重启生效。
      </Callout>

      <h2>人在回路（Human-in-the-Loop）</h2>
      <p>
        高风险操作（转账、删库、对外发消息）不该让 Agent 自己拍板。LangGraph 的做法是在关键节点
        调用 <code>interrupt()</code>：图暂停，把「我要做什么」的描述抛给人；人看完，
        用 <code>Command(resume="approve")</code> 或 <code>Command(resume="reject")</code> 把决定喂回去，
        图从原地继续，<code>interrupt()</code> 的返回值就是这个决定。典型审批场景：
      </p>
      <ul>
        <li>转账 / 支付前的人工确认；</li>
        <li>对外发邮件 / 工单前的内容审核；</li>
        <li>不可逆操作（删除、上线）前的二次确认。</li>
      </ul>
      <p>
        判断「图是否暂停了」靠检测返回值里的 <code>{'__interrupt__'}</code> 键，
        其 <code>[0].value</code> 就是你 interrupt 时抛出的 payload。
      </p>

      <h2>适合 / 不适合，以及生态</h2>
      <p><strong>适合 LangGraph 的场景：</strong></p>
      <ul>
        <li>复杂、长流程的任务，步骤多、需要循环与重试；</li>
        <li>需要显式控制流、确定性分支，而不是把一切交给模型自由发挥；</li>
        <li>需要持久化记忆、断点恢复、容错；</li>
        <li>需要人在回路审批的高风险业务；</li>
        <li>对生产可靠性、可观测性有要求的系统。</li>
      </ul>
      <p><strong>不太适合的场景：</strong></p>
      <ul>
        <li>极简单的单次调用、一问一答——直接调模型即可；</li>
        <li>纯线性的提示拼接流水线——裸 LangChain 的链就够了，上图反而增加心智负担。</li>
      </ul>
      <p>
        要注意它<strong>学习曲线偏陡</strong>：State / reducer / 条件边 / checkpointer 这套概念需要时间消化。
        配套生态值得一提：<strong>LangSmith</strong> 提供可观测与逐步追踪，
        <strong>LangGraph Platform</strong> 提供托管部署与长时运行的基础设施，二者与 LangGraph 无缝衔接。
      </p>

      <Summary
        points={[
          'LangGraph 是 LangChain 团队的底层编排框架，把 Agent 建模为「有向图 + 共享状态」，1.0 已于 2025-10-22 GA 并承诺 API 稳定。',
          '四件套：StateGraph/State（带 reducer，如 add_messages）、节点与边、条件边（路由函数决定下一跳，构造 ReAct/循环/分支）、checkpointer（每节点后存档）。',
          'checkpointer 带来跨轮记忆、断点恢复、容错；同一 thread_id 共享历史；生产用 Sqlite/Postgres saver。',
          'interrupt() 让图暂停并抛出 payload（返回值带 __interrupt__），Command(resume=...) 把人的决定喂回继续，实现人在回路审批。',
          'create_react_agent 是预制 ReAct Agent；适合复杂长任务/控制流/持久化/人审/生产可靠性，不适合极简单线性任务；配套 LangSmith 与 LangGraph Platform。',
        ]}
      />
    </article>
  )
}

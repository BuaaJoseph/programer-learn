import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `# 1. 安装依赖（LangGraph 1.x + 接百炼用的 langchain-openai）
pip install -U langgraph langchain-openai

# 2. 配置百炼（阿里云 DashScope）API Key
export DASHSCOPE_API_KEY="sk-你的key"

# 3. 运行示例
python examples/agent-frameworks/04-langgraph/react_memory_hitl.py`

const mainCode = `import os

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command, interrupt

llm = ChatOpenAI(
    model="qwen-plus",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)


def get_balance() -> str:
    """查询账户余额（只读，无需审批）。"""
    return "当前余额：1000 元。"


def transfer_money(to: str, amount: float) -> str:
    """给某人转账。执行前会触发人工审批。"""
    decision = interrupt({"action": "transfer", "to": to, "amount": amount})
    if decision == "approve":
        return f"已向 {to} 转账 {amount} 元。"
    return "用户拒绝了这笔转账。"


agent = create_react_agent(
    model=llm,
    tools=[get_balance, transfer_money],
    checkpointer=InMemorySaver(),
)


def main() -> None:
    config = {"configurable": {"thread_id": "user-1"}}

    r1 = agent.invoke({"messages": [{"role": "user", "content": "我还有多少钱？"}]}, config)
    print("助手:", r1["messages"][-1].content)

    r2 = agent.invoke({"messages": [{"role": "user", "content": "给张三转 200 元"}]}, config)
    if "__interrupt__" in r2:
        req = r2["__interrupt__"][0].value
        print("需要审批:", req)
        r3 = agent.invoke(Command(resume="approve"), config)
        print("助手:", r3["messages"][-1].content)


if __name__ == "__main__":
    main()`

const handGraphCode = `from typing import Annotated, TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import InMemorySaver


class State(TypedDict):
    messages: Annotated[list, add_messages]


tools = [get_balance, transfer_money]
llm_with_tools = llm.bind_tools(tools)


def call_model(state: State) -> dict:
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


def should_continue(state: State) -> str:
    """路由函数：模型要调工具就去 tools，否则结束。"""
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


graph = StateGraph(State)
graph.add_node("model", call_model)
graph.add_node("tools", ToolNode(tools))   # 预制工具节点，自动执行 tool_calls
graph.add_edge(START, "model")
graph.add_conditional_edges("model", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "model")           # 工具跑完回到 model —— ReAct 循环

app = graph.compile(checkpointer=InMemorySaver())
# 这张手画的图，效果等价于上面的 create_react_agent，但每条边都在你掌控之中`

const sqliteCode = `from langgraph.checkpoint.sqlite import SqliteSaver

# 把存档落到磁盘文件，重启进程后记忆与断点依然在
with SqliteSaver.from_conn_string("checkpoints.sqlite") as saver:
    agent = create_react_agent(model=llm, tools=tools, checkpointer=saver)
    agent.invoke({"messages": [...]}, {"configurable": {"thread_id": "user-1"}})`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，这一章我们把 LangGraph 跑起来：一个接百炼 qwen-plus 的「账户助手」Agent，
        既能查余额（只读直接答），又能转账（高风险，先暂停等人审批再执行）。
        一份代码同时演示了三件硬核能力——<strong>记忆、人在回路、续跑</strong>。
        我们逐行拆，再手写一版等价的 StateGraph 体会「显式控制」。
      </Lead>

      <h2>安装与环境</h2>
      <p>
        本示例用 <code>langchain-openai</code> 的 <code>ChatOpenAI</code> 以 OpenAI 兼容模式接入
        阿里云百炼（DashScope）。先装依赖、配 Key，再运行：
      </p>
      <CodeBlock lang="bash" title="安装与运行" code={installCode} />
      <Callout>
        百炼提供了 OpenAI 兼容端点，所以不需要专门的 SDK：只要把 <code>base_url</code> 指向
        <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>，<code>model</code> 填
        <code>qwen-plus</code>，<code>api_key</code> 用你的 DASHSCOPE_API_KEY 即可。
      </Callout>

      <h2>完整示例代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/04-langgraph/react_memory_hitl.py"
        code={mainCode}
      />

      <KeyIdea>
        盯住三条主线：<strong>thread_id</strong> 串起记忆、<strong>interrupt</strong> 拦下高风险动作、
        <strong>Command(resume)</strong> 把人的决定喂回去续跑。三者都建立在 checkpointer 之上。
      </KeyIdea>

      <h2>逐段拆解</h2>

      <h3>① 接入百炼模型</h3>
      <p>
        <code>ChatOpenAI</code> 三个参数就够：<code>model="qwen-plus"</code> 选模型、
        <code>base_url</code> 指向百炼兼容端点、<code>api_key</code> 从环境变量读。
        从这里拿到的 <code>llm</code> 与任何 OpenAI 模型用法完全一致，下游代码不必关心底层是谁。
      </p>

      <h3>② 两个工具：只读 vs 高风险</h3>
      <p>
        <code>get_balance</code> 是只读查询，直接返回结果，无需审批。
        <code>transfer_money</code> 是高风险操作，函数体里第一件事就是调用
        <code>interrupt(...)</code>——把「要给谁转多少」的描述抛出去暂停。
        关键点：<strong>interrupt 写在工具内部</strong>，所以模型一旦决定调这个工具，
        执行立刻被拦在「真正转账」之前。<code>decision</code> 拿到的是外部 resume 进来的值，
        是 <code>"approve"</code> 才真正执行，否则拒绝。
      </p>
      <Callout>
        函数的 docstring（如「执行前会触发人工审批」）会被当作工具说明传给模型，
        模型靠它判断何时该调哪个工具。写清楚 docstring 是让 Agent 选对工具的关键。
      </Callout>

      <h3>③ create_react_agent 组装</h3>
      <p>
        一行把 <code>model</code>、<code>tools</code>、<code>checkpointer</code> 装进去，
        内部就建好了「模型 → 条件边 → 工具 → 模型」的 ReAct 循环图。这里传了
        <code>InMemorySaver()</code>——它既是记忆的来源，也是 interrupt 能暂停/续跑的前提
        （没有 checkpointer，interrupt 根本无处保存暂停时的状态）。
      </p>

      <h3>④ thread_id：记忆的钥匙</h3>
      <p>
        <code>{'config = {"configurable": {"thread_id": "user-1"}}'}</code>。
        三次 invoke 都带同一个 config，于是它们共享同一条会话历史。
        正因如此，第二次问「给张三转 200 元」时，Agent 记得前面查余额的上下文；
        第三次 resume 续跑时，它也知道自己正卡在哪笔转账上。
        <strong>thread_id 一致 = 记忆连续</strong>。
      </p>

      <h3>⑤ 第一轮：只读查询，一步到位</h3>
      <p>
        「我还有多少钱？」→ 模型决定调 <code>get_balance</code> → 工具直接返回余额 →
        模型把结果整理成自然语言。整个过程没有暂停，
        <code>{'r1["messages"][-1].content'}</code> 就是最终答复。
      </p>

      <h3>⑥ 第二轮：触发中断</h3>
      <p>
        「给张三转 200 元」→ 模型决定调 <code>{'transfer_money(to="张三", amount=200)'}</code> →
        工具体内 <code>interrupt(...)</code> 触发，整张图<strong>暂停</strong>。
        这次 invoke 的返回 <code>r2</code> 里不会有最终答复，而是带上
        <code>{'__interrupt__'}</code> 这个键。代码用 <code>{'if "__interrupt__" in r2'}</code> 检测到了暂停，
        从 <code>{'r2["__interrupt__"][0].value'}</code> 取出抛出的 payload（就是那个
        <code>{'{"action": "transfer", "to": "张三", "amount": 200}'}</code> 字典），打印给人看。
      </p>

      <h3>⑦ 第三轮：Command(resume) 续跑</h3>
      <p>
        人看完后批准。<code>{'agent.invoke(Command(resume="approve"), config)'}</code>——
        注意这次<strong>不传新消息</strong>，只传一个 <code>{'Command(resume="approve")'}</code>，
        且 config 仍是同一个 thread_id。图从暂停处醒来，
        <code>transfer_money</code> 里的 <code>decision</code> 收到 <code>"approve"</code>，
        于是真正执行转账，返回「已向 张三 转账 200 元」，模型整理成最终答复。
        如果这里传的是 <code>{'Command(resume="reject")'}</code>，则走拒绝分支。
      </p>

      <h2>预期输出</h2>
      <Example title="终端打印（示意）">
        助手: 当前余额：1000 元。<br />
        需要审批: {`{'action': 'transfer', 'to': '张三', 'amount': 200}`}<br />
        助手: 已向 张三 转账 200 元。
      </Example>
      <p>
        三行分别对应：只读查询的答复、被拦下的审批请求、人批准后续跑的结果。
        把 <code>{'resume="approve"'}</code> 改成 <code>"reject"</code>，最后一行会变成「用户拒绝了这笔转账」。
      </p>

      <h2>对照：手写一版等价的 StateGraph</h2>
      <p>
        <code>create_react_agent</code> 把图藏起来了。为了体会「显式控制」，我们不用预制件，
        改用 <code>{'StateGraph + add_node + add_conditional_edges'}</code> 亲手画出同样的 ReAct 循环——
        这下每条边都在你眼皮底下：
      </p>
      <CodeBlock lang="python" title="手写 StateGraph（等价骨架）" code={handGraphCode} />
      <p>
        对比一下：预制件一行搞定，胜在快；手写版多了十几行，胜在<strong>每一步路由都可改</strong>——
        想加「转账失败自动重试」「先过一道风控节点」「按金额走不同审批路径」，
        直接在图里加节点、改路由函数即可。这就是 LangGraph 用「写多点代码」换来的控制力。
      </p>

      <h2>常见报错与调试</h2>
      <ul>
        <li>
          <strong>没记忆 / Agent 失忆</strong>：compile 或 create_react_agent 时忘了传
          <code>checkpointer</code>。没有它就没有跨轮记忆，interrupt 也无法暂停续跑。
        </li>
        <li>
          <strong>thread_id 不一致</strong>：每轮 invoke 用了不同的 thread_id（或干脆没传 config），
          会被当成全新会话，记忆断裂、resume 找不到要恢复的状态。三轮必须用同一个 config。
        </li>
        <li>
          <strong>interrupt 后没 resume</strong>：检测到 <code>{'__interrupt__'}</code> 却没有用
          <code>{'Command(resume=...)'}</code> 续跑，图会一直卡在暂停态，转账永远不执行。
        </li>
        <li>
          <strong>base_url 写错</strong>：百炼兼容端点必须是
          <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>；
          少写 <code>/compatible-mode/v1</code> 或 Key 没设环境变量，会报 401 / 连接错误。
        </li>
        <li>
          <strong>resume 时还传新消息</strong>：续跑只需 <code>{'Command(resume=...)'}</code>，
          不要同时塞 messages，否则可能扰乱暂停点的状态。
        </li>
      </ul>

      <h2>进阶方向</h2>
      <h3>用 SqliteSaver 真正落盘</h3>
      <p>
        <code>InMemorySaver</code> 一重启就清空。生产里换成 <code>SqliteSaver</code>（或
        <code>PostgresSaver</code>），存档落到磁盘/数据库，重启后凭 thread_id 仍能恢复记忆与暂停点：
      </p>
      <CodeBlock lang="python" title="SqliteSaver 持久化" code={sqliteCode} />
      <h3>把审批做成独立节点</h3>
      <p>
        本例把 <code>interrupt</code> 写在工具内部，简单直接。更工程化的做法是手写图时新增一个
        <strong>专门的审批节点</strong>：高风险工具调用先路由到该节点 interrupt，
        审批通过再路由到真正执行的节点。这样审批逻辑与业务逻辑解耦，也方便统一加审计日志。
      </p>
      <h3>用 LangSmith 追踪</h3>
      <p>
        设置 <code>LANGSMITH_TRACING=true</code> 与 <code>LANGSMITH_API_KEY</code> 后，
        每次运行的每个节点输入输出、每次工具调用、暂停与续跑，都会在 LangSmith 里可视化回放——
        排查「模型为什么选错工具」「在哪一步卡住」时极其有用。
      </p>

      <Summary
        points={[
          '示例用 ChatOpenAI 接百炼 qwen-plus（base_url 指向 compatible-mode/v1），create_react_agent 组装出带工具的 ReAct Agent。',
          'checkpointer + 同一 thread_id 提供跨轮记忆；三次 invoke 共享会话历史，缺一不可。',
          '高风险工具内部调 interrupt() 暂停，返回值带 __interrupt__；用 Command(resume="approve") 续跑（不传新消息）把人的决定喂回。',
          '手写 StateGraph（add_node/ToolNode/add_conditional_edges）可画出等价 ReAct 循环，换来对每条边的显式控制，便于加重试/风控/分级审批。',
          '常见坑：忘传 checkpointer、thread_id 不一致、interrupt 后没 resume、base_url 写错；进阶用 SqliteSaver 落盘、审批独立成节点、LangSmith 追踪。',
        ]}
      />
    </article>
  )
}

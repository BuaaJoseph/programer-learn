import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `pip install langgraph langchain-openai
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const agentCode = `import os

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command, interrupt

# ChatOpenAI 接百炼的 OpenAI 兼容端点。
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


# checkpointer 让图在每个节点后保存状态：既是持久化/可恢复，也带来跨轮记忆。
agent = create_react_agent(
    model=llm,
    tools=[get_balance, transfer_money],
    checkpointer=InMemorySaver(),
)


def main() -> None:
    config = {"configurable": {"thread_id": "user-1"}}

    # 第一轮：查余额。状态被 checkpointer 记住。
    r1 = agent.invoke({"messages": [{"role": "user", "content": "我还有多少钱？"}]}, config)
    print("助手:", r1["messages"][-1].content)

    # 第二轮：转账。命中 transfer_money 里的 interrupt，图暂停等待审批。
    r2 = agent.invoke({"messages": [{"role": "user", "content": "给张三转 200 元"}]}, config)
    if "__interrupt__" in r2:
        req = r2["__interrupt__"][0].value
        print("需要审批:", req)
        # 模拟用户批准：用 Command(resume=...) 从中断点继续，把 "approve" 作为 interrupt() 的返回值。
        r3 = agent.invoke(Command(resume="approve"), config)
        print("助手:", r3["messages"][-1].content)


if __name__ == "__main__":
    main()`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，动手做个东西。我们写一个理财助手：它能查余额（只读，随便查），也能转账
        （危险动作，转账前必须人工审批），还要在多轮对话里记住上下文。一个例子，同时演示
        LangGraph 的两大特性——checkpointer（记忆）和 interrupt（人审）。
      </Lead>

      <h2>我们要做什么</h2>
      <p>
        助手挂两个工具：<code>get_balance</code> 查余额，是只读的安全操作；
        <code>transfer_money</code> 转账，是有风险的操作，执行前要停下来等人批准。
        同时借助 checkpointer，第二轮对话还能记得第一轮——也就是真正的「会话记忆」。
      </p>

      <KeyIdea>
        危险动作被显式拦在审批点：模型可以「想」去转账，但真正执行前，图会暂停，把请求交给
        人决定。控制力，就体现在这个停顿里。
      </KeyIdea>

      <h2>安装与环境</h2>
      <CodeBlock lang="bash">{installCode}</CodeBlock>

      <h2>完整代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/04-langgraph/react_memory_hitl.py"
      >
        {agentCode}
      </CodeBlock>

      <h2>逐段讲解</h2>
      <ul>
        <li>
          <strong>接百炼：</strong><code>ChatOpenAI</code> 只需三个参数——
          <code>model="qwen-plus"</code>、<code>base_url</code> 指向百炼的 OpenAI 兼容端点、
          <code>api_key</code> 读环境变量。LangChain 标准接口就能驱动 Qwen。
        </li>
        <li>
          <strong>两个工具：</strong><code>get_balance</code> 是只读，直接返回结果；
          <code>transfer_money</code> 是危险动作。
        </li>
        <li>
          <strong>interrupt 暂停：</strong>在 <code>transfer_money</code> 内部，
          <code>interrupt(...)</code> 会把转账请求（含收款人和金额的字典）抛出来，并让整张图
          停在这里，等外部给出决定。
        </li>
        <li>
          <strong>组装 agent：</strong><code>create_react_agent</code> 传入
          <code>model</code> / <code>tools</code> / <code>checkpointer</code>，一个带记忆、带
          审批能力的 ReAct 图就搭好了。
        </li>
        <li>
          <strong>thread_id 是会话身份：</strong><code>config</code> 里的
          <code>{'{"configurable": {"thread_id": "user-1"}}'}</code> 决定了这通对话的身份。
          同一个 <code>thread_id</code>，让第二轮调用还记得第一轮发生过什么。
        </li>
        <li>
          <strong>识别中断：</strong>当 <code>invoke</code> 的返回里出现
          <code>{'"__interrupt__"'}</code> 键，就说明图停下来等审批了。从
          <code>{'r2["__interrupt__"][0].value'}</code> 能取出待审批的请求内容。
        </li>
        <li>
          <strong>续跑：</strong>用 <code>{'Command(resume="approve")'}</code> 从断点继续，
          这里的 <code>"approve"</code> 会成为之前那个 <code>interrupt()</code> 调用的返回值，
          于是 <code>transfer_money</code> 走进批准分支，完成转账。
        </li>
      </ul>

      <Example title="一次带审批的运行">
        <p>跑 <code>main()</code>，你大致会看到这样的过程：</p>
        <ul>
          <li>第一轮问「我还有多少钱？」→ 助手回答「当前余额：1000 元。」</li>
          <li>
            第二轮说「给张三转 200 元」→ 程序没有直接转账，而是命中
            <code>interrupt</code>，打印出「需要审批: {'{'}'action': 'transfer', 'to': '张三',
            'amount': 200{'}'}」。
          </li>
          <li>
            模拟用户批准后 → 助手回答「已向 张三 转账 200 元。」
          </li>
        </ul>
        <p>
          关键在于：转账这个危险动作，被显式拦在了审批点上。没有人点头，钱就不会动。
        </p>
      </Example>

      <Callout variant="note">
        这里我们用了预制的 <code>create_react_agent</code>，省心。如果想要更强的控制，
        完全可以按上一章的原理自己用 <code>StateGraph</code> 画节点和条件边，
        把「人工审批」做成一个独立节点，精确控制它在流程中的位置。另外，
        <code>InMemorySaver</code> 只存在内存里，进程一退就没了；生产环境应换成
        <code>SqliteSaver</code> 或 <code>PostgresSaver</code> 做真正的持久化。
      </Callout>

      <Summary
        points={[
          '用 ChatOpenAI 三参数（model/base_url/api_key）即可接百炼跑 Qwen。',
          'create_react_agent 传入 model、tools、checkpointer，得到带记忆与审批能力的 ReAct 图。',
          'checkpointer + 同一 thread_id 实现跨轮记忆；这里用 InMemorySaver，生产换 Sqlite/Postgres。',
          'interrupt() 在危险动作前暂停并抛出请求，返回里出现 "__interrupt__" 即表示等审批。',
          'Command(resume="approve") 从断点续跑，resume 的值成为 interrupt() 的返回值。',
          '控制力的体现：危险动作被显式拦在审批点，没人批准就不执行；要更强控制可自己用 StateGraph 画图。',
        ]}
      />
    </article>
  )
}

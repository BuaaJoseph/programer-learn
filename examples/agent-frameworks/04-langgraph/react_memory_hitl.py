"""LangGraph · 图/状态机示例：带记忆(checkpointer) + 人工审批(interrupt) 的 ReAct 助手，接百炼(Qwen)。

要点：
- create_react_agent + InMemorySaver：同一个 thread_id 跨多轮记住上下文（持久化的副产品）。
- interrupt()：危险动作(转账)执行前暂停，等人工审批，再用 Command(resume=...) 继续——这就是「人在回路」。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python react_memory_hitl.py
"""
import os

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
    main()

"""OpenAI Agents SDK · 多 Agent 分诊(handoff) + 输入护栏(guardrail) 示例，接百炼(Qwen)。

要点：
- handoff：分诊台 Agent 把控制权交给「账单专员 / 退款专员」。
- guardrail：一道输入护栏，拦截「查询他人信息」这类越权请求。
- 接百炼的关键是「四步」：自定义 AsyncOpenAI 客户端 + 设为默认 + 切到 chat_completions + 关掉 tracing。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python triage_handoff.py
"""
import asyncio
import os

from agents import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    RunContextWrapper,
    Runner,
    function_tool,
    input_guardrail,
    set_default_openai_api,
    set_default_openai_client,
    set_tracing_disabled,
)
from openai import AsyncOpenAI

# —— 关键四步：把 OpenAI Agents SDK 接到百炼(DashScope) ——
client = AsyncOpenAI(
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)
set_default_openai_client(client, use_for_tracing=False)
# 第三方兼容端点只支持 Chat Completions（SDK 默认走 Responses API，必须切换）。
set_default_openai_api("chat_completions")
# tracing 上报需要 OpenAI 官方 key，这里关掉。
set_tracing_disabled(True)

MODEL = "qwen-plus"


@function_tool
def lookup_order(order_id: str) -> str:
    """根据订单号查询订单状态（示例数据）。"""
    return f"订单 {order_id}：已支付，预计 3 天内发货。"


@input_guardrail
async def no_other_customer(ctx: RunContextWrapper, agent: Agent, user_input) -> GuardrailFunctionOutput:
    """护栏：拒绝查询「别人」账户/订单的越权请求。并行于主流程运行，命中即中断。"""
    text = user_input if isinstance(user_input, str) else str(user_input)
    tripwire = any(k in text for k in ["别人", "其他用户", "他的账户", "别人的订单"])
    return GuardrailFunctionOutput(
        output_info={"reason": "疑似越权访问他人信息"},
        tripwire_triggered=tripwire,
    )


billing_agent = Agent(
    name="账单专员",
    model=MODEL,
    instructions="你负责账单与支付问题，用中文简洁回答；需要时用工具查订单。",
    tools=[lookup_order],
)
refund_agent = Agent(
    name="退款专员",
    model=MODEL,
    instructions="你负责退款问题，用中文简洁说明退款政策与流程。",
)

triage_agent = Agent(
    name="分诊台",
    model=MODEL,
    instructions="你是客服分诊台。判断用户问题属于账单还是退款，交接(handoff)给对应专员处理。",
    handoffs=[billing_agent, refund_agent],
    input_guardrails=[no_other_customer],
)


async def main() -> None:
    questions = [
        "我的订单 A1001 到哪了？",
        "我要退款，怎么操作？",
        "帮我查下别人的订单 B2002",
    ]
    for q in questions:
        print(f"\n用户：{q}")
        try:
            result = await Runner.run(triage_agent, q)
            print("客服：", result.final_output)
        except InputGuardrailTripwireTriggered:
            print("客服：抱歉，无法处理涉及他人账户的请求。")


if __name__ == "__main__":
    asyncio.run(main())

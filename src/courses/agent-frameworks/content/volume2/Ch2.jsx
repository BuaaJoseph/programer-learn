import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `pip install openai-agents openai
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const fourStepsCode = `from openai import AsyncOpenAI
from agents import set_default_openai_client, set_default_openai_api, set_tracing_disabled

client = AsyncOpenAI(
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)
set_default_openai_client(client, use_for_tracing=False)
set_default_openai_api("chat_completions")  # 第三方端点只支持 Chat Completions（必须切！）
set_tracing_disabled(True)                  # tracing 上报需 OpenAI key，关掉`

const fullCode = `import asyncio
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
set_default_openai_api("chat_completions")
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
        print(f"\\n用户：{q}")
        try:
            result = await Runner.run(triage_agent, q)
            print("客服：", result.final_output)
        except InputGuardrailTripwireTriggered:
            print("客服：抱歉，无法处理涉及他人账户的请求。")


if __name__ == "__main__":
    asyncio.run(main())`

export default function Ch2() {
  return (
    <article>
      <Lead>
        光讲原理不够，本章用一个真实可跑的客服分诊系统把上一章的概念全部落地：分诊台根据用户问题
        handoff 给账单专员或退款专员，并加一道输入护栏拦截越权请求。同时，我们用「关键四步」
        把这套 SDK 接到国内的百炼（DashScope），用 qwen-plus 模型跑起来。
      </Lead>

      <h2>安装与环境</h2>
      <p>
        先装好依赖，并配置百炼的 API Key（在百炼控制台获取，形如 <code>sk-xxxx</code>）。
      </p>
      <CodeBlock lang="bash" title="安装与环境变量" code={installCode} />

      <h2>接百炼的关键四步</h2>
      <p>
        Agents SDK 默认走 OpenAI 的 Responses API，而百炼只兼容 Chat Completions。要把它接到百炼，
        核心就是下面这四行配置——务必在创建任何 Agent 之前执行。
      </p>
      <CodeBlock lang="python" title="接百炼·关键四步" code={fourStepsCode} />
      <ul>
        <li><strong>① 自定义 AsyncOpenAI 客户端</strong>：把 <code>base_url</code> 指向百炼的兼容端点，<code>api_key</code> 用百炼的 Key。</li>
        <li><strong>② 设为默认客户端</strong>：<code>set_default_openai_client(client, use_for_tracing=False)</code>，让全局 Agent 都走这个客户端。</li>
        <li><strong>③ 切到 chat_completions</strong>：<code>set_default_openai_api("chat_completions")</code>。这一步<strong>必须</strong>做，否则第三方端点会因不支持 Responses API 而报错。</li>
        <li><strong>④ 关掉 tracing</strong>：<code>set_tracing_disabled(True)</code>。tracing 上报需要 OpenAI 的 Key，接百炼时关掉即可。</li>
      </ul>
      <p>模型名直接用百炼的 <code>"qwen-plus"</code>。</p>

      <KeyIdea>
        接百炼的口诀就一句：<strong>自定义 client → 设为默认 client → 切 chat_completions → 关 tracing</strong>。
        四步做完，handoff、guardrail、工具调用全都照常工作。
      </KeyIdea>

      <h2>完整示例</h2>
      <p>
        下面是完整的客服分诊脚本，一字不改即可运行。它包含一个查单工具、一道输入护栏、
        三个 Agent（分诊台 + 账单专员 + 退款专员），以及三条演示问题。
      </p>
      <CodeBlock lang="python" title="examples/agent-frameworks/02-openai-agents/triage_handoff.py" code={fullCode} />

      <h2>逐段讲解</h2>

      <h3>工具：function_tool</h3>
      <ul>
        <li><code>@function_tool</code> 把一个普通 Python 函数变成 Agent 可调用的工具，函数的 docstring 与类型注解会成为工具描述。</li>
        <li>这里的 <code>lookup_order</code> 返回示例订单状态，账单专员需要时会调用它。</li>
      </ul>

      <h3>护栏：input_guardrail</h3>
      <ul>
        <li><code>@input_guardrail</code> 装饰的函数与主流程<strong>并行</strong>运行，检查用户输入。</li>
        <li>当检测到「别人」「其他用户」等越权关键词时，把 <code>tripwire_triggered</code> 设为 <code>True</code>。</li>
        <li>一旦 tripwire 命中，SDK 立即抛出 <code>InputGuardrailTripwireTriggered</code>，所以调用处要用 <code>try/except</code> 捕获。</li>
      </ul>

      <h3>三个 Agent 与 handoffs</h3>
      <ul>
        <li>账单专员带工具、退款专员只讲政策，各司其职。</li>
        <li>分诊台通过 <code>{'handoffs=[billing_agent, refund_agent]'}</code> 声明可交接的目标，并挂上 <code>{'input_guardrails=[no_other_customer]'}</code>。</li>
      </ul>

      <h3>运行：Runner.run 与 final_output</h3>
      <ul>
        <li><code>Runner.run(triage_agent, q)</code> 驱动整个循环，包括可能的 handoff，最终结果在 <code>result.final_output</code>。</li>
      </ul>

      <Example title="三条问题分别发生了什么">
        第一条「我的订单 A1001 到哪了？」——分诊台判断属于账单，<strong>handoff 到账单专员</strong>，
        专员调用 <code>lookup_order</code> 查到状态后作答。
        第二条「我要退款，怎么操作？」——<strong>handoff 到退款专员</strong>，由它说明退款流程。
        第三条「帮我查下别人的订单 B2002」——<strong>被输入护栏拦截</strong>，tripwire 命中，
        抛出异常被 except 捕获，返回「无法处理涉及他人账户的请求」。
      </Example>

      <Callout variant="note">
        接第三方模型时，handoff、guardrail、工具调用都照常可用；代价是<strong>失去 Responses API
        与原生 tracing</strong>。如果你仍需要可观测性，可以自行接入 OpenTelemetry 来采集链路。
      </Callout>

      <Callout variant="tip">
        接百炼口诀再记一遍：<strong>自定义 client → 默认 client → 切 chat_completions → 关 tracing</strong>。
        四步缺一不可，尤其第三步最容易漏。
      </Callout>

      <Summary points={[
        '安装 openai-agents 与 openai，配好 DASHSCOPE_API_KEY。',
        '接百炼关键四步：自定义 AsyncOpenAI 客户端 → set_default_openai_client → set_default_openai_api("chat_completions") → set_tracing_disabled(True)。',
        '第三步切 chat_completions 是必须的，否则第三方端点不支持 Responses API 会报错。',
        'function_tool 把函数变工具，input_guardrail 命中 tripwire 即抛 InputGuardrailTripwireTriggered，需 try/except。',
        '分诊台用 handoffs 路由到账单/退款专员，Runner.run 驱动循环并返回 final_output。',
        '三条问题分别演示：handoff 到账单、handoff 到退款、被护栏拦截。',
        '接第三方模型会失去 Responses API 与原生 tracing，可自行接 OpenTelemetry 补可观测性。',
      ]} />
    </article>
  )
}

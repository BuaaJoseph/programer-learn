import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `# 安装 SDK 与底层 openai 库
pip install openai-agents openai

# 配置百炼(DashScope) 的 API Key（百炼控制台获取，形如 sk-xxxx）
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const fourStepsCode = `import os
from openai import AsyncOpenAI
from agents import (
    set_default_openai_client, set_default_openai_api, set_tracing_disabled,
)

# ① 自定义客户端，base_url 指向百炼兼容端点
client = AsyncOpenAI(
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)
# ② 设为全局默认客户端
set_default_openai_client(client, use_for_tracing=False)
# ③ 切到 Chat Completions（必须！第三方端点不支持 Responses API）
set_default_openai_api("chat_completions")
# ④ 关掉 tracing（上报需 OpenAI key，接第三方时关掉）
set_tracing_disabled(True)`

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

const expectedOutput = `用户：我的订单 A1001 到哪了？
客服： 您的订单 A1001 已支付，预计 3 天内发货，请耐心等待～

用户：我要退款，怎么操作？
客服： 您可在「订单详情-申请退款」提交，审核通过后 1-3 个工作日原路退回。

用户：帮我查下别人的订单 B2002
客服：抱歉，无法处理涉及他人账户的请求。`

const outputGuardrailCode = `from agents import output_guardrail, GuardrailFunctionOutput, OutputGuardrailTripwireTriggered

@output_guardrail
async def no_internal_leak(ctx, agent, output) -> GuardrailFunctionOutput:
    """输出护栏：拦截回答里泄露内部信息（进价/成本/密钥）的情况。"""
    text = str(output)
    leaked = any(k in text for k in ["内部成本", "进价", "API_KEY", "sk-"])
    return GuardrailFunctionOutput(
        output_info={"leaked": leaked},
        tripwire_triggered=leaked,
    )

# 挂到 Agent 上（与输入护栏并列）
billing_agent = Agent(
    name="账单专员",
    model=MODEL,
    instructions="...",
    tools=[lookup_order],
    output_guardrails=[no_internal_leak],
)
# 命中时 Runner.run 抛 OutputGuardrailTripwireTriggered，同样用 try/except 捕获`

const sessionCode = `from agents import Runner, SQLiteSession

session = SQLiteSession("user-123")   # 同一 session_id 串起多轮
await Runner.run(triage_agent, "我叫小明，订单 A1001 到哪了？", session=session)
result = await Runner.run(triage_agent, "那我刚问的那个订单呢？", session=session)
print(result.final_output)   # 自动带历史，知道"那个订单"=A1001`

const modelSettingsCode = `from agents import Agent, ModelSettings

billing_agent = Agent(
    name="账单专员",
    model=MODEL,
    instructions="...",
    tools=[lookup_order],
    model_settings=ModelSettings(
        temperature=0.2,      # 客服场景要稳，降低随机性
        max_tokens=512,
        tool_choice="auto",   # 让模型自行决定是否调工具
    ),
)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        光讲原理不够。本章用一个<strong>真实可跑</strong>的客服分诊系统把上一章的概念全部落地：
        分诊台根据用户问题 handoff 给账单专员或退款专员，并加一道输入护栏拦截越权请求。同时，
        我们用「关键四步」把这套 SDK 接到国内的<strong>百炼（DashScope）</strong>，用 qwen-plus
        模型跑起来；最后给出输出护栏变体、常见报错排查与进阶玩法。
      </Lead>

      <h2>一、安装与环境</h2>
      <p>
        先装好依赖，并配置百炼的 API Key（在百炼控制台获取，形如 <code>sk-xxxx</code>）。
        <code>openai-agents</code> 是 SDK 本体，<code>openai</code> 提供底层的 <code>AsyncOpenAI</code> 客户端。
      </p>
      <CodeBlock lang="bash" title="安装与环境变量" code={installCode} />

      <h2>二、接百炼的关键四步</h2>
      <p>
        Agents SDK 默认走 OpenAI 的 Responses API，而百炼只兼容 Chat Completions。要把它接到百炼，
        核心就是下面这四行配置——务必在<strong>创建任何 Agent 之前</strong>执行（它们设置的是全局默认）。
      </p>
      <CodeBlock lang="python" title="接百炼·关键四步" code={fourStepsCode} />
      <ul>
        <li><strong>① 自定义 AsyncOpenAI 客户端</strong>：把 <code>base_url</code> 指向百炼的兼容端点
          <code>{'https://dashscope.aliyuncs.com/compatible-mode/v1'}</code>，<code>api_key</code> 用百炼的 Key。</li>
        <li><strong>② 设为默认客户端</strong>：<code>{'set_default_openai_client(client, use_for_tracing=False)'}</code>，
          让全局所有 Agent 都走这个客户端；<code>use_for_tracing=False</code> 明确不拿它做 tracing 上报。</li>
        <li><strong>③ 切到 chat_completions</strong>：<code>{'set_default_openai_api("chat_completions")'}</code>。
          这一步<strong>必须</strong>做，否则第三方端点因不支持 Responses API 而报错。</li>
        <li><strong>④ 关掉 tracing</strong>：<code>{'set_tracing_disabled(True)'}</code>。tracing 上报需要
          OpenAI 的 Key，接百炼时关掉即可。</li>
      </ul>
      <p>模型名直接用百炼的 <code>"qwen-plus"</code>。</p>

      <KeyIdea>
        接百炼的口诀就一句：<strong>自定义 client → 设为默认 client → 切 chat_completions → 关 tracing</strong>。
        四步做完，handoff、guardrail、工具调用全都照常工作。
      </KeyIdea>

      <h2>三、完整示例</h2>
      <p>
        下面是完整的客服分诊脚本，一字不改即可运行。它包含一个查单工具、一道输入护栏、
        三个 Agent（分诊台 + 账单专员 + 退款专员），以及三条演示问题。
      </p>
      <CodeBlock lang="python" title="examples/agent-frameworks/02-openai-agents/triage_handoff.py" code={fullCode} />

      <h2>四、逐段讲解</h2>

      <h3>导入与四步配置（第 1-27 行）</h3>
      <ul>
        <li>从 <code>agents</code> 一次性导入要用到的原语与装饰器；从 <code>openai</code> 导入 <code>AsyncOpenAI</code>。</li>
        <li>紧接着就是「关键四步」：创建客户端、设默认、切 chat_completions、关 tracing。这几行<strong>在模块顶层先跑</strong>，确保后面所有 Agent 都用这套配置。</li>
        <li><code>MODEL = "qwen-plus"</code> 抽成常量，三个 Agent 复用。</li>
      </ul>

      <h3>工具：function_tool（lookup_order）</h3>
      <ul>
        <li><code>@function_tool</code> 把普通 Python 函数变成 Agent 可调用的工具：函数名→工具名，docstring→工具描述，<code>order_id: str</code> 这个签名→参数 schema，全自动。</li>
        <li>这里返回的是写死的示例数据；真实项目里这里会去查数据库或调内部 API。</li>
      </ul>

      <h3>输入护栏：no_other_customer</h3>
      <ul>
        <li><code>@input_guardrail</code> 装饰的函数与主流程<strong>并行</strong>运行，签名固定为 <code>(ctx, agent, user_input)</code>。</li>
        <li>逻辑很朴素：把输入转成字符串，命中「别人 / 其他用户 / 他的账户 / 别人的订单」任一关键词，就把 <code>tripwire_triggered</code> 置 <code>True</code>。</li>
        <li><code>output_info</code> 是附带的诊断信息（命中原因），会进 trace / 日志，方便排查。</li>
        <li>真实项目里这里通常换成「比对当前登录用户身份」的鉴权逻辑，而非关键词匹配。</li>
      </ul>

      <h3>三个 Agent 与 handoffs</h3>
      <ul>
        <li><strong>账单专员</strong>带 <code>tools=[lookup_order]</code>，能查订单；<strong>退款专员</strong>不带工具，只讲政策流程，各司其职。</li>
        <li><strong>分诊台</strong>通过 <code>{'handoffs=[billing_agent, refund_agent]'}</code> 声明两个可交接目标，并挂上 <code>{'input_guardrails=[no_other_customer]'}</code>。</li>
        <li>注意分诊台的 instructions 明确告诉它「判断归属后交接给对应专员」——这是 handoff 能正确触发的前提。</li>
      </ul>

      <h3>运行：Runner.run 与 final_output</h3>
      <ul>
        <li><code>await Runner.run(triage_agent, q)</code> 驱动整个循环，<strong>包括可能的 handoff</strong>，最终结果在 <code>result.final_output</code>。</li>
        <li>因为护栏命中会抛 <code>InputGuardrailTripwireTriggered</code>，所以每次调用都包在 <code>try/except</code> 里，命中时给出礼貌的拒绝答复。</li>
        <li>整个脚本是异步的，最后用 <code>asyncio.run(main())</code> 启动。</li>
      </ul>

      <h2>五、三条问题的预期输出</h2>
      <p>三条问题分别触发三种路径：handoff 到账单、handoff 到退款、被输入护栏拦截。</p>
      <Example title="逐条发生了什么">
        <strong>① 「我的订单 A1001 到哪了？」</strong>——分诊台判断属于账单，
        <strong>handoff 到账单专员</strong>，专员调用 <code>lookup_order("A1001")</code> 拿到状态后作答。<br />
        <strong>② 「我要退款，怎么操作？」</strong>——分诊台判断属于退款，
        <strong>handoff 到退款专员</strong>，由它说明退款流程（不调工具）。<br />
        <strong>③ 「帮我查下别人的订单 B2002」</strong>——输入护栏并行检测到「别人」关键词，
        <strong>tripwire 命中</strong>，抛 <code>InputGuardrailTripwireTriggered</code>，被 except 捕获，
        返回拒绝答复。分诊台<strong>根本没来得及处理</strong>这条请求。
      </Example>
      <p>运行后控制台大致输出如下（模型措辞每次略有不同）：</p>
      <CodeBlock lang="text" title="预期输出（示意）" code={expectedOutput} />

      <h2>六、新增：输出护栏变体</h2>
      <p>
        上例只演示了输入护栏。生产里同样关键的是<strong>输出护栏</strong>——在 Agent 产出回答后做一道
        校验，防止泄露内部信息。下面给一个最小变体：检查回答里是否出现「进价 / 内部成本 / 密钥」等
        敏感词，命中就拦下。
      </p>
      <CodeBlock lang="python" title="输出护栏：禁止泄露内部信息" code={outputGuardrailCode} />
      <ul>
        <li>用 <code>@output_guardrail</code> 装饰，签名是 <code>(ctx, agent, output)</code>，最后一个参数是 Agent 的<strong>输出</strong>。</li>
        <li>挂到 Agent 的 <code>output_guardrails=[...]</code> 上，与输入护栏并列。</li>
        <li>命中时抛 <code>OutputGuardrailTripwireTriggered</code>（注意是 Output 版异常），同样需要 <code>try/except</code> 捕获。</li>
      </ul>

      <h2>七、常见报错与调试</h2>
      <ul>
        <li><strong>没切 chat_completions</strong>：报类似「endpoint 不支持 Responses API / 404 / Unsupported」的错。
          → 确认 <code>{'set_default_openai_api("chat_completions")'}</code> 写了，且在创建 Agent 之前执行。</li>
        <li><strong>tracing 未关导致报 key</strong>：报缺少 OpenAI API key / tracing 上报失败。
          → 加 <code>{'set_tracing_disabled(True)'}</code>，并确认 <code>{'set_default_openai_client(..., use_for_tracing=False)'}</code>。</li>
        <li><strong>handoff 未生效</strong>（分诊台自己硬答、不交接）：→ 检查分诊台 instructions 是否明确要求「交接给对应专员」；确认 <code>{'handoffs=[...]'}</code> 里确实放了目标 Agent；过小的模型有时不会主动交接，可换更强模型或把指令写得更明确。</li>
        <li><strong>护栏未触发</strong>：→ 确认护栏挂在了<strong>分诊台</strong>（入口 Agent）的 <code>input_guardrails</code> 上，而不是只挂在下游专员上；检查关键词/判定逻辑；确认 <code>tripwire_triggered</code> 真的算出了 <code>True</code>。</li>
        <li><strong>KeyError: 'DASHSCOPE_API_KEY'</strong>：环境变量没设。→ 先 <code>export DASHSCOPE_API_KEY=...</code> 再跑。</li>
      </ul>

      <h2>八、进阶</h2>

      <h3>Sessions：多轮对话自动带历史</h3>
      <p>
        上例每个问题都是独立一轮。要做连续对话，用 <code>Session</code> 把多轮串起来，SDK 自动维护历史，
        无需手动拼接。
      </p>
      <CodeBlock lang="python" title="多轮会话（Session）" code={sessionCode} />

      <h3>ModelSettings：精调采样与工具行为</h3>
      <p>
        给 Agent 传 <code>model_settings=ModelSettings(...)</code> 可控制 temperature、max_tokens、
        tool_choice 等。客服这类场景通常希望回答稳定，把 temperature 调低。
      </p>
      <CodeBlock lang="python" title="ModelSettings" code={modelSettingsCode} />

      <h3>把 tracing 接到 OpenTelemetry</h3>
      <p>
        接百炼时关掉了原生 tracing，但可观测性不能丢。可以自行接入 <strong>OpenTelemetry</strong>：
        对 <code>Runner.run</code> 与每个工具调用用 OTel 的 span 做埋点，记录输入、输出、耗时、是否
        handoff、护栏是否命中，再上报到 Jaeger / Langfuse / 自建 APM。这样既用了第三方模型，又保留
        了完整链路追踪。
      </p>

      <Callout variant="note">
        接第三方模型时，handoff、guardrail、工具调用都照常可用；代价是<strong>失去 Responses API
        与原生 tracing</strong>。如果你仍需要可观测性，用 OpenTelemetry 自行采集链路即可。
      </Callout>

      <Callout variant="tip">
        接百炼口诀再记一遍：<strong>自定义 client → 默认 client → 切 chat_completions → 关 tracing</strong>。
        四步缺一不可，尤其第三步最容易漏。
      </Callout>

      <Summary points={[
        '安装 openai-agents 与 openai，配好 DASHSCOPE_API_KEY 环境变量。',
        '接百炼关键四步：自定义 AsyncOpenAI 客户端 → set_default_openai_client(use_for_tracing=False) → set_default_openai_api("chat_completions") → set_tracing_disabled(True)，且必须在创建 Agent 之前执行。',
        '第三步切 chat_completions 是必须的，否则第三方端点不支持 Responses API 会报错。',
        'function_tool 把函数变工具；input_guardrail 命中 tripwire 抛 InputGuardrailTripwireTriggered，output_guardrail 抛 OutputGuardrailTripwireTriggered，都需 try/except。',
        '分诊台用 handoffs 路由到账单/退款专员，护栏挂在入口 Agent 上，Runner.run 驱动循环并返回 final_output。',
        '三条问题分别演示：handoff 到账单、handoff 到退款、被输入护栏拦截。',
        '常见坑：没切 chat_completions、tracing 没关、handoff 指令不明确、护栏挂错 Agent、环境变量没设。',
        '进阶：Sessions 做多轮记忆、ModelSettings 精调采样、把 tracing 接 OpenTelemetry 补可观测。',
      ]} />
    </article>
  )
}

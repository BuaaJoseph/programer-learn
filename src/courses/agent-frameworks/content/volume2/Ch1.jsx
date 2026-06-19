import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const agentSnippet = `from agents import Agent, function_tool

@function_tool
def get_weather(city: str) -> str:
    """查询某城市天气（示例）。"""
    return f"{city}：晴，26°C"

agent = Agent(
    name="天气助手",
    instructions="你是天气助手，用中文简洁回答；需要时调用工具。",
    model="gpt-4.1",
    tools=[get_weather],
)`

const runnerSnippet = `from agents import Runner

# 异步：在 async 函数里 await
result = await Runner.run(agent, "北京今天天气怎么样？")
print(result.final_output)

# 同步：脚本里一行跑通
result = Runner.run_sync(agent, "上海呢？")
print(result.final_output)`

const handoffSnippet = `billing_agent = Agent(name="账单专员", instructions="处理账单问题")
refund_agent  = Agent(name="退款专员", instructions="处理退款问题")

triage_agent = Agent(
    name="分诊台",
    instructions="判断问题归属，交接给对应专员。",
    handoffs=[billing_agent, refund_agent],   # 列出可交接目标
)`

const inputGuardrailSnippet = `from agents import (
    Agent, GuardrailFunctionOutput, RunContextWrapper, input_guardrail,
)

@input_guardrail
async def block_other_user(
    ctx: RunContextWrapper, agent: Agent, user_input,
) -> GuardrailFunctionOutput:
    text = str(user_input)
    return GuardrailFunctionOutput(
        output_info={"reason": "疑似越权访问"},
        tripwire_triggered="别人" in text,   # 命中即中断
    )

agent = Agent(
    name="客服",
    instructions="...",
    input_guardrails=[block_other_user],
)`

const outputGuardrailSnippet = `from agents import output_guardrail, GuardrailFunctionOutput

@output_guardrail
async def no_internal_leak(ctx, agent, output) -> GuardrailFunctionOutput:
    text = str(output)
    leaked = any(k in text for k in ["内部成本", "进价", "API_KEY"])
    return GuardrailFunctionOutput(
        output_info={"leaked": leaked},
        tripwire_triggered=leaked,   # 回答里泄露敏感信息就拦下
    )`

const sessionSnippet = `from agents import Runner, SQLiteSession

session = SQLiteSession("user-123")          # 用一个 session_id 标识这轮对话
await Runner.run(agent, "我叫小明", session=session)
result = await Runner.run(agent, "我叫什么？", session=session)
print(result.final_output)   # 自动带上历史 → "你叫小明"`

const toolSnippet = `from agents import function_tool

@function_tool
def lookup_order(order_id: str) -> str:
    """根据订单号查询订单状态。"""   # docstring → 工具描述
    return f"订单 {order_id}：已支付，预计 3 天内发货。"
# 函数签名(order_id: str) 自动生成 JSON Schema 参数，无需手写`

const thirdPartySnippet = `from openai import AsyncOpenAI
from agents import (
    set_default_openai_client, set_default_openai_api, set_tracing_disabled,
)

client = AsyncOpenAI(base_url="https://your-endpoint/v1", api_key="...")
set_default_openai_client(client, use_for_tracing=False)
set_default_openai_api("chat_completions")   # 第三方端点只支持 Chat Completions
set_tracing_disabled(True)                    # tracing 上报需 OpenAI key，关掉`

export default function Ch1() {
  return (
    <article>
      <Lead>
        OpenAI Agents SDK 是 OpenAI 官方推出的轻量级多 Agent 编排框架。它的口号是「极少抽象」：
        不发明庞大的 DSL，只给你 Agent、Runner、Handoff、Guardrail、Session、Tracing 这几个原语，
        用纯 Python 就能拼出可路由、可分诊、带安全护栏、可观测的多 Agent 系统。本章把这套
        「少抽象」的设计哲学与每个原语逐个讲透，下一章再用一个能跑的客服分诊系统全部落地。
      </Lead>

      <h2>一、起源：从实验性 Swarm 到生产级继任者</h2>
      <p>
        2024 年 OpenAI 放出过一个叫 <strong>Swarm</strong> 的实验性项目，目的是验证一个朴素的想法：
        多 Agent 协作其实不需要复杂的编排引擎，用「Agent + Handoff」两个原语就够了。Swarm 当时
        定位是「教学 / 实验」，明确声明不用于生产。
      </p>
      <p>
        Agents SDK 就是 Swarm 的<strong>生产级继任者</strong>：它完整继承了 Swarm 的核心原语
        （Agent 与 Handoff），并补齐了真正上生产所缺的工程能力——<strong>Guardrails（护栏）、
        Tracing（可观测）、Sessions（多轮状态）</strong>。换句话说，Swarm 证明了「少抽象」可行，
        Agents SDK 把它做成了可靠的工程框架。
      </p>
      <h3>设计哲学：三条铁律</h3>
      <ul>
        <li><strong>少量原语</strong>：能用一个概念解决就绝不引入第二个。你不需要先学一周框架才能写第一个 Agent。</li>
        <li><strong>Python-first</strong>：工具就是普通 Python 函数，控制流就是普通 Python；不强迫你用图、节点、YAML。</li>
        <li><strong>不发明 DSL</strong>：没有专有的图描述语言、没有声明式状态机语法，能力靠组合原语得到。</li>
      </ul>
      <h3>版本与活跃度（2026 年）</h3>
      <ul>
        <li>包名 <code>openai-agents</code>，最新版本约 <strong>0.17.x</strong>（2026 年 6 月），<strong>月度高频发版</strong>。</li>
        <li>GitHub 约 <strong>2.7 万 star</strong>，是当前最主流的官方多 Agent 框架之一。</li>
      </ul>

      <KeyIdea>
        Agents SDK 的核心信念：<strong>用少量原语拼出多 Agent 系统</strong>。
        记住一句话——「Agent 是角色、Handoff 是交接、Guardrail 是护栏、Session 是记忆、
        Runner 把它们跑起来」，你就抓住了整个框架。
      </KeyIdea>

      <h2>二、核心抽象逐个详解</h2>
      <p>下面这张表先给全貌，再逐个配最小代码片段讲清楚。</p>
      <table>
        <thead>
          <tr><th>原语</th><th>职责</th><th>一句话</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Agent</code></td><td>一个可被运行的角色</td><td>instructions + model + tools</td></tr>
          <tr><td><code>Runner</code></td><td>驱动工具循环</td><td>Runner.run / run_sync</td></tr>
          <tr><td><code>Handoff</code></td><td>控制权交接</td><td>返回另一个 Agent 的特殊工具调用</td></tr>
          <tr><td><code>Guardrail</code></td><td>输入/输出并行校验</td><td>命中 tripwire 抛异常中断</td></tr>
          <tr><td><code>Session</code></td><td>自动多轮状态</td><td>跨轮自动带历史</td></tr>
          <tr><td><code>Tracing</code></td><td>内置可观测</td><td>OpenAI 专有，可视化每一步</td></tr>
          <tr><td><code>function_tool</code></td><td>把函数变工具</td><td>docstring/签名自动成 schema</td></tr>
        </tbody>
      </table>

      <h3>Agent：一个可被运行的角色</h3>
      <p>
        一个 Agent 由三样东西定义：<code>instructions</code>（系统提示 / 职责）、<code>model</code>
        （用哪个模型）、<code>tools</code>（可调用的工具列表）。它就是一个有明确职责的角色，
        比如「分诊台」「账单专员」。还可挂 <code>handoffs</code>、<code>input_guardrails</code>、
        <code>output_guardrails</code>、<code>model_settings</code> 等。
      </p>
      <CodeBlock lang="python" title="定义一个 Agent" code={agentSnippet} />

      <h3>Runner：驱动工具循环</h3>
      <p>
        Agent 本身只是个声明，真正跑起来要靠 Runner。<code>Runner.run(agent, input)</code>（异步）
        与 <code>Runner.run_sync(agent, input)</code>（同步）会启动这样一个循环：
        <strong>调用模型 → 若模型要求调用工具则执行工具并把结果回灌 → 再调用模型</strong>，
        如此往复，直到模型产出不再调用工具的最终回答为止。循环次数、工具调度、handoff 切换
        这些细节全由 Runner 内部处理，你只需要拿 <code>result.final_output</code>。
      </p>
      <CodeBlock lang="python" title="Runner 驱动循环" code={runnerSnippet} />

      <h3>Handoff：返回另一个 Agent 的特殊工具调用</h3>
      <p>
        Handoff 的本质，是一次<strong>「返回另一个 Agent」的特殊工具调用</strong>。在
        <code>handoffs=[...]</code> 里列出的每个 Agent，都会被自动暴露成一个工具；当前 Agent
        判断该交接时，就「调用」这个工具，于是控制权转交给目标 Agent。声明极简：
      </p>
      <CodeBlock lang="python" title="声明 handoffs" code={handoffSnippet} />

      <h3>Guardrail：输入 / 输出并行校验</h3>
      <p>
        护栏用 <code>@input_guardrail</code> / <code>@output_guardrail</code> 装饰函数，与主流程
        <strong>并行</strong>运行，返回 <code>GuardrailFunctionOutput(tripwire_triggered=...)</code>。
        一旦 tripwire（绊线）命中，SDK 立即抛异常中断整个运行。
      </p>
      <CodeBlock lang="python" title="输入护栏" code={inputGuardrailSnippet} />

      <h3>Session：自动多轮状态</h3>
      <p>
        Session 让 Agent 跨多轮对话自动保留上下文，无需你手动拼接历史。把同一个 session 传给
        多次 <code>Runner.run</code>，前几轮的对话会被自动带上。
      </p>
      <CodeBlock lang="python" title="多轮会话" code={sessionSnippet} />

      <h3>Tracing：内置可观测性</h3>
      <ul>
        <li>SDK 自带 tracing，能可视化每一次模型调用、工具调用与 handoff 的链路。</li>
        <li>这是 OpenAI 专有能力，<strong>上报需要 OpenAI key</strong>；接第三方模型时通常要关掉，否则上报失败。</li>
      </ul>

      <h3>function_tool：把普通函数变工具</h3>
      <p>
        给一个普通 Python 函数加 <code>@function_tool</code>，它就成了 Agent 可调用的工具：
        函数名 → 工具名，docstring → 工具描述，类型注解 → 参数 JSON Schema。你几乎不用手写任何
        schema。
      </p>
      <CodeBlock lang="python" title="function_tool" code={toolSnippet} />

      <h2>三、架构总览：数据如何流动</h2>
      <p>
        把上面几个原语串起来，整体数据流就清晰了。下图展示了一次请求从进入到产出最终结果的全过程。
      </p>
      <ArchDiagram framework="openai-agents" />
      <p>读这张图的关键路径：</p>
      <ul>
        <li><strong>Runner</strong> 接收用户输入，先跑 <strong>输入护栏</strong>（并行）；命中 tripwire 直接抛异常中断。</li>
        <li>护栏通过后进入 <strong>Agent 的工具循环</strong>：模型决定调用工具还是 handoff。</li>
        <li>若是普通工具调用 → 执行工具、回灌结果、继续循环；若是 <strong>handoff</strong> → 控制权移交目标 Agent，从此由它接管循环。</li>
        <li>模型产出最终回答后，再跑 <strong>输出护栏</strong>，全部通过则返回 <code>final_output</code>。</li>
      </ul>

      <h2>四、Handoff 深入：交接，而非取一个返回值</h2>
      <p>
        初学者最容易把 handoff 和「子代理被当成一个工具调用」混为一谈，这是理解 Agents SDK 的关键分水岭。
      </p>
      <table>
        <thead>
          <tr><th></th><th>子代理当工具调用</th><th>Handoff 交接</th></tr>
        </thead>
        <tbody>
          <tr><td>语义</td><td>取一个<strong>返回值</strong>，主 Agent 继续</td><td>把<strong>整段对话控制权</strong>移交</td></tr>
          <tr><td>谁作答</td><td>始终是主 Agent</td><td>交接后由目标 Agent 直接对用户作答</td></tr>
          <tr><td>之后</td><td>回到主 Agent 的循环</td><td>不再回到分诊台，目标 Agent 接管</td></tr>
          <tr><td>适合</td><td>查资料、算一个子结果</td><td>分诊路由、按领域切换专家</td></tr>
        </tbody>
      </table>
      <Example title="多 Agent 分诊的心智模型">
        想象一个客服分诊台：用户发来「我要退款」。分诊台 Agent 读到问题，判断这属于退款范畴，
        于是触发一次 handoff——把整段对话的控制权交给「退款专员」Agent。从这一刻起，对话由退款
        专员接管，它用自己的 instructions 和工具继续与用户对话，直到给出最终答复，<strong>不会</strong>
        把一个「子结果」返回给分诊台再让分诊台作答。整个过程没有写任何状态机，只是「分诊台决定交给谁」
        这一步，路由就自然完成了。
      </Example>
      <Callout variant="note">
        判断标准：如果你想要的是「让另一个角色接手并直接回用户」，那是 <strong>handoff</strong>；
        如果你只想「拿一个中间结果回来自己继续」，那应该做成 <strong>工具</strong>（function_tool），
        而不是 handoff。
      </Callout>

      <h2>五、Guardrail 深入：输入护栏 vs 输出护栏</h2>
      <ul>
        <li><strong>输入护栏（input_guardrail）</strong>：在 Agent 真正处理前校验<strong>用户输入</strong>，
          典型用途是拦截越权、敏感、离题、Prompt 注入等请求。</li>
        <li><strong>输出护栏（output_guardrail）</strong>：在 Agent 产出最终回答后校验<strong>输出内容</strong>，
          典型用途是防止泄露内部信息、检查格式合规、过滤不当内容。</li>
      </ul>
      <h3>为什么要「并行」校验</h3>
      <p>
        护栏与主流程并行运行，是为了<strong>不增加额外延迟</strong>：在主 Agent 思考的同时，护栏函数
        同步在跑校验。如果护栏发现问题（tripwire 命中），就立刻打断主流程，避免把时间和 token
        浪费在一个本就不该处理的请求上。
      </p>
      <h3>tripwire 中断机制</h3>
      <p>
        护栏返回的 <code>GuardrailFunctionOutput</code> 里有个 <code>tripwire_triggered</code> 布尔位。
        一旦它为 <code>True</code>，SDK 抛出 <code>InputGuardrailTripwireTriggered</code>（或对应的输出护栏
        异常），整个 <code>Runner.run</code> 立即中断。所以调用方一般要 <code>try/except</code> 捕获，
        给用户一个礼貌的拒绝答复。
      </p>
      <CodeBlock lang="python" title="输出护栏：防止泄露内部信息" code={outputGuardrailSnippet} />

      <h2>六、接非 OpenAI 模型的注意事项</h2>
      <p>
        SDK <strong>默认走 OpenAI 的 Responses API</strong>。但绝大多数第三方端点（百炼、各类 OpenAI
        兼容网关）<strong>只支持 Chat Completions</strong>，所以要接非 OpenAI 模型，必须显式切 API。
      </p>
      <CodeBlock lang="python" title="接第三方模型的通用配置" code={thirdPartySnippet} />
      <ul>
        <li><strong>Responses vs Chat Completions</strong>：默认 Responses；第三方端点用 <code>set_default_openai_api("chat_completions")</code> 切换，否则报「不支持的接口」类错误。</li>
        <li><strong>失去原生 tracing</strong>：tracing 上报需 OpenAI key，接第三方时用 <code>set_tracing_disabled(True)</code> 关掉，否则会因缺 key 报错。</li>
        <li><strong>如何补可观测</strong>：失去内置 tracing 后，可以自行接入 <strong>OpenTelemetry</strong>，
          对 <code>Runner.run</code> 与工具调用做埋点，把链路上报到自己的 APM（如 Jaeger / Langfuse 等）。</li>
      </ul>
      <Callout variant="warn">
        接百炼（DashScope）等第三方端点，<strong>必须切到 Chat Completions 并关掉 tracing</strong>，
        否则直接报错。下一章会用一个完整的客服分诊实战，把「接百炼关键四步」逐行讲清楚。
      </Callout>

      <h2>七、适合与不适合</h2>
      <ul>
        <li><strong>适合</strong>：多 Agent 分诊路由、带安全护栏的客服 / 工单系统、纯 Python 的轻量编排、
          需要官方原生 tracing 的 OpenAI 项目。</li>
        <li><strong>不适合</strong>：需要<strong>显式持久状态机</strong>、<strong>确定性 DAG</strong>、
          <strong>可回滚 / 可断点续跑</strong>的长流程编排。这类场景里控制流应当是「图」而不是「交接」，
          <strong>LangGraph</strong> 更合适——它把状态、节点、边都显式建模，便于持久化与回放。</li>
        <li>接非 OpenAI 模型时，会失去 Responses API 与原生 tracing 的部分能力（可用 OTel 弥补）。</li>
      </ul>

      <h2>八、本章定位与下一步</h2>
      <p>
        本章把 Agents SDK 的「为什么这样设计」和「每个原语怎么用」讲清楚了。它不是一个大而全的编排
        引擎，而是一套精挑细选的小原语，让你用最少的概念把多 Agent 协作跑起来。下一章我们直接上手：
        用「关键四步」把它接到百炼的 qwen-plus，写一个真实可跑的客服分诊系统，把 handoff、guardrail、
        function_tool 全部落地。
      </p>

      <Summary points={[
        'Agents SDK 是 OpenAI 官方框架，是实验性 Swarm 的生产级继任者：保留 Agent+Handoff 原语，补齐 guardrails/tracing/sessions。',
        '设计哲学：少量原语、Python-first、不发明 DSL；2026 年约 0.17.x，月度高频发版，约 2.7 万 star。',
        '七个核心抽象：Agent（角色）、Runner（驱动循环）、Handoff（交接）、Guardrail（并行护栏）、Session（多轮状态）、Tracing（可观测）、function_tool（函数变工具）。',
        'Handoff 是把整段对话控制权移交给另一个 Agent，而非取一个返回值；想拿子结果用 function_tool。',
        'Guardrail 分输入/输出，与主流程并行校验，命中 tripwire 即抛异常中断，需 try/except 捕获。',
        '默认走 Responses API；接第三方端点要 set_default_openai_api("chat_completions") 并 set_tracing_disabled(True)，可用 OpenTelemetry 补可观测。',
        '适合分诊路由/带护栏客服/轻量编排；需显式状态机、确定性 DAG、可回滚长流程时 LangGraph 更合适。',
      ]} />
    </article>
  )
}

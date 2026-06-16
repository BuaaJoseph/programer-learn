import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const handoffsSnippet = `triage_agent = Agent(
    name="分诊台",
    model="qwen-plus",
    instructions="判断用户问题属于账单还是退款，交接给对应专员。",
    handoffs=[billing_agent, refund_agent],   # 交接目标
)`

const guardrailSnippet = `@input_guardrail
async def no_other_customer(ctx, agent, user_input):
    tripwire = "别人" in str(user_input)
    return GuardrailFunctionOutput(
        output_info={"reason": "疑似越权访问"},
        tripwire_triggered=tripwire,   # 命中即中断
    )`

const runnerSnippet = `result = await Runner.run(triage_agent, "我的订单到哪了？")
print(result.final_output)   # 循环跑到产出最终输出为止`

export default function Ch1() {
  return (
    <article>
      <Lead>
        OpenAI Agents SDK 是官方推出的轻量级多 Agent 编排框架。它不堆砌沉重的抽象，
        而是用极少的几个原语——Agent、Runner、Handoff、Guardrail——就能拼出一套可路由、
        可分诊、带安全护栏的多 Agent 系统。本章先把这套「少抽象」的设计思想讲透。
      </Lead>

      <h2>它从哪来：从实验性 Swarm 到生产级继任者</h2>
      <p>
        早期 OpenAI 放出过一个叫 Swarm 的实验项目，验证「用最少抽象实现多 Agent 交接」的想法。
        Agents SDK 就是 Swarm 的<strong>生产级继任者</strong>：保留了极简哲学，但补齐了护栏、
        会话状态、可观测性等工程能力。该项目迭代非常活跃，最新版本约在 0.17.x（2026 年），
        几乎月度高频发版。
      </p>

      <KeyIdea>
        Agents SDK 的核心信念：<strong>用少量原语拼出多 Agent 系统</strong>。
        你不需要学一套庞大的 DSL，只要理解「Agent 是角色、Handoff 是交接、Guardrail 是护栏、
        Runner 把它们跑起来」，就能上手。
      </KeyIdea>

      <h2>核心抽象</h2>

      <h3>Agent：一个可被运行的角色</h3>
      <ul>
        <li>由三样东西定义：<code>instructions</code>（系统提示/职责）、<code>model</code>（用哪个模型）、<code>tools</code>（可调用的工具）。</li>
        <li>一个 Agent 就是一个有明确职责的角色，比如「分诊台」「账单专员」「退款专员」。</li>
      </ul>

      <h3>Runner：驱动循环</h3>
      <ul>
        <li><code>Runner.run(agent, input)</code> 启动「调用模型 → 执行工具 → 再调用模型」的循环，直到 Agent 产出最终输出。</li>
        <li>循环、工具调度、handoff 切换这些细节由 Runner 内部处理，你只拿结果 <code>final_output</code>。</li>
      </ul>
      <CodeBlock lang="python" title="Runner 驱动循环" code={runnerSnippet} />

      <h3>Handoff（交接）：返回另一个 Agent 的特殊工具</h3>
      <ul>
        <li>Handoff 的本质，是一次<strong>「返回另一个 Agent」的特殊工具调用</strong>。</li>
        <li>分诊 Agent 判断问题归属后，把控制权交给专家 Agent，之后由专家接管对话。</li>
        <li>声明方式很简单：在 Agent 上写 <code>{'handoffs=[a, b]'}</code>。</li>
      </ul>
      <CodeBlock lang="python" title="声明 handoffs" code={handoffsSnippet} />

      <h3>Guardrail（护栏）：并行校验，命中即断</h3>
      <ul>
        <li>护栏对输入或输出做<strong>并行校验</strong>，一旦命中「tripwire（绊线）」就立即中断整个运行。</li>
        <li>用 <code>@input_guardrail</code> 装饰一个函数，返回 <code>GuardrailFunctionOutput(tripwire_triggered=...)</code>。</li>
        <li>典型用途：拦截越权请求、过滤敏感内容、阻止离题滥用。</li>
      </ul>
      <CodeBlock lang="python" title="输入护栏" code={guardrailSnippet} />

      <h3>Session：自动维护多轮状态</h3>
      <ul>
        <li>Session 让 Agent 在多轮对话间自动保留上下文，无需你手动拼接历史。</li>
      </ul>

      <h3>Tracing：内置可观测性</h3>
      <ul>
        <li>SDK 自带 tracing，能可视化每一步的调用、工具与 handoff。</li>
        <li>但这是 OpenAI 专有能力，<strong>接第三方模型时通常需要关掉</strong>（否则上报会失败）。</li>
      </ul>

      <h2>范式：轻量循环 + handoff</h2>
      <p>
        和重型的状态图 / DSL 框架不同，Agents SDK 走的是「轻量循环 + handoff」范式：
        没有显式的图节点、没有确定性 DAG，控制流通过 Agent 之间的交接自然流动。
      </p>

      <Example title="handoff 怎么发生">
        想象一个客服分诊台：用户发来「我要退款」。分诊台 Agent 读到问题，判断这属于退款范畴，
        于是触发一次 handoff——把控制权交给「退款专员」Agent。从这一刻起，对话由退款专员接管，
        它用自己的 instructions 和工具继续处理，直到给出最终答复。整个过程没有写任何状态机，
        只是「分诊台决定交给谁」这一步自然完成了路由。
      </Example>

      <h2>适合与不适合</h2>
      <ul>
        <li><strong>适合</strong>：多 Agent 分诊路由、带安全护栏的客服系统、纯 Python 的轻量编排。</li>
        <li><strong>不适合</strong>：需要显式持久状态机、确定性 DAG、可回滚的长流程——这类场景 LangGraph 更合适。</li>
        <li>接非 OpenAI 模型时，会失去 Responses API 与原生 tracing 的部分能力。</li>
      </ul>

      <Callout variant="warn">
        本 SDK <strong>默认走 Responses API</strong>，而百炼（DashScope）等第三方端点只支持
        Chat Completions。所以要把它接到百炼，必须做「关键四步」改造，否则直接报错。
        下一章我们就用一个完整的客服分诊实战，把这四步逐行讲清楚。
      </Callout>

      <Summary points={[
        'Agents SDK 是 Swarm 的生产级继任者，主打「极少抽象」，2026 年迭代到约 0.17.x。',
        '五大原语：Agent（角色）、Runner（驱动循环）、Handoff（交接）、Guardrail（并行护栏）、Session（多轮状态）。',
        'Handoff 本质是「返回另一个 Agent」的特殊工具调用，用 handoffs=[...] 声明。',
        'Guardrail 命中 tripwire 即立即中断，适合拦截越权与滥用。',
        '范式是轻量循环 + handoff，适合分诊路由；显式状态机/DAG 长流程更适合 LangGraph。',
        '默认走 Responses API，接百炼需切到 Chat Completions 并关掉 tracing——下一章详解。',
      ]} />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const agentSig = `from pydantic_ai import Agent

agent = Agent(
    model,                 # 绑定模型
    deps_type=SupportDeps, # 绑定依赖类型（注入用）
    output_type=Triage,    # 绑定结构化输出类型
    system_prompt="...",
)`

const toolSig = `from pydantic_ai import RunContext

# 需要上下文（能访问 ctx.deps）
@agent.tool
def get_balance(ctx: RunContext[SupportDeps]) -> str:
    return f"余额 {ctx.deps.balances}"

# 不需要上下文
@agent.tool_plain
def now() -> str:
    return "2026-06-16"`

export default function Ch1() {
  return (
    <article>
      <Lead>
        如果说很多框架在比谁的"链"更花哨，PydanticAI 走的是另一条路：把类型系统和依赖注入当成一等公民，
        让 Agent 像写一个 FastAPI 接口那样可靠、可测试、可观测。它出自 Pydantic 团队（与 FastAPI 同生态），
        口号就是"把 FastAPI 的开发体验带到 GenAI"。
      </Lead>

      <h2>一、它到底是什么</h2>
      <p>
        PydanticAI 是一个类型安全、Pythonic 的 Agent 开发框架。它已经 GA，最新版本约在 1.10x（2026），
        几乎每周发版，迭代非常活跃。它最大的卖点不是"功能多"，而是"工程上靠谱"——
        输出有 schema、依赖能注入、行为能测试、运行能观测。
      </p>

      <KeyIdea>
        用类型与依赖注入，把 Agent 从"调一段会说话的文本"变成"可工程化、可测试的软件组件"。
        模型的输出不再是一段需要你猜着解析的字符串，而是一个已经被校验过的对象。
      </KeyIdea>

      <h2>二、核心抽象</h2>

      <h3>1. 泛型 Agent</h3>
      <ul>
        <li>
          <code>Agent(model, deps_type=..., output_type=...)</code> 把模型、依赖类型、输出类型
          一次性绑进类型系统。IDE 和类型检查器能据此给出补全和报错。
        </li>
      </ul>
      <CodeBlock lang="python" title="Agent 的核心签名">{agentSig}</CodeBlock>

      <h3>2. 结构化输出 output_type</h3>
      <ul>
        <li>给 <code>output_type=</code> 传一个 Pydantic <code>BaseModel</code>，模型的输出会被自动解析并校验成该类的实例。</li>
        <li>如果模型给出的内容不符合 schema，框架会自动重试，直到拿到合规的对象。</li>
        <li>拿到结果后 <code>result.output</code> 保留完整类型，IDE 里点字段都有补全。</li>
      </ul>
      <Callout variant="warning">
        命名提醒：当前参数是 <code>output_type</code>，旧的 <code>result_type</code> 已弃用。看老教程时注意替换。
      </Callout>

      <h3>3. 依赖注入 deps</h3>
      <ul>
        <li>
          用 <code>deps_type=</code> 声明依赖类型；在工具或系统提示里通过 <code>RunContext[Deps]</code> 的
          <code>ctx.deps</code> 访问你注入的依赖——数据库连接、配置、当前用户等。
        </li>
        <li>这正是 FastAPI 风格：依赖从外部传入，而不是在函数体里硬编码。</li>
      </ul>

      <h3>4. 工具</h3>
      <ul>
        <li><code>@agent.tool</code>：带 <code>RunContext</code>，能访问注入的依赖。</li>
        <li><code>@agent.tool_plain</code>：不需要上下文的纯函数工具。</li>
      </ul>
      <CodeBlock lang="python" title="两种工具装饰器">{toolSig}</CodeBlock>

      <h3>5. Pydantic Graph</h3>
      <ul>
        <li>
          独立包 <code>pydantic-graph</code>，用来做有状态的有限状态机（FSM）式编排，
          适合多步骤、需要显式状态流转的流程。这里点到为止。
        </li>
      </ul>

      <h3>6. 可观测与持久化</h3>
      <ul>
        <li>原生集成 Logfire 做可观测；并支持持久化执行（把运行过程落盘、可恢复）。</li>
      </ul>

      <Callout variant="warning">
        命名提醒：模型类当前为 <code>OpenAIChatModel</code>，旧的 <code>OpenAIModel</code> 已改名。
      </Callout>

      <h2>三、范式：schema-first + 依赖注入</h2>
      <p>
        PydanticAI 的范式可以概括为"类型安全 / schema-first + 依赖注入"，整体低魔法、贴近普通 Python 工程。
        你先定义输出长什么样（schema），再定义依赖怎么注入，框架负责把模型套进这套约束里。
      </p>

      <Example title="为什么结构化输出重要">
        想象你在做信息抽取、文本分类、表单填写，或者要把结果喂给下游 API。
        如果模型只给你"一段自由文本"，你得写正则、写解析、处理各种边角情况，还可能时不时崩。
        而如果你直接拿到一个"已校验的对象"——字段类型对、取值范围对、必填项都在——
        下游代码可以直接 <code>obj.severity</code> 这样用，可靠性和可维护性都高了一个量级。
      </Example>

      <h2>四、适合 / 不适合</h2>
      <ul>
        <li><strong>适合</strong>：需要可靠结构化输出的场景；强类型、可测试、可观测的生产级 Agent；已经在用 Pydantic / FastAPI 的团队。</li>
        <li><strong>不适合</strong>：想要 LangChain 那种海量预制链 / 检索生态；只是写个极简的一次性脚本；非 Python 技术栈。</li>
      </ul>

      <Callout variant="tip">
        下一章我们用 <code>OpenAIChatModel</code> + <code>OpenAIProvider(base_url=百炼)</code> 接入 Qwen，
        做一个真实可跑的工单分级 Agent。顺便提一句：PydanticAI 官方还提供了 <code>AlibabaProvider</code>，可以原生接百炼。
      </Callout>

      <Summary points={[
        'PydanticAI 由 Pydantic 团队出品，主打类型安全、依赖注入与可测试，把 FastAPI 体验带到 GenAI。',
        '泛型 Agent 把 model / deps_type / output_type 绑进类型系统。',
        'output_type 传 BaseModel：自动解析校验、不合规自动重试、result.output 保留类型（注意旧名 result_type 已弃）。',
        'deps 依赖注入：deps_type 声明，RunContext[Deps].deps 访问；工具分 @agent.tool（带上下文）与 @agent.tool_plain。',
        '模型类现为 OpenAIChatModel（旧 OpenAIModel 已改名）；另有 pydantic-graph 做有状态编排、Logfire 做可观测。',
        '适合生产级、强类型、可测试的结构化 Agent；不适合追求预制链生态、极简脚本或非 Python 栈。',
      ]} />
    </article>
  )
}

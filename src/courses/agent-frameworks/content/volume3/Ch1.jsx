import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const agentSig = `from pydantic_ai import Agent

# Agent 是泛型：把模型、依赖类型、输出类型一次性绑进类型系统
agent = Agent(
    model,                 # 绑定模型（OpenAIChatModel/AlibabaProvider/...）
    deps_type=SupportDeps, # 绑定依赖类型（注入用，工具里 ctx.deps 即此类型）
    output_type=Triage,    # 绑定结构化输出类型（Pydantic BaseModel）
    system_prompt="你是客服工单分级助手。",
)

# 类型检查器知道：result.output 是 Triage，ctx.deps 是 SupportDeps
result = agent.run_sync("我被重复扣费了", deps=SupportDeps(...))
triage = result.output            # 类型为 Triage，IDE 里点字段有补全`

const outputSig = `from pydantic import BaseModel, Field

class Triage(BaseModel):
    severity: int = Field(ge=1, le=5, description="严重度 1-5")
    needs_human: bool = Field(description="是否需要转人工")
    summary: str = Field(description="一句话摘要")

agent = Agent(model, output_type=Triage)

# 模型返回的内容被自动解析、校验成 Triage 实例：
#  - severity 必须是 1~5 的整数，否则框架带着错误信息让模型重试
#  - needs_human 必须能转成 bool
#  - 缺字段、类型不对 → 自动重试，直到拿到合规对象
result = agent.run_sync("...")
assert isinstance(result.output, Triage)`

const depsSig = `from dataclasses import dataclass
from pydantic_ai import Agent, RunContext

@dataclass
class SupportDeps:
    customer_id: str
    db: "Database"          # 数据库连接、配置、当前用户都放这里

agent = Agent(model, deps_type=SupportDeps, output_type=Triage)

# 工具通过 RunContext[Deps] 拿到注入的依赖，而不是在函数体里硬编码
@agent.tool
async def get_balance(ctx: RunContext[SupportDeps]) -> str:
    bal = await ctx.deps.db.balance(ctx.deps.customer_id)
    return f"余额 {bal} 元"

# 不需要上下文的纯函数工具
@agent.tool_plain
def now() -> str:
    return "2026-06-16"`

const sysSig = `from pydantic_ai import Agent, RunContext

agent = Agent(model, deps_type=SupportDeps)

# 静态系统提示直接写在构造参数里；动态部分用装饰器，每次 run 时按 deps 生成
@agent.system_prompt
def add_customer(ctx: RunContext[SupportDeps]) -> str:
    return f"当前客户编号是 {ctx.deps.customer_id}，请结合其历史判断。"

# 多个 @agent.system_prompt 会被拼接，适合把"随上下文变化"的信息注入进去`

const graphSig = `# 独立包：pip install pydantic-graph
from pydantic_graph import BaseNode, End, Graph

# 有状态的有限状态机（FSM）：节点之间显式声明流转
# 适合多步骤、需要可见状态机的工作流（审批、对话流程等）
# Agent 本身已能处理"工具循环"，Graph 用于更复杂的编排，按需引入`

const modelSig = `from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

# 通过 OpenAI 兼容协议接百炼（DashScope）
model = OpenAIChatModel(
    "qwen-max",
    provider=OpenAIProvider(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key="sk-...",
    ),
)

# 或者用官方原生 Provider：
# from pydantic_ai.providers.alibaba import AlibabaProvider
# model = OpenAIChatModel("qwen-max", provider=AlibabaProvider(api_key="..."))

# 最省事的写法：设置环境变量 ALIBABA_API_KEY，再用字符串简写
# agent = Agent("alibaba:qwen-max")`

const overrideSig = `# 工程化亮点：测试里用 override 替换依赖或换成假模型
from pydantic_ai.models.test import TestModel

def test_triage_returns_valid_object():
    # override 是上下文管理器，块内生效，块外自动还原
    with support_agent.override(model=TestModel()):
        result = support_agent.run_sync(
            "随便一句话",
            deps=SupportDeps(customer_id="C001", balances={}),
        )
    # 不调真模型也能断言：输出一定是合规的 Triage
    assert 1 <= result.output.severity <= 5
    assert isinstance(result.output.needs_human, bool)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        当很多框架在比谁的「链」更花哨、谁的预制组件更多时，PydanticAI 走了一条几乎相反的路：
        把类型系统和依赖注入当成一等公民，让你像写一个 FastAPI 接口那样去写 Agent——
        输出有 schema、依赖能注入、行为能测试、运行能观测。它出自 Pydantic 团队（与 FastAPI 同生态），
        口号就是「把 FastAPI 的开发体验带到 GenAI」。这一章我们把它的设计哲学、核心抽象和适用边界一次讲透。
      </Lead>

      <h2>一、它到底是什么</h2>
      <p>
        PydanticAI 是一个类型安全、Pythonic 的 Agent 开发框架。它的出品方很关键：
        Pydantic 是 Python 生态里最流行的数据校验库（FastAPI、众多框架的底座），
        而 PydanticAI 由同一个团队打造，定位非常清晰——把那套「定义模型、自动校验、IDE 友好」的开发体验，
        从 Web API 平移到生成式 AI 上。
      </p>
      <p>
        它已经 GA（正式可用），最新版本约在 1.10x（2026 年 6 月），GitHub star 约 1.77 万，
        几乎每周发版，2.0 beta 也在途中——迭代非常活跃。它最大的卖点不是「功能多」，而是「工程上靠谱」：
        模型的输出不再是一段需要你猜着解析的字符串，而是一个已经被校验过、带类型的对象。
      </p>

      <KeyIdea>
        用类型与依赖注入，把 Agent 从「调一段会说话的文本」变成「可工程化、可测试的软件组件」。
        你拿到的是结构化、已校验的对象，而不是需要正则去抠的自由文本。
      </KeyIdea>

      <h2>二、起源：Pydantic / FastAPI 生态背景</h2>
      <p>
        要理解 PydanticAI，先理解它的家族。Pydantic 用 Python 类型注解描述数据结构，运行时自动校验、序列化；
        FastAPI 在它之上，让你「声明参数类型，框架替你做校验和文档」。PydanticAI 把这套范式继续往上叠：
        你声明 Agent 的输入依赖类型、输出类型，框架替你做注入、校验和重试。
      </p>
      <p>
        为什么类型安全对 Agent 尤其重要？因为 Agent 的输出最终要被代码消费——存数据库、调下游 API、做分支判断。
        如果输出是「模型随口说的一段话」，每一处消费点都得自己解析、自己兜底；
        而如果输出是一个保证合规的对象，下游就能像调用普通函数返回值一样安全地使用它。
      </p>
      <h3>与 LangChain 路线的不同</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>LangChain 风格</th><th>PydanticAI 风格</th></tr>
        </thead>
        <tbody>
          <tr><td>抽象密度</td><td>大量预制链 / 组件 / 集成</td><td>低魔法，贴近普通 Python</td></tr>
          <tr><td>核心卖点</td><td>生态广、拼装快</td><td>类型安全、可测试、可观测</td></tr>
          <tr><td>输出处理</td><td>解析器 + 自定义解析</td><td>output_type 自动校验 + 重试</td></tr>
          <tr><td>依赖管理</td><td>多在闭包/全局里</td><td>显式依赖注入（deps_type）</td></tr>
        </tbody>
      </table>
      <p>
        一句话：LangChain 给你一座工具城，PydanticAI 给你一根稳固的脊柱。两者哲学不同，没有谁取代谁。
      </p>

      <h2>三、设计理念：像写 FastAPI 一样写 Agent</h2>
      <ul>
        <li><strong>schema-first</strong>：先定义输出长什么样（一个 Pydantic 模型），再让模型去填它，而不是反过来去解析模型的自由发挥。</li>
        <li><strong>类型驱动</strong>：泛型 Agent 把 model / deps / output 绑进类型系统，IDE 补全、类型检查器、重构都能受益。</li>
        <li><strong>依赖注入</strong>：数据库、配置、当前用户从外部注入，而非在函数体里硬编码——和 FastAPI 的 Depends 一脉相承。</li>
        <li><strong>可测试、可观测</strong>：能在测试里替换依赖与模型；能用 Logfire 观测每一次运行。这是从「玩具」走向「生产」的关键。</li>
      </ul>
      <KeyIdea>
        记住这条主线：<strong>schema-first + 类型驱动 + 依赖注入</strong>。
        框架的每个抽象都是为这三件事服务的。
      </KeyIdea>

      <h2>四、架构总览</h2>
      <p>
        下图是 PydanticAI 的分层结构。最上层是「类型契约」——你用 <code>output_type</code> 声明输出、
        用 <code>deps_type</code> 声明依赖；中间是泛型 <code>Agent</code> 及其工具与系统提示；
        底层是模型适配（通过 OpenAI 兼容协议接百炼 Qwen）。
      </p>
      <ArchDiagram framework="pydantic-ai" />
      <p>数据流可以这样读：</p>
      <ol>
        <li>你调用 <code>agent.run(deps=...)</code>，把依赖（数据库、当前用户等）注入进去。</li>
        <li>模型开始工作；当它需要外部信息时，会调用工具，工具通过 <code>{'RunContext[Deps]'}</code> 的 <code>ctx.deps</code> 访问你注入的依赖。</li>
        <li>模型给出最终内容，框架按 <code>output_type</code> 解析并校验；若不合规，带着错误信息让模型重试。</li>
        <li>最终你拿到的 <code>result.output</code> 是一个保证合规、带完整类型的对象。</li>
      </ol>

      <h2>五、核心组件逐个详解</h2>

      <h3>1. 泛型 Agent</h3>
      <p>
        <code>Agent</code> 是整个框架的中枢，它是泛型的：<code>deps_type</code> 与 <code>output_type</code>
        会传播到工具签名、系统提示函数和返回值上，让类型检查器全程帮你把关。
      </p>
      <CodeBlock lang="python" title="Agent 的核心签名">{agentSig}</CodeBlock>

      <h3>2. 结构化输出 output_type</h3>
      <p>
        给 <code>output_type=</code> 传一个 Pydantic <code>BaseModel</code>，模型输出会被自动解析、校验成该类实例。
        不合规会自动重试。这是 PydanticAI 区别于「让模型吐 JSON 再 <code>json.loads</code>」的本质所在。
      </p>
      <CodeBlock lang="python" title="output_type：自动校验 + 重试">{outputSig}</CodeBlock>
      <Callout variant="warning">
        命名提醒：当前参数是 <code>output_type</code>，旧的 <code>result_type</code> 已弃用。看老教程时注意替换。
      </Callout>

      <h3>3. 依赖注入 deps_type + RunContext</h3>
      <p>
        用 <code>deps_type=</code> 声明依赖类型；在工具或系统提示里通过 <code>{'RunContext[Deps]'}</code> 的
        <code>ctx.deps</code> 访问这些依赖。工具分两种：<code>@agent.tool</code> 带上下文（能拿 <code>ctx.deps</code>），
        <code>@agent.tool_plain</code> 是不需要上下文的纯函数。
      </p>
      <CodeBlock lang="python" title="deps_type + RunContext + 两类工具">{depsSig}</CodeBlock>

      <h3>4. 动态 system_prompt</h3>
      <p>
        系统提示可以是静态字符串，也可以用 <code>@agent.system_prompt</code> 装饰一个函数，
        在每次运行时根据 <code>ctx.deps</code> 动态生成——比如把当前用户、当前时间、权限范围注入进去。
      </p>
      <CodeBlock lang="python" title="@agent.system_prompt 动态提示">{sysSig}</CodeBlock>

      <h3>5. Pydantic Graph（点到为止）</h3>
      <p>
        独立包 <code>pydantic-graph</code>，用于有状态的有限状态机（FSM）式编排，适合需要显式状态流转的多步骤流程。
        单个 Agent 已能处理「工具循环」，更复杂的编排再引入 Graph。
      </p>
      <CodeBlock lang="python" title="pydantic-graph 概览">{graphSig}</CodeBlock>

      <h3>6. 模型类</h3>
      <p>
        模型类当前为 <code>OpenAIChatModel</code>（旧的 <code>OpenAIModel</code> 已改名）。
        接百炼有三种写法：自定义 <code>OpenAIProvider(base_url=...)</code>、官方 <code>AlibabaProvider</code>、
        或最省事的字符串简写 <code>Agent("alibaba:qwen-max")</code> 配环境变量。
      </p>
      <CodeBlock lang="python" title="OpenAIChatModel 接百炼的三种写法">{modelSig}</CodeBlock>
      <Callout variant="warning">
        命名提醒：模型类现为 <code>OpenAIChatModel</code>，旧的 <code>OpenAIModel</code> 已改名；
        和 <code>result_type → output_type</code> 一样，是看老资料时最容易踩的坑。
      </Callout>

      <h2>六、结构化输出深入</h2>
      <p>
        为什么「拿到已校验对象」远胜「解析自由文本」？因为可靠性的差距是数量级的。
      </p>
      <Example title="自由文本 vs 已校验对象">
        想象你在做信息抽取、文本分类、表单填写，或要把结果喂给下游 API。
        如果模型只给你一段自由文本，你得写正则、写解析、处理各种边角情况，还可能时不时崩；
        而如果你直接拿到一个已校验的对象——字段类型对、取值范围对、必填项都在——
        下游可以直接写 <code>obj.severity</code>，可靠性和可维护性都高一个量级。
      </Example>
      <p>校验失败时的自动重试机制是关键：框架把校验错误信息回传给模型，让它在「知道哪里错了」的前提下重新作答，
        而不是简单地抛异常。<code>output_type</code> 也很灵活，可以是：</p>
      <ul>
        <li>一个 <code>BaseModel</code>（最常用）；</li>
        <li>一个 <code>dataclass</code>；</li>
        <li>一个 <code>Union</code>（让模型在多种结构里选一个，比如「成功结果 | 需要澄清」）；</li>
        <li>甚至简单的标量类型。</li>
      </ul>

      <h2>七、可测试性：override</h2>
      <p>
        这是 PydanticAI 最具工程价值的特性之一。<code>Agent.override(deps=..., model=...)</code>
        让你在测试里替换依赖或换成一个假模型（如 <code>TestModel</code>），不调真实大模型也能跑测试、断言输出字段。
        这意味着你的 Agent 能进 CI、能做回归、能快速验证而不烧 token。
      </p>
      <CodeBlock lang="python" title="override：在测试里替换依赖/模型">{overrideSig}</CodeBlock>
      <Callout variant="tip">
        <code>override</code> 是上下文管理器，块内生效、块外自动还原，互不污染。
        这正是「像写 FastAPI 一样写 Agent」的落地体现——可测试是设计目标，而非事后补丁。
      </Callout>

      <h2>八、适合 / 不适合 + 生态</h2>
      <table>
        <thead>
          <tr><th>适合</th><th>不适合</th></tr>
        </thead>
        <tbody>
          <tr><td>信息抽取 / 分类 / 表单填写</td><td>想要海量预制链、开箱即用的检索生态</td></tr>
          <tr><td>给下游 API 喂结构化 JSON</td><td>只是写个一次性的极简脚本</td></tr>
          <tr><td>强类型、可测试的生产级 Agent</td><td>非 Python 技术栈</td></tr>
          <tr><td>已经在用 Pydantic / FastAPI 的团队</td><td>追求「最少代码量」而不在意可维护性</td></tr>
        </tbody>
      </table>
      <p>
        生态方面：原生集成 <strong>Logfire</strong> 做可观测（看每次运行的 prompt、工具调用、token 消耗）；
        支持 <strong>MCP</strong>（Model Context Protocol），可把外部工具/资源接进来；并提供持久化执行能力。
      </p>

      <Summary points={[
        'PydanticAI 由 Pydantic 团队出品（与 FastAPI 同生态），主打类型安全、依赖注入、可测试与可观测，已 GA、约 1.10x、近乎每周发版。',
        '设计主线：schema-first + 类型驱动 + 依赖注入——像写 FastAPI 一样写 Agent，低魔法、不堆预制链。',
        '泛型 Agent 把 model / deps_type / output_type 绑进类型系统；run(deps=) → 模型(工具用 ctx.deps) → 按 output_type 校验/重试 → 类型化对象。',
        'output_type 传 BaseModel/dataclass/Union：自动解析校验、不合规自动重试、result.output 保留类型（旧名 result_type 已弃）。',
        '工具分 @agent.tool（带 RunContext，能用 ctx.deps）与 @agent.tool_plain；system_prompt 可用 @agent.system_prompt 动态生成。',
        'override(deps=/model=) 让 Agent 在测试里替换依赖或换假模型，是工程化亮点；模型类现为 OpenAIChatModel（OpenAIModel 已改名），生态含 Logfire、MCP、pydantic-graph。',
        '适合结构化抽取/分类/表单、给下游喂 JSON、强类型可测试的生产 Agent；不适合追求预制链生态、极简脚本或非 Python 栈。',
      ]} />
    </article>
  )
}

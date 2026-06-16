import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `# 1. 安装 PydanticAI（含常用 provider）
pip install "pydantic-ai"

# 2. 配置百炼（DashScope）API Key
#    在阿里云百炼控制台开通后获取 sk- 开头的 key
export DASHSCOPE_API_KEY="sk-你的密钥"

# 3. 运行示例
python examples/agent-frameworks/03-pydantic-ai/ticket_triage.py`

const fullCode = `import os
from dataclasses import dataclass

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

model = OpenAIChatModel(
    "qwen-plus",
    provider=OpenAIProvider(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key=os.environ["DASHSCOPE_API_KEY"],
    ),
)


@dataclass
class SupportDeps:
    """注入给 Agent 的依赖：当前客户 + 一个模拟数据库。"""
    customer_id: str
    balances: dict


class Triage(BaseModel):
    """结构化输出：工单分级结果。"""
    severity: int = Field(ge=1, le=5, description="严重度 1-5")
    needs_human: bool = Field(description="是否需要转人工")
    summary: str = Field(description="一句话摘要")


support_agent = Agent(
    model,
    deps_type=SupportDeps,
    output_type=Triage,
    system_prompt=(
        "你是客服工单分级助手。根据用户问题判断严重度(1-5)、是否需要转人工，"
        "并给出简要摘要。涉及金额纠纷时可查询客户余额辅助判断。"
    ),
)


@support_agent.tool
def get_balance(ctx: RunContext[SupportDeps]) -> str:
    """查询当前客户的账户余额。"""
    bal = ctx.deps.balances.get(ctx.deps.customer_id, 0)
    return f"客户 {ctx.deps.customer_id} 余额：{bal} 元"


def main() -> None:
    deps = SupportDeps(customer_id="C001", balances={"C001": 12.5})
    result = support_agent.run_sync("我被重复扣费两次，非常生气，要求立刻处理！", deps=deps)
    triage = result.output
    print("严重度:", triage.severity)
    print("需转人工:", triage.needs_human)
    print("摘要:", triage.summary)


if __name__ == "__main__":
    main()`

const modelSnippet = `model = OpenAIChatModel(
    "qwen-plus",
    provider=OpenAIProvider(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key=os.environ["DASHSCOPE_API_KEY"],
    ),
)`

const depsSnippet = `@dataclass
class SupportDeps:
    customer_id: str
    balances: dict`

const outSnippet = `class Triage(BaseModel):
    severity: int = Field(ge=1, le=5, description="严重度 1-5")
    needs_human: bool = Field(description="是否需要转人工")
    summary: str = Field(description="一句话摘要")`

const agentSnippet = `support_agent = Agent(
    model,
    deps_type=SupportDeps,
    output_type=Triage,
    system_prompt="你是客服工单分级助手。...",
)`

const toolSnippet = `@support_agent.tool
def get_balance(ctx: RunContext[SupportDeps]) -> str:
    bal = ctx.deps.balances.get(ctx.deps.customer_id, 0)
    return f"客户 {ctx.deps.customer_id} 余额：{bal} 元"`

const mainSnippet = `deps = SupportDeps(customer_id="C001", balances={"C001": 12.5})
result = support_agent.run_sync("我被重复扣费两次，非常生气，要求立刻处理！", deps=deps)
triage = result.output            # 类型为 Triage
print(triage.severity, triage.needs_human, triage.summary)`

const expectedOutput = `严重度: 5
需转人工: True
摘要: 客户反映被重复扣费两次，情绪激烈，要求立即处理，疑似计费故障。`

const overrideTest = `from pydantic_ai.models.test import TestModel
from triage import support_agent, SupportDeps  # 导入上面的 Agent

def test_triage_is_valid():
    # 用 override 换成假模型 + 假依赖，不调真实大模型，CI 里也能跑
    fake = SupportDeps(customer_id="C999", balances={"C999": 0})
    with support_agent.override(model=TestModel()):
        result = support_agent.run_sync("订单状态查询", deps=fake)

    triage = result.output
    # 不关心模型说了啥，只断言"输出一定是合规的 Triage"
    assert 1 <= triage.severity <= 5
    assert isinstance(triage.needs_human, bool)
    assert isinstance(triage.summary, str)`

const dynamicVariant = `from datetime import date
from pydantic_ai import RunContext

# 变体一：动态 system_prompt —— 每次运行时把客户编号注入提示
@support_agent.system_prompt
def add_customer_context(ctx: RunContext[SupportDeps]) -> str:
    return f"当前处理的是客户 {ctx.deps.customer_id} 的工单，请结合其账户情况判断。"


# 变体二：再加一个不需要上下文的纯函数工具（@tool_plain）
@support_agent.tool_plain
def today() -> str:
    """返回当前日期，便于模型判断时效性问题。"""
    return date.today().isoformat()`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，这一章我们把一个真实可跑的 Demo 拆到每一行：一个「客服工单分级」Agent，
        接百炼的 Qwen，输入一句用户抱怨，输出一个已校验的 <code>Triage</code> 对象（严重度、是否转人工、摘要）。
        它麻雀虽小，却完整覆盖了 PydanticAI 的四大件：模型适配、依赖注入、结构化输出、工具调用。
        最后我们还会补上可测试性、变体扩展和踩坑清单。
      </Lead>

      <h2>一、安装与环境</h2>
      <p>
        只需要一个包和一个环境变量。我们用 OpenAI 兼容协议接百炼，所以模型 key 用 <code>DASHSCOPE_API_KEY</code>。
      </p>
      <CodeBlock lang="bash" title="安装与运行">{installCode}</CodeBlock>
      <Callout variant="tip">
        百炼提供「OpenAI 兼容模式」端点，所以可以直接复用 OpenAI 的 SDK 形态，
        只需把 <code>base_url</code> 指到 <code>compatible-mode/v1</code> 即可。
      </Callout>

      <h2>二、完整源码</h2>
      <p>下面是完整示例，先通读一遍建立整体印象，后面我们逐段拆解。</p>
      <CodeBlock lang="python" title="examples/agent-frameworks/03-pydantic-ai/ticket_triage.py">{fullCode}</CodeBlock>

      <h2>三、逐段讲解</h2>

      <h3>1. 模型适配：接百炼 Qwen</h3>
      <CodeBlock lang="python" title="模型">{modelSnippet}</CodeBlock>
      <p>
        <code>OpenAIChatModel</code> 是当前的模型类（旧 <code>OpenAIModel</code> 已改名）。
        我们给它一个 <code>OpenAIProvider</code>，把 <code>base_url</code> 指向百炼兼容端点、
        <code>api_key</code> 从环境变量读。模型名用 <code>"qwen-plus"</code>——一个性价比不错、支持工具调用的型号。
      </p>

      <h3>2. 依赖：deps_type 注入的数据</h3>
      <CodeBlock lang="python" title="依赖">{depsSnippet}</CodeBlock>
      <p>
        <code>SupportDeps</code> 是一个普通 dataclass，承载本次运行需要的外部数据：当前客户编号、
        以及一个模拟数据库（这里用 dict 代替真实 DB）。真实项目里这里会放数据库连接、HTTP 客户端、配置对象等。
        关键点是——这些东西从外部注入，工具不在自己体内硬编码它们。
      </p>

      <h3>3. 结构化输出：Triage 模型</h3>
      <CodeBlock lang="python" title="输出 schema">{outSnippet}</CodeBlock>
      <p>
        这是整个 Demo 的灵魂。我们用 <code>Field</code> 给约束：<code>severity</code> 必须是 1~5 的整数
        （<code>ge=1, le=5</code>），<code>needs_human</code> 是布尔，<code>summary</code> 是字符串。
        <code>description</code> 会作为提示传给模型，告诉它每个字段是什么意思。模型的回答会被强制塞进这个形状，
        不合规就重试。
      </p>

      <h3>4. 组装 Agent</h3>
      <CodeBlock lang="python" title="Agent">{agentSnippet}</CodeBlock>
      <p>
        一行构造，把模型、依赖类型、输出类型、系统提示全绑定。注意 <code>deps_type=SupportDeps</code>
        与 <code>output_type=Triage</code> 是泛型参数，它们会让后面工具里的 <code>ctx.deps</code> 和最终的
        <code>result.output</code> 都带上正确类型。
      </p>

      <h3>5. 工具：用 ctx.deps 查余额</h3>
      <CodeBlock lang="python" title="工具">{toolSnippet}</CodeBlock>
      <p>
        <code>@support_agent.tool</code> 注册了一个带上下文的工具。注意参数 <code>{'ctx: RunContext[SupportDeps]'}</code>——
        框架会把运行时上下文传进来，里面的 <code>ctx.deps</code> 就是我们 <code>run</code> 时注入的 <code>SupportDeps</code> 实例。
        模型在判断「金额纠纷」时，会自己决定调用这个工具去查余额，再据此分级。
      </p>

      <h3>6. 运行：拿到类型化结果</h3>
      <CodeBlock lang="python" title="运行">{mainSnippet}</CodeBlock>
      <p>
        <code>run_sync(..., deps=deps)</code> 把依赖注入并同步运行。返回值 <code>result.output</code>
        的类型就是 <code>Triage</code>——可以直接 <code>triage.severity</code> 这样用，不需要任何解析。
        这正是结构化输出的价值兑现处。
      </p>

      <h2>四、预期输出</h2>
      <p>
        用户那句话情绪激烈、涉及重复扣费，模型大概率判定为高严重度、需要转人工。运行结果类似：
      </p>
      <Example title="控制台输出（数值随模型判断略有浮动）">
        <CodeBlock lang="bash" title="stdout">{expectedOutput}</CodeBlock>
        <p>
          关键不在具体数字，而在于：无论模型怎么回答，<code>severity</code> 一定落在 1~5、
          <code>needs_human</code> 一定是布尔——因为 schema 替你兜底了。
        </p>
      </Example>

      <h2>五、可测试性：用 override 写一个断言</h2>
      <p>
        生产级 Agent 必须能进 CI。PydanticAI 的 <code>override</code> 让你在测试里换掉真实模型与依赖，
        既不烧 token、也不依赖网络，还能断言输出契约。
      </p>
      <CodeBlock lang="python" title="test_triage.py">{overrideTest}</CodeBlock>
      <KeyIdea>
        测试断言的是「契约」而非「具体措辞」：只要输出始终是合规的 <code>Triage</code>，
        Agent 的下游就永远安全。这种测试稳定、快速、可重复——是工程化的分水岭。
      </KeyIdea>

      <h2>六、变体：动态提示 + 第二个工具</h2>
      <p>
        在原 Demo 上做两处常见扩展：用动态 <code>system_prompt</code> 把客户上下文注入提示；
        再加一个不需要上下文的纯函数工具。
      </p>
      <CodeBlock lang="python" title="变体扩展">{dynamicVariant}</CodeBlock>
      <ul>
        <li><strong>动态 system_prompt</strong>：每次 <code>run</code> 都按 <code>ctx.deps</code> 重新生成那段提示，把「当前客户」这种随上下文变化的信息喂给模型。</li>
        <li><strong>@tool_plain</strong>：<code>today()</code> 不需要 <code>RunContext</code>，是纯函数工具，适合「取当前时间」这类无副作用、无依赖的能力。</li>
      </ul>

      <h2>七、常见报错与调试</h2>
      <ul>
        <li>
          <strong><code>base_url</code> 写错</strong>：百炼兼容端点是 <code>.../compatible-mode/v1</code>，
          少写 <code>/v1</code> 或拼成原生 DashScope 路径都会 404 / 401。先用 curl 验通端点再跑代码。
        </li>
        <li>
          <strong><code>output_type</code> 校验反复失败</strong>：模型多次给不出合规结构，会触发重试上限并抛错。
          通常是字段约束太苛刻、<code>description</code> 写得不清楚，或模型能力不足。先放宽约束、补清字段说明，必要时换更强的模型。
        </li>
        <li>
          <strong><code>deps</code> 忘传</strong>：用了 <code>deps_type</code> 却在 <code>run</code> 时没传 <code>deps=</code>，
          工具里访问 <code>ctx.deps</code> 就会出错。凡是声明了依赖，每次运行都要注入。
        </li>
        <li>
          <strong>模型不支持工具调用</strong>：选的型号若不支持 function calling，<code>@agent.tool</code> 不会被调用，
          分级会缺少余额信息。优先选明确支持工具调用的型号（如 qwen-plus / qwen-max）。
        </li>
        <li>
          <strong>环境变量没设</strong>：<code>os.environ["DASHSCOPE_API_KEY"]</code> 缺失会直接 <code>KeyError</code>，
          运行前确认已 <code>export</code>。
        </li>
      </ul>

      <h2>八、接百炼小结：OpenAIProvider vs AlibabaProvider</h2>
      <table>
        <thead>
          <tr><th>方式</th><th>写法</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td>OpenAI 兼容</td><td><code>OpenAIChatModel("qwen-plus", provider=OpenAIProvider(base_url=兼容端点, api_key=...))</code></td><td>本 Demo 用法，通用、可控、和接其它 OpenAI 兼容服务写法一致</td></tr>
          <tr><td>官方原生</td><td><code>OpenAIChatModel("qwen-max", provider=AlibabaProvider(api_key=...))</code></td><td>少配一个 base_url，由框架内置百炼端点</td></tr>
          <tr><td>字符串简写</td><td><code>Agent("alibaba:qwen-max")</code> + 环境变量 <code>ALIBABA_API_KEY</code></td><td>最省事，快速起步 / 脚本</td></tr>
        </tbody>
      </table>
      <Callout variant="tip">
        三种写法等价，选哪种看口味。<code>OpenAIProvider</code> 显式可控、迁移其它兼容服务最顺手；
        <code>AlibabaProvider</code> 与字符串简写更简洁。
      </Callout>

      <Summary points={[
        '一个完整的工单分级 Agent：OpenAIChatModel + OpenAIProvider 接百炼 qwen-plus，输入一句抱怨，输出已校验的 Triage 对象。',
        '四大件齐活：模型适配（base_url 接 compatible-mode/v1）、依赖注入（SupportDeps + ctx.deps）、结构化输出（Triage + Field 约束）、工具调用（@tool 查余额）。',
        'result.output 是带类型的 Triage，直接 triage.severity 使用；无论模型怎么答，字段约束都替你兜底。',
        'override(model=TestModel()) 让 Agent 在测试里换假模型/假依赖，断言输出契约而非措辞，可进 CI、不烧 token。',
        '变体：@agent.system_prompt 按 ctx.deps 动态生成提示；@tool_plain 注册无需上下文的纯函数工具。',
        '踩坑清单：base_url 少写 /v1、output_type 反复校验失败、忘传 deps、模型不支持工具调用、环境变量未设。',
        '接百炼三选一：OpenAIProvider（显式可控）、AlibabaProvider（少配端点）、Agent("alibaba:qwen-max") 简写（最省事）。',
      ]} />
    </article>
  )
}

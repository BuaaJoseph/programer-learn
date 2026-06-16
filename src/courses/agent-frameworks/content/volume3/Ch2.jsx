import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `pip install pydantic-ai openai
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const triageCode = `import os
from dataclasses import dataclass

from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

# 用 OpenAIChatModel + OpenAIProvider 接百炼的 OpenAI 兼容端点。
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
    triage = result.output  # 一个已校验的 Triage 实例
    print("严重度:", triage.severity)
    print("需转人工:", triage.needs_human)
    print("摘要:", triage.summary)


if __name__ == "__main__":
    main()`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章我们落地一个客服工单分级 Agent：输入一段用户抱怨，输出一个结构化的分级结果——
        严重度、是否要转人工、一句话摘要。同时用依赖注入，让 Agent 的工具能去查这位客户的账户余额，
        辅助判断金额纠纷类工单。模型走百炼的 OpenAI 兼容端点接 Qwen。
      </Lead>

      <KeyIdea>
        结构化输出 + 依赖注入，是把"会聊天的模型"变成"能上线的业务组件"的两块基石：
        前者保证你拿到的是已校验的对象而非自由文本，后者让工具能安全地访问数据库等外部依赖、也让代码可测试。
      </KeyIdea>

      <h2>一、安装与环境</h2>
      <CodeBlock lang="bash" title="安装依赖并设置百炼 Key">{installCode}</CodeBlock>

      <h2>二、完整代码</h2>
      <CodeBlock lang="python" title="examples/agent-frameworks/03-pydantic-ai/ticket_triage.py">{triageCode}</CodeBlock>

      <h2>三、逐段讲解</h2>

      <h3>1. 接入百炼</h3>
      <p>
        用 <code>OpenAIChatModel("qwen-plus", provider=...)</code> 指定 Qwen 模型，
        再用 <code>OpenAIProvider</code> 把 <code>base_url</code> 指向百炼的 OpenAI 兼容端点
        <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>，<code>api_key</code> 从环境变量读取。
        这样就能用 OpenAI 协议直接打到百炼。
      </p>

      <h3>2. 依赖：@dataclass SupportDeps</h3>
      <p>
        <code>SupportDeps</code> 是要注入给 Agent 的依赖，包含当前客户 <code>customer_id</code> 和一个模拟数据库
        <code>balances</code>。真实项目里这里通常放数据库连接、HTTP 客户端、当前登录用户等。
      </p>

      <h3>3. 输出 schema：Triage(BaseModel)</h3>
      <p>
        <code>Triage</code> 用 Pydantic 定义了输出长什么样：<code>severity</code> 用
        <code>Field(ge=1, le=5)</code> 约束在 1-5 之间，<code>needs_human</code> 是布尔，<code>summary</code> 是字符串。
        模型必须按这个 schema 产出，否则框架会自动重试。
      </p>

      <h3>4. 绑定：Agent(...)</h3>
      <p>
        <code>support_agent</code> 把 <code>deps_type=SupportDeps</code>、<code>output_type=Triage</code>、
        <code>system_prompt</code> 一次性绑定。从此这个 Agent 的输入依赖类型和输出类型都被钉死了。
      </p>

      <h3>5. 工具：@support_agent.tool get_balance</h3>
      <p>
        <code>get_balance</code> 带了 <code>ctx: RunContext[SupportDeps]</code>，因此能通过
        <code>ctx.deps</code> 访问注入进来的那个"数据库"。模型在判断金额纠纷时，可以自行决定调用这个工具去查余额。
      </p>

      <h3>6. 运行：run_sync 与 result.output</h3>
      <p>
        <code>run_sync(...)</code> 把用户抱怨和 <code>deps</code> 一起喂进去。返回的
        <code>result.output</code> 是一个<strong>已经校验过的 Triage 对象</strong>——
        你直接 <code>triage.severity</code> 当对象用即可，完全不需要自己解析文本、做容错。
      </p>

      <Example title="可测试性">
        因为依赖是注入的，测试时你可以用 <code>{'support_agent.override(deps=fake_deps)'}</code> 换上一份假数据，
        或者换一个假模型，然后直接断言输出 Triage 的各字段是否符合预期。
        不用连真数据库、不用真实计费——这正是 PydanticAI 在工程化上的价值：Agent 能像普通函数一样被单元测试。
      </Example>

      <Callout variant="note">
        除了 <code>OpenAIProvider(base_url=...)</code> 这种"借 OpenAI 协议"的接法，
        PydanticAI 还提供官方的 <code>AlibabaProvider</code> 可以原生接百炼；
        甚至能简写成 <code>Agent("alibaba:qwen-max")</code> 配合环境变量 <code>ALIBABA_API_KEY</code> 直接起步。
      </Callout>

      <Summary points={[
        '目标：客服工单分级 Agent——输入抱怨，输出结构化的严重度 / 是否转人工 / 摘要。',
        '接百炼：OpenAIChatModel("qwen-plus") + OpenAIProvider(base_url=百炼兼容端点, api_key=环境变量)。',
        'Triage(BaseModel) 用 Field(ge=1, le=5) 约束严重度；不合规会自动重试。',
        'SupportDeps 经 deps_type 注入，工具 get_balance 用 ctx.deps 访问模拟数据库。',
        'run_sync 返回的 result.output 是已校验的 Triage 对象，直接当对象用，无需解析文本。',
        '依赖注入带来可测试性：override(deps=fake_deps) 换假数据即可单元测试；另有 AlibabaProvider / "alibaba:qwen-max" 原生接百炼。',
      ]} />
    </article>
  )
}

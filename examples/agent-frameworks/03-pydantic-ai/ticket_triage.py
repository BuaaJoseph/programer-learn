"""PydanticAI · 类型安全示例：客服工单分级，结构化输出 + 依赖注入，接百炼(Qwen)。

要点：
- output_type=Triage：模型输出被自动解析+校验成一个 Pydantic 模型实例（不合规会自动重试）。
- deps_type + RunContext：把「数据库」等依赖注入进 Agent，工具用 ctx.deps 访问——可测试、低魔法。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python ticket_triage.py
"""
import os
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
    main()

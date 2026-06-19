"""smolagents · 代码行动(code-as-action) 示例：用 CodeAgent + 百炼(Qwen) 解一道多步题。

CodeAgent 每一步会生成并执行一段 Python 代码作为动作，而不是输出 JSON 工具调用。
对「需要循环/筛选/计算」的题，它能在一步代码里搞定，比逐次 JSON 工具调用省很多步。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python code_agent_demo.py
"""
import os

from smolagents import CodeAgent, OpenAIServerModel

# 用 OpenAIServerModel 接百炼的 OpenAI 兼容端点（api_base 指到 /compatible-mode/v1）。
model = OpenAIServerModel(
    model_id="qwen-plus",
    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

# tools 为空：本例就是要展示「纯代码行动」——Agent 自己写 Python 算，而不是调外部工具。
# additional_authorized_imports 放行 math（本地执行器默认有导入白名单）。
agent = CodeAgent(tools=[], model=model, additional_authorized_imports=["math"])


def main() -> None:
    task = (
        "斐波那契数列的前 30 项里，哪些是质数？"
        "请列出这些质数，求它们的和，并判断这个和本身是不是质数。"
    )
    answer = agent.run(task)
    print("=== 最终答案 ===")
    print(answer)


if __name__ == "__main__":
    main()

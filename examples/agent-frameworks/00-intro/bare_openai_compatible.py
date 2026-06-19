"""不借助任何 Agent 框架，直接用 openai SDK 接百炼(DashScope) 跑 Qwen。

这是全课程的「底座」：所有框架最终都是在这种调用之上加脚手架。
跑通它，就证明你的 key、端点、模型名都对了。

依赖：pip install openai
环境：export DASHSCOPE_API_KEY=sk-xxxx
"""
import os

from openai import OpenAI

# 百炼 OpenAI 兼容端点（北京区）。国际区把 dashscope 换成 dashscope-intl。
BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

client = OpenAI(api_key=os.environ["DASHSCOPE_API_KEY"], base_url=BASE_URL)


def main() -> None:
    resp = client.chat.completions.create(
        model="qwen-plus",
        messages=[
            {"role": "system", "content": "你是一个简洁的中文助手。"},
            {"role": "user", "content": "用一句话说明 Agent 框架解决了什么问题。"},
        ],
    )
    print(resp.choices[0].message.content)
    # usage 里能看到 token 用量，框架的成本统计也来自这里
    print("tokens:", resp.usage.prompt_tokens, "+", resp.usage.completion_tokens)


if __name__ == "__main__":
    main()

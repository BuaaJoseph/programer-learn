"""CrewAI · 角色协作示例：研究员 + 撰稿人 顺序协作产出一篇短文，接百炼(Qwen)。

要点：
- Agent = 角色(role/goal/backstory)；Task = 任务(描述+期望产出)；Crew = 一队 Agent + 一组任务。
- Process.sequential：任务按顺序跑；写作任务用 context=[research_task] 拿到研究任务的产出。
- 接百炼：LLM(model="openai/qwen-plus", base_url=...)——保留 openai/ 前缀走兼容协议。

依赖：pip install -r requirements.txt
环境：export DASHSCOPE_API_KEY=sk-xxxx
运行：python research_write_crew.py
"""
import os

from crewai import LLM, Agent, Crew, Process, Task

# 接百炼：openai/ 前缀让 CrewAI 走 OpenAI 兼容路径。
llm = LLM(
    model="openai/qwen-plus",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)

researcher = Agent(
    role="技术研究员",
    goal="就给定主题梳理 3-5 个关键要点",
    backstory="你擅长快速抓住一个技术话题的核心，条理清晰。",
    llm=llm,
    verbose=True,
)
writer = Agent(
    role="技术撰稿人",
    goal="把研究要点写成一篇通俗易懂的中文短文",
    backstory="你擅长把复杂技术讲得清楚有趣。",
    llm=llm,
    verbose=True,
)

research_task = Task(
    description="研究主题：{topic}。列出 3-5 个最关键的要点，每点一句话。",
    expected_output="一个要点列表。",
    agent=researcher,
)
write_task = Task(
    description="根据研究要点，写一篇约 300 字的中文科普短文。",
    expected_output="一篇约 300 字的短文。",
    agent=writer,
    context=[research_task],  # 拿到上一个任务的产出作为上下文
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.sequential,
)


def main() -> None:
    result = crew.kickoff(inputs={"topic": "什么是 AI Agent"})
    print("=== 最终产出 ===")
    print(result)


if __name__ == "__main__":
    main()

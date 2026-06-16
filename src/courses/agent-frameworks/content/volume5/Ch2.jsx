import Lead from '@/components/cards/Lead.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installCode = `pip install crewai
export DASHSCOPE_API_KEY=sk-xxxxxxxx`

const crewCode = `import os

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
    main()`

export default function Ch2() {
  return (
    <article>
      <Lead>
        理论讲完，这一章我们真刀真枪搭一个两角色 Crew：研究员先就某个主题梳理出关键要点，撰稿人再据此写成一篇通俗短文。两个角色顺序协作，上一个任务的产出会被接力喂给下一个——这就是 CrewAI 里「协作」最朴素的样子。
      </Lead>

      <h2>安装与环境</h2>
      <p>
        装好 crewai，并把百炼的 API Key 放进环境变量。代码里会用 <code>os.environ</code> 去读它，不要把 Key 硬编码进源码。
      </p>
      <CodeBlock lang="bash">{installCode}</CodeBlock>

      <h2>完整代码</h2>
      <CodeBlock
        lang="python"
        title="examples/agent-frameworks/05-crewai/research_write_crew.py"
      >
        {crewCode}
      </CodeBlock>

      <h2>逐段拆解</h2>

      <h3>1. 接百炼的 LLM</h3>
      <p>
        <code>model="openai/qwen-plus"</code> 里的 <code>openai/</code> 前缀是重点：它告诉 CrewAI「用 OpenAI 兼容协议去访问这个模型」。百炼提供了 OpenAI 兼容接口，所以我们再配上 <code>base_url</code> 指向百炼的兼容端点、用 <code>DASHSCOPE_API_KEY</code> 作为密钥，CrewAI 就能像调 OpenAI 一样调 Qwen。缺了 <code>openai/</code> 前缀，框架就不知道该走兼容协议，连接会失败。
      </p>

      <h3>2. 两个 Agent 的人设</h3>
      <p>
        <strong>researcher</strong>（技术研究员）和 <strong>writer</strong>（技术撰稿人）各有一套 <code>role</code> / <code>goal</code> / <code>backstory</code>。role 定身份、goal 定目标、backstory 给出背景与气质——这三件套合起来塑造出角色的行为风格：一个负责抓要点、条理清晰，一个负责把要点讲得生动易懂。两个 Agent 都挂上同一个 <code>llm</code>。
      </p>

      <h3>3. 两个 Task</h3>
      <p>
        每个 Task 用 <code>description</code> 说清要做什么、用 <code>expected_output</code> 给出交付标准，并通过 <code>agent=</code> 指派给对应角色。研究任务的描述里带了一个主题占位符，运行时会被填上具体主题。
      </p>

      <h3>4. 接力的关键：context</h3>
      <p>
        <code>write_task</code> 里的 <code>context=[research_task]</code> 是整个协作的接力棒——它把研究任务的产出作为上下文传给写作任务。撰稿人因此能拿到研究员刚整理好的要点，再据此动笔。这就是「协作」具体发生的地方。
      </p>

      <h3>5. Crew 与启动</h3>
      <p>
        <code>Crew</code> 把两个 agents、两个 tasks 装在一起，<code>process=Process.sequential</code> 让它们按顺序执行：先研究、后写作。最后 <code>crew.kickoff(inputs={'{...}'})</code> 把主题占位符填上真实值并启动整支团队，返回最终产出。
      </p>

      <Example title="协作是怎么发生的">
        <p>
          运行时的接力过程大致是这样：
        </p>
        <ul>
          <li>研究员被填入主题「什么是 AI Agent」，产出一份 3-5 条的关键要点列表。</li>
          <li>撰稿人通过 context 拿到这份要点，不必自己从头研究，直接据此写成一篇约 300 字的短文。</li>
          <li>Crew 返回最终的文章作为整体产出。</li>
        </ul>
        <p>
          对比单 Agent 一口气「又研究又写作」：分工让每个角色只专注一件事——研究员专注抓全要点，撰稿人专注组织语言。各司其职，产出往往比一个角色硬扛更全面、更顺畅。
        </p>
      </Example>

      <h2>进阶玩法</h2>
      <Callout variant="tip">
        这个骨架可以继续长大：给研究员<strong>加工具</strong>（比如搜索，让要点基于真实资料）；把 <code>Process</code> 换成 <code>hierarchical</code>，<strong>加一个 manager</strong> 来协调和委派；或者用 <strong>Flows</strong> 把整个 Crew 包成一个事件驱动流程，在确定性骨架里调用这段协作。
      </Callout>
      <Callout variant="note">
        CrewAI 新版里 LiteLLM 已经<strong>不再是必需依赖</strong>，框架提供了原生集成。接百炼也可以不写 <code>base_url</code>，改用环境变量来配置兼容端点；但在示例里显式写出 <code>base_url</code> 最直观、最不容易踩坑，推荐入门时这么做。
      </Callout>

      <Summary
        points={[
          '两角色顺序协作 Crew：研究员抓要点，撰稿人据此成文。',
          '接百炼的关键是 model 带 openai/ 前缀走兼容协议，再配 base_url 与 DASHSCOPE_API_KEY。',
          'role/goal/backstory 塑造角色人设；description/expected_output 定义任务与交付标准。',
          'write_task 的 context=[research_task] 是协作的接力棒，把上一任务产出喂给下一任务。',
          'Process.sequential 顺序执行，kickoff(inputs=...) 填入主题并启动整支团队。',
          '进阶可加工具、换 hierarchical 加 manager，或用 Flows 包裹整个 Crew。',
        ]}
      />
    </article>
  )
}

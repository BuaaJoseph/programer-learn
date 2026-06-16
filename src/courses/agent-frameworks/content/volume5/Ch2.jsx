import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const installSnippet = `# 安装 CrewAI（Python 3.10–3.13）
pip install crewai

# 配置百炼 API Key（OpenAI 兼容协议）
export DASHSCOPE_API_KEY="sk-你的key"

# 运行
python examples/agent-frameworks/05-crewai/research_write_crew.py`

const fullCode = `import os

from crewai import LLM, Agent, Crew, Process, Task

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
    context=[research_task],
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

const llmSnippet = `llm = LLM(
    model="openai/qwen-plus",   # openai/ 前缀 = 走 OpenAI 兼容协议
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=os.environ["DASHSCOPE_API_KEY"],
)`

const contextSnippet = `write_task = Task(
    description="根据研究要点，写一篇约 300 字的中文科普短文。",
    expected_output="一篇约 300 字的短文。",
    agent=writer,
    context=[research_task],   # 把 research_task 的产出接力进来
)`

const toolSnippet = `from crewai.tools import tool

@tool("简单计算器")
def calc(expr: str) -> str:
    """对一个算术表达式求值，返回结果字符串。"""
    return str(eval(expr))   # 演示用；生产环境请勿直接 eval

researcher = Agent(
    role="技术研究员",
    goal="就给定主题梳理 3-5 个关键要点",
    backstory="你擅长快速抓住一个技术话题的核心，条理清晰。",
    llm=llm,
    tools=[calc],     # 把工具挂到 Agent 上，它就能在推理时调用
    verbose=True,
)`

const hierVariant = `# 把 Process 换成 hierarchical，需要额外提供 manager_llm
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.hierarchical,   # 由经理动态委派
    manager_llm=llm,                # 必填：经理用哪个模型来委派
)`

const flowWrap = `from crewai.flow.flow import Flow, start, listen


class ResearchWriteFlow(Flow):
    @start()
    def choose_topic(self):
        topic = "什么是 AI Agent"
        self.state["topic"] = topic
        return topic

    @listen(choose_topic)
    def run_crew(self, topic):
        # Flow 负责确定性流程；创造性的协作交给自治的 Crew
        result = crew.kickoff(inputs={"topic": topic})
        return result


if __name__ == "__main__":
    print(ResearchWriteFlow().kickoff())`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章我们把一个真实可跑的双 Agent 协作脚本逐行拆开：一个「研究员」先梳理要点，一个「撰稿人」接力写成科普短文，全程接百炼的 qwen-plus。看懂它，你就掌握了 CrewAI 最常用的 sequential 协作模式，并能进一步扩展到工具、hierarchical 与 Flow。
      </Lead>

      <h2>安装与环境</h2>
      <p>
        CrewAI 支持 Python 3.10–3.13。安装后只需一个环境变量 <code>DASHSCOPE_API_KEY</code> 即可接通百炼。
      </p>
      <CodeBlock lang="bash" title="安装与环境" code={installSnippet} />

      <h2>完整代码</h2>
      <CodeBlock lang="python" title="examples/agent-frameworks/05-crewai/research_write_crew.py" code={fullCode} />

      <h2>逐段讲解</h2>

      <h3>1. 配置 LLM：openai/ 前缀是关键</h3>
      <p>
        百炼提供 OpenAI 兼容端点，所以我们用 CrewAI 的 <code>LLM</code> 包一层。<code>model</code> 里的 <code>openai/</code> 前缀<strong>不能省</strong>——它告诉 CrewAI「按 OpenAI 协议去请求」，后半段 <code>qwen-plus</code> 才是真正的模型名。<code>base_url</code> 指向百炼的兼容端点，<code>api_key</code> 从环境变量读取。
      </p>
      <CodeBlock lang="python" title="LLM 配置" code={llmSnippet} />

      <h3>2. 定义两个角色：用人设塑造行为</h3>
      <p>
        researcher 和 writer 的差异完全由 role / goal / backstory 决定。研究员的 backstory 强调「抓核心、条理清晰」，于是它倾向输出结构化要点；撰稿人的 backstory 强调「讲得清楚有趣」，于是它倾向写流畅的科普文字。两者共用同一个 <code>llm</code>，但因为人设不同，行为也不同。<code>verbose=True</code> 会把它们的思考过程打印出来，调试时非常有用。
      </p>

      <h3>3. 定义两个任务：context 实现接力</h3>
      <p>
        research_task 的 description 里有 <code>{'{topic}'}</code> 占位符，会在 kickoff 时被 inputs 填充。write_task 的 <code>context=[research_task]</code> 是这段代码的灵魂——它把研究员的产出作为上下文喂给撰稿人，于是撰稿人「看到」了要点再动笔。没有这一行，两个 Agent 就各干各的、互不相关。
      </p>
      <CodeBlock lang="python" title="context 接力" code={contextSnippet} />

      <h3>4. 组队并启动：Process.sequential + kickoff</h3>
      <p>
        Crew 把两个 Agent、两个 Task 聚合起来，<code>process=Process.sequential</code> 表示按 tasks 列表顺序执行：先 research_task，再 write_task。<code>kickoff()</code> 启动整支团队，inputs 里的 <code>topic</code> 会填进 research_task 的占位符 <code>{'{topic}'}</code>。返回值是最后一个 Task 的产出，也就是那篇短文。
      </p>

      <h2>运行时它们怎么协作</h2>
      <Example title="一次 kickoff 的内部时序">
        <ul>
          <li><strong>① 填充</strong>：inputs 里的 topic = "什么是 AI Agent" 填进 research_task 的 description。</li>
          <li><strong>② 研究员上场</strong>：researcher 执行 research_task，按人设产出 3-5 条要点。</li>
          <li><strong>③ 接力</strong>：因为 write_task 声明了 <code>context=[research_task]</code>，研究员的要点被注入撰稿人的上下文。</li>
          <li><strong>④ 撰稿人上场</strong>：writer 基于要点写出约 300 字短文。</li>
          <li><strong>⑤ 汇总返回</strong>：sequential 模式下，kickoff 返回最后一个 Task（write_task）的产出并打印。</li>
        </ul>
      </Example>
      <KeyIdea>
        sequential 模式 = 一条流水线：Task 按顺序跑，context 决定哪些产出向下游接力。把它想成「研究员把笔记递给撰稿人」就对了。
      </KeyIdea>

      <h2>扩展一：给 Agent 加一个工具</h2>
      <p>
        现在两个 Agent 只会「想」，不会「做」。给研究员挂一个工具，它就能在推理过程中调用外部能力。用 <code>{'@tool'}</code> 装饰一个普通函数即可，函数的 docstring 会作为工具说明被模型读取。
      </p>
      <CodeBlock lang="python" title="自定义工具并挂到 Agent" code={toolSnippet} />
      <p>
        实际项目里更常见的是搜索工具、读文件工具或调内部 API 的工具——挂上去之后，研究员就能先检索再总结，而不只是凭模型记忆作答。
      </p>

      <h2>扩展二：换成 hierarchical 模式</h2>
      <p>
        如果任务分配不固定、需要一个「经理」临场调度，把 process 换成 <code>Process.hierarchical</code>。此时<strong>必须</strong>提供 <code>manager_llm</code>，由它来决定把哪个任务交给哪个 Agent 并整合结果。
      </p>
      <CodeBlock lang="python" title="hierarchical 变体" code={hierVariant} />
      <Callout variant="warn" title="易踩坑">
        切到 hierarchical 却忘了 <code>manager_llm</code>，会直接报错。sequential 不需要它，hierarchical 必须有。
      </Callout>

      <h2>扩展三：用 Flow 把 Crew 包起来</h2>
      <p>
        当你需要确定性的流程骨架（先选主题、再跑团队、最后落库或发送），就用 Flow 包住 Crew。<code>{'@start'}</code> 标记入口，<code>{'@listen'}</code> 监听上一步完成后触发，state 在步骤间共享。创造性的活儿仍然交给自治的 Crew。
      </p>
      <CodeBlock lang="python" title="Flow 包裹 Crew 的最小骨架" code={flowWrap} />

      <h2>常见报错与调试</h2>
      <ul>
        <li><strong>模型名忘了 openai/ 前缀</strong>：CrewAI 不知道走哪种协议，会报 provider/路由相关错误。改成 <code>openai/qwen-plus</code> 即可。</li>
        <li><strong>base_url 写错或漏写</strong>：请求会打到默认端点导致 401/连接失败。确认是 <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code>，注意结尾的 <code>/v1</code>。</li>
        <li><strong>API Key 没设</strong>：<code>os.environ["DASHSCOPE_API_KEY"]</code> 取不到会直接 KeyError。先 export 再运行。</li>
        <li><strong>context 没串上</strong>：撰稿人写出来的东西和研究要点没关系，多半是漏了 <code>context=[research_task]</code>，或写成了别的 Task。</li>
        <li><strong>hierarchical 缺 manager_llm</strong>：层级模式必须显式提供经理模型，否则启动即报错。</li>
        <li><strong>看不懂中间发生了什么</strong>：给 Agent 加 <code>verbose=True</code>，把思考与工具调用全打出来再排查。</li>
      </ul>

      <Summary points={[
        'LLM 里 model 用 openai/qwen-plus（前缀必留）+ 百炼 base_url + 环境变量 key，即可接通国产模型。',
        '两个 Agent 的差异完全来自 role/goal/backstory 人设，共用同一 llm 也能表现不同。',
        'context=[research_task] 是接力的灵魂，决定上游产出是否流向下游。',
        'Process.sequential 顺序执行并返回最后一个 Task 的产出；kickoff 的 inputs 填充 description 占位符。',
        '扩展路径：@tool 给 Agent 加能力 → hierarchical + manager_llm 动态委派 → Flow 包裹 Crew 控制确定性流程。',
        '高频报错集中在 openai/ 前缀、base_url、context 串联、hierarchical 缺 manager_llm。',
      ]} />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ArchDiagram from '@/courses/agent-frameworks/illustrations/ArchDiagram.jsx'

const agentSnippet = `from crewai import Agent

researcher = Agent(
    role="技术研究员",                       # 它是谁
    goal="就给定主题梳理 3-5 个关键要点",      # 它要达成什么
    backstory="你擅长快速抓住技术话题的核心，条理清晰。",  # 人设/风格
    tools=[],          # 可调用的工具（可选）
    memory=True,       # 是否启用记忆（可选）
    verbose=True,      # 打印思考过程，方便调试
)`

const taskSnippet = `from crewai import Task

research_task = Task(
    description="研究主题：{topic}。列出 3-5 个最关键要点，每点一句话。",
    expected_output="一个要点列表。",   # 明确产出形态，模型更收敛
    agent=researcher,                  # 谁来做这个任务
)

write_task = Task(
    description="根据研究要点，写一篇约 300 字的中文科普短文。",
    expected_output="一篇约 300 字的短文。",
    agent=writer,
    context=[research_task],           # 接力：把上一个 Task 的产出喂进来
)`

const crewSnippet = `from crewai import Crew, Process

crew = Crew(
    agents=[researcher, writer],          # 团队成员
    tasks=[research_task, write_task],     # 待办清单
    process=Process.sequential,            # 调度策略：顺序 / 层级
)

result = crew.kickoff(inputs={"topic": "什么是 AI Agent"})`

const flowSnippet = `from crewai.flow.flow import Flow, start, listen

class WriteFlow(Flow):
    @start()
    def pick_topic(self):
        self.state["topic"] = "什么是 AI Agent"
        return self.state["topic"]

    @listen(pick_topic)
    def run_crew(self, topic):
        # 在确定性的流程里调用一支自治协作的 Crew
        return crew.kickoff(inputs={"topic": topic})

WriteFlow().kickoff()`

const hierarchySnippet = `from crewai import Crew, Process, LLM

manager_llm = LLM(model="openai/qwen-plus")  # 经理用的模型

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    process=Process.hierarchical,   # 由一个 manager LLM 动态委派
    manager_llm=manager_llm,        # hierarchical 必填
)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        CrewAI 的世界观可以一句话概括：把一群有「人设」的自治 Agent 组织成一支团队，给每个人分好角色与目标，让它们像真实团队那样接力协作，完成研究、写作、多视角分析这类需要创造性的工作。它已彻底脱离 LangChain，自己重写底层，主打精简、快、依赖少、可控。
      </Lead>

      <h2>它的定位</h2>
      <p>
        CrewAI 是当下最活跃的多 Agent 编排框架之一。GitHub 约 5.4 万 star，社区迭代极快，目前稳定在 1.x 线（2026 年 6 月最新约 1.14.x），支持 Python 3.10–3.13。它和「单 Agent 工具循环」类框架的分水岭在于：CrewAI 的第一性原理是<strong>多角色协作</strong>，而不是把所有能力塞进一个 Agent。
      </p>

      <h2>起源：João Moura 为什么造 CrewAI</h2>
      <p>
        CrewAI 由 João Moura 在 2023 年底创建。他的观察是：真实世界里复杂工作很少由一个全才完成，而是由一支有分工的团队协作而成——研究员负责挖事实，撰稿人负责讲清楚，编辑负责把关。把这种「角色扮演的协作」搬到 LLM 上，就是 CrewAI 的灵感来源：给每个 Agent 一个清晰的人设（role / goal / backstory），让它们各司其职、互相接力。
      </p>
      <p>
        早期 CrewAI 构建在 LangChain 之上，但很快暴露出依赖臃肿、行为难控、升级被牵连等问题。于是团队做了一次彻底重构，创始人明确表示<strong>「LangChain 已从 CrewAI 完全移除」</strong>。如今 CrewAI 是一个完全独立的实现，主打三个词：<strong>独立、轻量、可控</strong>。近期还有两个重要变化：其一，<strong>LiteLLM 不再是强制依赖</strong>——框架提供原生 SDK 集成，LiteLLM 退化为可选回退；其二，<strong>统一了智能 Memory 类</strong>，把分散的记忆机制收敛成一套一致接口。
      </p>

      <h2>设计理念：一支有分工的团队</h2>
      <p>
        理解 CrewAI 最好的类比就是「组建一支团队」。你不会对一个新员工说「把这事办了」，而是先告诉他：你是谁（角色）、你要达成什么（目标）、你过往是什么背景（让他知道用什么口吻和标准做事）。CrewAI 把这三件套显式建模成 role / goal / backstory，由它们塑造出每个 Agent 的「性格」，进而决定它思考和表达的方式。
      </p>
      <KeyIdea>
        CrewAI 的核心心法：用「角色 + 任务 + 流程」组织一队会协作的 Agent。你定义谁（Agent）、做什么（Task）、怎么配合（Process），框架负责让它们跑起来、并把产出顺着 context 一棒一棒传下去。
      </KeyIdea>

      <h2>架构总览</h2>
      <ArchDiagram framework="crewai" />
      <p>
        数据流可以这样读：你调用 <code>crew.kickoff(inputs=...)</code> 启动 → Crew 按 <strong>Process</strong> 选定的调度策略安排 Agent 执行各自的 Task → 每个 Task 的产出通过 <strong>context</strong> 接力给下游 Task → 全部完成后汇总成最终结果返回。其中 inputs 里的占位符（如主题）会被填入对应 Task 的 description。
      </p>

      <h2>核心组件逐个详解</h2>

      <h3>Agent：一个有人设的角色</h3>
      <table>
        <thead><tr><th>字段</th><th>作用</th></tr></thead>
        <tbody>
          <tr><td>role</td><td>角色定位，它是谁</td></tr>
          <tr><td>goal</td><td>这个角色要达成的目标</td></tr>
          <tr><td>backstory</td><td>背景故事，决定口吻、视角与做事标准</td></tr>
          <tr><td>tools</td><td>可调用的工具列表（可选）</td></tr>
          <tr><td>memory</td><td>是否启用记忆（可选）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="python" title="Agent：role / goal / backstory 三件套" code={agentSnippet} />

      <h3>Task：一件要做的事</h3>
      <p>
        Task 描述「做什么」以及「产出长什么样」。<code>expected_output</code> 是个被低估的字段——它像验收标准一样收敛模型行为；<code>context</code> 则是多 Agent 接力的关键，把上游 Task 的产出注入当前 Task。
      </p>
      <CodeBlock lang="python" title="Task：description / expected_output / context" code={taskSnippet} />

      <h3>Crew：把团队和任务编排起来</h3>
      <p>
        Crew 是顶层容器，聚合 agents 与 tasks，并指定 process。调用 <code>kickoff()</code> 启动整支团队。
      </p>
      <CodeBlock lang="python" title="Crew：agents / tasks / process" code={crewSnippet} />

      <h3>Process：调度策略</h3>
      <p>
        <code>Process.sequential</code> 让 Task 按列表顺序依次执行，产出顺着 context 接力；<code>Process.hierarchical</code> 则引入一个 manager LLM，由它动态决定把哪个子任务委派给哪个 Agent。
      </p>

      <h3>Tools 与 Memory</h3>
      <ul>
        <li><strong>Tools</strong>：给 Agent 接上外部能力（搜索、读文件、调 API、跑代码）。可以用内置工具，也可以自定义。</li>
        <li><strong>Memory</strong>：统一后的智能记忆，让 Agent 跨步骤、跨任务保留上下文与事实，减少重复劳动。</li>
      </ul>

      <h2>Crews vs Flows</h2>
      <p>
        这是用好 CrewAI 的关键分野。<strong>Crew</strong> 是一支自治协作的团队，适合涌现式、创造性的工作——你给目标，让 Agent 自己商量怎么配合。<strong>Flow</strong> 是事件驱动的流程编排，用 <code>{'@start'}</code> / <code>{'@listen'}</code> / <code>{'@router'}</code> 加上一份 state 来精确控制「先做什么、收到什么再做什么、什么条件走哪条分支」，是确定性的。
      </p>
      <Example title="该用哪个">
        <ul>
          <li><strong>要创造性、要多视角碰撞</strong>（研究综述、文章撰写、方案讨论）→ 用 <strong>Crew</strong>。</li>
          <li><strong>要确定性、要可控分支与状态</strong>（带审批、带条件路由的业务流程）→ 用 <strong>Flow</strong>。</li>
          <li><strong>官方推荐</strong>：把 Crew 包进 Flow——用 Flow 控制大流程的确定性骨架，在关键节点调用自治的 Crew 处理创造性子任务，两者优势互补。</li>
        </ul>
      </Example>
      <CodeBlock lang="python" title="Flow 最小骨架：@start / @listen" code={flowSnippet} />

      <h2>Process 深入</h2>
      <p>
        <strong>sequential（顺序）</strong>：Task 按定义顺序逐个执行，逻辑透明、易调试，是绝大多数协作场景的默认选择。配合 context 就能形成「研究 → 写作 → 校对」这样的流水接力。
      </p>
      <p>
        <strong>hierarchical（层级）</strong>：额外引入一个 manager LLM 作为「项目经理」，它不亲自干活，而是根据任务把工作动态委派给最合适的 Agent，并整合结果。适合任务边界不固定、需要临场分配的复杂协作。注意它<strong>必须</strong>提供 <code>manager_llm</code>。
      </p>
      <CodeBlock lang="python" title="hierarchical：引入 manager_llm 委派" code={hierarchySnippet} />

      <h2>适合与不适合 / 生态</h2>
      <p><strong>适合</strong>：研究综述、内容生成、多视角分析、需要角色分工的创造性协作。这类工作的价值恰恰来自不同角色之间的视角碰撞与接力。</p>
      <p><strong>不适合</strong>：严格确定性的流水线、刚性输出格式、需要精确条件分支的业务流程、以及简单的单步任务（杀鸡用牛刀）。前几类更应该用 Flow，最后一类直接调一次 LLM 即可。</p>
      <Callout variant="note" title="生态">
        CrewAI 提供了丰富的内置工具集与自定义工具接口，并有面向团队/企业的商业版本（CrewAI Enterprise），提供部署、监控、协作管理等能力。DashScope（阿里云百炼）已被列入 CrewAI 原生支持的 OpenAI 兼容 provider，接国产模型很顺手。
      </Callout>

      <Summary points={[
        'CrewAI = 角色(Agent) + 任务(Task) + 流程(Process) 组成的自治协作团队，由 João Moura 于 2023 年底创建。',
        '已彻底脱离 LangChain，自己重写底层；LiteLLM 改为可选，Memory 已统一。',
        'Agent 用 role/goal/backstory 塑造人设；Task 用 description/expected_output/context 定义产出与接力。',
        'Process.sequential 顺序执行；Process.hierarchical 由 manager_llm 动态委派。',
        'Crews 管自治协作（创造性），Flows 管确定性事件驱动；推荐把 Crew 包进 Flow。',
        '适合研究/写作/多视角分析；不适合刚性流水线与简单单步任务。',
      ]} />
    </article>
  )
}

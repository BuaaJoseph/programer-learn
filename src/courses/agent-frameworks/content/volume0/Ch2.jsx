import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ParadigmMap from '@/courses/agent-frameworks/illustrations/ParadigmMap.jsx'

export default function Ch2() {
  return (
    <article>
      <Lead>
        框架的 API 几个月就改一茬，但它背后的<strong>范式</strong>——也就是"该怎么组织一个 Agent 去想问题"——却相当稳定。
        学会按范式归类，你就能在看到一个新框架时一眼判断"它属于哪一类、解决什么、和谁重叠"。
        这一章给你一张全景地图：七个主流范式逐个拆解，再用一张对比表帮你对号入座。
      </Lead>

      <h2>一、为什么范式比 API 更重要</h2>
      <p>
        如果你只背 API，框架一升级你就得重学；但如果你抓住范式，就抓住了不变量。
        本课覆盖的 7 个框架，恰好对应 7 种典型范式，互相之间既有重叠、又各有主场。先看地图，再逐个深入。
      </p>
      <KeyIdea title="地图先于路线">
        别急着记"哪个框架的类叫什么"。先问三件事：<strong>它怎么驱动循环？它把控制权交给模型还是交给你？它最擅长哪类任务？</strong>
        这三问答完，框架的归类就清楚了。
      </KeyIdea>

      <h2>二、全景地图：七大范式一图看清</h2>
      <p>
        下面这张交互图把七个范式摆在一起。<strong>把鼠标移到任意节点上</strong>，可以看到该范式的代表框架与核心机制；
        从左到右大致是"控制权从模型主导 → 开发者主导"的光谱，越往右流程越显式、越可控。
      </p>
      <ParadigmMap />

      <h2>三、七个范式逐个详解</h2>

      <h3>1. 代码即行动（Code-as-Action）</h3>
      <p>
        <strong>定位</strong>：让模型直接<strong>写并执行 Python 代码</strong>来完成动作，而不是输出结构化的 tool_calls。<br />
        <strong>代表框架</strong>：smolagents（Hugging Face）。<br />
        <strong>核心机制</strong>：模型生成一段代码 → 在受控沙箱里执行 → 把执行结果回灌 → 再生成。一个工具就是一个可被代码调用的函数，组合工具靠"写代码"而非"填 JSON"。<br />
        <strong>典型场景</strong>：数据处理、计算密集、需要把多个工具灵活拼接的探索性任务——代码本身就是最自然的"行动语言"。
      </p>

      <h3>2. 轻量循环 + Handoff</h3>
      <p>
        <strong>定位</strong>：最小化的 Agent 抽象，核心只有"循环"和"把任务交给另一个 Agent"。<br />
        <strong>代表框架</strong>：OpenAI Agents SDK。<br />
        <strong>核心机制</strong>：<code>Agent</code> + <code>tools</code> + <code>handoff</code>。一个 Agent 处理不了就 handoff 给更专的 Agent，配合 guardrails 与内置 tracing。极薄抽象，几行就能跑起来。<br />
        <strong>典型场景</strong>：客服分流、多专家路由、想要"轻装上阵又不丢可观测"的生产原型。
      </p>

      <h3>3. 类型安全 / 结构化输出</h3>
      <p>
        <strong>定位</strong>：把 Pydantic 的类型系统搬进 Agent，让输入输出都<strong>强类型、可校验</strong>。<br />
        <strong>代表框架</strong>：PydanticAI。<br />
        <strong>核心机制</strong>：用 <code>result_type</code> 声明输出模型，框架强制模型返回合法结构并自动校验 / 重试；依赖注入式地传递上下文。<br />
        <strong>典型场景</strong>：要把 LLM 输出灌进数据库 / 下游 API、对数据契约要求严格的工程化场景。
      </p>

      <h3>4. 图 / 状态机（Graph / State Machine）</h3>
      <p>
        <strong>定位</strong>：把 Agent 流程显式建成<strong>有向图</strong>，节点是步骤、边是转移条件，状态在图中流动。<br />
        <strong>代表框架</strong>：LangGraph。<br />
        <strong>核心机制</strong>：定义 <code>State</code> + 节点函数 + 条件边，支持循环、分支、检查点、人在回路、断点续跑。控制权牢牢在开发者手里。<br />
        <strong>典型场景</strong>：复杂多步骤工作流、需要严格流程控制、可回放、可中断恢复的生产级 Agent。
      </p>

      <h3>5. 角色协作（Role-based Multi-Agent）</h3>
      <p>
        <strong>定位</strong>：用"组建一支团队"的隐喻——给每个 Agent 设定角色、目标、背景，让它们分工协作。<br />
        <strong>代表框架</strong>：CrewAI。<br />
        <strong>核心机制</strong>：<code>Agent</code>（角色）+ <code>Task</code>（任务）+ <code>Crew</code>（编排）。任务可顺序或层级执行，Agent 间传递产出，像项目组一样跑流程。<br />
        <strong>典型场景</strong>：内容生产流水线（调研 → 撰写 → 审校）、把人类组织分工直接映射成 Agent 协作。
      </p>

      <h3>6. 数据 / RAG（Data-centric）</h3>
      <p>
        <strong>定位</strong>：以<strong>数据与检索</strong>为中心，先把你的知识喂进去，Agent 围绕这些数据回答与行动。<br />
        <strong>代表框架</strong>：LlamaIndex。<br />
        <strong>核心机制</strong>：文档加载 → 切块 → 索引（向量 / 关键词）→ 检索 → 合成；在此之上提供 Query Engine、Agent 与工作流。<br />
        <strong>典型场景</strong>：企业知识库问答、文档 / PDF 助手、任何"答案必须基于私有资料"的 RAG 应用。
      </p>

      <h3>7. 企业 Java 集成</h3>
      <p>
        <strong>定位</strong>：把 Agent 能力以 Spring 的方式带进 <strong>Java 企业后端</strong>。<br />
        <strong>代表框架</strong>：Spring AI。<br />
        <strong>核心机制</strong>：<code>ChatClient</code> 流式 API、<code>@Tool</code> 注解工具、Advisors（记忆 / RAG）、Spring Boot 自动配置与依赖注入，天然融入现有 Java 服务。<br />
        <strong>典型场景</strong>：已有 Spring Boot 体系的企业，要在不换语言栈的前提下接入 LLM 与 Agent。
      </p>

      <h2>四、范式对比表</h2>
      <table>
        <thead>
          <tr><th>范式</th><th>代表框架</th><th>控制力</th><th>上手难度</th><th>最适合</th></tr>
        </thead>
        <tbody>
          <tr><td>代码即行动</td><td>smolagents</td><td>中</td><td>低</td><td>数据处理、灵活拼接工具</td></tr>
          <tr><td>轻量循环 + Handoff</td><td>OpenAI Agents SDK</td><td>中</td><td>低</td><td>多专家路由、轻量生产原型</td></tr>
          <tr><td>类型安全 / 结构化</td><td>PydanticAI</td><td>中高</td><td>中</td><td>强类型输出、对接下游系统</td></tr>
          <tr><td>图 / 状态机</td><td>LangGraph</td><td>高</td><td>高</td><td>复杂工作流、严格流程控制</td></tr>
          <tr><td>角色协作</td><td>CrewAI</td><td>中</td><td>低</td><td>多 Agent 分工、内容流水线</td></tr>
          <tr><td>数据 / RAG</td><td>LlamaIndex</td><td>中</td><td>中</td><td>知识库问答、文档助手</td></tr>
          <tr><td>企业 Java 集成</td><td>Spring AI</td><td>中高</td><td>中</td><td>Spring 体系内接入 LLM</td></tr>
        </tbody>
      </table>

      <h2>五、被点名但不展开的框架</h2>
      <Callout variant="note" title="范式重叠，卷 8 再提">
        下面这几个框架同样重要，但范式与上面七个高度重叠，本卷不单独展开，留到<strong>卷 8</strong> 做补充对比：
        <ul>
          <li><strong>Google ADK</strong>：Google 的 Agent 开发套件，定位接近轻量循环 + 多 Agent 编排。</li>
          <li><strong>Microsoft Agent Framework</strong>：由 AutoGen 与 Semantic Kernel 合并而来的继任者，覆盖多 Agent 与编排范式。</li>
          <li><strong>Strands Agents</strong>：AWS 推出，强调模型驱动的工具循环。</li>
          <li><strong>AG2</strong>：AutoGen 的社区分叉，延续多 Agent 对话范式。</li>
        </ul>
      </Callout>

      <h2>六、一条贯穿全课的副线</h2>
      <Callout variant="tip" title="同一个后端，七种写法">
        无论范式多不同，这七个框架都支持<strong>自定义 <code>base_url</code></strong>，因此都能接到同一个阿里云百炼（Qwen）后端。
        这意味着我们可以在完全相同的模型条件下横向对比它们的风格差异——这正是下一章要打通的统一前提。
      </Callout>

      <h2>七、建议的学习顺序</h2>
      <p>本课按"由轻到重"组织，让抽象负担逐步加码，循序渐进：</p>
      <Example title="从轻到重">
        <p>
          <strong>smolagents</strong>（代码即行动，最直观）→ <strong>OpenAI Agents SDK</strong>（轻量循环 + handoff）→
          <strong>PydanticAI</strong>（加上类型约束）→ <strong>LangGraph</strong>（显式图，控制力最强）→
          <strong>CrewAI</strong>（多 Agent 协作）→ <strong>LlamaIndex</strong>（数据 / RAG）→
          <strong>Spring AI</strong>（切到 Java 企业栈）→ 最后做<strong>对比选型</strong>，给出决策树。
        </p>
      </Example>

      <Summary points={[
        '范式比 API 更稳定：抓住"怎么驱动循环、控制权在谁、最擅长什么"三问，就能给任何新框架归类。',
        '七大范式：代码即行动(smolagents)、轻量循环+handoff(OpenAI Agents SDK)、类型安全(PydanticAI)、图/状态机(LangGraph)、角色协作(CrewAI)、数据/RAG(LlamaIndex)、企业 Java 集成(Spring AI)。',
        '控制力光谱从模型主导到开发者主导：smolagents/CrewAI 居中，LangGraph 控制力最高，Spring AI / PydanticAI 偏工程化。',
        'Google ADK、Microsoft Agent Framework、Strands Agents、AG2 范式重叠，留到卷 8 补充。',
        '七框架都能用自定义 base_url 接同一个百炼后端，从而在相同模型下公平对比；学习顺序由轻到重。',
      ]} />
    </article>
  )
}

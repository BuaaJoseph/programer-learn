import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ParadigmMap from '@/courses/agent-frameworks/illustrations/ParadigmMap.jsx'

export default function Ch2() {
  return (
    <article>
      <h1>全景地图：主流框架与范式分类</h1>

      <Lead>
        市面上的 Agent 框架多到让人眼花，光是「主流」级别的就有十几个，每隔几个月还会冒出新的。
        如果你打算一个一个去啃它们的 API，很快就会淹没在文档里。本章想先帮你登上高处，把这门课要讲的
        七个框架按「范式」摆到同一张地图上——先看清楚森林，再走进每一棵树。
      </Lead>

      <h2>框架很多，范式就那么几类</h2>

      <p>
        框架之间的差异，表面上是 API 不同、命名不同、配置方式不同；但往下挖一层，真正决定一个框架「长什么样、
        适合干什么」的，是它背后的<strong>范式（paradigm）</strong>——也就是它对「Agent 该如何行动、如何被编排、
        如何与你的系统协作」这个根本问题给出的答案。
      </p>
      <p>
        同一个范式下的框架，API 再不一样，骨架也是相通的；不同范式的框架，哪怕都叫「Agent 框架」，
        写出来的代码结构可能天差地别。所以与其记 API，不如先记范式。
      </p>

      <KeyIdea>
        选型的本质不是「选框架」，而是「选范式」。先想清楚你的任务属于哪一类——是要写代码跑流程，
        还是要画状态机控制长流程，还是要连数据做问答——范式定了，候选框架自然就收敛到一两个，
        剩下的只是工程口味的差别。
      </KeyIdea>

      <h2>先交互浏览这张范式地图</h2>

      <p>
        下面这张地图把本课的七个范式和它们的代表框架放在一起。先动手点一点、连一连，建立一个大致的方位感，
        再往下看每个范式的文字简介——你会发现读起来轻松很多。
      </p>

      <ParadigmMap />

      <h2>七个范式逐个看</h2>

      <p>每个范式只点到为止，目的是让你记住「它解决什么问题、长什么样」，细节都留给后面对应的卷。</p>

      <ul>
        <li>
          <h3>代码行动：smolagents</h3>
          <p>
            它的核心主张是：让 Agent 直接<strong>写并执行 Python 代码</strong>作为它的「动作」，
            而不是像传统做法那样输出一段 JSON 工具调用再由框架解析执行。一段代码里可以连续调用多个工具、
            做循环、做条件判断，于是同样一个任务往往用更少的步数就能完成，工具之间的组合也更自然。
            范式越「贴近代码」，表达力越强。
          </p>
        </li>
        <li>
          <h3>轻量循环 + handoff：OpenAI Agents SDK</h3>
          <p>
            它刻意把抽象压到极少，核心只有四件东西：<code>Agent</code>、
            <code>Handoff</code>（把控制权整个交给另一个 Agent）、
            <code>Guardrail</code>（与主流程并行运行的校验，可以中断不合规的请求），
            以及 <code>Session</code> / <code>Tracing</code>（会话记忆与可观测）。
            它是 OpenAI 早期实验性项目 Swarm 的生产级继任者，思路一脉相承，但更稳、更可用于线上。
          </p>
        </li>
        <li>
          <h3>类型安全 / 结构化：PydanticAI</h3>
          <p>
            出自 Pydantic 团队，把「类型安全」这件事带进了 Agent 世界。它提供泛型化的
            <code>Agent</code>，用 <code>output_type</code> 约束模型必须返回结构化、可校验的输出，
            用 <code>deps</code> 做依赖注入。整体是一种 FastAPI 式的工程化风格：强类型、好测试、好维护。
          </p>
        </li>
        <li>
          <h3>图 / 状态机：LangGraph</h3>
          <p>
            它是 LangChain 生态的编排层，1.0 已经 GA。把 Agent 流程建模成一张图：
            <code>StateGraph</code> 定义状态与节点，条件边决定走向，
            <code>checkpointer</code> 负责持久化与记忆，<code>interrupt</code> 实现人工审核的中断点。
            在所有范式里它的<strong>控制力最强</strong>，最适合分支多、回路多的复杂长流程。
          </p>
        </li>
        <li>
          <h3>角色协作：CrewAI</h3>
          <p>
            它已经脱离 LangChain，成为独立框架。核心概念是把任务拆成多个有「角色」的 Agent 来协作：
            <code>Agent</code>（角色）+ <code>Task</code>（任务）+ <code>Crew</code>（团队），
            由 <code>Process</code> 决定协作方式（<code>sequential</code> 顺序、
            <code>hierarchical</code> 层级），再加上 <code>Flows</code> 做事件驱动的编排。
            最适合研究、创作这类需要多视角碰撞的任务。
          </p>
        </li>
        <li>
          <h3>数据 / RAG 驱动：LlamaIndex</h3>
          <p>
            它的出发点始终是「<strong>连接 LLM 与你自己的数据</strong>」。一边是索引与检索能力，
            另一边是 <code>FunctionAgent</code> / <code>AgentWorkflow</code> 这样的 Agent 抽象，
            底层由事件驱动的 Workflows 1.0 支撑。如果你的目标是知识库、文档问答这类场景，它最对口。
          </p>
        </li>
        <li>
          <h3>企业 Java 集成：Spring AI</h3>
          <p>
            Spring 官方推出的框架，1.0 已经 GA，把 AI 能力融进了熟悉的 Spring 风格：
            <code>ChatClient</code> 提供 fluent 链式 API，配合自动配置与依赖注入；
            <code>Advisors</code> 挂载记忆、RAG 等横切能力；<code>@Tool</code> 注解暴露工具；
            <code>{'.entity()'}</code> 直接拿到结构化输出。对于「在 Spring Boot 后端里加 AI」的团队，它是最自然的选择。
          </p>
        </li>
      </ul>

      <Callout variant="note" title="还有一些被点名但本课不展开的框架">
        <p>
          除了上面七个，还有几个同样主流：Google ADK、Microsoft Agent Framework
          （由 AutoGen 与 Semantic Kernel 合并而来的继任者）、Strands Agents（AWS 出品）、
          以及 AG2（AutoGen 的社区分叉）。它们都很有分量，但范式与上面这七个存在不少重叠。
          本课为了覆盖面更完整、互补性更强，选了这七个作为主线；它们的定位会在卷 8 里再专门提及。
        </p>
      </Callout>

      <Callout variant="tip" title="贯穿全课的一条副线：统一底座">
        <p>
          这七个框架长得各不相同，但有一个关键共性：它们都允许通过自定义 <code>base_url</code>
          接到同一个兼容 OpenAI 接口的后端——本课统一用阿里云百炼（Qwen）作为这个后端。
          下一章我们先把这条「统一底座」打好，之后每一章在介绍框架时，都会顺带对比它各自的接入写法，
          让你看清同一个模型在不同范式下是怎么被「接进去」的。
        </p>
      </Callout>

      <h2>本课的学习顺序</h2>

      <p>
        我们按「由轻到重」来安排：先从抽象最少、最容易上手的框架开始，逐步过渡到控制力强、工程量大的框架，
        顺序是 smolagents → OpenAI Agents SDK → PydanticAI → LangGraph → CrewAI → LlamaIndex → Spring AI，
        最后再做一次横向对比，把选型的思路收口。这样走下来，你既能积累实战手感，又能在对比中逐渐看清每个范式的边界。
      </p>

      <Summary
        points={[
          '框架数量很多，但背后的范式就那么几类——理解范式比死记 API 更重要，选型本质是选范式。',
          '七个主线范式：代码行动(smolagents)、轻量循环+handoff(OpenAI Agents SDK)、类型安全/结构化(PydanticAI)、图/状态机(LangGraph)、角色协作(CrewAI)、数据/RAG(LlamaIndex)、企业Java集成(Spring AI)。',
          'Google ADK、Microsoft Agent Framework、Strands、AG2 等也主流，但范式有重叠，本课选了互补性更强的七个，卷8再提。',
          '一条贯穿全课的副线：七个框架都能用自定义 base_url 接同一个百炼(Qwen)后端，下一章先打好这条统一底座。',
          '学习顺序由轻到重：smolagents → OpenAI SDK → PydanticAI → LangGraph → CrewAI → LlamaIndex → Spring AI，最后横向对比选型。',
        ]}
      />
    </article>
  )
}

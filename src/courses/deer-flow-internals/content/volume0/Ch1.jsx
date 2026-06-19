import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import OverallArchitecture from '@/courses/deer-flow-internals/illustrations/OverallArchitecture.jsx'

const langgraphJson = `{
  "$schema": "https://langgra.ph/schema.json",
  "python_version": "3.12",
  "dependencies": ["."],
  "env": ".env",
  "graphs": {
    "lead_agent": "deerflow.agents:make_lead_agent"
  },
  "auth": {
    "path": "./app/gateway/langgraph_auth.py:auth"
  },
  "checkpointer": {
    "path": "./packages/harness/deerflow/runtime/checkpointer/async_provider.py:make_checkpointer"
  }
}`

const pyprojectHead = `[project]
name = "deer-flow"
version = "2.1.0"
description = "LangGraph-based AI agent system with sandbox execution capabilities"
requires-python = ">=3.12"
dependencies = [
    "deerflow-harness",      # 可复用内核（workspace member）
    "fastapi>=0.115.0",
    "sse-starlette>=2.1.0",  # SSE 流式
    "uvicorn[standard]>=0.34.0",
    "langgraph-sdk>=0.1.51", # 渠道侧以 SDK 反向调用网关
    "lark-oapi", "slack-sdk", "python-telegram-bot", "dingtalk-stream",  # IM 渠道
    "pyjwt>=2.13.0", "bcrypt>=4.0.0",  # 鉴权
]`

export default function Ch1() {
  return (
    <article>
      <Lead>
        很多人对 deer-flow 的第一印象还停留在它早期那版「planner → researcher → coder」的多 Agent
        深度研究 demo。但我们要拆的这份源码是 <strong>v2.1.0</strong>，它早已脱胎换骨：现在的 deer-flow
        是一个<strong>工业级的 Agent harness（运行时框架）</strong>——一个 lead agent 套着二十多个
        <code>AgentMiddleware</code>，能委派 subagent、在沙箱里跑 bash、动态接入 MCP 工具、热加载配置、
        通过 SSE 流式推送给 Next.js 前端，还能从飞书/Slack/Telegram 等 IM 渠道接入。这一章先建立<strong>整体心智图</strong>，
        后面每一卷再逐层钻进源码。
      </Lead>

      <h2>一、它到底是什么：一句话定位</h2>
      <p>
        我们先看官方自己怎么定义。<code>backend/pyproject.toml</code> 的项目描述写得很直接：
      </p>
      <CodeBlock lang="toml" title="backend/pyproject.toml（节选）" code={pyprojectHead} />
      <KeyIdea title="定位">
        deer-flow v2.1.0 = <strong>「LangGraph-based AI agent system with sandbox execution capabilities」</strong>。
        换成工程语言：它在 <code>langchain.agents.create_agent</code>（一张 LangGraph 状态图）这个底座之上，
        包了「<strong>FastAPI 网关 + 运行时（流式/持久化）+ 一个由中间件栈装配出来的 lead agent + 子代理/工具/沙箱执行层</strong>」，
        对外暴露成一个兼容 LangGraph Platform 协议的服务。
      </KeyIdea>
      <p>
        注意依赖列表里的信号量：<code>fastapi</code> + <code>sse-starlette</code> + <code>uvicorn</code> 说明它是
        SSE 流式的 Web 服务；<code>langgraph-sdk</code> 说明渠道侧会<strong>反过来</strong>用官方 SDK 调自己的网关；
        <code>lark-oapi / slack-sdk / python-telegram-bot / dingtalk-stream</code> 说明 IM 渠道是一等公民；
        <code>pyjwt / bcrypt</code> 说明它自带一套账号鉴权。这些都不是一个「demo」会有的东西。
      </p>

      <h2>二、整体架构：六层，自上而下</h2>
      <p>
        把整个系统竖着切开，从用户入口到外部依赖，一共六层。先看图，再逐层解释；后续每一卷基本就是在放大其中一层。
      </p>
      <OverallArchitecture />

      <ol>
        <li>
          <strong>入口层</strong>：两类入口——浏览器里的 <em>Next.js 前端</em>（用 LangGraph SDK 的
          <code>useStream</code> 消费 SSE），以及各种 <em>IM 渠道</em>。两者最终都收敛到「向网关创建一次 agent run」。
        </li>
        <li>
          <strong>网关层</strong>（<code>backend/app/gateway</code>）：一个 FastAPI 应用，<code>create_app()</code>
          注册 Auth/CSRF/CORS 中间件和 18 个路由器，对外实现 LangGraph Platform 兼容的 <code>runs/threads</code> 协议。
        </li>
        <li>
          <strong>运行时层</strong>（<code>deerflow.runtime</code>）：<code>StreamBridge</code> 解耦「产生事件的 agent worker」
          与「吐 SSE 的 HTTP 端点」；<code>RunManager</code> 管 run 生命周期；<code>Checkpointer/Store</code> 做持久化。
        </li>
        <li>
          <strong>Agent 核心层</strong>（<code>deerflow.agents</code>）：<code>make_lead_agent</code> 读配置把模型、工具、
          二十余个中间件、system prompt 组装成一张 <code>create_agent</code> 状态图。这是全课程最该读懂的一层。
        </li>
        <li>
          <strong>执行层</strong>：<em>Tools</em>（统一的 <code>BaseTool</code>，含 bash/文件/检索/MCP）、<em>Subagents</em>
          （通过 <code>task</code> 工具委派）、<em>Sandbox</em>（本地沙箱或容器化 aio-sandbox）、<em>Skills</em>（渐进式知识注入）。
        </li>
        <li>
          <strong>依赖层</strong>：LLM 提供方、MCP servers、检索/抓取服务等外部能力。
        </li>
      </ol>

      <Callout variant="note" title="和「老 deer-flow」的区别">
        早期 deer-flow 的卖点是「固定编排的多 Agent 深度研究流水线」。v2.1.0 换成了
        <strong>「单 lead agent + 中间件 + 动态委派 subagent」</strong>的范式——更接近 Claude Code / Codex 这类
        通用 coding/agent harness 的结构。如果你拿老文章对照源码，会发现对不上，原因就在这里。
      </Callout>

      <h2>三、为什么是「中间件栈」而不是「god class」</h2>
      <p>
        deer-flow 最关键的架构决策是：<strong>它没有一个庞大的 Agent 主循环类</strong>。模型调用、工具执行、状态推进
        这套 ReAct 循环交给 LangGraph 的 <code>create_agent</code>；而所有「业务智能」——压缩历史、注入记忆、检测死循环、
        安全审计、生成标题、委派子代理、拦截澄清——都被拆成一个个 <code>AgentMiddleware</code>，按确定的顺序叠在底座上。
      </p>
      <KeyIdea>
        这套设计的好处：每个关注点（concern）<strong>单文件、可独立测试、可按 feature 开关</strong>。要加一个能力，
        通常就是写一个新的 middleware 插进栈里，而不是改主循环。第 2 卷我们会把这二十多个中间件逐个拆开。
      </KeyIdea>

      <h2>四、graph、auth、checkpointer——三个声明式入口</h2>
      <p>
        想快速找到「系统从哪开始」，看 <code>backend/langgraph.json</code> 就够了。它用三个 <code>path</code>
        把整个运行时的关键入口点声明给了 LangGraph 运行时：
      </p>
      <CodeBlock lang="json" title="backend/langgraph.json" code={langgraphJson} />
      <ul>
        <li>
          <code>graphs.lead_agent</code> → <code>deerflow.agents:make_lead_agent</code>：图工厂。一次 run 就是跑这张图。
        </li>
        <li>
          <code>auth.path</code> → <code>app/gateway/langgraph_auth.py:auth</code>：直连 LangGraph Server/Studio 时复用同一套 JWT+CSRF。
        </li>
        <li>
          <code>checkpointer.path</code> → <code>...runtime/checkpointer/async_provider.py:make_checkpointer</code>：
          线程状态持久化后端（memory/sqlite/postgres）。
        </li>
      </ul>
      <Example title="顺着入口读源码的建议路线">
        想自己验证本章结论，按这条线读最快：<code>langgraph.json</code> →
        <code>deerflow/agents/__init__.py</code>（暴露 <code>make_lead_agent</code>）→
        <code>agents/lead_agent/agent.py</code>（装配图）→
        <code>agents/factory.py</code> 与各 <code>middlewares/*.py</code>。网关侧则从
        <code>app/gateway/app.py::create_app</code> 入。
      </Example>

      <h2>五、本课程怎么带你读</h2>
      <p>
        我们按「外 → 内 → 外」的顺序：先（卷 1）从网关看一次请求怎么进来、怎么变成 SSE；再（卷 2-6）钻进 harness 内核，
        把 agent 核心、子代理/工具、沙箱、运行时、技能与配置逐层拆透；最后（卷 7）回到前端，把整条流式链路与 IM 渠道闭合。
        每一章的关键结论都会标注<strong>真实文件路径 + 类/函数名 + 源码片段</strong>，不确定处标「待确认」并指明该继续看哪个文件。
      </p>

      <Summary
        points={[
          'deer-flow v2.1.0 是一个工业级 Agent harness，不是早期的固定多 Agent 流水线；定位是「LangGraph-based AI agent system with sandbox execution」。',
          '整体六层：入口（前端/渠道）→ 网关（FastAPI）→ 运行时（StreamBridge/RunManager/持久化）→ Agent 核心（lead agent + 中间件栈）→ 执行（tools/subagents/sandbox/skills）→ 外部依赖。',
          '核心架构决策：没有 god class，ReAct 循环交给 langchain create_agent，业务智能拆成二十余个可插拔的 AgentMiddleware。',
          'langgraph.json 用 graphs/auth/checkpointer 三个 path 声明了系统的关键入口，是读源码的最佳起点。',
        ]}
      />
    </article>
  )
}

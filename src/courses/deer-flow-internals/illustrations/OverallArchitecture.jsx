import { DiagramFrame, Box, Row, Col, Arrow, Lane } from './kit.jsx'

// 总体架构图：客户端/渠道 → 网关 → 运行时 → Agent 核心 → 工具/子代理/沙箱 → 外部依赖
export default function OverallArchitecture() {
  return (
    <DiagramFrame
      title="图 0-1 · DeerFlow 总体架构"
      note="自上而下是请求流向。前端与 IM 渠道是两类入口，最终都汇入网关的「创建一次 agent run」；网关之下由 harness 内核（runtime + agent core + tools/subagents/sandbox）真正执行。"
    >
      <Col gap={6}>
        <Lane label="入口" tone="blue">
          <Box tone="blue" title="Next.js 前端" sub="App Router · useStream(SSE)" flex />
          <Box tone="blue" title="IM 渠道" sub="Feishu / Slack / Telegram / WeCom / DingTalk / Discord" flex />
        </Lane>
        <Arrow dir="down" label="HTTP / SSE（LangGraph Platform 兼容协议）" />

        <Lane label="网关" tone="base">
          <Box tone="base" title="FastAPI Gateway" sub="app/gateway · create_app()" flex />
          <Box tone="gray" title="中间件" sub="Auth → CSRF → CORS" />
          <Box tone="gray" title="18 routers" sub="runs / threads / agents / skills / mcp …" flex />
        </Lane>
        <Arrow dir="down" label="start_run → 后台 asyncio.Task" />

        <Lane label="运行时" tone="purple">
          <Box tone="purple" title="StreamBridge" sub="生产者/消费者解耦 + 心跳/重连" flex />
          <Box tone="purple" title="RunManager" sub="run 生命周期 / 并发策略" flex />
          <Box tone="purple" title="Checkpointer / Store" sub="sqlite / postgres 持久化" flex />
        </Lane>
        <Arrow dir="down" label="run_agent → agent.astream(...)" />

        <Lane label="Agent 核心" tone="green">
          <Box tone="green" title="make_lead_agent" sub="config-driven 应用工厂" flex />
          <Box tone="green" title="create_agent（LangGraph 底座）" sub="ThreadState 状态图" flex />
          <Box tone="green" title="AgentMiddleware × 20+" sub="预算/记忆/摘要/循环检测/澄清…" flex />
        </Lane>
        <Arrow dir="down" label="工具调用 / 委派" />

        <Lane label="执行" tone="amber">
          <Box tone="amber" title="Tools（BaseTool）" sub="bash / file / web / MCP" flex />
          <Box tone="amber" title="Subagents" sub="task 工具 → general-purpose / bash" flex />
          <Box tone="amber" title="Sandbox" sub="LocalSandbox / aio-sandbox 容器" flex />
          <Box tone="amber" title="Skills" sub="渐进式领域知识注入" flex />
        </Lane>
        <Arrow dir="down" label="外部能力" />

        <Lane label="依赖" tone="rose">
          <Box tone="rose" title="LLM 提供方" sub="OpenAI 兼容 / Anthropic / Gemini / 百炼…" flex />
          <Box tone="rose" title="MCP servers" sub="Model Context Protocol 工具" flex />
          <Box tone="rose" title="检索/抓取" sub="DDG / SearXNG / Tavily / Jina …" flex />
        </Lane>
      </Col>
    </DiagramFrame>
  )
}

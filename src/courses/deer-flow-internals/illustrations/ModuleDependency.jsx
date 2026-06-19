import { DiagramFrame, Box, Row, Col, Arrow } from './kit.jsx'

// 后端核心模块依赖图
export default function ModuleDependency() {
  return (
    <DiagramFrame
      title="图 · 后端核心模块依赖（backend/）"
      note="箭头表示「依赖/调用」方向。app（gateway 应用）依赖 packages/harness/deerflow（可复用内核）；内核内部 agents 居中，向下依赖 tools / subagents / sandbox / runtime / skills / config。config 与 runtime 被几乎所有模块依赖。"
    >
      <Col gap={6} style={{ minWidth: 620 }}>
        <Row gap={10} align="stretch">
          <Box tone="blue" title="app/gateway" sub="FastAPI app · routers · auth" flex />
          <Box tone="blue" title="app/channels" sub="IM 渠道适配 + manager" flex />
        </Row>
        <Arrow dir="down" label="import deerflow.* · 经 langgraph-sdk HTTP 调用网关" />

        <Box tone="green" title="deerflow.agents" sub="factory · lead_agent · middlewares(20+) · memory · thread_state" style={{ textAlign: 'center' }} />
        <Row gap={8}>
          <Arrow dir="down" />
          <Arrow dir="down" />
          <Arrow dir="down" />
        </Row>

        <Row gap={10} align="stretch">
          <Box tone="amber" title="deerflow.tools" sub="get_available_tools · builtins · mcp" flex />
          <Box tone="amber" title="deerflow.subagents" sub="registry · executor · task" flex />
          <Box tone="amber" title="deerflow.sandbox" sub="Sandbox · provider · security · middleware" flex />
        </Row>
        <Arrow dir="down" label="所有上层最终都依赖运行时与配置" />

        <Row gap={10} align="stretch">
          <Box tone="purple" title="deerflow.runtime" sub="stream_bridge · events · runs · checkpointer · store" flex />
          <Box tone="rose" title="deerflow.skills" sub="installer · parser · permissions · storage" flex />
          <Box tone="gray" title="deerflow.config" sub="app_config · 各 *_config · YAML 热加载" flex />
        </Row>
        <Arrow dir="down" />
        <Row gap={10} align="stretch">
          <Box tone="gray" title="deerflow.mcp" sub="client · cache（MultiServerMCPClient）" flex />
          <Box tone="gray" title="deerflow.persistence" sub="engine · 各 repository（sqlite/pg）" flex />
          <Box tone="gray" title="deerflow.reflection" sub="resolve_class / resolve_variable 反射装配" flex />
        </Row>
      </Col>
    </DiagramFrame>
  )
}

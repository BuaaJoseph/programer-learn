import { DiagramFrame, Box, Row, Col, Arrow, Step } from './kit.jsx'

// 配置加载流程图
export default function ConfigLoading() {
  return (
    <DiagramFrame
      title="图 · 配置加载流程（config.yaml → AppConfig）"
      note="核心设计：请求路径永远走 get_app_config()，它按文件 mtime 判断是否需要重新解析，从而让 config.yaml 的修改无需重启即可生效；lifespan 启动时的快照只用于一次性 bootstrap，故意不缓存到 app.state，避免「配置脑裂」。"
    >
      <Col gap={6} style={{ minWidth: 560 }}>
        <Row gap={10}>
          <Box tone="gray" title="config.yaml" sub="用户配置（make config 由 example 生成）" flex />
          <Box tone="gray" title="环境变量 / .env" sub="密钥、GATEWAY_* 等覆盖项" flex />
          <Box tone="gray" title="extensions_config.json" sub="MCP server 启停" flex />
        </Row>
        <Arrow dir="down" label="get_app_config()" />
        <Box tone="base" title="按 mtime 命中缓存？" sub="未变 → 返回缓存实例；已变 → 重新加载" style={{ textAlign: 'center' }} />
        <Arrow dir="down" label="加载 + 校验" />
        <Box tone="green" title="AppConfig（pydantic 模型）" sub="extra='allow'，允许 channels 等扩展段" style={{ textAlign: 'center' }} />
        <Arrow dir="down" label="拆分为各子配置（schema 树）" />
        <Row gap={8} align="stretch">
          <Box tone="purple" title="models[]" sub="LLM 列表 / 默认模型" flex />
          <Box tone="purple" title="sandbox" sub="use=类路径 · allow_host_bash" flex />
          <Box tone="purple" title="memory" sub="enabled · token_counting" flex />
          <Box tone="purple" title="tools[]" sub="name/group/use 反射装配" flex />
        </Row>
        <Row gap={8} align="stretch">
          <Box tone="amber" title="subagents" sub="agents / custom_agents 覆盖" flex />
          <Box tone="amber" title="skills" sub="evolution · 启用列表" flex />
          <Box tone="amber" title="summarization / loop_detection / token_usage" sub="中间件开关" flex />
          <Box tone="amber" title="channels" sub="各 IM 凭证（model_extra）" flex />
        </Row>
        <Arrow dir="down" label="reflection.resolve_class / resolve_variable" />
        <Box tone="rose" title="装配运行时组件" sub="SandboxProvider / 各 Tool / Middleware 由「module:Class」字符串反射实例化" style={{ textAlign: 'center' }} />
      </Col>
    </DiagramFrame>
  )
}

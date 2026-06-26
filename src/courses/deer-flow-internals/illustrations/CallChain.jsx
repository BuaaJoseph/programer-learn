import { DiagramFrame, Box, Row, Col, Arrow, Step } from './kit.jsx'

// agent / tool / sandbox 调用链路图
export default function CallChain() {
  return (
    <DiagramFrame
      title="图 · agent → tool → subagent / sandbox 调用链路"
      note="左列是一次普通工具调用（如 str_replace 落到 Sandbox）；右列是一次委派（task 工具 spawn 子代理）。两条链都从 lead agent 的一次模型输出开始。"
    >
      <Row gap={18} align="flex-start" style={{ minWidth: 640 }}>
        {/* 左：工具→沙箱 */}
        <Col gap={6} style={{ flex: 1 }}>
          <Box tone="green" title="lead agent（LLM）" sub="产出 tool_calls" />
          <Arrow dir="down" label="LangGraph ToolNode" />
          <Box tone="amber" title="@tool str_replace_tool" sub="sandbox/tools.py" />
          <Arrow dir="down" label="ensure_sandbox_initialized(runtime)" />
          <Box tone="base" title="provider.get(sandbox_id)" sub="state['sandbox'] 复用同一沙箱" />
          <Arrow dir="down" label="路径校验 + 虚拟路径翻译" />
          <Box tone="rose" title="Sandbox.write_file()" sub="Local：宿主机 FS / Aio：容器 HTTP API" />
          <Arrow dir="up" label="mask_local_paths_in_output + 截断" />
          <Box tone="gray" title="ToolMessage → 回喂 LLM" />
        </Col>

        {/* 右：委派→子代理 */}
        <Col gap={6} style={{ flex: 1 }}>
          <Box tone="green" title="lead agent（LLM）" sub="产出 task 调用" />
          <Arrow dir="down" label="SubagentLimitMiddleware 截断并发" />
          <Box tone="amber" title="@tool task_tool" sub="subagents 复用，subagent_enabled=False 防递归" />
          <Arrow dir="down" label="get_subagent_config(type)" />
          <Box tone="base" title="SubagentExecutor.execute_async" sub="task_id = tool_call_id · 隔离 loop" />
          <Arrow dir="down" label="create_agent(checkpointer=False)" />
          <Box tone="purple" title="子 agent.astream(...)" sub="复用同一 sandbox_state / thread_data" />
          <Arrow dir="up" label="每 5s 轮询 · task_running SSE · token 回传" />
          <Box tone="gray" title='"Task Succeeded. Result: …" → 状态盖章' sub="extract_subagent_status → additional_kwargs" />
        </Col>
      </Row>
    </DiagramFrame>
  )
}

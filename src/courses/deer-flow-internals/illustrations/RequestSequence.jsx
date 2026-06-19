import { DiagramFrame, Step, Col } from './kit.jsx'

// 前后端请求时序图：一次对话从点击到逐字渲染
export default function RequestSequence() {
  return (
    <DiagramFrame
      title="图 · 前后端流式请求时序（一次对话）"
      note="角色：UI=前端组件；SDK=@langchain/langgraph-sdk 的 useStream；GW=FastAPI 网关；WK=后台 run_agent worker；SB=StreamBridge。生产者 worker 与消费者 sse_consumer 通过 StreamBridge 解耦。"
    >
      <Col gap={9}>
        <Step n={1} actor="UI" tone="blue">
          用户在 <code>InputBox</code> 提交 → <code>sendMessage()</code> 先 <code>setOptimisticMessages([human])</code> 乐观渲染，必要时 <code>uploadFiles()</code> 先走 REST 上传附件。
        </Step>
        <Step n={2} actor="SDK" tone="blue">
          <code>thread.submit(&#123;messages:[human]&#125;, &#123;streamSubgraphs, streamResumable, context&#125;)</code>；<code>context.mode</code> 映射为 <code>thinking_enabled / is_plan_mode / subagent_enabled</code>。
        </Step>
        <Step n={3} actor="Next" tone="gray">
          <code>next.config.js</code> 的 rewrites 把 <code>/api/langgraph/*</code> 反代到网关 <code>:8001/api/*</code>，附 <code>credentials:include</code> + <code>X-CSRF-Token</code>。
        </Step>
        <Step n={4} actor="GW" tone="base">
          <code>POST /api/threads/&#123;tid&#125;/runs/stream</code> → <code>@require_permission</code> 鉴权 → <code>start_run()</code> 校验模型白名单、thread 归属、<code>create_or_reject</code>。
        </Step>
        <Step n={5} actor="GW" tone="base">
          <code>asyncio.create_task(run_agent(...))</code> 起后台生产者；返回 <code>StreamingResponse(sse_consumer(...), media_type="text/event-stream")</code>，带 <code>X-Accel-Buffering: no</code>。
        </Step>
        <Step n={6} actor="WK" tone="purple">
          <code>run_agent</code> 先发首帧 <code>bridge.publish(run_id,"metadata",&#123;run_id,thread_id&#125;)</code>，再 <code>agent.astream(...)</code> 把各 <code>stream_mode</code> 事件逐条 <code>bridge.publish(...)</code>。
        </Step>
        <Step n={7} actor="SB" tone="purple">
          StreamBridge 缓冲事件并赋单调递增 <code>id</code>；无事件时 yield <code>HEARTBEAT_SENTINEL</code>，结束时 yield <code>END_SENTINEL</code>。
        </Step>
        <Step n={8} actor="GW" tone="base">
          <code>sse_consumer</code> 异步生成器 <code>async for entry in bridge.subscribe(...)</code>：心跳→<code>: heartbeat</code>；结束→<code>event: end</code>；其余→<code>format_sse(event,data,id)</code>。
        </Step>
        <Step n={9} actor="SDK" tone="blue">
          useStream 解析 SSE，增量更新 <code>thread.messages</code>，触发 <code>onCreated / onUpdateEvent / onCustomEvent(task_running) / onLangChainEvent</code>。
        </Step>
        <Step n={10} actor="UI" tone="blue">
          <code>MessageList</code> 实时 <code>getMessageGroups()</code> 分组，正文经 <code>MarkdownContent → Streamdown</code> 边流边渲染；推理/工具进折叠思维链，子代理进 <code>SubtaskCard</code>。
        </Step>
        <Step n={11} actor="SDK" tone="green">
          流结束 → <code>onFinish(state)</code>，<code>isLoading→false</code>，<code>invalidateQueries</code> 刷新会话列表与 token 用量；断线由 <code>reconnectOnMount + joinStream</code> 续流。
        </Step>
      </Col>
    </DiagramFrame>
  )
}

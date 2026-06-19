import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RequestSequence from '@/courses/deer-flow-internals/illustrations/RequestSequence.jsx'

const streamRun = `@router.post("/{thread_id}/runs/stream")
@require_permission("runs", "create", owner_check=True, require_existing=True)
async def stream_run(thread_id, body, request):
    bridge  = get_stream_bridge(request)
    run_mgr = get_run_manager(request)
    record  = await start_run(body, thread_id, request)     # 建 run + 起后台 task
    return StreamingResponse(
        sse_consumer(bridge, record, request, run_mgr),     # 消费者：异步生成器
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive",
                 "X-Accel-Buffering": "no",                 # 关 nginx 缓冲
                 "Content-Location": f"/api/threads/{thread_id}/runs/{record.run_id}"},
    )`

const startRun = `async def start_run(body, thread_id, request):
    # 1) 模型白名单：未知模型 → 400
    if get_app_config().get_model_config(body...model) is None: raise HTTPException(400)
    # 2) thread 归属强制（无状态端点 owner_check 保护不到，这里显式查）
    await thread_store.check_access(thread_id, user.id)
    # 3) 并发策略：冲突 → 409
    record = run_mgr.create_or_reject(...)
    # 4) 组装并起后台生产者
    agent_factory = resolve_agent_factory(body.assistant_id)   # → make_lead_agent
    config = build_run_config(thread_id, body.config, body.metadata, assistant_id=...)
    task = asyncio.create_task(run_agent(bridge, run_mgr, record, ctx=run_ctx,
        agent_factory=agent_factory, graph_input=normalize_input(body.input),
        config=config, stream_modes=normalize_stream_modes(body.stream_mode)))
    record.task = task
    return record`

const sseConsumer = `async def sse_consumer(bridge, record, request, run_mgr):
    last_event_id = request.headers.get("Last-Event-ID")
    try:
        async for entry in bridge.subscribe(record.run_id, last_event_id=last_event_id):
            if await request.is_disconnected(): break
            if entry is HEARTBEAT_SENTINEL: yield ": heartbeat\\n\\n"; continue
            if entry is END_SENTINEL:
                yield format_sse("end", None, event_id=entry.id or None); return
            yield format_sse(entry.event, entry.data, event_id=entry.id or None)
    finally:
        if record.status in (RunStatus.pending, RunStatus.running):
            if record.on_disconnect == DisconnectMode.cancel:
                await run_mgr.cancel(record.run_id)        # 客户端断开则取消 run`

const formatSse = `def format_sse(event, data, event_id=None):
    payload = json.dumps(data, default=str, ensure_ascii=False)
    parts = [f"event: {event}", f"data: {payload}"]
    if event_id: parts.append(f"id: {event_id}")
    parts.append(""); parts.append("")
    return "\\n".join(parts)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章是网关的灵魂：<strong>一个 run 请求怎么变成一条 SSE 流</strong>。核心是「生产者/消费者解耦」——
        后台 <code>run_agent</code> 任务往 <code>StreamBridge</code> 里 publish 事件，HTTP 端点的 <code>sse_consumer</code>
        从 bridge subscribe 出来逐帧吐给浏览器。中间夹着心跳保活、<code>Last-Event-ID</code> 断线重连、客户端断开即取消 run 等工程细节。
        我们顺着函数调用一路追到底。
      </Lead>

      <h2>一、路由总表：谁驱动 run</h2>
      <p>
        网关挂了 18 个路由器。下表挑出最关键的几个；其中<strong>驱动 agent run + SSE 的端点已加粗</strong>。
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>路由器</th><th>prefix</th><th>关键端点</th></tr></thead>
          <tbody>
            <tr><td><code>thread_runs.py</code></td><td><code>/api/threads</code></td><td><strong>POST <code>/{'{tid}'}/runs/stream</code>（SSE）</strong>、<code>/runs/wait</code>、<code>/runs/{'{run_id}'}/cancel</code>、<code>/runs/{'{run_id}'}/stream</code>（join）</td></tr>
            <tr><td><code>runs.py</code></td><td><code>/api/runs</code></td><td><strong>POST <code>/stream</code>（无状态 SSE）</strong>、<code>/wait</code>、<code>/{'{run_id}'}/messages</code></td></tr>
            <tr><td><code>threads.py</code></td><td><code>/api/threads</code></td><td>建 thread、<code>/search</code>、<code>/{'{tid}'}/state</code>（HITL 恢复）、<code>/history</code>、DELETE</td></tr>
            <tr><td><code>agents.py</code></td><td><code>/api</code></td><td><code>GET/POST/PUT/DELETE /agents</code>（自定义 agent + SOUL.md）</td></tr>
            <tr><td><code>models.py</code> / <code>skills.py</code> / <code>mcp.py</code> / <code>memory.py</code></td><td><code>/api</code></td><td>模型列表 / 技能管理 / MCP 配置 / 全局记忆</td></tr>
            <tr><td><code>auth.py</code></td><td><code>/api/v1/auth</code></td><td><code>login/local</code>、<code>register</code>、<code>me</code>、<code>setup-status</code>（卷 1-3）</td></tr>
            <tr><td><code>uploads.py</code> / <code>artifacts.py</code> / <code>feedback.py</code> / <code>suggestions.py</code></td><td><code>/api/...</code></td><td>上传 / 产物下载 / run 反馈 / 追问建议</td></tr>
          </tbody>
        </table>
      </div>
      <KeyIdea>
        两个端点能起 run：<code>thread_runs.py</code> 的 <strong>有状态</strong> <code>/threads/{'{tid}'}/runs/stream</code>，
        和 <code>runs.py</code> 的 <strong>无状态</strong> <code>/runs/stream</code>（thread_id 在 body 里，没有就新建 UUID）。两者结构几乎一样，下面以前者为例。
      </KeyIdea>

      <h2>二、端点：建 run + 返回 StreamingResponse</h2>
      <CodeBlock lang="python" title="routers/thread_runs.py — stream_run" code={streamRun} />
      <p>
        两个响应头值得记住：<code>X-Accel-Buffering: no</code> 关掉 nginx 缓冲（否则 SSE 会被攒着不发）；
        <code>Content-Location</code> 指向规范的 run 资源 URL，供 SDK 用正则抽取 <code>run_id</code>。
        权限由 <code>@require_permission("runs","create",owner_check=True,...)</code> 把守（卷 1-3 讲）。
      </p>

      <h2>三、start_run：校验、并发与起后台生产者</h2>
      <CodeBlock lang="python" title="services.py — start_run（精简）" code={startRun} />
      <ul>
        <li><strong>模型白名单</strong>：<code>get_app_config().get_model_config(name)</code> 为空 → 400，挡住乱传的模型名。</li>
        <li><strong>thread 归属</strong>：无状态端点的 thread_id 在 body 里、owner_check 装饰器够不着，所以这里显式
          <code>thread_store.check_access</code>，失败返回 404（用 404 而非 403 防资源枚举）。</li>
        <li><strong>并发策略</strong>：<code>run_mgr.create_or_reject(...)</code>，按 <code>multitask_strategy</code>（reject/interrupt/rollback）处理；冲突 409。</li>
        <li><strong>起生产者</strong>：<code>resolve_agent_factory</code> 永远返回 <code>make_lead_agent</code>（自定义 agent 靠 <code>agent_name</code> 路由）；
          <code>asyncio.create_task(run_agent(...))</code> 在后台驱动图，<code>record.task = task</code> 记下句柄以便取消。</li>
      </ul>

      <h2>四、生产者侧：run_agent 往 bridge publish</h2>
      <p>
        后台任务 <code>run_agent</code>（<code>deerflow/runtime/runs/worker.py</code>）先发一帧元数据，让 SDK 立刻拿到
        <code>run_id</code> 与 <code>thread_id</code>：
      </p>
      <CodeBlock
        lang="python"
        title="runtime/runs/worker.py — run_agent（关键帧）"
        code={`await bridge.publish(run_id, "metadata", {"run_id": run_id, "thread_id": thread_id})
async for chunk in agent.astream(graph_input, config, stream_mode=stream_modes):
    event, data = map_stream_mode(chunk)              # values / messages / updates ...
    await bridge.publish(run_id, event, serialize(data))
# 所有逻辑包在 try/except/finally：无论如何都走到
await bridge.publish_end(run_id)                      # 终态哨兵，避免 SSE 挂死`}
      />
      <Callout variant="note" title="为什么一定要 publish_end">
        SSE 是长连接，消费者要靠一个明确的「结束信号」才能优雅收尾。<code>run_agent</code> 把核心逻辑包在
        <code>try/except/finally</code> 里，确保<strong>任何异常路径都会执行到 <code>publish_end</code></strong>，
        否则浏览器端会一直等下去。卷 5 会展开 StreamBridge 的哨兵机制（<code>HEARTBEAT_SENTINEL</code> / <code>END_SENTINEL</code>）。
      </Callout>

      <h2>五、消费者侧：sse_consumer 逐帧吐出</h2>
      <CodeBlock lang="python" title="services.py — sse_consumer" code={sseConsumer} />
      <p>三类条目分别处理：</p>
      <ul>
        <li><strong>心跳</strong> → 吐一行 SSE 注释 <code>: heartbeat\n\n</code> 保活，不算数据帧。</li>
        <li><strong>结束</strong> → 发一帧 <code>event: end</code> 后 <code>return</code>。</li>
        <li><strong>普通事件</strong> → <code>format_sse(event, data, id)</code>。</li>
      </ul>
      <p>
        <code>finally</code> 块实现 <code>on_disconnect</code> 语义：客户端断开且模式是 <code>cancel</code> 时，主动
        <code>run_mgr.cancel</code> 取消后台 run，避免「人走了 run 还在烧钱」。SSE 帧的格式化对齐 LangGraph Platform：
      </p>
      <CodeBlock lang="python" title="services.py — format_sse" code={formatSse} />

      <h2>六、把它连成一条时序</h2>
      <p>把前端、SDK、网关、worker、bridge 串起来，就是下面这张端到端时序图（卷 7 还会从前端视角再走一遍）：</p>
      <RequestSequence />

      <Example title="/wait 与 join：复用同一个 bridge">
        非流式的 <code>/runs/wait</code> 走 <code>wait_for_run_completion</code>，消费同一个 bridge 但只等
        <code>END_SENTINEL</code>，且每次唤醒都检 <code>is_disconnected()</code>（修过「长工具调用超时被当正常完成」的 bug）。
        刷新页面后的「续流」走 <code>/runs/{'{run_id}'}/stream</code>（join），用 <code>Last-Event-ID</code> 从断点重放。
      </Example>

      <Summary
        points={[
          '能起 run 的端点有两个：有状态 /threads/{tid}/runs/stream 与无状态 /runs/stream；两者都返回 text/event-stream 的 StreamingResponse。',
          'start_run 做三件事：模型白名单/thread 归属/并发校验，然后 asyncio.create_task(run_agent) 起后台生产者并记 record.task。',
          '生产者 run_agent 先 publish 一帧 metadata，再把 agent.astream 的各 stream_mode 事件逐条 publish，finally 必到 publish_end。',
          '消费者 sse_consumer 从 bridge.subscribe 逐帧吐出：心跳→注释行、结束→event:end、其余→format_sse；客户端断开则按 on_disconnect 取消 run。',
        ]}
      />
    </article>
  )
}

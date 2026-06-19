import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const streamEvent = `@dataclass(frozen=True)
class StreamEvent:
    id: str     # 单调递增 event ID → SSE 的 id: 字段，支持 Last-Event-ID 重连
    event: str  # SSE 事件名："metadata"/"values"/"updates"/"messages"/"error"
    data: Any   # JSON 可序列化负载

HEARTBEAT_SENTINEL = StreamEvent(id="", event="__heartbeat__", data=None)
END_SENTINEL       = StreamEvent(id="", event="__end__", data=None)`

const subscribe = `async def subscribe(self, run_id, *, last_event_id=None, heartbeat_interval=15.0):
    start = self._resolve_start_offset(run_id, last_event_id)  # 按 last_event_id 定位回放起点
    while True:
        if next_offset < start_offset:          # 订阅者落后于保留窗口
            next_offset = start_offset           # 跳到最早保留事件
        if has_new_event: yield event; continue
        if ended: yield END_SENTINEL; return
        try: await wait_for(condition.wait(), timeout=heartbeat_interval)
        except TimeoutError: yield HEARTBEAT_SENTINEL`

const journal = `class RunJournal(BaseCallbackHandler):
    # 不实现 on_llm_new_token —— 只在 on_llm_end 捕获完整消息
    def on_chat_model_start(...): emit("llm.human.input", category="message")  # 提首个 human
    def on_llm_end(...):          emit("llm.ai.response", usage=..., latency_ms=...)
    def on_tool_end(...):         emit("llm.tool.result")
    # 调用者归类：tags 里 subagent:{name} / middleware:{name}，默认 lead_agent
    # token 按调用者 + 按 model 双重分桶；_counted_llm_run_ids 去重
    # 写缓冲：达 flush_threshold(20) 批量 put_batch；进度按 5s 节流上报 run_manager`

export default function Ch1() {
  return (
    <article>
      <Lead>
        卷 1 我们见过「生产者 <code>run_agent</code> 往 bridge publish、消费者 <code>sse_consumer</code> 从 bridge subscribe」，
        但没展开 bridge 本身。这一章就钻进 <code>deerflow/runtime</code>：<code>StreamBridge</code> 怎么用一个 per-run 的事件日志
        实现心跳、断线重放与生产/消费解耦；agent 的执行轨迹又怎么经 <code>RunJournal</code> 落进事件存储（jsonl 或 db）。
      </Lead>

      <h2>一、StreamBridge：解耦的总线</h2>
      <p>
        抽象在 <code>runtime/stream_bridge/base.py</code>。它的设计目标（文档串原话）是<strong>解耦 agent worker（生产者）与 SSE 端点
        （消费者）</strong>，对齐 LangGraph Platform 的 Queue + StreamManager 架构。事件单元是冻结的 <code>StreamEvent</code>，配两个哨兵：
      </p>
      <CodeBlock lang="python" title="stream_bridge/base.py — StreamEvent 与哨兵" code={streamEvent} />
      <p>三个核心方法：</p>
      <ul>
        <li><code>publish(run_id, event, data)</code>：生产者入队一个事件。</li>
        <li><code>publish_end(run_id)</code>：标记某 run 不再产出（触发 <code>END_SENTINEL</code>）。</li>
        <li><code>subscribe(run_id, *, last_event_id, heartbeat_interval=15)</code>：消费者侧异步迭代器，无事件超时吐心跳、结束吐 END。</li>
      </ul>

      <h2>二、内存实现：有界回放 + 心跳</h2>
      <p>
        默认实现 <code>stream_bridge/memory.py</code> 给每个 run 维护一个有界的事件日志（<code>queue_maxsize</code> 默认 256）。
        event id 形如 <code>{'{ts}-{seq}'}</code>（毫秒时间戳 + 进程内单调序号）。超界丢最旧并推进 <code>start_offset</code>。
      </p>
      <CodeBlock lang="python" title="stream_bridge/memory.py — subscribe（精简）" code={subscribe} />
      <KeyIdea title="Last-Event-ID 断线重放">
        浏览器刷新或网络抖动后，SDK 带上 <code>Last-Event-ID</code> 重新订阅。<code>subscribe</code> 用 <code>_resolve_start_offset</code>
        从那个 id 之后开始重放保留窗口内的事件；若订阅者落后到窗口之外，则跳到最早保留事件并 WARNING。这就是为什么 deer-flow 的流式
        能「刷新页面接着看」。心跳则是：超过 <code>heartbeat_interval</code> 没新事件就 yield <code>HEARTBEAT_SENTINEL</code>，
        被 <code>sse_consumer</code> 翻译成 <code>: heartbeat</code> 注释行保活。
      </KeyIdea>
      <Callout variant="note" title="工厂与 Redis（待确认/Phase 2）">
        <code>make_stream_bridge</code>（<code>async_provider.py</code>）是个 async context manager，供 lifespan 用。配置
        <code>StreamBridgeType = Literal["memory","redis"]</code>，但 <strong>redis 在 v2.1.0 未实现</strong>
        （<code>raise NotImplementedError("...Phase 2")</code>）。也就是说当前是<strong>单进程内存总线</strong>——多 worker 横向扩展是后话。
      </Callout>

      <h2>三、事件存储：消息与轨迹同一接口</h2>
      <p>
        <code>runtime/events/store/base.py</code> 的 <code>RunEventStore</code> 把「前端要展示的消息」和「调试/审计用的执行轨迹」放进
        <strong>同一接口</strong>，靠 <code>category</code> 字段区分（<code>message / trace / lifecycle / outputs / error / middleware</code>）。
        核心不变量：<code>put()</code> 后可查；同 thread 内 <code>seq</code> 严格递增；<code>list_messages()</code> 只返回 <code>category="message"</code>。
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>后端</th><th>布局/特点</th><th>定位</th></tr></thead>
          <tbody>
            <tr><td><code>MemoryRunEventStore</code></td><td>进程内，默认</td><td>开发/无持久化</td></tr>
            <tr><td><code>JsonlRunEventStore</code></td><td><code>.deer-flow/threads/{'{tid}'}/runs/{'{run_id}'}.jsonl</code>；seq 进程本地</td><td>轻量单节点</td></tr>
            <tr><td><code>DbRunEventStore</code></td><td>SQLAlchemy 写 <code>run_events</code> 表；trace 截断；行锁/advisory lock 保 seq</td><td>多进程/生产</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        JSONL 后端的 seq 计数器是<strong>进程本地</strong>的，文档串警告：多进程共享同目录会产生重复/非单调 seq，需改用
        <code>DbRunEventStore</code>。DB 后端为保证 seq 单调，非 postgres 用 <code>SELECT max(seq) ... FOR UPDATE</code>，
        postgres 因聚合不可锁改用 <code>pg_advisory_xact_lock</code>。
      </p>

      <h2>四、RunJournal：把 LangChain 回调变成事件</h2>
      <p>
        agent 执行时产生的「调了哪个模型、用了多少 token、调了什么工具」从哪来？是 <code>runtime/journal.py</code> 的
        <code>RunJournal</code>——一个横在 LangChain 回调机制与 <code>RunEventStore</code> 之间的 <code>BaseCallbackHandler</code>：
      </p>
      <CodeBlock lang="python" title="runtime/journal.py — RunJournal（要点）" code={journal} />
      <ul>
        <li><strong>只在 <code>on_llm_end</code> 捕获完整消息</strong>，不实现 <code>on_llm_new_token</code>（token 流式由 StreamBridge 负责，Journal 管账）。</li>
        <li><strong>调用者归类</strong>：从 tags 识别 <code>subagent:{'{name}'}</code> / <code>middleware:{'{name}'}</code>，默认 <code>lead_agent</code>，
          token 据此分桶；这正是卷 3-2 里子 agent token 能并回父账的对接点。</li>
        <li><strong>去重 + 写缓冲</strong>：<code>_counted_llm_run_ids</code> 防重复计 token；事件先入 <code>_buffer</code>，达
          <code>flush_threshold</code>（默认 20）批量 <code>put_batch</code>（同步回调里只能 <code>create_task</code> 异步刷，无 loop 时留待 worker 的
          <code>finally</code> 收尾）。</li>
        <li><strong>进度快照</strong>：按 <code>progress_flush_interval</code>（5s）节流调 <code>run_manager.update_run_progress</code>，让活跃 run 的
          token/消息进度可见。</li>
      </ul>

      <Example title="一帧事件的旅程">
        模型答完一句 → LangChain 触发 <code>on_llm_end</code> → <code>RunJournal</code> emit 一条 <code>llm.ai.response</code> 进事件存储、
        累计 token；与此并行，<code>run_agent</code> 把这段输出经 <code>bridge.publish</code> 推进 StreamBridge → <code>sse_consumer</code>
        吐成 SSE → 前端逐字渲染。<strong>「给人看的流」走 StreamBridge，「给账本看的轨迹」走 RunJournal+EventStore</strong>，两条线各司其职。
      </Example>

      <Summary
        points={[
          'StreamBridge 解耦生产者/消费者：StreamEvent(id/event/data) + 心跳/结束哨兵；内存实现用 per-run 有界事件日志，靠 Last-Event-ID 实现断线重放。',
          'make_stream_bridge 是 async context manager；redis 后端 v2.1.0 未实现（Phase 2），当前是单进程内存总线。',
          '事件存储用同一接口承载 message 与 trace（按 category 区分）；后端 memory/jsonl/db，jsonl 的 seq 仅进程内单调，多进程须用 db（行锁/advisory lock 保 seq）。',
          'RunJournal 把 LangChain 回调转成事件并管 token 账：只在 on_llm_end 捕获、按 subagent/middleware/lead 分桶、缓冲批量 put_batch、5s 节流上报进度。',
        ]}
      />
    </article>
  )
}

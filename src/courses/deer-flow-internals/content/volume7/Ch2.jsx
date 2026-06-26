import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RequestSequence from '@/courses/deer-flow-internals/illustrations/RequestSequence.jsx'

const useStream = `const thread = useStream<AgentThreadState>({
  client: getAPIClient(isMock),
  assistantId: "lead_agent",
  threadId: onStreamThreadId,
  reconnectOnMount: true,
  onCreated(meta) { handleStreamStart(meta.thread_id, meta.run_id); },       // 拿 run_id/thread_id
  onLangChainEvent(event) { if (event.event === "on_tool_end") ... },        // 工具结束
  onUpdateEvent(data) { /* 标题更新、summarization 消息迁移到 history */ },
  onCustomEvent(event) { if (event.type === "task_running") updateSubtask(...) },  // 子任务
  onFinish(state) { invalidateQueries(["threads", "tokenUsage"]); },          // 收尾刷缓存
});`

const submit = `await thread.submit(
  { messages: [{ type: "human", content: [{ type: "text", text }],
      additional_kwargs: filesForSubmit.length ? { files: filesForSubmit } : {} }] },
  { threadId, streamSubgraphs: true, streamResumable: true,
    config: { recursion_limit: 1000 },
    context: { thinking_enabled: mode !== "flash",
               is_plan_mode: mode === "pro" || mode === "ultra",
               subagent_enabled: mode === "ultra",
               reasoning_effort: ..., thread_id: threadId } },
);`

export default function Ch2() {
  return (
    <article>
      <Lead>
        现在把前后端两端的知识合龙，走一遍<strong>一次对话从点击到逐字渲染的全链路</strong>。这是检验你是否真懂这套系统的试金石：
        消息怎么发、SSE 怎么回、流式事件怎么变成屏幕上的气泡、推理链、子任务卡片和产物。我们以「新会话首次发言」为例，从前端
        <code>useStream</code> 一路追到网关、worker、StreamBridge，再回到前端渲染。
      </Lead>

      <h2>一、订阅流：useStream 的回调即事件路由</h2>
      <p>
        <code>core/threads/hooks.ts</code> 的 <code>useThreadStream</code> 封装了 <code>useStream</code>。它的回调就是「SSE 事件 → 前端动作」的路由表：
      </p>
      <CodeBlock lang="ts" title="core/threads/hooks.ts — useStream 订阅" code={useStream} />
      <ul>
        <li><code>onCreated</code>：拿到 <code>{'{thread_id, run_id}'}</code>（对应卷 1-2 worker 发的第一帧 <code>metadata</code>）。</li>
        <li><code>onUpdateEvent</code>：标题更新、summarization 消息迁移。</li>
        <li><code>onCustomEvent</code>：<code>task_running</code>（卷 3-2 task_tool 轮询时 <code>writer</code> 发的）更新子任务卡片；<code>llm_retry</code> 弹 toast。</li>
        <li><code>onLangChainEvent</code>：<code>on_tool_end</code> 等细粒度事件。</li>
        <li><code>onFinish</code>：流结束，<code>invalidateQueries</code> 刷会话列表与 token usage。</li>
      </ul>

      <h2>二、发送：thread.submit 与 mode 映射</h2>
      <CodeBlock lang="ts" title="sendMessage → thread.submit" code={submit} />
      <p>三个细节值得记住：</p>
      <ul>
        <li><strong>乐观渲染</strong>：提交前先 <code>setOptimisticMessages([human])</code> 让用户立刻看到自己的消息，待服务端 human 消息到达再清。</li>
        <li><strong>附件先走 REST</strong>：有文件时先 <code>uploadFiles(threadId, files)</code>，再把元数据放进 <code>additional_kwargs.files</code>。</li>
        <li><strong>mode 映射</strong>：<code>context</code> 里把 UI 的 mode 翻译成 <code>thinking_enabled</code> / <code>is_plan_mode</code> /
          <code>subagent_enabled</code> / <code>reasoning_effort</code>——直达卷 2-1 的 <code>make_lead_agent</code>。
          <code>streamSubgraphs:true</code> 让 subagent 子图也流式，<code>streamResumable:true</code> 支持断线续流。</li>
      </ul>

      <h2>三、端到端时序（合龙）</h2>
      <RequestSequence />
      <KeyIdea title="把六层串成一条因果链">
        点击（UI）→ <code>submit</code>（SDK）→ Next rewrites 反代 → <code>start_run</code> 校验并 <code>create_task(run_agent)</code>（网关）→
        <code>run_agent</code> 先 publish <code>metadata</code> 再把 <code>agent.astream</code> 事件逐条 publish（worker）→ StreamBridge 缓冲+心跳+赋 id →
        <code>sse_consumer</code> 逐帧 <code>format_sse</code> → useStream 解析、增量更新 messages → <code>getMessageGroups</code> 分组 →
        <code>Streamdown</code> 边流边渲染。<strong>这条链就是整门课的主干，前面六卷都是在放大它的某一段。</strong>
      </KeyIdea>

      <h2>四、渲染：流式事件怎么变成屏幕内容</h2>
      <p>
        <code>core/messages/utils.ts</code> 的 <code>getMessageGroups</code> 把扁平的 <code>Message[]</code> 分成有语义的组：
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>组类型</th><th>渲染</th></tr></thead>
          <tbody>
            <tr><td><code>human</code> / <code>assistant</code></td><td>用户 / 助手气泡</td></tr>
            <tr><td><code>assistant:processing</code></td><td>推理 + tool_calls 折叠成思维链（ChainOfThought）</td></tr>
            <tr><td><code>assistant:present-files</code></td><td><code>present_files</code> 工具 → 右侧产物列表</td></tr>
            <tr><td><code>assistant:clarification</code></td><td><code>ask_clarification</code> 工具 → 澄清气泡</td></tr>
            <tr><td><code>assistant:subagent</code></td><td><code>task</code> 工具 → 子任务卡片（SubtaskCard）</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        正文经 <code>MarkdownContent → Streamdown</code> 边流边渲染，并用 <code>preprocessStreamdownMarkdown</code> 防止深层嵌套导致
        marked 栈溢出（套了错误边界 <code>StreamdownFallbackBoundary</code> 降级为纯文本）。后端中间件注入的
        <code>&lt;uploaded_files&gt;</code> / <code>&lt;system-reminder&gt;</code> / <code>&lt;memory&gt;</code> 等标签由
        <code>stripInternalMarkers</code> 等剥掉，不展示给用户。推理内容（<code>reasoning_content</code> / Anthropic 风格 thinking /
        内联 <code>&lt;think&gt;</code>）单独抽出进折叠思维链。
      </p>

      <h2>五、续流、停止与历史</h2>
      <ul>
        <li><strong>停止</strong>：用户点停 → <code>thread.stop()</code>（SDK 取消当前 run，对应卷 5-2 的 <code>RunManager.cancel</code>）。</li>
        <li><strong>续流</strong>：<code>reconnectOnMount + streamResumable</code> 让刷新后 <code>joinStream</code> 续接（对应卷 5-1 的 Last-Event-ID 重放）；
          遇 <code>409 not active on this worker</code> 由 <code>isInactiveRunStreamError</code> 静默清理。</li>
        <li><strong>历史</strong>：非流式，走普通 fetch（<code>core/api/fetcher.ts</code>）逐 run 拉
          <code>/api/threads/{'{tid}'}/runs/{'{run_id}'}/messages</code>，<code>mergeMessages</code> 合并历史/实时/乐观三路并按 identity 去重。</li>
      </ul>

      <Example title="一个端到端的自检清单">
        想确认自己真懂了，问自己：第一帧 <code>metadata</code> 从哪来（worker）？心跳为什么是 <code>: heartbeat</code> 注释行（StreamBridge→sse_consumer）？
        子任务卡片靠什么事件更新（<code>task_running</code> custom event）？刷新页面为什么能接着看（Last-Event-ID + joinStream）？
        断开为什么 run 会被取消（<code>on_disconnect=cancel</code>）？这五问答得上，这门课的主干就通了。
      </Example>

      <Summary
        points={[
          'useStream 的回调是「SSE 事件→前端动作」的路由：onCreated(metadata)/onUpdateEvent/onCustomEvent(task_running)/onLangChainEvent/onFinish。',
          'thread.submit 先乐观渲染、附件先走 REST，再把 mode 映射成 thinking/plan/subagent/reasoning_effort 直达 make_lead_agent；streamSubgraphs/streamResumable 开启子图流式与续流。',
          '端到端链：UI→SDK→Next 反代→start_run→run_agent(publish)→StreamBridge→sse_consumer→useStream→getMessageGroups→Streamdown，这是全课主干。',
          'getMessageGroups 把消息分成 human/assistant/processing/present-files/clarification/subagent 组；Streamdown 边流边渲染并剥离内部标签；停止用 thread.stop、续流用 joinStream+Last-Event-ID、历史走 REST 合并去重。',
        ]}
      />
    </article>
  )
}

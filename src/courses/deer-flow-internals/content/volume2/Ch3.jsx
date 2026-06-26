import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const threadState = `class ThreadState(AgentState):                     # 继承 LangChain AgentState（带 messages 等）
    sandbox: SandboxStateField                      # Annotated[..., merge_sandbox]
    thread_data: NotRequired[ThreadDataState | None]
    title: NotRequired[str | None]
    artifacts: Annotated[list[str], merge_artifacts]
    todos: Annotated[list | None, merge_todos]
    uploaded_files: NotRequired[list[dict] | None]
    viewed_images: Annotated[dict[str, ViewedImageData], merge_viewed_images]
    promoted: Annotated[PromotedTools | None, merge_promoted]

class SandboxState(TypedDict):
    sandbox_id: NotRequired[str | None]`

const mergeSandbox = `def merge_sandbox(existing, new):
    existing_id = existing.get("sandbox_id"); new_id = new.get("sandbox_id")
    if existing_id == new_id:
        return existing
    raise ValueError(f"Conflicting sandbox state updates: {existing_id!r} != {new_id!r}")`

const memoryFlow = `# 1) 入队：MemoryMiddleware.after_agent（每轮 agent 完成）
messages = filter_messages_for_memory(...)          # 只留 user 输入 + 最终 ai 回复
get_memory_queue().add(thread_id, messages, agent_name, user_id,
                       correction_detected, reinforcement_detected)  # user_id 入队时捕获
# 2) 摘要旁路：DeerFlowSummarizationMiddleware 丢消息前
memory_flush_hook(event)  # 把「将被摘要掉」的消息 add_nowait 进同一队列
# 3) LLM 更新：去抖动后
update_memory_from_conversation(...)  # 在专用线程池跑 model.invoke()，避免跨 loop 复用连接池
# 4) 注入：DynamicContextMiddleware 每会话把 <memory>…</memory> 注入 system-reminder`

export default function Ch3() {
  return (
    <article>
      <Lead>
        LangGraph 的图在一个共享的、带类型的 <code>State</code> 上跑。deer-flow 把这个 State 定义成
        <code>ThreadState</code>，并给每个字段配了一个 <strong>reducer</strong>——它决定「多个中间件同一步写同一个字段时怎么合并」。
        这里藏着一个很硬核的安全设计：两个不同的 <code>sandbox_id</code> 想写进同一个 thread，直接 <code>raise</code> 让整个 run 失败。
        本章先讲 ThreadState 与 reducer，再讲与之配合的记忆子系统——一个「永不阻塞请求路径」的异步写回机制。
      </Lead>

      <h2>一、ThreadState：状态字段与 reducer</h2>
      <p>
        定义在 <code>deerflow/agents/thread_state.py</code>，继承 LangChain 的 <code>AgentState</code>（已带 <code>messages</code>），
        再追加一批业务字段：
      </p>
      <CodeBlock lang="python" title="agents/thread_state.py — ThreadState" code={threadState} />
      <p>每个字段的 reducer 体现了不同的合并语义：</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>字段</th><th>reducer</th><th>语义</th></tr></thead>
          <tbody>
            <tr><td><code>sandbox</code></td><td><code>merge_sandbox</code></td><td><strong>幂等写</strong>：同 id 保留；不同 id 直接 <code>raise</code>（见下）</td></tr>
            <tr><td><code>artifacts</code></td><td><code>merge_artifacts</code></td><td>合并 + 按序去重（<code>dict.fromkeys</code>）</td></tr>
            <tr><td><code>todos</code></td><td><code>merge_todos</code></td><td>last-non-None：new 为 None 保留旧；否则覆盖（含空 list 也算显式更新）</td></tr>
            <tr><td><code>viewed_images</code></td><td><code>merge_viewed_images</code></td><td>合并字典；空 <code>{'{}'}</code> 表示「清空」</td></tr>
            <tr><td><code>promoted</code></td><td><code>merge_promoted</code></td><td>按 <code>catalog_hash</code> 作用域：hash 变则整体替换，同 hash 则 union 去重（卷 3）</td></tr>
            <tr><td><code>thread_data</code> / <code>title</code> / <code>uploaded_files</code></td><td>无</td><td>默认 last-write</td></tr>
          </tbody>
        </table>
      </div>

      <h2>二、最硬核的一行：sandbox 身份冲突 fail-closed</h2>
      <CodeBlock lang="python" title="thread_state.py — merge_sandbox" code={mergeSandbox} />
      <KeyIdea title="为什么宁可崩也不二选一">
        同一个 thread 在同一步出现两个不同的 <code>sandbox_id</code>，意味着沙箱生命周期或隔离出了 bug——可能两个工具调用各自起了
        一个沙箱，后续文件读写就会落到错误的隔离环境里。deer-flow 选择 <strong>fail closed</strong>：直接抛错让 run 失败，
        而不是静默挑一个继续跑。在涉及隔离与数据安全的地方，「响亮地失败」远比「悄悄地错」更安全。
      </KeyIdea>
      <p>
        反过来看 <code>artifacts</code> / <code>viewed_images</code> 用「合并去重」、<code>todos</code> 用「last-write」——
        这些字段并发写不会引发安全问题，所以用宽松策略。<strong>reducer 的选择本身就是一份风险评估表</strong>。
      </p>

      <h2>三、记忆子系统：读写解耦，永不阻塞</h2>
      <p>
        记忆代码在 <code>deerflow/agents/memory/</code>。数据形态是一份 <code>memory.json</code>，含 <code>user</code>
        （workContext / personalContext / topOfMind）、<code>history</code>、<code>facts[]</code> 等结构。存储按
        <strong>(user_id, agent_name) 双维度隔离</strong>（全局记忆 <code>agent_name=None</code>，自定义 agent 有 per-agent 记忆），
        带 mtime 缓存。
      </p>
      <CodeBlock lang="python" title="记忆的四段链路（storage/queue/updater/prompt）" code={memoryFlow} />
      <ol>
        <li>
          <strong>入队</strong>（<code>MemoryMiddleware.after_agent</code>）：每轮 agent 完成后，<code>filter_messages_for_memory</code>
          只留用户输入与最终 AI 回复（丢掉工具调用噪声），检测 correction/reinforcement，再 add 进队列。<code>user_id</code>
          必须<strong>在入队时</strong>捕获——因为后续更新在别的线程触发，ContextVar 不会传播过去。
        </li>
        <li>
          <strong>摘要旁路</strong>（<code>memory_flush_hook</code>）：当 <code>DeerFlowSummarizationMiddleware</code> 即将丢弃一批旧消息时，
          这个钩子先把它们 <code>add_nowait</code> 进同一队列——保证「将被压缩掉的历史」先沉淀进长期记忆，不会凭空消失。
        </li>
        <li>
          <strong>LLM 更新</strong>：去抖动后，<code>update_memory_from_conversation</code> 用一个 memory-update prompt 调 LLM
          把对话归纳进记忆结构。注意它在<strong>专用线程池</strong>里跑 <code>model.invoke()</code>，刻意避开 langchain 异步 httpx
          连接池的跨 event-loop 复用问题。
        </li>
        <li>
          <strong>注入</strong>：读取侧由 <code>DynamicContextMiddleware</code> 每会话把 <code>&lt;memory&gt;…&lt;/memory&gt;</code>
          注入到 system-reminder（而非 system prompt），呼应上一章的 prefix-cache 设计。
        </li>
      </ol>
      <KeyIdea title="一句话记住记忆机制">
        记忆 = 文件存储（按 user×agent 隔离）+ <code>after_agent</code> 入队 + 摘要前 flush 钩子兜底 + LLM 异步去抖动归纳 +
        <code>DynamicContextMiddleware</code> 每会话注入。<strong>读写完全解耦，写回走后台线程，绝不阻塞请求路径。</strong>
      </KeyIdea>

      <Callout variant="note" title="correction / reinforcement 检测">
        入队时会跑 <code>detect_correction</code> 与 <code>detect_reinforcement</code>：识别用户是在「纠正」之前的事实，
        还是在「强化」某个偏好。这两个信号会影响 LLM 更新阶段如何改写记忆（覆盖旧事实 vs 加权保留），让记忆不至于被自相矛盾的内容污染。
      </Callout>

      <Example title="把 ThreadState 和中间件连起来看">
        现在回看上一章的中间件表就更通透了：<code>ThreadDataMiddleware</code> 写 <code>thread_data</code>、<code>SandboxMiddleware</code>
        写 <code>sandbox</code>、<code>TitleMiddleware</code> 写 <code>title</code>、<code>DeferredToolFilterMiddleware</code> 读
        <code>promoted</code>、<code>MemoryMiddleware</code> 触发记忆入队——<strong>中间件之间不直接通信，全靠 ThreadState 这块共享黑板交换数据</strong>，
        而 reducer 就是黑板的并发写规则。
      </Example>

      <Summary
        points={[
          'ThreadState 继承 AgentState 并为每个业务字段配 reducer；reducer 的选择是一份风险评估表（幂等/合并去重/last-write）。',
          'merge_sandbox 对冲突的 sandbox_id 直接 raise（fail-closed），因为沙箱身份错乱会破坏隔离——宁可崩也不静默二选一。',
          '记忆按 (user_id, agent_name) 双维度隔离；after_agent 入队 + 摘要 flush 钩子兜底 + LLM 异步去抖动归纳，写回走专用线程池，不阻塞请求。',
          '记忆读取由 DynamicContextMiddleware 注入 system-reminder（非 system prompt），与 prefix-cache 设计一致；中间件之间靠 ThreadState 这块共享黑板交换数据。',
        ]}
      />
    </article>
  )
}

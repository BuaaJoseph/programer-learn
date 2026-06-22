import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { DiagramFrame, Step, Col } from '@/courses/deer-flow-internals/illustrations/kit.jsx'

const inputCase = `// 前端 thread.submit 发出的输入（Ultra 模式 + 一个上传的 CSV）
{
  messages: [{ type: "human",
    content: [{ type: "text", text: "分析这份销售数据，找出 Q3 下滑的原因，生成一份 Markdown 报告放到 outputs" }],
    additional_kwargs: { files: ["sales_2025.csv"] } }]
},
{
  threadId, streamSubgraphs: true, streamResumable: true,
  context: {
    thinking_enabled: true,      // mode !== "flash"
    is_plan_mode: true,          // mode === "ultra"
    subagent_enabled: true,      // mode === "ultra"   ← 决定 system prompt 含 <subagent_system>
    reasoning_effort: "high",
    thread_id: threadId,
  },
}`

const workerSteps = `# runtime/runs/worker.py :: run_agent —— 后台任务的 8 步（含编号注释）
1. run_manager.set_status(run_id, RunStatus.running)
1.5 checkpointer.aget_tuple(...)            # 抓 pre-run 快照，供 rollback
2. bridge.publish(run_id, "metadata", {run_id, thread_id})   # SSE 第一帧
3. agent = agent_factory(config, app_config)  # = make_lead_agent → apply_prompt_template 组装静态 prompt
   _install_runtime_context(...) + config["callbacks"].append(journal)  # 注入运行时上下文与 RunJournal
4. agent.checkpointer = checkpointer; agent.store = store
5. (interrupt 节点，本例无)
6. lg_modes = ["values", "messages"]          # messages-tuple → messages
7. async for chunk in agent.astream(graph_input, config, stream_mode=lg_modes, subgraphs=True):
       bridge.publish(run_id, _lg_mode_to_sse_event(mode), serialize(chunk))   # 逐帧推 SSE
8. run_manager.set_status(run_id, success|interrupted|error)
finally: journal.flush(); update_run_completion(token 统计); 同步 title; bridge.publish_end; cleanup(delay=60)`

const beforeAgent = `# 进入 LangGraph 图后，before_agent 钩子按装配顺序跑（卷 2-2）：
ThreadDataMiddleware.before_agent   → state["thread_data"] = {workspace, uploads, outputs 路径}
UploadsMiddleware.before_agent      → 注入 HumanMessage：<uploaded_files> sales_2025.csv (+转好的 .md) </uploaded_files>
DynamicContextMiddleware.before_agent → 注入 HumanMessage：<system-reminder><memory>…</memory><current_date>…</current_date></system-reminder>
SkillActivationMiddleware           → 本例无 /skill 前缀 → 跳过
# 此时 state.messages（喂给模型的顺序）≈
#   [System(静态大模板，含 <subagent_system>), Human(<system-reminder>…), Human(<uploaded_files>…), Human(用户任务)]`

const turns = `# 主循环（create_agent 的 ReAct 图）逐轮推进，每轮 = 一次 LLM 调用 + 工具执行
─ Turn 1 ── LLM#1（lead agent）
  before_model: DeerFlowSummarization 检查历史长度 → 短，跳过压缩
  模型输出：思考 + write_todos([读数据, 分析趋势, 定位下滑, 写报告]) + read_file("../uploads/sales_2025.csv")
  after_model: TokenUsage 记账；LoopDetection 计数；TitleMiddleware 异步起一个 LLM 生成标题
  wrap_tool_call（洋葱）:
    SandboxMiddleware 懒初始化 → provider.acquire(thread_id) → sandbox_id="local:<tid>"
       → Command(update={"sandbox": {...}})  写回 ThreadState.sandbox
    write_todos → TodoMiddleware 落 state["todos"]
    read_file → sandbox.read_file，ToolOutputBudget 若超限落盘；ToolErrorHandling 兜异常
  → ToolMessage(数据前几行) 回灌

─ Turn 2 ── LLM#2（lead agent，Ultra → 编排者）
  模型决定并行委派：task(desc="按月聚合算趋势", subagent_type="general-purpose")
                     task(desc="对比品类找下滑源", subagent_type="general-purpose")
  after_model: SubagentLimitMiddleware 把并发 task 截断到 ≤ n（clamp 2–4）
  wrap_tool_call: task_tool →
    get_subagent_config("general-purpose")
    get_available_tools(subagent_enabled=False)   # 子代理无 task，防递归
    SubagentExecutor.execute_async(prompt, task_id=tool_call_id)  # 后台隔离 loop
    后端每 5s 轮询：有新消息就 writer({"type":"task_running",...}) → SSE 自定义事件
    ┌─ 子代理内部（各自独立 astream）───────────────
    │  LLM#3 / LLM#4（subagent）：read_file + bash("python - <<'PY' …计算… PY")
    │  SubagentTokenCollector 收 token；结束取最后 AIMessage 文本
    │  返回 "Task Succeeded. Result: …Q3 华东区环比 -23%…"
    └────────────────────────────────────────────
    ToolErrorHandling 把返回串 → status_contract 盖 additional_kwargs.subagent_status="completed"
    token_collector 把子代理 token 并回父 RunJournal（按 subagent 分桶）

─ Turn 3 ── LLM#3（lead agent，综合）
  模型 write_file("../outputs/report.md", 报告正文)  → 文件锁保护读-改-写
       present_files(["/mnt/user-data/outputs/report.md"])  → state["artifacts"] 追加
  TodoMiddleware：发现仍有未完成 todo？已全标完成 → 放行

─ Turn 4 ── LLM#4（lead agent，收尾）
  模型只输出最终文本，无 tool_use → 主循环 break`

export default function Ch3() {
  return (
    <article>
      <Lead>
        前两章把提示词逐条铺开了，但你可能还是没有「动起来」的画面感。这一章用<strong>一个具体的 case</strong>，把 DeerFlow
        从「用户点发送」到「报告生成、流式吐回」这中间发生的一切——<strong>状态流转、几次 LLM 调用、子代理怎么跑、SSE 推了哪些事件、
        记忆和标题何时更新</strong>——一步步拆给你看。读完这章，前面所有零件会拼成一台转起来的机器。
      </Lead>

      <Callout variant="note" title="本章的 case">
        用户在 <strong>Ultra 模式</strong>下上传了 <code>sales_2025.csv</code>，输入：「分析这份销售数据，找出 Q3 下滑的原因，
        生成一份 Markdown 报告放到 outputs」。这个 case 故意覆盖了：上传注入、计划模式、子代理并行委派、沙箱执行、产物展示、
        标题与记忆更新——几乎把 DeerFlow 的主链路全踩了一遍。
      </Callout>

      <h2>一、入口：前端发出了什么</h2>
      <p>
        前端 <code>thread.submit</code>（卷 7-2）把用户消息和一组 <code>context</code> 开关一起发出。注意 <code>context</code> 里的三个布尔——
        它们直接决定了后端这次 run 的「形态」：
      </p>
      <CodeBlock lang="js" title="前端提交（Ultra 模式）" code={inputCase} />
      <KeyIdea title="一个开关如何改变整次 run">
        <code>subagent_enabled: true</code>（Ultra）会让 <code>make_lead_agent</code> → <code>apply_prompt_template</code> 在 system prompt 里
        拼进整段 <code>&lt;subagent_system&gt;</code>（第二章的编排段），并往中间件栈里加 <code>SubagentLimitMiddleware</code> + 把 <code>task</code> 工具
        塞进工具表。<code>is_plan_mode: true</code> 则加 <code>TodoMiddleware</code>。<strong>用户在 UI 选的模式，就这样变成了提示词与中间件的差异。</strong>
      </KeyIdea>

      <h2>二、网关与 worker：run 的骨架</h2>
      <p>
        网关 <code>start_run</code>（卷 1-2）校验后 <code>asyncio.create_task(run_agent(...))</code> 起后台生产者。<code>run_agent</code>
        （<code>runtime/runs/worker.py</code>）的主体是清清楚楚的 8 步：
      </p>
      <CodeBlock lang="python" title="run_agent 的 8 步骨架" code={workerSteps} />
      <p>
        记住两点：第 2 步的 <code>metadata</code> 是 SSE 的第一帧（前端靠它拿 <code>run_id</code>）；第 7 步才是真正「跑图 + 逐帧推流」，
        所有后续的状态流转都发生在这一个 <code>astream</code> 循环里面。
      </p>

      <h2>三、进图：before_agent 把上下文铺好</h2>
      <p>
        <code>astream</code> 一启动，图先跑 <code>before_agent</code> 钩子。这几个中间件按装配顺序把「喂给模型的第一帧上下文」拼装出来：
      </p>
      <CodeBlock lang="python" title="before_agent 阶段的状态铺设" code={beforeAgent} />
      <Callout variant="tip" title="为什么是「消息」而不是「system prompt」">
        注意上传清单和记忆都是作为 <strong>HumanMessage</strong> 注入的，不进 system prompt——正是第一章讲的「静态 prompt + 动态注入」。
        此刻 <code>ThreadState</code> 已经有了 <code>thread_data</code>，但 <code>sandbox</code> 还是空的（懒初始化，要等第一个沙箱工具被调用）。
      </Callout>

      <h2>四、主循环：四轮、若干次 LLM 调用</h2>
      <p>
        接下来是 ReAct 主循环。每一轮 = 一次 lead agent 的 LLM 调用 + （可能的）工具执行 + 结果回灌。我们这个 case 大致跑四轮：
      </p>
      <CodeBlock lang="text" title="逐轮拆解（含子代理内部）" code={turns} />

      <DiagramFrame
        title="图 · 本 case 的 LLM 调用与归属（RunJournal 分桶）"
        note="一次用户交互背后往往是多次 LLM 调用：lead agent 的若干轮 + 每个子代理各自的若干轮 + 标题 + 后台记忆更新。RunJournal 按调用者把 token 分桶归账（卷 5-1）。"
      >
        <Col gap={7}>
          <Step n={1} actor="lead" tone="green">Turn 1–4：lead agent 主循环的 4 次模型调用（计划、委派、综合、收尾）。token 记到 <code>lead_agent</code> 桶。</Step>
          <Step n={2} actor="subagent" tone="amber">两个 general-purpose 子代理各自的 astream（每个内部 1–3 次模型调用）。token 经 <code>SubagentTokenCollector</code> 记到 <code>subagent</code> 桶并并回父账。</Step>
          <Step n={3} actor="title" tone="purple">TitleMiddleware 在首轮后<strong>异步</strong>起 1 次模型调用生成标题。token 记到 <code>middleware:title</code> 桶。</Step>
          <Step n={4} actor="memory" tone="rose">任务结束后，MemoryMiddleware 入队 → <strong>后台</strong> 1 次模型调用归纳记忆（不阻塞本次回复）。</Step>
        </Col>
      </DiagramFrame>

      <h2>五、状态流转：ThreadState 的字段被谁改写</h2>
      <p>
        整轮交互里，共享黑板 <code>ThreadState</code>（卷 2-3）被一步步填满。下表是它的关键字段在本 case 的变化：
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>字段</th><th>何时被写</th><th>写入者 / reducer</th></tr></thead>
          <tbody>
            <tr><td><code>messages</code></td><td>全程</td><td>每轮 append（user/assistant/tool）</td></tr>
            <tr><td><code>thread_data</code></td><td>before_agent</td><td><code>ThreadDataMiddleware</code></td></tr>
            <tr><td><code>uploaded_files</code></td><td>before_agent</td><td><code>UploadsMiddleware</code></td></tr>
            <tr><td><code>sandbox</code></td><td>Turn 1 首个沙箱工具</td><td><code>SandboxMiddleware</code> 懒初始化 → <code>merge_sandbox</code>（冲突即 fail-closed）</td></tr>
            <tr><td><code>todos</code></td><td>Turn 1 write_todos</td><td><code>TodoMiddleware</code> → <code>merge_todos</code></td></tr>
            <tr><td><code>title</code></td><td>Turn 1 后（异步）</td><td><code>TitleMiddleware</code></td></tr>
            <tr><td><code>artifacts</code></td><td>Turn 3 present_files</td><td><code>merge_artifacts</code>（去重）</td></tr>
          </tbody>
        </table>
      </div>

      <h2>六、SSE 事件时间线：浏览器收到了什么</h2>
      <p>生产者每 <code>bridge.publish</code> 一次，消费者 <code>sse_consumer</code> 就吐一帧（卷 1-2）。本 case 的事件流大致是：</p>
      <CodeBlock
        lang="text"
        title="SSE 事件时间线（前端 useStream 消费）"
        code={`event: metadata   { run_id, thread_id }          ← 第一帧（onCreated）
event: values     { messages:[…思考/write_todos…] } ← Turn 1 增量
event: messages   …read_file 的 tool 调用/结果…
event: values     { title: "Q3 销售下滑分析" }       ← TitleMiddleware 异步写入（onUpdateEvent）
event: messages   …task 调用…
: (自定义) task_running  { task_id, … }              ← 子代理进度（onCustomEvent）
: heartbeat                                           ← 子代理跑得久时保活
event: values     { messages:[…综合…], artifacts:["…/report.md"] }  ← Turn 3
event: values     { messages:[…最终回复…] }           ← Turn 4
event: end                                            ← publish_end（onFinish）`}
      />
      <Callout variant="note" title="心跳与续流">
        子代理跑分析可能要十几秒，期间没有新数据帧，<code>StreamBridge</code> 会每 15s 吐一个 <code>: heartbeat</code> 保活；
        若此时用户刷新页面，<code>useStream</code> 带 <code>Last-Event-ID</code> 重连，从断点把缓冲事件重放出来（卷 5-1）——所以「刷新还能接着看」。
      </Callout>

      <h2>七、收尾：worker 的 finally 做了三件事</h2>
      <p>主循环 break 后，<code>run_agent</code> 的 <code>finally</code>（第 8 步之后）做收尾：</p>
      <ol>
        <li><strong><code>journal.flush()</code></strong>：把缓冲的事件批量落库，<code>update_run_completion</code> 持久化 token 统计（lead/subagent/title 各桶）。</li>
        <li><strong>同步标题</strong>：从 checkpoint 取 <code>title</code> 写进 <code>threads_meta.display_name</code>，于是会话列表显示「Q3 销售下滑分析」。</li>
        <li><strong><code>bridge.publish_end</code> + <code>cleanup(delay=60)</code></strong>：发结束哨兵，并延迟 60s 释放 run 的事件缓冲（给迟到/重连的订阅者留窗口）。</li>
      </ol>
      <p>
        与此<strong>并行且不阻塞</strong>的还有 <code>MemoryMiddleware.after_agent</code> 触发的记忆更新：它把本轮「用户输入 + 最终回复」入队，
        去抖动后在后台用 <code>MEMORY_UPDATE_PROMPT</code>（第二章）调一次 LLM 归纳进记忆文件——<strong>下次你再来，它就记得你关心 Q3、华东区了</strong>。
      </p>

      <h2>八、一张图收束：一次交互的全景</h2>
      <DiagramFrame title="图 · 一次对话的内部全流程（本 case）">
        <Col gap={6}>
          <Step n={1} actor="前端" tone="blue">submit（context: thinking/plan/subagent）→ 经 Next 反代到网关</Step>
          <Step n={2} actor="网关" tone="base">start_run 校验 → create_task(run_agent) → 返回 SSE 流</Step>
          <Step n={3} actor="worker" tone="purple">set_status(running) → publish metadata → 建 agent（组装静态 prompt + 中间件栈）</Step>
          <Step n={4} actor="before_agent" tone="green">ThreadData / Uploads / DynamicContext 注入上下文（sandbox 仍空）</Step>
          <Step n={5} actor="主循环" tone="amber">Turn1 计划+读数据（沙箱懒初始化）→ Turn2 并行委派子代理 → Turn3 综合+写报告+present_files → Turn4 收尾</Step>
          <Step n={6} actor="子代理" tone="amber">各自独立 astream 跑 read_file + bash(python)，token 回传父账，状态盖戳</Step>
          <Step n={7} actor="收尾" tone="rose">journal.flush + 同步标题 + publish_end；后台异步更新记忆</Step>
        </Col>
      </DiagramFrame>

      <Example title="把这一章当「对照表」用">
        下次你读 DeerFlow 日志或调它的源码时，可以拿这条 case 对照：看到 <code>publish "metadata"</code> 就是第 2 步；看到
        <code>sandbox_id</code> 第一次出现就是 Turn 1 的懒初始化；看到 <code>task_running</code> 自定义事件就是子代理在跑；看到
        <code>threads_meta.display_name</code> 更新就是 finally 在同步标题。<strong>抽象的架构，对上一条具体的轨迹，就真正变成你的了。</strong>
      </Example>

      <Summary
        points={[
          '一次用户交互 = 前端 submit(context 开关) → 网关 start_run/create_task → worker run_agent 的 8 步骨架（metadata 首帧 + astream 逐帧推流 + finally 收尾）。',
          'before_agent 把上传清单、记忆、日期作为 HumanMessage 注入（非 system prompt）；sandbox 字段懒到第一个沙箱工具才写入（merge_sandbox fail-closed）。',
          '主循环本 case 跑四轮 lead LLM 调用（计划→并行委派→综合→收尾）；Ultra 触发子代理并行，子代理各自 astream、token 回传父账、status_contract 盖戳。',
          'SSE 事件流：metadata→values/messages 增量→title 更新→task_running 自定义→heartbeat→artifacts→end；收尾 flush 账本、同步标题、publish_end，并在后台异步更新记忆。',
        ]}
      />
    </article>
  )
}

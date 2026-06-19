import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CallChain from '@/courses/deer-flow-internals/illustrations/CallChain.jsx'

const config = `@dataclass
class SubagentConfig:
    name: str
    description: str
    system_prompt: str | None = None
    tools: list[str] | None = None                      # None=继承父全部工具；列表=allowlist
    disallowed_tools: list[str] | None = field(default_factory=lambda: ["task"])  # 默认禁 task
    skills: list[str] | None = None
    model: str = "inherit"                               # inherit=用父模型
    max_turns: int = 50
    timeout_seconds: int = 900`

const taskTool = `@tool("task", parse_docstring=True)
async def task_tool(runtime, description, prompt, subagent_type,
                    tool_call_id: Annotated[str, InjectedToolCallId]) -> str:
    """Delegate a task to a specialized subagent that runs in its own context."""
    config = get_subagent_config(subagent_type)          # 未知类型 → "Error: Unknown subagent type ..."
    # 关键防递归：子 agent 装配时 subagent_enabled=False → 它没有 task 工具
    tools = get_available_tools(model_name=effective_model,
                                groups=parent_tool_groups, subagent_enabled=False)
    executor = SubagentExecutor(config, tools, sandbox_state=..., thread_data=..., parent_model=...)
    # 以 tool_call_id 作 task_id 后台启动
    executor.execute_async(prompt, task_id=tool_call_id)
    # 后端自行轮询（每 5s），有新消息就 writer({"type": "task_running", ...}) 发 SSE
    ...
    if result.status == SubagentStatus.COMPLETED:
        return f"Task Succeeded. Result: {result.result}"`

const stamp = `# tool_error_handling_middleware.py（唯一盖章点，只对 task 工具生效）
if tool_name != _TASK_TOOL_NAME: return message
status = extract_subagent_status(content)               # "completed"/"failed"/... 或 None
if status is None: return message                        # 流式中间态保持「进行中」
stamp = make_subagent_additional_kwargs(status, error=error)
message.additional_kwargs = {**message.additional_kwargs, **stamp}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        当一个任务复杂到需要「开个独立上下文专门干一件事」时，lead agent 会调用 <code>task</code> 工具把它委派给一个
        <strong>subagent</strong>——一个有自己工具集、自己 system prompt、独立运行的子 agent。这一章拆解 subagent 的定义、执行、
        以及父子之间如何回传进度与 token，并把「agent → tool → subagent」这条调用链端到端走一遍。重点关注一个反复出现的主题：
        <strong>怎么防止子代理无限递归地再开子代理</strong>。
      </Lead>

      <h2>一、subagent 怎么定义</h2>
      <p>
        配置数据类在 <code>deerflow/subagents/config.py</code>：
      </p>
      <CodeBlock lang="python" title="subagents/config.py — SubagentConfig" code={config} />
      <KeyIdea title="默认就禁 task：配置层防递归（第一道）">
        注意 <code>disallowed_tools</code> 默认值就是 <code>["task"]</code>——<strong>任何 subagent 默认不能再调 <code>task</code></strong>。
        加上 <code>tools=None</code> 表示继承父工具、<code>model="inherit"</code> 表示用父模型，这些默认值把「子代理是父代理的受限副本」
        这一意图编码进了类型本身。
      </KeyIdea>
      <p>
        内置两个 subagent（<code>subagents/builtins/</code>）：
      </p>
      <ul>
        <li><strong><code>general-purpose</code></strong>：<code>tools=None</code>（继承全部），禁 <code>task/ask_clarification/present_files</code>，
          <code>max_turns=150</code>。prompt 含文件编辑工作流与工作目录约定，并强调「不要反问澄清」。</li>
        <li><strong><code>bash</code></strong>：显式 allowlist <code>["bash","ls","read_file","write_file","str_replace"]</code>，
          <code>max_turns=60</code>。当 host bash 不被允许时，它会从可用列表里隐藏。</li>
      </ul>
      <p>
        注册解析在 <code>registry.py</code>：内置优先 → 回退 <code>config.yaml</code> 的 <code>custom_agents</code> →
        叠加 <code>agents</code> 的 per-agent 覆盖（用 <code>dataclasses.replace</code>），全局默认只对内置生效。
      </p>

      <h2>二、task 工具：委派的入口</h2>
      <CodeBlock lang="python" title="tools/builtins/task_tool.py（精简）" code={taskTool} />
      <p>关键步骤：</p>
      <ol>
        <li><code>get_subagent_config(subagent_type)</code> 取配置，未知类型返回错误串（列出可用类型）。</li>
        <li>从 runtime 提取父上下文：<code>sandbox_state</code> / <code>thread_data</code> / <code>thread_id</code> /
          <code>parent_model</code> / <code>trace_id</code> / <code>user_id</code> / 父技能集 / 父 tool_groups。</li>
        <li><strong>第二道防递归</strong>：装配子工具时 <code>subagent_enabled=False</code>，所以子工具集里压根没有 <code>task</code>。</li>
        <li>建 <code>SubagentExecutor</code>，<strong>以 <code>tool_call_id</code> 作 <code>task_id</code></strong> 后台启动
          <code>execute_async</code>。</li>
        <li>后端自己每 5s 轮询：发现子 agent 产出新消息就 <code>writer({'{'}"type":"task_running"{'}'})</code> 推 SSE，让前端实时显示子任务进度。</li>
        <li>终态返回固定前缀的字符串（<code>"Task Succeeded. Result: ..."</code> / <code>"Task failed. ..."</code> 等）。</li>
      </ol>

      <h2>三、SubagentExecutor：在隔离环境里跑子 agent</h2>
      <p>
        执行器在 <code>subagents/executor.py</code>。它做三件值得注意的事：
      </p>
      <ul>
        <li>
          <strong>工具过滤</strong>（<code>_filter_tools</code>）：先 allowlist 再 denylist——这是<strong>第三道防递归</strong>，
          即便前面漏了，<code>disallowed_tools=["task"]</code> 在这里也会再剔一遍。
        </li>
        <li>
          <strong>建子图</strong>（<code>_create_agent</code>）：复用与 lead agent 同一套 <code>build_subagent_runtime_middlewares</code>，
          但 <code>create_agent(..., checkpointer=False)</code>（子 agent 不需要独立 checkpoint），且 <code>system_prompt=None</code>——
          prompt 改成初始 state 里的一条 <code>SystemMessage</code>（因为有些 LLM API 不允许多条 SystemMessage）。
        </li>
        <li>
          <strong>异步流式执行</strong>（<code>_aexecute</code>）：<code>agent.astream(state, stream_mode="values")</code> 逐 chunk
          抓新 <code>AIMessage</code>（按 id 去重）append 进 <code>result.ai_messages</code>——这就是父侧能实时拿到子 agent 中间消息的来源。
          每个迭代边界检查 <code>cancel_event</code> 实现<strong>协作式取消</strong>。
        </li>
      </ul>
      <Callout variant="note" title="终态只设一次：try_set_terminal">
        子 agent 有后台超时线程和主 worker 两路可能同时想设终态。<code>SubagentResult.try_set_terminal</code> 在锁内保证
        <strong>首个终态胜出、后续忽略</strong>（<code>COMPLETED/FAILED/CANCELLED/TIMED_OUT</code>），解决竞态。调度上：
        <code>execute_async</code> 把任务登记进全局 <code>_background_tasks</code>、提交到 <code>ThreadPoolExecutor(max_workers=3)</code>，
        在隔离的 daemon event loop 里跑，避免与共享 httpx 连接池抢同一个 loop。
      </Callout>

      <h2>四、回传：token 与状态契约</h2>
      <p>两样东西要从子 agent 回流到父 agent：</p>
      <ul>
        <li>
          <strong>token</strong>：<code>token_collector.py</code> 的 <code>SubagentTokenCollector</code>（一个 <code>BaseCallbackHandler</code>）
          在 <code>on_llm_end</code> 按真实 <code>model_name</code> 分桶累计 token，再由 task_tool 调父 callback 的
          <code>record_external_llm_usage_records()</code> 并入父 RunJournal（每任务一次，有 <code>usage_reported</code> 守卫防重复）。
        </li>
        <li>
          <strong>状态</strong>：早期前端靠字符串前缀猜子任务卡片状态，很脆。新协议（<code>status_contract.py</code>）把结构化状态塞进
          <code>ToolMessage.additional_kwargs</code> 的 <code>subagent_status</code>。唯一盖章点在
          <code>ToolErrorHandlingMiddleware</code>，且只对 <code>task</code> 工具生效：
        </li>
      </ul>
      <CodeBlock lang="python" title="状态盖章（status_contract + middleware）" code={stamp} />

      <h2>五、端到端调用链</h2>
      <p>把上面的一切连起来，就是 lead 委派 <code>general-purpose</code> 的完整链路（右列）；左列对照一次普通工具→沙箱调用：</p>
      <CallChain />
      <p>
        最后强调那三道<strong>冗余</strong>的防递归：① <code>task_tool</code> 用 <code>subagent_enabled=False</code> 装配子工具集 →
        子工具无 <code>task</code>；② <code>SubagentConfig.disallowed_tools</code> 默认含 <code>task</code> 且内置两 agent 显式列出；
        ③ <code>SubagentExecutor._filter_tools</code> 构造时再剔一遍。三层独立、互为兜底。
      </p>
      <Callout variant="note" title="待确认">
        前后端共享的 <code>contracts/subagent_status_contract.json</code> 具体字段、以及 <code>setup_agent_tool</code> /
        <code>invoke_acp_agent_tool</code> 的暴露条件，本课程未逐字打开，标记待确认；需读对应文件确认。
      </Callout>

      <Example title="为什么用 tool_call_id 当 task_id">
        因为一次 <code>task</code> 调用天然有唯一的 <code>tool_call_id</code>，用它当后台任务 id，既保证唯一，又让「轮询拿结果」「取消」
        「清理」都能用同一个键索引 <code>_background_tasks</code>，还能让状态盖章精确对应到那条 ToolMessage。一个小设计，省掉一层 id 映射。
      </Example>

      <Summary
        points={[
          'subagent 由 SubagentConfig 定义：tools=None 继承父、disallowed_tools 默认禁 task、model=inherit；内置 general-purpose 与 bash 两个。',
          'task 工具委派：取配置→提父上下文→以 subagent_enabled=False 装配子工具（防递归）→SubagentExecutor.execute_async（task_id=tool_call_id）→每5s轮询发 task_running SSE。',
          'SubagentExecutor 复用同套中间件但 checkpointer=False、prompt 作初始 SystemMessage、隔离 loop 跑、try_set_terminal 保终态唯一、协作式取消。',
          'token 经 SubagentTokenCollector 按模型分桶回并父 RunJournal；状态经 status_contract 由 ToolErrorHandlingMiddleware 盖进 additional_kwargs；三道冗余机制防止子代理递归再委派。',
        ]}
      />
    </article>
  )
}

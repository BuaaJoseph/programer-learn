import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MiddlewareStack from '@/courses/deer-flow-internals/illustrations/MiddlewareStack.jsx'

const base = `# tool_error_handling_middleware.py::_build_runtime_middlewares（基座，include_uploads=True）
middlewares = [
    ToolOutputBudgetMiddleware.from_app_config(app_config),
    ThreadDataMiddleware(lazy_init=lazy_init),
    SandboxMiddleware(lazy_init=lazy_init),
]
# index 2 处 insert UploadsMiddleware() → 落在 Sandbox 之前
middlewares.append(DanglingToolCallMiddleware())       # include_dangling_tool_call_patch
middlewares.append(LLMErrorHandlingMiddleware(app_config=app_config))
# (guardrails 若启用) append GuardrailMiddleware(...)
middlewares.append(SandboxAuditMiddleware())
middlewares.append(ToolErrorHandlingMiddleware())`

const build = `# build_middlewares() 在基座之上按此顺序 append（均条件触发）：
DynamicContextMiddleware(agent_name, app_config)            # 总是
SkillActivationMiddleware(available_skills, app_config)     # 总是
DeerFlowSummarizationMiddleware(...)                        # summarization.enabled
TodoMiddleware(...)                                         # is_plan_mode
TokenUsageMiddleware()                                      # token_usage.enabled
TitleMiddleware(app_config)                                 # 总是
MemoryMiddleware(agent_name, memory_config)                # 总是（内部按 enabled 短路）
ViewImageMiddleware()                                       # model_config.supports_vision
DeferredToolFilterMiddleware(names, hash)                   # deferred_setup 有 deferred_names
SubagentLimitMiddleware(max_concurrent)                    # subagent_enabled
LoopDetectionMiddleware.from_config(...)                    # loop_detection.enabled
*custom_middlewares
SafetyFinishReasonMiddleware.from_config(...)               # safety_finish_reason.enabled
ClarificationMiddleware()                                   # 总是最后`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这是全课程信息密度最高的一章。deer-flow 的「聪明」几乎全部装在二十多个 <code>AgentMiddleware</code> 里：
        谁来压缩历史、谁注入记忆、谁检测死循环、谁审计 bash、谁生成标题、谁拦截澄清……每一个都是单文件、可独立测试的关注点。
        我们先讲清「钩子」与「装配顺序」这两条主线，再用一张大表把每个中间件的职责钉死。
      </Lead>

      <h2>一、先理解钩子：中间件能在哪些时机插手</h2>
      <p>
        LangChain 的 <code>AgentMiddleware</code> 暴露若干钩子，对应状态图里的不同时机：
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>钩子</th><th>时机</th><th>典型用途</th></tr></thead>
          <tbody>
            <tr><td><code>before_agent</code> / <code>after_agent</code></td><td>整张图执行前 / 后</td><td>准备线程数据、入队记忆更新</td></tr>
            <tr><td><code>before_model</code> / <code>after_model</code></td><td>每次模型调用前 / 后</td><td>压缩历史、记 token、生成标题、剥离危险 tool_calls</td></tr>
            <tr><td><code>wrap_model_call</code></td><td>包裹一次模型调用</td><td>重试退避、注入技能、过滤延迟工具</td></tr>
            <tr><td><code>wrap_tool_call</code></td><td>包裹一次工具执行</td><td>工具异常转 ToolMessage、预算截断、安全审计、拦截澄清</td></tr>
          </tbody>
        </table>
      </div>
      <KeyIdea title="顺序的两个方向">
        <code>before_*</code> 钩子按<strong>装配顺序</strong>执行；<code>after_*</code> 钩子<strong>逆序</strong>分发（洋葱模型）。
        这解释了一个看似奇怪的安排：<code>SafetyFinishReasonMiddleware</code> 故意排在 custom middlewares 之后，
        使它的 <code>after_model</code> <strong>先</strong>跑——先剥掉被安全终止留下的半截 tool_calls，清理后的 tool_calls
        再流经 Loop/Subagent 计数，避免误报。顺序在这里是语义，不是摆设。
      </KeyIdea>

      <h2>二、生产装配顺序：基座 + 追加两段</h2>
      <p>
        生产路径（<code>make_lead_agent</code>）的中间件由两段拼成。第一段是<strong>基座</strong>，藏在
        <code>tool_error_handling_middleware.py::_build_runtime_middlewares</code> 里：
      </p>
      <CodeBlock lang="python" title="基座（_build_runtime_middlewares）" code={base} />
      <p>第二段是 <code>build_middlewares()</code> 在基座之上的条件追加：</p>
      <CodeBlock lang="python" title="build_middlewares 追加段" code={build} />
      <Callout variant="warn" title="别只数题面那「22 个」">
        有几个关键中间件不在显眼处，而是藏在基座里：<code>ToolOutputBudgetMiddleware</code>、<code>SandboxAuditMiddleware</code>、
        <code>ToolErrorHandlingMiddleware</code>、<code>LLMErrorHandlingMiddleware</code>。另外 <code>safety_termination_detectors</code>
        和 <code>tool_call_metadata</code> 严格说<strong>不是中间件</strong>（前者是 Protocol 检测器，后者是辅助函数），数数量时要排除。
      </Callout>

      <h2>三、装配栈全景图</h2>
      <MiddlewareStack />

      <h2>四、逐个拆解：每个中间件在解决什么</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Middleware</th><th>钩子</th><th>作用</th></tr></thead>
          <tbody>
            <tr><td><code>ToolOutputBudgetMiddleware</code></td><td>wrap_tool_call / wrap_model_call</td><td>给每个工具返回值上预算：超大结果落盘并替换成带文件引用的紧凑预览；磁盘不可用则 head+tail 截断，防单个返回撑爆上下文</td></tr>
            <tr><td><code>ThreadDataMiddleware</code></td><td>before_agent</td><td>解析 thread_id，把 workspace/uploads/outputs 路径写入 <code>state["thread_data"]</code>（必须排在 Sandbox 之前）</td></tr>
            <tr><td><code>UploadsMiddleware</code></td><td>before_agent</td><td>把用户上传文件清单（含 PDF/Office 转 Markdown 的 outline）注入为 <code>&lt;uploaded_files&gt;</code> 上下文</td></tr>
            <tr><td><code>SandboxMiddleware</code></td><td>before_agent / wrap_tool_call</td><td>懒初始化沙箱实例，把 <code>sandbox_id</code> 写回 <code>state["sandbox"]</code>（卷 4 详解）</td></tr>
            <tr><td><code>DanglingToolCallMiddleware</code></td><td>wrap_model_call</td><td>历史中有 AIMessage(tool_calls) 却缺对应 ToolMessage（用户中断）时，在正确位置补合成 error ToolMessage，修复消息顺序</td></tr>
            <tr><td><code>LLMErrorHandlingMiddleware</code></td><td>wrap_model_call</td><td>LLM 调用重试/退避（解析 Retry-After），失败给面向用户的兜底回复</td></tr>
            <tr><td><code>SandboxAuditMiddleware</code></td><td>wrap_tool_call</td><td>bash 命令安全审计：解析 shell 命令，拦截/记录危险操作</td></tr>
            <tr><td><code>ToolErrorHandlingMiddleware</code></td><td>wrap_tool_call</td><td>把工具异常转成 ToolMessage（而非中断图）；并对 <code>task</code> 工具结果统一打 <code>subagent_status</code> 戳（卷 3）</td></tr>
            <tr><td><code>DynamicContextMiddleware</code></td><td>before_agent</td><td>把当前日期（及记忆）作为 <code>&lt;system-reminder&gt;</code> 注入首个 HumanMessage，使 system prompt 保持静态以复用 prefix cache</td></tr>
            <tr><td><code>SkillActivationMiddleware</code></td><td>wrap_model_call</td><td>用户以 <code>/skill-name</code> 显式激活技能时，确定性加载整份 SKILL.md，优先于模型侧相关性猜测</td></tr>
            <tr><td><code>DeerFlowSummarizationMiddleware</code></td><td>before_model</td><td>扩展 LangChain SummarizationMiddleware：触发阈值时压缩历史，保留近期 skill 内容，触发 memory_flush 钩子</td></tr>
            <tr><td><code>TodoMiddleware</code></td><td>before/after_model 等</td><td>复杂任务 todo 跟踪；历史被截断时重注入提醒；模型想收尾但仍有未完成 todo 时，注入提醒并跳回 model 节点阻止过早退出</td></tr>
            <tr><td><code>TokenUsageMiddleware</code></td><td>after_model</td><td>记录 token 用量并按 step 归因</td></tr>
            <tr><td><code>TitleMiddleware</code></td><td>after_model</td><td>首轮交互后用 LLM 异步生成会话标题，写入 <code>state["title"]</code></td></tr>
            <tr><td><code>MemoryMiddleware</code></td><td>after_agent</td><td>agent 执行完后把（过滤后的）输入+回复入队 MemoryUpdateQueue，LLM 异步去抖动更新记忆（卷 2-3）</td></tr>
            <tr><td><code>ViewImageMiddleware</code></td><td>before_model</td><td>view_image 工具完成后，把图片细节作为 HumanMessage 注入，供 vision 模型在下次调用前看到</td></tr>
            <tr><td><code>DeferredToolFilterMiddleware</code></td><td>wrap_model_call / wrap_tool_call</td><td>tool_search 开时，把未 promote 的 MCP 工具 schema 从 bind_tools 剔除，并拦截对未 promote 工具的调用（按 catalog_hash 作用域）</td></tr>
            <tr><td><code>SubagentLimitMiddleware</code></td><td>after_model</td><td>把单次响应内并发 <code>task</code> 调用数截断到 max_concurrent（clamp 2–4）</td></tr>
            <tr><td><code>LoopDetectionMiddleware</code></td><td>before_agent / after_model 等</td><td>对 tool_calls 哈希做滑窗检测：达 warn 阈值注入「别重复」提醒；达 hard_limit 直接剥 tool_calls 逼模型出最终文本</td></tr>
            <tr><td><code>SafetyFinishReasonMiddleware</code></td><td>after_model</td><td>provider 因安全原因中途终止却返回半截 tool_calls 时，剥离 tool_calls、追加解释、写诊断到 additional_kwargs</td></tr>
            <tr><td><code>ClarificationMiddleware</code></td><td>wrap_tool_call（恒为链尾）</td><td>拦截 <code>ask_clarification</code> 工具调用，转成面向用户的澄清并以 <code>Command(goto=END)</code> 中断执行等待用户回复</td></tr>
          </tbody>
        </table>
      </div>

      <h2>五、几个值得单独玩味的设计</h2>
      <ul>
        <li>
          <strong>工具异常不中断图</strong>：<code>ToolErrorHandlingMiddleware</code> 把抛出的异常变成一条 ToolMessage 喂回模型，
          让模型「看到错误并自行纠正」，而不是让整个 run 崩掉。这是 agent 鲁棒性的基础。
        </li>
        <li>
          <strong>死循环有两道闸</strong>：<code>LoopDetectionMiddleware</code> 先软提醒（warn 阈值注入提示），不行再硬打断
          （hard_limit 直接剥掉 tool_calls 逼出文本）。比单纯的 max_steps 更聪明。
        </li>
        <li>
          <strong>澄清是「中断」而非「问完继续」</strong>：<code>ClarificationMiddleware</code> 用 <code>Command(goto=END)</code>
          直接结束本次 run、把澄清问题抛给用户；用户回答后是<strong>新一轮</strong> run（靠 checkpointer 续上下文）。
        </li>
      </ul>
      <Callout variant="note" title="待确认">
        <code>SandboxMiddleware</code> 与 <code>GuardrailMiddleware</code> 的具体 hook 实现本课程从装配点与文档串推断
        （沙箱生命周期 / guardrail 拦截）。要精确到行，需读 <code>deerflow/sandbox/middleware.py</code>（卷 4 会读）与
        <code>deerflow/guardrails/middleware.py</code>。
      </Callout>

      <Example title="怎么给 deer-flow 加一个自己的中间件">
        最简路径：写一个继承 <code>AgentMiddleware</code> 的类，实现你需要的钩子，然后把它作为 <code>custom_middlewares</code>
        传进 <code>build_middlewares</code>（它会落在 SafetyFinishReason 之前、Clarification 之后的位置）。若用 SDK 工厂
        <code>create_deerflow_agent</code>，则用 <code>@Next(锚点)</code>/<code>@Prev(锚点)</code> 声明插入位置（下一章详解）。
      </Example>

      <Summary
        points={[
          '中间件通过 before/after_agent、before/after_model、wrap_model_call、wrap_tool_call 钩子插手；before_* 顺序执行、after_* 逆序分发。',
          '生产装配 = 基座（ToolOutputBudget/ThreadData/Uploads/Sandbox/Dangling/LLMError/SandboxAudit/ToolError）+ build_middlewares 条件追加（DynamicContext…Clarification）。',
          'ClarificationMiddleware 恒为链尾；SafetyFinishReason 排在 custom 之后以便先清理半截 tool_calls；ToolErrorHandling 把工具异常转 ToolMessage 不中断图。',
          '加能力的方式通常是写一个新 middleware 插进栈，而不是改主循环——这是 deer-flow 可扩展性的核心。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const layers = `raw primitive            SDK 工厂（无配置）              App 工厂（读配置）
create_agent()  ←──  create_deerflow_agent()   ←──  make_lead_agent(config)
                     features.py 声明式装配           config.yaml / RunnableConfig 驱动`

const sdkFactory = `def create_deerflow_agent(
    model: BaseChatModel,
    tools: list[BaseTool] | None = None,
    *,
    system_prompt: str | None = None,
    middleware: list[AgentMiddleware] | None = None,   # 完全接管：与 features 互斥
    features: RuntimeFeatures | None = None,            # 声明式 feature flags
    extra_middleware: list[AgentMiddleware] | None = None,
    plan_mode: bool = False,
    state_schema: type | None = None,                  # 默认 ThreadState
    checkpointer: BaseCheckpointSaver | None = None,
    name: str = "default",
) -> CompiledStateGraph:
    if middleware is not None and features is not None:
        raise ValueError("Cannot specify both 'middleware' and 'features'.")
    ...
    return create_agent(model=model, tools=effective_tools or None,
                        middleware=effective_middleware, system_prompt=system_prompt,
                        state_schema=effective_state, checkpointer=checkpointer, name=name)`

const appFactory = `def make_lead_agent(config: RunnableConfig):
    """LangGraph graph factory; keep the signature compatible with LangGraph Server."""
    runtime_config = _get_runtime_config(config)
    runtime_app_config = runtime_config.get("app_config")
    return _make_lead_agent(config, app_config=runtime_app_config or get_app_config())

# _make_lead_agent 普通路径核心：
return create_agent(
    model=create_chat_model(name=model_name, thinking_enabled=thinking_enabled,
                            reasoning_effort=reasoning_effort, app_config=resolved_app_config,
                            attach_tracing=False),               # ← 图内模型一律不挂 tracing
    tools=final_tools,
    middleware=build_middlewares(config, model_name=model_name, agent_name=agent_name,
                                 available_skills=available_skills, app_config=resolved_app_config,
                                 deferred_setup=setup),
    system_prompt=apply_prompt_template(...),
    state_schema=ThreadState,
)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        deer-flow「造一个 agent」不是 new 一个类，而是<strong>两层工厂夹着一个原始底座</strong>：底座是 LangChain 的
        <code>langchain.agents.create_agent</code>（编译成一张 LangGraph 状态图）；外面一层是 config-free 的 SDK 工厂
        <code>create_deerflow_agent</code>，再外面一层是 config-driven 的应用工厂 <code>make_lead_agent</code>。
        这一章把两层工厂讲透——尤其是一个最容易讲错的事实：<strong>这两层并不连通</strong>。
      </Lead>

      <h2>一、三层结构总览</h2>
      <CodeBlock lang="text" title="两层工厂的位置" code={layers} />
      <KeyIdea title="最容易讲错的点">
        直觉上你会以为 <code>make_lead_agent</code> 调用 <code>create_deerflow_agent</code>。<strong>但它不调用。</strong>
        <code>make_lead_agent</code> 直接调底座 <code>create_agent</code>，走自己的 <code>build_middlewares()</code>；
        <code>create_deerflow_agent</code> 是另一条独立的 SDK 入口，走 <code>features.py</code> 的声明式装配。
        两条路径的中间件集合与顺序都不同。生产环境跑的是 <code>make_lead_agent</code> 这条；SDK 那条是给嵌入式/二次开发用的简化默认链。
      </KeyIdea>

      <h2>二、底座：langchain create_agent 做了什么</h2>
      <p>
        <code>create_agent(model, tools, middleware, system_prompt, state_schema, checkpointer)</code> 是 LangChain 1.x 的
        agent 原语。它把「调用模型 → 解析 tool_calls → 执行工具 → 把结果喂回 → 再调用模型」这套 ReAct 循环编译成一张
        <strong>LangGraph 状态图</strong>，并在每个关键时机暴露中间件钩子（<code>before_model</code> / <code>after_model</code> /
        <code>wrap_model_call</code> / <code>wrap_tool_call</code> / <code>before_agent</code> / <code>after_agent</code>）。
        deer-flow 的全部「业务智能」都挂在这些钩子上——这正是下一章的主题。
      </p>

      <h2>三、SDK 工厂：create_deerflow_agent</h2>
      <p>
        第一层封装在 <code>deerflow/agents/factory.py</code>。它<strong>不读任何 YAML、不碰全局单例</strong>，纯靠参数：
      </p>
      <CodeBlock lang="python" title="agents/factory.py — create_deerflow_agent" code={sdkFactory} />
      <p>两种互斥的装配模式，构造期就用 <code>ValueError</code> 卡住误用：</p>
      <ul>
        <li><strong><code>middleware=[...]</code>（完全接管）</strong>：原样使用这份列表，不能再配 <code>features</code> / <code>extra_middleware</code>。</li>
        <li><strong><code>features=RuntimeFeatures(...)</code>（默认路径）</strong>：走 <code>_assemble_from_features()</code> 声明式装配，
          可叠加 <code>extra_middleware</code> 通过 <code>@Next</code>/<code>@Prev</code> 定位插入（下一章细讲）。</li>
      </ul>
      <p>
        工具方面：用户传入的工具优先，feature 注入的工具（如 <code>task_tool</code> / <code>view_image_tool</code> /
        <code>ask_clarification_tool</code>）按名字去重后追加；<code>state_schema</code> 默认 <code>ThreadState</code>。
        最终把装配结果原样透传给 <code>create_agent</code>。
      </p>
      <Callout variant="note" title="诚实的 docstring：还没完全 config-free">
        <code>factory.py</code> 的注释自己承认：装配过程是 config-free 的，但注入的某些运行时组件（如 <code>task_tool</code>）
        在<strong>被调用时</strong>仍可能读全局配置——「Full config-free runtime is a Phase 2 goal」。读源码要相信注释里的这种自我披露。
      </Callout>

      <h2>四、应用工厂：make_lead_agent</h2>
      <p>
        生产路径的入口在 <code>deerflow/agents/lead_agent/agent.py</code>，签名刻意与 LangGraph Server 兼容（吃一个
        <code>RunnableConfig</code>）：
      </p>
      <CodeBlock lang="python" title="agents/lead_agent/agent.py — make_lead_agent" code={appFactory} />
      <p>它与 SDK 工厂的关键差异，全在「读配置」三个字上：</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>维度</th><th>做法</th></tr></thead>
          <tbody>
            <tr><td>运行参数</td><td>从 <code>RunnableConfig</code> 的 <code>configurable</code> + <code>context</code> 合并出 <code>thinking_enabled</code> / <code>reasoning_effort</code> / <code>model_name</code> / <code>is_plan_mode</code> / <code>subagent_enabled</code> / <code>is_bootstrap</code> / <code>agent_name</code></td></tr>
            <tr><td>模型解析</td><td><code>_resolve_model_name</code>：请求 → 自定义 agent 配置 → 全局默认；未知名回退默认并 warn；<code>thinking_enabled</code> 与 <code>model_config.supports_thinking</code> 不符则降级</td></tr>
            <tr><td>工具装配</td><td><code>get_available_tools</code> → <code>filter_tools_by_skill_allowed_tools</code>（按 skill 策略过滤）→ <code>assemble_deferred_tools</code>（拆出延迟 MCP 工具集）</td></tr>
            <tr><td>system prompt</td><td><code>apply_prompt_template(...)</code> 静态生成（见第五节），不是简单字符串</td></tr>
            <tr><td>中间件</td><td><code>build_middlewares(...)</code> 手写顺序装配（下一章主角）</td></tr>
          </tbody>
        </table>
      </div>

      <h2>五、一个反直觉的设计：system prompt 要「完全静态」</h2>
      <p>
        <code>lead_agent/prompt.py</code> 的 <code>apply_prompt_template</code> 把 role / soul / thinking_style /
        clarification / skills_section / subagent_section / working_directory / citations 等槽位填进一个大模板。但有意思的是：
      </p>
      <KeyIdea title="memory 与日期不进 system prompt">
        为了<strong>最大化 prefix-cache 复用</strong>，system prompt 被设计成「跨用户、跨会话恒定」。当前日期与 per-user memory
        <strong>不</strong>写进 system prompt，而是每轮由 <code>DynamicContextMiddleware</code> 注入到首个 HumanMessage 的
        <code>&lt;system-reminder&gt;</code> 里（下一章）。这样不同用户的 system prefix 完全一样，模型侧的前缀缓存才能命中——
        在高并发下这是实打实的成本与延迟优化。
      </KeyIdea>
      <p>
        skills 列表同理：通过后台线程缓存（<code>prime_enabled_skills_cache()</code> 预热），请求路径永不阻塞磁盘 IO；
        渲染结果还套了 <code>@lru_cache</code>。这些都是「让热路径无 IO、无变量」的工程取舍。
      </p>

      <Callout variant="warn" title="tracing 不变量">
        <code>agent.py</code> 强调一条规则：tracing callbacks 只在图调用根挂一次（<code>config["callbacks"]</code>），
        图内每个 <code>create_chat_model(...)</code> 必须 <code>attach_tracing=False</code>，否则 span 重复、
        <code>session_id</code>/<code>user_id</code> 丢失。这也是为什么上面的代码里能看到显式的 <code>attach_tracing=False</code>。
      </Callout>

      <Example title="自己验证「两层不连通」">
        在仓库里 <code>grep -n "create_deerflow_agent" backend/packages/harness/deerflow/agents/lead_agent/</code>，
        你会发现 <code>make_lead_agent</code> 路径根本不引用它；而 <code>grep -n "create_agent(" agents/lead_agent/agent.py</code>
        能看到它直接调底座。这就是本章最该记住的结论。
      </Example>

      <Summary
        points={[
          '三层结构：底座 create_agent（LangGraph 状态图）← SDK 工厂 create_deerflow_agent（config-free）← 应用工厂 make_lead_agent（config-driven）。',
          '关键事实：make_lead_agent 不调用 create_deerflow_agent，而是直接调底座并走自己的 build_middlewares——两条装配路径不连通、中间件集合不同。',
          'SDK 工厂有两种互斥模式：middleware 完全接管 vs features 声明式装配（可叠加 extra_middleware）；构造期 ValueError 卡误用。',
          'system prompt 刻意保持完全静态（日期/记忆改由 DynamicContextMiddleware 每轮注入 system-reminder），以最大化 prefix-cache；tracing 只在图根挂一次。',
        ]}
      />
    </article>
  )
}

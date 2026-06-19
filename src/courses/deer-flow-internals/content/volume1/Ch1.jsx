import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createApp = `def create_app() -> FastAPI:
    config = get_gateway_config()
    app = FastAPI(title="DeerFlow API Gateway", version="0.1.0", lifespan=lifespan, ...)

    # Starlette 中间件「后注册者先执行」：实际进入顺序 CORS → CSRF → Auth → 路由
    app.add_middleware(AuthMiddleware)     # 鉴权 fail-closed 兜底
    app.add_middleware(CSRFMiddleware)     # 双提交 Cookie CSRF
    cors_origins = sorted(get_configured_cors_origins())
    if cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, ...)

    app.include_router(models.router); app.include_router(mcp.router)
    app.include_router(threads.router); app.include_router(thread_runs.router)
    app.include_router(runs.router); app.include_router(auth.router)
    # ... 共 18 个 router
    return app

app = create_app()   # 模块底部：供 uvicorn 加载`

const lifespan = `@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_config = get_app_config()          # ① 一次性 bootstrap 快照（故意不存 app.state）
    apply_logging_level(startup_config.log_level)
    warn_if_auth_disabled_enabled()
    # ② tiktoken 预热（token_counting=="char" 时跳过；否则 5s 超时，受限网络兜底）
    ...
    async with langgraph_runtime(app, startup_config):   # ③ 拉起运行时单例
        await _ensure_admin_user(app)                    # ④ 必须在 runtime 之后（需 app.state.store）
        channel_service = await start_channel_service(startup_config)  # ⑤ IM 渠道
        yield
        await asyncio.wait_for(stop_channel_service(), timeout=5.0)    # 关闭有界`

const runtime = `@asynccontextmanager
async def langgraph_runtime(app, startup_config):
    config = startup_config
    async with AsyncExitStack() as stack:
        app.state.stream_bridge = await stack.enter_async_context(make_stream_bridge(config))
        await init_engine_from_config(config.database)   # 必须先于 checkpointer（pg 自动建库）
        app.state.checkpointer = await stack.enter_async_context(make_checkpointer(config))
        app.state.store        = await stack.enter_async_context(make_store(config))
        # RunStore / thread_store / run_event_store / RunManager 组装 ...
        run_manager = RunManager(store=run_store)
        try:
            yield
        finally:
            await asyncio.shield(run_manager.shutdown(timeout=5))  # 先排空在飞 run
            await close_engine()                                   # 再关引擎`

export default function Ch1() {
  return (
    <article>
      <Lead>
        网关是整个系统的「前门」。它是一个 FastAPI 应用，但真正有意思的是它的<strong>启动编排</strong>：
        <code>create_app()</code> 装配中间件与 18 个路由，<code>lifespan</code> 用一个嵌套的
        <code>AsyncExitStack</code> 把 StreamBridge、checkpointer、store、RunManager 这些运行时单例按严格顺序拉起又按逆序关停。
        顺序在这里不是风格，而是<strong>不变量</strong>——错一步就会出现「配置脑裂」或「run 还在写 checkpoint 时连接池被关」之类的真实 bug。
      </Lead>

      <h2>一、create_app：中间件顺序的玄机</h2>
      <p>
        入口在 <code>backend/app/gateway/app.py</code> 的 <code>create_app()</code>，模块底部 <code>app = create_app()</code>
        供 uvicorn 加载。注意中间件注册顺序：
      </p>
      <CodeBlock lang="python" title="app/gateway/app.py — create_app()" code={createApp} />
      <KeyIdea title="Starlette 的「后注册先执行」">
        中间件以洋葱模型包裹，<strong>后 <code>add_middleware</code> 的最先碰到请求</strong>。代码里依次注册
        Auth → CSRF → CORS，因此请求实际进入顺序是 <strong>CORS → CSRF → Auth → 路由</strong>。
        源码注释特意点明：CORS 与 CSRF 共享同一个 origin 白名单来源 <code>get_configured_cors_origins()</code>，
        让两套校验「同源」，避免规则打架。
      </KeyIdea>
      <p>
        随后 <code>include_router</code> 挂载 18 个路由器（models/mcp/memory/skills/artifacts/uploads/threads/agents/
        suggestions/channels/auth/feedback/thread_runs/runs/...），并定义一个 <code>GET /health</code>。下一章我们专门给出路由总表。
      </p>

      <h2>二、lifespan：启动五步与关闭兜底</h2>
      <CodeBlock lang="python" title="app/gateway/app.py — lifespan()" code={lifespan} />
      <ol>
        <li>
          <strong>加载配置快照</strong> <code>startup_config = get_app_config()</code>，应用日志级别。
          这个快照<strong>只用于一次性 bootstrap</strong>，并<strong>故意不缓存到 <code>app.state</code></strong>——见下方告警框。
        </li>
        <li>
          <strong>tiktoken 预热</strong>：若 <code>memory.token_counting == "char"</code> 直接跳过；否则用
          <code>asyncio.wait_for(..., timeout=5)</code> 限时预热，避免首个记忆请求阻塞在 BPE 数据下载上（受限网络兜底）。
        </li>
        <li>
          <strong>进入 <code>langgraph_runtime</code></strong>，拉起全部运行时单例（见第三节）。
        </li>
        <li>
          <strong><code>_ensure_admin_user</code></strong>：必须在 runtime 之后，因为它要用 <code>app.state.store</code> 做
          「无鉴权 → 有鉴权」的孤儿 thread 迁移。首次启动若没有 admin，<strong>不会自动建账号</strong>，而是提示去 <code>/setup</code>。
        </li>
        <li>
          <strong>启动 IM 渠道服务</strong>；失败仅记日志、不阻断启动。<code>yield</code> 之后是关闭逻辑，
          <code>stop_channel_service()</code> 限时 5s 防止 worker 卡死。
        </li>
      </ol>
      <Callout variant="warn" title="为什么 startup_config 故意不缓存（配置脑裂）">
        请求期一律走 <code>deps.get_config()</code> → <code>get_app_config()</code> 实时解析（按 mtime 热加载），
        而不是读 lifespan 的那份快照。若把快照存到 <code>app.state</code> 并在请求里复用，<code>config.yaml</code> 的
        热修改就不会生效——这正是源码注释引用的 split-brain bug。所以快照只做 bootstrap，绝不外泄。
      </Callout>

      <h2>三、langgraph_runtime：AsyncExitStack 的顺序即契约</h2>
      <p>
        运行时单例全部在 <code>app/gateway/deps.py::langgraph_runtime</code> 里用 <code>AsyncExitStack</code> 构建，挂到
        <code>app.state</code>。构建顺序有硬依赖：
      </p>
      <CodeBlock lang="python" title="app/gateway/deps.py — langgraph_runtime()" code={runtime} />
      <ul>
        <li><strong>StreamBridge</strong> 先建（流式总线，卷 5 详解）。</li>
        <li><code>init_engine_from_config(config.database)</code> <strong>必须先于</strong> checkpointer——postgres 后端需要先把库建好。</li>
        <li><strong>checkpointer / store</strong> 随后（线程状态持久化）。</li>
        <li>再组装 <code>RunStore / thread_store / run_event_store / RunManager</code>。其中 <code>run_event_store</code> 与其配置
          「一同冻结」，避免新配置配旧 store 的后端错配。</li>
        <li>仅 sqlite 后端启动时做 <code>reconcile_orphaned_inflight_runs(...)</code>，把上次没优雅退出、还停在 in-flight 的 run 标记为 error。</li>
      </ul>
      <KeyIdea title="关闭顺序：先排空 run，再关引擎">
        <code>finally</code> 里先 <code>asyncio.shield(run_manager.shutdown(timeout=5))</code> 让在飞的 run 把最后一次
        checkpoint 刷出去，<strong>再</strong> <code>close_engine()</code>。源码注释指出：若反过来，第二次 SIGINT 可能在 run 仍在写
        checkpoint 时就把 checkpointer 连接池关掉（langgraph postgres 的 <code>PoolClosed</code> 关闭竞态，issue #3373）。
        <code>asyncio.shield</code> 就是为了挡住第二次取消信号。
      </KeyIdea>

      <h2>四、依赖注入：从 app.state 取单例</h2>
      <p>
        路由处理函数怎么拿到这些单例？<code>deps.py</code> 用一个工厂 <code>_require(attr, label)</code> 生成 FastAPI 依赖：
        取 <code>app.state.&lt;attr&gt;</code>，缺失则抛 503。于是有了 <code>get_stream_bridge</code>、<code>get_run_manager</code>、
        <code>get_checkpointer</code>、<code>get_run_event_store</code>、<code>get_thread_store</code> 等一组 getter。
        其中 <code>get_run_context(request)</code> 把它们组装成 <code>RunContext</code>，并把 <code>app_config=get_config()</code>
        <strong>实时解析</strong>放进去，而 <code>event_store</code> 用启动时冻结的快照——「该热的热、该冻的冻」。
      </p>
      <Example title="GatewayConfig 与 AppConfig 是两套东西">
        别把两者搞混。<code>GatewayConfig</code>（<code>app/gateway/config.py</code>）只有 host/port/enable_docs，纯环境变量驱动、
        进程级单例、<strong>不热重载</strong>；<code>AppConfig</code>（<code>deerflow.config</code>）是业务配置，按 mtime <strong>热重载</strong>。
        网关进程配置 vs 业务配置，分得很清。
      </Example>

      <Summary
        points={[
          'create_app 注册 Auth/CSRF/CORS（后注册先执行，实际顺序 CORS→CSRF→Auth）+ 18 个 router；模块底部 app=create_app() 供 uvicorn。',
          'lifespan 五步：加载配置快照→tiktoken 预热→langgraph_runtime→_ensure_admin_user→启动渠道；快照故意不缓存到 app.state 以避免配置脑裂。',
          'langgraph_runtime 用 AsyncExitStack 按序拉起 StreamBridge→engine→checkpointer→store→RunManager；database 引擎必须先于 checkpointer。',
          '关闭时先 shield(run_manager.shutdown) 排空在飞 run 再 close_engine，规避 PoolClosed 竞态；请求期单例经 deps 的 _require getter 从 app.state 取。',
        ]}
      />
    </article>
  )
}

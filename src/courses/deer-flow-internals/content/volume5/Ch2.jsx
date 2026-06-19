import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const makeCkpt = `# langgraph.json: "checkpointer": { "path": "...:make_checkpointer" }
@contextlib.asynccontextmanager
async def make_checkpointer(app_config=None):
    # 优先级：① 旧式 checkpointer: 段 → ② 统一 database: 段(backend!="memory") → ③ InMemorySaver
    if backend == "sqlite":   saver = AsyncSqliteSaver(...)
    elif backend == "postgres":
        saver = AsyncPostgresSaver(AsyncConnectionPool(..., autocommit=True,
                                   prepare_threshold=0, row_factory=dict_row))
    else:                     saver = InMemorySaver()
    await saver.setup()
    yield saver`

const runStatus = `class RunStatus(StrEnum):
    pending = "pending"; running = "running"; success = "success"
    error = "error"; timeout = "timeout"; interrupted = "interrupted"

class DisconnectMode(StrEnum):
    cancel = "cancel"; continue_ = "continue_"`

const createOrReject = `def create_or_reject(self, ...):
    # 在 asyncio.Lock 内一次性完成「inflight 检查 + 插入」，消除 TOCTOU
    # multitask_strategy ∈ {reject, interrupt, rollback}
    record = RunRecord(run_id=uuid4(), status=pending, task=None, abort_event=Event(), ...)
    self._runs[run_id] = record
    self._runs_by_thread[thread_id][run_id] = True   # 二级索引，避免全扫
    self._persist_new_run_to_store(record)           # 失败则回滚内存记录并抛出
    return record`

export default function Ch2() {
  return (
    <article>
      <Lead>
        run 是「一次」对话推进，但 thread 是「跨多次 run」的持久对象。这一章讲两件事：<strong>状态怎么持久化</strong>
        （<code>make_checkpointer</code> 与 store，在 sqlite/postgres/memory 之间选择），以及 <strong>run 的生命周期怎么管</strong>
        （<code>RunManager</code> 的创建/拒绝/取消/孤儿回收）。这两块决定了 deer-flow 能不能「关掉浏览器明天再回来接着聊」、能不能在
        进程重启后不留下一堆僵尸 run。
      </Lead>

      <h2>一、checkpointer：thread 状态的持久化</h2>
      <p>
        还记得 <code>langgraph.json</code> 里声明的 <code>make_checkpointer</code> 吗？它在
        <code>runtime/checkpointer/async_provider.py</code>，是一个 async context manager：
      </p>
      <CodeBlock lang="python" title="checkpointer/async_provider.py — make_checkpointer" code={makeCkpt} />
      <KeyIdea title="三档优先级">
        <ol>
          <li><strong>旧式 <code>checkpointer:</code> 段</strong>（向后兼容）；</li>
          <li><strong>统一 <code>database:</code> 段</strong>（<code>backend != "memory"</code>）——推荐，sqlite 模式下 checkpointer 与应用
            共享同一个 <code>{'{sqlite_dir}'}/deerflow.db</code>（WAL 模式）；</li>
          <li>都没有则 <strong><code>InMemorySaver</code></strong>（重启即丢）。</li>
        </ol>
        postgres 用 <code>AsyncConnectionPool</code> + <code>autocommit</code> + <code>prepare_threshold=0</code> + <code>dict_row</code>，
        所有后端都 <code>await saver.setup()</code> 建表。
      </KeyIdea>
      <p>
        LangGraph 的 checkpointer 在每个图节点后存一份 state 快照——这就是「记忆上下文」「可恢复」「人审中断后能续」的物理基础。
        与之并列的还有一个 <strong>Store</strong>（<code>store/provider.py</code>），后端<strong>镜像</strong> checkpointer 配置，
        用来存 thread 元数据（列表、标题等）；为 None 时回退 <code>InMemoryStore</code> 并 WARNING「线程列表重启丢失」。
      </p>

      <h2>二、序列化：哪些该留、哪些该剥</h2>
      <p>
        state 往外发（给 API）前要序列化，<code>runtime/serialization.py</code> 的 <code>serialize(obj, mode)</code> 有讲究：
        <code>values</code> 模式会剥掉内部的 <code>__pregel_*</code> 字段，但<strong>保留 <code>__interrupt__</code></strong>
        （人审中断信息不能丢，issue #3595），并 <code>strip_data_url_image_blocks</code> 去掉 <code>hide_from_ui</code> 消息里的
        base64 大图，避免把几 MB 的图片塞进每帧。
      </p>

      <h2>三、RunManager：run 生命周期</h2>
      <p>状态机定义在 <code>runtime/runs/manager.py</code>：</p>
      <CodeBlock lang="python" title="runs/manager.py — RunStatus / DisconnectMode" code={runStatus} />
      <p>
        <code>RunManager</code> = <strong>内存注册表 + 可选持久化 <code>RunStore</code></strong>。所有变更受 <code>asyncio.Lock</code> 保护，
        <code>_runs</code> 配二级索引 <code>_runs_by_thread</code>（避免全扫）。每条 <code>RunRecord</code> 携带
        <code>task: asyncio.Task</code>、<code>abort_event</code>、token 统计等。
      </p>
      <CodeBlock lang="python" title="runs/manager.py — create_or_reject（消除 TOCTOU）" code={createOrReject} />
      <KeyIdea title="run 可见性边界">
        <code>create_or_reject</code> 在<strong>锁内一次性</strong>完成「inflight 检查 + 插入」，消除「检查到插入之间被插队」的 TOCTOU。
        更重要的是 <code>_persist_new_run_to_store</code>：若持久化失败就<strong>回滚内存记录并抛出</strong>——
        调用方绝不能看到一个「内存里有、store 里没有」的 run。这是「内存态与持久态必须一致」的边界纪律。
      </KeyIdea>
      <p>其余生命周期方法：</p>
      <ul>
        <li><strong><code>cancel(run_id, action)</code></strong>：设 <code>abort_event</code> + <code>task.cancel()</code>，置 <code>interrupted</code>，幂等；
          <code>action="rollback"</code> 时由 worker 回滚到 pre-run checkpoint。</li>
        <li><strong>持久化重试</strong> <code>_call_store_with_retry</code>：对 SQLite 的 <code>database is locked</code> 瞬时锁竞争做有界指数退避。</li>
        <li><strong><code>reconcile_orphaned_inflight_runs</code></strong>：进程重启后，把持久化里仍 <code>pending/running</code> 但本地没有 task 的 run 标 <code>error</code>
          （卷 1 lifespan 启动时调用）。</li>
        <li><strong><code>shutdown(timeout=5)</code></strong>：取消并有界等待在飞 run 刷出最后一次 checkpoint（趁 checkpointer 资源还开着），
          未结束的标 <code>interrupted</code>——这就是卷 1 那个 <code>asyncio.shield(run_manager.shutdown(...))</code> 在做的事。</li>
      </ul>

      <h2>四、worker 回滚：interrupt 与 rollback 的物理实现</h2>
      <p>
        <code>runs/worker.py</code> 的 <code>run_agent</code> 在启动时抓一个 pre-run checkpoint 快照。当
        <code>cancel(action="rollback")</code> 时，<code>_rollback_to_pre_run_checkpoint</code> 用 <code>empty_checkpoint()</code>
        生成新 marker、<code>aput</code> 还原快照并按 task 重放 <code>pending_writes</code>；若没有快照（全新 thread）则
        <code>adelete_thread</code> 清空。这让「撤销这一轮 run」成为一个干净、可逆的操作。
      </p>
      <Callout variant="note" title="待确认：RunStore 的 DB 实现落点">
        <code>runs/store/</code> 目录下只见到 <code>base.py</code> 与 <code>memory.py</code>；<code>base</code> 文档串提到「Future: RunRepository
        backed by SQLAlchemy ORM」。生产用的 DB 化 run 元数据由上层（卷 1 见过 gateway 注入的 <code>RunRepository(sf)</code>）适配，
        具体文件本课程未逐字读，标记待确认。
      </Callout>

      <Example title="把持久化和卷 1 连起来">
        回看卷 1 的 <code>langgraph_runtime</code>：它正是在这里 <code>make_checkpointer(config)</code> / <code>make_store(config)</code>
        建好持久化，组装 <code>RunManager(store=run_store)</code>，并在仅 sqlite 后端时跑 <code>reconcile_orphaned_inflight_runs</code>。
        关闭时先 <code>shutdown</code> 排空 run 再 <code>close_engine</code>。本章补全了那几行背后的全部细节。
      </Example>

      <Summary
        points={[
          'make_checkpointer（langgraph.json 声明）按 checkpointer:>database:>InMemory 三档选择 sqlite/postgres/memory；sqlite 与应用共享 deerflow.db(WAL)，postgres 用连接池。',
          'Store 镜像 checkpointer 配置存 thread 元数据；serialize(values) 剥 __pregel_* 但保留 __interrupt__ 并剥离 hide_from_ui 的 base64 大图。',
          'RunManager=内存注册表+RunStore：create_or_reject 锁内一次性检查+插入消除 TOCTOU，持久化失败即回滚（run 可见性边界）；cancel/重试/孤儿回收/shutdown 排空。',
          'worker 抓 pre-run checkpoint 快照，cancel(rollback) 时还原快照重放 pending_writes，让「撤销一轮 run」干净可逆。',
        ]}
      />
    </article>
  )
}

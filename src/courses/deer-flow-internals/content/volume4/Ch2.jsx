import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const hostBash = `def is_host_bash_allowed(config=None) -> bool:
    sandbox_cfg = getattr(config, "sandbox", None)
    if sandbox_cfg is None:
        return False
    if not uses_local_sandbox_provider(config):
        return True            # AIO/远程沙箱本身隔离，bash 放行
    return bool(getattr(sandbox_cfg, "allow_host_bash", False))  # 本地：必须显式开启`

const middleware = `# sandbox/middleware.py — 懒初始化 + 把 state mutation 落库
def wrap_tool_call(self, request, handler):
    before = runtime.state.get("sandbox")
    sandbox = ensure_sandbox_initialized(runtime)   # 首次工具调用时才 acquire
    result = handler(request)
    after = runtime.state.get("sandbox")
    if _is_fresh_lazy_init(before, after):
        # ensure_sandbox_initialized 的 state mutation 不被 LangGraph reducer 捕获，
        # 这里用 Command(update={"sandbox": after}) 显式落库，并合并进已有 Command
        return _attach_sandbox_update(result, after)
    return result`

const toolBody = `# sandbox/tools.py — 7 个 @tool 的统一模式
sandbox = ensure_sandbox_initialized(runtime)
if is_local_sandbox(sandbox):
    ensure_thread_directories_exist(...)
    path = validate_local_tool_path(path)     # 白名单 + 逃逸校验（AIO 直传容器）
out = sandbox.read_file(path)                 # 或 write_file / execute_command / ...
return truncate(mask_local_paths_in_output(out), read_file_output_max_chars)`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章末尾埋了个伏笔：LocalSandbox 不是真隔离，所以 deer-flow 默认禁掉它的 host bash。这一章把沙箱的<strong>安全模型</strong>
        讲透——host bash 门控、路径白名单与逃逸校验、bash 命令的 best-effort 守卫、输出遮蔽——再看 <code>SandboxMiddleware</code>
        如何把沙箱「懒初始化」并把 <code>sandbox_id</code> 写回 state，以及七个沙箱工具如何统一地调用沙箱。
      </Lead>

      <h2>一、核心论断：本地沙箱不是安全边界</h2>
      <p>
        <code>sandbox/security.py</code> 把这个观点直接写进代码。host bash 是否放行由 <code>is_host_bash_allowed</code> 决定：
      </p>
      <CodeBlock lang="python" title="sandbox/security.py — is_host_bash_allowed" code={hostBash} />
      <KeyIdea title="门控逻辑">
        规则只有两条：<strong>非本地 provider（AIO/远程）→ 直接允许 bash</strong>（它本身就在容器里，有内核隔离）；
        <strong>本地 provider → 必须显式 <code>sandbox.allow_host_bash: true</code></strong>（默认 false）。
        本地未放行时，<code>bash_tool</code> 返回一句 <code>LOCAL_HOST_BASH_DISABLED_MESSAGE</code> 而不执行。
        这背后的判断是：LocalSandbox 只有「路径作用域」而非内核隔离，让模型在宿主机随意跑 bash 风险太大。
      </KeyIdea>

      <h2>二、路径校验：白名单 + 逃逸检查</h2>
      <p>本地沙箱的路径安全由 <code>sandbox/tools.py</code> 的几道校验把守：</p>
      <ul>
        <li><strong><code>_reject_path_traversal</code></strong>：任一路径段等于 <code>".."</code> 即抛 <code>PermissionError("path traversal detected")</code>。</li>
        <li><strong><code>validate_local_tool_path</code></strong>：白名单——<code>/mnt/user-data/*</code> 可读写；<code>/mnt/skills/*</code>、
          <code>/mnt/acp-workspace/*</code> 仅在 read_only 时允许（写抛错）；自定义 mount 按其 read_only 标志；其余一律
          <code>PermissionError</code>。</li>
        <li><strong><code>_validate_resolved_user_data_path</code></strong>：解析后再确认 host 路径确实落在该 thread 的
          workspace/uploads/outputs 内。</li>
      </ul>

      <h2>三、bash 命令守卫：自己承认「不是安全边界」</h2>
      <p>
        对 bash 命令本身，<code>validate_local_bash_command_paths</code> 做了大量 best-effort 检查（注释明言 <em>not a secure sandbox boundary</em>）：
        阻 <code>file://</code> URL；扫绝对路径，不在允许集（user-data/skills/acp-workspace/自定义 mount/MCP allowed/<code>/bin/ /usr/bin/ /dev/</code> 等）即拒；
        用 <code>shlex</code> 拦 <code>cd/pushd</code> 到不安全目录、命令替换里的 <code>cd</code>、<code>..</code> 段、对 <code>rm/cat/find/grep/tar</code> 传根 <code>/</code>。
      </p>
      <Callout variant="warn" title="为什么是「best-effort」而非「保证」">
        shell 的灵活性（变量展开、子 shell、编码绕过）决定了纯静态命令校验无法做到 100% 拦截，所以 deer-flow 诚实地把它定位为
        <strong>纵深防御的一层，而非边界</strong>。真正的隔离要靠 AioSandbox 的容器。这也是为什么本地沙箱默认连 bash 都不给开。
      </Callout>
      <p>
        通过校验后还会 <code>replace_virtual_paths_in_command</code>（虚拟→本地）并 <code>_apply_cwd_prefix</code>
        （在命令前加 <code>cd &lt;workspace&gt; &amp;&amp;</code>）。执行完输出经 <code>mask_local_paths_in_output</code> 把宿主机真实路径
        反向遮蔽成虚拟路径，异常串也同样遮蔽。
      </p>

      <h2>四、SandboxMiddleware：懒初始化与状态落库</h2>
      <p>
        沙箱不在 agent 一开始就创建，而是<strong>懒初始化</strong>（默认 <code>lazy_init=True</code>）：第一次有沙箱工具被调用时才
        <code>provider.acquire(thread_id)</code>。这里有个 LangGraph 的坑——直接改 <code>runtime.state</code> 不会被 channel reducer 捕获：
      </p>
      <CodeBlock lang="python" title="sandbox/middleware.py — wrap_tool_call（懒初始化落库）" code={middleware} />
      <KeyIdea title="diff state + Command 落库">
        <code>ensure_sandbox_initialized</code> 在工具内把 <code>sandbox_id</code> 写进 <code>runtime.state</code>，但这种就地 mutation
        下游看不到。<code>SandboxMiddleware</code> 的解法：在 <code>wrap_tool_call</code> 里 diff 工具执行前后的 state，检测到「新鲜的懒初始化」
        就用 <code>Command(update={'{'}"sandbox": ...{'}'})</code> 显式落库（并把 ToolMessage 合并进这个 Command，保留 messages/goto）。
        这正好呼应卷 2-3 的 <code>merge_sandbox</code> reducer——保证整个 thread 始终是同一个 <code>sandbox_id</code>。
      </KeyIdea>

      <h2>五、七个沙箱工具的统一模式</h2>
      <p>
        <code>sandbox/tools.py</code> 暴露 7 个 <code>@tool</code>：<code>bash / ls / glob / grep / read_file / write_file / str_replace</code>。
        它们的骨架高度一致：
      </p>
      <CodeBlock lang="python" title="sandbox/tools.py — 工具统一模式" code={toolBody} />
      <ul>
        <li><strong>取沙箱</strong>：<code>ensure_sandbox_initialized(runtime)</code>，命中 state 里的 sandbox_id 就复用。</li>
        <li><strong>校验</strong>：本地沙箱才校验/翻译虚拟路径；AIO 直接把路径传给容器（容器内真实存在）。</li>
        <li><strong>调用 + 收尾</strong>：调 <code>sandbox.&lt;method&gt;</code>，输出 <code>mask_local_paths_in_output</code> 遮蔽 + 截断
          （<code>bash_output_max_chars=20000</code> 取中段、<code>read_file_output_max_chars=50000</code> 取头部，都从 <code>config.sandbox</code> 读）。</li>
      </ul>
      <p>
        并发安全：<code>write_file</code> / <code>str_replace</code> 用 <code>get_file_operation_lock(sandbox, path)</code>
        （按 <code>(sandbox_id, path)</code> 在 <code>WeakValueDictionary</code> 取/建锁）守护「读-改-写」。异步入口先
        <code>await ensure_sandbox_initialized_async</code> 再 <code>asyncio.to_thread</code> 跑同步体。
      </p>
      <Callout variant="note" title="待确认">
        sandbox 的 <code>release</code> 语义在中间件注释与 provider 实现之间字面有张力（注释说不每次释放，<code>after_agent</code> 又调
        <code>provider.release()</code>）——实际由 provider 的软释放消解（Local=no-op、AIO=入 warm pool 不停容器）。
        另 <code>needs_upload_permission_adjustment</code> 的消费方未在本卷文件中定位到，标记待确认。
      </Callout>

      <Example title="把安全模型串成一句话">
        本地沙箱：禁 bash（除非显式开）+ 路径白名单 + <code>..</code> 拒绝 + <code>relative_to</code> 逃逸检查 + 输出遮蔽 =「路径作用域」；
        要真隔离就切 AioSandbox 容器。<code>SandboxMiddleware</code> 负责把这套环境懒初始化并稳定地绑定到一个 thread 的 <code>sandbox_id</code> 上。
      </Example>

      <Summary
        points={[
          'is_host_bash_allowed：本地 provider 默认禁 host bash（需显式 allow_host_bash），AIO/远程因有容器隔离而放行——核心论断是「本地沙箱不是安全边界」。',
          '路径安全靠白名单 + .. 拒绝 + relative_to 逃逸校验 + 输出路径遮蔽；bash 命令做 best-effort 静态守卫（自承非边界），真隔离靠容器。',
          'SandboxMiddleware 懒初始化沙箱，并在 wrap_tool_call 里 diff state、用 Command(update) 把 sandbox_id 落库，配合 merge_sandbox 保证一 thread 一沙箱。',
          '7 个沙箱工具统一模式：ensure_sandbox_initialized→（本地才）校验翻译路径→调 sandbox 方法→遮蔽+截断；写操作用 (sandbox_id,path) 锁保证读-改-写安全。',
        ]}
      />
    </article>
  )
}

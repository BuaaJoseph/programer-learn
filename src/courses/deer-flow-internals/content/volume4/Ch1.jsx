import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const provider = `class SandboxProvider(ABC):
    uses_thread_data_mounts: bool = False
    needs_upload_permission_adjustment: bool = True

    @abstractmethod
    def acquire(self, thread_id: str | None = None) -> str: ...   # 返回 sandbox **id**，不是实例

    async def acquire_async(self, thread_id=None) -> str:
        return await asyncio.to_thread(self.acquire, thread_id)

    @abstractmethod
    def get(self, sandbox_id: str) -> Sandbox | None: ...          # id → 实例
    @abstractmethod
    def release(self, sandbox_id: str) -> None: ...`

const pathMapping = `@dataclass(frozen=True)
class PathMapping:
    container_path: str   # 虚拟路径，如 /mnt/user-data/workspace
    local_path: str       # 宿主机真实路径
    read_only: bool = False

# 正向解析做逃逸校验：
#   resolved_path.relative_to(local_root) 失败即
#   PermissionError(EACCES, "Access denied: path escapes mounted directory")`

const aio = `class AioSandbox(Sandbox):
    def __init__(self, id, base_url, home_dir=None):
        self._client = AioSandboxClient(base_url=base_url, timeout=600)
        self._lock = threading.Lock()        # 容器单 session，串行化命令防破坏

    def execute_command(self, command):
        return self._client.shell.exec_command(command=command, no_change_timeout=600)`

export default function Ch1() {
  return (
    <article>
      <Lead>
        agent 写文件、跑 bash、搜代码，这些动作不能直接落在网关进程上乱跑——它们统一收口到一个 <code>Sandbox</code> 抽象。
        deer-flow 提供两套实现：默认的 <strong>LocalSandbox</strong>（在宿主机文件系统上按 thread 做路径作用域隔离）和容器化的
        <strong>AioSandbox</strong>（连一个跑着沙箱镜像的 Docker/容器，真隔离）。这一章讲清抽象层、两套实现的取舍，以及一个贯穿始终的
        概念：<strong>虚拟路径契约</strong>。
      </Lead>

      <h2>一、虚拟路径契约：agent 永远只看到 /mnt/...</h2>
      <KeyIdea title="一个统一的「假」文件系统">
        无论底层是本地还是容器，agent 始终只看到一套固定的虚拟路径：<code>/mnt/user-data/{'{'}workspace,uploads,outputs{'}'}</code>、
        <code>/mnt/skills</code>、<code>/mnt/acp-workspace</code>。LocalSandbox 把这些虚拟路径「翻译」成宿主机真实路径
        （输出里再反向遮蔽回去）；AioSandbox 则通过容器 bind-mount 让这些虚拟路径在容器内<strong>真实存在</strong>。
        这层契约让上层工具代码完全不关心底层是哪种沙箱。
      </KeyIdea>

      <h2>二、Sandbox 接口</h2>
      <p>
        <code>deerflow/sandbox/sandbox.py</code> 的 <code>Sandbox(ABC)</code> 只持有一个 <code>_id</code>，定义全部执行 + 文件操作方法：
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>方法</th><th>语义</th></tr></thead>
          <tbody>
            <tr><td><code>execute_command(command)</code></td><td>执行 bash，返回 stdout/stderr</td></tr>
            <tr><td><code>read_file(path)</code> / <code>write_file(path, content, append)</code></td><td>读 / 写文本</td></tr>
            <tr><td><code>download_file(path)</code> / <code>update_file(path, bytes)</code></td><td>读 / 写二进制</td></tr>
            <tr><td><code>list_dir(path, max_depth=2)</code></td><td>列目录</td></tr>
            <tr><td><code>glob(path, pattern, ...)</code></td><td>路径匹配，返回 <code>(matches, truncated)</code></td></tr>
            <tr><td><code>grep(path, pattern, ...)</code></td><td>内容检索，返回 <code>(GrepMatch[], truncated)</code></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        接口文档串强制要求：本地与远程实现都必须把「文件读不到/不存在」统一抛 <code>OSError</code>，让调用方只处理一种异常类型。
      </p>

      <h2>三、Provider：发 id、不发实例</h2>
      <CodeBlock lang="python" title="sandbox/sandbox_provider.py — SandboxProvider" code={provider} />
      <KeyIdea title="为什么 acquire 返回 id 而不是实例">
        <code>acquire(thread_id)</code> 返回一个<strong>字符串 id</strong>，<code>get(id)</code> 才返回实例。这个拆分很关键：
        id 能存进 LangGraph state（<code>state["sandbox"]["sandbox_id"]</code>），从而<strong>跨工具调用、甚至跨进程复用同一个沙箱</strong>。
        实例不可序列化、不能进 state，id 可以。<code>acquire_async</code> 默认把同步 <code>acquire</code> 丢到
        <code>asyncio.to_thread</code>，避免阻塞事件循环。
      </KeyIdea>
      <p>
        Provider 由模块级单例管理：<code>get_sandbox_provider()</code> 读 <code>config.sandbox.use</code>（一个类路径字符串），
        用 <code>resolve_class</code> 反射出类并实例化为单例。注意：<strong>deer-flow 没有 <code>executor_type</code> 枚举</strong>——
        provider 选择完全由配置里的「<code>module:Class</code>」字符串驱动。
      </p>

      <h2>四、LocalSandbox：路径映射 + 正反向改写</h2>
      <p>默认实现 <code>sandbox/local/local_sandbox.py</code>，核心是 <code>PathMapping</code> 与逃逸校验：</p>
      <CodeBlock lang="python" title="local_sandbox.py — PathMapping 与逃逸校验" code={pathMapping} />
      <ul>
        <li><strong>命令执行</strong>：先把命令里的虚拟路径换成本地路径，<code>subprocess.run([shell,"-c",...], timeout=600)</code>，
          再把输出里的本地路径反向改写回虚拟路径（防泄露宿主机布局）。</li>
        <li><strong>写文件遮蔽</strong>：记录 agent 写过的路径 <code>_agent_written_paths</code>；读文件时只对 agent 写过的反向解析
          （用户上传/外部产物不被改写）。</li>
        <li><strong>只读保护</strong>：命中 read-only mount 抛 <code>OSError(EROFS)</code>；<code>download_file</code> 仅允许
          <code>/mnt/user-data</code> 下、&gt;100MB 抛 <code>OSError(EFBIG)</code>。</li>
      </ul>
      <p>
        Provider 侧 <code>LocalSandboxProvider</code>（<code>uses_thread_data_mounts=True</code>）按 thread 作用域：
        <code>acquire(None)</code> 返回进程级单例 id <code>"local"</code>，有 thread_id 则用 LRU 缓存 id <code>"local:{'{thread_id}'}"</code>
        （<code>OrderedDict</code> 上限 256）。<code>release()</code> 是 no-op（保留缓存延续 <code>_agent_written_paths</code>），
        <code>reset()/shutdown()</code> 才清空。
      </p>

      <h2>五、AioSandbox：真正的容器隔离</h2>
      <p>
        <code>community/aio_sandbox/aio_sandbox.py</code> 连一个跑着 <code>agent-infra/sandbox</code> 镜像的容器，所有操作走容器 HTTP API：
      </p>
      <CodeBlock lang="python" title="community/aio_sandbox/aio_sandbox.py（精简）" code={aio} />
      <p>
        容器维持<strong>单个持久 shell session</strong>，并发会破坏它，所以用 <code>threading.Lock</code> 串行化命令，
        检测到并发错误签名时在新临时 session 重试一次。Provider 侧 <code>AioSandboxProvider</code> 用确定性
        <code>sandbox_id = sha256(thread_id)[:8]</code>（无需共享内存即可跨进程推导容器名），配三层复用：
        in-process 缓存 → warm pool（容器仍跑、秒级回收）→ 跨进程 <code>fcntl.flock</code> 文件锁。后台 idle-checker 每 60s 扫描，
        超 <code>idle_timeout</code>（默认 600s）销毁。
      </p>
      <p>它的后端又分两种：</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>后端</th><th>用法</th></tr></thead>
          <tbody>
            <tr><td><code>LocalContainerBackend</code></td><td>本机 <code>docker run --rm -d -p ...</code>（macOS 优先 Apple Container），bind-mount thread 目录；无 <code>provisioner_url</code> 时用</td></tr>
            <tr><td><code>RemoteSandboxBackend</code></td><td>纯 HTTP 瘦客户端，委托 provisioner（k3s）：<code>POST/DELETE /api/sandboxes</code>；配 <code>provisioner_url</code> 触发</td></tr>
          </tbody>
        </table>
      </div>

      <h2>六、什么时候用哪个</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>场景</th><th><code>sandbox.use</code></th><th>后端</th></tr></thead>
          <tbody>
            <tr><td>默认 / 可信本地</td><td><code>deerflow.sandbox.local:LocalSandboxProvider</code></td><td>宿主机 FS 直接执行</td></tr>
            <tr><td>隔离容器</td><td><code>deerflow.community.aio_sandbox:AioSandboxProvider</code>（无 provisioner_url）</td><td>LocalContainerBackend</td></tr>
            <tr><td>k3s / 远程集群</td><td>同上 + <code>provisioner_url</code></td><td>RemoteSandboxBackend</td></tr>
          </tbody>
        </table>
      </div>
      <Example title="一句话理解两套实现">
        LocalSandbox = 「在宿主机上演一出虚拟路径的戏」，快但不是真隔离；AioSandbox = 「把戏搬进真正的容器盒子」，慢一点但有内核级隔离。
        下一章我们就看：正因为 LocalSandbox 不是真隔离，deer-flow 默认<strong>禁掉</strong>了它的 host bash。
      </Example>

      <Summary
        points={[
          '虚拟路径契约：agent 永远只看到 /mnt/user-data 等虚拟路径；Local 靠正/反向路径改写模拟，Aio 靠容器 bind-mount 真实存在。',
          'Sandbox 接口统一 execute_command/read/write/glob/grep 等并统一抛 OSError；SandboxProvider.acquire 返回 id（可进 state、跨调用/进程复用），get(id) 返回实例。',
          'provider 由 config.sandbox.use 的「module:Class」字符串反射选择，没有 executor_type 枚举。',
          'LocalSandbox 路径映射 + 逃逸校验 + 输出遮蔽，按 thread LRU 缓存；AioSandbox 用确定性 sha256(thread_id)[:8] + 三层复用连容器，后端分 LocalContainer/Remote。',
        ]}
      />
    </article>
  )
}

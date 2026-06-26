import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const channelBase = `class Channel(ABC):
    @abstractmethod
    async def start(self): ...
    @abstractmethod
    async def stop(self): ...
    @abstractmethod
    async def send(self, msg: OutboundMessage): ...
    async def receive_file(self, ...): ...     # 默认 no-op，Feishu 等覆盖以下载附件
    supports_streaming: bool = False`

const client = `# ChannelManager 把自己伪装成「可信内部浏览器」调用网关
self._client = get_client(url=self._langgraph_url, headers={
    **create_internal_auth_headers(),                       # X-DeerFlow-Internal-Token
    CSRF_HEADER_NAME: self._csrf_token,                     # X-CSRF-Token
    "Cookie": f"{CSRF_COOKIE_NAME}={self._csrf_token}",     # 满足双提交
})`

const handleChat = `# _handle_chat：把一条 IM 消息变成一次 agent run
thread_id = await self._lookup_thread_id(...) or await self._create_thread(...)
params = self._resolve_run_params(...)        # 合并 default/channel/user 三层 session
# 阻塞型渠道：
result = await client.runs.wait(thread_id, assistant_id,
            input={"messages": [human_message]}, config, context,
            multitask_strategy="reject", headers=owner_headers)
# 流式型渠道（feishu/telegram/wecom）：client.runs.stream(...) 节流 0.35s 发增量`

export default function Ch3() {
  return (
    <article>
      <Lead>
        deer-flow 不只活在浏览器里——它能从飞书、Slack、Telegram、企业微信、钉钉、Discord 接入。这一章看 <code>app/channels</code>
        如何把这些五花八门的 IM 平台统一成一个 <code>Channel</code> 抽象，以及最关键的一环：<code>ChannelManager</code> 怎么<strong>把自己伪装成
        一个可信的内部浏览器</strong>，带着 internal-token + CSRF 去调网关，把一条外部消息变成一次 agent run。这恰好回收了卷 1-3 埋下的
        「内部可信调用」伏笔，闭合整个系统。
      </Lead>

      <h2>一、Channel 抽象：所有平台一个接口</h2>
      <p>基类在 <code>app/channels/base.py</code>：</p>
      <CodeBlock lang="python" title="app/channels/base.py — Channel(ABC)" code={channelBase} />
      <p>
        每个平台（<code>slack.py</code> / <code>feishu.py</code> / <code>telegram.py</code> / <code>wecom.py</code> / <code>dingtalk.py</code> /
        <code>discord.py</code> / <code>wechat.py</code>）实现 <code>start/stop/send</code>，把外部消息封成统一的 <code>InboundMessage</code>
        投进 <code>MessageBus</code>，再把结果作为 <code>OutboundMessage</code> 发回。需要下载附件的平台（如 Feishu）覆盖 <code>receive_file</code>
        把文件落到沙箱 uploads 目录。<code>supports_streaming</code> 标记该平台是否支持流式增量（feishu/telegram/wecom 支持）。
      </p>

      <h2>二、生命周期：ChannelService 编排</h2>
      <p>
        <code>service.py</code> 的 <code>ChannelService</code> 用一个注册表 <code>_CHANNEL_REGISTRY</code>（平台名 → <code>module:Class</code>，懒加载）
        管理所有渠道。<code>from_app_config()</code> 从 <code>AppConfig.model_extra["channels"]</code>（卷 6 提过 <code>extra="allow"</code>）
        读配置、合并运行时绑定，构造 <code>MessageBus</code> / <code>ChannelStore</code> / <code>ChannelManager</code>。卷 1 lifespan 里的
        <code>start_channel_service(startup_config)</code> 就是启动它——磁盘 IO 经 <code>asyncio.to_thread</code> 移出事件循环。
      </p>

      <h2>三、核心：ChannelManager 怎么触发 run</h2>
      <p>
        <code>manager.py</code> 的 <code>ChannelManager</code> 是渠道侧的「run 创建安全边界」。它不直接调内核，而是用官方
        <code>langgraph_sdk</code> client <strong>反过来调自己的网关</strong>——并把自己伪装成一个通过了鉴权的内部浏览器：
      </p>
      <CodeBlock lang="python" title="manager.py — SDK client（伪装成可信内部调用）" code={client} />
      <KeyIdea title="回收卷 1-3 的伏笔">
        还记得卷 1-3 的内部可信调用吗？这里就是它的消费方。worker 没有用户 cookie，于是带上 <code>X-DeerFlow-Internal-Token</code>
        让 <code>AuthMiddleware</code> 认它为 internal user，再自带一对 <code>csrf_token</code> cookie + <code>X-CSRF-Token</code> header 满足
        CSRF 双提交，并用 <code>X-DeerFlow-Owner-User-Id</code> 指明「代哪个绑定用户行事」。<strong>整条鉴权链被一个非浏览器客户端完整复用</strong>——
        这正是把鉴权做成「请求头契约」而非「浏览器专属」的好处。
      </KeyIdea>

      <h2>四、从 inbound 到 run：_handle_chat</h2>
      <p>
        派发循环 <code>_dispatch_loop</code> 从 bus 取 inbound、去重、<code>create_task(_handle_message)</code>；后者过完「绑定身份校验」
        和并发信号量后分流到 <code>_handle_command</code>（<code>/new /status /models /memory /help /bootstrap</code> 等）或 <code>_handle_chat</code>：
      </p>
      <CodeBlock lang="python" title="manager.py — _handle_chat（精简）" code={handleChat} />
      <ol>
        <li><strong>定位 thread</strong>：连接绑定优先，否则按渠道存储查，再没有就 <code>_create_thread</code>。</li>
        <li><strong>解析 run 参数</strong>：合并 default/channel/user 三层 session，定 <code>assistant_id</code> / <code>run_config</code> /
          <code>run_context</code>（含 <code>user_id</code>），自定义 agent 转成 <code>lead_agent</code> + <code>agent_name</code>。</li>
        <li><strong>附件入境</strong>：<code>receive_file</code> + 落盘到 uploads，把 <code>&lt;uploaded_files&gt;</code> 块拼进消息文本。</li>
        <li><strong>分流</strong>：阻塞型渠道用 <code>client.runs.wait(..., multitask_strategy="reject")</code>；
          流式型渠道用 <code>client.runs.stream(...)</code>，节流 <code>0.35s</code> 发增量 <code>OutboundMessage(is_final=False)</code>，
          <code>finally</code> 发终帧。</li>
        <li><strong>取回结果</strong>：抽最后 AI/澄清文本、本轮产物（仅 <code>present_files</code> 的 outputs 路径，防穿越），
          <code>bus.publish_outbound</code> 发回平台。</li>
      </ol>

      <h2>五、整条链路（闭合全课）</h2>
      <p>把 IM 这条入口接回主干，就是一条完整的环：</p>
      <CodeBlock
        lang="text"
        title="IM 渠道端到端链路"
        code={`平台事件 → adapter → MessageBus(inbound)
   → ChannelManager._dispatch_loop → _handle_chat
   → langgraph_sdk client（带 internal-token + CSRF + Owner 头）
   → Gateway /api/threads/{tid}/runs/wait|stream
   → start_run → run_agent（卷 1/卷 5 的同一条主干）
   → 结果 → MessageBus(outbound) → Channel.send 发回平台`}
      />
      <Callout variant="note" title="安全细节：绑定身份与产物穿越防护">
        启用 <code>require_bound_identity</code> 时，未绑定外部身份的非命令消息会被拒并提示去 Settings 绑定，而且<strong>重新从
        connection_repo 读取</strong>而不信任 inbound 自带的连接断言。产物投递则强制路径必须落在 outputs 目录内（防目录穿越）。
        渠道是「最不可信的入口」，所以这里的校验格外严。
      </Callout>

      <Example title="一句话收束整门课">
        无论入口是浏览器还是飞书，最终都收敛到同一个 <code>start_run → run_agent → agent.astream</code>；这条主干之上，
        二十多个中间件提供智能、subagent 提供分工、sandbox 提供执行隔离、skills 提供知识、config 提供装配、runtime 提供流式与持久化。
        <strong>这就是 deer-flow——一个把「Agent 该有的工程能力」拆得干干净净、又靠一条 run 主干串起来的工业级 harness。</strong>
      </Example>

      <Summary
        points={[
          'Channel(ABC) 把各 IM 平台统一成 start/stop/send + 可选 receive_file 的接口；ChannelService 用懒加载注册表编排生命周期，由 lifespan 启动。',
          'ChannelManager 用 langgraph_sdk client 反向调网关，带 internal-token + CSRF 双提交 + Owner 头把自己伪装成可信内部浏览器——回收卷 1-3 的内部可信调用伏笔。',
          '_handle_chat：定位/新建 thread → 合并三层 session 解析 run 参数 → 附件入境 → 阻塞 runs.wait 或流式 runs.stream（节流 0.35s）→ 抽取结果发回。',
          '整条环：平台→MessageBus→ChannelManager→网关 runs→start_run→run_agent→outbound→发回；渠道作为最不可信入口，绑定身份校验与产物路径穿越防护格外严。',
        ]}
      />
    </article>
  )
}

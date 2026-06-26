import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ConfigLoading from '@/courses/deer-flow-internals/illustrations/ConfigLoading.jsx'

const fromFile = `# config/app_config.py
class AppConfig(BaseModel, extra="allow"):   # 聚合所有子配置；extra=allow 容纳 channels 等扩展段
    ...

def resolve_config_path(config_path=None) -> Path:
    # ① 参数 → ② env DEER_FLOW_CONFIG_PATH → ③ project root config.yaml → ④ legacy backend/config.yaml

# from_file 流程：
data = yaml.safe_load(path)
_check_config_version(data)                  # 落后 example 则 WARNING: make config-upgrade
data = resolve_env_variables(data)           # 递归把 $VAR 替换为 os.getenv（缺失抛错）
data = _apply_database_defaults(data)        # 缺省补 {backend: sqlite, sqlite_dir: .deer-flow/data}
cfg = AppConfig.model_validate(data)
_apply_singleton_configs(cfg)                # 推入各模块全局单例；checkpointer 变更时 reset`

const cache = `# 缓存键 = (mtime, size, sha256)
_app_config_signature = (mtime, size, sha256_of_file)

def get_app_config():
    # 优先级：contextvar 运行时覆盖 > is_custom 注入 > 文件签名
    if signature_unchanged():
        return _cached            # 命中缓存
    return reload_app_config()    # 签名变了 → 重新加载（热重载）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        deer-flow 用<strong>一份 <code>config.yaml</code></strong>（外加几个环境变量与扩展 JSON）驱动几乎所有东西：用哪些模型、
        用哪种沙箱、记忆开不开、接哪些渠道、用什么持久化后端……这一章把配置系统讲清楚——它怎么被发现、解析、合并、校验，
        怎么按文件签名<strong>热重载</strong>而无需重启，以及为什么卷 1 的 lifespan 故意不缓存配置快照。最后给一张配置 schema 的全景树。
      </Lead>

      <h2>一、加载流程：from_file 的七步</h2>
      <p>入口是 <code>config/app_config.py</code> 的 <code>AppConfig</code>（<code>extra="allow"</code>，容得下 channels 等扩展段）：</p>
      <CodeBlock lang="python" title="config/app_config.py — 路径解析与 from_file" code={fromFile} />
      <ol>
        <li><strong>找文件</strong>：<code>resolve_config_path</code> 优先级 参数 → env <code>DEER_FLOW_CONFIG_PATH</code> → 项目根
          <code>config.yaml</code> → legacy <code>backend/config.yaml</code>。</li>
        <li><strong>解析 YAML</strong> + <strong>版本检查</strong>：落后于 example 的 <code>config_version</code> 会 WARNING 提示
          <code>make config-upgrade</code>。</li>
        <li><strong>环境变量替换</strong>：<code>resolve_env_variables</code> 递归把 <code>$VAR</code> 换成 <code>os.getenv</code>，缺失直接抛错
          （密钥不写进文件、用 env 注入）。</li>
        <li><strong>补默认</strong>：<code>_apply_database_defaults</code> 缺省补 sqlite。</li>
        <li><strong>校验</strong>：<code>AppConfig.model_validate</code>。</li>
        <li><strong>推单例</strong>：<code>_apply_singleton_configs</code> 把各子配置推入对应模块全局单例；checkpointer 配置变化时
          <code>reset_checkpointer()</code> + <code>reset_store()</code>。</li>
      </ol>
      <Callout variant="note" title="一个救命的校验器">
        <code>_coerce_null_list_sections</code> 把「存在但全被注释成 None」的 <code>models/tools/tool_groups</code> 段强制为 <code>[]</code>。
        否则第一次 <code>cp config.example.yaml config.yaml</code> 启动会因为 pydantic 校验 None 而崩——这是给新手铺的一块防摔垫。
      </Callout>

      <h2>二、热重载：按文件签名决定要不要重读</h2>
      <CodeBlock lang="python" title="get_app_config — 签名缓存" code={cache} />
      <KeyIdea title="为什么能改配置不重启">
        缓存键是文件的 <strong>(mtime, size, sha256)</strong> 三元组。<code>get_app_config()</code> 每次被调时先比签名：没变就返回缓存，
        变了就重新加载。请求路径全程走 <code>get_app_config()</code>，所以你改完 <code>config.yaml</code> 保存，下一个请求就用上新配置——
        无需重启进程。这正是卷 1 反复强调的：lifespan 那份 <code>startup_config</code> 快照只做一次性 bootstrap，<strong>绝不缓存到 app.state</strong>，
        否则热重载就失效了（配置脑裂）。运行时还可用 contextvar 做作用域覆盖（<code>push/pop_current_app_config</code>）。
      </KeyIdea>

      <h2>三、流程全景图</h2>
      <ConfigLoading />

      <h2>四、模型配置与反射装配</h2>
      <p>
        <code>model_config.py</code> 的 <code>ModelConfig</code>（<code>extra="allow"</code>）字段：<code>name</code> /
        <code>use</code>（provider 类路径，如 <code>langchain_openai:ChatOpenAI</code>）/ <code>model</code>，外加
        <code>supports_thinking</code> / <code>supports_vision</code> / <code>when_thinking_enabled/disabled</code> 等能力标志；
        <code>extra="allow"</code> 让 <code>api_key</code>/<code>temperature</code> 等透传给 provider。<code>get_model_config(name)</code> 线性查找。
      </p>
      <KeyIdea title="反射装配：配置即装配指令">
        贯穿全课程你会反复看到「<code>module:Class</code> 字符串 + 反射」这个模式：<code>sandbox.use</code> 选 SandboxProvider、
        <code>tools[].use</code> 选工具、<code>models[].use</code> 选 LLM provider……都由 <code>deerflow/reflection</code> 的
        <code>resolve_class</code> / <code>resolve_variable</code> 把字符串变成真实对象并实例化。<strong>配置文件不只是参数，更是装配指令</strong>——
        这让换沙箱、换模型、加工具都不用改代码，只改一行字符串。
      </KeyIdea>

      <h2>五、config.yaml schema 全景树</h2>
      <p>源 <code>config.example.yaml</code>（<code>config_version: 14</code>）顶层键（按职责归类）：</p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>分组</th><th>顶层键</th></tr></thead>
          <tbody>
            <tr><td>模型/工具</td><td><code>models[]</code>、<code>tool_groups[]</code>、<code>tools[]</code>、<code>tool_search</code>、<code>tool_output</code></td></tr>
            <tr><td>执行环境</td><td><code>sandbox</code>（<code>use</code> / <code>allow_host_bash</code> / <code>mounts[]</code> / <code>*_output_max_chars</code>）</td></tr>
            <tr><td>中间件开关</td><td><code>summarization</code>、<code>loop_detection</code>、<code>safety_finish_reason</code>、<code>token_usage</code>、<code>title</code></td></tr>
            <tr><td>记忆/技能</td><td><code>memory</code>、<code>skills</code>、<code>skill_evolution</code></td></tr>
            <tr><td>子代理</td><td><code>subagents</code>（<code>agents</code> / <code>custom_agents</code> 覆盖）</td></tr>
            <tr><td>持久化</td><td><code>database</code>（<code>backend: sqlite</code> / <code>sqlite_dir</code>）、<code>run_events</code>（<code>memory|db|jsonl</code>）、可选 <code>checkpointer</code>(旧式)、可选 <code>stream_bridge</code></td></tr>
            <tr><td>其他</td><td><code>log_level</code>、<code>uploads</code>、<code>suggestions</code>、<code>agents_api</code>、<code>guardrails</code>、<code>acp_agents</code>、<code>channel_connections</code></td></tr>
            <tr><td>独立 JSON</td><td><code>extensions</code>（技能启用状态 + <code>mcpServers</code>，<strong>不在 config.yaml</strong>）</td></tr>
          </tbody>
        </table>
      </div>
      <Callout variant="note" title="两个「独立户口」">
        别忘了有两样东西不在 <code>config.yaml</code>：<strong>网关进程配置</strong>（<code>GatewayConfig</code>，host/port/docs，纯 env，不热重载，卷 1）
        和 <strong>扩展配置</strong>（技能启用 + MCP servers，独立 JSON，卷 6-1）。把这三套（AppConfig / GatewayConfig / extensions）分清，
        配置体系就不会乱。
      </Callout>

      <Example title="动手：改一行就换沙箱">
        把 <code>config.yaml</code> 里 <code>sandbox.use</code> 从 <code>deerflow.sandbox.local:LocalSandboxProvider</code> 改成
        <code>deerflow.community.aio_sandbox:AioSandboxProvider</code>，保存——下一个 run 就会走容器化沙箱（前提是镜像已 <code>make setup-sandbox</code> 预拉）。
        无需改任何代码、无需重启。这就是反射装配 + 热重载的威力。
      </Example>

      <Summary
        points={[
          'from_file 流程：解析 YAML→版本检查→$VAR 环境变量替换→补 database 默认→model_validate→推全局单例（checkpointer 变更则 reset）。',
          'get_app_config 按文件 (mtime,size,sha256) 签名热重载；请求路径全程走它，故 lifespan 快照绝不缓存，避免配置脑裂。',
          '反射装配是核心模式：sandbox/tools/models 的 use 字段都是「module:Class」字符串，由 reflection.resolve_class/variable 实例化——改配置即换实现，不改代码。',
          'schema 顶层覆盖模型/工具/沙箱/中间件开关/记忆技能/子代理/持久化/渠道；注意三套独立配置：AppConfig（config.yaml 热重载）、GatewayConfig（env 不重载）、extensions JSON（技能/MCP）。',
        ]}
      />
    </article>
  )
}

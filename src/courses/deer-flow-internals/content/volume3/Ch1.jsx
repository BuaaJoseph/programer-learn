import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const strReplace = `@tool("str_replace", parse_docstring=True)
def str_replace_tool(runtime: Runtime, description: str, path: str,
                     old_str: str, new_str: str, replace_all: bool = False) -> str:
    """Replace a substring in a file with another substring.
    ...
    Args:
        description: Explain why ... ALWAYS PROVIDE THIS PARAMETER FIRST.
        path: The **absolute** path ... ALWAYS PROVIDE THIS PARAMETER SECOND.
        old_str: The substring to replace. ALWAYS PROVIDE THIS PARAMETER THIRD.
        new_str: The new substring. ALWAYS PROVIDE THIS PARAMETER FOURTH.
        replace_all: Whether to replace all occurrences ... Default is False.
    """
    sandbox = ensure_sandbox_initialized(runtime)
    ...
    if old_str not in content:
        return f"Error: String to replace not found in file: {requested_path}"
    content = content.replace(old_str, new_str) if replace_all \\
              else content.replace(old_str, new_str, 1)
    sandbox.write_file(path, content)`

const getTools = `def get_available_tools(model_name, groups=None, subagent_enabled=False, ...) -> list[BaseTool]:
    # (A) 配置驱动：config.yaml 的每条 ToolConfig {name, group, use}
    #     用 resolve_variable(cfg.use, BaseTool) 反射 "module:attr"，按 group 过滤
    # (B) 内置硬编码：
    BUILTIN_TOOLS = [present_file_tool, ask_clarification_tool]
    SUBAGENT_TOOLS = [task_tool]
    # 条件追加：skill_evolution→skill_manage；subagent_enabled→task；
    #          vision 模型→view_image；有 ACP→invoke_acp_agent
    # 去重优先级：config-loaded > builtin > MCP > ACP（按 name）`

const mcp = `extensions_config = ExtensionsConfig.from_file()
if extensions_config.get_enabled_mcp_servers():
    mcp_tools = get_cached_mcp_tools()          # MultiServerMCPClient(...).get_tools()
    for t in mcp_tools:
        tag_mcp_tool(t)                          # metadata["deerflow_mcp"] = True`

export default function Ch1() {
  return (
    <article>
      <Lead>
        agent 的「手」就是工具。deer-flow 把工具统一成 LangChain 的 <code>BaseTool</code>，用一个装配函数
        <code>get_available_tools</code> 把「配置里声明的」「内置硬编码的」「MCP 动态接入的」三类工具合成一份清单。
        这一章讲清楚：工具怎么定义、怎么注册、怎么按技能策略过滤，以及当 MCP 工具多到塞不进上下文时，
        <code>tool_search</code> 怎么把它们「延迟暴露」给模型。
      </Lead>

      <h2>一、一个工具长什么样</h2>
      <p>
        看一个完整的简单工具——<code>str_replace</code>（来自 <code>deerflow/sandbox/tools.py</code>）：
      </p>
      <CodeBlock lang="python" title="sandbox/tools.py — str_replace_tool" code={strReplace} />
      <KeyIdea title="三个约定">
        <ol>
          <li><strong><code>@tool("name", parse_docstring=True)</code></strong>：docstring 的 <code>Args:</code> 段会被解析成参数 schema，
            直接变成喂给 LLM 的 function 定义。所以这些工具的 docstring 写得像「给模型看的说明书」。</li>
          <li><strong><code>runtime: Runtime</code></strong>：框架自动注入运行时（<code>Runtime = ToolRuntime[dict, ThreadState]</code>），
            工具据此拿到 <code>state["sandbox"]</code> 等。第一个业务参数恒为 <code>description</code>（「ALWAYS PROVIDE THIS PARAMETER FIRST」），
            逼模型先解释意图，便于审计与可读性。</li>
          <li><strong>返回字符串</strong>：工具结果是给模型看的文本；出错也是 <code>return "Error: ..."</code> 而非抛异常
            （配合上一卷的 <code>ToolErrorHandlingMiddleware</code>）。</li>
        </ol>
      </KeyIdea>

      <h2>二、统一装配点：get_available_tools</h2>
      <p>
        所有工具最终在 <code>deerflow/tools/tools.py::get_available_tools</code> 汇成一份 <code>list[BaseTool]</code>。它有两类来源：
      </p>
      <CodeBlock lang="python" title="tools/tools.py — get_available_tools（结构）" code={getTools} />
      <ul>
        <li>
          <strong>(A) 配置驱动</strong>：<code>config.yaml</code> 里每条 <code>ToolConfig</code> 有 <code>name / group / use</code>，
          例如 <code>use: deerflow.sandbox.tools:read_file_tool</code>。加载时用 <code>resolve_variable(cfg.use, BaseTool)</code>
          反射出对象，按 <code>group</code> 过滤。配置里的 <code>name</code> 与工具自身 <code>.name</code> 不符会 warn，<strong>以工具 <code>.name</code> 为准</strong>。
        </li>
        <li>
          <strong>(B) 内置硬编码</strong>：<code>present_file_tool</code>、<code>ask_clarification_tool</code> 总在；<code>task_tool</code>
          仅 <code>subagent_enabled=True</code> 时加；vision 模型加 <code>view_image</code>；启用技能演化加 <code>skill_manage</code>。
        </li>
      </ul>

      <h2>三、内置工具目录</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>tool</th><th>来源/条件</th><th>作用</th></tr></thead>
          <tbody>
            <tr><td><code>bash</code></td><td>config <code>bash</code></td><td>沙箱执行 bash（受 <code>is_host_bash_allowed</code> 门控，卷 4）</td></tr>
            <tr><td><code>ls</code> / <code>glob</code> / <code>grep</code></td><td>config <code>file:read</code></td><td>列目录 / 通配匹配 / 内容检索</td></tr>
            <tr><td><code>read_file</code></td><td>config <code>file:read</code></td><td>读文件</td></tr>
            <tr><td><code>write_file</code> / <code>str_replace</code></td><td>config <code>file:write</code></td><td>写文件 / 子串替换（diff 式编辑）</td></tr>
            <tr><td><code>web_search</code> / <code>web_fetch</code> / <code>image_search</code></td><td>config <code>web</code></td><td>检索/抓取（provider 可切：DDG/SearXNG/Tavily/Jina…）</td></tr>
            <tr><td><code>present_files</code></td><td>BUILTIN</td><td>向用户展示产出文件（subagent 禁用）</td></tr>
            <tr><td><code>ask_clarification</code></td><td>BUILTIN（<code>return_direct</code>）</td><td>反问澄清，由 ClarificationMiddleware 拦截中断</td></tr>
            <tr><td><code>task</code></td><td>仅 subagent_enabled</td><td>委派给 subagent（卷 3-2）</td></tr>
            <tr><td><code>view_image</code></td><td>vision 模型</td><td>查看图片</td></tr>
            <tr><td><code>skill_manage</code></td><td>skill_evolution</td><td>管理/演化 skills</td></tr>
            <tr><td><code>tool_search</code></td><td>tool_search + MCP</td><td>按需取回延迟 MCP 工具 schema（见第五节）</td></tr>
          </tbody>
        </table>
      </div>
      <Callout variant="note" title="ask_clarification 是个「空壳」">
        <code>ask_clarification</code> 工具体只是占位（返回一句「processed by middleware」），真正逻辑在
        <code>ClarificationMiddleware</code>——它在 <code>wrap_tool_call</code> 里拦截这个调用并用 <code>Command(goto=END)</code>
        中断 run。这是「工具作为信号、中间件作为执行」的一种典型解耦。
      </Callout>

      <h2>四、按技能策略过滤工具</h2>
      <p>
        装配出工具清单后，<code>make_lead_agent</code> 还会调 <code>filter_tools_by_skill_allowed_tools</code>：如果启用的某些 skill
        声明了 <code>allowed-tools</code>，就把工具集收敛到这些技能允许的并集。<strong>这是 fail-closed 的</strong>：一旦有技能显式声明了
        allowed-tools，未声明该字段的技能只贡献空集（卷 6 的 <code>tool_policy.py</code> 细讲）。
      </p>

      <h2>五、MCP 动态接入与「延迟暴露」</h2>
      <p>
        MCP（Model Context Protocol）工具不是硬编码的，而是从外部 server 拉来的。装配时：
      </p>
      <CodeBlock lang="python" title="MCP 工具加载与打标" code={mcp} />
      <p>
        真正的拉取在 <code>deerflow/mcp/</code>：用 <code>langchain_mcp_adapters</code> 的 <code>MultiServerMCPClient</code> 把
        MCP server 暴露的能力转成 <code>BaseTool</code>，<code>mcp/cache.py</code> 按扩展配置 mtime 缓存。每个 MCP 工具被
        <code>tag_mcp_tool</code> 打上 <code>metadata["deerflow_mcp"]=True</code>——这是「哪些工具算 MCP / 可延迟」的唯一判据。
      </p>
      <KeyIdea title="tool_search：MCP 工具太多怎么办">
        当接了很多 MCP server、工具数量爆炸时，把全部 schema 塞进每次模型调用既费 token 又降低选择准确率。
        deer-flow 的解法：开启 <code>tool_search.enabled</code> 后，<code>assemble_deferred_tools</code> 把所有 <code>is_mcp_tool</code>
        的工具抽进一个 <code>DeferredToolCatalog</code>，system prompt 只列工具名，并注入一个 <code>tool_search</code> 工具。
        模型先调 <code>tool_search(query)</code> 才拿到完整 schema，并通过 <code>Command(update={'{'}"promoted": ...{'}'})</code>
        写进 per-thread state；<code>DeferredToolFilterMiddleware</code>（带 <code>catalog_hash</code>）据此放行已 promote 的工具。
        本质是<strong>「工具的渐进式加载」</strong>——用一次检索换 token 与准确率。
      </KeyIdea>

      <Example title="工具是怎么被模型「看见」的">
        一条龙：<code>get_available_tools</code> 出清单 → 技能策略过滤 → （可选）抽出延迟 MCP 工具 →
        <code>create_agent</code> 把剩下的工具 <code>bind_tools</code> 给模型 → 模型在 system prompt 里看到这些工具的
        function schema → 产出 tool_calls → LangGraph 的 ToolNode 执行 → 结果以 ToolMessage 回喂。下一章我们沿着
        <code>task</code> 这条特殊工具，看委派 subagent 的完整链路。
      </Example>

      <Summary
        points={[
          '工具统一为 LangChain BaseTool，多用 @tool(parse_docstring=True) 定义：docstring 即 schema，首参恒为 description，出错 return "Error:" 而非抛异常。',
          'get_available_tools 合并三类来源：配置驱动（resolve_variable 反射 module:attr）、内置硬编码、MCP 动态接入；按 name 去重（config>builtin>MCP>ACP）。',
          '装配后按技能 allowed-tools 策略 fail-closed 收敛工具集。',
          'MCP 工具由 MultiServerMCPClient 拉取并打 deerflow_mcp 标；tool_search.enabled 时改为「延迟暴露」：模型先 tool_search 再 promote，省 token 提准确率。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const mcpClientCode = `import { spawn, type ChildProcess } from 'node:child_process'
import type { Tool, JSONSchema } from './tools/types.js'
import type { McpServerConfig } from './config.js'

// MCP（Model Context Protocol）客户端：通过 stdio 连接外部 MCP server，
// 把它暴露的工具动态包装成 forge 的 Tool，注册进工具表——能力即插即用。
// 传输用「按行分隔的 JSON-RPC 2.0」（stdio transport）。

interface RpcResponse {
  id: number
  result?: Record<string, unknown>
  error?: { message: string }
}

interface McpToolDef {
  name: string
  description?: string
  inputSchema?: JSONSchema
}

export class McpClient {
  private child: ChildProcess
  private nextId = 1
  private pending = new Map<number, (res: RpcResponse) => void>()
  private buf = ''

  constructor(command: string, args: string[] = []) {
    this.child = spawn(command, args, { stdio: ['pipe', 'pipe', 'inherit'] })
    this.child.stdout!.on('data', (d: Buffer) => this.onData(d.toString()))
  }

  // 收数据：按 \\n 切分，每行一个 JSON-RPC 消息；命中等待中的请求就 resolve。
  private onData(chunk: string): void {
    this.buf += chunk
    let idx: number
    while ((idx = this.buf.indexOf('\\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim()
      this.buf = this.buf.slice(idx + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line) as RpcResponse
        if (typeof msg.id === 'number' && this.pending.has(msg.id)) {
          this.pending.get(msg.id)!(msg)
          this.pending.delete(msg.id)
        }
      } catch {
        // 非 JSON 行忽略
      }
    }
  }

  private request(method: string, params?: unknown): Promise<RpcResponse> {
    const id = this.nextId++
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\\n'
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.child.stdin!.write(payload)
    })
  }

  private notify(method: string, params?: unknown): void {
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\\n')
  }

  // MCP 握手：initialize 请求 + initialized 通知。
  async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'forge', version: '0.1.0' },
    })
    this.notify('notifications/initialized')
  }

  // 拉取 server 的工具列表，逐个包装成 forge Tool。
  async listTools(): Promise<Tool[]> {
    const res = await this.request('tools/list')
    const defs = ((res.result?.tools as McpToolDef[]) ?? []) as McpToolDef[]
    return defs.map((d) => this.wrap(d))
  }

  private wrap(def: McpToolDef): Tool {
    return {
      // 加 mcp__ 前缀，避免和内置工具重名、也让用户一眼看出这是外部工具。
      name: \`mcp__\${def.name}\`,
      description: def.description ?? '',
      readOnly: false, // 外部工具行为未知，保守按写工具对待（要过权限闸门）。
      inputSchema: def.inputSchema ?? { type: 'object', properties: {} },
      execute: async (input) => {
        const res = await this.request('tools/call', { name: def.name, arguments: input })
        if (res.error) return { output: \`MCP 调用失败：\${res.error.message}\`, isError: true }
        const content = (res.result?.content as Array<{ type: string; text?: string }>) ?? []
        const text = content
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('\\n')
        return { output: text || JSON.stringify(res.result ?? {}) }
      },
    }
  }

  close(): void {
    this.child.kill()
  }
}

// 连接配置里声明的所有 MCP server，汇总它们的工具。某个连不上不影响其它。
export async function loadMcpTools(servers: Record<string, McpServerConfig>): Promise<Tool[]> {
  const all: Tool[] = []
  for (const [name, cfg] of Object.entries(servers)) {
    try {
      const client = new McpClient(cfg.command, cfg.args ?? [])
      await client.initialize()
      const tools = await client.listTools()
      all.push(...tools)
    } catch (err) {
      console.error(\`MCP server「\${name}」连接失败：\${(err as Error).message}\`)
    }
  }
  return all
}`

const configCode = `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/notes"]
    }
  }
}`

const indexCode = `const mcpTools = config.mcpServers ? await loadMcpTools(config.mcpServers) : []
// …
const tools: Tool[] = [...ALL_TOOLS, makeTodoTool(todos), taskTool, ...mcpTools]`

const jsonrpcSample = `// 一条 JSON-RPC 2.0「请求」（有 id，对方必须回复）
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }

// 对应的「响应」（id 与请求一致，二选一带 result 或 error）
{ "jsonrpc": "2.0", "id": 1, "result": { "tools": [ /* … */ ] } }

// 一条「通知」（无 id，单向，对方不回复）
{ "jsonrpc": "2.0", "method": "notifications/initialized" }`

const handshakeSample = `// 1) 客户端 → server：initialize（亮明协议版本 + 自我介绍 + 能力声明）
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "forge", "version": "0.1.0" } } }

// 2) server → 客户端：回复自己支持的能力（tools / resources / prompts…）
{ "jsonrpc": "2.0", "id": 1, "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "filesystem", "version": "1.0.0" } } }

// 3) 客户端 → server：initialized 通知，握手完成，可以正式干活了
{ "jsonrpc": "2.0", "method": "notifications/initialized" }`

export default function Ch3() {
  return (
    <article>
      <Lead>
        forge 现在能干的事，都是我们一行行写进源码的工具：读文件、执行命令、搜索。
        但世界上还有无数现成的「工具服务器」——别人写好的数据库连接器、浏览器自动化、第三方 API 网关。
        难道每接一个都要改 forge 源码？这一章，我们让 forge 学会一种通用的「插座」：
        通过 MCP 协议，即插即用地接入外部工具生态。这是第 6 卷的收尾，也是 forge 从「工具」走向「平台」的关键一步。
      </Lead>

      <h2>MCP 是什么，解决什么</h2>
      <p>
        MCP（Model Context Protocol）是一个开放协议，约定了「Agent 客户端」和「工具服务器」之间怎么对话。
        有了它，任何遵循 MCP 的 server 都能被任何 MCP 客户端接入——就像 USB 之于外设：
        厂商各做各的设备，只要插口一致就能用。
      </p>
      <p>
        对 forge 来说，意义很直接：与其把每一种能力都内置进源码，不如让它能连上一个 MCP server，
        把 server 暴露的工具<strong>动态</strong>注册进来。要加能力，不再是「改 forge、重新发版」，
        而是「在配置里写一行、连一个 server」。
      </p>

      <KeyIdea>
        MCP 让「扩展 forge 的能力」从「改 forge 源码」变成「连一个 server」。
        工具的提供者和工具的使用者彻底解耦——这正是平台化的核心。
      </KeyIdea>

      <h2>它从哪来：一点背景</h2>
      <p>
        MCP 由 <strong>Anthropic 于 2024 年底开源</strong>提出。动机很务实：在 MCP 之前，每个 Agent 应用都得为「接入某个数据源 / 工具」单独写一套对接代码——A 应用要连数据库写一遍、B 应用要连同一个数据库再写一遍，是个典型的 M×N 集成爆炸（M 个应用 × N 个数据源）。MCP 的思路是在中间立一个标准协议，把 M×N 变成 M+N：工具方只需写一个 MCP server，所有 MCP 客户端都能用；客户端只需实现一次 MCP 客户端，所有 MCP server 都能接。
      </p>
      <p>
        协议开放之后，生态长得很快——文件系统、Git、各类数据库、浏览器自动化、Slack、GitHub 等都有了现成的 server，并迅速被 Anthropic 之外的多家客户端采纳。这也是为什么我们说接入 MCP 是 forge「从工具走向平台」的关键：你接的不是某一个功能，而是<strong>整个正在生长的生态</strong>。
      </p>

      <Callout variant="tip">
        别被「又一个协议」吓到。MCP 没发明任何新的底层技术——它复用了成熟的 <strong>JSON-RPC 2.0</strong> 做消息格式，复用了 <strong>stdio / HTTP</strong> 做传输。它真正贡献的是一套<em>语义约定</em>：把「Agent 与外部能力对话」这件事，规范成了 tools / resources / prompts 几类标准交互。站在巨人肩上，所以好实现、也好理解。
      </Callout>

      <h2>协议要点：握手 → 列举 → 调用</h2>
      <p>
        MCP 底层是 <strong>JSON-RPC 2.0</strong>。我们用最简单的 <strong>stdio 传输</strong>：
        客户端把 server 当子进程拉起来，双方通过它的标准输入/输出收发消息，
        每条消息是一行 JSON（按 <code>{'\\n'}</code> 分隔）。整个交互分三步走。
      </p>

      <Callout variant="tip">
        <strong>握手</strong>：客户端发 <code>initialize</code> 请求（带协议版本、自我介绍），
        server 回复后，客户端再发一个 <code>notifications/initialized</code> 通知，确认就绪。
        <br />
        <strong>列举</strong>：客户端发 <code>tools/list</code>，server 返回它能提供的工具清单（名字、描述、入参 schema）。
        <br />
        <strong>调用</strong>：客户端发 <code>tools/call</code>（带工具名和参数），server 执行后把结果回传。
      </Callout>

      <h3>先讲清楚 JSON-RPC 2.0</h3>
      <p>
        理解 MCP，绕不开它的消息格式 JSON-RPC 2.0。它简单到只有三种消息形态，记住这三种，整个协议的交互就都看得懂了：
      </p>
      <ul>
        <li><strong>请求（request）</strong>：带 <code>id</code> 和 <code>method</code>。<em>带 id 意味着「我等你回复」</em>——对方<strong>必须</strong>返回一条 id 相同的响应。</li>
        <li><strong>响应（response）</strong>：带与请求相同的 <code>id</code>，并<strong>二选一</strong>带 <code>result</code>（成功）或 <code>error</code>（失败）。</li>
        <li><strong>通知（notification）</strong>：只有 <code>method</code>、<strong>没有 id</strong>。「只发不等回复」的单向消息。</li>
      </ul>

      <CodeBlock lang="json" title="JSON-RPC 2.0 的三种消息" code={jsonrpcSample} />

      <p>
        <code>id</code> 在这里是全部魔法的来源：因为请求和响应靠 <code>id</code> 配对，所以客户端可以<strong>同时把多个请求发出去</strong>而不必排队等，收到响应时按 <code>id</code> 认领即可。这正是我们客户端里 <code>pending</code> 那张 <code>Map&lt;id, resolve&gt;</code> 表的意义——它是「把异步往返按 id 对号入座」的登记簿。
      </p>

      <h3>握手的真实报文</h3>
      <p>
        把握手三步写成真实的 JSON-RPC 报文，就是下面这样。注意第一步和第三步——一个是带 id 的请求（要等回复），一个是不带 id 的通知（发完即走）：
      </p>

      <CodeBlock lang="json" title="initialize 握手的三条消息" code={handshakeSample} />

      <p>
        握手不只是「礼貌性招呼」，它有实质作用：双方借此<strong>协商协议版本</strong>（避免新客户端连老 server 时鸡同鸭讲），并交换<strong>能力声明</strong>（capabilities）——server 借此告诉客户端「我支持 tools，但不支持 resources」，客户端就不会去调它根本没有的能力。这是所有健壮协议的通例：先对齐版本与能力，再开始干活。
      </p>

      <h3>两种传输：stdio 与 SSE/HTTP</h3>
      <p>
        JSON-RPC 只管<strong>消息长什么样</strong>，不管<strong>消息怎么送过去</strong>——后者是「传输层」的事。MCP 定义了两种主流传输，适配不同部署形态：
      </p>

      <table>
        <thead>
          <tr><th></th><th>stdio（本章用的）</th><th>SSE / Streamable HTTP</th></tr>
        </thead>
        <tbody>
          <tr><td>server 在哪</td><td>本机，作为子进程</td><td>远程，独立服务</td></tr>
          <tr><td>怎么收发</td><td>子进程的 stdin / stdout</td><td>HTTP 请求 + SSE 流式回推</td></tr>
          <tr><td>启动方式</td><td>客户端 spawn 起来</td><td>连一个已运行的 URL</td></tr>
          <tr><td>典型场景</td><td>本地文件 / Git / 命令行工具</td><td>团队共享 / SaaS / 跨网络</td></tr>
          <tr><td>认证</td><td>靠本机进程权限</td><td>常配 OAuth / Token</td></tr>
        </tbody>
      </table>

      <p>
        关键洞察：<strong>换传输不改语义</strong>。无论 stdio 还是 HTTP，传的都是同样的 JSON-RPC 消息、走的都是同样的「握手 → 列举 → 调用」流程。所以本章把 stdio 这条传输实现透了，将来要支持远程 server，只是把「读写子进程 stdin/stdout」换成「读写 HTTP/SSE」，上层的 <code>request</code> / <code>notify</code> / <code>wrap</code> 逻辑几乎原样可用。我们刻意从 stdio 入手，正因为它最简单——子进程的标准流，不涉及网络、端口、认证，能把协议本身讲得最干净。
      </p>

      <h2>forge 的 MCP 客户端</h2>
      <p>
        下面是完整实现。它做两件事：用一个 <code>McpClient</code> 类管理一条 stdio 连接（收发 JSON-RPC、把回调式 IO 变成 async/await）；
        再用一个 <code>loadMcpTools</code> 函数遍历配置、把每个 server 的工具汇总成 forge 的 <code>Tool[]</code>。
      </p>

      <CodeBlock lang="ts" title="src/mcp.ts" code={mcpClientCode} />

      <h3>逐段拆解</h3>
      <p>
        <strong>构造函数</strong>：用 <code>spawn</code> 把 server 当子进程起来，
        <code>stdio</code> 设成 <code>['pipe', 'pipe', 'inherit']</code>——stdin/stdout 我们自己接管收发消息，
        stderr 直接继承到终端（方便看 server 的报错）。然后监听 <code>stdout</code> 的 data 事件。
      </p>
      <p>
        <strong>onData</strong>：stdio 是流，一次 data 可能给半行、也可能给好几行。
        所以维护一个缓冲区 <code>buf</code>，每次按 <code>{'\\n'}</code> 切出完整的行来解析。
        解析出 JSON-RPC 响应后，用它的 <code>id</code> 去 <code>pending</code> 表里找对应的等待者，
        命中就 resolve、再从表里删掉。非 JSON 的行（比如 server 偶尔打的日志）直接忽略。
      </p>
      <p>
        <strong>request vs notify</strong>：这是 JSON-RPC 的核心区别。
        <code>request</code> 带 <code>id</code>，对方<strong>必须</strong>回复——所以它返回一个 Promise，
        先把 <code>resolve</code> 函数存进 <code>pending</code>，等 <code>onData</code> 收到同 id 的响应时再调它。
        这一招把「回调式的 stdio 收发」变成了干净的 <code>await</code>，是整个客户端能优雅写下去的关键。
        <code>notify</code> 不带 <code>id</code>，是「只发不等回复」的单向通知（比如 initialized）。
      </p>
      <p>
        <strong>initialize</strong>：就是上面说的握手——一个 <code>initialize</code> 请求 + 一个 <code>initialized</code> 通知。
      </p>
      <p>
        <strong>listTools → wrap</strong>：<code>tools/list</code> 拿回工具定义清单，
        <code>wrap</code> 把每个 MCP 工具包装成 forge 自己的 <code>Tool</code>。三个细节：
        名字加 <code>mcp__</code> 前缀（防止和内置工具重名，也让用户一眼看出这是外部工具）；
        <code>readOnly</code> 设成 <code>false</code>（外部工具会做什么我们不知道，保守起见一律按「写工具」对待，让它们都经过权限闸门）；
        <code>execute</code> 里发一个 <code>tools/call</code>，把返回 <code>content</code> 里 type 为 text 的片段抽出来拼成字符串回灌给模型。
      </p>
      <p>
        <strong>loadMcpTools</strong>：遍历配置里声明的每个 server，逐个连接、初始化、列举工具，汇总进一个数组。
        用 <code>try/catch</code> 包住——某个 server 连不上（命令不存在、握手超时）只打条错误日志，<strong>不影响其它 server 和 forge 本身的启动</strong>。
      </p>

      <h2>怎么配 + 接进入口</h2>
      <p>
        配置里新增一个 <code>{'mcpServers'}</code> 段，键是你给 server 起的名字，值是怎么把它拉起来（命令 + 参数）。
        下面接入一个官方的 filesystem MCP server，让 forge 能操作指定目录：
      </p>

      <CodeBlock lang="json" title=".forge/config.json（声明 MCP server）" code={configCode} />

      <p>
        然后在入口处，启动时连一遍 server、把拿到的工具拼进主工具表：
      </p>

      <CodeBlock lang="ts" title="src/index.ts（装配 MCP 工具）" code={indexCode} />

      <p>
        注意最后一行：<code>mcpTools</code> 和 <code>ALL_TOOLS</code>、<code>taskTool</code> 一起平铺进同一个 <code>Tool[]</code>。
        对主循环来说，MCP 工具和内置工具<strong>没有任何区别</strong>——都是实现了 <code>Tool</code> 契约的对象，
        都有 name、description、inputSchema、execute。
        这就是为什么第 1 卷里我们把工具契约设计得那么干净：契约稳了，扩展才能这么轻。
      </p>

      <Example title="接入后会发生什么">
        <p>
          你在 <code>.forge/config.json</code> 里加上那个 filesystem server，然后启动 forge。
          启动时，forge 把 server 当子进程拉起来、完成握手、调 <code>tools/list</code>，
          拿回比如 <code>read_file</code>、<code>write_file</code>、<code>list_directory</code> 三个工具。
        </p>
        <p>
          于是你的工具表里凭空多出 <code>mcp__read_file</code>、<code>mcp__write_file</code>、<code>mcp__list_directory</code>。
          模型在对话里看到它们，就像看到任何内置工具一样，可以直接调用。
          当它调 <code>mcp__read_file</code> 时，forge 在 <code>execute</code> 里发一个 <code>tools/call</code> 给 server，
          server 执行后把内容回传，forge 抽出文本回灌给模型。
          整个 stdio 往返、JSON-RPC 协议细节，对模型完全透明——它只知道「调了个工具、拿到了结果」。
        </p>
      </Example>

      <Callout variant="warn">
        <strong>安全</strong>：MCP server 是<strong>外部代码</strong>，它的工具能做什么完全取决于 server 实现——
        可能读写你的磁盘、访问网络、执行命令。forge 把所有 MCP 工具标成 <code>readOnly: false</code>，
        强制它们都走第 3 卷的权限闸门（执行前要你确认），这是一道必要的防线。
        但更根本的原则是：<strong>只接入你信任的 server</strong>，就像你不会随便给陌生 U 盘插进电脑一样。
      </Callout>

      <h2>MCP 的三种原语：tools / resources / prompts</h2>
      <p>
        本章只实现了 <strong>tools</strong>，但 MCP 标准里 server 能向客户端暴露的是三类东西。三者分工不同，搞清楚边界，你才知道一个 server 该提供什么、forge 该怎么消费：
      </p>
      <ul>
        <li>
          <strong>Tools（工具）</strong>：可被模型<em>调用</em>的动作，有副作用（读文件、查数据库、发请求）。它是「模型主动决定要做某事」——本章包装的就是这类。对应 <code>tools/list</code> 与 <code>tools/call</code>。
        </li>
        <li>
          <strong>Resources（资源）</strong>：可被<em>读取</em>的上下文数据，由 <em>应用 / 用户</em>决定要不要塞进上下文（一个文件、一段日志、一条数据库记录）。它更像「把素材摆上桌」，而不是「让模型去拿」。对应 <code>resources/list</code> 与 <code>resources/read</code>。
        </li>
        <li>
          <strong>Prompts（提示）</strong>：server 预定义、可参数化的提示模板，通常由<em>用户</em>主动触发（比如一个「代码审查」模板）。它把「好的提问方式」也变成了可分发的资产。对应 <code>prompts/list</code> 与 <code>prompts/get</code>。
        </li>
      </ul>

      <table>
        <thead>
          <tr><th>原语</th><th>谁来主导</th><th>本质</th><th>JSON-RPC 方法</th></tr>
        </thead>
        <tbody>
          <tr><td>Tools</td><td>模型</td><td>可执行的动作（有副作用）</td><td>tools/list · tools/call</td></tr>
          <tr><td>Resources</td><td>应用 / 用户</td><td>可读取的上下文数据</td><td>resources/list · resources/read</td></tr>
          <tr><td>Prompts</td><td>用户</td><td>预定义的提示模板</td><td>prompts/list · prompts/get</td></tr>
        </tbody>
      </table>

      <Callout variant="note">
        这里实现的是<strong>最小可用</strong>的 stdio 客户端——够把 MCP 的原理讲透。
        resources 和 prompts 都能按同样的「JSON-RPC 请求/响应」思路在这个客户端上扩展出来：
        无非是多几个 <code>request('resources/list')</code> / <code>request('prompts/get', …)</code>，再把结果映射成 forge 内部能消费的形状。
        协议的「形状」你已经掌握了，剩下的只是按图索骥地补方法。
      </Callout>

      <Callout variant="warn">
        <strong>几个常见误区，趁早说清楚。</strong>
        其一，「MCP 是 Anthropic 私有的、只能配 Claude 用」——错，它是开放协议，server 与具体模型厂商无关，任何实现了客户端的 Agent 都能接。
        其二，「接了 MCP 就等于装了插件、即开即用」——不尽然，stdio server 要本机能跑起它的启动命令（比如得有 <code>npx</code>、对应包能下载到），连不上会静默退化（我们的 <code>loadMcpTools</code> 就是只打日志不崩）。
        其三，「工具越多越好，把能找到的 server 都接上」——恰恰相反，工具清单会进入模型的上下文，几十上百个工具会稀释模型的注意力、抬高 token 成本、还增加误调用风险。<em>按需接入、保持工具表精简</em>，才是工程上的正解。
      </Callout>

      <h2>第 6 卷小结</h2>
      <p>
        这一卷我们给 forge 装上了「平台三件套」：
        <strong>配置系统</strong>（第 1、2 章，让用户决定用什么模型、连什么 server、开什么开关）、
        <strong>Provider 抽象</strong>（让 forge 不绑死在某一家模型供应商，能随时切换甚至同时支持多家）、
        <strong>MCP</strong>（让 forge 即插即用地接入外部工具生态）。
      </p>

      <KeyIdea>
        配置（选什么）+ Provider 抽象（换模型）+ MCP（接外部工具），
        这三件套让 forge 从一个「写死的工具」变成一个能长久演进、不被任何一家供应商或一组内置工具锁死的<strong>平台</strong>。
      </KeyIdea>

      <p>
        到这里，forge 的能力边界已经基本打开了。下一卷我们转向另一个维度：<strong>生产化</strong>——
        会话恢复（崩了能接着干）、成本（盯住 token 花销）、可观测性（看清它在干什么）、测试（保证它别坏）。
        把一个「能跑」的 Agent，打磨成一个「能放心交给别人用」的 Agent。
      </p>

      <Summary
        points={[
          'MCP 是一套开放协议，让 Agent 客户端和外部工具服务器用统一接口对话，能力即插即用。',
          '协议基于 JSON-RPC 2.0；stdio 传输用按行分隔的 JSON 消息；流程是「握手（initialize + initialized）→ 列举（tools/list）→ 调用（tools/call）」。',
          'McpClient 用 spawn 起子进程、按 \\n 切分缓冲区解析消息、用 id 把回调式 stdio 变成 async/await。',
          'wrap 把每个 MCP 工具包装成 forge 的 Tool：加 mcp__ 前缀防重名、readOnly:false 保守过权限闸门、execute 里发 tools/call 并回灌文本结果。',
          'loadMcpTools 遍历配置逐个连接、单个失败不影响整体；拿到的工具平铺进主工具表，对主循环和内置工具毫无区别。',
          'MCP server 是外部代码，必须只接入可信来源，并依赖权限闸门兜底。',
          '配置 + Provider 抽象 + MCP 三件套，让 forge 成为能长久演进、不被锁死的平台；下一卷进入生产化。',
        ]}
      />
    </article>
  )
}

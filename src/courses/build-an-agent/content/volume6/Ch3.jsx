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

      <Callout variant="note">
        这里实现的是<strong>最小可用</strong>的 stdio 客户端——够把 MCP 的原理讲透。
        完整的 MCP 还有更多东西：资源（resources，把文件/数据暴露给模型当上下文）、
        提示（prompts，server 预定义的提示模板）、以及 SSE/HTTP 传输（用于远程 server）。
        它们都能按同样的「JSON-RPC 请求/响应」思路在这个客户端上扩展出来。
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

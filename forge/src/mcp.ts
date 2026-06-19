import { spawn, type ChildProcess } from 'node:child_process'
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

  // 收数据：按 \n 切分，每行一个 JSON-RPC 消息；命中等待中的请求就 resolve。
  private onData(chunk: string): void {
    this.buf += chunk
    let idx: number
    while ((idx = this.buf.indexOf('\n')) >= 0) {
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
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.child.stdin!.write(payload)
    })
  }

  private notify(method: string, params?: unknown): void {
    this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
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
      name: `mcp__${def.name}`,
      description: def.description ?? '',
      readOnly: false, // 外部工具行为未知，保守按写工具对待（要过权限闸门）。
      inputSchema: def.inputSchema ?? { type: 'object', properties: {} },
      execute: async (input) => {
        const res = await this.request('tools/call', { name: def.name, arguments: input })
        if (res.error) return { output: `MCP 调用失败：${res.error.message}`, isError: true }
        const content = (res.result?.content as Array<{ type: string; text?: string }>) ?? []
        const text = content
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('\n')
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
      console.error(`MCP server「${name}」连接失败：${(err as Error).message}`)
    }
  }
  return all
}

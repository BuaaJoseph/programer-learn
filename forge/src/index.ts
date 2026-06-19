#!/usr/bin/env node
import { Agent } from './agent.js'
import { ALL_TOOLS } from './tools/index.js'
import { makeTodoTool } from './tools/todo.js'
import { makeTaskTool } from './tools/task.js'
import { TodoStore } from './todo.js'
import { createProvider } from './provider/index.js'
import { buildSystemPrompt } from './context.js'
import { startRepl } from './repl.js'
import { FileAuditLog } from './audit.js'
import { loadConfig } from './config.js'
import { loadMcpTools } from './mcp.js'
import { SessionStore, loadLatestSession } from './session.js'
import type { Tool } from './tools/types.js'

const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

// forge 的入口：装配 Provider + 工具 + Agent，挂上事件渲染器，启动 REPL。
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const debug = args.includes('--debug') || args.includes('--verbose')
  const resume = args.includes('--resume')

  const config = loadConfig(process.cwd())

  // API key 可来自配置文件(apiKey) 或环境变量；不同 provider 的默认环境变量不同。
  if (!config.apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.DASHSCOPE_API_KEY) {
    console.error('未找到 API 密钥。请在 ~/.forge/config.json 配置 apiKey，或设置环境变量 ANTHROPIC_API_KEY（百炼用 DASHSCOPE_API_KEY）。')
    process.exit(1)
  }

  const provider = createProvider({
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    contextWindow: config.contextWindow,
  })
  const sessionId = new Date().toISOString().replace(/[:.]/g, '-')
  const audit = new FileAuditLog(process.cwd(), sessionId)
  const session = new SessionStore(process.cwd(), sessionId)
  const todos = new TodoStore()

  // 接入配置里声明的 MCP server，把它们的工具一并注册进来。
  const mcpTools = config.mcpServers ? await loadMcpTools(config.mcpServers) : []

  // 子代理：用主代理的核心工具 + 独立上下文跑子任务，共用主代理的确认通道。
  // 注意子代理的工具里不含 task 本身，避免无限递归派生。
  let agent: Agent
  const taskTool = makeTaskTool(async (prompt, cwd) => {
    const sub = new Agent({
      provider,
      tools: ALL_TOOLS,
      system: buildSystemPrompt(cwd),
      cwd,
      audit,
      maxTurns: 30,
      confirm: (req) => agent.requestConfirm(req),
    })
    return sub.runTurn(prompt)
  })

  // 主代理的完整工具表 = 核心工具 + 任务清单 + 子代理 + MCP 工具。
  const tools: Tool[] = [...ALL_TOOLS, makeTodoTool(todos), taskTool, ...mcpTools]

  agent = new Agent({
    provider,
    tools,
    system: buildSystemPrompt(process.cwd()),
    cwd: process.cwd(),
    audit,
    maxTokens: config.maxTokens,
    onTurnComplete: () => session.save(agent.messages),
    // 事件渲染器：把 Agent 的内部事件画到终端。--debug 时打印更多内部细节。
    onEvent: (e) => {
      switch (e.type) {
        case 'assistant_delta':
          // 流式文本：逐段直接写出，造成「一个字一个字蹦出来」的效果。
          process.stdout.write(e.text)
          break
        case 'tool_start':
          process.stdout.write(`\n${DIM}· ${e.name}(${compact(e.input)})${RESET}\n`)
          break
        case 'tool_end':
          if (e.isError) process.stdout.write(`${RED}  ✗ ${truncate(e.output)}${RESET}\n`)
          else if (debug) process.stdout.write(`${DIM}  ✓ ${truncate(e.output)}${RESET}\n`)
          break
        case 'context_usage':
          if (debug) process.stdout.write(`${DIM}[ctx ${(e.used / 1000).toFixed(1)}k/${(e.limit / 1000).toFixed(0)}k]${RESET}\n`)
          break
        case 'compacted':
          process.stdout.write(`\n${DIM}（上下文已自动压缩：${e.before} 条 → ${e.after} 条）${RESET}\n`)
          break
      }
    },
  })

  if (resume) {
    const prev = loadLatestSession(process.cwd())
    if (prev) {
      agent.loadHistory(prev.messages)
      console.log(`${DIM}（已恢复会话 ${prev.id}，${prev.messages.length} 条消息）${RESET}`)
    } else {
      console.log(`${DIM}（没有可恢复的会话，开新的）${RESET}`)
    }
  }

  await startRepl(agent)
}

function compact(input: Record<string, unknown>): string {
  const s = JSON.stringify(input)
  return s.length > 80 ? s.slice(0, 79) + '…}' : s
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

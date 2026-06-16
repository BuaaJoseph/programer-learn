#!/usr/bin/env node
import { Agent } from './agent.js'
import { ALL_TOOLS } from './tools/index.js'
import { ClaudeProvider } from './provider/claude.js'
import { SYSTEM_PROMPT } from './system.js'
import { startRepl } from './repl.js'

const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

// forge 的入口：装配 Provider + 工具 + Agent，挂上事件渲染器，启动 REPL。
async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('请先设置环境变量 ANTHROPIC_API_KEY')
    process.exit(1)
  }

  const provider = new ClaudeProvider()
  const agent = new Agent({
    provider,
    tools: ALL_TOOLS,
    system: SYSTEM_PROMPT,
    cwd: process.cwd(),
    // 事件渲染器：把 Agent 的内部事件画到终端。
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
          break
      }
    },
  })

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

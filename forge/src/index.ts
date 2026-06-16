#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { Agent } from './agent.js'
import { ALL_TOOLS } from './tools/index.js'
import { ClaudeProvider } from './provider/claude.js'
import { SYSTEM_PROMPT } from './system.js'

// forge 的入口：搭一个最小 REPL，把用户输入交给 Agent，把内部事件打印到终端。
// 这是「卷0~卷1」的里程碑形态；卷2 会把它升级成流式、带斜杠命令的正式 CLI。
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
    onEvent: (e) => {
      if (e.type === 'tool_start') {
        console.log(`\x1b[2m· ${e.name}(${JSON.stringify(e.input)})\x1b[0m`)
      } else if (e.type === 'tool_end' && e.isError) {
        console.log(`\x1b[31m  ✗ ${truncate(e.output)}\x1b[0m`)
      }
    },
  })

  console.log(`forge · 模型 ${provider.model}（输入 exit 退出）\n`)
  const rl = createInterface({ input: stdin, output: stdout, prompt: 'forge> ' })
  rl.prompt()

  for await (const line of rl) {
    const input = line.trim()
    if (input === 'exit' || input === 'quit') break
    if (!input) {
      rl.prompt()
      continue
    }
    try {
      const answer = await agent.runTurn(input)
      if (answer) console.log('\n' + answer + '\n')
    } catch (err) {
      console.error(`\x1b[31m出错：${(err as Error).message}\x1b[0m`)
    }
    rl.prompt()
  }
  rl.close()
  console.log('再见。')
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

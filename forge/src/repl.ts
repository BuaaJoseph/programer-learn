import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import type { Agent } from './agent.js'
import { isCommand, runCommand } from './commands.js'

const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

// REPL：一个「问→答→再问」的交互外壳。负责读输入、分流（斜杠命令 vs 交给 Agent）、优雅退出。
// 回答的流式渲染由 agent 的 onEvent 完成（见 index.ts 的事件渲染器）。
const YELLOW = '\x1b[33m'

export async function startRepl(agent: Agent): Promise<void> {
  console.log(`forge · 模型 ${agent.model}（输入 /help 看命令，/exit 退出）\n`)
  const rl = createInterface({ input: stdin, output: stdout, prompt: 'forge> ' })

  // 把 readline 的提问包成 Promise，方便在异步流程里 await。
  const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res))

  // 危险操作确认：执行有风险的工具前，向用户问一句 y/N（人在回路的闸门）。
  agent.setConfirm(async (req) => {
    console.log(`\n${YELLOW}⚠ forge 想要执行：${req.reason}${RESET}`)
    const ans = (await ask(`${YELLOW}允许吗？[y/N] ${RESET}`)).trim().toLowerCase()
    return ans === 'y' || ans === 'yes'
  })

  let quitting = false
  // Ctrl-C：不直接杀进程，提示一下再优雅关闭，避免任务跑一半被硬切。
  rl.on('SIGINT', () => {
    console.log(`\n${DIM}（再次 Ctrl-C 或输入 /exit 退出）${RESET}`)
    rl.prompt()
  })

  rl.prompt()
  for await (const line of rl) {
    const input = line.trim()
    if (!input) {
      rl.prompt()
      continue
    }

    if (isCommand(input)) {
      runCommand(input, {
        agent,
        print: (s) => console.log(s),
        quit: () => {
          quitting = true
          rl.close()
        },
      })
      if (quitting) break
      rl.prompt()
      continue
    }

    try {
      await agent.runTurn(input)
      process.stdout.write('\n\n')
    } catch (err) {
      console.error(`${RED}出错：${(err as Error).message}${RESET}`)
    }
    rl.prompt()
  }
  rl.close()
  console.log('再见。')
}

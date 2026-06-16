import type { Agent } from './agent.js'
import { ALL_TOOLS } from './tools/index.js'
import { ClaudeProvider } from './provider/claude.js'

// 斜杠命令：以 / 开头的输入不发给 LLM，而是在本地直接处理。
// 这套系统刻意做成「注册表 + 统一派发」，加一个命令 = 往 COMMANDS 里加一项。

export interface CommandContext {
  agent: Agent
  /** 打印一行到终端。 */
  print: (s: string) => void
  /** 请求退出 REPL。 */
  quit: () => void
}

export interface SlashCommand {
  name: string
  description: string
  run(args: string, ctx: CommandContext): void
}

export const COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    description: '列出所有可用命令',
    run(_args, ctx) {
      ctx.print('可用命令：')
      for (const c of COMMANDS) ctx.print(`  /${c.name.padEnd(8)} ${c.description}`)
    },
  },
  {
    name: 'clear',
    description: '清空当前会话历史，从头开始',
    run(_args, ctx) {
      ctx.agent.clearHistory()
      ctx.print('（已清空会话历史）')
    },
  },
  {
    name: 'model',
    description: '查看或切换模型，例如 /model claude-opus-4-8',
    run(args, ctx) {
      const next = args.trim()
      if (!next) {
        ctx.print(`当前模型：${ctx.agent.model}`)
        return
      }
      ctx.agent.setProvider(new ClaudeProvider({ model: next }))
      ctx.print(`已切换模型：${next}`)
    },
  },
  {
    name: 'plan',
    description: '开/关计划模式（只读调研、先给计划再动手）',
    run(_args, ctx) {
      const on = !ctx.agent.inPlanMode
      ctx.agent.setPlanMode(on)
      ctx.print(on ? '已进入计划模式：forge 只会调研并给出计划，不会修改任何东西。' : '已退出计划模式。')
    },
  },
  {
    name: 'cost',
    description: '查看本次会话的 token 用量、估算花费与平均延迟',
    run(_args, ctx) {
      ctx.print(ctx.agent.costSummary())
    },
  },
  {
    name: 'tools',
    description: '列出已注册的工具',
    run(_args, ctx) {
      ctx.print('已注册工具：')
      for (const t of ALL_TOOLS) {
        ctx.print(`  ${t.name.padEnd(7)} ${t.readOnly ? '[只读]' : '[写] '} ${t.description.slice(0, 40)}…`)
      }
    },
  },
  {
    name: 'exit',
    description: '退出 forge',
    run(_args, ctx) {
      ctx.quit()
    },
  },
]

export function isCommand(input: string): boolean {
  return input.startsWith('/')
}

export function runCommand(input: string, ctx: CommandContext): void {
  const [name, ...rest] = input.slice(1).split(/\s+/)
  const cmd = COMMANDS.find((c) => c.name === name)
  if (!cmd) {
    ctx.print(`未知命令 /${name}，输入 /help 查看全部。`)
    return
  }
  cmd.run(rest.join(' '), ctx)
}

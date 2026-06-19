import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { Tool } from './types.js'

const execAsync = promisify(exec)

// bash：执行一条 shell 命令，把 stdout/stderr 收回来。这是最强大也最危险的写工具。
// 后续「安全与人在回路」卷会在它前面加权限闸门；这里先把执行能力做出来。
export const bashTool: Tool = {
  name: 'bash',
  description:
    '在工作目录下执行一条 shell 命令，返回合并后的标准输出与错误输出。用于运行测试、构建、git 等。命令有 60 秒超时。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的 shell 命令。' },
    },
    required: ['command'],
  },
  async execute(input, ctx) {
    const command = String(input.command)
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      })
      const out = (stdout + stderr).trim()
      return { output: out || '(命令执行完毕，无输出)' }
    } catch (err) {
      // 非零退出码会走到这里：把输出和退出信息一并如实回灌，让模型据此纠错。
      const e = err as { stdout?: string; stderr?: string; message: string }
      const out = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
      return { output: `${out}\n[命令失败] ${e.message}`.trim(), isError: true }
    }
  },
}

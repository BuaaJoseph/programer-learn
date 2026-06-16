import { resolve } from 'node:path'
import type { Tool } from './tools/types.js'

// 权限模型：每次工具调用执行前，先由权限策略裁定 allow / ask / deny。
// 设计原则：只读放行、写操作问一句、明确危险的直接拒绝（Deny > Ask > Allow）。

export type Decision = 'allow' | 'ask' | 'deny'

export interface PermissionResult {
  decision: Decision
  /** 给人看的理由 / 这次操作的摘要，用于确认提示与审计。 */
  reason: string
}

// 一眼就该拒绝的破坏性命令（宁可误伤，也不让 Agent 误删整台机器）。
const DESTRUCTIVE = [
  /\brm\s+-[a-z]*r[a-z]*f?\b.*(\/|~|\*)/, // rm -rf / 之类
  /\bmkfs\b/,
  /\bdd\b.*\bof=\/dev\//,
  /:\(\)\s*\{.*\}\s*;:/, // fork bomb
  /\bshutdown\b|\breboot\b/,
  />\s*\/dev\/sd/,
]

export interface PermissionPolicy {
  decide(tool: Tool, input: Record<string, unknown>, cwd: string): PermissionResult
}

// 默认策略。后续「扩展性」卷会让它可由配置文件覆盖（按工具/参数加白名单等）。
export const defaultPolicy: PermissionPolicy = {
  decide(tool, input, cwd) {
    // 1) 只读工具：永远放行。
    if (tool.readOnly) return { decision: 'allow', reason: `${tool.name}（只读）` }

    // 2) bash：按命令内容分级。
    if (tool.name === 'bash') {
      const cmd = String(input.command ?? '')
      if (DESTRUCTIVE.some((re) => re.test(cmd))) {
        return { decision: 'deny', reason: `疑似破坏性命令，已拒绝：${cmd}` }
      }
      return { decision: 'ask', reason: `执行命令：${cmd}` }
    }

    // 3) write / edit：写到 .git 或工作目录之外，直接拒绝；否则问一句。
    if (tool.name === 'write' || tool.name === 'edit') {
      const path = String(input.path ?? '')
      const abs = resolve(cwd, path)
      if (path.includes('.git/') || path.startsWith('.git')) {
        return { decision: 'deny', reason: `拒绝写入 .git 目录：${path}` }
      }
      if (!abs.startsWith(resolve(cwd))) {
        return { decision: 'deny', reason: `拒绝写到工作目录之外：${path}` }
      }
      return { decision: 'ask', reason: `${tool.name === 'write' ? '写入' : '修改'}文件：${path}` }
    }

    // 4) 其它写工具：保守起见，问一句。
    return { decision: 'ask', reason: `执行 ${tool.name}` }
  },
}

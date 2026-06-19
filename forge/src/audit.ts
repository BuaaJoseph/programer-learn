import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// 审计日志：把每一次工具调用、权限裁定、确认结果，以结构化 JSONL 追加到 .forge/audit-*.jsonl。
// 事后可回放、可排查、可信任——这是 Agent 能上生产的前提之一。

export interface AuditEntry {
  ts: string
  type: 'tool_call' | 'permission' | 'confirm' | 'llm_round'
  [key: string]: unknown
}

export interface AuditLog {
  log(entry: Omit<AuditEntry, 'ts'>): void
}

// 写文件的审计实现。落在 <cwd>/.forge/ 下，按会话 id 分文件。
export class FileAuditLog implements AuditLog {
  private file: string

  constructor(cwd: string, sessionId: string) {
    const dir = join(cwd, '.forge')
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, `audit-${sessionId}.jsonl`)
  }

  log(entry: Omit<AuditEntry, 'ts'>): void {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n'
    try {
      appendFileSync(this.file, line, 'utf8')
    } catch {
      // 审计失败不应影响主流程，静默忽略。
    }
  }
}

// 一个什么都不做的审计实现，用于测试或关闭审计时。
export const noopAudit: AuditLog = { log() {} }

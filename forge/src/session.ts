import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Message } from './types.js'

// 会话持久化：把消息历史存盘，支持 forge --resume 接着上次继续。
export interface SessionData {
  id: string
  updated: string
  messages: Message[]
}

export class SessionStore {
  readonly id: string
  private file: string

  constructor(cwd: string, id: string) {
    this.id = id
    const dir = join(cwd, '.forge', 'sessions')
    mkdirSync(dir, { recursive: true })
    this.file = join(dir, `${id}.json`)
  }

  save(messages: Message[]): void {
    const data: SessionData = { id: this.id, updated: new Date().toISOString(), messages }
    try {
      writeFileSync(this.file, JSON.stringify(data, null, 2), 'utf8')
    } catch {
      // 存盘失败不应中断对话
    }
  }
}

// 找最近修改的会话文件并读出来，用于 --resume。
export function loadLatestSession(cwd: string): SessionData | null {
  const dir = join(cwd, '.forge', 'sessions')
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    if (files.length === 0) return null
    let latest = files[0]
    let latestMs = 0
    for (const f of files) {
      const ms = statSync(join(dir, f)).mtimeMs
      if (ms > latestMs) {
        latestMs = ms
        latest = f
      }
    }
    return JSON.parse(readFileSync(join(dir, latest), 'utf8')) as SessionData
  } catch {
    return null
  }
}

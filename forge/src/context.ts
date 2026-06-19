import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:os'
import { SYSTEM_PROMPT } from './system.js'

// 上下文工程：把「基础 system prompt + 运行环境 + 项目记忆(AGENTS.md)」拼成最终的 system。
// 这决定了 forge 每次对话开场就知道：自己是谁、在哪、这个项目有什么约定。

export function buildSystemPrompt(cwd: string): string {
  const parts: string[] = [SYSTEM_PROMPT]

  parts.push(
    [
      '',
      '# 运行环境',
      `- 工作目录：${cwd}`,
      `- 平台：${platform()}`,
      `- 日期：${new Date().toISOString().slice(0, 10)}`,
    ].join('\n'),
  )

  const memory = readProjectMemory(cwd)
  if (memory) {
    parts.push(`\n# 项目约定（来自 AGENTS.md）\n${memory}`)
  }

  return parts.join('\n')
}

// 读取项目根的 AGENTS.md 作为「长期记忆」。找不到返回 null。
export function readProjectMemory(cwd: string): string | null {
  for (const name of ['AGENTS.md', '.forge/AGENTS.md']) {
    try {
      const text = readFileSync(join(cwd, name), 'utf8').trim()
      if (text) return text
    } catch {
      // 文件不存在就跳过
    }
  }
  return null
}

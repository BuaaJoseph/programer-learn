import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Tool } from './types.js'
import { walkFiles, globToRegExp } from './walk.js'

// grep：在文件内容里按正则搜索。只读、可并行。
export const grepTool: Tool = {
  name: 'grep',
  description:
    '在项目文件内容中按正则表达式搜索，返回命中行（含文件名和行号）。可用 include 限定文件范围（glob）。用于「哪里用到了某个函数/字符串」。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: '正则表达式。' },
      include: { type: 'string', description: '可选，只搜匹配此 glob 的文件，如 "*.ts"。' },
    },
    required: ['pattern'],
  },
  async execute(input, ctx) {
    const pattern = String(input.pattern)
    const root = resolve(ctx.cwd)
    let re: RegExp
    try {
      re = new RegExp(pattern)
    } catch (err) {
      return { output: `正则非法：${(err as Error).message}`, isError: true }
    }
    const includeRe = input.include ? globToRegExp(String(input.include)) : null
    let files = await walkFiles(root)
    if (includeRe) files = files.filter((f) => includeRe.test(f))

    const hits: string[] = []
    for (const f of files) {
      if (hits.length >= 200) break
      let text: string
      try {
        text = await readFile(join(root, f), 'utf8')
      } catch {
        continue
      }
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          hits.push(`${f}:${i + 1}: ${lines[i].trim()}`)
          if (hits.length >= 200) break
        }
      }
    }
    if (hits.length === 0) return { output: `没有命中 /${pattern}/` }
    return { output: hits.join('\n') }
  },
}

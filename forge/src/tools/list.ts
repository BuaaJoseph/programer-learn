import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// list：列出一个目录下的条目，目录名带 / 后缀。只读、可并行。
export const listTool: Tool = {
  name: 'list',
  description: '列出指定目录下的文件和子目录（不递归）。目录会以 / 结尾标记。用于了解项目结构。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '目录路径，默认为工作目录。' },
    },
  },
  async execute(input, ctx) {
    const path = input.path ? String(input.path) : '.'
    const abs = resolve(ctx.cwd, path)
    try {
      const entries = await readdir(abs, { withFileTypes: true })
      if (entries.length === 0) return { output: '(空目录)' }
      const lines = entries
        .filter((e) => !e.name.startsWith('.'))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      return { output: lines.join('\n') || '(只有隐藏文件)' }
    } catch (err) {
      return { output: `列目录失败：${(err as Error).message}`, isError: true }
    }
  },
}

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { Tool } from './types.js'

// write：把内容写入文件（覆盖写），需要的父目录会自动创建。这是会改状态的写工具。
export const writeTool: Tool = {
  name: 'write',
  description:
    '把内容写入文件（整文件覆盖写）。父目录不存在会自动创建。用于新建文件或整体替换。改动已有文件的局部请优先用 edit。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '目标文件路径。' },
      content: { type: 'string', description: '要写入的完整内容。' },
    },
    required: ['path', 'content'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const content = String(input.content ?? '')
    const abs = resolve(ctx.cwd, path)
    try {
      await mkdir(dirname(abs), { recursive: true })
      await writeFile(abs, content, 'utf8')
      return { output: `已写入 ${path}（${content.length} 字符）` }
    } catch (err) {
      return { output: `写入失败：${(err as Error).message}`, isError: true }
    }
  },
}

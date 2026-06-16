import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// read：读取一个文本文件的内容。这是 Agent 的「眼睛」之一——只读、安全、可并行。
export const readTool: Tool = {
  name: 'read',
  description:
    '读取一个文本文件并返回其内容。返回的每一行都带行号，方便后续用 edit 工具精确定位。用于查看源码、配置、日志等。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径，相对路径以工作目录为基准。' },
    },
    required: ['path'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const abs = resolve(ctx.cwd, path)
    try {
      const text = await readFile(abs, 'utf8')
      const numbered = text
        .split('\n')
        .map((line, i) => `${String(i + 1).padStart(5)}\t${line}`)
        .join('\n')
      return { output: numbered || '(空文件)' }
    } catch (err) {
      return { output: `读取失败：${(err as Error).message}`, isError: true }
    }
  },
}

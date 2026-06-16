import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Tool } from './types.js'

// edit：精确字符串替换。要求 oldString 在文件中唯一，避免误改——这是写工具里最常用的一个。
export const editTool: Tool = {
  name: 'edit',
  description:
    '对已有文件做精确替换：把 oldString 替换成 newString。oldString 必须在文件中唯一出现（否则报错），所以请带上足够的上下文行。用于局部修改代码。',
  readOnly: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '要修改的文件路径。' },
      oldString: { type: 'string', description: '要被替换的原文（需唯一）。' },
      newString: { type: 'string', description: '替换后的新文本。' },
    },
    required: ['path', 'oldString', 'newString'],
  },
  async execute(input, ctx) {
    const path = String(input.path)
    const oldString = String(input.oldString)
    const newString = String(input.newString)
    const abs = resolve(ctx.cwd, path)
    try {
      const text = await readFile(abs, 'utf8')
      if (oldString === newString) {
        return { output: 'oldString 与 newString 相同，无需修改。', isError: true }
      }
      const first = text.indexOf(oldString)
      if (first === -1) {
        return { output: '未找到 oldString，文件未改动。请确认原文（含缩进/空白）完全一致。', isError: true }
      }
      if (text.indexOf(oldString, first + 1) !== -1) {
        return { output: 'oldString 在文件中出现多次，无法确定改哪一处。请加入更多上下文使其唯一。', isError: true }
      }
      const next = text.slice(0, first) + newString + text.slice(first + oldString.length)
      await writeFile(abs, next, 'utf8')
      return { output: `已修改 ${path}` }
    } catch (err) {
      return { output: `修改失败：${(err as Error).message}`, isError: true }
    }
  },
}

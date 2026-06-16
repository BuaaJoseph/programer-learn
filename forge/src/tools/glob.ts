import { resolve } from 'node:path'
import type { Tool } from './types.js'
import { walkFiles, globToRegExp } from './walk.js'

// glob：按文件名模式查找文件，比如 "src/**/*.ts"。只读、可并行。
export const globTool: Tool = {
  name: 'glob',
  description:
    '按 glob 模式查找文件路径，支持 * 与 **，例如 "src/**/*.ts"。返回匹配的相对路径列表。用于「这个项目里所有 X 文件在哪」。',
  readOnly: true,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'glob 模式，如 **/*.json' },
    },
    required: ['pattern'],
  },
  async execute(input, ctx) {
    const pattern = String(input.pattern)
    const root = resolve(ctx.cwd)
    const re = globToRegExp(pattern)
    const files = await walkFiles(root)
    const matched = files.filter((f) => re.test(f)).sort()
    if (matched.length === 0) return { output: `没有匹配 ${pattern} 的文件` }
    const head = matched.slice(0, 200)
    const more = matched.length > head.length ? `\n…还有 ${matched.length - head.length} 个` : ''
    return { output: head.join('\n') + more }
  },
}

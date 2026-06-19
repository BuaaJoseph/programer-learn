import type { Tool } from './types.js'
import { readTool } from './read.js'
import { listTool } from './list.js'
import { globTool } from './glob.js'
import { grepTool } from './grep.js'
import { writeTool } from './write.js'
import { editTool } from './edit.js'
import { bashTool } from './bash.js'

// 工具注册表：主循环从这里拿到全部工具，按名字派发执行。
// 新增一个工具 = 在这里加一行。
export const ALL_TOOLS: Tool[] = [
  // 只读（眼睛）
  readTool,
  listTool,
  globTool,
  grepTool,
  // 写（手）
  writeTool,
  editTool,
  bashTool,
]

export function buildToolRegistry(tools: Tool[] = ALL_TOOLS): Map<string, Tool> {
  const map = new Map<string, Tool>()
  for (const t of tools) map.set(t.name, t)
  return map
}

export type { Tool } from './types.js'

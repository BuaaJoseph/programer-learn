import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// 配置系统：两级配置，全局级(~/.forge/config.json) 与 项目级(<cwd>/.forge/config.json)。
// 项目级优先（覆盖全局级），这样既能有全局默认、又能让单个项目特殊化。

export interface McpServerConfig {
  command: string
  args?: string[]
}

export interface ForgeConfig {
  /** Provider 名称，默认 claude。 */
  provider?: string
  /** 模型标识。 */
  model?: string
  /** 单轮最大输出 token。 */
  maxTokens?: number
  /** 上下文窗口大小。 */
  contextWindow?: number
  /** 要接入的 MCP server 列表，键为名字。 */
  mcpServers?: Record<string, McpServerConfig>
}

function readJson(path: string): Partial<ForgeConfig> {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Partial<ForgeConfig>
  } catch {
    return {} // 文件不存在或非法都视为空配置
  }
}

export function loadConfig(cwd: string): ForgeConfig {
  const global = readJson(join(homedir(), '.forge', 'config.json'))
  const project = readJson(join(cwd, '.forge', 'config.json'))
  // 浅合并即可：项目级整体覆盖全局级的同名顶层字段。
  return { ...global, ...project }
}

import type { AssistantTurn, Message } from '../types.js'
import type { Tool } from '../tools/types.js'

// Provider：forge 与具体 LLM 之间的薄边界。主循环只依赖这个接口，不关心背后是谁。
// 默认实现是 Claude（见 claude.ts）；后续「扩展性」卷会让它可插拔。
export interface CompleteParams {
  system: string
  messages: Message[]
  tools: Tool[]
  maxTokens: number
}

export interface Provider {
  /** 这个 provider 当前使用的模型标识，用于展示与日志。 */
  readonly model: string
  /** 发一轮请求，拿回模型这一轮的完整回复。 */
  complete(params: CompleteParams): Promise<AssistantTurn>
}

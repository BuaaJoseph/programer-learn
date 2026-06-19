import type { AssistantTurn, Message } from '../types.js'
import type { Tool } from '../tools/types.js'

// Provider：forge 与具体 LLM 之间的薄边界。主循环只依赖这个接口，不关心背后是谁。
// 默认实现是 Claude（见 claude.ts）；后续「扩展性」卷会让它可插拔。
export interface CompleteParams {
  system: string
  messages: Message[]
  tools: Tool[]
  maxTokens: number
  /** 流式文本回调：每收到一段增量文本就调用一次。用于让回答逐字蹦出来。 */
  onTextDelta?: (delta: string) => void
}

export interface Provider {
  /** 这个 provider 当前使用的模型标识，用于展示与日志。 */
  readonly model: string
  /** 这个模型的上下文窗口大小（token 数），用于 token 预算与自动压缩。 */
  readonly contextWindow: number
  /** 发一轮请求，拿回模型这一轮的完整回复。 */
  complete(params: CompleteParams): Promise<AssistantTurn>
  /** 估算给定 system + messages + tools 会占用多少输入 token（用于预算）。 */
  countTokens(params: Omit<CompleteParams, 'onTextDelta' | 'maxTokens'>): Promise<number>
}

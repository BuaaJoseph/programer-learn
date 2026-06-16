// forge 的核心类型。我们刻意定义自己的消息/内容类型，而不是直接散用 SDK 的类型，
// 这样「Agent 内核」与「具体某个 LLM Provider」之间有一层清晰的边界（见 src/provider）。

/** 一段文本输出。 */
export interface TextBlock {
  type: 'text'
  text: string
}

/** 模型发起的一次工具调用（它只给「意图」，真正执行的是 forge）。 */
export interface ToolUseBlock {
  type: 'tool_use'
  /** SDK 生成的唯一 id，回灌结果时要原样带回。 */
  id: string
  /** 工具名，对应工具注册表里的某个工具。 */
  name: string
  /** 模型填好的参数。 */
  input: Record<string, unknown>
}

/** 一次工具执行的结果，回灌给模型。 */
export interface ToolResultBlock {
  type: 'tool_result'
  /** 必须与对应 tool_use 的 id 一致，模型靠它把结果和调用对上。 */
  tool_use_id: string
  content: string
  /** 工具执行是否出错；出错时也要如实告诉模型，让它自己纠偏。 */
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

/** 扁平消息历史里的一条消息。system 单独传，不进 messages 列表。 */
export interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
}

/** 模型一轮回复里的「用量」信息，用于成本/上下文统计。 */
export interface Usage {
  inputTokens: number
  outputTokens: number
}

/** Provider 返回的一轮完整结果。 */
export interface AssistantTurn {
  /** 这一轮的全部内容块（文本 + 工具调用）。 */
  content: ContentBlock[]
  /** 模型为什么停下：end_turn 表示没有更多工具调用、可以收尾。 */
  stopReason: string | null
  usage: Usage
}

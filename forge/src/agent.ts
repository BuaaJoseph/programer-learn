import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from './types.js'
import type { Tool, ToolContext } from './tools/types.js'
import type { Provider } from './provider/types.js'
import { buildToolRegistry } from './tools/index.js'

export interface AgentOptions {
  provider: Provider
  tools: Tool[]
  system: string
  cwd: string
  maxTokens?: number
  /** 安全阀：单次任务最多转多少轮，防止失控空转。 */
  maxTurns?: number
  /** 把内部事件回调给上层（CLI 用它做展示）。 */
  onEvent?: (e: AgentEvent) => void
}

export type AgentEvent =
  | { type: 'assistant_delta'; text: string } // 流式增量文本，一段段到达
  | { type: 'assistant_text'; text: string } // 一轮的完整文本（增量结束后）
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; output: string; isError: boolean }

// Agent 主循环：维护一份扁平消息历史，反复「调模型 → 执行工具 → 回灌」，直到模型不再调用工具。
export class Agent {
  private provider: Provider
  private registry: Map<string, Tool>
  private toolList: Tool[]
  private system: string
  private ctx: ToolContext
  private maxTokens: number
  private maxTurns: number
  private onEvent?: (e: AgentEvent) => void
  /** 跨多次 runTurn 持续累积的会话历史。 */
  messages: Message[] = []

  constructor(opts: AgentOptions) {
    this.provider = opts.provider
    this.toolList = opts.tools
    this.registry = buildToolRegistry(opts.tools)
    this.system = opts.system
    this.ctx = { cwd: opts.cwd }
    this.maxTokens = opts.maxTokens ?? 8192
    this.maxTurns = opts.maxTurns ?? 50
    this.onEvent = opts.onEvent
  }

  /** 当前使用的模型标识（来自 Provider）。 */
  get model(): string {
    return this.provider.model
  }

  /** 清空会话历史（供 /clear 等命令使用）。 */
  clearHistory(): void {
    this.messages = []
  }

  /** 替换底层 Provider（供 /model 切换模型使用）。 */
  setProvider(provider: Provider): void {
    this.provider = provider
  }

  /** 处理用户的一条输入，跑到模型给出最终文本为止，返回最终回答。 */
  async runTurn(userInput: string): Promise<string> {
    this.messages.push({ role: 'user', content: [{ type: 'text', text: userInput }] })

    let finalText = ''
    for (let turn = 0; turn < this.maxTurns; turn++) {
      const res = await this.provider.complete({
        system: this.system,
        messages: this.messages,
        tools: this.toolList,
        maxTokens: this.maxTokens,
        onTextDelta: (delta) => this.onEvent?.({ type: 'assistant_delta', text: delta }),
      })
      this.messages.push({ role: 'assistant', content: res.content })

      const text = res.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('')
      if (text) this.onEvent?.({ type: 'assistant_text', text })

      const toolUses = res.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
      if (toolUses.length === 0) {
        finalText = text
        break // 没有工具调用 = 活干完了，停。
      }

      const results = await this.runTools(toolUses)
      this.messages.push({ role: 'user', content: results })
    }
    return finalText
  }

  // 工具调度：把一轮里的工具调用按「只读」分两组。
  // 只读的并发执行（互不影响、省时间）；写的串行执行（会改状态、保一致性）。
  private async runTools(toolUses: ToolUseBlock[]): Promise<ToolResultBlock[]> {
    const reads = toolUses.filter((t) => this.registry.get(t.name)?.readOnly)
    const writes = toolUses.filter((t) => !this.registry.get(t.name)?.readOnly)

    const readResults = await Promise.all(reads.map((t) => this.execOne(t)))
    const writeResults: ToolResultBlock[] = []
    for (const t of writes) writeResults.push(await this.execOne(t))

    // 回灌顺序按模型原始调用顺序排列，便于它对应。
    const byId = new Map<string, ToolResultBlock>()
    for (const r of [...readResults, ...writeResults]) byId.set(r.tool_use_id, r)
    return toolUses.map((t) => byId.get(t.id)!)
  }

  private async execOne(call: ToolUseBlock): Promise<ToolResultBlock> {
    const tool = this.registry.get(call.name)
    this.onEvent?.({ type: 'tool_start', name: call.name, input: call.input })
    if (!tool) {
      const msg = `未知工具：${call.name}`
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
    try {
      const r = await tool.execute(call.input, this.ctx)
      this.onEvent?.({ type: 'tool_end', name: call.name, output: r.output, isError: !!r.isError })
      return { type: 'tool_result', tool_use_id: call.id, content: r.output, is_error: r.isError }
    } catch (err) {
      const msg = `工具异常：${(err as Error).message}`
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
  }
}

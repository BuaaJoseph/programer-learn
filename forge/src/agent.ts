import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from './types.js'
import type { Tool, ToolContext } from './tools/types.js'
import type { Provider } from './provider/types.js'
import { buildToolRegistry } from './tools/index.js'
import { defaultPolicy, type PermissionPolicy } from './permissions.js'
import { noopAudit, type AuditLog } from './audit.js'
import { renderTranscript, COMPACTION_SYSTEM } from './compaction.js'
import { CostTracker } from './cost.js'

/** 危险操作确认请求：交给上层（CLI）向用户问一句 y/N。 */
export interface ConfirmRequest {
  tool: string
  input: Record<string, unknown>
  /** 给人看的这次操作摘要。 */
  reason: string
}

const PLAN_MODE_SUFFIX = `

# 计划模式（重要）
当前处于计划模式：你只能使用只读工具（read/list/glob/grep）调研，绝对不要修改文件或执行写操作。
请先把相关代码看清楚，然后用文字给出一份清晰的分步计划，等待用户批准后再退出计划模式动手。`

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
  /** 权限策略，默认 defaultPolicy。 */
  permissions?: PermissionPolicy
  /** 需要确认时回调上层；返回 true 表示用户同意执行。不提供则视为拒绝。 */
  confirm?: (req: ConfirmRequest) => Promise<boolean>
  /** 审计日志，默认不记录。 */
  audit?: AuditLog
  /** 上下文占用超过窗口的这个比例时，触发自动压缩。默认 0.8。 */
  compactThreshold?: number
  /** 每处理完用户的一轮输入后回调（用于持久化会话等）。 */
  onTurnComplete?: () => void
}

export type AgentEvent =
  | { type: 'assistant_delta'; text: string } // 流式增量文本，一段段到达
  | { type: 'assistant_text'; text: string } // 一轮的完整文本（增量结束后）
  | { type: 'tool_start'; name: string; input: Record<string, unknown> }
  | { type: 'tool_end'; name: string; output: string; isError: boolean }
  | { type: 'context_usage'; used: number; limit: number } // 本轮上下文 token 占用
  | { type: 'compacted'; before: number; after: number } // 自动压缩前后的消息条数

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
  private policy: PermissionPolicy
  private confirm?: (req: ConfirmRequest) => Promise<boolean>
  private audit: AuditLog
  private compactThreshold: number
  /** 标记：下一轮开始前需要先压缩历史。 */
  private needCompact = false
  /** 计划模式：只读探索、产出计划、不改任何东西。 */
  private planMode = false
  private cost = new CostTracker()
  private onTurnComplete?: () => void
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
    this.policy = opts.permissions ?? defaultPolicy
    this.confirm = opts.confirm
    this.audit = opts.audit ?? noopAudit
    this.compactThreshold = opts.compactThreshold ?? 0.8
    this.onTurnComplete = opts.onTurnComplete
  }

  /** 恢复历史（供 --resume 使用）。 */
  loadHistory(messages: Message[]): void {
    this.messages = messages
  }

  /** 成本/延迟统计摘要（供 /cost 命令使用）。 */
  costSummary(): string {
    return this.cost.summary(this.provider.model)
  }

  /** 设置危险操作确认回调（供 REPL 注入 y/N 提问）。 */
  setConfirm(confirm: (req: ConfirmRequest) => Promise<boolean>): void {
    this.confirm = confirm
  }

  /** 走当前确认回调问一句（供子代理复用主代理的确认通道）。 */
  requestConfirm(req: ConfirmRequest): Promise<boolean> {
    return this.confirm ? this.confirm(req) : Promise.resolve(false)
  }

  /** 开/关计划模式。开启后只允许只读工具、要求先给计划。 */
  setPlanMode(on: boolean): void {
    this.planMode = on
  }

  get inPlanMode(): boolean {
    return this.planMode
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
      // 在每轮开始前（消息历史处于完整状态时）检查是否需要压缩。
      if (this.needCompact) await this.compact()

      // 计划模式：只给只读工具，并在 system 末尾加上「只调研、给计划、别动手」的约束。
      const tools = this.planMode ? this.toolList.filter((t) => t.readOnly) : this.toolList
      const system = this.planMode ? this.system + PLAN_MODE_SUFFIX : this.system

      const t0 = Date.now()
      const res = await this.provider.complete({
        system,
        messages: this.messages,
        tools,
        maxTokens: this.maxTokens,
        onTextDelta: (delta) => this.onEvent?.({ type: 'assistant_delta', text: delta }),
      })
      this.cost.add(res.usage, Date.now() - t0)
      this.audit.log({ type: 'llm_round', model: this.provider.model, stopReason: res.stopReason, usage: res.usage })
      this.messages.push({ role: 'assistant', content: res.content })

      // token 预算：用本轮真实的输入 token 估算上下文占用，逼近窗口就标记压缩。
      const limit = this.provider.contextWindow
      this.onEvent?.({ type: 'context_usage', used: res.usage.inputTokens, limit })
      if (res.usage.inputTokens > limit * this.compactThreshold) this.needCompact = true

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
    this.onTurnComplete?.()
    return finalText
  }

  // 自动压缩：把当前历史摊平成文本、让模型总结成一段摘要，再用这段摘要替换整个历史。
  // 这样上下文从「一长串原始消息」缩成「一段摘要」，会话得以继续而不溢出窗口。
  private async compact(): Promise<void> {
    const before = this.messages.length
    const transcript = renderTranscript(this.messages)
    const res = await this.provider.complete({
      system: COMPACTION_SYSTEM,
      messages: [{ role: 'user', content: [{ type: 'text', text: transcript }] }],
      tools: [],
      maxTokens: 2048,
    })
    const summary = res.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    // 用摘要重置历史。保留为一条 user 消息，作为后续对话的“前情提要”。
    this.messages = [{ role: 'user', content: [{ type: 'text', text: `【前情提要（自动压缩）】\n${summary}` }] }]
    this.needCompact = false
    this.audit.log({ type: 'llm_round', model: this.provider.model, stopReason: 'compaction', usage: res.usage })
    this.onEvent?.({ type: 'compacted', before, after: this.messages.length })
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

    // —— 安全闸门：执行前先过权限策略 ——
    const verdict = this.policy.decide(tool, call.input, this.ctx.cwd)
    this.audit.log({ type: 'permission', tool: tool.name, input: call.input, decision: verdict.decision, reason: verdict.reason })
    if (verdict.decision === 'deny') {
      const msg = `已被权限策略拒绝：${verdict.reason}`
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
    if (verdict.decision === 'ask') {
      const approved = this.confirm ? await this.confirm({ tool: tool.name, input: call.input, reason: verdict.reason }) : false
      this.audit.log({ type: 'confirm', tool: tool.name, reason: verdict.reason, approved })
      if (!approved) {
        const msg = '用户拒绝了这次操作。'
        this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
        return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
      }
    }

    try {
      const r = await tool.execute(call.input, this.ctx)
      this.audit.log({ type: 'tool_call', tool: call.name, input: call.input, isError: !!r.isError })
      this.onEvent?.({ type: 'tool_end', name: call.name, output: r.output, isError: !!r.isError })
      return { type: 'tool_result', tool_use_id: call.id, content: r.output, is_error: r.isError }
    } catch (err) {
      const msg = `工具异常：${(err as Error).message}`
      this.audit.log({ type: 'tool_call', tool: call.name, input: call.input, isError: true, error: msg })
      this.onEvent?.({ type: 'tool_end', name: call.name, output: msg, isError: true })
      return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true }
    }
  }
}

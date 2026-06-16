import OpenAI from 'openai'
import type { AssistantTurn, ContentBlock, Message } from '../types.js'
import type { Tool } from '../tools/types.js'
import type { CompleteParams, Provider } from './types.js'

// 百炼（阿里云 DashScope）Provider：走 OpenAI 兼容接口接入 Qwen 等模型。
// 它和 ClaudeProvider 实现的是同一个 Provider 接口——主循环、工具、CLI 一行都不用改，
// 这就是卷6「Provider 抽象」的回报：换一个完全不同厂商的模型，只是多一个文件 + 注册一行。
export const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const BAILIAN_DEFAULT_MODEL = 'qwen-max'

export class BailianProvider implements Provider {
  readonly model: string
  readonly contextWindow: number
  private client: OpenAI

  constructor(opts: { model?: string; apiKey?: string; baseURL?: string; contextWindow?: number } = {}) {
    this.model = opts.model ?? BAILIAN_DEFAULT_MODEL
    this.contextWindow = opts.contextWindow ?? 32_768
    this.client = new OpenAI({
      apiKey: opts.apiKey ?? process.env.DASHSCOPE_API_KEY,
      baseURL: opts.baseURL ?? BAILIAN_BASE_URL,
    })
  }

  async complete(params: CompleteParams): Promise<AssistantTurn> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: params.maxTokens,
      messages: toOpenAIMessages(params.system, params.messages),
      tools: params.tools.length ? params.tools.map(toOpenAITool) : undefined,
      stream: true,
      stream_options: { include_usage: true },
    })

    let text = ''
    let finish: string | null = null
    let inputTokens = 0
    let outputTokens = 0
    // tool_calls 在流里是分片到达的，按 index 累积。
    const calls = new Map<number, { id: string; name: string; args: string }>()

    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      const delta = choice?.delta
      if (delta?.content) {
        text += delta.content
        params.onTextDelta?.(delta.content)
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const cur = calls.get(tc.index) ?? { id: '', name: '', args: '' }
          if (tc.id) cur.id = tc.id
          if (tc.function?.name) cur.name = tc.function.name
          if (tc.function?.arguments) cur.args += tc.function.arguments
          calls.set(tc.index, cur)
        }
      }
      if (choice?.finish_reason) finish = choice.finish_reason
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens
        outputTokens = chunk.usage.completion_tokens
      }
    }

    const content: ContentBlock[] = []
    if (text) content.push({ type: 'text', text })
    for (const c of calls.values()) {
      content.push({ type: 'tool_use', id: c.id, name: c.name, input: safeParse(c.args) })
    }

    return {
      content,
      // 把 OpenAI 的 finish_reason 归一到 forge 的语义：tool_calls→tool_use，stop→end_turn。
      stopReason: finish === 'tool_calls' ? 'tool_use' : finish === 'stop' ? 'end_turn' : finish,
      usage: { inputTokens, outputTokens },
    }
  }

  // OpenAI 兼容接口没有专门的计 token 端点，这里给个粗略估算（够用于预算提示）。
  async countTokens(params: Omit<CompleteParams, 'onTextDelta' | 'maxTokens'>): Promise<number> {
    const blob = params.system + JSON.stringify(params.messages) + JSON.stringify(params.tools.map((t) => t.inputSchema))
    return Math.ceil(blob.length / 3)
  }
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s || '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

// ---- forge 类型 → OpenAI 类型 的翻译 ----

function toOpenAITool(tool: Tool): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema as unknown as Record<string, unknown>,
    },
  }
}

// forge 把工具结果存成「一条 user 消息里的 tool_result 块」，而 OpenAI 要求工具结果是独立的
// role:'tool' 消息、助手的工具调用放在 role:'assistant' 的 tool_calls 上——这里做拆分映射。
function toOpenAIMessages(system: string, messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
  if (system) out.push({ role: 'system', content: system })

  for (const m of messages) {
    if (m.role === 'assistant') {
      const text = m.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('')
      const toolUses = m.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
      const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = { role: 'assistant', content: text || null }
      if (toolUses.length) {
        msg.tool_calls = toolUses.map((t) => ({
          id: t.id,
          type: 'function',
          function: { name: t.name, arguments: JSON.stringify(t.input) },
        }))
      }
      out.push(msg)
    } else {
      for (const b of m.content) {
        if (b.type === 'text') {
          out.push({ role: 'user', content: b.text })
        } else if (b.type === 'tool_result') {
          out.push({ role: 'tool', tool_call_id: b.tool_use_id, content: b.content })
        }
      }
    }
  }
  return out
}

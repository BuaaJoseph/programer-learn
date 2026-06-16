import Anthropic from '@anthropic-ai/sdk'
import type { AssistantTurn, ContentBlock, Message } from '../types.js'
import type { Tool } from '../tools/types.js'
import type { CompleteParams, Provider } from './types.js'

// forge 的默认 Provider：Claude。把 forge 自己的消息/工具类型翻译成 Anthropic SDK 的形状，
// 调用 messages.create，再把结果翻译回 forge 的 AssistantTurn。所有「方言」都收在这一个文件里。
export const DEFAULT_MODEL = 'claude-opus-4-8'

export class ClaudeProvider implements Provider {
  readonly model: string
  private client: Anthropic

  constructor(opts: { model?: string; apiKey?: string } = {}) {
    this.model = opts.model ?? DEFAULT_MODEL
    // 不传 apiKey 时，SDK 会自动读取环境变量 ANTHROPIC_API_KEY。
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {})
  }

  async complete(params: CompleteParams): Promise<AssistantTurn> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages.map(toSdkMessage),
      tools: params.tools.map(toSdkTool),
      // 复杂任务默认开启自适应思考（Opus 4.8 只支持 adaptive 这一种开启方式）。
      // 注：部分 SDK 版本的类型尚未收录 'adaptive'，运行时已支持，这里做一次类型放行。
      thinking: { type: 'adaptive' } as unknown as Anthropic.ThinkingConfigParam,
    })

    const content: ContentBlock[] = []
    for (const block of res.content) {
      if (block.type === 'text') {
        content.push({ type: 'text', text: block.text })
      } else if (block.type === 'tool_use') {
        content.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        })
      }
      // thinking 块不进我们的历史模型（展示由上层决定）；这里只取 text 与 tool_use。
    }

    return {
      content,
      stopReason: res.stop_reason,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      },
    }
  }
}

// ---- forge 类型 → SDK 类型 的翻译 ----

function toSdkMessage(msg: Message): Anthropic.MessageParam {
  return {
    role: msg.role,
    content: msg.content.map((b): Anthropic.ContentBlockParam => {
      switch (b.type) {
        case 'text':
          return { type: 'text', text: b.text }
        case 'tool_use':
          return { type: 'tool_use', id: b.id, name: b.name, input: b.input }
        case 'tool_result':
          return {
            type: 'tool_result',
            tool_use_id: b.tool_use_id,
            content: b.content,
            is_error: b.is_error,
          }
      }
    }),
  }
}

function toSdkTool(tool: Tool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }
}

import type { Message } from './types.js'

// 自动压缩：上下文快满时，把早期历史「总结成一段摘要」替换掉原始消息，给会话续命。
// 这里负责两件准备工作：把结构化消息渲染成纯文本记录、提供压缩用的 system 指令。

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…(截断)' : s
}

// 把 messages（含工具调用/结果块）摊平成一段可读的纯文本记录，喂给模型去总结。
// 之所以先摊平成文本，是为了避免把 tool_use/tool_result 块原样塞进一个无工具定义的请求里。
export function renderTranscript(messages: Message[]): string {
  const lines: string[] = []
  for (const m of messages) {
    for (const b of m.content) {
      if (b.type === 'text') {
        lines.push(`【${m.role === 'user' ? '用户' : '助手'}】${b.text}`)
      } else if (b.type === 'tool_use') {
        lines.push(`【助手·调用工具】${b.name}(${truncate(JSON.stringify(b.input), 300)})`)
      } else if (b.type === 'tool_result') {
        lines.push(`【工具结果${b.is_error ? '·出错' : ''}】${truncate(b.content, 600)}`)
      }
    }
  }
  return lines.join('\n')
}

export const COMPACTION_SYSTEM = `你是一个对话压缩器。下面是一个编码 Agent 与用户的工作记录。
请把它压缩成一段简洁但信息完整的中文摘要，必须保留：
- 用户的原始目标与任何明确要求/约束
- 已经做出的修改（涉及的文件路径）与关键决定
- 重要的发现、结论、踩过的坑
- 尚未完成的待办事项
不要寒暄，不要复述无关细节，只输出摘要正文。`

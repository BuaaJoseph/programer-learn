// 面试相关的前端 API 客户端：
//   - chatStream：流式调用大模型面试官（经后端代理转发到用户提供的 url + ak）
//   - runCode：执行用户代码（经后端代理转发到代码执行服务）
// 经后端代理的好处：规避浏览器跨域、隐藏 ak、统一错误处理。
const BASE = (import.meta.env?.VITE_API_BASE || '') + '/api'

// 流式对话。messages 为 OpenAI 风格 [{role, content}]。
// onDelta(textChunk) 每收到一段增量文本回调一次；返回完整文本。
// signal 可用于中断（AbortController）。
export async function chatStream({ url, apiKey, model, messages }, onDelta, signal) {
  const res = await fetch(BASE + '/interview/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, apiKey, model, messages, stream: true }),
    signal,
  })
  if (!res.ok || !res.body) {
    let msg = `面试官服务异常 (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) msg = data.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let full = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // 按 SSE 事件（以空行分隔）解析
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content ??
          ''
        if (delta) {
          full += delta
          onDelta && onDelta(delta)
        }
      } catch { /* 非 JSON 行忽略 */ }
    }
  }
  return full
}

// 非流式对话（备用）。返回完整文本。
export async function chatOnce({ url, apiKey, model, messages }, signal) {
  const res = await fetch(BASE + '/interview/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, apiKey, model, messages, stream: false }),
    signal,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `面试官服务异常 (${res.status})`)
  return data?.content || ''
}

// 执行代码。language: 'java' | 'python'。返回 { stdout, stderr, code, output }。
export async function runCode({ language, source, stdin = '' }, signal) {
  const res = await fetch(BASE + '/interview/run-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ language, source, stdin }),
    signal,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `代码执行服务异常 (${res.status})`)
  return data
}

// 面试相关的前端 API 客户端：
//   - getConfig / ping：查询面试官模型是否已在服务端配置、测试连通性
//   - chatStream / chatOnce：调用面试官（接口地址与密钥在服务端 env 配置，前端不再传）
//   - runCode：执行用户代码（经后端代理转发到代码执行服务）
import { getToken } from '../../shared/api.js'

const BASE = (import.meta.env?.VITE_API_BASE || '') + '/api'

// 带上登录 token（面试相关接口需登录）。
function authHeaders(extra = {}) {
  const t = getToken()
  return { ...extra, ...(t ? { authorization: `Bearer ${t}` } : {}) }
}

// 查询面试官模型配置状态（不含密钥）。
export async function getInterviewConfig() {
  const res = await fetch(BASE + '/interview/config')
  if (!res.ok) throw new Error(`配置查询失败 (${res.status})`)
  return res.json()
}

// 测试与面试官模型的连通性。
export async function pingModel() {
  const res = await fetch(BASE + '/interview/ping', { method: 'POST' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `连通性测试失败 (${res.status})`)
  return data
}

// 流式对话。messages 为 [{role, content}]。onDelta(textChunk) 每段增量回调一次；返回完整文本。
// maxTokens 可选：评分报告等需要更长输出时放宽。
export async function chatStream({ messages, maxTokens }, onDelta, signal) {
  const res = await fetch(BASE + '/interview/chat', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ messages, stream: true, ...(maxTokens ? { maxTokens } : {}) }),
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

// 非流式对话（用于评分报告）。返回完整文本。
export async function chatOnce({ messages }, signal) {
  const res = await fetch(BASE + '/interview/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, stream: false }),
    signal,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `面试官服务异常 (${res.status})`)
  return data?.content || ''
}

// 云端神经 TTS：把一段文本合成为语音，返回 mp3 的 ArrayBuffer。speed 为倍速（如 1.25）。
export async function synthesizeSpeech(text, signal, speed) {
  const res = await fetch(BASE + '/interview/tts', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ text, ...(speed ? { speed } : {}) }),
    signal,
  })
  if (!res.ok) throw new Error(`TTS 失败 (${res.status})`)
  return res.arrayBuffer()
}

// 云端语音识别（Whisper）：把录音 Blob 转写成文本。
export async function transcribeSpeech(blob, signal) {
  const res = await fetch(BASE + '/interview/stt', {
    method: 'POST',
    headers: authHeaders({ 'content-type': blob.type || 'audio/webm' }),
    body: blob,
    signal,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `语音识别失败 (${res.status})`)
  return data?.text || ''
}

// 执行代码。language: 'java' | 'python'。返回 { stdout, stderr, code, output }。
export async function runCode({ language, source, stdin = '' }, signal) {
  const res = await fetch(BASE + '/interview/run-code', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ language, source, stdin }),
    signal,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `代码执行服务异常 (${res.status})`)
  return data
}

// 异步生成评分报告（后台生成 → 存 COS → 邮件通知）。立即返回 { id, status }。
export async function generateReportAsync(payload) {
  const res = await fetch(BASE + '/interview/report', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `提交报告失败 (${res.status})`)
  return data
}

// 我的面试记录列表。
export async function fetchMyInterviews() {
  const res = await fetch(BASE + '/interview/records', { headers: authHeaders() })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `获取记录失败 (${res.status})`)
  return data?.records || []
}

// 拿到带 token 的查看/下载链接（用于 iframe / a 标签）。
export function interviewViewUrl(id) {
  const t = getToken()
  return `${BASE}/interview/records/${id}/view${t ? `?token=${encodeURIComponent(t)}` : ''}`
}
export function interviewDownloadUrl(id) {
  const t = getToken()
  return `${BASE}/interview/records/${id}/download${t ? `?token=${encodeURIComponent(t)}` : ''}`
}

// 面试模拟后端路由：
//   GET  /api/interview/config    —— 返回面试官模型是否已在 env 配置（不泄露密钥）
//   POST /api/interview/ping      —— 用一次极小请求测试与模型接口的连通性
//   POST /api/interview/chat      —— 调用面试官模型（配置来自 env），支持流式
//   POST /api/interview/run-code  —— 代理转发到代码执行服务（默认 Piston），支持 Java / Python
//
// 面试官模型的「接口地址 + 密钥」改为在服务端 env 配置（类似 Claude Code 的配置方式），
// 不再由前端页面填写。默认走 Anthropic Messages 协议（与 ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN 对齐）。
import express, { Router } from 'express'
import { lookup } from 'node:dns/promises'

const router = Router()

// —— 代码执行服务（Piston）——
const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute'
const LANG_VERSION = {
  python: process.env.PISTON_PYTHON_VERSION || '3.10.0',
  java: process.env.PISTON_JAVA_VERSION || '15.0.2',
}
const LANG_FILE = { python: 'main.py', java: 'Main.java' }

// 判断 IP 是否落在内网/保留段（防 SSRF）。
function isBlockedIp(ip) {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = +v4[1], b = +v4[2]
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true       // link-local / 云元数据
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  const h = ip.toLowerCase()
  if (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('::ffff:127')) return true
  return false
}

// —— 读取面试官模型配置（env）——
// 兼容 Claude Code 的变量名（ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY），
// 也支持 INTERVIEW_* 专用变量覆盖。
function readModelConfig() {
  const base = (process.env.INTERVIEW_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '')
  const token = (process.env.INTERVIEW_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '').trim()
  const style = (process.env.INTERVIEW_API_STYLE || 'anthropic').trim().toLowerCase()
  const model = (process.env.INTERVIEW_MODEL || 'gpt-5.5').trim()
  const version = (process.env.INTERVIEW_API_VERSION || '2023-06-01').trim()
  const maxTokens = Number(process.env.INTERVIEW_MAX_TOKENS || 2048)
  return { base, token, style, model, version, maxTokens, configured: !!(base && token) }
}

// —— 读取云端神经 TTS 配置（OpenAI 兼容 /v1/audio/speech）——
// 默认复用聊天模型的 base + token（多数中转一套 key 同时支持 OpenAI 全部接口）；
// 也可用 INTERVIEW_TTS_* 单独指定；设 INTERVIEW_TTS_DISABLED=1 可强制关闭、回退浏览器语音。
function readTtsConfig() {
  if (/^(1|true|yes|on)$/i.test(process.env.INTERVIEW_TTS_DISABLED || '')) {
    return { base: '', token: '', model: '', voice: '', format: 'mp3', configured: false }
  }
  const base = (process.env.INTERVIEW_TTS_BASE_URL || process.env.INTERVIEW_TTS_URL ||
    process.env.INTERVIEW_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '')
  const token = (process.env.INTERVIEW_TTS_TOKEN || process.env.INTERVIEW_TTS_API_KEY ||
    process.env.INTERVIEW_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '').trim()
  // 默认用更拟人的 gpt-4o-mini-tts + 男声 onyx；中转若不支持可在 env 改回 tts-1/tts-1-hd。
  const model = (process.env.INTERVIEW_TTS_MODEL || 'gpt-4o-mini-tts').trim()
  const voice = (process.env.INTERVIEW_TTS_VOICE || 'onyx').trim()
  const format = (process.env.INTERVIEW_TTS_FORMAT || 'mp3').trim()
  // gpt-4o-mini-tts 支持 instructions 控制语气，让男声更像真人面试官。
  const instructions = (process.env.INTERVIEW_TTS_INSTRUCTIONS ||
    '你是一位资深技术面试官，用沉稳、亲和、自然的中年男声说话；语气口语化、有真人感，语速适中、有恰当停顿，不要机械腔和念稿感。').trim()
  return { base, token, model, voice, format, instructions, configured: !!(base && token) }
}

// —— 读取云端语音识别（Whisper，OpenAI 兼容 /v1/audio/transcriptions）——
// 默认复用聊天 base + token；设 INTERVIEW_STT_DISABLED=1 强制用浏览器识别。
function readSttConfig() {
  if (/^(1|true|yes|on)$/i.test(process.env.INTERVIEW_STT_DISABLED || '')) {
    return { base: '', token: '', model: '', language: '', configured: false }
  }
  const base = (process.env.INTERVIEW_STT_BASE_URL || process.env.INTERVIEW_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '')
  const token = (process.env.INTERVIEW_STT_TOKEN || process.env.INTERVIEW_AUTH_TOKEN ||
    process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '').trim()
  const model = (process.env.INTERVIEW_STT_MODEL || 'whisper-1').trim()
  const language = (process.env.INTERVIEW_STT_LANGUAGE || 'zh').trim()
  return { base, token, model, language, configured: !!(base && token) }
}

function sttEndpoint(cfg) {
  return /\/audio\/transcriptions$/.test(cfg.base) ? cfg.base : `${cfg.base}/v1/audio/transcriptions`
}

function ttsEndpoint(cfg) {
  return /\/audio\/speech$/.test(cfg.base) ? cfg.base : `${cfg.base}/v1/audio/speech`
}

// OpenAI 风格 messages → Anthropic Messages 请求体。
// 规则：所有 system 合并为顶层 system；其余消息保证以 user 开头且 user/assistant 交替。
function toAnthropicBody(cfg, messages, stream, maxTokens) {
  const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: String(m.content) }))
  // Anthropic 要求首条为 user。开场（仅 system）或首条是 assistant 时，补一条触发用的 user 消息。
  if (rest.length === 0 || rest[0].role === 'assistant') {
    rest.unshift({ role: 'user', content: '请开始。' })
  }
  const body = { model: cfg.model, max_tokens: maxTokens || cfg.maxTokens, messages: rest, stream: !!stream }
  if (sys) body.system = sys
  return body
}

function anthropicHeaders(cfg) {
  return {
    'content-type': 'application/json',
    'x-api-key': cfg.token,
    authorization: `Bearer ${cfg.token}`,
    'anthropic-version': cfg.version,
  }
}

// 计算上游 endpoint
function endpointFor(cfg) {
  if (cfg.style === 'openai') {
    return /\/chat\/completions$/.test(cfg.base) ? cfg.base : `${cfg.base}/v1/chat/completions`
  }
  return /\/messages$/.test(cfg.base) ? cfg.base : `${cfg.base}/v1/messages`
}

// 发起一次上游请求（fetch）。返回 Response。
async function callUpstream(cfg, messages, stream, maxTokens) {
  const endpoint = endpointFor(cfg)
  if (cfg.style === 'openai') {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ model: cfg.model, messages, stream: !!stream, temperature: 0.7, max_tokens: maxTokens || cfg.maxTokens }),
    })
  }
  return fetch(endpoint, {
    method: 'POST',
    headers: anthropicHeaders(cfg),
    body: JSON.stringify(toAnthropicBody(cfg, messages, stream, maxTokens)),
  })
}

// 从上游「非流式」响应里取出文本（兼容两种协议）。
function extractText(style, data) {
  if (style === 'openai') return data?.choices?.[0]?.message?.content || ''
  // Anthropic：content 为块数组，取 text 块拼接
  if (Array.isArray(data?.content)) return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  return data?.content || ''
}

// 把一段「OpenAI 风格」的 SSE 增量写给前端（前端只认这一种格式）。
function writeDelta(res, text) {
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
}

// 配置查询
router.get('/config', (_req, res) => {
  const cfg = readModelConfig()
  const tts = readTtsConfig()
  const stt = readSttConfig()
  res.json({
    configured: cfg.configured, style: cfg.style, model: cfg.model,
    hasBase: !!cfg.base, hasToken: !!cfg.token,
    ttsConfigured: tts.configured, ttsVoice: tts.configured ? tts.voice : null,
    sttConfigured: stt.configured,
  })
})

// 云端语音识别：接收前端录的音频（原始字节），转写为文本返回。
router.post('/stt', express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  const cfg = readSttConfig()
  if (!cfg.configured) return res.status(503).json({ error: 'stt_not_configured', message: '未配置云端语音识别' })
  const buf = req.body
  if (!buf || !buf.length) return res.status(400).json({ error: 'empty_audio', message: '音频为空' })

  const ct = String(req.headers['content-type'] || 'audio/webm').split(';')[0].trim()
  const ext = ct.includes('mp4') || ct.includes('m4a') ? 'mp4'
    : ct.includes('mpeg') || ct.includes('mp3') ? 'mp3'
    : ct.includes('wav') ? 'wav'
    : ct.includes('ogg') ? 'ogg' : 'webm'

  const form = new FormData()
  form.append('file', new Blob([buf], { type: ct }), `audio.${ext}`)
  form.append('model', cfg.model)
  if (cfg.language) form.append('language', cfg.language)

  let r
  try {
    r = await fetch(sttEndpoint(cfg), { method: 'POST', headers: { authorization: `Bearer ${cfg.token}` }, body: form })
  } catch (err) {
    console.error('[interview/stt] 上游不可达:', err)
    return res.status(502).json({ error: 'stt_unreachable', message: '语音识别服务不可达' })
  }
  if (!r.ok) {
    let detail = ''
    try { detail = await r.text() } catch { /* ignore */ }
    console.error('[interview/stt] 上游错误:', r.status, detail.slice(0, 300))
    return res.status(502).json({ error: 'stt_error', message: `语音识别接口错误 (${r.status})` })
  }
  try {
    const data = await r.json()
    res.json({ text: data?.text || '' })
  } catch (err) {
    console.error('[interview/stt] 解析失败:', err)
    res.status(502).json({ error: 'bad_stt', message: '识别结果解析失败' })
  }
})

// 云端神经 TTS：把文本合成为语音（mp3）返回给前端播放。
router.post('/tts', async (req, res) => {
  const tts = readTtsConfig()
  const text = String(req.body?.text || '').trim()
  if (!tts.configured) return res.status(503).json({ error: 'tts_not_configured', message: '未配置云端 TTS' })
  if (!text) return res.status(400).json({ error: 'empty_text', message: '文本为空' })

  const ttsBody = { model: tts.model, voice: tts.voice, input: text, response_format: tts.format }
  // 仅 gpt-4o 系列 TTS 支持 instructions（用来控制语气更拟人）。
  if (/gpt-4o/i.test(tts.model) && tts.instructions) ttsBody.instructions = tts.instructions

  let upstream
  try {
    upstream = await fetch(ttsEndpoint(tts), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tts.token}` },
      body: JSON.stringify(ttsBody),
    })
  } catch (err) {
    console.error('[interview/tts] 上游不可达:', err)
    return res.status(502).json({ error: 'tts_unreachable', message: 'TTS 服务不可达' })
  }
  if (!upstream.ok || !upstream.body) {
    let detail = ''
    try { detail = await upstream.text() } catch { /* ignore */ }
    console.error('[interview/tts] 上游错误:', upstream.status, detail.slice(0, 300))
    return res.status(502).json({ error: 'tts_error', message: `TTS 接口错误 (${upstream.status})` })
  }
  res.setHeader('content-type', 'audio/mpeg')
  res.setHeader('cache-control', 'no-store')
  try {
    for await (const chunk of upstream.body) res.write(chunk)
  } catch (err) {
    console.error('[interview/tts] 音频透传中断:', err)
  } finally {
    res.end()
  }
})

// 抓取简历链接内容（服务端代理，规避浏览器跨域；带 SSRF 防护与大小限制）。
// 返回原始字节 + 原始 content-type，由前端按 PDF/HTML/文本提取文字。
router.get('/fetch-resume', async (req, res) => {
  const url = String(req.query.url || '').trim()
  let u
  try { u = new URL(url) } catch { return res.status(400).json({ error: 'bad_url', message: '链接格式不正确' }) }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return res.status(400).json({ error: 'bad_scheme', message: '只支持 http/https 链接' })
  }
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    return res.status(400).json({ error: 'blocked', message: '不允许访问该地址' })
  }
  // 默认禁止内网地址防 SSRF；自建/内网简历服务可设 INTERVIEW_FETCH_ALLOW_PRIVATE=1 放行。
  if (!/^(1|true|yes|on)$/i.test(process.env.INTERVIEW_FETCH_ALLOW_PRIVATE || '')) {
    try {
      const { address } = await lookup(host)
      if (isBlockedIp(address)) return res.status(400).json({ error: 'blocked', message: '不允许访问内网地址' })
    } catch {
      return res.status(400).json({ error: 'dns_fail', message: '无法解析该域名' })
    }
  }

  let r
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; InterviewBot/1.0)', accept: '*/*' },
    }).finally(() => clearTimeout(timer))
  } catch (err) {
    console.error('[interview/fetch-resume] 抓取失败:', err)
    return res.status(502).json({ error: 'fetch_failed', message: '无法抓取该链接：' + String(err?.message || err) })
  }
  if (!r.ok) return res.status(502).json({ error: 'fetch_status', message: `链接返回错误 (${r.status})` })

  const ct = r.headers.get('content-type') || 'application/octet-stream'
  const ab = await r.arrayBuffer()
  if (ab.byteLength > 10 * 1024 * 1024) return res.status(413).json({ error: 'too_large', message: '简历内容过大（>10MB）' })
  res.setHeader('content-type', ct)
  res.setHeader('cache-control', 'no-store')
  res.send(Buffer.from(ab))
})

// 连通性测试
router.post('/ping', async (_req, res) => {
  const cfg = readModelConfig()
  if (!cfg.configured) {
    return res.status(503).json({ ok: false, message: '面试官模型未配置：请在服务端 .env 设置 ANTHROPIC_BASE_URL 与 ANTHROPIC_AUTH_TOKEN' })
  }
  try {
    const r = await callUpstream(cfg, [{ role: 'user', content: '连通性测试：请只回复“ok”。' }], false)
    if (!r.ok) {
      let detail = ''
      try { detail = await r.text() } catch { /* ignore */ }
      return res.status(502).json({ ok: false, message: `接口返回错误 (${r.status})：${detail.slice(0, 300) || '请检查地址、密钥与模型名'}` })
    }
    const data = await r.json()
    const sample = extractText(cfg.style, data)
    res.json({ ok: true, message: '连通正常', model: cfg.model, sample: (sample || '').slice(0, 80) })
  } catch (err) {
    console.error('[interview/ping] 失败:', err)
    res.status(502).json({ ok: false, message: '无法连接到模型接口：' + String(err?.message || err) })
  }
})

// —— 面试官对话 ——
router.post('/chat', async (req, res) => {
  const cfg = readModelConfig()
  const { messages, stream, maxTokens } = req.body || {}
  if (!cfg.configured) {
    return res.status(503).json({ error: 'not_configured', message: '面试官模型未配置：请在服务端 .env 设置 ANTHROPIC_BASE_URL 与 ANTHROPIC_AUTH_TOKEN（详见 server/.env.example）' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_messages', message: '对话消息为空' })
  }
  // 评分报告等需要更长输出，允许按请求放宽（夹在合理范围内）。
  const effMax = maxTokens ? Math.min(Math.max(Number(maxTokens) || 0, 256), 8192) : 0

  let upstream
  try {
    upstream = await callUpstream(cfg, messages, !!stream, effMax)
  } catch (err) {
    console.error('[interview/chat] 上游请求失败:', err)
    return res.status(502).json({ error: 'upstream_unreachable', message: '无法连接到模型接口，请检查 env 中的地址与网络' })
  }

  if (!upstream.ok) {
    let detail = ''
    try { detail = await upstream.text() } catch { /* ignore */ }
    console.error('[interview/chat] 上游返回错误:', upstream.status, detail.slice(0, 500))
    return res.status(upstream.status).json({
      error: 'upstream_error',
      message: `模型接口返回错误 (${upstream.status})：${detail.slice(0, 200) || '请检查接口地址、密钥与模型名'}`,
    })
  }

  // 流式：统一转成「OpenAI 风格」SSE 输出，前端无需区分上游协议。
  if (stream && upstream.body) {
    res.setHeader('content-type', 'text/event-stream; charset=utf-8')
    res.setHeader('cache-control', 'no-cache, no-transform')
    res.setHeader('connection', 'keep-alive')
    try {
      if (cfg.style === 'openai') {
        // 上游已是 OpenAI SSE，直接透传
        for await (const chunk of upstream.body) res.write(chunk)
      } else {
        // 解析 Anthropic SSE，提取 text_delta 重新发出
        const decoder = new TextDecoder('utf-8')
        let buf = ''
        for await (const chunk of upstream.body) {
          buf += decoder.decode(chunk, { stream: true })
          let nl
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim()
            buf = buf.slice(nl + 1)
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const evt = JSON.parse(payload)
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
                writeDelta(res, evt.delta.text)
              }
            } catch { /* 非 JSON 行忽略 */ }
          }
        }
      }
      res.write('data: [DONE]\n\n')
    } catch (err) {
      console.error('[interview/chat] 流式中断:', err)
    } finally {
      res.end()
    }
    return
  }

  // 非流式
  try {
    const data = await upstream.json()
    res.json({ content: extractText(cfg.style, data) })
  } catch (err) {
    console.error('[interview/chat] 解析上游响应失败:', err)
    res.status(502).json({ error: 'bad_upstream', message: '模型返回内容解析失败' })
  }
})

// —— 代码执行代理 ——
router.post('/run-code', async (req, res) => {
  const { language, source, stdin } = req.body || {}
  const lang = String(language || '').toLowerCase()
  if (!LANG_VERSION[lang]) {
    return res.status(400).json({ error: 'unsupported_language', message: '仅支持 java 与 python' })
  }
  if (!source || !String(source).trim()) {
    return res.status(400).json({ error: 'empty_source', message: '代码不能为空' })
  }

  const body = {
    language: lang,
    version: LANG_VERSION[lang],
    files: [{ name: LANG_FILE[lang], content: source }],
    stdin: stdin || '',
    compile_timeout: 10000,
    run_timeout: 8000,
  }

  let r
  try {
    r = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[interview/run-code] 执行服务不可达:', err)
    return res.status(502).json({ error: 'runner_unreachable', message: '代码执行服务不可达，请稍后重试' })
  }

  if (!r.ok) {
    let detail = ''
    try { detail = await r.text() } catch { /* ignore */ }
    return res.status(502).json({ error: 'runner_error', message: `执行服务错误 (${r.status})：${detail.slice(0, 200)}` })
  }

  try {
    const data = await r.json()
    const compileErr = data?.compile?.stderr || ''
    const runOut = data?.run?.stdout || ''
    const runErr = data?.run?.stderr || ''
    const output = [compileErr, runOut, runErr].filter(Boolean).join('\n')
    res.json({ stdout: runOut, stderr: compileErr || runErr, code: data?.run?.code, output })
  } catch (err) {
    console.error('[interview/run-code] 解析执行结果失败:', err)
    res.status(502).json({ error: 'bad_runner', message: '执行结果解析失败' })
  }
})

export default router

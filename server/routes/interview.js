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
import crypto from 'node:crypto'
import { requireAuth } from '../middleware/auth.js'
import { createInterview, markReady, markFailed, listByUser, getOwned } from '../lib/interviews.js'
import { cosConfigured, putObject, getObject, presignedGetUrl } from '../lib/cos.js'
import { renderReportHtml, buildReportEmail } from '../lib/interviewReport.js'
import { sendMail } from '../lib/email.js'

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
    return { provider: 'none', configured: false }
  }
  const provider = (process.env.INTERVIEW_TTS_PROVIDER || 'openai').trim().toLowerCase()

  // —— 腾讯云语音合成（TextToVoice，TC3-HMAC-SHA256 签名）——
  if (provider === 'tencent') {
    const secretId = (process.env.TENCENT_SECRET_ID || process.env.INTERVIEW_TTS_SECRET_ID || '').trim()
    const secretKey = (process.env.TENCENT_SECRET_KEY || process.env.INTERVIEW_TTS_SECRET_KEY || '').trim()
    const region = (process.env.TENCENT_TTS_REGION || 'ap-guangzhou').trim()
    // VoiceType：默认 101004（通用男声·智云，稳定可用）。更拟人的「大模型音色」男声见 .env 说明。
    const voiceType = Number(process.env.INTERVIEW_TTS_VOICE || 101004)
    const speed = Number(process.env.INTERVIEW_TTS_SPEED || 0)
    const volume = Number(process.env.INTERVIEW_TTS_VOLUME || 0)
    const sampleRate = Number(process.env.INTERVIEW_TTS_SAMPLE_RATE || 16000)
    return {
      provider: 'tencent', secretId, secretKey, region,
      voiceType, speed, volume, sampleRate,
      voice: String(voiceType), model: 'tencent-tts', mode: 'tencent',
      configured: !!(secretId && secretKey),
    }
  }

  // —— OpenAI 兼容（默认）——
  const base = (process.env.INTERVIEW_TTS_BASE_URL || process.env.INTERVIEW_TTS_URL ||
    process.env.INTERVIEW_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '')
  // 单独提供的 TTS 密钥（用独立 OpenAI key 时必填）
  const explicitToken = (process.env.INTERVIEW_TTS_TOKEN || process.env.INTERVIEW_TTS_API_KEY ||
    process.env.INTERVIEW_TTS_KEY || '').trim()
  // 未单独提供时，回退复用聊天 token（仅当 TTS 与聊天是同一个服务时才有效）
  const token = (explicitToken || process.env.INTERVIEW_AUTH_TOKEN ||
    process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '').trim()
  // 若 TTS 接口地址与聊天不是同一主机、又没单独配 token，多半会鉴权失败——标记出来给出精确提示
  const chatBase = (process.env.INTERVIEW_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '')
  let tokenLikelyWrong = false
  if (!explicitToken && base && chatBase) {
    try { tokenLikelyWrong = new URL(base).host !== new URL(chatBase).host } catch { /* ignore */ }
  }
  // 默认 tts-1 + 男声 onyx（OpenAI 兼容中转多支持的标准 TTS 接口 /v1/audio/speech）。
  const model = (process.env.INTERVIEW_TTS_MODEL || 'tts-1').trim()
  // 两种合成方式：
  //   speech：标准 /v1/audio/speech（tts-1 / tts-1-hd / gpt-4o-mini-tts）
  //   chat  ：用音频对话模型经 /v1/chat/completions 输出音频（gpt-4o-audio-preview 等，
  //           适合中转没开 /v1/audio/speech、但有 gpt-4o-audio-preview 的情况）
  const explicitMode = (process.env.INTERVIEW_TTS_MODE || '').trim().toLowerCase()
  const mode = explicitMode || (/audio-preview|gpt-4o-audio|gpt-4o-mini-audio|realtime/i.test(model) ? 'chat' : 'speech')
  // 音色：chat 模式用音频对话模型支持的男声（ash/echo/ballad…），speech 模式用 onyx。
  const voice = (process.env.INTERVIEW_TTS_VOICE || (mode === 'chat' ? 'ash' : 'onyx')).trim()
  const format = (process.env.INTERVIEW_TTS_FORMAT || 'mp3').trim()
  const instructions = (process.env.INTERVIEW_TTS_INSTRUCTIONS ||
    '你是一位资深技术面试官，用沉稳、亲和、自然的中年男声说话；语气口语化、有真人感，语速适中、有恰当停顿，不要机械腔和念稿感。').trim()
  return { provider: 'openai', base, token, model, voice, format, instructions, mode, tokenLikelyWrong, configured: !!(base && token) }
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

function chatCompletionsEndpoint(base) {
  return /\/chat\/completions$/.test(base) ? base : `${base}/v1/chat/completions`
}

// 带超时的 fetch：避免上游（尤其国内连不通 api.openai.com 时）请求挂死。
async function fetchWithTimeout(url, opts, ms = 25000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

// 腾讯云语音合成（TextToVoice）：自实现 TC3-HMAC-SHA256 签名，返回 mp3 buffer。
// 文档：https://cloud.tencent.com/document/product/1073/37995
async function synthTencent(cfg, text, speed) {
  const host = 'tts.tencentcloudapi.com'
  const service = 'tts'
  const action = 'TextToVoice'
  const version = '2019-08-23'

  // 倍速(0.5~2.0) → 腾讯云 Speed[-2,6]；未指定则用 env 的 cfg.speed。
  const tcSpeed = speed ? Math.max(-2, Math.min(6, Math.round((speed - 1) / 0.25))) : (cfg.speed || 0)
  const payload = JSON.stringify({
    Text: text,
    SessionId: crypto.randomUUID(),
    ModelType: 1,
    VoiceType: cfg.voiceType,
    Volume: cfg.volume || 0,
    Speed: tcSpeed,
    SampleRate: cfg.sampleRate || 16000,
    Codec: 'mp3',
  })

  const ts = Math.floor(Date.now() / 1000)
  const date = new Date(ts * 1000).toISOString().slice(0, 10) // UTC yyyy-mm-dd
  const sha256hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
  const hmac = (key, s) => crypto.createHmac('sha256', key).update(s, 'utf8').digest()

  // 1) 规范请求串
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, sha256hex(payload)].join('\n')
  // 2) 待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = ['TC3-HMAC-SHA256', ts, credentialScope, sha256hex(canonicalRequest)].join('\n')
  // 3) 计算签名
  const secretDate = hmac('TC3' + cfg.secretKey, date)
  const secretService = hmac(secretDate, service)
  const secretSigning = hmac(secretService, 'tc3_request')
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex')
  // 4) Authorization
  const authorization = `TC3-HMAC-SHA256 Credential=${cfg.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  let r
  try {
    r = await fetchWithTimeout(`https://${host}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: host,
        'X-TC-Action': action,
        'X-TC-Timestamp': String(ts),
        'X-TC-Version': version,
        'X-TC-Region': cfg.region || 'ap-guangzhou',
      },
      body: payload,
    })
  } catch (e) {
    const to = e?.name === 'AbortError'
    return { ok: false, status: 504, message: to ? '腾讯云 TTS 请求超时（检查服务器到腾讯云网络）' : '腾讯云 TTS 不可达：' + String(e?.message || e) }
  }
  let data
  try { data = await r.json() } catch { return { ok: false, status: 502, message: '腾讯云 TTS 返回解析失败' } }
  const resp = data?.Response
  if (resp?.Error) return { ok: false, status: 502, message: `腾讯云 TTS 错误：${resp.Error.Code} - ${resp.Error.Message}` }
  if (!resp?.Audio) return { ok: false, status: 502, message: '腾讯云 TTS 未返回音频数据' }
  return { ok: true, buffer: Buffer.from(resp.Audio, 'base64') }
}

// 合成一段语音，返回 { ok, status?, buffer?, message? }。
// provider=tencent：腾讯云 TextToVoice；否则 OpenAI 兼容（speech / chat 两种方式）。
async function synthTts(tts, text, speed) {
  if (tts.provider === 'tencent') return synthTencent(tts, text, speed)
  if (tts.mode === 'chat') {
    const body = {
      model: tts.model,
      modalities: ['text', 'audio'],
      audio: { voice: tts.voice, format: tts.format },
      messages: [
        { role: 'system', content: '你是一个文本转语音引擎。把用户消息中的文字一字不差地用中文朗读出来；不要新增、省略、改写、翻译或解释任何内容，也不要寒暄或回应。' },
        { role: 'user', content: text },
      ],
    }
    let r
    try {
      r = await fetchWithTimeout(chatCompletionsEndpoint(tts.base), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${tts.token}` },
        body: JSON.stringify(body),
      })
    } catch (e) {
      const to = e?.name === 'AbortError'
      return { ok: false, status: 504, message: to ? 'TTS 请求超时（网络可能不可达，国内服务器常连不上 api.openai.com）' : 'TTS 服务不可达：' + String(e?.message || e) }
    }
    if (!r.ok) {
      let d = ''; try { d = await r.text() } catch { /* ignore */ }
      return { ok: false, status: r.status, message: `TTS 接口错误 (${r.status})：${d.slice(0, 160)}` }
    }
    let data
    try { data = await r.json() } catch { return { ok: false, status: 502, message: 'TTS 返回解析失败' } }
    const b64 = data?.choices?.[0]?.message?.audio?.data
    if (!b64) return { ok: false, status: 502, message: 'TTS 返回里没有音频数据（该模型可能不支持音频输出）' }
    return { ok: true, buffer: Buffer.from(b64, 'base64') }
  }
  // speech 模式
  const body = { model: tts.model, voice: tts.voice, input: text, response_format: tts.format }
  if (/gpt-4o/i.test(tts.model) && tts.instructions) body.instructions = tts.instructions
  if (speed) body.speed = Math.max(0.25, Math.min(4, speed)) // OpenAI 倍速 0.25~4
  let r
  try {
    r = await fetchWithTimeout(ttsEndpoint(tts), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tts.token}` },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const to = e?.name === 'AbortError'
    return { ok: false, status: 504, message: to ? 'TTS 请求超时（网络可能不可达，国内服务器常连不上 api.openai.com）' : 'TTS 服务不可达：' + String(e?.message || e) }
  }
  if (!r.ok) {
    let d = ''; try { d = await r.text() } catch { /* ignore */ }
    return { ok: false, status: r.status, message: `TTS 接口错误 (${r.status})：${d.slice(0, 160)}` }
  }
  const ab = await r.arrayBuffer()
  return { ok: true, buffer: Buffer.from(ab) }
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
router.post('/stt', requireAuth, express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
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
router.post('/tts', requireAuth, async (req, res) => {
  const tts = readTtsConfig()
  const text = String(req.body?.text || '').trim()
  const speed = Number(req.body?.speed) || 0 // 倍速，0 表示用默认
  if (!tts.configured) return res.status(503).json({ error: 'tts_not_configured', message: '未配置云端 TTS' })
  if (!text) return res.status(400).json({ error: 'empty_text', message: '文本为空' })

  const out = await synthTts(tts, text, speed)
  if (!out.ok) {
    console.error('[interview/tts] 失败:', out.message)
    return res.status(502).json({ error: 'tts_error', message: out.message })
  }
  res.setHeader('content-type', 'audio/mpeg')
  res.setHeader('cache-control', 'no-store')
  res.send(out.buffer)
})

// 抓取简历链接内容（服务端代理，规避浏览器跨域；带 SSRF 防护与大小限制）。
// 返回原始字节 + 原始 content-type，由前端按 PDF/HTML/文本提取文字。
router.get('/fetch-resume', requireAuth, async (req, res) => {
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
    // 顺带探测云端 TTS 是否可用（含 speech / chat 两种方式），便于排查「还是女声（其实回退到了浏览器语音）」
    const tts = readTtsConfig()
    let ttsResult = { configured: false }
    if (tts.configured) {
      const out = await synthTts(tts, '测试')
      let extra = `（当前 mode=${tts.mode}，model=${tts.model}）`
      if (!out.ok && tts.tokenLikelyWrong) {
        extra += ' ⚠ TTS 接口地址与聊天不同，但没单独设 INTERVIEW_TTS_TOKEN，正在误用聊天 token——请设置独立的 INTERVIEW_TTS_TOKEN'
      }
      ttsResult = out.ok
        ? { configured: true, ok: true, message: `云端语音正常（${tts.model} / ${tts.voice}${tts.mode === 'chat' ? ' · chat 模式' : ''}）` }
        : { configured: true, ok: false, message: out.message + extra }
    }
    res.json({ ok: true, message: '连通正常', model: cfg.model, sample: (sample || '').slice(0, 80), tts: ttsResult })
  } catch (err) {
    console.error('[interview/ping] 失败:', err)
    res.status(502).json({ ok: false, message: '无法连接到模型接口：' + String(err?.message || err) })
  }
})

// —— 面试官对话 ——
router.post('/chat', requireAuth, async (req, res) => {
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
router.post('/run-code', requireAuth, async (req, res) => {
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

// —— 评分报告（异步生成 + 存 COS + 邮件通知）与面试记录 ——

// 流式拉取并累积完整文本（报告较长，避免非流式被网关超时）。
async function chatAccumulate(cfg, messages, maxTokens) {
  const upstream = await callUpstream(cfg, messages, true, maxTokens)
  if (!upstream.ok || !upstream.body) {
    let d = ''; try { d = await upstream.text() } catch { /* ignore */ }
    throw new Error(`模型接口错误 (${upstream.status})：${d.slice(0, 200)}`)
  }
  const dec = new TextDecoder('utf-8')
  let buf = '', full = ''
  for await (const chunk of upstream.body) {
    buf += dec.decode(chunk, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const p = line.slice(5).trim()
      if (!p || p === '[DONE]') continue
      try {
        const j = JSON.parse(p)
        if (cfg.style === 'openai') { const d = j.choices?.[0]?.delta?.content || ''; if (d) full += d }
        else if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta' && j.delta.text) full += j.delta.text
      } catch { /* ignore */ }
    }
  }
  return full
}

// 从模型文本中解析 JSON（容忍代码块/噪声）。
function parseReportJson(text) {
  if (!text) throw new Error('评估结果为空')
  let s = text.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  return JSON.parse(s)
}

// 异步生成报告：调用模型 → 渲染 HTML（含完整对话）→ 上传 COS → 落库 → 邮件通知。
router.post('/report', requireAuth, async (req, res) => {
  const cfg = readModelConfig()
  const { messages, conversation, positionTitle, skills, courses } = req.body || {}
  if (!cfg.configured) return res.status(503).json({ error: 'not_configured', message: '面试官模型未配置' })
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'invalid', message: '对话内容为空' })
  if (!cosConfigured()) return res.status(503).json({ error: 'cos', message: '对象存储未配置，无法保存报告' })

  const userId = req.user.id
  const email = req.user.email
  const id = createInterview(userId, { position: positionTitle, skills })
  res.json({ id, status: 'pending' })

  // 后台异步处理（不阻塞响应）
  ;(async () => {
    try {
      const text = await chatAccumulate(cfg, messages, 4096)
      const report = parseReportJson(text)
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const html = renderReportHtml(report, { positionTitle, skills, dateStr }, conversation || [], courses || [])
      const key = `interviews/${userId}/${id}.html`
      await putObject(key, html, 'text/html; charset=utf-8')
      markReady(id, { grade: report.grade, summary: report.overallSummary, reportKey: key })
      try {
        const dl = presignedGetUrl(key, { filename: `面试报告_${report.grade || ''}.html` })
        if (email) await sendMail({ to: email, ...buildReportEmail({ positionTitle, grade: report.grade, downloadUrl: dl }) })
      } catch (e) { console.error('[interview/report] 邮件发送失败:', e) }
    } catch (e) {
      console.error('[interview/report] 生成失败:', e)
      markFailed(id, e?.message || String(e))
    }
  })()
})

// 我的面试记录列表
router.get('/records', requireAuth, (req, res) => {
  res.json({ records: listByUser(req.user.id) })
})

// 在线查看报告 HTML（仅本人）
router.get('/records/:id/view', requireAuth, async (req, res) => {
  const row = getOwned(Number(req.params.id), req.user.id)
  if (!row) return res.status(404).json({ message: '记录不存在' })
  if (row.status !== 'ready' || !row.report_key) return res.status(409).json({ message: '报告尚未就绪' })
  try {
    const buf = await getObject(row.report_key)
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.send(buf)
  } catch (e) {
    res.status(502).json({ message: '读取报告失败：' + String(e?.message || e) })
  }
})

// 下载报告（重定向到 COS 预签名 URL）
router.get('/records/:id/download', requireAuth, (req, res) => {
  const row = getOwned(Number(req.params.id), req.user.id)
  if (!row || row.status !== 'ready' || !row.report_key) return res.status(404).json({ message: '报告不存在或未就绪' })
  res.redirect(presignedGetUrl(row.report_key, { filename: `面试报告_${row.grade || ''}.html` }))
})

export default router

// 面试模拟后端路由：
//   POST /api/interview/chat      —— 代理转发到用户提供的大模型接口（OpenAI 兼容），支持流式
//   POST /api/interview/run-code  —— 代理转发到代码执行服务（默认 Piston），支持 Java / Python
// 经后端代理可规避浏览器跨域、隐藏 ak，并统一错误处理。
import { Router } from 'express'

const router = Router()

// 代码执行服务（Piston）。可用 PISTON_URL 覆盖为自建实例。
const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute'
// 各语言默认版本（公共 Piston 实例上常见可用版本）。
const LANG_VERSION = {
  python: process.env.PISTON_PYTHON_VERSION || '3.10.0',
  java: process.env.PISTON_JAVA_VERSION || '15.0.2',
}
const LANG_FILE = { python: 'main.py', java: 'Main.java' }

// —— 面试官对话代理 ——
router.post('/chat', async (req, res) => {
  const { url, apiKey, model, messages, stream } = req.body || {}
  if (!url || !apiKey) {
    return res.status(400).json({ error: 'missing_config', message: '缺少模型接口地址或密钥' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_messages', message: '对话消息为空' })
  }

  const payload = {
    model: model || 'gpt-5.5',
    messages,
    stream: !!stream,
    temperature: 0.7,
  }

  let upstream
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[interview/chat] 上游请求失败:', err)
    return res.status(502).json({ error: 'upstream_unreachable', message: '无法连接到大模型接口，请检查 URL 与网络' })
  }

  if (!upstream.ok) {
    let detail = ''
    try { detail = await upstream.text() } catch { /* ignore */ }
    console.error('[interview/chat] 上游返回错误:', upstream.status, detail.slice(0, 500))
    return res.status(upstream.status).json({
      error: 'upstream_error',
      message: `大模型接口返回错误 (${upstream.status})：${detail.slice(0, 200) || '请检查接口地址、密钥与模型名'}`,
    })
  }

  // 流式：把上游 SSE 原样透传给前端
  if (stream && upstream.body) {
    res.setHeader('content-type', 'text/event-stream; charset=utf-8')
    res.setHeader('cache-control', 'no-cache, no-transform')
    res.setHeader('connection', 'keep-alive')
    try {
      for await (const chunk of upstream.body) {
        res.write(chunk)
      }
    } catch (err) {
      console.error('[interview/chat] 流式透传中断:', err)
    } finally {
      res.end()
    }
    return
  }

  // 非流式：解析出文本返回
  try {
    const data = await upstream.json()
    const content = data?.choices?.[0]?.message?.content || ''
    res.json({ content, raw: data })
  } catch (err) {
    console.error('[interview/chat] 解析上游响应失败:', err)
    res.status(502).json({ error: 'bad_upstream', message: '大模型返回内容解析失败' })
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
    res.json({
      stdout: runOut,
      stderr: compileErr || runErr,
      code: data?.run?.code,
      output,
    })
  } catch (err) {
    console.error('[interview/run-code] 解析执行结果失败:', err)
    res.status(502).json({ error: 'bad_runner', message: '执行结果解析失败' })
  }
})

export default router

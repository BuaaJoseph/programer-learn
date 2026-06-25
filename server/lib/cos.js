// 腾讯云对象存储 COS 客户端：上传/读取报告 HTML、生成预签名下载 URL。
// 用 REST API + 自实现 COS 请求签名（HMAC-SHA1），无需 SDK。密钥复用 TTS 那套 TENCENT_*。
// 文档：https://cloud.tencent.com/document/product/436/7778
import crypto from 'node:crypto'

function sha1(s) { return crypto.createHash('sha1').update(s, 'utf8').digest('hex') }
function hmacSha1(key, s) { return crypto.createHmac('sha1', key).update(s, 'utf8').digest('hex') }

function cfg() {
  return {
    bucket: (process.env.COS_BUCKET || 'program-learn-1319238760').trim(),
    region: (process.env.COS_REGION || process.env.TENCENT_TTS_REGION || 'ap-guangzhou').trim(),
    secretId: (process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || '').trim(),
    secretKey: (process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '').trim(),
  }
}

export function cosConfigured() {
  const c = cfg()
  return !!(c.bucket && c.region && c.secretId && c.secretKey)
}

function cosHost(c) { return `${c.bucket}.cos.${c.region}.myqcloud.com` }
function encodePath(key) { return '/' + String(key).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/') }

// 排序、小写、url-encode 后拼成 COS 签名所需的 list 与 string。
function formatKv(obj) {
  const lowerMap = {}
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = obj[k]
  const keys = Object.keys(lowerMap).sort()
  return {
    list: keys.join(';'),
    str: keys.map((k) => `${k}=${encodeURIComponent(lowerMap[k])}`).join('&'),
  }
}

// 计算 COS Authorization。
function buildAuth({ method, pathname, params = {}, headers = {}, expire = 600 }) {
  const c = cfg()
  const start = Math.floor(Date.now() / 1000) - 60
  const end = start + expire + 60
  const keyTime = `${start};${end}`
  const signKey = hmacSha1(c.secretKey, keyTime)
  const p = formatKv(params)
  const h = formatKv(headers)
  const httpString = `${method.toLowerCase()}\n${pathname}\n${p.str}\n${h.str}\n`
  const stringToSign = `sha1\n${keyTime}\n${sha1(httpString)}\n`
  const signature = hmacSha1(signKey, stringToSign)
  return `q-sign-algorithm=sha1&q-ak=${c.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}` +
    `&q-header-list=${h.list}&q-url-param-list=${p.list}&q-signature=${signature}`
}

// 上传对象。
export async function putObject(key, body, contentType = 'application/octet-stream') {
  const c = cfg()
  const pathname = encodePath(key)
  const auth = buildAuth({ method: 'PUT', pathname, expire: 600 })
  const res = await fetch(`https://${cosHost(c)}${pathname}`, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': contentType },
    body,
  })
  if (!res.ok) {
    let t = ''; try { t = await res.text() } catch { /* ignore */ }
    throw new Error(`COS 上传失败 (${res.status}): ${t.slice(0, 300)}`)
  }
  return { key, url: `https://${cosHost(c)}${pathname}` }
}

// 读取对象（返回 Buffer）。
export async function getObject(key) {
  const c = cfg()
  const pathname = encodePath(key)
  const auth = buildAuth({ method: 'GET', pathname, expire: 600 })
  const res = await fetch(`https://${cosHost(c)}${pathname}`, { headers: { Authorization: auth } })
  if (!res.ok) {
    let t = ''; try { t = await res.text() } catch { /* ignore */ }
    throw new Error(`COS 读取失败 (${res.status}): ${t.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

// 生成预签名下载 URL（默认 7 天有效；filename 触发浏览器下载）。
export function presignedGetUrl(key, { expire = 7 * 24 * 3600, filename } = {}) {
  const c = cfg()
  const pathname = encodePath(key)
  const params = {}
  if (filename) params['response-content-disposition'] = `attachment; filename="${filename}"`
  const auth = buildAuth({ method: 'GET', pathname, params, expire })
  const extra = Object.keys(params).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
  return `https://${cosHost(c)}${pathname}?${auth}${extra ? '&' + extra : ''}`
}

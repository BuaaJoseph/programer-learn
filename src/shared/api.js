// 鉴权后端的轻量 API 客户端。统一处理 token、JSON 与错误。
// 开发期由 Vite 代理 /api → 本地后端；生产可用 VITE_API_BASE 指向真实域名。
const BASE = (import.meta.env?.VITE_API_BASE || '') + '/api'
const TOKEN_KEY = 'auth.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

// 统一请求：自动带上 Bearer token，错误时抛出带 message 的 Error。
async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  const token = getToken()
  if (token) headers.authorization = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* 可能是空响应 */
  }
  if (!res.ok) {
    const err = new Error(data?.message || `请求失败 (${res.status})`)
    err.code = data?.error
    err.status = res.status
    err.retryAfter = data?.retryAfter
    throw err
  }
  return data
}

export const authApi = {
  captcha: () => request('/auth/captcha'),
  sendCode: (email, captchaId, captchaText) =>
    request('/auth/send-code', { method: 'POST', body: { email, captchaId, captchaText } }),
  loginByCode: (email, code) =>
    request('/auth/login-code', { method: 'POST', body: { email, code } }),
  loginByPassword: (email, password) =>
    request('/auth/login-password', { method: 'POST', body: { email, password } }),
  setPassword: (password) =>
    request('/auth/set-password', { method: 'POST', body: { password } }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
}

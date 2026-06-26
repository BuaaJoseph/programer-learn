// 鉴权中间件：从 Authorization: Bearer <token> 解析会话，挂到 req.user。
import { getUserByToken } from '../lib/users.js'

export function bearerToken(req) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (m) return m[1].trim()
  // 兜底：iframe / <a> 等无法设置 header 的场景允许 ?token= 传参（用于查看/下载报告）
  if (req.query && typeof req.query.token === 'string') return req.query.token.trim()
  return null
}

// 必须登录；未登录返回 401。
export function requireAuth(req, res, next) {
  const user = getUserByToken(bearerToken(req))
  if (!user) return res.status(401).json({ error: 'unauthorized', message: '请先登录' })
  req.user = user
  next()
}

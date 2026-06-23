// 用户与会话的读写封装。
import { randomBytes } from 'node:crypto'
import { getDb } from '../db.js'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 会话 7 天有效

export function findUserByEmail(email) {
  return getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email)
}

export function findUserById(id) {
  return getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id)
}

// 按邮箱获取用户；不存在则创建（密码留空，供验证码首次登录建号）。
export function getOrCreateUser(email) {
  const existing = findUserByEmail(email)
  if (existing) return { user: existing, created: false }
  const ts = Date.now()
  const info = getDb()
    .prepare(
      `INSERT INTO users (email, status, created_at, updated_at) VALUES (?, 1, ?, ?)`,
    )
    .run(email, ts, ts)
  return { user: findUserById(Number(info.lastInsertRowid)), created: true }
}

export function setUserPassword(userId, hash, salt) {
  getDb()
    .prepare(
      `UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?`,
    )
    .run(hash, salt, Date.now(), userId)
}

export function touchLogin(userId) {
  getDb().prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(Date.now(), userId)
}

// 创建会话，返回 token。
export function createSession(userId, userAgent = null) {
  const token = randomBytes(32).toString('hex')
  const ts = Date.now()
  getDb()
    .prepare(
      `INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(token, userId, ts, ts + SESSION_TTL_MS, userAgent)
  return token
}

// 按 token 取会话对应的用户（校验过期）。
export function getUserByToken(token) {
  if (!token) return null
  const db = getDb()
  const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token)
  if (!session) return null
  if (Date.now() > session.expires_at) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token)
    return null
  }
  return findUserById(session.user_id)
}

export function deleteSession(token) {
  if (!token) return
  getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token)
}

// 对外暴露的用户视图：绝不包含密码哈希/盐。
export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname || null,
    hasPassword: !!user.password_hash,
    createdAt: user.created_at,
  }
}

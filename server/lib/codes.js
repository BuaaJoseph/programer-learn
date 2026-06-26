// 邮箱验证码的生成、限流、存储与校验。
// 规则：同一邮箱 60s 内只能发送一次；验证码 6 位数字，10min 有效；
// 验证码不存明文，存其 HMAC；校验失败累计达上限后作废，防爆破。
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { getDb } from '../db.js'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 分钟有效
const RESEND_INTERVAL_MS = 60 * 1000 // 60 秒限流
const MAX_ATTEMPTS = 5 // 单个验证码最多尝试次数

// 用于对验证码做 HMAC 的密钥（生产请用环境变量提供稳定值）。
const SECRET = process.env.CODE_SECRET || 'dev-code-secret-change-me'

function hashCode(email, code) {
  return createHmac('sha256', SECRET).update(`${email}:${code}`).digest('hex')
}

function now() {
  return Date.now()
}

// 距离上次发送还需等待的毫秒数（0 表示可立即发送）。
export function secondsUntilResend(email, scene = 'login') {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT created_at FROM email_codes WHERE email = ? AND scene = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(email, scene)
  if (!row) return 0
  const elapsed = now() - row.created_at
  const remain = RESEND_INTERVAL_MS - elapsed
  return remain > 0 ? Math.ceil(remain / 1000) : 0
}

// 生成并保存一个验证码，返回明文 code（由调用方交给邮件发送）。
export function issueCode(email, scene = 'login', ip = null) {
  const db = getDb()
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const ts = now()
  db.prepare(
    `INSERT INTO email_codes (email, code_hash, scene, expires_at, created_at, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(email, hashCode(email, code), scene, ts + CODE_TTL_MS, ts, ip)
  return code
}

// 校验验证码。成功则消费（标记 consumed_at）。返回 { ok, reason }。
export function verifyCode(email, code, scene = 'login') {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT * FROM email_codes
       WHERE email = ? AND scene = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(email, scene)

  if (!row) return { ok: false, reason: 'not_found' }
  if (now() > row.expires_at) return { ok: false, reason: 'expired' }
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' }

  const expected = Buffer.from(row.code_hash, 'hex')
  const actual = Buffer.from(hashCode(email, String(code).trim()), 'hex')
  const match = expected.length === actual.length && timingSafeEqual(expected, actual)

  if (!match) {
    db.prepare(`UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?`).run(row.id)
    return { ok: false, reason: 'mismatch' }
  }

  db.prepare(`UPDATE email_codes SET consumed_at = ? WHERE id = ?`).run(now(), row.id)
  return { ok: true }
}

export { RESEND_INTERVAL_MS, CODE_TTL_MS }

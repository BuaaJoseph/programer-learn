// 鉴权相关路由：图形验证码、发邮箱验证码、验证码登录、密码登录、设密码、获取当前用户、登出。
import { Router } from 'express'
import { createCaptcha, verifyCaptcha } from '../lib/captcha.js'
import { issueCode, verifyCode, secondsUntilResend } from '../lib/codes.js'
import { getEmailProvider, DEV_RETURN_CODE } from '../lib/email.js'
import { hashPassword, verifyPassword, isStrongPassword } from '../lib/passwords.js'
import {
  getOrCreateUser,
  findUserByEmail,
  setUserPassword,
  touchLogin,
  createSession,
  deleteSession,
  publicUser,
} from '../lib/users.js'
import { requireAuth, bearerToken } from '../middleware/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normEmail = (e) => String(e || '').trim().toLowerCase()
const isEmail = (e) => EMAIL_RE.test(e) && e.length <= 254

function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim()
}

function finishLogin(req, res, user, extra = {}) {
  touchLogin(user.id)
  const token = createSession(user.id, req.headers['user-agent'] || null)
  res.json({ token, user: publicUser(user), ...extra })
}

// 1) 获取图形验证码（发邮件前的人机校验）。
router.get('/captcha', (_req, res) => {
  const { id, svg } = createCaptcha()
  res.json({ captchaId: id, svg })
})

// 2) 发送邮箱验证码：先过图形验证码 → 再做 60s 限流 → 生成并发送。
router.post('/send-code', async (req, res) => {
  const email = normEmail(req.body?.email)
  const { captchaId, captchaText } = req.body || {}

  if (!isEmail(email)) return res.status(400).json({ error: 'invalid_email', message: '邮箱格式不正确' })
  if (!verifyCaptcha(captchaId, captchaText))
    return res.status(400).json({ error: 'invalid_captcha', message: '图形验证码错误或已过期' })

  const wait = secondsUntilResend(email)
  if (wait > 0)
    return res.status(429).json({ error: 'too_frequent', message: `发送过于频繁，请 ${wait}s 后重试`, retryAfter: wait })

  const code = issueCode(email, 'login', clientIp(req))
  try {
    await getEmailProvider().sendCode(email, code)
  } catch (err) {
    console.error('[send-code] 邮件发送失败:', err)
    return res.status(502).json({ error: 'send_failed', message: '验证码发送失败，请稍后重试' })
  }

  // 开发模式回显验证码方便联调；生产（SMTP）下不返回。
  res.json({ ok: true, ...(DEV_RETURN_CODE ? { devCode: code } : {}) })
})

// 3) 验证码登录：校验验证码 → 用户不存在则建号 → 下发会话。
//    isNewUser / needPassword 用于前端决定是否弹出「设置密码」弹窗。
router.post('/login-code', (req, res) => {
  const email = normEmail(req.body?.email)
  const code = String(req.body?.code || '').trim()
  if (!isEmail(email)) return res.status(400).json({ error: 'invalid_email', message: '邮箱格式不正确' })
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'invalid_code', message: '请输入 6 位验证码' })

  const result = verifyCode(email, code, 'login')
  if (!result.ok) {
    const map = {
      not_found: '请先获取验证码',
      expired: '验证码已过期，请重新获取',
      too_many_attempts: '尝试次数过多，请重新获取验证码',
      mismatch: '验证码错误',
    }
    return res.status(400).json({ error: result.reason, message: map[result.reason] || '验证码校验失败' })
  }

  const { user, created } = getOrCreateUser(email)
  finishLogin(req, res, user, { isNewUser: created, needPassword: !user.password_hash })
})

// 4) 密码登录：邮箱 + 密码。
router.post('/login-password', (req, res) => {
  const email = normEmail(req.body?.email)
  const password = String(req.body?.password || '')
  if (!isEmail(email) || !password)
    return res.status(400).json({ error: 'invalid_input', message: '请输入邮箱和密码' })

  const user = findUserByEmail(email)
  // 统一错误文案，避免暴露「邮箱是否注册」。
  const fail = () => res.status(401).json({ error: 'bad_credentials', message: '邮箱或密码错误' })
  if (!user || !user.password_hash) return fail()
  if (user.status !== 1) return res.status(403).json({ error: 'disabled', message: '账号已被禁用' })
  if (!verifyPassword(password, user.password_salt, user.password_hash)) return fail()

  finishLogin(req, res, user)
})

// 5) 设置/修改密码（需登录）。用于验证码首次登录后的「设置密码」弹窗。
router.post('/set-password', requireAuth, (req, res) => {
  const password = String(req.body?.password || '')
  if (!isStrongPassword(password))
    return res.status(400).json({ error: 'weak_password', message: '密码至少 8 位，且需同时包含字母和数字' })
  const { hash, salt } = hashPassword(password)
  setUserPassword(req.user.id, hash, salt)
  res.json({ ok: true, user: publicUser({ ...req.user, password_hash: hash }) })
})

// 6) 当前登录用户。
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// 7) 登出：撤销当前会话。
router.post('/logout', (req, res) => {
  deleteSession(bearerToken(req))
  res.json({ ok: true })
})

export default router

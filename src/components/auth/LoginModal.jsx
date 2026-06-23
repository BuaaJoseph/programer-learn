import { useEffect, useRef, useState } from 'react'
import { authApi } from '../../shared/api.js'
import { useAuth } from '../../shared/AuthContext.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 登录弹窗：支持「邮箱验证码登录」与「邮箱密码登录」两种方式。
// 验证码登录：先输图形验证码 → 发邮件验证码（60s 限流倒计时）→ 校验登录；未注册自动建号。
export default function LoginModal() {
  const { loginOpen, closeLogin, onLoggedIn } = useAuth()
  const [tab, setTab] = useState('code') // 'code' | 'password'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [captchaText, setCaptchaText] = useState('')
  const [captcha, setCaptcha] = useState(null) // { captchaId, svg }
  const [countdown, setCountdown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [hint, setHint] = useState('') // 开发期 devCode 等提示
  const timerRef = useRef(null)

  // 拉取一张新的图形验证码
  const refreshCaptcha = async () => {
    setCaptchaText('')
    try {
      setCaptcha(await authApi.captcha())
    } catch {
      setErr('图形验证码加载失败')
    }
  }

  // 打开弹窗时初始化
  useEffect(() => {
    if (loginOpen) {
      setErr('')
      setHint('')
      refreshCaptcha()
    }
  }, [loginOpen])

  // 60s 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [countdown])

  if (!loginOpen) return null

  const emailOk = EMAIL_RE.test(email.trim())

  const sendCode = async () => {
    setErr('')
    setHint('')
    if (!emailOk) return setErr('请输入正确的邮箱')
    if (!captchaText.trim()) return setErr('请输入图形验证码')
    setBusy(true)
    try {
      const resp = await authApi.sendCode(email.trim(), captcha.captchaId, captchaText.trim())
      setCountdown(60)
      if (resp.devCode) setHint(`开发模式验证码：${resp.devCode}`)
      else setHint('验证码已发送至邮箱，请查收')
    } catch (e) {
      setErr(e.message)
      if (e.retryAfter) setCountdown(e.retryAfter)
      refreshCaptcha() // 图形码一次性，失败后换新
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setErr('')
    if (!emailOk) return setErr('请输入正确的邮箱')
    setBusy(true)
    try {
      const resp =
        tab === 'code'
          ? await authApi.loginByCode(email.trim(), code.trim())
          : await authApi.loginByPassword(email.trim(), password)
      onLoggedIn(resp)
      reset()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setEmail('')
    setCode('')
    setPassword('')
    setCaptchaText('')
    setErr('')
    setHint('')
    setCountdown(0)
  }

  const close = () => {
    reset()
    closeLogin()
  }

  const captchaSrc = captcha
    ? `data:image/svg+xml;utf8,${encodeURIComponent(captcha.svg)}`
    : ''

  return (
    <div className="auth-overlay" onMouseDown={close}>
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={close} aria-label="关闭">
          ×
        </button>
        <h2 className="auth-title">登录 / 注册</h2>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'code' ? 'is-on' : ''}`} onClick={() => setTab('code')}>
            验证码登录
          </button>
          <button className={`auth-tab ${tab === 'password' ? 'is-on' : ''}`} onClick={() => setTab('password')}>
            密码登录
          </button>
        </div>

        <label className="auth-field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        {tab === 'code' ? (
          <>
            <label className="auth-field">
              <span>图形验证码</span>
              <div className="auth-captcha-row">
                <input
                  value={captchaText}
                  onChange={(e) => setCaptchaText(e.target.value)}
                  placeholder="输入图中字符"
                  maxLength={4}
                />
                {captchaSrc && (
                  <img
                    src={captchaSrc}
                    alt="图形验证码"
                    className="auth-captcha-img"
                    onClick={refreshCaptcha}
                    title="点击换一张"
                  />
                )}
              </div>
            </label>

            <label className="auth-field">
              <span>邮箱验证码</span>
              <div className="auth-code-row">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 位验证码"
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  className="btn btn-ghost auth-send"
                  disabled={busy || countdown > 0}
                  onClick={sendCode}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '发送验证码'}
                </button>
              </div>
            </label>
          </>
        ) : (
          <label className="auth-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </label>
        )}

        {err && <div className="auth-msg auth-msg-err">{err}</div>}
        {hint && <div className="auth-msg auth-msg-ok">{hint}</div>}

        <button className="btn btn-primary auth-submit" disabled={busy} onClick={submit}>
          {busy ? '处理中…' : tab === 'code' ? '登录 / 注册' : '登录'}
        </button>

        <p className="auth-foot">
          {tab === 'code'
            ? '未注册的邮箱将自动创建账号，登录后可设置密码。'
            : '还没有密码？切换到「验证码登录」，登录后即可设置。'}
        </p>
      </div>
    </div>
  )
}

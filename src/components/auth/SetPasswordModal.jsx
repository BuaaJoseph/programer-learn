import { useState } from 'react'
import { authApi } from '../../shared/api.js'
import { useAuth } from '../../shared/AuthContext.jsx'

// 设置密码弹窗：验证码首次登录（新建账号）后弹出，引导用户设置登录密码。
// 可「跳过」，之后仍可继续用验证码登录。
export default function SetPasswordModal() {
  const { setPwOpen, closeSetPw, refreshUser } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!setPwOpen) return null

  const strong = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)

  const submit = async () => {
    setErr('')
    if (!strong) return setErr('密码至少 8 位，且需同时包含字母和数字')
    if (pw !== pw2) return setErr('两次输入的密码不一致')
    setBusy(true)
    try {
      const { user } = await authApi.setPassword(pw)
      refreshUser(user)
      close()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setPw('')
    setPw2('')
    setErr('')
    closeSetPw()
  }

  return (
    <div className="auth-overlay" onMouseDown={close}>
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={close} aria-label="关闭">
          ×
        </button>
        <h2 className="auth-title">设置登录密码</h2>
        <p className="auth-foot" style={{ marginTop: 0 }}>
          已为你创建账号。设置密码后，下次可直接用「邮箱 + 密码」登录。
        </p>

        <label className="auth-field">
          <span>新密码</span>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="至少 8 位，含字母和数字"
            autoComplete="new-password"
          />
        </label>
        <label className="auth-field">
          <span>确认密码</span>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="再次输入密码"
            autoComplete="new-password"
          />
        </label>

        {err && <div className="auth-msg auth-msg-err">{err}</div>}

        <button className="btn btn-primary auth-submit" disabled={busy} onClick={submit}>
          {busy ? '保存中…' : '保存密码'}
        </button>
        <button className="auth-skip" onClick={close}>
          暂不设置，稍后再说
        </button>
      </div>
    </div>
  )
}

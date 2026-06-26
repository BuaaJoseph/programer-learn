import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { authApi, getToken, setToken } from './api.js'

// 鉴权上下文：对接真实后端（邮箱验证码 / 邮箱密码登录）。
// 登录态由后端会话 token 维持（存 localStorage）；上层组件用 useAuth() 取登录态与操作。
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false) // 是否完成初始登录态探测
  const [loginOpen, setLoginOpen] = useState(false) // 登录弹窗开关
  const [setPwOpen, setSetPwOpen] = useState(false) // 设置密码弹窗开关

  // 首次挂载：若本地有 token，拉取当前用户校验有效性。
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (getToken()) {
        try {
          const { user } = await authApi.me()
          if (alive) setUser(user)
        } catch {
          setToken(null)
        }
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  // 登录成功后统一处理：存 token、设用户、关登录窗；若需设密码则弹出设密码窗。
  const onLoggedIn = useCallback((resp) => {
    setToken(resp.token)
    setUser(resp.user)
    setLoginOpen(false)
    if (resp.needPassword) setSetPwOpen(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* 忽略 */
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      ready,
      // 已购课程 slug 集合（将来由后端返回，目前为空）。
      entitlements: new Set(),
      // 打开登录弹窗（替换原来的占位 alert）。
      login: () => setLoginOpen(true),
      logout,
      onLoggedIn,
      // 弹窗状态与控制
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      setPwOpen,
      openSetPw: () => setSetPwOpen(true),
      closeSetPw: () => setSetPwOpen(false),
      // 设密码成功后刷新本地用户
      refreshUser: setUser,
    }),
    [user, ready, loginOpen, setPwOpen, logout, onLoggedIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}

// 课程访问控制：
// - 已登录用户：可阅读全部章节；
// - 未登录用户：仅可试读每门课的第 1 章，其余章节需登录后查看。
export function canAccessChapter(course, chapter, auth) {
  if (auth?.isAuthed) return true
  const first = course?.flatChapters?.[0]
  if (!first) return true // 异常兜底：拿不到章节列表时不误锁
  return !!(chapter && first.slug === chapter.slug)
}

// 是否是该课程的第一章（免费试读章）。
export function isFreeChapter(course, chapter) {
  const first = course?.flatChapters?.[0]
  return !!(first && chapter && first.slug === chapter.slug)
}

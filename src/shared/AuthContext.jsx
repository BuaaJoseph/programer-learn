import { createContext, useContext, useMemo } from 'react'

// 鉴权与权限的预埋接口。现在是未登录占位实现；
// 将来接后端时，只需在这里换成真实的登录态与已购课程（entitlements），上层组件无需改动。
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const value = useMemo(
    () => ({
      user: null,
      isAuthed: false,
      // 已购课程 slug 集合；将来由后端返回
      entitlements: new Set(),
      login: () => {
        // TODO: 接入真实登录（OAuth / 账号密码 / 第三方鉴权）
        alert('登录功能即将上线')
      },
      logout: () => {},
    }),
    [],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}

// 课程访问控制：免费课直接放行；付费课需已购或为试读章。
export function canAccessChapter(course, chapter, auth) {
  if (course?.meta?.pricing !== 'paid') return true
  if (chapter?.preview) return true
  return auth?.entitlements?.has(course.meta.slug) || false
}

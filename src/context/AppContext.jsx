import { createContext, useContext } from 'react'
import { useProgress } from '../hooks/useProgress.js'
import { useTheme } from '../hooks/useTheme.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const progress = useProgress()
  const { theme } = useTheme()
  return (
    <AppContext.Provider value={{ progress, theme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}

export function useProgressContext() {
  return useApp().progress
}

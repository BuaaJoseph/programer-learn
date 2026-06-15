import { useEffect } from 'react'

// 固定浅色主题：给 <html> 设置 data-theme="light"。
export function useTheme() {
  const theme = 'light'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])
  return { theme }
}

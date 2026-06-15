import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'llm-handbook:progress'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 记录已完成章节 slug 的集合，并持久化到 localStorage。
export function useProgress() {
  const [done, setDone] = useState(() => new Set(load()))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  }, [done])

  const isDone = useCallback((slug) => done.has(slug), [done])

  const toggle = useCallback((slug) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }, [])

  return { done, isDone, toggle, count: done.size }
}

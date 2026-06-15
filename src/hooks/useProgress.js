import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'lp:progress'

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

// 进度按 `courseSlug/chapterSlug` 复合键存储，避免不同课程的章节 slug 撞车。
function key(courseSlug, slug) {
  return `${courseSlug}/${slug}`
}

export function useProgress() {
  const [done, setDone] = useState(() => new Set(load()))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  }, [done])

  const isDone = useCallback((courseSlug, slug) => done.has(key(courseSlug, slug)), [done])

  const toggle = useCallback((courseSlug, slug) => {
    setDone((prev) => {
      const next = new Set(prev)
      const k = key(courseSlug, slug)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  // 某门课已完成章节数
  const countFor = useCallback(
    (courseSlug) => {
      let n = 0
      const prefix = `${courseSlug}/`
      for (const k of done) if (k.startsWith(prefix)) n++
      return n
    },
    [done],
  )

  return { done, isDone, toggle, countFor, total: done.size }
}

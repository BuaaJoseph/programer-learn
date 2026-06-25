import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProgressContext } from '../context/AppContext.jsx'
import { useAuth } from '../shared/AuthContext.jsx'

export default function Sidebar({ course, onNavigate, open: drawerOpen }) {
  const { chapterSlug } = useParams()
  const { isDone } = useProgressContext()
  const { isAuthed } = useAuth()
  const courseSlug = course.meta.slug
  const volumes = course.volumes
  const firstSlug = course.flatChapters?.[0]?.slug

  const currentVol = chapterSlug ? chapterSlug.split('-')[0] : null

  const [open, setOpen] = useState(() => {
    const init = {}
    volumes.forEach((v) => {
      init[v.id] = v.id === currentVol
    })
    return init
  })

  useEffect(() => {
    if (currentVol) setOpen((prev) => ({ ...prev, [currentVol]: true }))
  }, [currentVol])

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-head">
        <Link to={`/course/${courseSlug}`} className="brand" onClick={onNavigate}>
          <span className="brand-mark">▌</span>
          {course.meta.shortTitle || course.meta.title}
        </Link>
      </div>
      <nav className="sidebar-nav">
        {volumes.map((vol) => {
          const doneCount = vol.chapters.filter((c) => isDone(courseSlug, c.slug)).length
          return (
            <div key={vol.id} className={`vol ${open[vol.id] ? 'open' : ''}`}>
              <button className="vol-head" onClick={() => toggle(vol.id)}>
                <span className="vol-num">{String(vol.index).padStart(2, '0')}</span>
                <span className="vol-meta">
                  <span className="vol-title">{vol.title}</span>
                  <br />
                  <span className="vol-sub">{vol.subtitle}</span>
                </span>
                <span className="vol-count">{doneCount}/{vol.chapters.length}</span>
                <span className="vol-caret">▸</span>
              </button>
              {open[vol.id] && (
                <ul className="chapter-list">
                  {vol.chapters.map((ch) => {
                    const done = isDone(courseSlug, ch.slug)
                    const active = ch.slug === chapterSlug
                    const locked = !isAuthed && ch.slug !== firstSlug
                    return (
                      <li key={ch.slug}>
                        <Link
                          to={`/course/${courseSlug}/${ch.slug}`}
                          className={`chapter-link ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                          onClick={onNavigate}
                          title={locked ? '登录后解锁' : undefined}
                        >
                          <span className={`chapter-mark ${done ? 'done' : ''}`}>{done ? '✓' : '·'}</span>
                          <span>{ch.title}</span>
                          {locked && <span className="chapter-lock">🔒</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

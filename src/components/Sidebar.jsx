import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { VOLUMES } from '../data/curriculum.js'
import { useProgressContext } from '../context/AppContext.jsx'

export default function Sidebar({ onNavigate, open: drawerOpen }) {
  const { slug } = useParams()
  const { isDone } = useProgressContext()
  const currentVol = slug ? slug.split('-')[0] : null

  const [open, setOpen] = useState(() => {
    const init = {}
    VOLUMES.forEach((v) => {
      init[v.id] = v.id === currentVol
    })
    return init
  })

  // 切换章节时，自动展开当前章所在卷。
  useEffect(() => {
    if (currentVol) {
      setOpen((prev) => ({ ...prev, [currentVol]: true }))
    }
  }, [currentVol])

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-head">
        <Link to="/" className="brand" onClick={onNavigate}>
          <span className="brand-mark">▌</span>
          大模型学习手册
        </Link>
      </div>
      <nav className="sidebar-nav">
        {VOLUMES.map((vol) => {
          const doneCount = vol.chapters.filter((c) => isDone(c.slug)).length
          return (
            <div key={vol.id} className={`vol ${open[vol.id] ? 'open' : ''}`}>
              <button className="vol-head" onClick={() => toggle(vol.id)}>
                <span className="vol-num">{String(vol.index).padStart(2, '0')}</span>
                <span className="vol-meta">
                  <span className="vol-title">{vol.title}</span>
                  <br />
                  <span className="vol-sub">{vol.subtitle}</span>
                </span>
                <span className="vol-count">
                  {doneCount}/{vol.chapters.length}
                </span>
                <span className="vol-caret">▸</span>
              </button>
              {open[vol.id] && (
                <ul className="chapter-list">
                  {vol.chapters.map((ch) => {
                    const done = isDone(ch.slug)
                    const active = ch.slug === slug
                    return (
                      <li key={ch.slug}>
                        <Link
                          to={`/chapter/${ch.slug}`}
                          className={`chapter-link ${active ? 'active' : ''}`}
                          onClick={onNavigate}
                        >
                          <span className={`chapter-mark ${done ? 'done' : ''}`}>{done ? '✓' : '·'}</span>
                          <span>{ch.title}</span>
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

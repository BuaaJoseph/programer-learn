import { Link } from 'react-router-dom'
import { useProgressContext } from '../context/AppContext.jsx'

export default function TopBar({ course, onMenu }) {
  const { countFor } = useProgressContext()
  const total = course.totalChapters
  const count = countFor(course.meta.slug)
  const pct = total ? Math.round((count / total) * 100) : 0

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button className="topbar-menu" onClick={onMenu} aria-label="打开目录">
          ☰
        </button>
        <Link to={`/course/${course.meta.slug}`} className="brand reader-brand">
          <span className="brand-mark">▌</span>
          <span className="reader-brand-title">{course.meta.shortTitle || course.meta.title}</span>
        </Link>
      </div>
      <div className="topbar-progress">
        <Link to="/" className="reader-home-link" title="返回平台首页">
          全部课程
        </Link>
        <div className="progressbar" aria-label="课程学习进度">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-count">
          {count}/{total}
        </span>
      </div>
    </header>
  )
}

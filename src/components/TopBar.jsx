import { Link } from 'react-router-dom'
import { useProgressContext } from '../context/AppContext.jsx'
import { TOTAL_CHAPTERS } from '../data/curriculum.js'

export default function TopBar({ onMenu }) {
  const { count } = useProgressContext()
  const pct = TOTAL_CHAPTERS ? Math.round((count / TOTAL_CHAPTERS) * 100) : 0

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="topbar-menu" onClick={onMenu} aria-label="打开目录">
          ☰
        </button>
        <Link to="/" className="brand">
          <span className="brand-mark">▌</span>
          大模型学习手册
        </Link>
      </div>
      <div className="topbar-progress">
        <div className="progressbar" aria-label="全局学习进度">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-count">
          {count}/{TOTAL_CHAPTERS}
        </span>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../../catalog/categories.js'
import CategoryIcon from './CategoryIcon.jsx'
import { useAuth } from '../../shared/AuthContext.jsx'

export default function GlobalNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { login, logout, isAuthed, user } = useAuth()

  const submitSearch = (e) => {
    e.preventDefault()
    const term = q.trim()
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <header className="gnav">
      <div className="gnav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">▌</span>
          编程学习站
        </Link>

        <nav className="gnav-cats" onMouseLeave={() => setMenuOpen(false)}>
          <button className="gnav-cats-btn" onMouseEnter={() => setMenuOpen(true)} onClick={() => setMenuOpen((v) => !v)}>
            课程分类 ▾
          </button>
          {menuOpen && (
            <div className="gnav-menu">
              {CATEGORIES.map((cat) => (
                <div className="gnav-menu-col" key={cat.id}>
                  <Link to={`/c/${cat.id}`} className="gnav-menu-head" onClick={() => setMenuOpen(false)}>
                    <span className="gnav-menu-ic"><CategoryIcon id={cat.id} size={16} /></span>
                    <span>{cat.title}</span>
                  </Link>
                  <ul>
                    {cat.subs.map((sub) => (
                      <li key={sub.id}>
                        <Link to={`/c/${cat.id}/${sub.id}`} onClick={() => setMenuOpen(false)}>
                          {sub.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </nav>

        <Link to="/interview" className="gnav-interview">🎤 面试模拟</Link>

        <Link to="/playground" className="gnav-play">▶ 在线运行</Link>

        <form className="gnav-search" onSubmit={submitSearch}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索课程…"
            aria-label="搜索课程"
          />
        </form>

        {isAuthed ? (
          <div className="gnav-user">
            <span className="gnav-user-name" title={user?.email}>
              {user?.nickname || user?.email}
            </span>
            <button className="btn btn-ghost gnav-login" onClick={logout}>
              退出
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost gnav-login" onClick={login}>
            登录
          </button>
        )}
      </div>
    </header>
  )
}

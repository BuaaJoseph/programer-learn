import { Suspense, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { findChapterBySlug, findVolumeById } from '../data/curriculum.js'
import { getContent, hasContent } from '../content/registry.js'
import { useProgressContext } from '../context/AppContext.jsx'
import Placeholder from './Placeholder.jsx'
import NotFound from './NotFound.jsx'

export default function ChapterPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { chapter, prev, next } = findChapterBySlug(slug)
  const { isDone, toggle } = useProgressContext()

  // 切章滚动归顶
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // 键盘左右方向键翻页
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && prev) navigate(`/chapter/${prev.slug}`)
      if (e.key === 'ArrowRight' && next) navigate(`/chapter/${next.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate])

  if (!chapter) return <NotFound />

  const vol = findVolumeById(chapter.volumeId)
  const done = isDone(slug)
  const Content = hasContent(slug) ? getContent(slug) : null

  return (
    <div className="reader">
      <header className="chapter-head">
        <div className="breadcrumb">
          第{vol.index}卷 · {vol.title}
        </div>
        <span className="topic-pill">{chapter.topic}</span>
        <h1>{chapter.title}</h1>
        <div className="chapter-meta">
          <span>预计 {chapter.minutes} 分钟</span>
          <span>已撰写</span>
        </div>
        <p className="chapter-hook">{chapter.hook}</p>
      </header>

      <hr />

      {Content ? (
        <Suspense fallback={<div className="loading-block">正在加载本章内容…</div>}>
          <Content />
        </Suspense>
      ) : (
        <Placeholder title={chapter.title} />
      )}

      <footer className="chapter-foot">
        <button
          className={`done-toggle ${done ? 'is-done' : ''}`}
          onClick={() => toggle(slug)}
          style={{ width: '100%', textAlign: 'left' }}
        >
          <span className="done-switch" />
          <span>
            <span className="done-label">{done ? '已学完这一章' : '标记为已学完'}</span>
            <br />
            <span className="done-sub">进度会保存在本地浏览器</span>
          </span>
        </button>

        <nav className="pager">
          {prev ? (
            <Link className="prev" to={`/chapter/${prev.slug}`}>
              <span className="dir">← 上一章</span>
              <span className="ttl">{prev.title}</span>
            </Link>
          ) : (
            <span style={{ flex: 1, maxWidth: '48%' }} />
          )}
          {next ? (
            <Link className="next" to={`/chapter/${next.slug}`}>
              <span className="dir">下一章 →</span>
              <span className="ttl">{next.title}</span>
            </Link>
          ) : (
            <span style={{ flex: 1, maxWidth: '48%' }} />
          )}
        </nav>
      </footer>
    </div>
  )
}

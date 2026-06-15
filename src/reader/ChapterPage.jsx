import { Suspense, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourse } from '../catalog/courses.js'
import { categoryPath } from '../catalog/categories.js'
import { useProgressContext } from '../context/AppContext.jsx'
import { useAuth, canAccessChapter } from '../shared/AuthContext.jsx'
import ReaderLayout from './ReaderLayout.jsx'
import Placeholder from './Placeholder.jsx'
import NotFound from '../platform/pages/NotFound.jsx'

export default function ChapterPage() {
  const { courseSlug, chapterSlug } = useParams()
  const navigate = useNavigate()
  const { isDone, toggle } = useProgressContext()
  const auth = useAuth()

  const course = getCourse(courseSlug)
  const found = course ? course.findChapterBySlug(chapterSlug) : { chapter: null }
  const { chapter, prev, next } = found

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [courseSlug, chapterSlug])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && prev) navigate(`/course/${courseSlug}/${prev.slug}`)
      if (e.key === 'ArrowRight' && next) navigate(`/course/${courseSlug}/${next.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate, courseSlug])

  if (!course || !chapter) return <NotFound />

  const vol = course.findVolumeById(chapter.volumeId)
  const done = isDone(courseSlug, chapterSlug)
  const Content = course.hasContent(chapterSlug) ? course.getContent(chapterSlug) : null
  const allowed = canAccessChapter(course, chapter, auth)
  const path = categoryPath(course.meta.categoryId, course.meta.subCategoryId)

  return (
    <ReaderLayout course={course}>
      <div className="reader">
        <header className="chapter-head">
          <div className="breadcrumb">
            <Link to="/">{path[0]?.title}</Link> · 第{vol.index}卷 · {vol.title}
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

        {!allowed ? (
          <div className="paywall">
            <h2>这是付费章节</h2>
            <p>登录并购买本课程后即可阅读全部内容。</p>
            <button className="btn btn-primary" onClick={auth.login}>
              登录 / 购买
            </button>
          </div>
        ) : Content ? (
          <Suspense fallback={<div className="loading-block">正在加载本章内容…</div>}>
            <Content />
          </Suspense>
        ) : (
          <Placeholder title={chapter.title} courseSlug={courseSlug} />
        )}

        <footer className="chapter-foot">
          <button
            className={`done-toggle ${done ? 'is-done' : ''}`}
            onClick={() => toggle(courseSlug, chapterSlug)}
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
              <Link className="prev" to={`/course/${courseSlug}/${prev.slug}`}>
                <span className="dir">← 上一章</span>
                <span className="ttl">{prev.title}</span>
              </Link>
            ) : (
              <span style={{ flex: 1, maxWidth: '48%' }} />
            )}
            {next ? (
              <Link className="next" to={`/course/${courseSlug}/${next.slug}`}>
                <span className="dir">下一章 →</span>
                <span className="ttl">{next.title}</span>
              </Link>
            ) : (
              <span style={{ flex: 1, maxWidth: '48%' }} />
            )}
          </nav>
        </footer>
      </div>
    </ReaderLayout>
  )
}

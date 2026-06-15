import { Link, useSearchParams } from 'react-router-dom'
import PlatformLayout from '../PlatformLayout.jsx'
import { COURSES } from '../../catalog/courses.js'

// 跨课程检索：先在课程标题/简介与章节标题里做简单匹配。
export default function Search() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const lower = q.toLowerCase()

  const chapterHits = []
  const courseHits = []
  if (q) {
    for (const course of COURSES) {
      const m = course.meta
      if ((m.title + m.description).toLowerCase().includes(lower)) courseHits.push(course)
      for (const vol of course.volumes) {
        for (const ch of vol.chapters) {
          if ((ch.title + ' ' + ch.topic).toLowerCase().includes(lower)) {
            chapterHits.push({ course, vol, ch })
          }
        }
      }
    }
  }

  return (
    <PlatformLayout>
      <div className="container">
        <h1 className="browse-h1">搜索：{q || '（空）'}</h1>
        <p className="section-desc">
          匹配到 {courseHits.length} 门课程、{chapterHits.length} 个章节
        </p>

        {courseHits.length > 0 && (
          <>
            <h2 className="section-title">课程</h2>
            <ul className="search-list">
              {courseHits.map((c) => (
                <li key={c.meta.slug}>
                  <Link to={`/course/${c.meta.slug}`}>{c.meta.title}</Link>
                  <span className="muted"> — {c.meta.description}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {chapterHits.length > 0 && (
          <>
            <h2 className="section-title">章节</h2>
            <ul className="search-list">
              {chapterHits.slice(0, 50).map(({ course, vol, ch }) => (
                <li key={course.meta.slug + ch.slug}>
                  <Link to={`/course/${course.meta.slug}/${ch.slug}`}>{ch.title}</Link>
                  <span className="muted"> — {course.meta.shortTitle} · 第{vol.index}卷</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {q && courseHits.length === 0 && chapterHits.length === 0 && (
          <div className="empty-note">没有匹配的结果，换个关键词试试。</div>
        )}
      </div>
    </PlatformLayout>
  )
}

import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import PlatformLayout from '../PlatformLayout.jsx'
import { getCourse } from '../../catalog/courses.js'
import { categoryPath } from '../../catalog/categories.js'
import { useProgressContext } from '../../context/AppContext.jsx'
import NotFound from './NotFound.jsx'

const HOW = [
  { step: '01', title: '讲清楚', desc: '开门见山说清概念是什么、为什么需要、解决什么问题，不绕弯子、不堆术语。' },
  { step: '02', title: '举例子', desc: '用具体输入输出、真实场景和好坏对比，把抽象原理落到看得见的地方。' },
  { step: '03', title: '动手做', desc: '每章都配可复制运行的代码或练习，亲手跑一遍才算学会。' },
]

export default function CourseLanding() {
  const { courseSlug } = useParams()
  const course = getCourse(courseSlug)
  const { countFor, isDone } = useProgressContext()

  if (!course) return <NotFound />

  const { meta, volumes, totalChapters, totalMinutes, flatChapters } = course
  const done = countFor(meta.slug)
  const hours = Math.round(totalMinutes / 60)
  const path = categoryPath(meta.categoryId, meta.subCategoryId)

  // 续学：第一个未完成的章节，否则第一章
  const nextChapter = flatChapters.find((c) => !isDone(meta.slug, c.slug)) || flatChapters[0]
  const startLabel = done > 0 ? '继续上次' : '开始学习'

  return (
    <PlatformLayout>
      <div className="container">
        <section className="course-hero">
          <div className="course-hero-cover" style={{ '--c': meta.accent }}>
            {meta.cover}
          </div>
          <div className="course-hero-body">
            <div className="breadcrumb">
              <Link to="/">首页</Link> ›{' '}
              <Link to={`/c/${meta.categoryId}`}>{path[0]?.title}</Link>
              {path[1] && (
                <>
                  {' '}›{' '}
                  <Link to={`/c/${meta.categoryId}/${meta.subCategoryId}`}>{path[1].title}</Link>
                </>
              )}
            </div>
            <h1>{meta.title}</h1>
            <p className="course-hero-desc">{meta.description}</p>
            <div className="course-hero-stats">
              <div><b>{volumes.length}</b><span>卷</span></div>
              <div><b>{totalChapters}</b><span>章</span></div>
              <div><b>≈{hours}h</b><span>时长</span></div>
              <div><b>{done}</b><span>已学完</span></div>
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary" to={`/course/${meta.slug}/${nextChapter.slug}`}>
                {startLabel} →
              </Link>
              <span className={`tag ${meta.pricing === 'paid' ? 'paid' : 'free'}`}>
                {meta.pricing === 'paid' ? '付费课程' : '免费'}
              </span>
            </div>
          </div>
        </section>

        <div className="course-cols">
          <div className="course-cols-main">
            <h2 className="section-title">课程目录</h2>
            <p className="section-desc">点开任意一卷查看章节，点击章节直接进入学习。</p>
            <CourseOutline course={course} isDone={isDone} />
          </div>

          <aside className="course-cols-side">
            <div className="side-card">
              <h3>你将学到</h3>
              <ul className="check-list">
                {meta.outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
            <div className="side-card">
              <h3>适合人群</h3>
              <ul className="dot-list">
                {meta.audience.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <section>
          <h2 className="section-title">这门课怎么学</h2>
          <div className="how-row">
            {HOW.map((h) => (
              <div className="how-card" key={h.step}>
                <div className="how-step">{h.step}</div>
                <h3>{h.title}</h3>
                <p>{h.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PlatformLayout>
  )
}

function CourseOutline({ course, isDone }) {
  const { meta, volumes } = course
  const [open, setOpen] = useState(() => ({ [volumes[0].id]: true }))
  const toggle = (id) => setOpen((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="outline">
      {volumes.map((vol) => {
        const doneCount = vol.chapters.filter((c) => isDone(meta.slug, c.slug)).length
        return (
          <div className={`outline-vol ${open[vol.id] ? 'open' : ''}`} key={vol.id}>
            <button className="outline-vol-head" onClick={() => toggle(vol.id)}>
              <span className="vol-num">{String(vol.index).padStart(2, '0')}</span>
              <span className="vol-meta">
                <span className="vol-title">{vol.title}</span>
                <span className="vol-sub">{vol.subtitle}</span>
              </span>
              <span className="vol-count">{doneCount}/{vol.chapters.length}</span>
              <span className="vol-caret">▸</span>
            </button>
            {open[vol.id] && (
              <ul className="outline-chapters">
                {vol.chapters.map((ch) => (
                  <li key={ch.slug}>
                    <Link to={`/course/${meta.slug}/${ch.slug}`}>
                      <span className={`chapter-mark ${isDone(meta.slug, ch.slug) ? 'done' : ''}`}>
                        {isDone(meta.slug, ch.slug) ? '✓' : '·'}
                      </span>
                      <span className="outline-ch-title">{ch.title}</span>
                      <span className="outline-ch-min">{ch.minutes}m</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

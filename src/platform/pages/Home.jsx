import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import PlatformLayout from '../PlatformLayout.jsx'
import CourseCard from '../components/CourseCard.jsx'
import { CATEGORIES } from '../../catalog/categories.js'
import { coursesByCategory } from '../../catalog/courses.js'

export default function Home() {
  // 只展示「有课程」的一级分类，每个分类一组。
  const groups = CATEGORIES.map((cat) => ({ cat, courses: coursesByCategory(cat.id) })).filter(
    (g) => g.courses.length > 0,
  )

  return (
    <PlatformLayout>
      <div className="container">
        <section className="phero">
          <div className="hero-eyebrow">PROGRAMMING · 系统化技术课程</div>
          <h1>
            把每一门技术，<span className="hl">讲到能上手</span>
          </h1>
          <p className="hero-lead">
            服务端、前端、移动端……每门课都用「直白讲清概念 + 举例子 + 动手实践」的方式带你从原理学到落地。
            选一个方向，开始系统地啃下来。
          </p>
        </section>

        {groups.map(({ cat, courses }) => (
          <CategorySection key={cat.id} cat={cat} courses={courses} />
        ))}
      </div>
    </PlatformLayout>
  )
}

// 单个一级分类：最多展示两行，多出来的用「上一组 / 下一组」翻页查看。
function CategorySection({ cat, courses }) {
  const sectionRef = useRef(null)
  const gridRef = useRef(null)
  const [cols, setCols] = useState(3)
  const [page, setPage] = useState(0)

  // 实时测量当前网格的列数（桌面 3 列、窄屏 1 列），这样「两行」在各断点都成立。
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => {
      const tpl = getComputedStyle(el).gridTemplateColumns
      const n = tpl.split(' ').filter(Boolean).length
      setCols(n > 0 ? n : 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageSize = Math.max(1, cols * 2) // 两行
  const pageCount = Math.max(1, Math.ceil(courses.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)

  // 断点变化导致页数变少时，纠正越界的当前页。
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [pageCount, page])

  const start = safePage * pageSize
  const visible = courses.slice(start, start + pageSize)
  const hasPaging = pageCount > 1

  const goto = (next) => {
    setPage(next)
    // 翻页后把本分类标题滚到舒适位置，像翻页一样浏览。
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="cat-group" ref={sectionRef}>
      <div className="cat-group-head">
        <h2 className="section-title">
          <span className="cat-group-icon">{cat.icon}</span>
          {cat.title}
          <span className="cat-group-sub">{cat.subtitle}</span>
        </h2>
        <Link className="cat-group-more" to={`/c/${cat.id}`}>
          查看全部 →
        </Link>
      </div>
      <div className="course-grid" ref={gridRef}>
        {visible.map((course) => (
          <CourseCard key={course.meta.slug} course={course} />
        ))}
      </div>
      {hasPaging && (
        <div className="cat-pager">
          <button className="cat-pager-btn" onClick={() => goto(safePage - 1)} disabled={safePage === 0}>
            ← 上一组
          </button>
          <span className="cat-pager-info">
            {safePage + 1} / {pageCount}
          </span>
          <button className="cat-pager-btn" onClick={() => goto(safePage + 1)} disabled={safePage === pageCount - 1}>
            下一组 →
          </button>
        </div>
      )}
    </section>
  )
}

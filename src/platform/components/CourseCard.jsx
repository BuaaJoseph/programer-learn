import { Link } from 'react-router-dom'
import { categoryPath } from '../../catalog/categories.js'
import { useProgressContext } from '../../context/AppContext.jsx'
import CourseCover from './CourseCover.jsx'

export default function CourseCard({ course }) {
  const { countFor } = useProgressContext()
  const { meta, totalChapters, totalMinutes } = course
  const done = countFor(meta.slug)
  const pct = totalChapters ? Math.round((done / totalChapters) * 100) : 0
  const path = categoryPath(meta.categoryId, meta.subCategoryId)
  const hours = Math.round(totalMinutes / 60)

  return (
    <Link className="course-card" to={`/course/${meta.slug}`}>
      <div className="course-card-cover">
        <CourseCover course={course} />
      </div>
      <div className="course-card-body">
        <div className="course-card-crumb">{path.map((p) => p.title).join(' › ')}</div>
        <h3>{meta.shortTitle || meta.title}</h3>
        <p className="course-card-desc">{meta.description}</p>
        <div className="course-card-meta">
          <span>{course.volumes.length} 卷 · {totalChapters} 章</span>
          <span>≈{hours}h</span>
          <span className={`tag ${meta.pricing === 'paid' ? 'paid' : 'free'}`}>
            {meta.pricing === 'paid' ? '付费' : '免费'}
          </span>
        </div>
        <div className="vol-progress-line">
          <div className="progressbar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="lbl">{done}/{totalChapters}</span>
        </div>
      </div>
    </Link>
  )
}

import { Link, useParams } from 'react-router-dom'
import PlatformLayout from '../PlatformLayout.jsx'
import CourseCard from '../components/CourseCard.jsx'
import CategoryIcon from '../components/CategoryIcon.jsx'
import { CATEGORIES, findCategory, findSubCategory } from '../../catalog/categories.js'
import { coursesByCategory, coursesBySubCategory } from '../../catalog/courses.js'

export default function Browse() {
  const { cat, sub } = useParams()
  const category = findCategory(cat)

  if (!category) {
    return (
      <PlatformLayout>
        <div className="container center-pane">
          <h1>分类不存在</h1>
          <p>没有找到这个分类，去首页看看其它方向吧。</p>
          <Link className="btn btn-primary" to="/">返回首页</Link>
        </div>
      </PlatformLayout>
    )
  }

  const activeSub = sub ? findSubCategory(cat, sub) : null
  const courses = sub ? coursesBySubCategory(cat, sub) : coursesByCategory(cat)

  return (
    <PlatformLayout>
      <div className="container browse">
        <aside className="browse-tree">
          <div className="browse-tree-title">课程分类</div>
          {CATEGORIES.map((c) => (
            <div className="browse-tree-cat" key={c.id}>
              <Link to={`/c/${c.id}`} className={`browse-tree-head ${c.id === cat && !sub ? 'active' : ''}`}>
                <span className="browse-tree-ic"><CategoryIcon id={c.id} size={16} /></span>
                <span className="browse-tree-name">{c.title}</span>
              </Link>
              <ul>
                {c.subs.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/c/${c.id}/${s.id}`}
                      className={c.id === cat && s.id === sub ? 'active' : ''}
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="browse-main">
          <div className="breadcrumb">
            <Link to="/">首页</Link> › <Link to={`/c/${cat}`}>{category.title}</Link>
            {activeSub && <> › {activeSub.sub.title}</>}
          </div>
          <div className="browse-hero">
            <span className="browse-hero-ic"><CategoryIcon id={category.id} size={26} /></span>
            <div>
              <h1 className="browse-h1">
                {category.title}
                {activeSub ? ` · ${activeSub.sub.title}` : ''}
              </h1>
              <p className="section-desc">
                {activeSub ? activeSub.sub.subtitle : category.subtitle} · 共 {courses.length} 门课程
              </p>
            </div>
          </div>

          {!activeSub && category.subs.length > 0 && (
            <div className="browse-chips">
              {category.subs.map((s) => (
                <Link key={s.id} className="browse-chip" to={`/c/${cat}/${s.id}`}>
                  {s.title}
                </Link>
              ))}
            </div>
          )}

          {courses.length ? (
            <div className="course-grid two">
              {courses.map((course) => (
                <CourseCard key={course.meta.slug} course={course} />
              ))}
            </div>
          ) : (
            <div className="empty-note">这个方向的课程正在筹备中，敬请期待。</div>
          )}
        </div>
      </div>
    </PlatformLayout>
  )
}

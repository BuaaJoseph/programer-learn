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
          <section className="cat-group" key={cat.id}>
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
            <div className="course-grid">
              {courses.map((course) => (
                <CourseCard key={course.meta.slug} course={course} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PlatformLayout>
  )
}

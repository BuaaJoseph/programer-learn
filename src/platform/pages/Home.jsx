import PlatformLayout from '../PlatformLayout.jsx'
import CourseCard from '../components/CourseCard.jsx'
import { COURSES } from '../../catalog/courses.js'

export default function Home() {
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

        <section>
          <h2 className="section-title">全部课程</h2>
          <p className="section-desc">目前已上线的课程，更多方向陆续补齐。</p>
          <div className="course-grid">
            {COURSES.map((course) => (
              <CourseCard key={course.meta.slug} course={course} />
            ))}
          </div>
        </section>
      </div>
    </PlatformLayout>
  )
}

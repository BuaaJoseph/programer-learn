import { Link } from 'react-router-dom'
import { VOLUMES, TOTAL_CHAPTERS, TOTAL_MINUTES } from '../data/curriculum.js'
import { useProgressContext } from '../context/AppContext.jsx'

const HOW = [
  { step: '01', title: '讲清楚', desc: '开门见山说清每个概念是什么、为什么需要、解决什么问题，不绕弯子、不堆术语。' },
  { step: '02', title: '举例子', desc: '用具体的输入输出、真实场景和好坏对比，把抽象原理落到看得见的地方。' },
  { step: '03', title: '动手做', desc: '每章都配可复制运行的代码或练习，把读到的东西亲手跑一遍才算学会。' },
]

export default function Home() {
  const { count, isDone } = useProgressContext()
  const hours = Math.round(TOTAL_MINUTES / 60)

  return (
    <div className="reader">
      <section className="hero">
        <div className="hero-eyebrow">LLM × AGENT 学习路径</div>
        <h1>
          从<span className="hl">原理</span>到能干活的 Agent
        </h1>
        <p className="hero-lead">
          这是一套写给工程师的中文学习手册。不讲故事、不堆公式吓人，而是用「直白讲清概念 + 举例子 + 动手实践」
          的方式，把大语言模型的内部原理与 Agent 开发，从下一个词预测一路讲到能上线的多 Agent 系统。
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/chapter/v1-c1">
            从第一章开始 →
          </Link>
          <a className="btn btn-ghost" href="#catalog">
            浏览课程目录
          </a>
        </div>
      </section>

      <section className="stat-row">
        <div className="stat-card">
          <div className="stat-num">{VOLUMES.length}</div>
          <div className="stat-label">卷 · 循序渐进</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{TOTAL_CHAPTERS}</div>
          <div className="stat-label">章 · 每章都写透</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">≈{hours}h</div>
          <div className="stat-label">预计总时长</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{count}</div>
          <div className="stat-label">你已学完</div>
        </div>
      </section>

      <section>
        <h2 className="section-title">这套课程怎么学</h2>
        <p className="section-desc">每一章都按同一个节奏推进，读起来不费劲，学起来有抓手。</p>
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

      <section id="catalog">
        <h2 className="section-title">课程目录</h2>
        <p className="section-desc">八卷由浅入深：先打透原理，再一步步搭起能干活的 Agent。</p>
        <div className="vol-grid">
          {VOLUMES.map((vol) => {
            const done = vol.chapters.filter((c) => isDone(c.slug)).length
            const pct = Math.round((done / vol.chapters.length) * 100)
            return (
              <Link className="vol-card" to={`/chapter/${vol.chapters[0].slug}`} key={vol.id}>
                <div className="vol-card-head">
                  <span className="vol-card-num">{vol.index}</span>
                  <div>
                    <h3>{vol.title}</h3>
                    <div className="vol-card-sub">{vol.subtitle}</div>
                  </div>
                </div>
                <p className="vol-card-theme">{vol.theme}</p>
                <div className="vol-progress-line">
                  <div className="progressbar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="lbl">
                    {done}/{vol.chapters.length}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

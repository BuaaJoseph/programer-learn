import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 线程池提交流程：core → queue → max → reject。core=2, queue=3, max=4。
const STEPS = [
  { n: 1, desc: '任务来 → 核心线程未满 → 创建核心线程执行', core: 1, queue: 0, extra: 0, reject: 0 },
  { n: 2, desc: '核心线程占满(2 个)', core: 2, queue: 0, extra: 0, reject: 0 },
  { n: 5, desc: '核心满 → 任务进阻塞队列排队(容量 3)', core: 2, queue: 3, extra: 0, reject: 0 },
  { n: 6, desc: '队列也满 → 创建非核心线程(直到 max=4)', core: 2, queue: 3, extra: 2, reject: 0 },
  { n: 7, desc: '线程到 max、队列也满 → 触发拒绝策略', core: 2, queue: 3, extra: 2, reject: 1 },
]

export default function ThreadPool() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>提交更多任务 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">core=2, queue=3, max=4</span>
    </>
  )

  const dots = (x, y, n, color) => Array.from({ length: n }).map((_, i) => <circle key={i} cx={x + i * 18} cy={y} r="7" fill={color} />)

  return (
    <Figure caption="线程池提交任务的流程顺序(高频考点)：①核心线程没满→建核心线程 ②满了→进阻塞队列 ③队列满→建非核心线程到 max ④还满→执行拒绝策略。记反顺序就错了。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="线程池提交流程">
        {/* 核心线程 */}
        <rect x="20" y="30" width="130" height="44" rx="9" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="28" y="46" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">① 核心线程(2)</text>
        {dots(36, 62, s.core, 'var(--green)')}
        {/* 队列 */}
        <rect x="165" y="30" width="150" height="44" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="173" y="46" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">② 阻塞队列(3)</text>
        {dots(181, 62, s.queue, 'var(--accent)')}
        {/* 非核心 */}
        <rect x="330" y="30" width="110" height="44" rx="9" fill="var(--amber-soft)" stroke="var(--amber-line)" />
        <text x="338" y="46" fontFamily="var(--mono)" fontSize="9" fill="var(--amber)">③ 非核心(→4)</text>
        {dots(346, 62, s.extra, 'var(--amber)')}
        {/* 拒绝 */}
        <rect x="165" y="92" width="275" height="40" rx="9" fill={s.reject ? 'var(--rose-soft)' : 'var(--bg-subtle)'} stroke={s.reject ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth={s.reject ? 2 : 1} />
        <text x="302" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={s.reject ? 'var(--rose)' : 'var(--ink-faint)'}>④ 拒绝策略 {s.reject ? '已触发' : '(未触发)'}</text>
        <text x="302" y="124" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">Abort/CallerRuns/Discard/DiscardOldest</text>

        <line x1="150" y1="52" x2="165" y2="52" stroke="var(--ink-faint)" strokeWidth="1.3" markerEnd="url(#tp-a)" />
        <line x1="315" y1="52" x2="330" y2="52" stroke="var(--ink-faint)" strokeWidth="1.3" markerEnd="url(#tp-a)" />
        <defs><marker id="tp-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="420" height="38" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="166" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">已提交第 {s.n} 个任务</text>
        <text x="32" y="182" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

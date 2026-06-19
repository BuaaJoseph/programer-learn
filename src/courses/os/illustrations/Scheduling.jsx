import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 三个进程(到达时间0, 突发时间不同)在不同算法下的执行顺序(甘特图)。
const JOBS = [{ id: 'A', burst: 6 }, { id: 'B', burst: 2 }, { id: 'C', burst: 4 }]
const ALGOS = {
  fcfs: { label: 'FCFS 先来先服务', order: ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'C', 'C', 'C', 'C'], desc: '按到达顺序执行。简单公平，但短作业被长作业堵在后面(护航效应)，平均等待时间长。' },
  sjf: { label: 'SJF 短作业优先', order: ['B', 'B', 'C', 'C', 'C', 'C', 'A', 'A', 'A', 'A', 'A', 'A'], desc: '优先调度突发时间最短的，平均等待时间最优；但长作业可能饿死，且需预知运行时间。' },
  rr: { label: 'RR 时间片轮转', order: ['A', 'A', 'B', 'B', 'C', 'C', 'A', 'A', 'C', 'C', 'A', 'A'], desc: '每个进程轮流执行一个时间片，响应快、公平，适合分时系统；时间片太小则切换开销大。' },
}
const COLOR = { A: 'var(--accent)', B: 'var(--green)', C: 'var(--amber)' }

export default function Scheduling() {
  const [k, setK] = useState('rr')
  const a = ALGOS[k]

  const controls = (
    <>
      {Object.entries(ALGOS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label.split(' ')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="进程调度在公平、吞吐、响应之间权衡。用甘特图看 A(6)、B(2)、C(4) 三个进程在不同算法下的执行顺序差异。还有多级反馈队列(MLFQ)综合了它们的优点，是现代系统常用方案。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="进程调度算法">
        <text x="20" y="40" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">进程：A(6) B(2) C(4)  · CPU 时间线 →</text>
        {a.order.map((id, i) => (
          <g key={i}>
            <rect x={20 + i * 34} y="50" width="32" height="34" rx="3" fill={COLOR[id]} />
            <text x={36 + i * 34} y="72" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">{id}</text>
          </g>
        ))}
        {a.order.map((_, i) => i % 2 === 0 && <text key={i} x={20 + i * 34} y="98" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">{i}</text>)}

        <rect x="20" y="116" width="420" height="50" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="120" width="404" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}><strong style={{ color: 'var(--accent-strong)' }}>{a.label}：</strong>{a.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

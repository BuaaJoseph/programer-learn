import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const ROWS = [
  { k: '定义', proc: '资源分配的基本单位', thread: 'CPU 调度的基本单位', coro: '用户态调度的轻量执行单元' },
  { k: '地址空间', proc: '独立(互相隔离)', thread: '共享所属进程的内存', coro: '共享线程的内存' },
  { k: '开销', proc: '大(创建/切换/通信都贵)', thread: '小(共享内存)', coro: '极小(无内核切换)' },
  { k: '通信', proc: 'IPC(管道/共享内存…)', thread: '直接读共享变量(需同步)', coro: '直接共享，协作式切换' },
  { k: '调度', proc: '操作系统内核', thread: '操作系统内核', coro: '用户程序自己(协作式)' },
]

export default function ProcessThread() {
  const [col, setCol] = useState('thread')

  const controls = (
    <>
      <button className={`fig-btn ${col === 'proc' ? 'active' : ''}`} onClick={() => setCol('proc')}>进程</button>
      <button className={`fig-btn ${col === 'thread' ? 'active' : ''}`} onClick={() => setCol('thread')}>线程</button>
      <button className={`fig-btn ${col === 'coro' ? 'active' : ''}`} onClick={() => setCol('coro')}>协程</button>
    </>
  )

  return (
    <Figure caption="进程 vs 线程 vs 协程的对比是高频考点。一句话：进程是资源分配单位、线程是 CPU 调度单位、协程是用户态自己调度的轻量线程。点上方高亮某一列。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="进程线程协程对比">
        {['', '进程', '线程', '协程'].map((h, i) => (
          <g key={i}>
            <rect x={20 + i * 110} y="16" width={i === 0 ? 80 : 108} height="24" rx="5"
              fill={i > 0 && ['', 'proc', 'thread', 'coro'][i] === col ? 'var(--accent)' : 'var(--bg-sunken)'} />
            <text x={i === 0 ? 60 : 74 + i * 110} y="32" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={i > 0 && ['', 'proc', 'thread', 'coro'][i] === col ? '#ffffff' : 'var(--ink)'}>{h}</text>
          </g>
        ))}
        {ROWS.map((r, ri) => (
          <g key={ri}>
            <text x="26" y={62 + ri * 30} fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--ink-soft)">{r.k}</text>
            {['proc', 'thread', 'coro'].map((c, ci) => (
              <g key={c}>
                <rect x={130 + ci * 110} y={48 + ri * 30} width="106" height="26" rx="4" fill={c === col ? 'var(--accent-soft)' : 'var(--bg-subtle)'} stroke={c === col ? 'var(--accent-line)' : 'var(--border)'} />
                <foreignObject x={134 + ci * 110} y={49 + ri * 30} width="100" height="24">
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '8.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.15, display: 'flex', alignItems: 'center', height: '24px' }}>{r[c]}</div>
                </foreignObject>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </Figure>
  )
}

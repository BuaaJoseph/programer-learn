import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STATES = {
  NEW: { label: 'NEW', desc: '已创建 Thread 对象，但还没调用 start()。', x: 60, y: 40 },
  RUNNABLE: { label: 'RUNNABLE', desc: '调用 start() 后，等待或正在 CPU 上运行(Java 把就绪和运行合并为 RUNNABLE)。', x: 200, y: 40 },
  BLOCKED: { label: 'BLOCKED', desc: '等待进入 synchronized 同步块/方法，没抢到锁被阻塞。', x: 360, y: 40 },
  WAITING: { label: 'WAITING', desc: '调用 wait()/join()/park() 无限等待，需被其它线程唤醒。', x: 130, y: 130 },
  TIMED: { label: 'TIMED_WAITING', desc: '带超时的等待，如 sleep(n)、wait(n)，到点自动醒。', x: 290, y: 130 },
  TERMINATED: { label: 'TERMINATED', desc: 'run() 执行完毕或异常退出，线程结束。', x: 360, y: 130 },
}

export default function ThreadState() {
  const [k, setK] = useState('RUNNABLE')
  const s = STATES[k]

  const controls = (
    <>
      {Object.entries(STATES).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="Java 线程有 6 种状态。注意两个常考点：Java 把「就绪」和「运行」合并成 RUNNABLE；BLOCKED 专指抢 synchronized 锁失败，而 wait/park 属于 WAITING。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="线程状态">
        {Object.entries(STATES).map(([key, v]) => {
          const sel = k === key
          return (
            <g key={key}>
              <rect x={v.x - 50} y={v.y - 16} width="100" height="32" rx="16" fill={sel ? 'var(--violet)' : '#f0eafb'} stroke={sel ? 'var(--violet)' : '#ddd0f2'} strokeWidth={sel ? 2 : 1} />
              <text x={v.x} y={v.y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fontWeight="700" fill={sel ? '#ffffff' : 'var(--ink)'}>{v.label}</text>
            </g>
          )
        })}
        {/* 主要转换箭头 */}
        <line x1="110" y1="40" x2="150" y2="40" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#ts-a)" />
        <line x1="250" y1="40" x2="310" y2="40" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#ts-a)" />
        <line x1="200" y1="56" x2="150" y2="114" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#ts-a)" />
        <line x1="220" y1="56" x2="290" y2="114" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#ts-a)" />
        <line x1="250" y1="48" x2="340" y2="118" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#ts-a)" />
        <defs><marker id="ts-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="158" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="160" width="404" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}><strong style={{ color: 'var(--violet)' }}>{s.label}：</strong>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

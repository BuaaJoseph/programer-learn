import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: 'state=0 表示锁空闲。线程 T1 用 CAS 把 state 改成 1，抢锁成功', state: 1, owner: 'T1', queue: [] },
  { desc: 'T2 来抢锁，CAS 失败(state 已是 1) → 包装成节点入 CLH 队列排队等待', state: 1, owner: 'T1', queue: ['T2'] },
  { desc: 'T3 也来，同样排到队尾(双向链表 FIFO)', state: 1, owner: 'T1', queue: ['T2', 'T3'] },
  { desc: 'T1 释放锁：state 减回 0，唤醒队首 T2', state: 0, owner: null, queue: ['T2(被唤醒)', 'T3'] },
  { desc: 'T2 被唤醒后 CAS 抢到锁，出队成为新 owner', state: 1, owner: 'T2', queue: ['T3'] },
]

export default function Aqs() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="AQS(AbstractQueuedSynchronizer)用一个 volatile int state + 一个 CLH 双向等待队列，撑起了 ReentrantLock、Semaphore、CountDownLatch 等几乎所有同步器。抢锁=CAS 改 state；抢不到=入队阻塞;释放=改 state 并唤醒队首。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="AQS 原理">
        {/* state */}
        <rect x="20" y="34" width="120" height="50" rx="10" fill={s.state ? 'var(--accent)' : 'var(--green-soft)'} stroke={s.state ? 'var(--accent)' : 'var(--green-line)'} />
        <text x="80" y="54" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={s.state ? '#ffffff' : 'var(--green)'}>volatile state</text>
        <text x="80" y="74" textAnchor="middle" fontFamily="var(--mono)" fontSize="16" fontWeight="700" fill={s.state ? '#ffffff' : 'var(--green)'}>{s.state}</text>
        <text x="80" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">{s.owner ? `owner=${s.owner}` : '锁空闲'}</text>

        {/* CLH queue */}
        <text x="170" y="30" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">CLH 等待队列(FIFO)</text>
        {s.queue.length === 0 ? (
          <text x="170" y="62" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">(空)</text>
        ) : (
          s.queue.map((t, i) => (
            <g key={i}>
              <rect x={170 + i * 92} y="40" width="80" height="38" rx="8" fill={i === 0 ? 'var(--violet)' : '#f0eafb'} stroke="var(--violet)" />
              <text x={210 + i * 92} y="63" textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fontWeight="700" fill={i === 0 ? '#ffffff' : 'var(--ink)'}>{t}</text>
              {i < s.queue.length - 1 && <line x1={250 + i * 92} y1="59" x2={262 + i * 92} y2="59" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#aq-a)" />}
            </g>
          ))
        )}
        <defs><marker id="aq-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="148" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="150" width="404" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

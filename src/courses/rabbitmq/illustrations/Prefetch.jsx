import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// prefetch 控制每个消费者一次最多「未 ack」多少条。太大→撑爆/不均衡，太小→吞吐低。
const OPTS = [
  { v: 0, label: '不限(0)', desc: 'broker 把消息一股脑全推给一个消费者：它内存被撑爆、还可能一个消费者忙死、另一个闲死。' },
  { v: 1, label: 'prefetch=1', desc: '处理完一条 ack 后才给下一条：最均衡、能者多劳，但每条都等往返、吞吐偏低。' },
  { v: 10, label: 'prefetch=10', desc: '一次最多 10 条未 ack：兼顾吞吐与均衡，生产中常用的折中值。' },
]

export default function Prefetch() {
  const [i, setI] = useState(2)
  const o = OPTS[i]

  const controls = (
    <>
      {OPTS.map((opt, idx) => (
        <button key={idx} className={`fig-btn ${i === idx ? 'active' : ''}`} onClick={() => setI(idx)}>{opt.label}</button>
      ))}
    </>
  )

  // 给两个消费者分配在途消息数
  const inflight = o.v === 0 ? [12, 0] : o.v === 1 ? [1, 1] : [10, 8]

  return (
    <Figure caption="消费跟不上生产就会堆积。QoS 的 prefetch 限制每个消费者「同时持有(未 ack)」的消息数，是最基本的背压：太大易撑爆与不均衡，太小则吞吐低。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="prefetch 流控">
        {/* 队列 */}
        <rect x="20" y="70" width="120" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="80" y="88" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">队列(待消费)</text>
        <text x="80" y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">大量积压</text>

        {/* 两个消费者 + 在途 */}
        {[0, 1].map((c) => {
          const y = 40 + c * 64
          const n = inflight[c]
          const overloaded = n > 10
          return (
            <g key={c}>
              <rect x="300" y={y} width="140" height="48" rx="8" fill={overloaded ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={overloaded ? 'var(--rose)' : 'var(--green-line)'} />
              <text x="312" y={y + 20} fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">消费者{c + 1}</text>
              <text x="312" y={y + 38} fontFamily="var(--mono)" fontSize="10" fill={overloaded ? 'var(--rose)' : 'var(--green)'}>在途 {n} 条{overloaded ? ' · 过载' : ''}</text>
              <line x1="140" y1="92" x2="300" y2={y + 24} stroke="var(--ink-faint)" strokeWidth="1.3" markerEnd="url(#pf-a)" />
            </g>
          )
        })}
        <defs><marker id="pf-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="404" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{o.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

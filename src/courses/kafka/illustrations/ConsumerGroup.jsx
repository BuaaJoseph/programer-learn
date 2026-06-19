import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 4 个分区，消费者数量变化看分配与 rebalance。
const CASES = {
  '2': { n: 2, assign: [[0, 1], [2, 3]], note: '2 个消费者各担 2 个分区，刚好均分。' },
  '4': { n: 4, assign: [[0], [1], [2], [3]], note: '4 个消费者一人一个分区，并行度最大。' },
  '5': { n: 5, assign: [[0], [1], [2], [3], []], note: '消费者数 > 分区数：多出的那个空闲——分区数是并行度上限。' },
}

export default function ConsumerGroup() {
  const [k, setK] = useState('4')
  const c = CASES[k]

  const controls = (
    <>
      {Object.keys(CASES).map((key) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{key} 个消费者</button>
      ))}
      <span className="fig-note">同组内一个分区只会被一个消费者消费</span>
    </>
  )

  return (
    <Figure caption="同一消费者组内，分区按消费者分摊、一个分区只给一个消费者(保证不重复)。成员增减会触发 rebalance 重新分配。注意：消费者数超过分区数，多出的只能空闲。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Kafka 消费者组">
        {/* 分区 */}
        {[0, 1, 2, 3].map((p) => (
          <g key={p}>
            <rect x="20" y={24 + p * 40} width="150" height="30" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x="34" y={44 + p * 40} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">Partition {p}</text>
          </g>
        ))}
        {/* 消费者 */}
        {c.assign.map((parts, ci) => {
          const idle = parts.length === 0
          const y = 24 + ci * (160 / c.n)
          return (
            <g key={ci}>
              <rect x="300" y={y} width="140" height={Math.max(26, 160 / c.n - 8)} rx="7" fill={idle ? 'var(--bg-sunken)' : 'var(--green-soft)'} stroke={idle ? 'var(--border-strong)' : 'var(--green-line)'} />
              <text x="312" y={y + 18} fontFamily="var(--sans)" fontSize="11" fill={idle ? 'var(--ink-faint)' : 'var(--green)'}>消费者{ci + 1}{idle ? '(空闲)' : ''}</text>
              {parts.map((p) => (
                <line key={p} x1="170" y1={39 + p * 40} x2="300" y2={y + Math.max(13, (160 / c.n - 8) / 2)} stroke="var(--green)" strokeWidth="1.6" markerEnd="url(#cg-a)" />
              ))}
            </g>
          )
        })}
        <defs><marker id="cg-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker></defs>

        <rect x="20" y="178" width="420" height="0" fill="none" />
        <text x="20" y="194" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{c.note}</text>
      </svg>
    </Figure>
  )
}

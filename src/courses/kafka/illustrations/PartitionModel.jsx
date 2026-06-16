import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// Topic 分成多个 partition 分散到 broker，消息按 key 决定进哪个分区。
const KEYS = [
  { k: 'user:1', part: 0 },
  { k: 'user:2', part: 2 },
  { k: 'user:3', part: 1 },
  { k: '(无 key)', part: -1 },
]

export default function PartitionModel() {
  const [i, setI] = useState(0)
  const sel = KEYS[i]

  const controls = (
    <>
      {KEYS.map((x, idx) => (
        <button key={x.k} className={`fig-btn ${i === idx ? 'active' : ''}`} onClick={() => setI(idx)}>key={x.k}</button>
      ))}
      <span className="fig-note">{sel.part === -1 ? '无 key：轮询/粘性分配' : `hash(key) % 3 = 分区 ${sel.part}`}</span>
    </>
  )

  return (
    <Figure caption="一个 Topic 拆成多个 Partition，分散到不同 broker 上并行读写——这是 Kafka 高吞吐的根。带 key 的消息按 hash(key)%分区数 固定进同一分区(保证该 key 局部有序)。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Kafka 分区模型">
        <text x="20" y="26" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">Topic: orders（3 个分区，分布在 broker 上）</text>
        {[0, 1, 2].map((p) => {
          const target = sel.part === p || (sel.part === -1)
          return (
            <g key={p}>
              <text x="20" y={56 + p * 44} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={sel.part === p ? 'var(--accent-strong)' : 'var(--ink)'}>P{p}</text>
              <text x="20" y={70 + p * 44} fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">broker{p % 2 + 1}</text>
              {Array.from({ length: 7 }).map((_, m) => (
                <rect key={m} x={56 + m * 44} y={42 + p * 44} width="38" height="22" rx="4"
                  fill={m < 5 ? 'var(--accent-soft)' : 'var(--bg-sunken)'} stroke="var(--accent-line)" />
              ))}
              {/* 新消息落入 */}
              {(sel.part === p || sel.part === -1) && (
                <rect x={56 + 5 * 44} y={42 + p * 44} width="38" height="22" rx="4" fill="var(--accent)" />
              )}
              <text x={56 + 7 * 44 + 6} y={57 + p * 44} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">offset→</text>
            </g>
          )
        })}
        <rect x="20" y="174" width="420" height="22" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="30" y="189" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">
          {sel.part === -1 ? '无 key 时按粘性/轮询分散到各分区，吞吐最均衡但不保证顺序。' : `key=${sel.k} 恒进分区 P${sel.part}，于是同一用户的消息天然有序。`}
        </text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from './Figure.jsx'

// 点击一个词，看它「关注」了哪些词。
const WORDS = ['小猫', '追着', '它', '的', '尾巴', '跑']
// 每个词对其它词的注意力权重（行=查询词）
const ATTN = [
  [0.6, 0.1, 0.1, 0.0, 0.1, 0.1],
  [0.4, 0.3, 0.1, 0.0, 0.1, 0.1],
  [0.7, 0.1, 0.1, 0.0, 0.05, 0.05], // “它”主要关注“小猫”
  [0.1, 0.1, 0.2, 0.2, 0.3, 0.1],
  [0.5, 0.1, 0.2, 0.1, 0.1, 0.0], // “尾巴”关注“小猫”
  [0.3, 0.4, 0.05, 0.0, 0.05, 0.2],
]

export default function AttentionGaze() {
  const [q, setQ] = useState(2)
  const xs = WORDS.map((_, i) => 40 + i * 70)
  const baseY = 70

  const controls = (
    <>
      {WORDS.map((w, i) => (
        <button key={i} className={`fig-btn ${q === i ? 'active' : ''}`} onClick={() => setQ(i)}>
          {w}
        </button>
      ))}
      <span className="fig-note">看「{WORDS[q]}」关注了谁</span>
    </>
  )

  return (
    <Figure caption="生成或理解每个词时，注意力让模型动态决定该重点参考前文哪些词。线越粗，权重越高。" controls={controls}>
      <svg viewBox="0 0 480 160" width="480" role="img" aria-label="注意力连线">
        {WORDS.map((w, j) =>
          j === q ? null : (
            <line
              key={`l${j}`}
              x1={xs[q]}
              y1={baseY + 14}
              x2={xs[j]}
              y2={baseY + 14}
              stroke="var(--accent)"
              strokeWidth={1 + ATTN[q][j] * 10}
              strokeOpacity={0.15 + ATTN[q][j] * 0.8}
              strokeLinecap="round"
            />
          ),
        )}
        {WORDS.map((w, i) => (
          <g key={i}>
            <rect
              x={xs[i] - 28}
              y={baseY}
              width="56"
              height="30"
              rx="7"
              fill={i === q ? 'var(--accent)' : 'var(--accent-soft)'}
              stroke={i === q ? 'var(--accent)' : 'var(--accent-line)'}
            />
            <text
              x={xs[i]}
              y={baseY + 20}
              textAnchor="middle"
              fontFamily="var(--display)"
              fontSize="13"
              fill={i === q ? '#ffffff' : 'var(--ink)'}
            >
              {w}
            </text>
            {i !== q && (
              <text x={xs[i]} y={baseY + 50} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">
                {(ATTN[q][i] * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </Figure>
  )
}

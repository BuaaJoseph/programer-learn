import { useState } from 'react'
import Figure from './Figure.jsx'

// 温度采样：同一组 logits 在不同 temperature 下被压平或拉尖。
const LOGITS = [3.2, 2.4, 1.8, 1.0, 0.5]
const LABELS = ['很', '非常', '挺', '有点', '不']

function softmax(logits, t) {
  const scaled = logits.map((l) => l / t)
  const m = Math.max(...scaled)
  const exps = scaled.map((s) => Math.exp(s - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

export default function FateDice() {
  const [t, setT] = useState(1.0)
  const probs = softmax(LOGITS, t)
  const barW = 220

  const controls = (
    <>
      {[0.2, 0.7, 1.0, 1.5].map((v) => (
        <button key={v} className={`fig-btn ${t === v ? 'active' : ''}`} onClick={() => setT(v)}>
          T = {v}
        </button>
      ))}
      <span className="fig-note">{t < 0.5 ? '低温：几乎只选最高那个' : t > 1.2 ? '高温：分布被压平，更随机' : '常用区间'}</span>
    </>
  )

  return (
    <Figure caption="temperature 缩放 logits：T<1 让分布更尖锐（更确定），T>1 让分布更平（更随机）。" controls={controls}>
      <svg viewBox="0 0 420 200" width="420" role="img" aria-label="温度采样">
        {LABELS.map((w, i) => (
          <g key={i} transform={`translate(20 ${20 + i * 34})`}>
            <text x="0" y="16" fontFamily="var(--display)" fontSize="14" fill="var(--ink)">
              {w}
            </text>
            <rect x="48" y="4" width={barW} height="16" rx="8" fill="var(--bg-sunken)" />
            <rect x="48" y="4" width={barW * probs[i]} height="16" rx="8" fill={i === 0 ? 'var(--accent)' : 'var(--accent-line)'} />
            <text x={56 + barW} y="17" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
              {(probs[i] * 100).toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </Figure>
  )
}

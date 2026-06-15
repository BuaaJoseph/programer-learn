import { useState } from 'react'
import Figure from './Figure.jsx'

// 唐诗逐字接龙，演示 next-token prediction。
const SEED = '床前明月光，疑是地'
const STEPS = [
  { cands: [{ w: '上', p: 0.78 }, { w: '面', p: 0.11 }, { w: '里', p: 0.07 }, { w: '板', p: 0.04 }] },
  { cands: [{ w: '霜', p: 0.83 }, { w: '水', p: 0.08 }, { w: '雪', p: 0.06 }, { w: '冰', p: 0.03 }] },
  { cands: [{ w: '。', p: 0.71 }, { w: '，', p: 0.2 }, { w: '；', p: 0.06 }, { w: '!', p: 0.03 }] },
]

export default function NextTokenAnim() {
  const [text, setText] = useState(SEED)
  const [step, setStep] = useState(0)
  const cur = STEPS[step]

  const pick = (w) => {
    setText((t) => t + w)
    setStep((s) => Math.min(s + 1, STEPS.length))
  }
  const reset = () => {
    setText(SEED)
    setStep(0)
  }

  const done = step >= STEPS.length

  const controls = (
    <>
      {!done && cur
        ? cur.cands.map((c) => (
            <button key={c.w} className="fig-btn" onClick={() => pick(c.w)}>
              接「{c.w}」 · {(c.p * 100).toFixed(0)}%
            </button>
          ))
        : null}
      <button className="fig-btn" onClick={reset}>
        重来
      </button>
      <span className="fig-note">{done ? '一句已补全' : '点候选词接上下一个字'}</span>
    </>
  )

  const barW = 150
  return (
    <Figure caption="模型每一步只做一件事：给出候选词及其概率，再选一个接上。这就是 next-token prediction。" controls={controls}>
      <svg viewBox="0 0 460 230" width="460" role="img" aria-label="逐字接龙演示">
        <rect x="10" y="14" width="440" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="24" y="44" fontFamily="var(--display)" fontSize="20" fill="var(--ink)">
          {text}
          <tspan fill="var(--accent)">▌</tspan>
        </text>
        <text x="24" y="92" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">
          {done ? '下一个词：（句子已完整）' : '下一个词的候选分布：'}
        </text>
        {!done && cur
          ? cur.cands.map((c, i) => (
              <g key={c.w} transform={`translate(24 ${104 + i * 30})`}>
                <text x="0" y="13" fontFamily="var(--display)" fontSize="15" fill="var(--ink)">
                  {c.w}
                </text>
                <rect x="34" y="3" width={barW} height="12" rx="6" fill="var(--bg-sunken)" />
                <rect x="34" y="3" width={barW * c.p} height="12" rx="6" fill={i === 0 ? 'var(--accent)' : 'var(--accent-line)'} />
                <text x={44 + barW} y="13" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
                  {(c.p * 100).toFixed(0)}%
                </text>
              </g>
            ))
          : null}
      </svg>
    </Figure>
  )
}

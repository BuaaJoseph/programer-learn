import { useState } from 'react'
import Figure from './Figure.jsx'

// 思考 → 行动 → 观察 循环步进。
const STAGES = [
  { key: 'think', label: '思考', desc: '模型决定下一步做什么：要查天气', color: 'var(--accent)' },
  { key: 'act', label: '行动', desc: '调用工具 get_weather(city=北京)', color: 'var(--violet)' },
  { key: 'observe', label: '观察', desc: '工具返回：北京 26°C，晴', color: 'var(--green)' },
]

export default function ReActLoop() {
  const [step, setStep] = useState(0)
  const active = step % 3
  const round = Math.floor(step / 3) + 1

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((s) => s + 1)}>
        下一步 ▸
      </button>
      <button className="fig-btn" onClick={() => setStep(0)}>
        重来
      </button>
      <span className="fig-note">第 {round} 轮 · 当前：{STAGES[active].label}</span>
    </>
  )

  const cx = [110, 300, 205]
  const cy = [70, 70, 160]

  return (
    <Figure caption="ReAct 让模型在思考、行动、观察之间循环，每一轮都用上一步的观察结果，直到任务完成。" controls={controls}>
      <svg viewBox="0 0 410 220" width="410" role="img" aria-label="ReAct 循环">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" />
          </marker>
        </defs>
        <path d="M150 70 L260 70" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
        <path d="M290 95 L225 140" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
        <path d="M180 140 L120 95" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
        {STAGES.map((s, i) => (
          <g key={s.key}>
            <circle cx={cx[i]} cy={cy[i]} r="34" fill={i === active ? s.color : 'var(--bg)'} stroke={s.color} strokeWidth="2" />
            <text
              x={cx[i]}
              y={cy[i] + 5}
              textAnchor="middle"
              fontFamily="var(--display)"
              fontSize="15"
              fontWeight="700"
              fill={i === active ? '#ffffff' : s.color}
            >
              {s.label}
            </text>
          </g>
        ))}
        <rect x="20" y="190" width="370" height="26" rx="7" fill="var(--bg-sunken)" />
        <text x="32" y="207" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
          {STAGES[active].desc}
        </text>
      </svg>
    </Figure>
  )
}

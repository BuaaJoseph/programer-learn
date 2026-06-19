import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 逐个开启脚手架能力，看「同一个模型」的实际能力跃升。
const LAYERS = [
  { key: 'base', name: '纯模型', desc: '只能基于训练知识回答文本，看不到你的代码、不能执行任何操作。', mult: 1 },
  { key: 'tools', name: '+ 工具', desc: '给它 Read/Edit/Bash 等工具：能读代码、改文件、跑命令——从「会说」变成「会做」。', mult: 10 },
  { key: 'loop', name: '+ 验证循环', desc: '跑测试看结果、失败就改再跑：能自我验证纠错，而不是一次性盲写。', mult: 5 },
  { key: 'context', name: '+ 上下文/记忆', desc: 'CLAUDE.md、自动记忆、上下文压缩：记住项目规则与历史，不必每次重教。', mult: 2 },
  { key: 'subagent', name: '+ 子代理', desc: '把独立子任务丢给子代理在隔离上下文里做、只回传结果：能扛更大更复杂的任务。', mult: 3 },
]

export default function CapabilityMultiplier() {
  const [on, setOn] = useState(1) // 开启到第几层

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setOn((v) => Math.min(v + 1, LAYERS.length))}>开启下一层脚手架 ▸</button>
      <button className="fig-btn" onClick={() => setOn(1)}>重置</button>
      <span className="fig-note">模型权重不变，变的只是脚手架</span>
    </>
  )

  let mult = 1
  for (let i = 1; i < on; i++) mult *= LAYERS[i].mult
  const barMax = 300
  const w = Math.min(barMax, 12 * Math.log2(mult + 1) * 6)

  return (
    <Figure caption="同一个 LLM 套上不同脚手架，实际能力天差地别。逐层开启工具、验证循环、记忆、子代理——看「能干活的程度」如何被放大。脚手架不是模型，却决定了模型能发挥几成。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="脚手架能力放大">
        {LAYERS.map((l, i) => {
          const active = i < on
          return (
            <g key={l.key}>
              <rect x="20" y={20 + i * 26} width="150" height="22" rx="5" fill={active ? (i === 0 ? 'var(--ink-soft)' : 'var(--accent)') : 'var(--bg-subtle)'} stroke={active ? 'transparent' : 'var(--border)'} opacity={active ? 1 : 0.5} />
              <text x="30" y={35 + i * 26} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink-faint)'}>{l.name}{i > 0 && active ? ` ×${l.mult}` : ''}</text>
            </g>
          )
        })}
        {/* 能力条 */}
        <text x="200" y="34" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">实际可用能力</text>
        <rect x="200" y="44" width={barMax} height="26" rx="6" fill="var(--bg-sunken)" />
        <rect x="200" y="44" width={w} height="26" rx="6" fill="var(--accent)" />
        <text x={208} y="62" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">≈ {mult}×</text>

        <rect x="200" y="84" width="240" height="86" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="208" y="88" width="224" height="80">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--accent-strong)' }}>{LAYERS[on - 1].name}：</strong>{LAYERS[on - 1].desc}
          </div>
        </foreignObject>
        <text x="20" y="200" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">注：倍数为示意，强调「脚手架是乘法器」这一直觉，非精确测量。</text>
      </svg>
    </Figure>
  )
}

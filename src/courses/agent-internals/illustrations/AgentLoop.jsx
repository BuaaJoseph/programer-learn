import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 以「修一个登录报错的 bug」为例走主循环。
const STEPS = [
  { phase: 'gather', desc: '收集：Grep 搜索 "login"、Read 相关源文件，理解现状', tool: 'Grep / Read' },
  { phase: 'act', desc: '行动：Edit 修改 auth.js 里出错的判断逻辑', tool: 'Edit' },
  { phase: 'verify', desc: '验证：Bash 跑 npm test，读测试输出', tool: 'Bash(npm test)' },
  { phase: 'gather', desc: '测试失败：再 Read 报错堆栈，定位漏改的地方', tool: 'Read' },
  { phase: 'act', desc: '行动：Edit 补一处空值判断', tool: 'Edit' },
  { phase: 'verify', desc: '验证：再跑测试 → 通过', tool: 'Bash(npm test) ✓' },
  { phase: 'done', desc: '模型这一轮回复里没有工具调用了 → 循环结束，交回用户', tool: '纯文本' },
]
const PHASES = { gather: { t: '收集上下文', c: 'var(--accent)' }, act: { t: '采取行动', c: 'var(--violet)' }, verify: { t: '验证结果', c: 'var(--green)' }, done: { t: '结束', c: 'var(--ink-soft)' } }

export default function AgentLoop() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const cx = { gather: 110, act: 250, verify: 180 }
  const cy = { gather: 56, act: 56, verify: 120 }

  return (
    <Figure caption="Agent 主循环就是「收集上下文 → 采取行动 → 验证结果 → 重复」，由模型每轮决定下一个工具、直到不再需要工具就停。这里以修一个登录 bug 为例逐步走。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Agent 主循环">
        <g stroke="var(--border-strong)" strokeWidth="1.5" fill="none">
          <path d="M150 56 L210 56" markerEnd="url(#ag-a)" />
          <path d="M248 72 L196 110" markerEnd="url(#ag-a)" />
          <path d="M150 112 L122 78" markerEnd="url(#ag-a)" />
        </g>
        <defs><marker id="ag-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
        {['gather', 'act', 'verify'].map((p) => {
          const active = s.phase === p
          return (
            <g key={p}>
              <circle cx={cx[p]} cy={cy[p]} r="32" fill={active ? PHASES[p].c : 'var(--bg-subtle)'} stroke={PHASES[p].c} strokeWidth="2" />
              <text x={cx[p]} y={cy[p] + 4} textAnchor="middle" fontFamily="var(--display)" fontSize="12" fontWeight="700" fill={active ? '#ffffff' : PHASES[p].c}>{PHASES[p].t.slice(0, 2)}</text>
            </g>
          )
        })}
        <text x="320" y="50" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">当前工具</text>
        <rect x="320" y="58" width="128" height="30" rx="6" fill="var(--bg-code)" />
        <text x="330" y="77" fontFamily="var(--mono)" fontSize="11" fill="#7ee0a8">{s.tool}</text>

        <rect x="20" y="150" width="428" height="40" rx="8"
          fill={s.phase === 'done' ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={s.phase === 'done' ? 'var(--green-line)' : 'var(--border)'} />
        <foreignObject x="28" y="154" width="412" height="34">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

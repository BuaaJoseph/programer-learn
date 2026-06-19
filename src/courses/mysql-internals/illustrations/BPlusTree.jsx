import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 动画演示在 B+Tree 中查找一个主键值，高亮 根→内部→叶子 的路径。
const ROOT = { keys: [30, 60], x: 190, y: 18, w: 80 }
const INTERNAL = [
  { id: 0, keys: [10, 20], x: 40, y: 80, w: 80, range: (k) => k < 30 },
  { id: 1, keys: [40, 50], x: 190, y: 80, w: 80, range: (k) => k >= 30 && k < 60 },
  { id: 2, keys: [70, 90], x: 340, y: 80, w: 80, range: (k) => k >= 60 },
]
const LEAVES = [
  { id: 0, vals: [10, 20, 25], x: 16, parent: 0 },
  { id: 1, vals: [40, 45, 50], x: 178, parent: 1 },
  { id: 2, vals: [60, 70, 90], x: 340, parent: 2 },
]
const TARGETS = [25, 45, 90]

export default function BPlusTree() {
  const [target, setTarget] = useState(45)
  const [step, setStep] = useState(0) // 0 root,1 internal,2 leaf

  const internalIdx = INTERNAL.findIndex((n) => n.range(target))
  const leaf = LEAVES.find((l) => l.parent === internalIdx)

  const pick = (t) => {
    setTarget(t)
    setStep(0)
  }

  const controls = (
    <>
      {TARGETS.map((t) => (
        <button key={t} className={`fig-btn ${target === t ? 'active' : ''}`} onClick={() => pick(t)}>
          查 {t}
        </button>
      ))}
      <button className="fig-btn" onClick={() => setStep((s) => Math.min(s + 1, 2))}>下一步 ▸</button>
      <span className="fig-note">
        {step === 0 ? '从根节点开始比较' : step === 1 ? `${target} 落在该子树区间，下探` : `在叶子里定位到 ${target}`}
      </span>
    </>
  )

  const onPath = { root: true, internal: step >= 1, leaf: step >= 2 }

  return (
    <Figure caption="一次主键查询：从根节点按区间二分下探，每下一层一次 IO，最终在叶子节点命中目标值。选不同目标值、点「下一步」逐层观察。" controls={controls}>
      <svg viewBox="0 0 460 230" width="460" role="img" aria-label="B+Tree 查找路径">
        {/* root */}
        <rect x={ROOT.x} y={ROOT.y} width={ROOT.w} height="30" rx="6"
          fill={onPath.root ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
        <text x={ROOT.x + 40} y={ROOT.y + 20} textAnchor="middle" fontFamily="var(--mono)" fontSize="12"
          fontWeight="700" fill={onPath.root ? '#ffffff' : 'var(--ink)'}>
          {ROOT.keys.join(' | ')}
        </text>

        {/* internal */}
        {INTERNAL.map((n, i) => {
          const active = onPath.internal && i === internalIdx
          return (
            <g key={n.id}>
              <line x1={ROOT.x + 40} y1={ROOT.y + 30} x2={n.x + n.w / 2} y2={n.y}
                stroke={active ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={active ? 2.5 : 1} />
              <rect x={n.x} y={n.y} width={n.w} height="28" rx="6"
                fill={active ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
              <text x={n.x + n.w / 2} y={n.y + 19} textAnchor="middle" fontFamily="var(--mono)" fontSize="12"
                fill={active ? '#ffffff' : 'var(--ink)'}>{n.keys.join(' | ')}</text>
            </g>
          )
        })}

        {/* leaves */}
        {LEAVES.map((l, i) => {
          const active = onPath.leaf && l.id === leaf?.id
          return (
            <g key={l.id}>
              <line x1={INTERNAL[l.parent].x + 40} y1={INTERNAL[l.parent].y + 28} x2={l.x + 64} y2="150"
                stroke={active ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={active ? 2.5 : 1} />
              <rect x={l.x} y="150" width="128" height="32" rx="6"
                fill={active ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={active ? 'var(--green)' : 'var(--border)'} />
              {l.vals.map((val, j) => (
                <text key={val} x={l.x + 22 + j * 42} y="170" textAnchor="middle" fontFamily="var(--mono)" fontSize="12"
                  fontWeight={active && val === target ? '700' : '400'}
                  fill={active && val === target ? 'var(--green)' : 'var(--ink-soft)'}>{val}</text>
              ))}
            </g>
          )
        })}
        {/* leaf linked list */}
        {[0, 1].map((i) => (
          <line key={i} x1={144 + i * 162} y1="166" x2={172 + i * 162} y2="166" stroke="var(--green)" strokeWidth="1.5" strokeDasharray="3 2" />
        ))}
        <text x="16" y="210" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">叶子之间用双向链表相连，便于范围扫描</text>
      </svg>
    </Figure>
  )
}

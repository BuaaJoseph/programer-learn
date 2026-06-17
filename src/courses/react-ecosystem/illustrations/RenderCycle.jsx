import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// React 一次更新的三相流程：点一个阶段看它在做什么。
const PHASES = [
  { key: 'trigger', label: '① 触发', title: 'Trigger（触发更新）', note: '调用 setState / dispatch，或父组件重渲染。React 把这个组件标记为「需要重新渲染」，排进更新队列——注意此刻 DOM 还没有任何变化。' },
  { key: 'render', label: '② Render', title: 'Render（渲染阶段·可中断）', note: '调用组件函数算出新的 React 元素树（纯计算、无副作用）。在 Fiber 架构下这一阶段可被打断、恢复、丢弃，让高优先级更新（如输入）插队。' },
  { key: 'reconcile', label: '③ 调和', title: 'Reconcile（diff 比对）', note: '把新元素树与上一次的 Fiber 树逐层比对，靠类型与 key 复用节点，算出「最小的真实改动集合」，标记到 effect 列表上。' },
  { key: 'commit', label: '④ Commit', title: 'Commit（提交阶段·不可中断）', note: '一次性把改动应用到真实 DOM，并按顺序运行 ref、useLayoutEffect、useEffect。这一步同步完成，用户此刻才看到屏幕变化。' },
]

export default function RenderCycle() {
  const [k, setK] = useState('trigger')
  const cur = PHASES.find((x) => x.key === k)
  const idx = PHASES.findIndex((x) => x.key === k)

  const controls = (
    <>
      {PHASES.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="React 一次更新分四步：触发 → Render（算新树，可中断）→ Reconcile（diff 出最小改动）→ Commit（改真实 DOM）。点每一步看它具体在做什么。关键直觉：前两步只是「算」，只有 Commit 才真正动 DOM。" controls={controls}>
      <svg viewBox="0 0 480 210" width="480" role="img" aria-label="React 渲染三相流程图">
        {PHASES.map((x, i) => {
          const X = 12 + i * 118
          const on = x.key === k
          const done = i <= idx
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={26} width="104" height="46" rx="9" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={done ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 52} y={54} textAnchor="middle" fontFamily="var(--sans)" fontSize="12.5" fontWeight={on ? '700' : '600'} fill={done ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
              {i < PHASES.length - 1 && (
                <path d={`M ${X + 104} 49 L ${X + 118} 49`} stroke="var(--ink-soft)" strokeWidth="1.5" markerEnd="url(#rcArrow)" />
              )}
            </g>
          )
        })}
        <defs>
          <marker id="rcArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-soft)" />
          </marker>
        </defs>
        <rect x="12" y="92" width="456" height="102" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="28" y="116" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">{cur.title}</text>
        <foreignObject x="26" y="124" width="430" height="62">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.5 }}>{cur.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

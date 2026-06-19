import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// SwiftUI 状态驱动：点一个属性包装器看它的角色。状态变 → body 重新计算 → 界面刷新。
const WRAPPERS = [
  { key: 'state', label: '@State', title: '@State（视图私有状态）', note: '由当前视图「拥有」的本地可变状态（计数、开关、输入）。它一变，SwiftUI 就重新计算这个视图的 body，自动刷新界面。是状态的「单一数据源」。' },
  { key: 'binding', label: '@Binding', title: '@Binding（双向引用）', note: '不拥有状态，而是持有对上层 @State 的读写引用。把它传给子视图，子视图改它就等于改源头——这就是 TextField/Toggle 的双向绑定原理（用 $ 取得 Binding）。' },
  { key: 'observable', label: '@Observable', title: '@Observable（可观察模型）', note: '标注一个类（通常是 ViewModel）。SwiftUI 自动追踪视图实际读取了哪些属性，只有这些属性变化时才刷新对应视图——比旧的 ObservableObject 更精准。' },
  { key: 'environment', label: '@Environment', title: '@Environment（跨层共享）', note: '把模型或系统值注入环境，深层子视图无需逐层传递即可读取。适合主题、路由、登录用户等需要被很多视图共享的状态。' },
  { key: 'body', label: 'body 刷新', title: 'body：UI = f(state)', note: '以上任一被读取的状态变化，都会让 SwiftUI 重新调用 body 计算出新的视图描述，再 diff 出最小改动刷新屏幕。你只声明「长什么样」，框架负责「怎么变」。' },
]

export default function SwiftDataFlow() {
  const [k, setK] = useState('state')
  const cur = WRAPPERS.find((x) => x.key === k)

  const controls = (
    <>
      {WRAPPERS.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="SwiftUI 是状态驱动的：@State 持有私有状态、@Binding 把读写权下传、@Observable 暴露模型、@Environment 跨层共享。任一被读取的状态一变，body 就重新计算、界面自动刷新。点每个包装器看它的角色。" controls={controls}>
      <svg viewBox="0 0 480 232" width="480" role="img" aria-label="SwiftUI 状态驱动数据流图">
        {WRAPPERS.slice(0, 4).map((x, i) => {
          const X = 12 + (i % 2) * 234
          const Y = 22 + Math.floor(i / 2) * 50
          const on = x.key === k
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={Y} width="222" height="40" rx="9" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 111} y={Y + 25} textAnchor="middle" fontFamily="var(--mono)" fontSize="12.5" fontWeight={on ? '700' : '600'} fill={on ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
            </g>
          )
        })}
        {/* body 刷新条 */}
        <g onClick={() => setK('body')} style={{ cursor: 'pointer' }}>
          <rect x="12" y="124" width="456" height="34" rx="9" fill={k === 'body' ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={k === 'body' ? 0.16 : 1} stroke={k === 'body' ? 'var(--accent)' : 'var(--border)'} strokeWidth={k === 'body' ? 2 : 1} />
          <text x="240" y="146" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight={k === 'body' ? '700' : '600'} fill={k === 'body' ? 'var(--accent-strong)' : 'var(--ink)'}>body 重新计算 → 界面刷新</text>
        </g>
        <rect x="12" y="166" width="456" height="60" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="26" y="186" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">{cur.title}</text>
        <foreignObject x="24" y="192" width="434" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>{cur.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

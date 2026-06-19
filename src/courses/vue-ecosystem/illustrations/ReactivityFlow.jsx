import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// Vue 3 响应式闭环：点一步看它在做什么。Proxy 读时 track 收集依赖、写时 trigger 触发副作用重跑。
const STEPS = [
  { key: 'create', label: '① reactive()', title: 'reactive(obj) → Proxy 代理', note: 'reactive 把普通对象包成一个 Proxy。之后对它的所有读写都会被 Proxy 的 get/set 拦截——响应式的一切从这层拦截开始。' },
  { key: 'track', label: '② track 收集', title: 'get 拦截 → track（依赖收集）', note: '当一个副作用（如组件渲染、computed）读取某个属性时，Proxy 的 get 触发 track：把「当前正在运行的 effect」记到这个属性的依赖集合里。谁用了我，我就记下谁。' },
  { key: 'mutate', label: '③ 修改数据', title: '改变响应式数据', note: '业务代码给属性赋新值（state.count++）。这次写操作会落到 Proxy 的 set 拦截里——而不是悄无声息地改掉对象。' },
  { key: 'trigger', label: '④ trigger 触发', title: 'set 拦截 → trigger（触发更新）', note: 'set 拦截在写入后调用 trigger：取出这个属性收集到的所有 effect，逐个重新运行。组件 effect 重跑就意味着重新渲染——视图于是自动跟上数据。' },
]

export default function ReactivityFlow() {
  const [k, setK] = useState('create')
  const cur = STEPS.find((x) => x.key === k)
  const idx = STEPS.findIndex((x) => x.key === k)

  const controls = (
    <>
      {STEPS.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="Vue 3 响应式的闭环：reactive 用 Proxy 代理对象 → 读时 track 收集「谁依赖了我」→ 数据改变走 set 拦截 → trigger 让依赖它的副作用重跑（组件 effect 重跑 = 重新渲染）。点每一步看细节。" controls={controls}>
      <svg viewBox="0 0 480 210" width="480" role="img" aria-label="Vue 响应式 track/trigger 闭环">
        {STEPS.map((x, i) => {
          const X = 12 + i * 118
          const on = x.key === k
          const done = i <= idx
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={26} width="104" height="46" rx="9" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={done ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 52} y={54} textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fontWeight={on ? '700' : '600'} fill={done ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
              {i < STEPS.length - 1 && (
                <path d={`M ${X + 104} 49 L ${X + 118} 49`} stroke="var(--ink-soft)" strokeWidth="1.5" markerEnd="url(#rfArrow)" />
              )}
            </g>
          )
        })}
        <defs>
          <marker id="rfArrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
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

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '① Provider 启动，把自己的服务地址注册到注册中心', on: ['p', 'r'], line: 'register' },
  { desc: '② Consumer 启动，向注册中心订阅它需要的服务', on: ['c', 'r'], line: 'subscribe' },
  { desc: '③ 注册中心把 Provider 地址列表推送给 Consumer', on: ['r', 'c'], line: 'notify' },
  { desc: '④ Consumer 按负载均衡选一个 Provider 直接调用(不经注册中心)', on: ['c', 'p'], line: 'invoke' },
  { desc: '⑤ Consumer/Provider 定时上报调用统计给 Monitor', on: ['c', 'p', 'm'], line: 'count' },
]

export default function DubboArch() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.on.includes(k)

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const node = (k, x, y, label, color) => (
    <g>
      <rect x={x} y={y} width="96" height="40" rx="9" fill={on(k) ? color : 'var(--bg-subtle)'} stroke={on(k) ? color : 'var(--border-strong)'} strokeWidth={on(k) ? 2 : 1} />
      <text x={x + 48} y={y + 25} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={on(k) ? '#ffffff' : 'var(--ink)'}>{label}</text>
    </g>
  )

  return (
    <Figure caption="Dubbo 四角色：Provider 注册、Consumer 订阅、Registry 牵线、Monitor 统计。关键点——真正调用时 Consumer 直连 Provider，注册中心不在调用链路上(挂了也不影响已拿到地址的调用)。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Dubbo 架构">
        {node('r', 182, 16, 'Registry', 'var(--accent)')}
        {node('p', 30, 104, 'Provider', 'var(--green)')}
        {node('c', 334, 104, 'Consumer', 'var(--violet)')}
        {node('m', 182, 104, 'Monitor', 'var(--amber)')}

        {/* 注册/订阅/通知线 */}
        <line x1="120" y1="116" x2="182" y2="40" stroke={s.line === 'register' ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={s.line === 'register' ? 2.5 : 1} markerEnd="url(#da-a)" />
        <line x1="334" y1="116" x2="278" y2="40" stroke={['subscribe', 'notify'].includes(s.line) ? 'var(--violet)' : 'var(--border-strong)'} strokeWidth={['subscribe', 'notify'].includes(s.line) ? 2.5 : 1} markerEnd="url(#da-a)" />
        {/* 调用线 consumer→provider */}
        <line x1="334" y1="124" x2="126" y2="124" stroke={s.line === 'invoke' ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth={s.line === 'invoke' ? 3 : 1} strokeDasharray={s.line === 'invoke' ? '0' : '5 4'} markerEnd="url(#da-r)" />
        <text x="230" y="140" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={s.line === 'invoke' ? 'var(--rose)' : 'var(--ink-faint)'}>调用直连(不过注册中心)</text>

        <defs>
          <marker id="da-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="da-r" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker>
        </defs>

        <rect x="20" y="162" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="181" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

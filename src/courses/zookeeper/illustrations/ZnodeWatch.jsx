import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '客户端 A 在 /config 节点上注册一个 watch(监听)', watch: true, changed: false, fired: false },
  { desc: '客户端 B 修改了 /config 的数据', watch: true, changed: true, fired: false },
  { desc: 'ZK 给 A 发一次性通知：/config 变了', watch: false, changed: true, fired: true },
  { desc: 'A 收到通知后主动重新读取最新值(watch 已失效，需重新注册)', watch: false, changed: true, fired: false, reread: true },
]

export default function ZnodeWatch() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="ZK 的数据是一棵 znode 树，每个节点存小数据。客户端可在节点上注册 watch，节点变化时收到「一次性」通知——这是配置推送、服务发现的基础。注意：通知只触发一次，要持续监听需重新注册。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="znode 与 watch">
        {/* znode tree */}
        <circle cx="120" cy="40" r="16" fill="var(--accent)" />
        <text x="120" y="45" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#ffffff">/</text>
        <line x1="120" y1="56" x2="80" y2="84" stroke="var(--border-strong)" />
        <line x1="120" y1="56" x2="160" y2="84" stroke="var(--border-strong)" />
        <circle cx="80" cy="98" r="15" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="80" y="102" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink)">/app</text>
        <g>
          <circle cx="160" cy="98" r="18" fill={s.changed ? 'var(--amber)' : 'var(--accent-soft)'} stroke={s.changed ? 'var(--amber)' : 'var(--accent-line)'} strokeWidth="2" />
          <text x="160" y="95" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={s.changed ? '#ffffff' : 'var(--ink)'}>/config</text>
          <text x="160" y="106" textAnchor="middle" fontFamily="var(--mono)" fontSize="7" fill={s.changed ? '#ffffff' : 'var(--ink-soft)'}>{s.changed ? 'v2' : 'v1'}</text>
        </g>
        {s.watch && <text x="160" y="135" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">👁 watch</text>}

        {/* clients */}
        <rect x="300" y="30" width="130" height="36" rx="8" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="365" y="52" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">客户端 A(监听者)</text>
        <rect x="300" y="100" width="130" height="36" rx="8" fill="var(--violet)" fillOpacity="0.12" stroke="var(--violet)" />
        <text x="365" y="122" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--violet)">客户端 B(修改者)</text>

        {s.watch && step === 0 &&<line x1="300" y1="48" x2="178" y2="92" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#zw-a)" />}
        {s.changed && step === 1 && <line x1="300" y1="118" x2="178" y2="100" stroke="var(--violet)" strokeWidth="2" markerEnd="url(#zw-a)" />}
        {s.fired && <line x1="178" y1="92" x2="300" y2="48" stroke="var(--amber)" strokeWidth="2.5" markerEnd="url(#zw-b)" />}
        {s.reread && <line x1="300" y1="52" x2="178" y2="96" stroke="var(--green)" strokeWidth="2" markerEnd="url(#zw-a)" />}
        <defs>
          <marker id="zw-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="zw-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--amber)" /></marker>
        </defs>

        <rect x="20" y="158" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="178" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

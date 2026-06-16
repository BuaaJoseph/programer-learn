import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '初始：三个 Provider 都健康，注册中心地址列表 = [A, B, C]', list: ['A', 'B', 'C'], down: null, push: false },
  { desc: 'Provider B 宕机，与注册中心的心跳/会话断开', list: ['A', 'B', 'C'], down: 'B', push: false },
  { desc: '注册中心摘除 B，地址列表变为 [A, C]', list: ['A', 'C'], down: 'B', push: false },
  { desc: '注册中心把新列表 [A, C] 推送给所有 Consumer', list: ['A', 'C'], down: 'B', push: true },
  { desc: 'Consumer 更新本地缓存，之后不再调用已挂的 B', list: ['A', 'C'], down: 'B', push: false, done: true },
]

export default function RegistryDiscovery() {
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
    <Figure caption="服务注册与发现的价值：Provider 上下线，注册中心(ZooKeeper/Nacos)实时把最新地址列表推给 Consumer，让 Consumer 永远只调活着的节点。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="服务注册与发现">
        {/* providers */}
        {['A', 'B', 'C'].map((p, i) => {
          const isDown = s.down === p
          return (
            <g key={p}>
              <rect x="20" y={20 + i * 50} width="84" height="38" rx="8" fill={isDown ? 'var(--bg-sunken)' : 'var(--green-soft)'} stroke={isDown ? 'var(--rose)' : 'var(--green-line)'} strokeWidth={isDown ? 2 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
              <text x="62" y={43 + i * 50} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={isDown ? 'var(--rose)' : 'var(--green)'}>Provider {p}{isDown ? ' ✕' : ''}</text>
              <line x1="104" y1={39 + i * 50} x2="170" y2="90" stroke={isDown ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth="1" strokeDasharray="3 3" />
            </g>
          )
        })}

        {/* registry */}
        <rect x="170" y="60" width="120" height="64" rx="10" fill="var(--accent)" />
        <text x="230" y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">注册中心</text>
        <text x="230" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="#ffffff">列表: [{s.list.join(', ')}]</text>
        <text x="230" y="115" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">ZK / Nacos</text>

        {/* consumer */}
        <rect x="356" y="70" width="90" height="44" rx="9" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="401" y="90" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--violet)">Consumer</text>
        <text x="401" y="105" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">缓存 [{s.list.join(',')}]</text>
        <line x1="290" y1="92" x2="356" y2="92" stroke={s.push ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={s.push ? 2.5 : 1} markerEnd="url(#rd-a)" />
        {s.push && <text x="320" y="84" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">推送</text>}
        <defs><marker id="rd-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="162" width="426" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="181" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

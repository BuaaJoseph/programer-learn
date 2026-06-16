import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// key → CRC16(key) % 16384 → slot → 负责该 slot 的节点。
const NODES = [
  { name: 'node A', from: 0, to: 5460, color: 'var(--rose)' },
  { name: 'node B', from: 5461, to: 10922, color: 'var(--accent)' },
  { name: 'node C', from: 10923, to: 16383, color: 'var(--green)' },
]
// 预设几个 key 的槽位（示意值）
const KEYS = [
  { k: 'user:1001', slot: 1320 },
  { k: 'order:99', slot: 8765 },
  { k: 'cart:42', slot: 14200 },
  { k: '{user:1001}:cart', slot: 1320 },
]

export default function Cluster() {
  const [ki, setKi] = useState(1)
  const key = KEYS[ki]
  const node = NODES.find((n) => key.slot >= n.from && key.slot <= n.to)

  const controls = (
    <>
      {KEYS.map((k, i) => (
        <button key={k.k} className={`fig-btn ${ki === i ? 'active' : ''}`} onClick={() => setKi(i)}>
          {k.k}
        </button>
      ))}
      <span className="fig-note">共 16384 个槽，分给各节点</span>
    </>
  )

  return (
    <Figure caption="Cluster 把 key 用 CRC16 映射到 16384 个槽(slot)，再把槽分给各节点，实现分片与水平扩展。带 {} 的 hashtag 可让相关 key 落到同一槽。点不同 key 看它落到哪个节点。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="Redis Cluster 槽位">
        {/* 计算链 */}
        <text x="20" y="30" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">
          CRC16(<tspan fill="var(--rose)">{key.k}</tspan>) % 16384 = 槽 <tspan fontWeight="700" fill="var(--accent-strong)">{key.slot}</tspan>
        </text>

        {/* 槽位条 */}
        <text x="20" y="56" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">0</text>
        <text x="424" y="56" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">16383</text>
        {NODES.map((n) => {
          const x = 30 + (n.from / 16384) * 400
          const w = ((n.to - n.from) / 16384) * 400
          const active = node?.name === n.name
          return (
            <g key={n.name}>
              <rect x={x} y="62" width={w} height="26" rx="4" fill={active ? n.color : 'var(--bg-sunken)'} stroke={n.color} strokeWidth={active ? 2 : 1} />
              <text x={x + w / 2} y="79" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={active ? '#ffffff' : 'var(--ink-soft)'}>{n.name}</text>
            </g>
          )
        })}
        {/* 指针 */}
        <line x1={30 + (key.slot / 16384) * 400} y1="92" x2={30 + (key.slot / 16384) * 400} y2="62" stroke="var(--ink)" strokeWidth="2" markerEnd="url(#cl-a)" />
        <defs><marker id="cl-a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink)" /></marker></defs>

        {/* 节点盒 */}
        {NODES.map((n, i) => {
          const active = node?.name === n.name
          return (
            <g key={n.name}>
              <rect x={30 + i * 140} y="116" width="120" height="52" rx="10" fill={active ? n.color : 'var(--bg-subtle)'} stroke={active ? n.color : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
              <text x={90 + i * 140} y="138" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{n.name}</text>
              <text x={90 + i * 140} y="156" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={active ? '#ffffff' : 'var(--ink-faint)'}>slot {n.from}–{n.to}</text>
            </g>
          )
        })}

        <rect x="20" y="180" width="420" height="24" rx="6" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="32" y="196" fontFamily="var(--mono)" fontSize="11" fill="var(--green)">
          → key「{key.k}」落在槽 {key.slot}，由 {node?.name} 负责
        </text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const ACKS = {
  '0': { label: 'acks=0', wait: '不等任何确认，发完就算成功', risk: '最快，但 broker 没收到也不知道 → 可能丢消息', color: 'var(--rose)' },
  '1': { label: 'acks=1', wait: '等 Leader 写入成功就返回', risk: '折中；若 Leader 刚写完未同步给 Follower 就宕机 → 可能丢', color: 'var(--amber)' },
  all: { label: 'acks=all', wait: '等 Leader + 所有 ISR 副本都写入才返回', risk: '最可靠(配合 min.insync.replicas)，但延迟最高', color: 'var(--green)' },
}

export default function ProducerAck() {
  const [k, setK] = useState('all')
  const a = ACKS[k]
  const waitLeader = true
  const waitFollower = k === 'all'

  const controls = (
    <>
      {Object.entries(ACKS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="生产者 acks 决定「等多少副本确认才算发送成功」，是可靠性与延迟的权衡。acks=0 最快可能丢、acks=all 最稳最慢。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Kafka 生产者 acks">
        {/* producer */}
        <rect x="20" y="80" width="80" height="40" rx="8" fill="var(--accent)" />
        <text x="60" y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">producer</text>

        {/* leader */}
        <rect x="180" y="40" width="100" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="230" y="64" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">Leader 副本</text>
        <line x1="100" y1="96" x2="180" y2="64" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#pa-a)" />
        <text x="120" y="74" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">写消息</text>

        {/* followers */}
        {[0, 1].map((f) => (
          <g key={f}>
            <rect x="180" y={110 + f * 44} width="100" height="36" rx="8" fill={waitFollower ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={waitFollower ? 'var(--green-line)' : 'var(--border-strong)'} />
            <text x="230" y={132 + f * 44} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">Follower {f + 1}</text>
            <line x1="230" y1="80" x2="230" y2={110 + f * 44} stroke={waitFollower ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={waitFollower ? 2 : 1} strokeDasharray={waitFollower ? '0' : '4 3'} markerEnd="url(#pa-a)" />
          </g>
        ))}

        {/* ack 返回 */}
        <path d={`M180 ${k === '0' ? 60 : 56} C 140 20, 90 40, 78 78`} fill="none" stroke={a.color} strokeWidth="2" strokeDasharray={k === '0' ? '3 3' : '0'} markerEnd="url(#pa-b)" />
        <text x="110" y="34" fontFamily="var(--mono)" fontSize="9" fill={a.color}>{k === '0' ? '不等 ack' : 'ack'}</text>

        <defs>
          <marker id="pa-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="pa-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill={a.color} /></marker>
        </defs>

        <rect x="300" y="40" width="140" height="120" rx="10" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="312" y="60" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={a.color}>{a.label}</text>
        <foreignObject x="310" y="68" width="124" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{a.wait}</div>
        </foreignObject>
        <foreignObject x="310" y="112" width="124" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10px var(--sans)', color: a.color, lineHeight: 1.3 }}>{a.risk}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const MODES = {
  normal: { label: '普通集群', desc: '队列只在一个节点上有完整数据，其它节点只存元数据。该节点宕机 → 队列不可用、消息可能丢(未持久化时)。' },
  mirror: { label: '镜像队列', desc: '队列在多个节点各有一份镜像副本。主节点挂了，从镜像提升为主，队列仍可用。缺点是同步开销大、脑裂风险。' },
  quorum: { label: 'Quorum 队列', desc: '基于 Raft 的多副本，过半节点确认才算写入成功。主挂了自动选主，数据更安全，是新版推荐方案。' },
}

export default function HaCluster() {
  const [mode, setMode] = useState('quorum')
  const [down, setDown] = useState(false)
  const m = MODES[mode]
  const available = mode !== 'normal' || !down

  const controls = (
    <>
      {Object.entries(MODES).map(([k, v]) => (
        <button key={k} className={`fig-btn ${mode === k ? 'active' : ''}`} onClick={() => { setMode(k); setDown(false) }}>{v.label}</button>
      ))}
      <button className={`fig-btn ${down ? 'active' : ''}`} onClick={() => setDown((d) => !d)}>{down ? '✓ 节点1已宕机' : '模拟节点1宕机'}</button>
    </>
  )

  const hasCopy = (node) => mode === 'normal' ? node === 0 : true

  return (
    <Figure caption="单节点宕机队列就不可用。镜像队列与 Quorum Queue 用多副本保证：节点挂了，消息还在、队列还能用。选模式并模拟节点宕机看可用性。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="RabbitMQ 高可用">
        {[0, 1, 2].map((n) => {
          const isDown = down && n === 0
          const copy = hasCopy(n)
          const x = 30 + n * 145
          return (
            <g key={n}>
              <rect x={x} y="36" width="120" height="64" rx="10" fill={isDown ? 'var(--bg-sunken)' : 'var(--bg-subtle)'} stroke={isDown ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth={isDown ? 2 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
              <text x={x + 60} y="56" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={isDown ? 'var(--rose)' : 'var(--ink)'}>节点{n + 1}{isDown ? '(挂)' : ''}</text>
              {copy ? (
                <g>
                  <rect x={x + 22} y="66" width="76" height="24" rx="5" fill={n === 0 && mode !== 'normal' ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
                  <text x={x + 60} y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={n === 0 && mode !== 'normal' ? '#ffffff' : 'var(--accent-strong)'}>{mode === 'normal' ? '完整队列' : (isDown ? '副本' : (n === 0 ? '主副本' : '副本'))}</text>
                </g>
              ) : (
                <text x={x + 60} y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">仅元数据</text>
              )}
            </g>
          )
        })}

        <rect x="30" y="116" width="400" height="26" rx="7" fill={available ? 'var(--green-soft)' : 'var(--rose-soft)'} stroke={available ? 'var(--green-line)' : 'var(--rose-line)'} />
        <text x="42" y="133" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={available ? 'var(--green)' : 'var(--rose)'}>
          {available ? '✓ 队列可用，消息不丢' : '✕ 队列不可用，未持久化消息丢失'}
        </text>

        <rect x="30" y="150" width="400" height="34" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="38" y="152" width="384" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{m.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

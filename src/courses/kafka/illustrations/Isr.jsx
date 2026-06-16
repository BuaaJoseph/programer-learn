import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// ISR：与 Leader 保持同步的副本集合。Follower 落后太多被踢出 ISR；Leader 挂了只从 ISR 选新主。
const STEPS = [
  { desc: '正常：Leader + F1 + F2 都在 ISR(同步副本集合)内', isr: ['L', 'F1', 'F2'], lag: { F1: 0, F2: 0 }, leader: 'L' },
  { desc: 'F2 同步变慢，落后超过阈值 → 被踢出 ISR', isr: ['L', 'F1'], lag: { F1: 0, F2: 8 }, leader: 'L' },
  { desc: 'Leader 宕机！只会从 ISR([L,F1]) 里选新 Leader', isr: ['F1'], lag: { F1: 0, F2: 8 }, leader: null, down: true },
  { desc: 'F1 被选为新 Leader，数据不丢(它和老 Leader 同步过)', isr: ['F1', 'F2'], lag: { F1: 0, F2: 2 }, leader: 'F1' },
]

export default function Isr() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const replicas = [
    { id: 'L', name: '副本 A', x: 30 },
    { id: 'F1', name: '副本 B', x: 175 },
    { id: 'F2', name: '副本 C', x: 320 },
  ]

  return (
    <Figure caption="每个分区有多个副本，但只有 ISR(In-Sync Replicas，与 Leader 保持同步的集合)里的副本才有资格被选为新 Leader。这保证了选出来的新主不会丢数据。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Kafka ISR 副本机制">
        {replicas.map((r) => {
          const inIsr = s.isr.includes(r.id)
          const isLeader = s.leader === r.id
          const isDown = s.down && r.id === 'L'
          return (
            <g key={r.id}>
              <rect x={r.x} y="40" width="110" height="70" rx="10"
                fill={isDown ? 'var(--bg-sunken)' : isLeader ? 'var(--accent)' : inIsr ? 'var(--accent-soft)' : 'var(--rose-soft)'}
                stroke={isDown ? 'var(--rose)' : isLeader ? 'var(--accent)' : inIsr ? 'var(--accent-line)' : 'var(--rose-line)'}
                strokeWidth={isLeader ? 2.5 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
              <text x={r.x + 55} y="62" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={isLeader ? '#ffffff' : isDown ? 'var(--rose)' : 'var(--ink)'}>{r.name}</text>
              <text x={r.x + 55} y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={isLeader ? '#ffffff' : isDown ? 'var(--rose)' : 'var(--ink-soft)'}>
                {isDown ? '已宕机' : isLeader ? 'Leader' : 'Follower'}
              </text>
              <text x={r.x + 55} y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={inIsr ? 'var(--green)' : 'var(--rose)'}>
                {inIsr ? '✓ 在 ISR' : '✗ 不在 ISR'}
              </text>
            </g>
          )
        })}
        {/* ISR 框 */}
        <text x="30" y="132" fontFamily="var(--mono)" fontSize="11" fill="var(--green)">当前 ISR = {'{ '}{s.isr.join(', ')}{' }'}</text>

        <rect x="20" y="150" width="420" height="40" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="404" height="36">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

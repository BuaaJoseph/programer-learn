import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 写必须过半确认。5 节点过半=3。演示分区时多数派可写、少数派不可写(避免脑裂)。
const STEPS = [
  { desc: '写请求发给 Leader，Leader 把提案广播给所有 Follower', acked: 1, partition: false },
  { desc: '收到过半(≥3)确认即可提交——不必等所有节点', acked: 3, partition: false, commit: true },
  { desc: '网络分区：3 节点一组、2 节点一组', acked: 0, partition: true },
  { desc: '多数派(3)能选出 Leader 继续写；少数派(2)凑不齐过半 → 拒绝写', acked: 3, partition: true, split: true },
]

export default function QuorumWrite() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">5 节点，过半 = 3</span>
    </>
  )

  // 节点位置；分区时左3右2
  const nodes = [0, 1, 2, 3, 4]
  const pos = (i) => {
    if (!s.partition) return [50 + i * 90, 60]
    return i < 3 ? [40 + i * 70, 56] : [330 + (i - 3) * 70, 56]
  }

  return (
    <Figure caption="ZK 的写必须经 Leader 广播、过半(quorum)节点确认才算成功——所以能容忍少数节点故障。网络分区时，只有多数派能继续工作，少数派主动拒写，从根上避免脑裂。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="过半写成功与脑裂防护">
        {s.partition && <line x1="300" y1="20" x2="300" y2="110" stroke="var(--rose)" strokeWidth="2" strokeDasharray="5 4" />}
        {s.partition && <text x="300" y="16" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">网络分区</text>}
        {nodes.map((i) => {
          const [x, y] = pos(i)
          const isLeader = i === 0
          const acked = !s.partition ? i < s.acked : (s.split && i < 3 && i > 0)
          const minority = s.partition && i >= 3
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="24" fill={isLeader ? 'var(--accent)' : acked ? 'var(--green-soft)' : minority && s.split ? 'var(--rose-soft)' : 'var(--accent-soft)'} stroke={isLeader ? 'var(--accent)' : acked ? 'var(--green)' : minority && s.split ? 'var(--rose)' : 'var(--accent-line)'} strokeWidth={isLeader ? 2.5 : 1} />
              <text x={x} y={y - 1} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill={isLeader ? '#ffffff' : 'var(--ink)'}>N{i + 1}</text>
              <text x={x} y={y + 11} textAnchor="middle" fontFamily="var(--mono)" fontSize="7" fill={isLeader ? '#ffffff' : 'var(--ink-soft)'}>{isLeader ? 'Leader' : acked ? '✓ack' : ''}</text>
            </g>
          )
        })}
        {s.split && <text x="120" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">多数派(3)：可写 ✓</text>}
        {s.split && <text x="365" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">少数派(2)：拒写 ✕</text>}
        {s.commit && <text x="230" y="120" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">已过半 → 提交成功</text>}

        <rect x="20" y="158" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="178" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

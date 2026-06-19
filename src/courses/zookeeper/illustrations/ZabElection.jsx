import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '正常：5 节点集群，1 个 Leader 处理写、其余 Follower', leader: 0, down: null, voting: false },
  { desc: 'Leader(节点1)宕机，集群进入选举(LOOKING)状态', leader: null, down: 0, voting: true },
  { desc: '各节点投票，优先选 zxid(事务 id)最大、即数据最新的节点', leader: null, down: 0, voting: true, votes: true },
  { desc: '节点3 获得过半(≥3)选票，当选新 Leader，恢复对外服务', leader: 2, down: 0, voting: false },
]

export default function ZabElection() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const cx = [80, 180, 280, 380, 230]
  const cy = [50, 50, 50, 50, 120]
  const zxid = [9, 7, 9, 6, 8]

  return (
    <Figure caption="ZK 集群只有一个 Leader 处理写请求。Leader 宕机时用 ZAB 协议快速选举：谁的 zxid(数据)最新、且得到过半选票，谁就是新 Leader——过半机制保证不会选出两个主。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ZAB 选举">
        {cx.map((x, i) => {
          const isLeader = s.leader === i
          const isDown = s.down === i
          return (
            <g key={i}>
              <circle cx={x} cy={cy[i]} r="26"
                fill={isDown ? 'var(--bg-sunken)' : isLeader ? 'var(--accent)' : s.voting ? 'var(--amber-soft)' : 'var(--accent-soft)'}
                stroke={isDown ? 'var(--rose)' : isLeader ? 'var(--accent)' : s.voting ? 'var(--amber-line)' : 'var(--accent-line)'}
                strokeWidth={isLeader ? 2.5 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
              <text x={x} y={cy[i] - 2} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={isLeader ? '#ffffff' : isDown ? 'var(--rose)' : 'var(--ink)'}>节点{i + 1}</text>
              <text x={x} y={cy[i] + 10} textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={isLeader ? '#ffffff' : isDown ? 'var(--rose)' : 'var(--ink-soft)'}>
                {isDown ? '宕机' : isLeader ? 'Leader' : 'F'}
              </text>
              {!isDown && <text x={x} y={cy[i] + 40} textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">zxid={zxid[i]}</text>}
              {s.votes && !isDown && (zxid[i] === 9) && <text x={x} y={cy[i] - 32} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">★候选</text>}
            </g>
          )
        })}

        <rect x="20" y="158" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="178" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

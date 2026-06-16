import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '写请求只能打到主库 master', hl: 'write' },
  { desc: '从库首次连接 → 全量同步：master 生成 RDB 快照发给从库', hl: 'full' },
  { desc: '之后增量同步：master 把写命令持续发给从库(复制缓冲区)', hl: 'incr' },
  { desc: '读请求分摊到各从库 → 读写分离、提升读吞吐', hl: 'read' },
]

export default function Replication() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.hl === k

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="主从复制：写只走主库，主库把数据同步给从库(先全量 RDB、后增量命令)，读可分摊到从库。理解全量/增量同步，才能排查主从延迟。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="Redis 主从复制">
        {/* master */}
        <rect x="180" y="24" width="100" height="50" rx="10" fill="var(--rose)" stroke="var(--rose)" />
        <text x="230" y="45" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill="#ffffff">master</text>
        <text x="230" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">读写</text>

        {/* replicas */}
        {[60, 230, 360].map((x, i) => (
          <g key={i}>
            <rect x={x} y="120" width="90" height="44" rx="10" fill={on('read') ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" />
            <text x={x + 45} y="140" textAnchor="middle" fontFamily="var(--display)" fontSize="12" fontWeight="700" fill={on('read') ? '#ffffff' : 'var(--green)'}>replica {i + 1}</text>
            <text x={x + 45} y="156" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={on('read') ? '#ffffff' : 'var(--ink-soft)'}>只读</text>
            <line x1="230" y1="74" x2={x + 45} y2="120"
              stroke={on('full') ? 'var(--amber)' : on('incr') ? 'var(--accent)' : 'var(--border-strong)'}
              strokeWidth={on('full') || on('incr') ? 2.5 : 1}
              strokeDasharray={on('incr') ? '5 3' : '0'} />
          </g>
        ))}

        <rect x="20" y="178" width="420" height="26" rx="6" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="195" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>

        {on('write') && <><line x1="230" y1="6" x2="230" y2="24" stroke="var(--rose)" strokeWidth="2.5" markerEnd="url(#rp-a)" /><text x="240" y="16" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">SET/写</text></>}
        <defs><marker id="rp-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker></defs>

        <text x="118" y="100" fontFamily="var(--mono)" fontSize="11" fill={on('full') ? 'var(--amber)' : on('incr') ? 'var(--accent)' : 'var(--ink-faint)'}>
          {on('full') ? '全量同步：发送 RDB 快照' : on('incr') ? '增量同步：转发写命令' : '主 → 从 复制通道'}
        </text>
      </svg>
    </Figure>
  )
}

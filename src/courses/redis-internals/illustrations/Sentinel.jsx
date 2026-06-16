import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '正常运行：哨兵集群持续 PING 监控主从', master: 'm', down: false },
  { desc: '主库无响应，一个哨兵判定「主观下线」(SDOWN)', master: 'm', down: true, sdown: true },
  { desc: '多个哨兵都判定下线 → 达成「客观下线」(ODOWN)', master: 'm', down: true, odown: true },
  { desc: '哨兵们投票选举一个 Leader 来执行故障转移', master: 'm', down: true, elect: true },
  { desc: 'Leader 把一个从库提升为新主，其余从库改指向它', master: 's1', down: true, promoted: true },
  { desc: '哨兵通知客户端新主地址，服务恢复', master: 's1', down: true, done: true },
]

export default function Sentinel() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const node = (id, x, y, label) => {
    const isMaster = s.master === id
    const isDown = id === 'm' && s.down
    const fill = isDown ? 'var(--rose)' : isMaster ? 'var(--rose)' : 'var(--green-soft)'
    return (
      <g>
        <rect x={x} y={y} width="84" height="44" rx="10" fill={isDown ? 'var(--bg-sunken)' : fill} stroke={isDown ? 'var(--rose)' : isMaster ? 'var(--rose)' : 'var(--green-line)'} strokeWidth={isMaster ? 2 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
        <text x={x + 42} y={y + 21} textAnchor="middle" fontFamily="var(--display)" fontSize="12" fontWeight="700" fill={isDown ? 'var(--rose)' : isMaster ? '#ffffff' : 'var(--green)'}>{label}</text>
        <text x={x + 42} y={y + 36} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={isDown ? 'var(--rose)' : isMaster ? '#ffffff' : 'var(--ink-soft)'}>
          {isDown ? '已下线' : isMaster ? '主' : '从'}
        </text>
      </g>
    )
  }

  return (
    <Figure caption="哨兵 Sentinel 实现高可用：持续监控主从；主库挂了先「主观下线」、多数哨兵确认后「客观下线」；选出 Leader 把一个从库提升为新主，并通知客户端。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="哨兵故障转移">
        {/* sentinels */}
        {[40, 190, 340].map((x, i) => (
          <g key={i}>
            <circle cx={x + 40} cy="34" r="20" fill={s.elect && i === 0 ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" strokeWidth={s.elect && i === 0 ? 2.5 : 1} />
            <text x={x + 40} y="32" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={s.elect && i === 0 ? '#ffffff' : 'var(--accent-strong)'}>哨兵{i + 1}</text>
            <text x={x + 40} y="44" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={s.elect && i === 0 ? '#ffffff' : 'var(--ink-faint)'}>{s.elect && i === 0 ? 'Leader' : ''}</text>
          </g>
        ))}

        {/* nodes */}
        {node('m', 60, 96, 'node-m')}
        {node('s1', 188, 96, 'node-1')}
        {node('s2', 316, 96, 'node-2')}

        {/* 监控虚线 */}
        {['m', 's1', 's2'].map((id, i) => (
          <line key={id} x1={[230, 230, 230][i]} y1="54" x2={[102, 230, 358][i]} y2="96" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
        ))}

        {s.sdown && <text x="60" y="156" fontFamily="var(--mono)" fontSize="10" fill="var(--amber)">SDOWN 主观下线</text>}
        {s.odown && <text x="60" y="156" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">ODOWN 客观下线</text>}
        {s.promoted && <text x="188" y="156" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">↑ 提升为新主</text>}

        <rect x="20" y="170" width="420" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="189" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

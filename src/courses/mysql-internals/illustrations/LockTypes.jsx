import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 在一条索引数轴上演示 记录锁 / 间隙锁 / Next-Key Lock 锁住的范围。
// 已有记录：10, 20, 30。间隙：(-∞,10) (10,20) (20,30) (30,+∞)
const RECORDS = [10, 20, 30]
const SCENARIOS = [
  { id: 'rec', name: '等值命中 id=20', type: '记录锁 Record Lock', desc: '只锁住 id=20 这一行（RC 级别等值命中）', locks: { records: [20], gaps: [] } },
  { id: 'gap', name: '等值未命中 id=15', type: '间隙锁 Gap Lock', desc: '锁住 (10,20) 这个间隙，阻止别人插入 11~19，防幻读', locks: { records: [], gaps: [1] } },
  { id: 'next', name: '范围 id>15 (RR)', type: 'Next-Key Lock', desc: '记录锁 + 间隙锁：锁住 (10,20] (20,30] (30,+∞)，彻底防幻读', locks: { records: [20, 30], gaps: [1, 2, 3] } },
]
// gap index: 0=(-∞,10) 1=(10,20) 2=(20,30) 3=(30,+∞)
const GAP_X = [40, 130, 230, 330]
const GAP_W = [90, 100, 100, 110]
const REC_X = { 10: 130, 20: 230, 30: 330 }

export default function LockTypes() {
  const [si, setSi] = useState(2)
  const sc = SCENARIOS[si]

  const controls = (
    <>
      {SCENARIOS.map((s, i) => (
        <button key={s.id} className={`fig-btn ${si === i ? 'active' : ''}`} onClick={() => setSi(i)}>
          {s.name}
        </button>
      ))}
      <span className="fig-note">{sc.type}</span>
    </>
  )

  return (
    <Figure caption="InnoDB 锁的是索引项，不只是行。记录锁锁住已有行；间隙锁锁住「行之间的空隙」防止插入；Next-Key Lock = 记录锁 + 间隙锁，是 RR 下防幻读的主力。" controls={controls}>
      <svg viewBox="0 0 460 220" width="460" role="img" aria-label="行锁、间隙锁与 Next-Key Lock">
        {/* 间隙高亮 */}
        {sc.locks.gaps.map((g) => (
          <rect key={g} x={GAP_X[g]} y="70" width={GAP_W[g]} height="40" fill="var(--amber-soft)" stroke="var(--amber-line)" strokeDasharray="4 3" />
        ))}
        {/* 数轴 */}
        <line x1="30" y1="90" x2="450" y2="90" stroke="var(--border-strong)" strokeWidth="2" />
        <text x="30" y="130" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">-∞</text>
        <text x="442" y="130" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">+∞</text>

        {/* 记录点 */}
        {RECORDS.map((r) => {
          const locked = sc.locks.records.includes(r)
          return (
            <g key={r}>
              <circle cx={REC_X[r]} cy="90" r="13" fill={locked ? 'var(--rose)' : 'var(--accent-soft)'} stroke={locked ? 'var(--rose)' : 'var(--accent-line)'} strokeWidth="2" />
              <text x={REC_X[r]} y="95" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={locked ? '#ffffff' : 'var(--ink)'}>{r}</text>
            </g>
          )
        })}

        {/* 图例 */}
        <circle cx="44" cy="160" r="8" fill="var(--rose)" />
        <text x="58" y="164" fontFamily="var(--sans)" fontSize="12" fill="var(--ink-soft)">记录锁（锁住的行）</text>
        <rect x="230" y="152" width="16" height="16" fill="var(--amber-soft)" stroke="var(--amber-line)" strokeDasharray="3 2" />
        <text x="252" y="164" fontFamily="var(--sans)" fontSize="12" fill="var(--ink-soft)">间隙锁（锁住的空隙）</text>

        <rect x="30" y="182" width="420" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="42" y="202" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{sc.desc}</text>
      </svg>
    </Figure>
  )
}

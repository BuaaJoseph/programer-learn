import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 用「A 给 B 转 100 元」演示原子性：中途失败必须整体回滚。
const STEPS = [
  { desc: '事务开始：A=500, B=300', a: 500, b: 300, state: 'run' },
  { desc: 'UPDATE A 余额 -100 → A=400', a: 400, b: 300, state: 'run' },
  { desc: '此时宕机/报错！B 还没 +100', a: 400, b: 300, state: 'fail' },
  { desc: '原子性：undo log 回滚，A 恢复为 500', a: 500, b: 300, state: 'rollback' },
]

const CARDS = [
  { k: 'A', t: '原子性 Atomicity', d: '要么全做，要么全不做（靠 undo log 回滚）' },
  { k: 'C', t: '一致性 Consistency', d: '转账前后总额不变，约束始终成立' },
  { k: 'I', t: '隔离性 Isolation', d: '并发事务互不干扰（靠锁 + MVCC）' },
  { k: 'D', t: '持久性 Durability', d: '提交后即使宕机也不丢（靠 redo log）' },
]

export default function ACID() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const color = s.state === 'fail' ? 'var(--rose)' : s.state === 'rollback' ? 'var(--amber)' : 'var(--accent)'
  const soft = s.state === 'fail' ? 'var(--rose-soft)' : s.state === 'rollback' ? 'var(--amber-soft)' : 'var(--accent-soft)'

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">演示「原子性」：转账中途失败的处理</span>
    </>
  )

  return (
    <Figure caption="事务是一组要么全成功、要么全回滚的操作。ACID 是数据库对它的四条承诺，下面用转账动画演示其中的「原子性」。" controls={controls}>
      <svg viewBox="0 0 460 250" width="460" role="img" aria-label="ACID 与原子性">
        {/* 账户 */}
        <g>
          <rect x="40" y="20" width="120" height="60" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
          <text x="100" y="44" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fill="var(--ink)">账户 A</text>
          <text x="100" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="18" fontWeight="700" fill={color}>{s.a}</text>
        </g>
        <path d="M168 50 L292 50" stroke="var(--ink-faint)" strokeWidth="2" markerEnd="url(#acid-a)" />
        <text x="230" y="42" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">转 100</text>
        <g>
          <rect x="300" y="20" width="120" height="60" rx="10" fill="var(--green-soft)" stroke="var(--green-line)" />
          <text x="360" y="44" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fill="var(--ink)">账户 B</text>
          <text x="360" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="18" fontWeight="700" fill="var(--ink)">{s.b}</text>
        </g>
        <defs>
          <marker id="acid-a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" />
          </marker>
        </defs>

        <rect x="40" y="96" width="380" height="30" rx="7" fill={soft} stroke={color} />
        <text x="54" y="116" fontFamily="var(--sans)" fontSize="13" fill={color}>{s.desc}</text>

        {/* ACID 四卡 */}
        {CARDS.map((c, i) => (
          <g key={c.k}>
            <rect x={16 + (i % 2) * 220} y={140 + Math.floor(i / 2) * 52} width="208" height="46" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
            <circle cx={36 + (i % 2) * 220} cy={163 + Math.floor(i / 2) * 52} r="13" fill="var(--accent)" />
            <text x={36 + (i % 2) * 220} y={168 + Math.floor(i / 2) * 52} textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">{c.k}</text>
            <text x={56 + (i % 2) * 220} y={158 + Math.floor(i / 2) * 52} fontFamily="var(--sans)" fontSize="11.5" fontWeight="700" fill="var(--ink)">{c.t}</text>
            <text x={56 + (i % 2) * 220} y={175 + Math.floor(i / 2) * 52} fontFamily="var(--sans)" fontSize="10" fill="var(--ink-soft)">{c.d}</text>
          </g>
        ))}
      </svg>
    </Figure>
  )
}

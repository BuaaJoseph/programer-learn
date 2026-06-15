import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 矩阵：四种隔离级别下，三种并发异常是否可能发生。
const LEVELS = [
  { id: 'ru', name: '读未提交 RU', dirty: true, nonRepeat: true, phantom: true },
  { id: 'rc', name: '读已提交 RC', dirty: false, nonRepeat: true, phantom: true },
  { id: 'rr', name: '可重复读 RR', dirty: false, nonRepeat: false, phantom: false, star: true },
  { id: 'ser', name: '串行化 Serializable', dirty: false, nonRepeat: false, phantom: false },
]
const ANOM = [
  { key: 'dirty', label: '脏读', desc: '读到了别的事务「还没提交」的修改' },
  { key: 'nonRepeat', label: '不可重复读', desc: '同一行两次读，值变了（别人 update 并提交）' },
  { key: 'phantom', label: '幻读', desc: '同样条件两次查询，行数变了（别人 insert/delete）' },
]

export default function IsolationLevels() {
  const [lv, setLv] = useState('rr')
  const [anom, setAnom] = useState('nonRepeat')
  const level = LEVELS.find((l) => l.id === lv)
  const happens = level[anom]
  const curAnom = ANOM.find((a) => a.key === anom)

  const controls = (
    <>
      {LEVELS.map((l) => (
        <button key={l.id} className={`fig-btn ${lv === l.id ? 'active' : ''}`} onClick={() => setLv(l.id)}>
          {l.name.split(' ')[0]}
        </button>
      ))}
      <span className="fig-note">隔离级别越高越安全、并发越低</span>
    </>
  )

  return (
    <Figure caption="四种隔离级别就是在「并发正确性」和「性能」之间取舍。点上方切级别、下方切异常，看该异常在此级别下是否会发生。MySQL 默认 RR。" controls={controls}>
      <svg viewBox="0 0 460 250" width="460" role="img" aria-label="隔离级别与并发异常">
        {/* 异常选择 */}
        {ANOM.map((a, i) => (
          <g key={a.key} onClick={() => setAnom(a.key)} style={{ cursor: 'pointer' }}>
            <rect x={16 + i * 145} y="14" width="135" height="30" rx="7"
              fill={anom === a.key ? 'var(--accent)' : 'var(--bg-subtle)'} stroke={anom === a.key ? 'var(--accent-strong)' : 'var(--border)'} />
            <text x={83 + i * 145} y="34" textAnchor="middle" fontFamily="var(--sans)" fontSize="13"
              fontWeight="600" fill={anom === a.key ? '#ffffff' : 'var(--ink-soft)'}>{a.label}</text>
          </g>
        ))}

        {/* 两事务时间线 */}
        <text x="16" y="74" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">事务 T1</text>
        <text x="16" y="116" fontFamily="var(--mono)" fontSize="11" fill="var(--violet)">事务 T2</text>
        <line x1="70" y1="70" x2="444" y2="70" stroke="var(--accent-line)" strokeWidth="2" />
        <line x1="70" y1="112" x2="444" y2="112" stroke="#d9c8f0" strokeWidth="2" />
        <circle cx="120" cy="70" r="6" fill="var(--accent)" />
        <text x="120" y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">读</text>
        <circle cx="250" cy="112" r="6" fill="var(--violet)" />
        <text x="250" y="102" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">改/插</text>
        <circle cx="380" cy="70" r="6" fill="var(--accent)" />
        <text x="380" y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">再读</text>

        {/* 结论 */}
        <rect x="16" y="138" width="428" height="44" rx="10"
          fill={happens ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={happens ? 'var(--rose-line)' : 'var(--green-line)'} />
        <circle cx="42" cy="160" r="13" fill={happens ? 'var(--rose)' : 'var(--green)'} />
        <text x="42" y="165" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fontWeight="700" fill="#ffffff">{happens ? '✕' : '✓'}</text>
        <text x="66" y="156" fontFamily="var(--sans)" fontSize="13" fontWeight="700" fill={happens ? 'var(--rose)' : 'var(--green)'}>
          {level.name}下，「{curAnom.label}」{happens ? '可能发生' : '不会发生'}
        </text>
        <text x="66" y="174" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-soft)">{curAnom.desc}</text>

        <text x="16" y="208" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">
          注：标准 RR 不防幻读，但 InnoDB 的 RR 用 Next-Key Lock + MVCC，很大程度上避免了幻读（下一卷详解）。
        </text>
      </svg>
    </Figure>
  )
}

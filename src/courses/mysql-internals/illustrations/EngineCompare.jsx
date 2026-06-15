import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const FEATURES = [
  { name: '事务 Transaction', innodb: true, myisam: false },
  { name: '行锁 Row Lock', innodb: true, myisam: false },
  { name: '表锁 Table Lock', innodb: true, myisam: true },
  { name: '外键 Foreign Key', innodb: true, myisam: false },
  { name: 'MVCC 多版本', innodb: true, myisam: false },
  { name: '崩溃恢复 Crash-safe', innodb: true, myisam: false },
  { name: 'count(*) 极快', innodb: false, myisam: true },
]

export default function EngineCompare() {
  const [engine, setEngine] = useState('innodb')
  const isInno = engine === 'innodb'

  const controls = (
    <>
      <button className={`fig-btn ${isInno ? 'active' : ''}`} onClick={() => setEngine('innodb')}>
        InnoDB
      </button>
      <button className={`fig-btn ${!isInno ? 'active' : ''}`} onClick={() => setEngine('myisam')}>
        MyISAM
      </button>
      <span className="fig-note">{isInno ? '默认引擎：支持事务与行锁' : '老引擎：表锁、不支持事务'}</span>
    </>
  )

  return (
    <Figure caption="MySQL 的存储引擎是可插拔的。InnoDB 因为支持事务、行锁与 MVCC 成为默认；MyISAM 已基本退役。点上方按钮切换对比。" controls={controls}>
      <svg viewBox="0 0 460 270" width="460" role="img" aria-label="InnoDB 与 MyISAM 对比">
        <rect x="14" y="14" width="432" height="34" rx="8" fill={isInno ? 'var(--accent)' : 'var(--ink-soft)'} />
        <text x="230" y="36" textAnchor="middle" fontFamily="var(--display)" fontSize="16" fontWeight="700" fill="#ffffff">
          {isInno ? 'InnoDB 引擎' : 'MyISAM 引擎'}
        </text>
        {FEATURES.map((f, i) => {
          const on = isInno ? f.innodb : f.myisam
          const y = 60 + i * 28
          return (
            <g key={f.name}>
              <rect x="14" y={y} width="340" height="24" rx="6" fill="var(--bg-subtle)" stroke="var(--border)" />
              <text x="26" y={y + 16} fontFamily="var(--sans)" fontSize="13" fill="var(--ink)">
                {f.name}
              </text>
              <circle cx="378" cy={y + 12} r="11" fill={on ? 'var(--green)' : 'var(--rose)'} />
              <text x="378" y={y + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="13" fontWeight="700" fill="#ffffff">
                {on ? '✓' : '✕'}
              </text>
              <text x="398" y={y + 16} fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">
                {on ? '支持' : '不支持'}
              </text>
            </g>
          )
        })}
      </svg>
    </Figure>
  )
}

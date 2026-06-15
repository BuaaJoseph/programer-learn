import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 联合索引 (a,b,c) 的最左前缀：演示不同查询条件能用到索引的哪几列。
const QUERIES = [
  { sql: 'WHERE a=2', use: ['a'], ok: true, note: '命中最左列 a，走索引' },
  { sql: 'WHERE a=2 AND b=3', use: ['a', 'b'], ok: true, note: 'a、b 连续命中，走索引到 b' },
  { sql: 'WHERE a=2 AND b=3 AND c=4', use: ['a', 'b', 'c'], ok: true, note: '三列全部命中，最佳' },
  { sql: 'WHERE a=2 AND c=4', use: ['a'], ok: true, note: 'b 缺失 → c 用不上索引，只用到 a' },
  { sql: 'WHERE b=3', use: [], ok: false, note: '跳过最左列 a → 整个索引用不上！' },
]
const COLS = ['a', 'b', 'c']

export default function CompositeIndex() {
  const [qi, setQi] = useState(1)
  const q = QUERIES[qi]

  const controls = (
    <>
      {QUERIES.map((item, i) => (
        <button key={i} className={`fig-btn ${qi === i ? 'active' : ''}`} onClick={() => setQi(i)}>
          {item.sql.replace('WHERE ', '')}
        </button>
      ))}
      <span className="fig-note">{q.note}</span>
    </>
  )

  return (
    <Figure caption="联合索引 (a,b,c) 先按 a 排序、a 相同再按 b、b 相同再按 c。能否用上索引取决于查询是否满足「最左前缀」：从 a 起、连续地用列。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="联合索引最左前缀">
        <text x="20" y="28" fontFamily="var(--mono)" fontSize="13" fill="var(--ink)">索引 KEY idx_abc (a, b, c)</text>

        {/* 三列示意 */}
        {COLS.map((c, i) => {
          const used = q.use.includes(c)
          return (
            <g key={c}>
              <rect x={20 + i * 130} y="44" width="118" height="44" rx="8"
                fill={used ? 'var(--accent)' : 'var(--bg-sunken)'} stroke={used ? 'var(--accent-strong)' : 'var(--border-strong)'} />
              <text x={79 + i * 130} y="64" textAnchor="middle" fontFamily="var(--display)" fontSize="16" fontWeight="700"
                fill={used ? '#ffffff' : 'var(--ink-faint)'}>{c}</text>
              <text x={79 + i * 130} y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
                fill={used ? '#ffffff' : 'var(--ink-faint)'}>{used ? '用到索引' : '未用到'}</text>
              {i < 2 && <text x={138 + i * 130} y="72" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fill="var(--ink-faint)">▸</text>}
            </g>
          )
        })}

        {/* 排序示意：模拟索引中的有序条目 */}
        <text x="20" y="120" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">索引内的有序条目（先 a，再 b，再 c）：</text>
        {[
          '(1,1,9) (1,2,3) (2,3,4) (2,3,8) (2,5,1) (3,1,2)',
        ].map((row, i) => (
          <text key={i} x="20" y="140" fontFamily="var(--mono)" fontSize="12" fill="var(--ink-soft)">{row}</text>
        ))}

        {/* 结论条 */}
        <rect x="20" y="158" width="420" height="34" rx="8"
          fill={q.ok ? 'var(--green-soft)' : 'var(--rose-soft)'} stroke={q.ok ? 'var(--green-line)' : 'var(--rose-line)'} />
        <text x="34" y="180" fontFamily="var(--mono)" fontSize="12" fill={q.ok ? 'var(--green)' : 'var(--rose)'}>
          {q.ok ? `✓ ${q.sql} → 用到 ${q.use.join(', ')}` : `✕ ${q.sql} → 索引失效，全表扫描`}
        </text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 演示二级索引查询的「回表」：二级索引叶子 → 拿到主键 → 回主键(聚簇)索引取整行。
const STEPS = [
  { desc: 'SQL: SELECT * FROM user WHERE name = 李四', hl: 'q' },
  { desc: '走 name 二级索引，定位到叶子，拿到主键 id = 2', hl: 'sec' },
  { desc: '二级索引叶子只存「索引列 + 主键」，没有整行数据', hl: 'sec' },
  { desc: '拿 id=2 回到主键(聚簇)索引，再查一次树', hl: 'back' },
  { desc: '聚簇索引叶子存着整行 → 取出完整数据返回', hl: 'clu' },
]

export default function ClusteredIndex() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const secActive = ['sec', 'back'].includes(s.hl)
  const cluActive = ['back', 'clu'].includes(s.hl)

  return (
    <Figure caption="InnoDB 的整行数据存在主键（聚簇）索引的叶子里。走二级索引只能拿到主键，常常要拿着主键「回表」再查一次聚簇索引——这就是回表的代价。" controls={controls}>
      <svg viewBox="0 0 460 250" width="460" role="img" aria-label="聚簇索引与回表">
        {/* 二级索引 */}
        <text x="20" y="30" fontFamily="var(--mono)" fontSize="12" fill="var(--accent-strong)">二级索引 (name)</text>
        <rect x="20" y="40" width="180" height="34" rx="6" fill={secActive ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
        <text x="110" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={secActive ? '#ffffff' : 'var(--ink)'}>根 / 内部节点</text>
        <rect x="20" y="86" width="180" height="40" rx="6" fill={secActive ? 'var(--accent-soft)' : 'var(--bg-subtle)'} stroke={secActive ? 'var(--accent)' : 'var(--border)'} />
        <text x="110" y="103" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">叶子：name=李四</text>
        <text x="110" y="119" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">→ id = 2（只有主键）</text>

        {/* 聚簇索引 */}
        <text x="262" y="30" fontFamily="var(--mono)" fontSize="12" fill="var(--green)">主键聚簇索引 (id)</text>
        <rect x="262" y="40" width="180" height="34" rx="6" fill={cluActive ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" />
        <text x="352" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={cluActive ? '#ffffff' : 'var(--ink)'}>根 / 内部节点</text>
        <rect x="262" y="86" width="180" height="56" rx="6" fill={cluActive ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={cluActive ? 'var(--green)' : 'var(--border)'} />
        <text x="352" y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--ink)">叶子：id=2</text>
        <text x="352" y="122" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">{'{id:2, name:李四,'}</text>
        <text x="352" y="135" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">{'age:30, city:北京}'}</text>

        {/* 回表箭头 */}
        {s.hl === 'back' && (
          <g>
            <path d="M200 106 C 230 106, 232 60, 262 60" stroke="var(--amber)" strokeWidth="2.5" fill="none" markerEnd="url(#ci-a)" />
            <text x="206" y="150" fontFamily="var(--mono)" fontSize="11" fill="var(--amber)">回表：拿 id 再查一次</text>
          </g>
        )}
        <defs>
          <marker id="ci-a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--amber)" />
          </marker>
        </defs>

        <rect x="20" y="170" width="422" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="190" fontFamily="var(--sans)" fontSize="13" fill="var(--ink)">{s.desc}</text>
        <text x="20" y="226" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">提示：若二级索引已「覆盖」所需列，则无需回表（覆盖索引）。</text>
      </svg>
    </Figure>
  )
}

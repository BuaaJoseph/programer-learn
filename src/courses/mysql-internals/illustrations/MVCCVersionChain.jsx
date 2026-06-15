import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 一行数据的 undo 版本链 + ReadView，演示不同事务「看到哪个版本」。
// 版本链（新 → 旧）：每个版本带创建它的 trx_id。
const VERSIONS = [
  { trx: 50, value: '余额=300', note: '最新：事务50修改，但50未提交' },
  { trx: 30, value: '余额=200', note: '事务30修改并已提交' },
  { trx: 10, value: '余额=100', note: '最初：事务10插入，已提交' },
]
// 不同观察者事务的 ReadView
const VIEWERS = [
  { id: 'A', trx: 60, active: [50], desc: '事务60：50还在活跃(未提交)，30已提交', sees: 30 },
  { id: 'B', trx: 55, active: [50, 55], desc: '事务55：只能看到自己之前已提交的，50不可见', sees: 30 },
  { id: 'C', trx: 50, active: [50], desc: '事务50：能看到自己刚改的版本', sees: 50 },
]

export default function MVCCVersionChain() {
  const [vi, setVi] = useState(0)
  const viewer = VIEWERS[vi]

  const controls = (
    <>
      {VIEWERS.map((v, i) => (
        <button key={v.id} className={`fig-btn ${vi === i ? 'active' : ''}`} onClick={() => setVi(i)}>
          事务 trx={v.trx}
        </button>
      ))}
      <span className="fig-note">看不同事务沿版本链找到哪个可见版本</span>
    </>
  )

  return (
    <Figure caption="每行藏着隐藏字段 trx_id 与回滚指针，串成一条 undo 版本链。事务读取时带上 ReadView（活跃事务快照），沿链找到「对自己可见」的那个版本——读不加锁、写不阻塞读。" controls={controls}>
      <svg viewBox="0 0 460 270" width="460" role="img" aria-label="MVCC 版本链与 ReadView">
        {/* ReadView 卡 */}
        <rect x="16" y="14" width="428" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="28" y="32" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="var(--accent-strong)">
          ReadView · 当前事务 trx_id = {viewer.trx}
        </text>
        <text x="28" y="50" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
          活跃(未提交)事务: [{viewer.active.join(', ')}] → 规则：trx_id 已提交且 ≤ 我可见
        </text>

        {/* 版本链 */}
        {VERSIONS.map((v, i) => {
          const visible = v.trx === viewer.sees
          const x = 30 + i * 145
          return (
            <g key={v.trx}>
              <rect x={x} y="84" width="120" height="64" rx="8"
                fill={visible ? 'var(--green)' : 'var(--bg-subtle)'} stroke={visible ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={visible ? 2.5 : 1} />
              <text x={x + 60} y="106" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={visible ? '#ffffff' : 'var(--ink)'}>
                trx_id={v.trx}
              </text>
              <text x={x + 60} y="126" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill={visible ? '#ffffff' : 'var(--ink-soft)'}>{v.value}</text>
              <text x={x + 60} y="142" textAnchor="middle" fontFamily="var(--sans)" fontSize="9" fill={visible ? '#ffffff' : 'var(--ink-faint)'}>
                {visible ? '✓ 对当前事务可见' : i === 0 ? '最新版本' : '历史版本'}
              </text>
              {i < VERSIONS.length - 1 && (
                <text x={x + 132} y="120" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fill="var(--ink-faint)">→</text>
              )}
            </g>
          )
        })}
        <text x="30" y="170" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">新版本（roll_pointer 指向旧版本）——————→ 旧版本（undo log 里）</text>

        {/* 结论 */}
        <rect x="16" y="188" width="428" height="46" rx="10" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="28" y="208" fontFamily="var(--sans)" fontSize="13" fontWeight="700" fill="var(--green)">
          {viewer.desc}
        </text>
        <text x="28" y="226" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">
          → 沿版本链向旧回溯，最终看到：trx_id={viewer.sees} 的版本（{VERSIONS.find((v) => v.trx === viewer.sees).value}）
        </text>
        <text x="16" y="256" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">
          RC 每次快照读都新建 ReadView；RR 只在首次快照读建一次 → 同一事务多次读结果一致。
        </text>
      </svg>
    </Figure>
  )
}

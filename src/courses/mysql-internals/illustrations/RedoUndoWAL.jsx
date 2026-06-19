import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// WAL：先写日志再写数据。逐步演示一次 UPDATE 的日志流程。
const STEPS = [
  { desc: 'UPDATE 到来：先记 undo log（旧值，用于回滚/MVCC）', hl: 'undo' },
  { desc: '在 Buffer Pool 中修改数据页 → 变成「脏页」', hl: 'buf' },
  { desc: '把变更写入 redo log（顺序追加，很快）', hl: 'redo' },
  { desc: 'COMMIT：redo log 落盘 → 提交成功（持久性达成）', hl: 'commit' },
  { desc: '稍后：后台线程把脏页「随机写」刷回磁盘数据文件', hl: 'flush' },
]

export default function RedoUndoWAL() {
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

  const box = (x, y, w, h, label, sub, active, color) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={active ? color : 'var(--bg-subtle)'} stroke={active ? color : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{label}</text>
      <text x={x + w / 2} y={y + 36} textAnchor="middle" fontFamily="var(--sans)" fontSize="10" fill={active ? '#ffffff' : 'var(--ink-faint)'}>{sub}</text>
    </g>
  )

  return (
    <Figure caption="WAL（Write-Ahead Logging）：先写日志、再慢慢写数据。redo log 顺序写、保证崩溃不丢已提交数据；undo log 记录旧值、支撑回滚与 MVCC。" controls={controls}>
      <svg viewBox="0 0 460 240" width="460" role="img" aria-label="redo undo 与 WAL">
        {/* 内存 */}
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">内存</text>
        {box(20, 32, 130, 46, 'undo log', '旧值·可回滚', on('undo'), 'var(--violet)')}
        {box(170, 32, 130, 46, 'Buffer Pool', on('buf') || step > 1 ? '脏页 dirty' : '数据页', on('buf'), 'var(--accent)')}
        {box(320, 32, 120, 46, 'redo buffer', '变更记录', on('redo'), 'var(--green)')}

        {/* 箭头 */}
        <path d="M150 55 L170 55" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#ru-a)" />
        <path d="M300 55 L320 55" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#ru-a)" />
        <defs>
          <marker id="ru-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
            <path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" />
          </marker>
        </defs>

        {/* 磁盘 */}
        <text x="20" y="128" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">磁盘</text>
        {box(170, 136, 130, 46, '数据文件', '.ibd 表空间', on('flush'), 'var(--accent-strong)')}
        {box(320, 136, 120, 46, 'redo log', 'ib_logfile', on('commit'), 'var(--green)')}

        {/* 落盘箭头 */}
        {on('commit') && (
          <g>
            <path d="M380 78 L380 136" stroke="var(--green)" strokeWidth="2.5" markerEnd="url(#ru-g)" />
            <text x="386" y="112" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">顺序写·快</text>
          </g>
        )}
        {on('flush') && (
          <g>
            <path d="M235 78 L235 136" stroke="var(--amber)" strokeWidth="2.5" strokeDasharray="4 3" markerEnd="url(#ru-am)" />
            <text x="100" y="112" fontFamily="var(--mono)" fontSize="9" fill="var(--amber)">随机写·慢·延后</text>
          </g>
        )}
        <defs>
          <marker id="ru-g" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--green)" /></marker>
          <marker id="ru-am" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--amber)" /></marker>
        </defs>

        <rect x="20" y="198" width="420" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="218" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

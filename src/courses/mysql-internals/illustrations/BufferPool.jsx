import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 演示一次读请求：先查 Buffer Pool，命中直接返回；未命中从磁盘加载到内存。
const STEPS = [
  { t: 'SQL 请求页 #17', hit: null, desc: '查询需要读取数据页 #17' },
  { t: '先看 Buffer Pool', hit: null, desc: 'InnoDB 先在内存的 Buffer Pool 里找这一页' },
  { t: '未命中（miss）', hit: false, desc: '内存里没有 → 触发一次磁盘 IO' },
  { t: '从磁盘加载到内存', hit: false, desc: '把页 #17 读进 Buffer Pool，放到 LRU 链表头部' },
  { t: '再次请求页 #17', hit: true, desc: '这次命中（hit）→ 直接从内存返回，无磁盘 IO' },
]

export default function BufferPool() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const inMem = step >= 3
  const hit = s.hit

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>
        下一步 ▸
      </button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步 · ${s.t}`}</span>
    </>
  )

  return (
    <Figure caption="数据在磁盘、计算在内存。读写都先经过 Buffer Pool：命中走内存，未命中才发生磁盘 IO。这就是它是 InnoDB 性能命门的原因。" controls={controls}>
      <svg viewBox="0 0 460 240" width="460" role="img" aria-label="Buffer Pool 缓存命中流程">
        {/* 内存区 */}
        <rect x="14" y="20" width="250" height="120" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="26" y="40" fontFamily="var(--mono)" fontSize="12" fill="var(--accent-strong)">内存 · Buffer Pool</text>
        {['#4', '#9', '#21'].map((p, i) => (
          <g key={p}>
            <rect x={28 + i * 56} y="56" width="48" height="40" rx="6" fill="#ffffff" stroke="var(--accent-line)" />
            <text x={52 + i * 56} y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink)">{p}</text>
          </g>
        ))}
        {inMem && (
          <g>
            <rect x="196" y="56" width="48" height="40" rx="6" fill="var(--accent)" />
            <text x="220" y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">#17</text>
          </g>
        )}
        <text x="26" y="124" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">LRU 链表（热页留在内存）</text>

        {/* 磁盘区 */}
        <rect x="300" y="20" width="146" height="120" rx="10" fill="var(--bg-sunken)" stroke="var(--border-strong)" />
        <text x="312" y="40" fontFamily="var(--mono)" fontSize="12" fill="var(--ink-soft)">磁盘 · 表空间</text>
        <ellipse cx="373" cy="86" rx="46" ry="30" fill="#ffffff" stroke="var(--border-strong)" />
        <text x="373" y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">页 #17</text>
        <text x="373" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">…数据…</text>

        {/* 箭头：磁盘 → 内存（加载） */}
        {step === 3 && (
          <g>
            <path d="M300 92 L250 80" stroke="var(--amber)" strokeWidth="2.5" markerEnd="url(#bp-arrow)" fill="none" />
            <text x="262" y="118" fontFamily="var(--mono)" fontSize="10" fill="var(--amber)">磁盘 IO 加载</text>
          </g>
        )}
        <defs>
          <marker id="bp-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--amber)" />
          </marker>
        </defs>

        {/* 状态条 */}
        <rect x="14" y="158" width="432" height="30" rx="7"
          fill={hit === true ? 'var(--green-soft)' : hit === false ? 'var(--amber-soft)' : 'var(--bg-subtle)'}
          stroke={hit === true ? 'var(--green-line)' : hit === false ? 'var(--amber-line)' : 'var(--border)'} />
        <text x="26" y="178" fontFamily="var(--mono)" fontSize="12"
          fill={hit === true ? 'var(--green)' : hit === false ? 'var(--amber)' : 'var(--ink-soft)'}>
          {hit === true ? '✓ 命中 HIT — 0 次磁盘 IO' : hit === false ? '✕ 未命中 MISS — 需要磁盘 IO' : '准备查询'}
        </text>
        <text x="14" y="212" fontFamily="var(--sans)" fontSize="13" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 对比三种结构在「存 100 万行」时的树高（≈磁盘 IO 次数）。
const VIEWS = {
  bst: { label: '二叉搜索树', height: '≈ 20 层', io: '最多 20 次 IO', note: '每个节点只存 1 个键，树又高又瘦，IO 次数爆炸' },
  btree: { label: 'B-Tree', height: '≈ 3~4 层', io: '3~4 次 IO', note: '一个节点存多个键、非叶也存数据，扇出大、树变矮' },
  bplus: { label: 'B+Tree', height: '≈ 3 层', io: '3 次 IO', note: '非叶只存键（扇出更大）、数据全在叶子且用链表相连，范围查询极快' },
}

function Node({ x, y, w, fill, text, sub }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="26" rx="5" fill={fill} stroke="var(--accent-line)" />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={sub ? '#ffffff' : 'var(--ink)'}>
        {text}
      </text>
    </g>
  )
}

export default function TreeCompare() {
  const [view, setView] = useState('bplus')
  const v = VIEWS[view]

  const controls = (
    <>
      {Object.entries(VIEWS).map(([k, val]) => (
        <button key={k} className={`fig-btn ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>
          {val.label}
        </button>
      ))}
      <span className="fig-note">{`100 万行 · ${v.height} · ${v.io}`}</span>
    </>
  )

  return (
    <Figure caption="索引结构的第一目标是「树尽量矮」，因为每下一层就多一次磁盘 IO。B+Tree 用大扇出把百万行压进 3 层，并让叶子用链表相连。" controls={controls}>
      <svg viewBox="0 0 460 230" width="460" role="img" aria-label="索引结构对比">
        {view === 'bst' && (
          <>
            {[0, 1, 2, 3].map((d) => (
              <Node key={d} x={210 - d * 12} y={20 + d * 34} w="40" fill="var(--accent-soft)" text={`${50 - d * 10}`} />
            ))}
            <text x="60" y="180" fontFamily="var(--sans)" fontSize="12" fill="var(--rose)">每层 1 个键 → 树高 ≈ log₂(N) ≈ 20 层</text>
          </>
        )}
        {view === 'btree' && (
          <>
            <Node x="190" y="20" w="80" fill="var(--accent)" text="30 | 60" sub />
            <Node x="70" y="90" w="80" fill="var(--accent-soft)" text="10 | 20" />
            <Node x="190" y="90" w="80" fill="var(--accent-soft)" text="40 | 50" />
            <Node x="310" y="90" w="80" fill="var(--accent-soft)" text="70 | 90" />
            <line x1="230" y1="46" x2="110" y2="90" stroke="var(--border-strong)" />
            <line x1="230" y1="46" x2="230" y2="90" stroke="var(--border-strong)" />
            <line x1="230" y1="46" x2="350" y2="90" stroke="var(--border-strong)" />
            <text x="60" y="170" fontFamily="var(--sans)" fontSize="12" fill="var(--ink-soft)">节点存多键、非叶也带数据 → 扇出大、树矮</text>
          </>
        )}
        {view === 'bplus' && (
          <>
            <Node x="190" y="20" w="80" fill="var(--accent)" text="30 | 60" sub />
            <Node x="70" y="86" w="80" fill="var(--accent-soft)" text="10 | 20" />
            <Node x="190" y="86" w="80" fill="var(--accent-soft)" text="40 | 50" />
            <Node x="310" y="86" w="80" fill="var(--accent-soft)" text="70 | 90" />
            <line x1="230" y1="46" x2="110" y2="86" stroke="var(--border-strong)" />
            <line x1="230" y1="46" x2="230" y2="86" stroke="var(--border-strong)" />
            <line x1="230" y1="46" x2="350" y2="86" stroke="var(--border-strong)" />
            {[0, 1, 2, 3].map((i) => (
              <Node key={i} x={28 + i * 108} y="150" w="92" fill="var(--green-soft)" text={`叶:数据`} />
            ))}
            {[0, 1, 2].map((i) => (
              <line key={i} x1={120 + i * 108} y1="163" x2={136 + i * 108} y2="163" stroke="var(--green)" strokeWidth="2" markerEnd="url(#tc-a)" />
            ))}
            <defs>
              <marker id="tc-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                <path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" />
              </marker>
            </defs>
            <text x="28" y="200" fontFamily="var(--sans)" fontSize="12" fill="var(--green)">数据全在叶子 + 叶子双向链表 → 范围查询顺序扫描</text>
          </>
        )}
      </svg>
    </Figure>
  )
}

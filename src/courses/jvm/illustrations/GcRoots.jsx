import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 可达性分析：从 GC Roots 出发能到达的存活，到不了的(含循环引用)是垃圾。
export default function GcRoots() {
  const [showGarbage, setShowGarbage] = useState(false)

  const controls = (
    <>
      <button className={`fig-btn ${!showGarbage ? 'active' : ''}`} onClick={() => setShowGarbage(false)}>引用关系</button>
      <button className={`fig-btn ${showGarbage ? 'active' : ''}`} onClick={() => setShowGarbage(true)}>标记垃圾</button>
      <span className="fig-note">从 GC Roots 走不到的就是垃圾</span>
    </>
  )

  // 节点：root, A,B(可达) ; C,D 互相引用但 root 到不了(垃圾)
  const nodes = [
    { id: 'root', x: 60, y: 100, label: 'GC Root', reach: true },
    { id: 'A', x: 180, y: 60, label: 'A', reach: true },
    { id: 'B', x: 180, y: 140, label: 'B', reach: true },
    { id: 'C', x: 330, y: 60, label: 'C', reach: false },
    { id: 'D', x: 330, y: 140, label: 'D', reach: false },
  ]
  const edges = [['root', 'A'], ['root', 'B'], ['A', 'B'], ['C', 'D'], ['D', 'C']]
  const pos = (id) => nodes.find((n) => n.id === id)

  return (
    <Figure caption="引用计数法解决不了「C、D 互相引用但没人用」的循环引用。JVM 用可达性分析：以 GC Roots(栈中引用、静态变量、常量、JNI 引用等)为起点，遍历不到的对象(如 C、D)就是垃圾。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="可达性分析">
        {edges.map(([a, b], i) => {
          const pa = pos(a), pb = pos(b)
          return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="var(--border-strong)" strokeWidth="1.5" markerEnd="url(#gr-a)" />
        })}
        <defs><marker id="gr-a" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
        {nodes.map((n) => {
          const garbage = showGarbage && !n.reach
          const isRoot = n.id === 'root'
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={isRoot ? 26 : 22}
                fill={isRoot ? 'var(--accent)' : garbage ? 'var(--rose-soft)' : 'var(--green-soft)'}
                stroke={isRoot ? 'var(--accent)' : garbage ? 'var(--rose)' : 'var(--green)'} strokeWidth={garbage ? 2 : 1.5} strokeDasharray={garbage ? '4 3' : '0'} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize={isRoot ? 9 : 12} fontWeight="700" fill={isRoot ? '#ffffff' : 'var(--ink)'}>{n.label}</text>
              {garbage && <text x={n.x} y={n.y + 38} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">垃圾</text>}
            </g>
          )
        })}
        {showGarbage && <text x="300" y="190" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">C、D 互相引用，但 GC Root 到不了 → 被回收</text>}
        {!showGarbage && <text x="20" y="190" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">GC Roots：栈帧本地变量、静态变量、常量、JNI 引用…</text>}
      </svg>
    </Figure>
  )
}

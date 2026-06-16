import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 虚拟地址 → 页表 → 物理地址；部分页在磁盘(缺页)。
const PAGES = [
  { v: 0, phys: 2, onDisk: false },
  { v: 1, phys: null, onDisk: true },
  { v: 2, phys: 0, onDisk: false },
  { v: 3, phys: 3, onDisk: false },
]

export default function VirtualMemory() {
  const [sel, setSel] = useState(0)
  const p = PAGES[sel]

  const controls = (
    <>
      {PAGES.map((x, i) => (
        <button key={i} className={`fig-btn ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>访问虚拟页 {i}</button>
      ))}
    </>
  )

  return (
    <Figure caption="虚拟内存让每个进程都以为独享一大块连续内存。MMU 通过页表把虚拟页号翻译成物理页框号；若该页不在内存(在磁盘上)就触发缺页中断，把它换入。访问虚拟页 1 看看缺页。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="虚拟内存与分页">
        {/* 虚拟地址空间 */}
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">进程虚拟页</text>
        {PAGES.map((x, i) => (
          <rect key={i} x="20" y={30 + i * 30} width="70" height="26" rx="4" fill={sel === i ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-line)" />
        ))}
        {PAGES.map((x, i) => <text key={i} x="55" y={47 + i * 30} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill={sel === i ? '#ffffff' : 'var(--ink)'}>V{i}</text>)}

        {/* 页表 */}
        <text x="160" y="24" fontFamily="var(--mono)" fontSize="9" fill="var(--violet)">页表</text>
        {PAGES.map((x, i) => (
          <g key={i}>
            <rect x="150" y={30 + i * 30} width="120" height="26" rx="4" fill={sel === i ? 'var(--violet)' : '#f0eafb'} stroke="#ddd0f2" />
            <text x="160" y={47 + i * 30} fontFamily="var(--mono)" fontSize="9" fill={sel === i ? '#ffffff' : 'var(--ink)'}>V{i} → {x.onDisk ? '磁盘(缺页)' : 'P' + x.phys}</text>
          </g>
        ))}
        <line x1="90" y1={43 + sel * 30} x2="150" y2={43 + sel * 30} stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#vm-a)" />

        {/* 物理内存 */}
        <text x="340" y="24" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">物理内存</text>
        {[0, 1, 2, 3].map((f) => {
          const here = !p.onDisk && p.phys === f
          return <g key={f}>
            <rect x="330" y={30 + f * 30} width="70" height="26" rx="4" fill={here ? 'var(--green)' : 'var(--bg-subtle)'} stroke={here ? 'var(--green)' : 'var(--border-strong)'} />
            <text x="365" y={47 + f * 30} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={here ? '#ffffff' : 'var(--ink-faint)'}>P{f}</text>
          </g>
        })}
        {!p.onDisk && <line x1="270" y1={43 + sel * 30} x2="330" y2={43 + p.phys * 30} stroke="var(--green)" strokeWidth="1.6" markerEnd="url(#vm-b)" />}
        <defs>
          <marker id="vm-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="vm-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker>
        </defs>

        <rect x="20" y="160" width="420" height="0" fill="none" />
        <text x="20" y="176" fontFamily="var(--sans)" fontSize="11.5" fill={p.onDisk ? 'var(--rose)' : 'var(--ink)'}>
          {p.onDisk ? '虚拟页 1 不在内存 → 缺页中断(page fault)：OS 从磁盘换入，可能先换出别的页。' : `虚拟页 ${sel} 命中物理页框 P${p.phys}，MMU 直接翻译，无需磁盘 IO。`}
        </text>
      </svg>
    </Figure>
  )
}

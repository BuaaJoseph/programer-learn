import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const ALGOS = {
  sweep: { label: '标记-清除', desc: '标记垃圾后直接清除。简单，但留下大量内存碎片，大对象可能没连续空间。' },
  copy: { label: '复制', desc: '内存分两半，存活对象复制到另一半再整体清空。无碎片、快，但浪费一半空间——适合存活率低的新生代。' },
  compact: { label: '标记-整理', desc: '标记后把存活对象向一端移动、清理边界外。无碎片、不浪费空间，但移动对象有成本——适合老年代。' },
}

export default function GcAlgorithms() {
  const [k, setK] = useState('copy')
  const a = ALGOS[k]
  // 内存格：1=存活,0=垃圾,空
  const before = [1, 0, 1, 0, 0, 1, 0, 1]
  const after = {
    sweep: [1, null, 1, null, null, 1, null, 1],
    copy: [1, 1, 1, 1, null, null, null, null],
    compact: [1, 1, 1, 1, null, null, null, null],
  }[k]

  const controls = (
    <>
      {Object.entries(ALGOS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  const cell = (val, x, y) => (
    <rect x={x} y={y} width="42" height="28" rx="4"
      fill={val === 1 ? 'var(--green)' : val === 0 ? 'var(--rose-soft)' : 'var(--bg-sunken)'}
      stroke={val === 1 ? 'var(--green)' : val === 0 ? 'var(--rose-line)' : 'var(--border-strong)'}
      strokeDasharray={val === null ? '3 2' : '0'} />
  )

  return (
    <Figure caption="三种基础回收算法。分代收集就是「按对象寿命分区、各用所长」：新生代存活率低用复制、老年代存活率高用标记-整理。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="GC 算法">
        <text x="20" y="40" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">回收前（绿=存活，红=垃圾）</text>
        {before.map((v, i) => <g key={i}>{cell(v, 20 + i * 50, 46)}</g>)}

        <text x="20" y="104" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">回收后</text>
        {after.map((v, i) => <g key={i}>{cell(v, 20 + i * 50, 110)}</g>)}
        {k === 'sweep' && <text x="20" y="156" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">↑ 存活对象间留下空洞 = 碎片</text>}
        {k !== 'sweep' && <text x="20" y="156" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">↑ 存活对象紧凑排列，无碎片</text>}

        <rect x="20" y="164" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="166" width="404" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}><strong style={{ color: 'var(--accent-strong)' }}>{a.label}：</strong>{a.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

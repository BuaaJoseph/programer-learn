import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

export default function Chm() {
  const [v, setV] = useState('18')

  const controls = (
    <>
      <button className={`fig-btn ${v === '17' ? 'active' : ''}`} onClick={() => setV('17')}>JDK 1.7 分段锁</button>
      <button className={`fig-btn ${v === '18' ? 'active' : ''}`} onClick={() => setV('18')}>JDK 1.8 CAS+synchronized</button>
      <span className="fig-note">{v === '17' ? '并发度 = Segment 个数(默认16)' : '锁粒度细到单个桶'}</span>
    </>
  )

  return (
    <Figure caption="ConcurrentHashMap 用「分段锁」思想做到比 Hashtable(锁整个表)高得多的并发。1.7 用 Segment 分段、并发度固定;1.8 抛弃 Segment，改用 CAS + synchronized 只锁单个桶头节点，并引入红黑树,并发度更高。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ConcurrentHashMap 1.7 vs 1.8">
        {v === '17' ? (
          <>
            <text x="20" y="28" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">Segment[] (每段一把 ReentrantLock)</text>
            {[0, 1, 2].map((seg) => (
              <g key={seg}>
                <rect x={20 + seg * 145} y="38" width="130" height="100" rx="9" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x={85 + seg * 145} y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--accent-strong)">Segment {seg} 🔒</text>
                {[0, 1].map((b) => (
                  <g key={b}>
                    <rect x={32 + seg * 145} y={66 + b * 32} width="106" height="24" rx="5" fill="#ffffff" stroke="var(--accent-line)" />
                    <text x={40 + seg * 145} y={82 + b * 32} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">bucket → 链表</text>
                  </g>
                ))}
              </g>
            ))}
            <text x="20" y="158" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">同一段内串行、不同段可并发；并发度上限 = 段数(默认 16)，初始化后不可变。</text>
          </>
        ) : (
          <>
            <text x="20" y="28" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">Node[] table（锁粒度 = 单个桶的头节点）</text>
            {[0, 1, 2, 3, 4, 5].map((b) => (
              <g key={b}>
                <rect x={20 + b * 70} y="40" width="60" height="30" rx="6" fill={b === 2 ? 'var(--accent)' : 'var(--bg-subtle)'} stroke={b === 2 ? 'var(--accent-strong)' : 'var(--border-strong)'} />
                <text x={50 + b * 70} y="59" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={b === 2 ? '#ffffff' : 'var(--ink)'}>{b === 2 ? 'bucket🔒' : 'bucket'}</text>
              </g>
            ))}
            <text x="20" y="92" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">空桶用 CAS 放入(无锁)；非空桶只 synchronized 锁该桶头节点</text>
            <text x="20" y="110" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">链表过长(≥8 且容量≥64) → 转红黑树，查询从 O(n) 到 O(log n)</text>
            <text x="20" y="158" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">锁粒度细到「每个桶」，不同桶完全并发；并发度随容量增长，远高于 1.7。</text>
          </>
        )}
        <rect x="20" y="170" width="420" height="0" fill="none" />
      </svg>
    </Figure>
  )
}

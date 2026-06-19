import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

export default function ToolDispatch() {
  const [mode, setMode] = useState('read')
  const parallel = mode === 'read'

  const controls = (
    <>
      <button className={`fig-btn ${mode === 'read' ? 'active' : ''}`} onClick={() => setMode('read')}>只读工具(并行)</button>
      <button className={`fig-btn ${mode === 'write' ? 'active' : ''}`} onClick={() => setMode('write')}>写工具(串行)</button>
      <span className="fig-note">{parallel ? '互不影响 → 可并发' : '会改状态 → 必须串行'}</span>
    </>
  )

  const reads = ['Read a.js', 'Grep "foo"', 'Glob **/*.ts']
  const writes = ['Edit a.js', 'Edit b.js', 'Bash(mv)']

  return (
    <Figure caption="模型只生成「工具调用意图」，由 harness 调度执行、再把结果回灌。关键调度规则：只读工具(Read/Grep/Glob)互不影响可并行加速；会改状态的写工具(Edit/Bash)必须串行，保证一致性。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="工具调度：并行与串行">
        <rect x="20" y="76" width="90" height="40" rx="8" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="65" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--violet)">模型意图</text>

        {parallel ? (
          reads.map((t, i) => (
            <g key={i}>
              <line x1="110" y1="96" x2="180" y2={40 + i * 56} stroke="var(--green)" strokeWidth="1.6" markerEnd="url(#td-a)" />
              <rect x="180" y={26 + i * 56} width="180" height="30" rx="6" fill="var(--green-soft)" stroke="var(--green-line)" />
              <text x="192" y={45 + i * 56} fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">{t}</text>
              <text x="368" y={45 + i * 56} fontFamily="var(--mono)" fontSize="9" fill="var(--green)">同时</text>
            </g>
          ))
        ) : (
          writes.map((t, i) => (
            <g key={i}>
              <rect x={150 + i * 100} y="76" width="92" height="34" rx="6" fill="var(--rose-soft)" stroke="var(--rose-line)" />
              <text x={196 + i * 100} y="97" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{t}</text>
              {i < 2 && <line x1={242 + i * 100} y1="93" x2={250 + i * 100} y2="93" stroke="var(--rose)" strokeWidth="2" markerEnd="url(#td-r)" />}
            </g>
          ))
        )}
        <defs>
          <marker id="td-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker>
          <marker id="td-r" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker>
        </defs>

        <rect x="20" y="150" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="170" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">
          {parallel ? '三个只读调用并发发出、一起返回，省时间；结果一并回灌给模型。' : '写操作一个接一个执行，前一个改完才做下一个，避免互相覆盖/冲突。'}
        </text>
      </svg>
    </Figure>
  )
}

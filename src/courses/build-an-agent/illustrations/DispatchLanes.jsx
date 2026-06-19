import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// forge 工具调度：一轮里模型点名了好几个工具，forge 按 readOnly 分两条道——只读并行、写串行。
export default function DispatchLanes() {
  const [mode, setMode] = useState('mixed')

  const controls = (
    <>
      <button className={`fig-btn ${mode === 'mixed' ? 'active' : ''}`} onClick={() => setMode('mixed')}>混合一轮</button>
      <button className={`fig-btn ${mode === 'read' ? 'active' : ''}`} onClick={() => setMode('read')}>只读并行</button>
      <button className={`fig-btn ${mode === 'write' ? 'active' : ''}`} onClick={() => setMode('write')}>写串行</button>
    </>
  )

  const reads = ['read a.ts', 'grep "foo"', 'glob **/*.ts']
  const writes = ['edit a.ts', 'bash(npm test)']

  const showRead = mode !== 'write'
  const showWrite = mode !== 'read'

  return (
    <Figure caption="模型一轮里可能点名多个工具。forge 按工具的 readOnly 标记分流：只读工具（read/list/glob/grep）互不影响，用 Promise.all 并发执行、一起返回；写工具（write/edit/bash）会改状态，必须一个接一个串行，避免互相覆盖。最后按模型原始调用顺序把 tool_result 排好回灌。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="forge 工具调度：并行只读、串行写">
        <rect x="18" y="80" width="78" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="57" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fill="var(--accent-strong)">一轮回复</text>
        <text x="57" y="111" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-soft)">tool_use × N</text>

        {showRead && (
          <>
            <text x="120" y="34" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">只读道 · Promise.all 并发</text>
            {reads.map((t, i) => (
              <g key={i}>
                <line x1="96" y1="96" x2="150" y2={48 + i * 26} stroke="var(--green)" strokeWidth="1.4" markerEnd="url(#dl-g)" />
                <rect x="150" y={36 + i * 26} width="150" height="22" rx="6" fill="var(--green-soft)" stroke="var(--green-line)" />
                <text x="160" y={51 + i * 26} fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{t}</text>
                <text x="308" y={51 + i * 26} fontFamily="var(--mono)" fontSize="8" fill="var(--green)">同时</text>
              </g>
            ))}
          </>
        )}

        {showWrite && (
          <>
            <text x="120" y={showRead ? 130 : 60} fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">写道 · for 串行</text>
            {writes.map((t, i) => {
              const y = (showRead ? 138 : 68) + 0
              return (
                <g key={i}>
                  <rect x={150 + i * 130} y={y} width="118" height="24" rx="6" fill="var(--rose-soft)" stroke="var(--rose-line)" />
                  <text x={160 + i * 130} y={y + 16} fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{t}</text>
                  {i < writes.length - 1 && <line x1={268 + i * 130} y1={y + 12} x2={280 + i * 130} y2={y + 12} stroke="var(--rose)" strokeWidth="2" markerEnd="url(#dl-r)" />}
                </g>
              )
            })}
            {showRead && <line x1="96" y1="104" x2="150" y2="150" stroke="var(--rose)" strokeWidth="1.4" markerEnd="url(#dl-r)" />}
          </>
        )}

        <defs>
          <marker id="dl-g" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker>
          <marker id="dl-r" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker>
        </defs>

        <rect x="18" y="176" width="424" height="28" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="30" y="194" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">
          {mode === 'read' ? '三个只读调用并发发出、一起回来，省时间。' : mode === 'write' ? '写操作前一个改完才做下一个，避免互相覆盖。' : '同一轮里：只读的并行、写的串行，最后按原顺序回灌。'}
        </text>
      </svg>
    </Figure>
  )
}

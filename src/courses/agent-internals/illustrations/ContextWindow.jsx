import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 上下文构成 + 随轮数增长到 ~92% 触发自动压缩。
const PARTS = [
  { name: 'system prompt', c: 'var(--ink-soft)', base: 8 },
  { name: '工具定义', c: 'var(--violet)', base: 6 },
  { name: 'CLAUDE.md', c: 'var(--amber)', base: 4 },
  { name: '对话历史', c: 'var(--accent)', base: 10 },
  { name: '工具结果/文件', c: 'var(--green)', base: 12 },
]

export default function ContextWindow() {
  const [round, setRound] = useState(1)
  // 历史与工具结果随轮数增长
  const grow = round * 9
  const segs = PARTS.map((p, i) => ({ ...p, size: p.base + (i >= 3 ? grow : 0) }))
  const total = segs.reduce((s, x) => s + x.size, 0)
  const pct = Math.min(100, Math.round(total))
  const compact = pct >= 92

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setRound((v) => Math.min(v + 1, 9))}>多跑几轮 ▸</button>
      <button className="fig-btn" onClick={() => setRound(1)}>重置</button>
      <span className="fig-note">{compact ? '≈92% → 触发自动压缩' : `已用 ${pct}%`}</span>
    </>
  )

  // 压缩后：历史被摘要、旧工具结果被清
  const display = compact
    ? PARTS.map((p, i) => ({ ...p, size: i === 3 ? 14 : i === 4 ? 6 : p.base }))
    : segs

  let x = 20
  return (
    <Figure caption="上下文窗口装着 system prompt、工具定义、CLAUDE.md、对话历史、工具结果等。它是有限资源——随着轮数增加越塞越满，约 92% 时 Agent 自动压缩：把旧历史摘要、清理旧工具输出，给新内容腾地方。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="上下文窗口与压缩">
        <text x="20" y="30" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">上下文窗口（200K tokens）· 第 {round} 轮</text>
        <rect x="20" y="40" width="420" height="40" rx="6" fill="var(--bg-sunken)" stroke="var(--border-strong)" />
        {display.map((p, i) => {
          const w = (p.size / 100) * 420
          const seg = <rect key={i} x={x} y="40" width={w} height="40" fill={p.c} stroke="#ffffff" strokeWidth="0.5" />
          x += w
          return seg
        })}
        {/* 92% 线 */}
        <line x1={20 + 0.92 * 420} y1="34" x2={20 + 0.92 * 420} y2="86" stroke="var(--rose)" strokeWidth="2" strokeDasharray="3 2" />
        <text x={20 + 0.92 * 420 - 4} y="32" textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">92%</text>

        {/* 图例 */}
        {PARTS.map((p, i) => (
          <g key={i}>
            <rect x={20 + (i % 3) * 150} y={98 + Math.floor(i / 3) * 20} width="12" height="12" rx="2" fill={p.c} />
            <text x={36 + (i % 3) * 150} y={108 + Math.floor(i / 3) * 20} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">{p.name}</text>
          </g>
        ))}

        <rect x="20" y="150" width="420" height="40" rx="8" fill={compact ? 'var(--amber-soft)' : 'var(--bg-subtle)'} stroke={compact ? 'var(--amber-line)' : 'var(--border)'} />
        <foreignObject x="28" y="154" width="404" height="34">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>
            {compact
              ? '已触发自动压缩(compaction)：用一个子代理+轻量模型把旧对话总结成结构化摘要、清掉旧工具输出。CLAUDE.md 会被重新注入，但早期细节可能丢失——所以持久规则要写进 CLAUDE.md。'
              : '历史和工具结果随每轮增长，是占用上下文最快的两块；这也是为什么要做上下文工程(按需检索、子代理隔离)。'}
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

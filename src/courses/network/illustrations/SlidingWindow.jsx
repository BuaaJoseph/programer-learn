import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 滑动窗口：窗口内可连续发送多个未确认的段，收到 ACK 后窗口右移。
const TOTAL = 10
const WIN = 4

export default function SlidingWindow() {
  const [acked, setAcked] = useState(0) // 已确认到第几个

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setAcked((v) => Math.min(v + 1, TOTAL - WIN))}>收到一个 ACK ▸</button>
      <button className="fig-btn" onClick={() => setAcked(0)}>重来</button>
      <span className="fig-note">窗口大小 = {WIN}（可同时在途的未确认段）</span>
    </>
  )

  return (
    <Figure caption="TCP 靠序号+确认+超时重传保证可靠。但「发一个等一个 ACK」太慢，于是用滑动窗口：窗口内的多个段可连续发出、无需逐个等待；收到 ACK 后窗口右移，实现高效流水线。窗口大小由接收方通告(流量控制)。" controls={controls}>
      <svg viewBox="0 0 460 170" width="460" role="img" aria-label="TCP 滑动窗口">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const isAcked = i < acked
          const inWindow = i >= acked && i < acked + WIN
          return (
            <g key={i}>
              <rect x={20 + i * 42} y="60" width="38" height="34" rx="5"
                fill={isAcked ? 'var(--green)' : inWindow ? 'var(--accent)' : 'var(--bg-sunken)'}
                stroke={isAcked ? 'var(--green)' : inWindow ? 'var(--accent-strong)' : 'var(--border-strong)'} />
              <text x={39 + i * 42} y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={isAcked || inWindow ? '#ffffff' : 'var(--ink-faint)'}>{i + 1}</text>
            </g>
          )
        })}
        {/* 窗口框 */}
        <rect x={18 + acked * 42} y="54" width={WIN * 42} height="46" rx="6" fill="none" stroke="var(--accent-strong)" strokeWidth="2" strokeDasharray="5 3" />
        <text x={18 + acked * 42} y="48" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">发送窗口(可连续发)</text>

        <g>
          <rect x="20" y="118" width="14" height="14" rx="3" fill="var(--green)" /><text x="40" y="130" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">已确认</text>
          <rect x="120" y="118" width="14" height="14" rx="3" fill="var(--accent)" /><text x="140" y="130" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">已发送待确认</text>
          <rect x="280" y="118" width="14" height="14" rx="3" fill="var(--bg-sunken)" stroke="var(--border-strong)" /><text x="300" y="130" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">不可发(窗口外)</text>
        </g>
        <text x="20" y="156" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">已确认 {acked} 个，窗口滑到第 {acked + 1}~{acked + WIN} 段。累积确认 + 选择重传(SACK)处理丢包。</text>
      </svg>
    </Figure>
  )
}

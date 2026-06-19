import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 对比「差/好」description 在不同用户提问下能否被触发。
const VARIANTS = {
  bad: {
    label: '差的写法',
    text: 'Helps with documents.',
    triggers: { '把这份 PDF 的表格提取出来': false, '帮我读一下这个 pdf': false, '随便聊聊': false },
    note: '太笼统、没有触发条件和关键词 → Claude 不确定何时该用，经常不触发',
  },
  good: {
    label: '好的写法',
    text: 'Process and extract content from PDF files. Use when the user asks to read a PDF, extract text or tables from PDFs, merge or split PDFs.',
    triggers: { '把这份 PDF 的表格提取出来': true, '帮我读一下这个 pdf': true, '随便聊聊': false },
    note: '有明确用途 + 触发条件 + 关键词(PDF/extract/tables) → 该触发时触发、无关时不打扰',
  },
}

export default function DescriptionQuality() {
  const [v, setV] = useState('good')
  const variant = VARIANTS[v]

  const controls = (
    <>
      <button className={`fig-btn ${v === 'bad' ? 'active' : ''}`} onClick={() => setV('bad')}>差的 description</button>
      <button className={`fig-btn ${v === 'good' ? 'active' : ''}`} onClick={() => setV('good')}>好的 description</button>
      <span className="fig-note">看同样的提问，能不能正确触发</span>
    </>
  )

  return (
    <Figure caption="description 是 Skill 能不能被用起来的关键。它不是功能介绍，而是「触发说明书」：写清用途 + 何时使用 + 关键词。对比下面两种写法在相同提问下的触发结果。" controls={controls}>
      <svg viewBox="0 0 460 220" width="460" role="img" aria-label="description 质量对比">
        {/* description 文本框 */}
        <rect x="20" y="16" width="420" height="50" rx="8" fill="var(--bg-code)" stroke="#2c3252" />
        <text x="30" y="33" fontFamily="var(--mono)" fontSize="10" fill="#6b7394">description:</text>
        <foreignObject x="30" y="36" width="400" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--mono)', color: '#7ee0a8', lineHeight: 1.3 }}>{variant.text}</div>
        </foreignObject>

        {/* 触发测试 */}
        <text x="20" y="88" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">用户这样问时，会不会触发？</text>
        {Object.entries(variant.triggers).map(([q, ok], i) => (
          <g key={q}>
            <rect x="20" y={98 + i * 30} width="320" height="24" rx="6" fill="var(--bg-subtle)" stroke="var(--border)" />
            <text x="30" y={114 + i * 30} fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{q}</text>
            <rect x="350" y={98 + i * 30} width="90" height="24" rx="6" fill={ok ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={ok ? 'var(--green-line)' : 'var(--border-strong)'} />
            <text x="395" y={114 + i * 30} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={ok ? 'var(--green)' : 'var(--ink-faint)'}>{ok ? '✓ 触发' : '✕ 不触发'}</text>
          </g>
        ))}

        <rect x="20" y="192" width="420" height="24" rx="6" fill={v === 'good' ? 'var(--green-soft)' : 'var(--amber-soft)'} stroke={v === 'good' ? 'var(--green-line)' : 'var(--amber-line)'} />
        <foreignObject x="28" y="194" width="404" height="22">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: v === 'good' ? 'var(--green)' : 'var(--amber)' }}>{variant.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

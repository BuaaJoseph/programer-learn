import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 队列与其绑定键
const QUEUES = [
  { name: 'Q1', bind: 'order.create' },
  { name: 'Q2', bind: 'order.*' },
  { name: 'Q3', bind: 'order.#' },
  { name: 'Q4', bind: 'pay.success' },
]
const TYPES = {
  direct: { label: 'direct（精确匹配）', desc: 'routing key 与绑定键完全相等才路由' },
  fanout: { label: 'fanout（广播）', desc: '忽略 routing key，投给所有绑定队列' },
  topic: { label: 'topic（模式匹配）', desc: '* 匹配一个单词，# 匹配零或多个单词' },
}
const RKS = ['order.create', 'order.pay.ok', 'pay.success']

function matches(type, rk, bind) {
  if (type === 'fanout') return true
  if (type === 'direct') return rk === bind
  // topic
  const re = '^' + bind.split('.').map((p) => (p === '*' ? '[^.]+' : p === '#' ? '.*' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('\\.') + '$'
  return new RegExp(re).test(rk)
}

export default function ExchangeRouting() {
  const [type, setType] = useState('topic')
  const [rk, setRk] = useState('order.create')
  const t = TYPES[type]

  const controls = (
    <>
      {Object.entries(TYPES).map(([k, v]) => (
        <button key={k} className={`fig-btn ${type === k ? 'active' : ''}`} onClick={() => setType(k)}>{v.label.split('（')[0]}</button>
      ))}
      {RKS.map((r) => (
        <button key={r} className={`fig-btn ${rk === r ? 'active' : ''}`} onClick={() => setRk(r)}>rk={r}</button>
      ))}
    </>
  )

  return (
    <Figure caption="选不同 Exchange 类型与 routing key，看消息被路由到哪些队列。direct 要精确相等，fanout 全发，topic 用 * 和 # 做模式匹配。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Exchange 路由">
        <rect x="16" y="78" width="96" height="44" rx="8" fill="var(--accent)" />
        <text x="64" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{type}</text>
        <text x="64" y="113" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">exchange</text>
        <text x="16" y="68" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">rk = {rk}</text>

        {QUEUES.map((q, i) => {
          const hit = matches(type, rk, q.bind)
          const y = 22 + i * 42
          return (
            <g key={q.name}>
              <line x1="112" y1="100" x2="280" y2={y + 15} stroke={hit ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={hit ? 2.5 : 1} strokeDasharray={hit ? '0' : '4 3'} />
              <rect x="280" y={y} width="170" height="30" rx="6" fill={hit ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={hit ? 'var(--green)' : 'var(--border)'} />
              <text x="290" y={y + 19} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--ink)">{q.name}</text>
              <text x="318" y={y + 19} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">bind: {q.bind}</text>
              <text x="436" y={y + 19} textAnchor="end" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={hit ? 'var(--green)' : 'var(--ink-faint)'}>{hit ? '✓' : '✕'}</text>
            </g>
          )
        })}

        <rect x="16" y="172" width="434" height="22" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="26" y="187" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">{t.desc}</text>
      </svg>
    </Figure>
  )
}

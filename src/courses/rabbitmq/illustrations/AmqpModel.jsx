import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '生产者把消息发给交换机(exchange)，并带上一个 routing key', on: ['p', 'x'] },
  { desc: '交换机按绑定(binding)规则，决定把消息投到哪些队列', on: ['x', 'b'] },
  { desc: '消息进入匹配到的队列(queue)排队等待', on: ['q'] },
  { desc: '消费者从队列取消息，处理完返回 ack', on: ['q', 'c'] },
]

export default function AmqpModel() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const on = (k) => s.on.includes(k)

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const box = (k, x, y, w, h, label, color) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={on(k) ? color : 'var(--bg-subtle)'} stroke={on(k) ? color : 'var(--border-strong)'} strokeWidth={on(k) ? 2 : 1} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={on(k) ? '#ffffff' : 'var(--ink)'}>{label}</text>
    </g>
  )

  return (
    <Figure caption="AMQP 的精髓：生产者只管发给交换机、不知道消费者是谁；交换机靠绑定规则路由到队列。生产与消费彻底解耦。点「下一步」走一遍。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="AMQP 模型">
        {box('p', 16, 60, 70, 40, 'producer', 'var(--amber)')}
        {box('x', 120, 60, 70, 40, 'exchange', 'var(--accent)')}
        {box('q', 250, 60, 70, 40, 'queue', 'var(--violet)')}
        {box('c', 360, 60, 80, 40, 'consumer', 'var(--green)')}

        <line x1="86" y1="80" x2="120" y2="80" stroke={on('x') ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth="1.6" markerEnd="url(#am-a)" />
        <line x1="190" y1="80" x2="250" y2="80" stroke={on('b') ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={on('b') ? 2.5 : 1.6} markerEnd="url(#am-a)" />
        <line x1="320" y1="80" x2="360" y2="80" stroke={on('c') ? 'var(--green)' : 'var(--border-strong)'} strokeWidth="1.6" markerEnd="url(#am-a)" />
        <text x="220" y="74" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={on('b') ? 'var(--accent-strong)' : 'var(--ink-faint)'}>binding</text>
        <defs><marker id="am-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="16" y="130" width="424" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="28" y="151" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

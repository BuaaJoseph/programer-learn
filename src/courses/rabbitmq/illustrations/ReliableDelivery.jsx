import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 三道防线：生产者 confirm / broker 持久化 / 消费者手动 ack。点开关模拟某一环失效。
const STAGES = [
  { key: 'confirm', name: '生产者确认', ok: 'publisher confirm 收到 broker 应答，确认发达', bad: '没开 confirm：网络丢了也以为成功 → 丢消息' },
  { key: 'persist', name: '持久化', ok: '队列与消息都持久化到磁盘，broker 重启不丢', bad: '没持久化：broker 一重启，内存里的消息全没 → 丢消息' },
  { key: 'ack', name: '消费者 ack', ok: '处理成功才手动 ack，broker 才删除消息', bad: '自动 ack：刚拿到就被标记完成，消费中崩溃 → 丢消息' },
]

export default function ReliableDelivery() {
  const [fail, setFail] = useState(null)

  const controls = (
    <>
      {STAGES.map((s) => (
        <button key={s.key} className={`fig-btn ${fail === s.key ? 'active' : ''}`} onClick={() => setFail(fail === s.key ? null : s.key)}>
          {fail === s.key ? `✓ ${s.name}失效` : `让${s.name}失效`}
        </button>
      ))}
      <span className="fig-note">{fail ? '这一环失效 → 消息丢失' : '三道防线齐全 → 不丢'}</span>
    </>
  )

  return (
    <Figure caption="一条消息从生产到消费要过三关：发到 broker(生产者确认)、存到磁盘(持久化)、被成功消费(手动 ack)。任一关失守都会丢消息。点按钮模拟某环失效。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="消息可靠投递三道防线">
        {STAGES.map((s, i) => {
          const broken = fail === s.key
          const x = 20 + i * 150
          return (
            <g key={s.key}>
              <rect x={x} y="30" width="120" height="60" rx="10" fill={broken ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={broken ? 'var(--rose)' : 'var(--green-line)'} strokeWidth={broken ? 2 : 1} />
              <circle cx={x + 60} cy="50" r="12" fill={broken ? 'var(--rose)' : 'var(--green)'} />
              <text x={x + 60} y="55" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="#ffffff">{broken ? '✕' : '✓'}</text>
              <text x={x + 60} y="80" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fontWeight="600" fill="var(--ink)">{s.name}</text>
              {i < 2 && <text x={x + 132} y="64" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fill="var(--ink-faint)">▸</text>}
            </g>
          )
        })}

        <rect x="20" y="110" width="420" height="76" rx="10" fill={fail ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={fail ? 'var(--rose-line)' : 'var(--green-line)'} />
        <text x="34" y="132" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={fail ? 'var(--rose)' : 'var(--green)'}>
          {fail ? '✕ 消息可能丢失' : '✓ 消息不丢'}
        </text>
        {STAGES.map((s, i) => (
          <text key={s.key} x="34" y={150 + i * 13} fontFamily="var(--sans)" fontSize="10.5" fill="var(--ink-soft)">
            · {s.name}：{fail === s.key ? s.bad : s.ok}
          </text>
        ))}
      </svg>
    </Figure>
  )
}

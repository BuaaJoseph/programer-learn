import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 同一条消息因重试被投递两次，幂等表拦下第二次。
const STEPS = [
  { desc: '消息(msgId=1001)第一次到达，消费者处理', dup: false, blocked: false },
  { desc: 'ack 在网络中丢失，broker 以为没消费成功 → 重投', dup: true, blocked: false },
  { desc: '同一条消息(msgId=1001)第二次到达', dup: true, blocked: false },
  { desc: '消费前先查幂等表：1001 已处理过 → 直接跳过', dup: true, blocked: true },
]

export default function Idempotent() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="只要有重试，就一定有重复消费(ack 丢失、超时重投都会导致)。解决之道不是消灭重复，而是让消费幂等——这里用「幂等表/去重 key」拦住已处理的消息。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="重复消费与幂等">
        {/* 消息 */}
        <rect x="20" y="36" width="90" height="40" rx="8" fill={s.dup ? 'var(--amber)' : 'var(--accent)'} />
        <text x="65" y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">msg 1001</text>
        <text x="65" y="70" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">{s.dup ? '重投' : '首次'}</text>

        {/* 幂等表 */}
        <rect x="160" y="28" width="120" height="56" rx="10" fill="var(--violet)" fillOpacity="0.12" stroke="var(--violet)" />
        <text x="220" y="46" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--violet)">幂等表 / 去重</text>
        <text x="220" y="64" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--ink)">{step >= 1 ? '1001 ✓' : '(空)'}</text>
        <text x="220" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">SETNX / 唯一索引</text>
        <line x1="110" y1="56" x2="160" y2="56" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#id-a)" />

        {/* 消费者/业务 */}
        <rect x="330" y="36" width="110" height="40" rx="8" fill={s.blocked ? 'var(--bg-sunken)' : 'var(--green-soft)'} stroke={s.blocked ? 'var(--border-strong)' : 'var(--green-line)'} />
        <text x="385" y="60" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill={s.blocked ? 'var(--ink-faint)' : 'var(--green)'}>{s.blocked ? '跳过(不执行)' : '执行业务'}</text>
        <line x1="280" y1="56" x2="330" y2="56" stroke={s.blocked ? 'var(--rose)' : 'var(--green)'} strokeWidth="1.8" markerEnd="url(#id-a)" />
        {s.blocked && <text x="305" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">拦截</text>}
        <defs><marker id="id-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="120" width="420" height="30" rx="7" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="139" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
        <text x="20" y="172" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">常用去重键：业务唯一 ID / 全局消息 ID；存唯一索引或 Redis SETNX。</text>
      </svg>
    </Figure>
  )
}

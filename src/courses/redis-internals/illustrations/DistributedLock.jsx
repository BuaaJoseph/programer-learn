import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 两个客户端抢锁：SET NX EX 谁先成功谁持有；看门狗续期；Lua 校验后释放。
const STEPS = [
  { desc: 'A、B 同时执行 SET lock uuidA NX EX 30 抢锁', who: null, key: '空' },
  { desc: 'A 成功（NX 保证只有一个能设置成功），B 失败需重试', who: 'A', key: 'uuidA' },
  { desc: 'A 执行业务；看门狗定时给锁续期，防止业务没做完锁就过期', who: 'A', key: 'uuidA (续期)' },
  { desc: '释放：用 Lua 校验 value==uuidA 再删，避免误删别人的锁', who: null, key: '已释放' },
  { desc: 'B 这时才抢到锁，开始它的业务', who: 'B', key: 'uuidB' },
]

export default function DistributedLock() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const client = (id, x) => {
    const hold = s.who === id
    return (
      <g>
        <rect x={x} y="30" width="100" height="50" rx="10" fill={hold ? 'var(--green)' : 'var(--bg-subtle)'} stroke={hold ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={hold ? 2 : 1} />
        <text x={x + 50} y="52" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={hold ? '#ffffff' : 'var(--ink)'}>客户端 {id}</text>
        <text x={x + 50} y="70" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={hold ? '#ffffff' : 'var(--ink-faint)'}>{hold ? '持有锁' : '等待/重试'}</text>
      </g>
    )
  }

  return (
    <Figure caption="分布式锁的正确姿势：SET key uuid NX EX 加锁（NX 保证互斥、EX 防死锁），看门狗续期防业务超时，释放时用 Lua 校验 uuid 再删防误删。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Redis 分布式锁">
        {client('A', 24)}
        {client('B', 336)}

        {/* 锁（Redis key） */}
        <rect x="160" y="26" width="140" height="58" rx="12" fill="var(--rose-soft)" stroke="var(--rose-line)" strokeWidth="2" />
        <text x="230" y="48" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--rose)">key: lock</text>
        <text x="230" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill="var(--ink)">{s.key}</text>

        {s.who === 'A' && <line x1="124" y1="55" x2="160" y2="55" stroke="var(--green)" strokeWidth="2.5" markerEnd="url(#dl-a)" />}
        {s.who === 'B' && <line x1="336" y1="55" x2="300" y2="55" stroke="var(--green)" strokeWidth="2.5" markerEnd="url(#dl-a)" />}
        <defs><marker id="dl-a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--green)" /></marker></defs>

        <rect x="24" y="150" width="412" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="36" y="171" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

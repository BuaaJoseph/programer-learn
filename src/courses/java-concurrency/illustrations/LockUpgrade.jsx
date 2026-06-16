import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { name: '无锁', desc: '对象刚创建、还没有线程竞争，Mark Word 记录哈希码、分代年龄等。', color: 'var(--ink-soft)' },
  { name: '偏向锁', desc: '只有一个线程访问：在 Mark Word 记下该线程 ID，下次进入无需任何同步操作，几乎零开销。', color: 'var(--green)' },
  { name: '轻量级锁', desc: '出现第二个线程交替访问(无激烈竞争)：用 CAS 把 Mark Word 换成指向栈中锁记录的指针，自旋等待。', color: 'var(--accent)' },
  { name: '重量级锁', desc: '竞争激烈、自旋失败：膨胀为重量级锁，没抢到的线程被操作系统挂起(进入 BLOCKED)，有上下文切换开销。', color: 'var(--rose)' },
]

export default function LockUpgrade() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>竞争加剧 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">锁只能升级，不能降级</span>
    </>
  )

  return (
    <Figure caption="synchronized 的锁信息存在对象头的 Mark Word 里。为了减少开销，锁会随竞争加剧逐步升级：无锁 → 偏向锁 → 轻量级锁 → 重量级锁(只升不降)。竞争越弱，开销越小。" controls={controls}>
      <svg viewBox="0 0 460 170" width="460" role="img" aria-label="synchronized 锁升级">
        {STEPS.map((st, i) => {
          const active = i === step
          const done = i < step
          return (
            <g key={i}>
              <rect x={14 + i * 112} y="44" width="98" height="46" rx="9"
                fill={active ? st.color : done ? 'var(--bg-sunken)' : 'var(--bg-subtle)'}
                stroke={active ? st.color : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
              <text x={63 + i * 112} y="72" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{st.name}</text>
              {i < 3 && <text x={114 + i * 112} y="71" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--ink-faint)">▸</text>}
            </g>
          )
        })}
        <rect x="14" y="108" width="432" height="50" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="22" y="112" width="416" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}><strong style={{ color: s.color }}>{s.name}：</strong>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

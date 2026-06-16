import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '线程读到当前值 V=10，准备把它改成 11(期望旧值 E=10)', v: 10, e: 10, nv: 11, result: null },
  { desc: 'CAS：比较内存值 V 是否还等于期望值 E', v: 10, e: 10, nv: 11, result: 'check' },
  { desc: 'V==E(没人动过) → 交换成功，V 变成 11', v: 11, e: 10, nv: 11, result: 'ok' },
  { desc: '若期间别的线程已把 V 改了(如改成 12)，V≠E → CAS 失败，自旋重试', v: 12, e: 10, nv: 11, result: 'fail' },
]

export default function Cas() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">CAS = Compare And Swap，无锁乐观更新</span>
    </>
  )

  return (
    <Figure caption="CAS 用一条 CPU 原子指令完成「比较并交换」：只有当内存值仍等于期望旧值时才更新，否则失败重试(自旋)。它是原子类和 AQS 的基石，是一种乐观锁。坑：ABA 问题、自旋开销、只能保证一个变量。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="CAS 原理">
        <g>
          <rect x="40" y="40" width="100" height="46" rx="9" fill="var(--bg-subtle)" stroke="var(--border-strong)" />
          <text x="90" y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">期望值 E</text>
          <text x="90" y="76" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fontWeight="700" fill="var(--ink)">{s.e}</text>
        </g>
        <g>
          <rect x="180" y="40" width="100" height="46" rx="9" fill={s.result === 'ok' ? 'var(--green-soft)' : s.result === 'fail' ? 'var(--rose-soft)' : 'var(--accent-soft)'} stroke={s.result === 'ok' ? 'var(--green)' : s.result === 'fail' ? 'var(--rose)' : 'var(--accent-line)'} strokeWidth="2" />
          <text x="230" y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">内存值 V</text>
          <text x="230" y="76" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fontWeight="700" fill={s.result === 'fail' ? 'var(--rose)' : 'var(--ink)'}>{s.v}</text>
        </g>
        <g>
          <rect x="320" y="40" width="100" height="46" rx="9" fill="var(--bg-subtle)" stroke="var(--border-strong)" />
          <text x="370" y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">新值 N</text>
          <text x="370" y="76" textAnchor="middle" fontFamily="var(--mono)" fontSize="14" fontWeight="700" fill="var(--accent-strong)">{s.nv}</text>
        </g>
        {s.result === 'check' && <text x="230" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">V == E ? 比较中…</text>}
        {s.result === 'ok' && <text x="230" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--green)">✓ 相等 → V 更新为 N</text>}
        {s.result === 'fail' && <text x="230" y="110" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--rose)">✗ V≠E → 失败，重新读值再试(自旋)</text>}

        <rect x="20" y="138" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="158" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

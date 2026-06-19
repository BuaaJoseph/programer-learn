import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '新对象分配在 Eden 区', eden: 3, s0: 0, s1: 0, old: 1, gc: null },
  { desc: 'Eden 满 → 触发 Minor GC：存活对象复制到 Survivor(S0)，年龄+1', eden: 0, s0: 2, s1: 0, old: 1, gc: 'minor' },
  { desc: '又一次 Minor GC：S0 存活者复制到 S1，年龄继续+1(Eden+S0→S1)', eden: 0, s0: 0, s1: 2, old: 1, gc: 'minor' },
  { desc: '年龄达到阈值(默认 15) → 晋升到老年代', eden: 1, s0: 0, s1: 0, old: 3, gc: null },
  { desc: '老年代满 → 触发 Full GC(STW 长、最该避免)', eden: 1, s0: 0, s1: 0, old: 4, gc: 'full' },
]

export default function HeapGen() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  const dots = (x, y, n, color) => Array.from({ length: n }).map((_, i) => (
    <circle key={i} cx={x + (i % 3) * 16} cy={y + Math.floor(i / 3) * 16} r="5.5" fill={color} />
  ))

  return (
    <Figure caption="堆分新生代(Eden + 两个 Survivor)和老年代。对象朝生夕灭：先进 Eden，Minor GC 时存活者在两个 Survivor 间复制并累加年龄，熬过阈值晋升老年代；老年代满才触发代价高的 Full GC。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="堆分代与 GC">
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">新生代 Young (Eden : S0 : S1 ≈ 8:1:1)</text>
        <rect x="20" y="30" width="150" height="70" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="28" y="44" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">Eden</text>
        {dots(34, 54, s.eden, 'var(--accent)')}
        <rect x="178" y="30" width="60" height="70" rx="8" fill={s.gc === 'minor' ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke="var(--border-strong)" />
        <text x="186" y="44" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">S0</text>
        {dots(190, 54, s.s0, 'var(--green)')}
        <rect x="246" y="30" width="60" height="70" rx="8" fill={s.gc === 'minor' ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke="var(--border-strong)" />
        <text x="254" y="44" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">S1</text>
        {dots(258, 54, s.s1, 'var(--green)')}

        <text x="320" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">老年代 Old</text>
        <rect x="320" y="30" width="120" height="70" rx="8" fill={s.gc === 'full' ? 'var(--rose-soft)' : 'var(--amber-soft)'} stroke={s.gc === 'full' ? 'var(--rose)' : 'var(--amber-line)'} strokeWidth={s.gc === 'full' ? 2 : 1} />
        {dots(334, 48, s.old, 'var(--amber)')}

        {s.gc && (
          <text x="20" y="120" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={s.gc === 'full' ? 'var(--rose)' : 'var(--green)'}>
            {s.gc === 'full' ? '⚠ Full GC（STW，回收整个堆，慢）' : 'Minor GC（只回收新生代，快）'}
          </text>
        )}

        <rect x="20" y="158" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="160" width="404" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

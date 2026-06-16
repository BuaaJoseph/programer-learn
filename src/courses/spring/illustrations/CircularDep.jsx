import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '创建 A：实例化后(半成品)放入三级缓存(存一个能造 A 的工厂)', a: '半成品', b: '-', l3: 'A工厂' },
  { desc: 'A 注入属性时需要 B → 去创建 B', a: '半成品', b: '开始造', l3: 'A工厂' },
  { desc: 'B 注入属性时需要 A → 从三级缓存拿到 A 的早期引用(升到二级缓存)', a: '早期引用', b: '半成品', l3: 'A工厂→二级' },
  { desc: 'B 拿到 A 的引用，完成创建 → B 成品放一级缓存', a: '早期引用', b: '成品', l3: '-' },
  { desc: 'A 拿到完整的 B，继续完成自己的创建 → A 成品放一级缓存', a: '成品', b: '成品', l3: '-' },
]

export default function CircularDep() {
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
    <Figure caption="A 依赖 B、B 依赖 A 的循环依赖，Spring 用三级缓存破解：实例化后先把「半成品」提前暴露出去，让对方能拿到引用。注意：只能解决 setter/字段注入的循环依赖，构造器注入的解决不了。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="三级缓存解决循环依赖">
        {/* A 和 B */}
        <rect x="20" y="30" width="120" height="50" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="80" y="50" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">Bean A</text>
        <text x="80" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{s.a}</text>
        <rect x="320" y="30" width="120" height="50" rx="10" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="380" y="50" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--green)">Bean B</text>
        <text x="380" y="68" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">{s.b}</text>
        <line x1="140" y1="48" x2="320" y2="48" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#cd-a)" />
        <text x="230" y="42" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">A 需要 B</text>
        <line x1="320" y1="64" x2="140" y2="64" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#cd-a)" />
        <text x="230" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">B 需要 A</text>
        <defs><marker id="cd-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        {/* 三级缓存 */}
        {[['一级缓存', '成品 singletonObjects'], ['二级缓存', '早期引用 earlySingletonObjects'], ['三级缓存', '对象工厂 singletonFactories']].map((c, i) => (
          <g key={i}>
            <rect x="20" y={96 + i * 26} width="420" height="22" rx="5" fill="var(--bg-subtle)" stroke="var(--border)" />
            <text x="30" y={111 + i * 26} fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--ink)">{c[0]}</text>
            <text x="120" y={111 + i * 26} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">{c[1]}</text>
          </g>
        ))}

        <rect x="20" y="178" width="420" height="0" fill="none" />
        <text x="20" y="193" fontFamily="var(--sans)" fontSize="11.5" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

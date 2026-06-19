import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '主代理遇到一个独立子任务：「在全仓库找出所有调用旧 API 的地方」', main: true, sub: false },
  { desc: '派生子代理(Task)：给它干净的独立上下文 + 明确目标', main: true, sub: 'spawn' },
  { desc: '子代理自己跑很多轮：读 50+ 文件、grep、整理——这些全在它自己的上下文里', main: false, sub: 'work' },
  { desc: '子代理只把「最终结果摘要」作为 tool_result 回传给主代理', main: true, sub: 'return' },
  { desc: '主代理上下文只多了一小段摘要，没被 50 个文件内容污染', main: true, sub: false },
]

export default function SubagentIsolation() {
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
    <Figure caption="子代理是「上下文隔离器」：主代理把独立子任务丢给它，它在自己的独立上下文里跑很多轮，最后只回传一段结果摘要。好处是主上下文不被中间过程(几十个文件、日志)塞爆，还能并行、限权。这不是复杂多 Agent 编排，而是为了省上下文。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="子代理上下文隔离">
        {/* 主代理 */}
        <rect x="20" y="30" width="170" height="120" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" strokeWidth={s.main ? 2 : 1} />
        <text x="105" y="50" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--accent-strong)">主代理</text>
        <text x="30" y="70" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">上下文：</text>
        <rect x="30" y="76" width="150" height="10" rx="3" fill="var(--accent)" opacity="0.5" />
        <rect x="30" y="90" width="120" height="10" rx="3" fill="var(--accent)" opacity="0.5" />
        {step >= 4 && <rect x="30" y="104" width="60" height="10" rx="3" fill="var(--green)" />}
        {step >= 4 && <text x="30" y="128" fontFamily="var(--mono)" fontSize="8" fill="var(--green)">+ 一小段摘要(干净)</text>}

        {/* 子代理 */}
        {s.sub && (
          <g>
            <rect x="260" y="30" width="180" height="120" rx="10" fill="var(--violet)" fillOpacity="0.1" stroke="var(--violet)" strokeWidth="2" strokeDasharray={s.sub === 'work' ? '0' : '4 3'} />
            <text x="350" y="50" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--violet)">子代理</text>
            <text x="270" y="70" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">独立上下文：</text>
            {s.sub === 'work' && [0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x="270" y={76 + i * 13} width={150 - i * 8} height="9" rx="3" fill="var(--violet)" opacity="0.45" />
            ))}
            {s.sub === 'work' && <text x="270" y="146" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">读 50+ 文件、grep…全堆这里</text>}
          </g>
        )}
        {/* 箭头 */}
        {s.sub === 'spawn' && <line x1="190" y1="90" x2="260" y2="90" stroke="var(--violet)" strokeWidth="2" markerEnd="url(#si-a)" />}
        {s.sub === 'return' && <line x1="260" y1="100" x2="190" y2="100" stroke="var(--green)" strokeWidth="2.5" markerEnd="url(#si-b)" />}
        {s.sub === 'spawn' && <text x="210" y="82" fontFamily="var(--mono)" fontSize="8" fill="var(--violet)">spawn</text>}
        {s.sub === 'return' && <text x="200" y="116" fontFamily="var(--mono)" fontSize="8" fill="var(--green)">回传摘要</text>}
        <defs>
          <marker id="si-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--violet)" /></marker>
          <marker id="si-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker>
        </defs>

        <rect x="20" y="162" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="181" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// skill-creator 的 6 步工作流。
const STEPS = [
  { t: '捕获意图', d: '说明这个 Skill 做什么、何时触发、期望输出', out: '需求' },
  { t: '生成初稿', d: 'skill-creator 生成格式正确的 SKILL.md 与目录结构', out: 'SKILL.md' },
  { t: '写测试', d: '创建 evals.json，放 5~10 个真实提问与期望结果', out: 'evals.json' },
  { t: '并行评测', d: '对比「带 Skill」vs「不带 Skill」的成功率与 token 消耗', out: '评测报告' },
  { t: '迭代改进', d: '在 eval-viewer 看失败用例，改正文再重跑', out: '改进版' },
  { t: '优化触发', d: '用一组查询跑 description 优化循环，提高触发准确率', out: '高触发率' },
]

export default function SkillCreatorFlow() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步 · skill-creator`}</span>
    </>
  )

  return (
    <Figure caption="skill-creator 是 Anthropic 官方的「写 Skill 的 Skill」。它把写 Skill 变成可度量的工作流：捕获意图 → 生成初稿 → 写 eval → 评测 → 迭代 → 优化 description。点「下一步」走一遍。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="skill-creator 工作流">
        {STEPS.map((st, i) => {
          const done = i < step
          const cur = i === step
          const x = 20 + (i % 3) * 150
          const y = 20 + Math.floor(i / 3) * 70
          return (
            <g key={i}>
              <rect x={x} y={y} width="134" height="54" rx="10"
                fill={cur ? 'var(--violet)' : done ? '#efe9fa' : 'var(--bg-subtle)'}
                stroke={cur ? 'var(--violet)' : done ? '#d7c7f0' : 'var(--border-strong)'} strokeWidth={cur ? 2 : 1} />
              <circle cx={x + 18} cy={y + 18} r="11" fill={cur ? '#ffffff' : done ? 'var(--violet)' : 'var(--ink-faint)'} />
              <text x={x + 18} y={y + 22} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={cur ? 'var(--violet)' : '#ffffff'}>{i + 1}</text>
              <text x={x + 34} y={y + 22} fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={cur ? '#ffffff' : 'var(--ink)'}>{st.t}</text>
              <text x={x + 12} y={y + 42} fontFamily="var(--mono)" fontSize="9" fill={cur ? '#ffffff' : 'var(--ink-faint)'}>产出：{st.out}</text>
            </g>
          )
        })}
        <rect x="20" y="166" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="185" fontFamily="var(--sans)" fontSize="12.5" fill="var(--ink)"><tspan fontWeight="700" fill="var(--violet)">{s.t}：</tspan>{s.d}</text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 三层渐进式加载：元数据(始终) → 正文(触发时) → reference(按需)。逐步展示加载了什么、占多少上下文。
const STEPS = [
  { desc: '启动：只把每个 Skill 的 name + description 放进上下文', load: 1, tok: '~50 tokens / skill' },
  { desc: '用户提问，Claude 用 description 匹配 → 决定触发这个 Skill', load: 1, tok: '~50 tokens', match: true },
  { desc: '触发：加载 SKILL.md 正文(指令/规则)进上下文，整轮会话保留', load: 2, tok: '+ 几百~几千 tokens' },
  { desc: '正文里引用了 reference 文件 → 此刻才从磁盘读取它', load: 3, tok: '+ 按需，用时才付费' },
  { desc: '执行任务。没用到的 reference 始终不进上下文，省下大量预算', load: 3, tok: '只为用到的内容付费' },
]
const LAYERS = [
  { name: '① 元数据 name + description', sub: '始终在上下文', minLoad: 1 },
  { name: '② SKILL.md 正文', sub: '触发时加载', minLoad: 2 },
  { name: '③ reference / scripts', sub: '按需加载', minLoad: 3 },
]

export default function ProgressiveLoading() {
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
    <Figure caption="Skill 的核心机制是三层渐进式披露：元数据始终在场(让 Claude 知道有这个能力)，正文在被触发时才加载，reference/脚本只在正文引用到时才按需读取——既省 token，又能在需要时给出完整指引。" controls={controls}>
      <svg viewBox="0 0 460 220" width="460" role="img" aria-label="Skill 渐进式加载">
        {LAYERS.map((l, i) => {
          const loaded = s.load >= l.minLoad
          const justNow = s.load === l.minLoad
          return (
            <g key={i}>
              <rect x="20" y={20 + i * 50} width="300" height="42" rx="10"
                fill={loaded ? (l.minLoad === 1 ? 'var(--accent)' : l.minLoad === 2 ? 'var(--violet)' : 'var(--green)') : 'var(--bg-sunken)'}
                stroke={loaded ? 'transparent' : 'var(--border-strong)'}
                strokeDasharray={loaded ? '0' : '4 3'}
                opacity={loaded ? 1 : 0.55} />
              <text x="34" y={40 + i * 50} fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={loaded ? '#ffffff' : 'var(--ink-faint)'}>{l.name}</text>
              <text x="34" y={56 + i * 50} fontFamily="var(--mono)" fontSize="10" fill={loaded ? '#ffffff' : 'var(--ink-faint)'}>{l.sub}</text>
              {justNow && <text x="328" y={45 + i * 50} fontFamily="var(--mono)" fontSize="11" fill="var(--rose)">← 此刻加载</text>}
              {!loaded && <text x="328" y={45 + i * 50} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">未加载</text>}
            </g>
          )
        })}
        {s.match && <text x="20" y="14" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">description 命中触发条件</text>}

        <rect x="20" y="178" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="193" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
        <text x="32" y="206" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">上下文成本：{s.tok}</text>
      </svg>
    </Figure>
  )
}

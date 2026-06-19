import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 七个框架按范式归类的全景图：点一个范式，高亮它的代表框架与一句话特点。
const PARADIGMS = [
  { key: 'code', label: '代码行动', fw: 'smolagents', note: 'Agent 直接写并执行 Python 代码来行动，组合工具更自然、步数更少。' },
  { key: 'loop', label: '轻量循环+handoff', fw: 'OpenAI Agents SDK', note: '极少抽象：Agent + Handoff(控制权交接) + Guardrail，适合多 Agent 分诊。' },
  { key: 'typed', label: '类型安全/结构化', fw: 'PydanticAI', note: '结构化输出 + 依赖注入，FastAPI 式的可测试、低魔法。' },
  { key: 'graph', label: '图/状态机', fw: 'LangGraph', note: '显式状态图：条件边路由、checkpointer 持久、interrupt 人审，控制力最强。' },
  { key: 'role', label: '角色协作', fw: 'CrewAI', note: '角色+任务+流程，一队 Agent 协作，适合研究/创作类多视角工作。' },
  { key: 'data', label: '数据/RAG 驱动', fw: 'LlamaIndex', note: '索引/检索 + Agent + 事件驱动 Workflows，最适合知识库与文档问答。' },
  { key: 'java', label: '企业 Java 集成', fw: 'Spring AI', note: '把 LLM 变成被 Spring 管理的依赖：ChatClient + Advisors + @Tool。' },
]

export default function ParadigmMap() {
  const [k, setK] = useState('code')
  const p = PARADIGMS.find((x) => x.key === k)

  const controls = (
    <>
      {PARADIGMS.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="主流 Agent 框架可以按「范式」归类——它们解决的问题相似，组织方式却各有取舍。点一个范式，看它的代表框架与一句话特点。这门课就沿着这张地图一个个讲透。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="Agent 框架范式地图">
        {PARADIGMS.map((x, i) => {
          const col = i % 4
          const row = Math.floor(i / 4)
          const X = 18 + col * 112
          const Y = 18 + row * 46
          const on = x.key === k
          return (
            <g key={x.key} onClick={() => setK(x.key)} style={{ cursor: 'pointer' }}>
              <rect x={X} y={Y} width="104" height="38" rx="8" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={X + 52} y={Y + 16} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fontWeight={on ? '700' : '500'} fill={on ? 'var(--accent-strong)' : 'var(--ink)'}>{x.label}</text>
              <text x={X + 52} y={Y + 30} textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5" fill="var(--ink-soft)">{x.fw}</text>
            </g>
          )
        })}
        <rect x="18" y="120" width="424" height="74" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="32" y="142" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">{p.label} · {p.fw}</text>
        <foreignObject x="30" y="150" width="404" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>{p.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

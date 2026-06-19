import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 一次 LLM 调用发出去的 messages 数组解剖。
const PARTS = [
  { role: 'system', label: 'system', color: 'var(--ink-soft)', body: '你是编码 Agent，可用 Read/Edit/Bash… 工具。行为规范、安全规则、输出格式。', note: '每轮都带、隐藏、最稳定' },
  { role: 'tools', label: 'tools 定义', color: 'var(--violet)', body: '[Read, Edit, Bash, Grep, Glob, Task, TodoWrite, …] 的 name/description/参数 schema', note: '描述就是给模型看的说明书' },
  { role: 'claude.md', label: 'CLAUDE.md', color: 'var(--amber)', body: '项目规范：用 2 空格、测试用 vitest、API 在 src/api/…', note: '压缩后会被重新注入' },
  { role: 'history', label: '对话历史', color: 'var(--accent)', body: 'user: 帮我重构 auth\\nassistant: (工具调用 Grep)\\n…一轮轮累积', note: '增长最快' },
  { role: 'toolresult', label: '上一轮工具结果', color: 'var(--green)', body: 'tool_result: src/auth.js 的内容 / 测试输出 / 报错堆栈', note: '模型据此决定下一步' },
]

export default function LlmTurn() {
  const [sel, setSel] = useState(0)
  const p = PARTS[sel]

  const controls = (
    <>
      {PARTS.map((x, i) => (
        <button key={i} className={`fig-btn ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>{x.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="Agent 的每一轮，本质是把一个 messages 数组发给 LLM：system + 工具定义 + CLAUDE.md + 历史 + 上一轮工具结果，拼成完整上下文。模型读完它，输出「下一个工具调用」或「最终文本」。点各部分看它装了什么。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="一次 LLM 调用解剖">
        {PARTS.map((x, i) => {
          const on = sel === i
          return (
            <g key={i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
              <rect x="20" y={18 + i * 30} width="180" height="26" rx="5" fill={on ? x.color : 'var(--bg-subtle)'} stroke={on ? x.color : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x="30" y={35 + i * 30} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={on ? '#ffffff' : 'var(--ink)'}>{x.label}</text>
            </g>
          )
        })}
        <text x="20" y="190" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">↑ 拼成一个请求发给 LLM</text>
        <path d="M205 90 L230 90" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#lt-a)" />
        <defs><marker id="lt-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="234" y="18" width="212" height="180" rx="10" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="246" y="38" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={p.color}>{p.label}</text>
        <rect x="244" y="46" width="192" height="96" rx="6" fill="var(--bg-code)" />
        <foreignObject x="252" y="52" width="176" height="84">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10px var(--mono)', color: '#d8dcec', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{p.body}</div>
        </foreignObject>
        <foreignObject x="244" y="150" width="194" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink-soft)', lineHeight: 1.3 }}>说明：{p.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

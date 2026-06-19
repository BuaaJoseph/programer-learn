import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const ACTIONS = [
  { op: 'Read src/auth.js', rule: 'allow', why: '只读操作，默认允许，不打扰你' },
  { op: 'Edit src/auth.js', rule: 'ask', why: '会改文件，默认停下来问你确认' },
  { op: 'Bash(npm test)', rule: 'allow', why: '在允许列表里(Bash(npm *)) → 直接放行' },
  { op: 'Bash(rm -rf /)', rule: 'deny', why: '命中 Deny 规则 → 永久拒绝，模型无法绕过' },
]

export default function PermissionGate() {
  const [i, setI] = useState(1)
  const a = ACTIONS[i]
  const color = a.rule === 'deny' ? 'var(--rose)' : a.rule === 'ask' ? 'var(--amber)' : 'var(--green)'

  const controls = (
    <>
      {ACTIONS.map((x, idx) => (
        <button key={idx} className={`fig-btn ${i === idx ? 'active' : ''}`} onClick={() => setI(idx)}>{x.op.split(' ')[0]} {x.op.includes('rm') ? 'rm' : ''}</button>
      ))}
      <span className="fig-note">规则评估顺序：Deny &gt; Ask &gt; Allow</span>
    </>
  )

  return (
    <Figure caption="模型生成的工具调用不会直接执行——先过 harness 的权限闸门：Deny>Ask>Allow，第一个命中的规则赢。所以 Agent 才会「停下来问你」，危险操作能被 Deny 永久挡死。可中断、可审查，是 Agent 能被信任的根。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="权限闸门">
        <rect x="20" y="40" width="120" height="40" rx="8" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="80" y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--violet)">模型生成意图</text>
        <foreignObject x="26" y="60" width="108" height="18">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '9px var(--mono)', color: 'var(--ink)', textAlign: 'center' }}>{a.op}</div>
        </foreignObject>

        {/* 闸门 */}
        <rect x="180" y="34" width="100" height="52" rx="10" fill={color} />
        <text x="230" y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">权限闸门</text>
        <text x="230" y="72" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">{a.rule.toUpperCase()}</text>
        <line x1="140" y1="60" x2="180" y2="60" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#pg-a)" />

        {/* 结果 */}
        <rect x="320" y="20" width="120" height="26" rx="6" fill={a.rule === 'allow' ? 'var(--green)' : 'var(--bg-subtle)'} stroke="var(--green-line)" />
        <text x="380" y="38" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={a.rule === 'allow' ? '#ffffff' : 'var(--ink-faint)'}>执行</text>
        <rect x="320" y="54" width="120" height="26" rx="6" fill={a.rule === 'ask' ? 'var(--amber)' : 'var(--bg-subtle)'} stroke="var(--amber-line)" />
        <text x="380" y="72" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={a.rule === 'ask' ? '#ffffff' : 'var(--ink-faint)'}>问用户确认</text>
        <rect x="320" y="88" width="120" height="26" rx="6" fill={a.rule === 'deny' ? 'var(--rose)' : 'var(--bg-subtle)'} stroke="var(--rose-line)" />
        <text x="380" y="106" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={a.rule === 'deny' ? '#ffffff' : 'var(--ink-faint)'}>拒绝</text>
        <line x1="280" y1="60" x2="320" y2={a.rule === 'allow' ? 33 : a.rule === 'ask' ? 67 : 101} stroke={color} strokeWidth="2" markerEnd="url(#pg-b)" />
        <defs>
          <marker id="pg-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="pg-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill={color} /></marker>
        </defs>

        <rect x="20" y="150" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="169" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)"><tspan fontWeight="700" fill={color}>{a.rule.toUpperCase()}：</tspan>{a.why}</text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const TASKS = {
  bug: { label: '查一个 bug', turns: 4, plan: false, sub: false, ask: false, path: ['Grep', 'Read', 'Edit', 'Bash 测试 ✓'], note: '范围小、目标明确：几轮就收敛，无需计划或子代理。' },
  feat: { label: '加一个功能', turns: 9, plan: true, sub: false, ask: true, path: ['探索', 'TodoWrite', '问用户', 'Edit×N', 'Bash 测试', '修错', '✓'], note: '中等复杂：需要规划、可能问一次澄清、多次改与验证。' },
  refactor: { label: '大重构', turns: 30, plan: true, sub: true, ask: true, path: ['探索', '派子代理调研', 'TodoWrite', '问用户', '分步改', '反复测试/修错', '压缩上下文', '✓'], note: '大而长：要规划+子代理隔离调研+多次人审+上下文压缩，几十轮。' },
}

export default function TaskCompare() {
  const [k, setK] = useState('feat')
  const t = TASKS[k]

  const controls = (
    <>
      {Object.entries(TASKS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  return (
    <Figure caption="同一套主循环，面对不同任务跑出的路径差别巨大：查 bug 几轮收敛，加功能要规划，大重构还要子代理+人审+上下文压缩、几十轮。任务越大越开放，用到的脚手架机制越多。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="三类任务对比">
        {/* 指标 */}
        <g>
          <rect x="20" y="24" width="130" height="44" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
          <text x="30" y="42" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">大致轮数</text>
          <text x="30" y="60" fontFamily="var(--display)" fontSize="16" fontWeight="700" fill="var(--accent-strong)">~{t.turns}</text>
        </g>
        {[['计划', t.plan], ['子代理', t.sub], ['问用户', t.ask]].map((m, i) => (
          <g key={i}>
            <rect x={160 + i * 95} y="24" width="88" height="44" rx="8" fill={m[1] ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={m[1] ? 'var(--green)' : 'var(--border-strong)'} />
            <text x={204 + i * 95} y="44" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink)">{m[0]}</text>
            <text x={204 + i * 95} y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={m[1] ? 'var(--green)' : 'var(--ink-faint)'}>{m[1] ? '✓ 用到' : '不用'}</text>
          </g>
        ))}

        {/* 路径 */}
        <text x="20" y="92" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">执行路径：</text>
        <foreignObject x="20" y="98" width="420" height="50">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {t.path.map((p, i) => (
              <span key={i} style={{ font: '10px var(--mono)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', border: '1px solid var(--accent-line)', borderRadius: '5px', padding: '2px 7px' }}>{p}{i < t.path.length - 1 ? ' →' : ''}</span>
            ))}
          </div>
        </foreignObject>

        <rect x="20" y="158" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="162" width="404" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}><strong style={{ color: 'var(--accent-strong)' }}>{t.label}：</strong>{t.note}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

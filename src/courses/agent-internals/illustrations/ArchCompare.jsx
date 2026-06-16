import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

export default function ArchCompare() {
  const [k, setK] = useState('loop')
  const loop = k === 'loop'

  const controls = (
    <>
      <button className={`fig-btn ${loop ? 'active' : ''}`} onClick={() => setK('loop')}>单主循环(Claude Code)</button>
      <button className={`fig-btn ${!loop ? 'active' : ''}`} onClick={() => setK('graph')}>图编排(deer-flow)</button>
    </>
  )

  return (
    <Figure caption="处理复杂任务有两种范式。单主循环：一个主代理跑 while 循环、按需派子代理隔离上下文(简单、可调试、连续)。图编排：预先把多个角色连成一张状态图、任务在角色间按边流转(显式、可控、适合可拆成独立线索的研究)。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="单主循环 vs 图编排">
        {loop ? (
          <>
            <circle cx="160" cy="90" r="46" fill="var(--accent)" />
            <text x="160" y="86" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">主循环</text>
            <text x="160" y="102" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="#ffffff">while(有工具调用)</text>
            <path d="M120 70 A 60 60 0 1 0 200 70" fill="none" stroke="var(--accent-strong)" strokeWidth="2" markerEnd="url(#ac-a)" />
            {/* 偶尔派子代理 */}
            <rect x="290" y="50" width="120" height="32" rx="7" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" strokeDasharray="4 3" />
            <text x="350" y="70" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--violet)">子代理(按需)</text>
            <rect x="290" y="100" width="120" height="32" rx="7" fill="var(--violet)" fillOpacity="0.08" stroke="var(--violet)" strokeDasharray="4 3" />
            <text x="350" y="120" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--violet)">子代理(隔离上下文)</text>
            <line x1="206" y1="84" x2="290" y2="66" stroke="var(--violet)" strokeWidth="1.5" markerEnd="url(#ac-v)" />
            <line x1="206" y1="96" x2="290" y2="114" stroke="var(--violet)" strokeWidth="1.5" markerEnd="url(#ac-v)" />
            <defs>
              <marker id="ac-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--accent-strong)" /></marker>
              <marker id="ac-v" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--violet)" /></marker>
            </defs>
          </>
        ) : (
          <>
            {[['coordinator', 50, 40], ['planner', 180, 40], ['research_team', 180, 110], ['researcher', 320, 80], ['coder', 320, 140], ['reporter', 50, 110]].map(([t, x, y], i) => (
              <g key={i}>
                <rect x={x} y={y} width="100" height="28" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
                <text x={x + 50} y={y + 18} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fontWeight="700" fill="var(--green)">{t}</text>
              </g>
            ))}
            <g stroke="var(--ink-faint)" strokeWidth="1.3" fill="none" markerEnd="url(#ac-g)">
              <path d="M150 54 L180 54" />
              <path d="M230 68 L230 110" />
              <path d="M280 120 L320 92" />
              <path d="M280 124 L320 146" />
              <path d="M230 138 L150 120" />
            </g>
            <defs><marker id="ac-g" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
          </>
        )}
        <rect x="20" y="160" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="180" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">
          {loop ? '一个主代理掌控全程，复杂时才派子代理；上下文连续、易调试，写代码类任务更稳。' : '多角色连成状态图、按边流转、计划处可人审；适合广度优先、可并行的研究类任务。'}
        </text>
      </svg>
    </Figure>
  )
}

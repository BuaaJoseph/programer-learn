import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// deer-flow 的 LangGraph 节点图 + 一次研究任务的流转高亮。
const NODES = {
  coordinator: { x: 30, y: 30, label: 'coordinator' },
  background: { x: 30, y: 90, label: 'background' },
  planner: { x: 175, y: 30, label: 'planner' },
  human: { x: 175, y: 90, label: 'human_feedback' },
  team: { x: 175, y: 150, label: 'research_team' },
  researcher: { x: 330, y: 120, label: 'researcher' },
  coder: { x: 330, y: 175, label: 'coder' },
  reporter: { x: 330, y: 30, label: 'reporter' },
}
const FLOW = ['coordinator', 'planner', 'human', 'team', 'researcher', 'team', 'reporter']

export default function DeerFlowGraph() {
  const [step, setStep] = useState(0)
  const active = FLOW[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, FLOW.length - 1))}>沿图推进 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">当前节点：{NODES[active].label}</span>
    </>
  )

  const edges = [
    ['coordinator', 'planner'], ['coordinator', 'background'], ['background', 'planner'],
    ['planner', 'human'], ['human', 'team'], ['human', 'planner'],
    ['team', 'researcher'], ['team', 'coder'], ['team', 'reporter'], ['planner', 'reporter'],
  ]
  const cx = (k) => NODES[k].x + 55
  const cy = (k) => NODES[k].y + 13

  return (
    <Figure caption="deer-flow 用 LangGraph 把多角色显式连成一张状态图：coordinator 接活 → planner 出计划 → human_feedback 让你审/改计划 → research_team 把步骤分发给 researcher/coder → 汇总给 reporter 出报告。节点用 Command(goto) 动态决定下一跳。点「沿图推进」走一遍。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="deer-flow LangGraph 图">
        <g stroke="var(--border-strong)" strokeWidth="1.2" fill="none">
          {edges.map(([a, b], i) => <line key={i} x1={cx(a)} y1={cy(a)} x2={cx(b)} y2={cy(b)} markerEnd="url(#df-a)" />)}
        </g>
        <defs><marker id="df-a" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
        {Object.entries(NODES).map(([k, n]) => {
          const on = active === k
          const isHuman = k === 'human'
          return (
            <g key={k}>
              <rect x={n.x} y={n.y} width="110" height="26" rx="7" fill={on ? (isHuman ? 'var(--amber)' : 'var(--green)') : isHuman ? 'var(--amber-soft)' : 'var(--green-soft)'} stroke={isHuman ? 'var(--amber)' : 'var(--green-line)'} strokeWidth={on ? 2 : 1} />
              <text x={n.x + 55} y={n.y + 17} textAnchor="middle" fontFamily="var(--mono)" fontSize="9.5" fontWeight={on ? '700' : '400'} fill={on ? '#ffffff' : 'var(--ink)'}>{n.label}</text>
            </g>
          )
        })}
        <rect x="20" y="186" width="420" height="0" fill="none" />
        <text x="20" y="202" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">human_feedback 用 interrupt() 暂停等你：[EDIT_PLAN] 退回 planner，[ACCEPTED] 进入执行。</text>
      </svg>
    </Figure>
  )
}

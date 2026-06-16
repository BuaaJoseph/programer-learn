import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const TASKS = ['探索 auth 现状', '拆分 validator', '拆分 session', '补单元测试', '跑通全部测试']

export default function PlanTodo() {
  const [done, setDone] = useState(1) // 已完成数；当前 in_progress = done

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setDone((v) => Math.min(v + 1, TASKS.length))}>完成当前任务 ▸</button>
      <button className="fig-btn" onClick={() => setDone(0)}>重置</button>
      <span className="fig-note">任意时刻只能有一个「进行中」</span>
    </>
  )

  return (
    <Figure caption="大任务先探索、再规划。TodoWrite 把任务外化成可见清单(用户能看到进度)，并有一条硬规则：任意时刻只能有一个任务 in_progress——逼着 Agent 一件件做完、不漏步、不并发乱套。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="计划与 Todo 清单">
        <text x="24" y="28" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">TodoWrite · 重构 auth 模块</text>
        {TASKS.map((t, i) => {
          const isDone = i < done
          const inProgress = i === done && done < TASKS.length
          const status = isDone ? 'completed' : inProgress ? 'in_progress' : 'pending'
          const color = isDone ? 'var(--green)' : inProgress ? 'var(--accent)' : 'var(--ink-faint)'
          return (
            <g key={i}>
              <rect x="24" y={38 + i * 28} width="412" height="24" rx="6" fill={inProgress ? 'var(--accent-soft)' : 'var(--bg-subtle)'} stroke={inProgress ? 'var(--accent)' : 'var(--border)'} strokeWidth={inProgress ? 2 : 1} />
              <circle cx="40" cy={50 + i * 28} r="7" fill={isDone ? 'var(--green)' : inProgress ? 'var(--accent)' : 'var(--bg-sunken)'} stroke={color} />
              {isDone && <text x="40" y={53 + i * 28} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill="#ffffff">✓</text>}
              <text x="56" y={54 + i * 28} fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{t}</text>
              <text x="430" y={54 + i * 28} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill={color}>{status}</text>
            </g>
          )
        })}
        <text x="24" y="192" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">
          {done >= TASKS.length ? '全部完成 → 退出任务' : '完成当前才能把下一个置为 in_progress；这是写死的约束'}
        </text>
      </svg>
    </Figure>
  )
}

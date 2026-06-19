import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// forge 主循环单步演示：跟着一条真实任务，看 messages 历史怎么一轮轮变长，直到模型给纯文本收尾。
const STEPS = [
  { msg: 'user: 把 config 里的端口从 3000 改成 8080', who: 'user', act: '用户输入进入 messages', stop: null },
  { msg: 'assistant: [tool_use grep "3000"]', who: 'a', act: '模型决定先搜一下端口在哪', stop: 'tool_use' },
  { msg: 'user: [tool_result] src/config.ts:7: port: 3000', who: 'tr', act: 'forge 执行 grep，结果回灌', stop: null },
  { msg: 'assistant: [tool_use edit config.ts 3000→8080]', who: 'a', act: '模型据结果发起精确替换', stop: 'tool_use' },
  { msg: 'user: [tool_result] 已修改 src/config.ts', who: 'tr', act: 'forge 执行 edit，结果回灌', stop: null },
  { msg: 'assistant: 已把端口改为 8080，改动在 src/config.ts。', who: 'a', act: '纯文本、无 tool_use → 循环停止', stop: 'end_turn' },
]

export default function LoopStepper() {
  const [n, setN] = useState(1)
  const shown = STEPS.slice(0, n)
  const last = STEPS[n - 1]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setN((v) => Math.min(v + 1, STEPS.length))}>下一轮 ▸</button>
      <button className="fig-btn" onClick={() => setN(1)}>重来</button>
      <span className="fig-note">{last.stop === 'end_turn' ? '✓ 已停机' : last.stop === 'tool_use' ? '有 tool_use → 继续转' : '回灌后再转一圈'}</span>
    </>
  )

  const color = (w) => (w === 'user' ? 'var(--accent)' : w === 'a' ? 'var(--violet)' : 'var(--green)')

  return (
    <Figure caption="主循环维护一份扁平的 messages 历史。每一圈把整份历史发给模型：回复里只要还有 tool_use 就执行工具、把 tool_result 追加回历史、再转一圈；直到模型给出纯文本（stop_reason=end_turn），循环停下，把答案交还用户。点「下一轮」跟着一条真实任务走一遍。" controls={controls}>
      <svg viewBox="0 0 460 250" width="460" role="img" aria-label="forge 主循环单步演示">
        <text x="20" y="20" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">messages[] —— Agent 的工作记忆</text>
        {shown.map((s, i) => (
          <g key={i}>
            <rect x="20" y={28 + i * 30} width="300" height="24" rx="6" fill={i === n - 1 ? color(s.who) : 'var(--bg-subtle)'} fillOpacity={i === n - 1 ? 0.16 : 1} stroke={color(s.who)} strokeOpacity={i === n - 1 ? 1 : 0.4} strokeWidth={i === n - 1 ? 1.6 : 1} />
            <text x="30" y={44 + i * 30} fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink)">{s.msg.length > 46 ? s.msg.slice(0, 45) + '…' : s.msg}</text>
          </g>
        ))}
        {/* 右侧状态 */}
        <rect x="335" y="28" width="105" height="84" rx="8" fill="var(--bg-sunken)" stroke="var(--border)" />
        <text x="345" y="46" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">本轮动作</text>
        <foreignObject x="342" y="50" width="92" height="58">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{last.act}</div>
        </foreignObject>
        <rect x="335" y="120" width="105" height="40" rx="8" fill={last.stop === 'end_turn' ? 'var(--green-soft)' : 'var(--accent-soft)'} stroke={last.stop === 'end_turn' ? 'var(--green)' : 'var(--accent-line)'} />
        <text x="387" y="138" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">stop_reason</text>
        <text x="387" y="152" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={last.stop === 'end_turn' ? 'var(--green)' : 'var(--accent-strong)'}>{last.stop ?? '—'}</text>
      </svg>
    </Figure>
  )
}

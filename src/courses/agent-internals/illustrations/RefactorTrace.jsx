import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 「帮我把 auth 模块重构拆分并补测试」一次任务的内部逐轮轨迹。
const STEPS = [
  { tag: '用户', kind: 'user', think: '收到指令：帮我重构 auth 模块、拆分并补测试', tool: '—', result: 'Agent 不急着改，先进入探索', ctx: '+ 用户指令' },
  { tag: '探索', kind: 'gather', think: '我得先搞清 auth 现状，不能盲改', tool: 'Grep "login|auth"', result: '命中 6 个文件', ctx: '+ 文件列表' },
  { tag: '探索', kind: 'gather', think: '读关键文件理解耦合关系', tool: 'Read src/auth.js', result: '发现 auth 把校验/会话/加密混在一个 400 行文件', ctx: '+ 文件内容' },
  { tag: '规划', kind: 'plan', think: '任务不小，先出计划、列 Todo', tool: 'TodoWrite', result: '①拆 validator ②拆 session ③拆 crypto ④补测试 ⑤跑通', ctx: '+ Todo 清单' },
  { tag: '问用户', kind: 'ask', think: '拆分会改公开 API，影响调用方——这是重要决策，该问', tool: '(暂停)', result: '问：要保持旧 API 兼容，还是允许破坏式改动？', ctx: '等待人类输入' },
  { tag: '用户', kind: 'user', think: '用户答：保持兼容，加一层适配', tool: '—', result: '拿到约束，继续', ctx: '+ 关键约束' },
  { tag: '行动', kind: 'act', think: '按计划拆第一个文件', tool: 'Edit → 新建 validator.js', result: 'Todo①完成，标记下一个为 in_progress', ctx: '历史增长' },
  { tag: '验证', kind: 'verify', think: '改完跑测试看有没有破坏', tool: 'Bash(npm test)', result: '✗ 2 个用例失败：session 引用路径错', ctx: '+ 测试输出' },
  { tag: '修错', kind: 'act', think: '根据报错改引用', tool: 'Edit session.js import', result: '修正路径', ctx: '历史增长' },
  { tag: '验证', kind: 'verify', think: '再跑一次', tool: 'Bash(npm test)', result: '✓ 全绿', ctx: '+ 测试输出' },
  { tag: '收尾', kind: 'done', think: '任务完成，把「auth 拆分约定」记下来', tool: '(写记忆) 无工具调用', result: '回复用户：完成，附改动摘要 → 循环结束', ctx: '+ 记忆' },
]
const KIND = {
  user: 'var(--ink-soft)', gather: 'var(--accent)', plan: 'var(--violet)', ask: 'var(--amber)', act: 'var(--rose)', verify: 'var(--green)', done: 'var(--green)',
}

export default function RefactorTrace() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一轮 ▸</button>
      <button className="fig-btn" onClick={() => setStep((v) => Math.max(v - 1, 0))}>◂ 上一轮</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 轮`}</span>
    </>
  )

  return (
    <Figure caption="输入「帮我重构 auth 模块」之后，Agent 内部并不是一步到位，而是探索→规划→(必要时问你)→改码→验证→修错→收尾，一轮轮推进。点「下一轮」逐步回放每一轮模型的决定、调用的工具、拿到的结果，以及上下文怎么变。" controls={controls}>
      <svg viewBox="0 0 460 230" width="460" role="img" aria-label="重构任务内部轨迹">
        {/* 左侧轨迹时间线 */}
        {STEPS.map((st, i) => {
          const cur = i === step
          const done = i < step
          return (
            <g key={i}>
              <circle cx="34" cy={20 + i * 18} r="6" fill={cur ? KIND[st.kind] : done ? KIND[st.kind] : 'var(--bg-sunken)'} opacity={cur || done ? 1 : 0.4} stroke={cur ? 'var(--ink)' : 'transparent'} />
              {i < STEPS.length - 1 && <line x1="34" y1={26 + i * 18} x2="34" y2={32 + i * 18} stroke="var(--border-strong)" />}
              <text x="46" y={24 + i * 18} fontFamily="var(--mono)" fontSize="9" fontWeight={cur ? '700' : '400'} fill={cur ? KIND[st.kind] : 'var(--ink-faint)'}>{st.tag}</text>
            </g>
          )
        })}

        {/* 右侧详情卡 */}
        <rect x="120" y="16" width="326" height="200" rx="10" fill="var(--bg-subtle)" stroke="var(--border)" />
        <rect x="120" y="16" width="326" height="26" rx="10" fill={KIND[s.kind]} />
        <text x="134" y="34" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">第 {step + 1} 轮 · {s.tag}</text>

        <text x="134" y="62" fontFamily="var(--mono)" fontSize="9" fill="var(--violet)">模型的判断</text>
        <foreignObject x="134" y="66" width="300" height="34">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{s.think}</div>
        </foreignObject>

        <text x="134" y="116" fontFamily="var(--mono)" fontSize="9" fill="var(--accent-strong)">工具调用</text>
        <rect x="134" y="120" width="300" height="22" rx="4" fill="var(--bg-code)" />
        <text x="142" y="135" fontFamily="var(--mono)" fontSize="11" fill="#7ee0a8">{s.tool}</text>

        <text x="134" y="160" fontFamily="var(--mono)" fontSize="9" fill="var(--green)">结果</text>
        <foreignObject x="134" y="164" width="300" height="32">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{s.result}</div>
        </foreignObject>

        <text x="134" y="208" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">上下文：{s.ctx}</text>
      </svg>
    </Figure>
  )
}

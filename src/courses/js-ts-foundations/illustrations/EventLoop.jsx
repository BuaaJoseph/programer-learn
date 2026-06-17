import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// JS 事件循环：点一个部件看它的角色，理解宏任务/微任务的执行顺序。
const PARTS = [
  { key: 'stack', label: '调用栈', title: 'Call Stack（调用栈）', note: '同步代码在这里逐帧执行。栈是单线程的——同一时刻只跑一件事。只有栈空了，事件循环才会去取下一个任务。' },
  { key: 'webapi', label: 'Web API', title: 'Web API / 宿主环境', note: 'setTimeout、fetch、DOM 事件等由宿主（浏览器/Node）在栈之外处理。计时/请求完成后，把回调投递到对应的任务队列，而不是直接塞回栈。' },
  { key: 'macro', label: '宏任务队列', title: 'Macrotask Queue（宏任务）', note: 'setTimeout/setInterval、I/O、UI 事件的回调排在这里。事件循环每一轮只取一个宏任务执行。' },
  { key: 'micro', label: '微任务队列', title: 'Microtask Queue（微任务）', note: 'Promise.then、queueMicrotask、MutationObserver 的回调。关键规则：每个宏任务执行后、下一个宏任务之前，微任务队列会被一次性清空。所以 Promise 回调总先于 setTimeout。' },
  { key: 'loop', label: '事件循环', title: 'Event Loop（事件循环）', note: '一个永不停歇的循环：栈空 → 清空所有微任务 →（必要时渲染）→ 取一个宏任务执行 → 再清空微任务……如此往复。它就是「单线程如何并发」的答案。' },
]

export default function EventLoop() {
  const [k, setK] = useState('stack')
  const cur = PARTS.find((x) => x.key === k)

  const controls = (
    <>
      {PARTS.map((x) => (
        <button key={x.key} className={`fig-btn ${k === x.key ? 'active' : ''}`} onClick={() => setK(x.key)}>{x.label}</button>
      ))}
    </>
  )

  // 五个部件在画布上的位置
  const boxes = {
    stack: { x: 24, y: 24, w: 120, h: 60 },
    webapi: { x: 320, y: 24, w: 130, h: 60 },
    macro: { x: 256, y: 110, w: 194, h: 34 },
    micro: { x: 256, y: 150, w: 194, h: 34 },
    loop: { x: 24, y: 110, w: 120, h: 74 },
  }

  return (
    <Figure caption="JS 单线程靠事件循环实现并发：同步代码在调用栈跑；setTimeout/fetch 交给 Web API；回调按类型进宏/微任务队列。规则——每跑完一个宏任务就清空所有微任务，所以 Promise.then 永远先于 setTimeout。点部件看角色。" controls={controls}>
      <svg viewBox="0 0 474 204" width="474" role="img" aria-label="JS 事件循环示意图">
        {Object.entries(boxes).map(([key, b]) => {
          const on = key === k
          const label = PARTS.find((p) => p.key === key).label
          return (
            <g key={key} onClick={() => setK(key)} style={{ cursor: 'pointer' }}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="8" fill={on ? 'var(--accent)' : 'var(--bg-subtle)'} fillOpacity={on ? 0.16 : 1} stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2 : 1} />
              <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fontWeight={on ? '700' : '600'} fill={on ? 'var(--accent-strong)' : 'var(--ink)'}>{label}</text>
            </g>
          )
        })}
        {/* 流向箭头 */}
        <g stroke="var(--ink-soft)" strokeWidth="1.4" fill="none" markerEnd="url(#elArr)">
          <path d="M 144 54 L 320 54" />
          <path d="M 385 84 L 360 110" />
          <path d="M 256 140 L 150 150" />
          <path d="M 84 110 L 84 84" />
        </g>
        <defs>
          <marker id="elArr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-soft)" />
          </marker>
        </defs>
      </svg>
    </Figure>
  )
}

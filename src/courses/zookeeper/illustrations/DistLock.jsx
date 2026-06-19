import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 临时顺序节点实现分布式锁：序号最小者持锁，其余只监听前一个节点。
const STEPS = [
  { desc: '三个客户端都在 /lock 下创建临时顺序节点，拿到各自序号', nodes: ['c1: 0001', 'c2: 0002', 'c3: 0003'], holder: 0, watch: {} },
  { desc: '序号最小的 c1(0001) 持有锁；c2 只监听 c1、c3 只监听 c2(避免惊群)', nodes: ['c1: 0001', 'c2: 0002', 'c3: 0003'], holder: 0, watch: { 1: 0, 2: 1 } },
  { desc: 'c1 用完释放(删除节点/会话结束临时节点自动删)', nodes: ['c2: 0002', 'c3: 0003'], holder: -1, watch: { 1: 0, 2: 1 }, released: true },
  { desc: 'c2 收到通知：前面没节点了 → c2 成为最小序号，拿到锁', nodes: ['c2: 0002', 'c3: 0003'], holder: 0, watch: { 1: 0 } },
]

export default function DistLock() {
  const [step, setStep] = useState(0)
  const s = STEPS[step]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${step + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="ZK 分布式锁的经典实现：各客户端在锁节点下建「临时顺序节点」，序号最小者持锁；其余只监听自己前一个节点(而非都盯着锁)，避免惊群。持锁者崩溃，临时节点随会话自动删除——锁自动释放，不会死锁。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ZooKeeper 分布式锁">
        <text x="20" y="26" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">/lock （临时顺序子节点，按序号排队）</text>
        {s.nodes.map((n, i) => {
          const holder = s.holder === i
          return (
            <g key={n}>
              <rect x="30" y={40 + i * 42} width="180" height="34" rx="8" fill={holder ? 'var(--green)' : 'var(--accent-soft)'} stroke={holder ? 'var(--green)' : 'var(--accent-line)'} strokeWidth={holder ? 2 : 1} />
              <text x="44" y={61 + i * 42} fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={holder ? '#ffffff' : 'var(--ink)'}>{n}</text>
              <text x="180" y={61 + i * 42} fontFamily="var(--mono)" fontSize="9" fill={holder ? '#ffffff' : 'var(--ink-faint)'}>{holder ? '🔒持锁' : '等待'}</text>
              {/* watch 前一个 */}
              {s.watch[i] !== undefined && (
                <line x1="40" y1={40 + i * 42} x2="40" y2={40 + s.watch[i] * 42 + 34} stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#dk-a)" />
              )}
            </g>
          )
        })}
        <defs><marker id="dk-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--amber)" /></marker></defs>
        <text x="232" y="60" fontFamily="var(--mono)" fontSize="9" fill="var(--amber)">虚线 = 只监听前一个节点</text>
        <text x="232" y="78" fontFamily="var(--sans)" fontSize="10" fill="var(--ink-soft)">→ 释放/崩溃时只唤醒后一个，避免惊群</text>

        <rect x="20" y="158" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="178" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

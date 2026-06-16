import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const READ = [
  { desc: '读请求：先查 Redis 缓存', a: 'app', b: 'cache' },
  { desc: '缓存命中 → 直接返回（绝大多数请求走这里）', a: 'cache', b: 'app', hit: true },
  { desc: '若未命中 → 回查数据库', a: 'app', b: 'db', miss: true },
  { desc: '把 DB 结果写回缓存（设置过期时间）', a: 'db', b: 'cache' },
  { desc: '返回给应用，下次即可命中', a: 'cache', b: 'app' },
]
const WRITE = [
  { desc: '写请求：先更新数据库', a: 'app', b: 'db' },
  { desc: '再删除缓存（不是更新缓存！）', a: 'app', b: 'cache', del: true },
  { desc: '下次读未命中 → 重新从 DB 加载最新值', a: 'cache', b: 'app' },
]

export default function CacheAside() {
  const [mode, setMode] = useState('read')
  const [step, setStep] = useState(0)
  const steps = mode === 'read' ? READ : WRITE
  const s = steps[Math.min(step, steps.length - 1)]

  const switchMode = (m) => { setMode(m); setStep(0) }

  const controls = (
    <>
      <button className={`fig-btn ${mode === 'read' ? 'active' : ''}`} onClick={() => switchMode('read')}>读流程</button>
      <button className={`fig-btn ${mode === 'write' ? 'active' : ''}`} onClick={() => switchMode('write')}>写流程</button>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, steps.length - 1))}>下一步 ▸</button>
      <span className="fig-note">{`第 ${Math.min(step, steps.length - 1) + 1}/${steps.length} 步`}</span>
    </>
  )

  const node = (id, x, label, color) => {
    const active = s.a === id || s.b === id
    return (
      <g>
        <rect x={x} y="40" width="96" height="56" rx="10" fill={active ? color : 'var(--bg-subtle)'} stroke={active ? color : 'var(--border-strong)'} strokeWidth={active ? 2 : 1} />
        <text x={x + 48} y="73" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={active ? '#ffffff' : 'var(--ink)'}>{label}</text>
      </g>
    )
  }
  const X = { app: 24, cache: 182, db: 340 }

  return (
    <Figure caption="旁路缓存(Cache Aside)是最常用的缓存模式。读：缓存优先、未命中回填；写：先改库、再删缓存。记住写时是「删缓存」而不是「更新缓存」，能避免并发下的脏数据。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Cache Aside 读写流程">
        {node('app', X.app, '应用', 'var(--accent)')}
        {node('cache', X.cache, 'Redis', 'var(--rose)')}
        {node('db', X.db, '数据库', 'var(--green)')}

        {/* 箭头 */}
        {(() => {
          const from = X[s.a] + 48, to = X[s.b] + 48
          const dir = to > from ? 1 : -1
          const y = s.b === 'db' || s.a === 'db' ? 112 : 28
          return (
            <g>
              <line x1={from} y1={y} x2={to} y2={y} stroke={s.del ? 'var(--rose)' : s.hit ? 'var(--green)' : s.miss ? 'var(--amber)' : 'var(--accent)'} strokeWidth="2.5" markerEnd="url(#ca-a)" />
            </g>
          )
        })()}
        <defs>
          <marker id="ca-a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" /></marker>
        </defs>

        <rect x="24" y="150" width="412" height="34" rx="8"
          fill={s.del ? 'var(--rose-soft)' : s.hit ? 'var(--green-soft)' : s.miss ? 'var(--amber-soft)' : 'var(--bg-subtle)'}
          stroke={s.del ? 'var(--rose-line)' : s.hit ? 'var(--green-line)' : s.miss ? 'var(--amber-line)' : 'var(--border)'} />
        <text x="36" y="171" fontFamily="var(--sans)" fontSize="13" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

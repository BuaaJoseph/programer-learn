import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 三大缓存问题 + 防护开关。每种问题展示「请求如何打到 DB」与「防护后如何被挡住」。
const PROBLEMS = {
  penetration: {
    name: '穿透',
    cause: '查一个根本不存在的 key：缓存永远不命中，每次都打到 DB',
    guard: '布隆过滤器拦截 + 缓存空值',
    afterDb: 0,
  },
  breakdown: {
    name: '击穿',
    cause: '单个热点 key 过期瞬间，大量并发同时穿过缓存压向 DB',
    guard: '互斥锁(只放一个去重建) + 逻辑过期',
    afterDb: 1,
  },
  avalanche: {
    name: '雪崩',
    cause: '大量 key 同一时刻集中过期(或 Redis 宕机)，流量整体压垮 DB',
    guard: '过期时间加随机 + 多级缓存 + 熔断限流',
    afterDb: 1,
  },
}

export default function CacheProblem() {
  const [p, setP] = useState('penetration')
  const [guard, setGuard] = useState(false)
  const prob = PROBLEMS[p]
  // 打到 DB 的请求数（示意）：未防护多，防护后大幅减少
  const reqs = 6
  const toDb = guard ? prob.afterDb : reqs

  const controls = (
    <>
      {Object.entries(PROBLEMS).map(([k, v]) => (
        <button key={k} className={`fig-btn ${p === k ? 'active' : ''}`} onClick={() => { setP(k); setGuard(false) }}>
          缓存{v.name}
        </button>
      ))}
      <button className={`fig-btn ${guard ? 'active' : ''}`} onClick={() => setGuard((g) => !g)}>
        {guard ? '✓ 已开防护' : '开启防护'}
      </button>
    </>
  )

  return (
    <Figure caption="穿透/击穿/雪崩本质都是「请求绕过或压垮缓存、直冲数据库」。选问题类型、再点「开启防护」，看打到 DB 的流量如何被挡下。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="缓存三大问题与防护">
        {/* 请求 */}
        <text x="20" y="28" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">并发请求</text>
        {Array.from({ length: reqs }).map((_, i) => (
          <circle key={i} cx={28 + i * 16} cy="44" r="6" fill="var(--accent)" />
        ))}

        {/* 防护层 */}
        <rect x="150" y="26" width="120" height="40" rx="8" fill={guard ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={guard ? 'var(--green)' : 'var(--border-strong)'} strokeDasharray={guard ? '0' : '4 3'} />
        <text x="210" y="50" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={guard ? 'var(--green)' : 'var(--ink-faint)'}>{guard ? '防护层' : '无防护'}</text>

        {/* 缓存 */}
        <rect x="150" y="80" width="120" height="40" rx="8" fill="var(--rose-soft)" stroke="var(--rose-line)" />
        <text x="210" y="104" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--rose)">Redis 缓存</text>

        {/* DB */}
        <rect x="150" y="134" width="120" height="44" rx="8" fill={toDb > 2 ? 'var(--rose)' : 'var(--green-soft)'} stroke={toDb > 2 ? 'var(--rose)' : 'var(--green-line)'} strokeWidth="2" />
        <text x="210" y="154" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill={toDb > 2 ? '#ffffff' : 'var(--green)'}>数据库</text>
        <text x="210" y="170" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill={toDb > 2 ? '#ffffff' : 'var(--ink-soft)'}>打到 DB：{toDb} 个请求</text>

        {/* 流量线 */}
        <line x1="120" y1="44" x2="150" y2="44" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#cp-a)" />
        {toDb > 2 && <line x1="210" y1="120" x2="210" y2="134" stroke="var(--rose)" strokeWidth="3" markerEnd="url(#cp-r)" />}
        <defs>
          <marker id="cp-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--accent)" /></marker>
          <marker id="cp-r" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker>
        </defs>

        {/* 文案 */}
        <rect x="288" y="26" width="158" height="152" rx="10" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="300" y="48" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill="var(--rose)">缓存{prob.name}</text>
        <text x="300" y="70" fontFamily="var(--mono)" fontSize="9.5" fill="var(--ink-faint)">成因</text>
        <foreignObject x="300" y="74" width="138" height="56">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>{prob.cause}</div>
        </foreignObject>
        <text x="300" y="146" fontFamily="var(--mono)" fontSize="9.5" fill="var(--green)">防护</text>
        <foreignObject x="300" y="150" width="138" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>{prob.guard}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

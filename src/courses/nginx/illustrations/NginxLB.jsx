import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STRATS = {
  rr: { label: 'round-robin 轮询', dist: [2, 2, 2], desc: '默认策略，依次轮流分发，绝对均匀。' },
  weight: { label: 'weight 加权', dist: [3, 2, 1], desc: '按 server 权重分配，性能强的多分(weight=3/2/1)。' },
  iphash: { label: 'ip_hash', dist: [6, 0, 0], desc: '按客户端 IP 哈希固定到同一台 → 解决 session 保持(会话粘滞)。' },
  leastconn: { label: 'least_conn', dist: [1, 2, 3], desc: '分给当前连接数最少的，适合长连接/请求耗时不均。' },
}

export default function NginxLB() {
  const [k, setK] = useState('weight')
  const s = STRATS[k]

  const controls = (
    <>
      {Object.entries(STRATS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label.split(' ')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="upstream 里配一组后端，再选负载均衡策略。6 个请求按策略分到 3 台 server，看分配差异：轮询最均匀、加权按性能、ip_hash 保会话、least_conn 看连接数。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="Nginx 负载均衡策略">
        <rect x="20" y="76" width="80" height="40" rx="8" fill="var(--green)" />
        <text x="60" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">Nginx</text>
        {['A', 'B', 'C'].map((sv, i) => {
          const n = s.dist[i]
          return (
            <g key={sv}>
              <line x1="100" y1="96" x2="280" y2={40 + i * 50} stroke="var(--ink-faint)" strokeWidth="1.3" markerEnd="url(#nl-a)" />
              <rect x="280" y={24 + i * 50} width="160" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
              <text x="294" y={45 + i * 50} fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">server {sv}{k === 'weight' ? ` w=${[3, 2, 1][i]}` : ''}</text>
              <text x="430" y={45 + i * 50} textAnchor="end" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">{n} 个</text>
            </g>
          )
        })}
        <defs><marker id="nl-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="164" width="420" height="0" fill="none" />
        <text x="20" y="180" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{s.desc}</text>
      </svg>
    </Figure>
  )
}

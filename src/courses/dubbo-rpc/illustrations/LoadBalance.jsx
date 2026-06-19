import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 6 个请求按不同策略分配到 3 个节点(其中 C 性能较弱/活跃数高)。
const STRATS = {
  random: { label: 'Random 加权随机', dist: [2, 3, 1], desc: '按权重随机选节点。简单、长期均匀，但短期可能不均。' },
  roundrobin: { label: 'RoundRobin 轮询', dist: [2, 2, 2], desc: '按权重依次轮流。绝对均匀，但慢节点也照分，可能被拖累。' },
  leastactive: { label: 'LeastActive 最少活跃', dist: [3, 2, 1], desc: '优先给「当前活跃请求数最少」的节点 → 慢节点自然少分，能者多劳。' },
  consistenthash: { label: 'ConsistentHash 一致性哈希', dist: [6, 0, 0], desc: '相同参数(如同一用户)总落到同一节点 → 利于缓存命中；节点增减只影响小部分。' },
}

export default function LoadBalance() {
  const [k, setK] = useState('leastactive')
  const s = STRATS[k]

  const controls = (
    <>
      {Object.entries(STRATS).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label.split(' ')[0]}</button>
      ))}
    </>
  )

  return (
    <Figure caption="负载均衡决定 6 个请求如何分到 3 个 Provider（C 较弱）。点策略看分配差异：Dubbo 默认 random，最少活跃能避开慢节点，一致性哈希让相同参数固定路由。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Dubbo 负载均衡">
        <text x="20" y="28" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">6 个请求 → 3 个 Provider</text>
        {['A', 'B', 'C'].map((p, i) => {
          const n = s.dist[i]
          return (
            <g key={p}>
              <rect x={40 + i * 140} y="44" width="110" height="48" rx="10" fill="var(--green-soft)" stroke="var(--green-line)" />
              <text x={95 + i * 140} y="66" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="var(--green)">Provider {p}</text>
              <text x={95 + i * 140} y="84" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">{p === 'C' ? '弱节点' : '正常'}</text>
              {/* 分到的请求点 */}
              {Array.from({ length: n }).map((_, r) => (
                <circle key={r} cx={56 + i * 140 + (r % 4) * 22} cy={110 + Math.floor(r / 4) * 20} r="8" fill="var(--accent)" />
              ))}
              <text x={95 + i * 140} y="160" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">{n} 个</text>
            </g>
          )
        })}

        <rect x="20" y="170" width="420" height="24" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <foreignObject x="28" y="172" width="404" height="22">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)' }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

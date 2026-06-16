import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 索引=3主分片，每主1副本，分散到3节点；演示节点宕机后副本顶上。
const [P, R] = ['P', 'R']
// 节点布局：主分片 P0/P1/P2，副本 R0/R1/R2，主副本不同节点
const LAYOUT = [
  { node: 1, shards: [{ t: P, n: 0 }, { t: R, n: 2 }] },
  { node: 2, shards: [{ t: P, n: 1 }, { t: R, n: 0 }] },
  { node: 3, shards: [{ t: P, n: 2 }, { t: R, n: 1 }] },
]

export default function ShardReplica() {
  const [down, setDown] = useState(false)

  const controls = (
    <>
      <button className={`fig-btn ${!down ? 'active' : ''}`} onClick={() => setDown(false)}>正常</button>
      <button className={`fig-btn ${down ? 'active' : ''}`} onClick={() => setDown(true)}>节点3 宕机</button>
      <span className="fig-note">3 主分片 + 每个 1 副本</span>
    </>
  )

  return (
    <Figure caption="索引切成多个主分片(primary)分散到节点实现水平扩展；每个主分片有副本(replica)放在别的节点上。主分片数建索引时定死、不可改；副本可随时调整。节点宕机时副本被提升为主，数据不丢、服务不断。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ES 分片与副本">
        {LAYOUT.map((node, i) => {
          const isDown = down && node.node === 3
          return (
            <g key={node.node}>
              <rect x={20 + i * 150} y="30" width="130" height="120" rx="10" fill={isDown ? 'var(--bg-sunken)' : 'var(--bg-subtle)'} stroke={isDown ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth={isDown ? 2 : 1} strokeDasharray={isDown ? '4 3' : '0'} />
              <text x={85 + i * 150} y="50" textAnchor="middle" fontFamily="var(--display)" fontSize="12" fontWeight="700" fill={isDown ? 'var(--rose)' : 'var(--ink)'}>节点 {node.node}{isDown ? '(挂)' : ''}</text>
              {node.shards.map((sh, j) => {
                const isPrimary = sh.t === P
                // 若节点3挂，它的 P2 由别处 R2(node1) 顶上、R1(node3) 丢了由 P1 的副本重建
                const promoted = down && ((node.node === 1 && sh.t === R && sh.n === 2))
                return (
                  <g key={j}>
                    <rect x={32 + i * 150} y={64 + j * 40} width="106" height="32" rx="6"
                      fill={isDown ? 'var(--bg-sunken)' : promoted ? 'var(--green)' : isPrimary ? 'var(--accent)' : 'var(--accent-soft)'}
                      stroke={isPrimary ? 'var(--accent-strong)' : 'var(--accent-line)'} />
                    <text x={85 + i * 150} y={84 + j * 40} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={isDown ? 'var(--ink-faint)' : (isPrimary || promoted) ? '#ffffff' : 'var(--accent-strong)'}>
                      {promoted ? `P${sh.n}(升主)` : `${sh.t}${sh.n} ${isPrimary ? '主' : '副'}`}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        <rect x="20" y="162" width="420" height="0" fill="none" />
        <text x="20" y="180" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">
          {down ? '节点3 挂了：它上面的 P2 由节点1 的副本 R2 提升为主，集群继续提供完整服务。' : '主分片与其副本分布在不同节点，任一节点挂了都有副本兜底。'}
        </text>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const VIEWS = {
  couple: { label: '直连（耦合）', desc: '订单服务直接调用库存、积分、短信——任一个挂了或变慢，下单就跟着失败/变慢，还得改代码加下游。' },
  decouple: { label: 'MQ（解耦）', desc: '订单只发一条消息到 MQ，下游各自订阅消费。下游挂了消息还在；要加新下游只需多一个消费者，订单代码不动。' },
  peak: { label: '削峰填谷', desc: '秒杀瞬时 10000 QPS 涌入，先进 MQ 排队，DB 按自己能承受的 2000 QPS 匀速消费，避免被打垮。' },
}

export default function MqDecoupling() {
  const [v, setV] = useState('decouple')
  const info = VIEWS[v]

  const controls = (
    <>
      {Object.entries(VIEWS).map(([k, val]) => (
        <button key={k} className={`fig-btn ${v === k ? 'active' : ''}`} onClick={() => setV(k)}>{val.label}</button>
      ))}
    </>
  )

  const down = ['库存', '积分', '短信']

  return (
    <Figure caption="MQ 的三大价值——解耦、异步、削峰——本质都是在上下游之间加一个缓冲区。点上方切换看三种场景。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="MQ 解耦与削峰">
        {v !== 'peak' ? (
          <>
            <rect x="20" y="80" width="80" height="40" rx="8" fill="var(--amber)" />
            <text x="60" y="104" textAnchor="middle" fontFamily="var(--display)" fontSize="13" fontWeight="700" fill="#ffffff">订单</text>
            {v === 'decouple' && (
              <g>
                <rect x="150" y="78" width="90" height="44" rx="8" fill="var(--amber-soft)" stroke="var(--amber-line)" />
                <text x="195" y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--amber)">MQ</text>
                <line x1="100" y1="100" x2="150" y2="100" stroke="var(--amber)" strokeWidth="2" markerEnd="url(#md-a)" />
              </g>
            )}
            {down.map((d, i) => {
              const x = v === 'decouple' ? 300 : 200
              const y = 40 + i * 56
              const fromX = v === 'decouple' ? 240 : 100
              const fromY = 100
              return (
                <g key={d}>
                  <line x1={fromX} y1={fromY} x2={x} y2={y + 16} stroke={v === 'couple' ? 'var(--rose)' : 'var(--green)'} strokeWidth="1.6" markerEnd="url(#md-a)" />
                  <rect x={x} y={y} width="86" height="32" rx="7" fill="var(--bg-subtle)" stroke="var(--border-strong)" />
                  <text x={x + 43} y={y + 20} textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{d}服务</text>
                </g>
              )
            })}
          </>
        ) : (
          <>
            {/* 削峰：高流量进 MQ，匀速出 */}
            <text x="20" y="40" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">瞬时洪峰 10000 QPS</text>
            {Array.from({ length: 10 }).map((_, i) => <circle key={i} cx={26 + i * 11} cy="60" r="4.5" fill="var(--rose)" />)}
            <rect x="150" y="44" width="100" height="40" rx="8" fill="var(--amber-soft)" stroke="var(--amber-line)" />
            <text x="200" y="69" textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fill="var(--amber)">MQ 缓冲</text>
            <line x1="140" y1="60" x2="150" y2="62" stroke="var(--rose)" strokeWidth="2" markerEnd="url(#md-a)" />
            <text x="300" y="69" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">匀速 2000 QPS</text>
            <line x1="250" y1="64" x2="290" y2="64" stroke="var(--green)" strokeWidth="2" markerEnd="url(#md-a)" />
            <rect x="300" y="78" width="120" height="34" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="360" y="100" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--green)">数据库（扛得住）</text>
          </>
        )}
        <defs><marker id="md-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="420" height="38" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="404" height="34">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}>{info.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const MODES = {
  failover: { label: 'Failover', behave: '调 A 失败 → 自动重试别的节点 B/C，直到成功或重试次数用尽。', good: '默认策略，适合读操作；坏处是重试可能放大请求、对非幂等写有风险。', result: '重试 B 成功' },
  failfast: { label: 'Failfast', behave: '调 A 失败 → 立刻抛异常，不重试。', good: '适合非幂等写(如下单)，避免重复提交。', result: '立即失败' },
  failsafe: { label: 'Failsafe', behave: '调 A 失败 → 吞掉异常、返回空结果，只记日志。', good: '适合不重要的旁路操作(如埋点日志)。', result: '忽略异常' },
  failback: { label: 'Failback', behave: '调 A 失败 → 返回，后台定时重发。', good: '适合消息通知类的最终一致场景。', result: '后台补偿' },
  forking: { label: 'Forking', behave: '同时并行调用 B、C 多个节点，谁先返回用谁。', good: '低延迟读、容忍浪费资源的场景。', result: '并行取最快' },
}

export default function ClusterFault() {
  const [k, setK] = useState('failover')
  const m = MODES[k]

  const controls = (
    <>
      {Object.entries(MODES).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  const retried = k === 'failover'
  const parallel = k === 'forking'

  return (
    <Figure caption="当某个 Provider 调用失败时，集群容错策略决定下一步行为。按业务选：读多用 failover，非幂等写用 failfast，旁路用 failsafe。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Dubbo 集群容错">
        {/* consumer */}
        <rect x="20" y="74" width="86" height="44" rx="9" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="63" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--violet)">Consumer</text>

        {/* providers */}
        {['A', 'B', 'C'].map((p, i) => {
          const failed = p === 'A'
          const used = (retried && p === 'B') || (parallel && p !== 'A') || (!retried && !parallel && false)
          const y = 24 + i * 56
          return (
            <g key={p}>
              <rect x="300" y={y} width="120" height="44" rx="9" fill={failed ? 'var(--rose-soft)' : used ? 'var(--green)' : 'var(--bg-subtle)'} stroke={failed ? 'var(--rose)' : used ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={failed || used ? 2 : 1} />
              <text x="360" y={y + 20} textAnchor="middle" fontFamily="var(--display)" fontSize="12" fontWeight="700" fill={failed ? 'var(--rose)' : used ? '#ffffff' : 'var(--ink)'}>Provider {p}</text>
              <text x="360" y={y + 36} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={failed ? 'var(--rose)' : used ? '#ffffff' : 'var(--ink-faint)'}>{failed ? '调用失败 ✕' : used ? '被选用 ✓' : '空闲'}</text>
              <line x1="106" y1="96" x2="300" y2={y + 22}
                stroke={failed ? 'var(--rose)' : used ? 'var(--green)' : 'var(--border)'}
                strokeWidth={failed || used ? 2 : 1}
                strokeDasharray={failed ? '0' : used ? '0' : '4 3'} markerEnd="url(#cf-a)" />
            </g>
          )
        })}
        <defs><marker id="cf-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="150" width="426" height="44" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="152" width="410" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>
            <strong style={{ color: 'var(--violet)' }}>{m.label}：</strong>{m.behave} <span style={{ color: 'var(--ink-soft)' }}>{m.good}</span>
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STRATS = [
  { id: 'wechat', name: '微信支付', desc: '调用微信 SDK 完成支付' },
  { id: 'alipay', name: '支付宝', desc: '调用支付宝 SDK 完成支付' },
  { id: 'card', name: '银行卡', desc: '走银联网关完成支付' },
]

export default function Strategy() {
  const [sel, setSel] = useState('alipay')
  const s = STRATS.find((x) => x.id === sel)

  const controls = (
    <>
      {STRATS.map((x) => (
        <button key={x.id} className={`fig-btn ${sel === x.id ? 'active' : ''}`} onClick={() => setSel(x.id)}>{x.name}</button>
      ))}
      <span className="fig-note">运行时切换策略，无 if-else</span>
    </>
  )

  return (
    <Figure caption="策略模式：把一族可互换的算法各自封装成独立类，运行时按需选择，用多态消灭一长串 if-else。支付方式、促销规则、排序算法都适合。配合工厂/Map 注册可彻底去掉分支。" controls={controls}>
      <svg viewBox="0 0 460 170" width="460" role="img" aria-label="策略模式">
        <rect x="20" y="56" width="100" height="40" rx="9" fill="var(--accent)" />
        <text x="70" y="80" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fontWeight="700" fill="#ffffff">PayContext</text>

        {/* 接口 */}
        <rect x="170" y="56" width="110" height="40" rx="9" fill="var(--violet)" fillOpacity="0.14" stroke="var(--violet)" />
        <text x="225" y="74" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="700" fill="var(--violet)">PayStrategy</text>
        <text x="225" y="88" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-soft)">接口</text>
        <line x1="120" y1="76" x2="170" y2="76" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#st-a)" />

        {STRATS.map((x, i) => {
          const on = x.id === sel
          return (
            <g key={x.id}>
              <rect x="330" y={20 + i * 44} width="110" height="34" rx="7" fill={on ? 'var(--green)' : 'var(--green-soft)'} stroke="var(--green-line)" strokeWidth={on ? 2 : 1} />
              <text x="385" y={41 + i * 44} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fontWeight={on ? '700' : '400'} fill={on ? '#ffffff' : 'var(--green)'}>{x.name}</text>
              <line x1="280" y1="76" x2="330" y2={37 + i * 44} stroke={on ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={on ? 2 : 1} strokeDasharray={on ? '0' : '4 3'} markerEnd="url(#st-a)" />
            </g>
          )
        })}
        <defs><marker id="st-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="124" width="420" height="40" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="148" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">当前策略：<tspan fontWeight="700" fill="var(--accent-strong)">{s.name}</tspan> — {s.desc}（换策略只需注入不同实现，Context 代码不变）</text>
      </svg>
    </Figure>
  )
}

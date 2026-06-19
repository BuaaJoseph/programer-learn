import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const OBSERVERS = ['短信服务', '邮件服务', '积分服务', '日志服务']

export default function Observer() {
  const [notified, setNotified] = useState(false)

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setNotified(true)}>主题发布事件 ▸</button>
      <button className="fig-btn" onClick={() => setNotified(false)}>重置</button>
      <span className="fig-note">一次发布，所有订阅者收到</span>
    </>
  )

  return (
    <Figure caption="观察者模式(发布-订阅)：被观察的「主题」状态变化时，自动通知所有订阅它的「观察者」。一对多、松耦合——主题不关心有谁订阅。如「下单成功」事件触发发短信/加积分/记日志。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="观察者模式">
        <rect x="30" y="60" width="110" height="50" rx="10" fill={notified ? 'var(--accent)' : 'var(--accent-soft)'} stroke="var(--accent-strong)" />
        <text x="85" y="82" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={notified ? '#ffffff' : 'var(--ink)'}>主题 Subject</text>
        <text x="85" y="98" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill={notified ? '#ffffff' : 'var(--ink-soft)'}>订单已支付</text>

        {OBSERVERS.map((o, i) => (
          <g key={o}>
            <rect x="320" y={16 + i * 38} width="120" height="30" rx="7" fill={notified ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={notified ? 'var(--green)' : 'var(--border-strong)'} />
            <text x="380" y={36 + i * 38} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill={notified ? 'var(--green)' : 'var(--ink-soft)'}>{o}{notified ? ' ✓' : ''}</text>
            <line x1="140" y1="85" x2="320" y2={31 + i * 38} stroke={notified ? 'var(--green)' : 'var(--border-strong)'} strokeWidth={notified ? 2 : 1} strokeDasharray={notified ? '0' : '4 3'} markerEnd="url(#ob-a)" />
          </g>
        ))}
        <defs><marker id="ob-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill={notified ? 'var(--green)' : 'var(--ink-faint)'} /></marker></defs>
        {notified && <text x="180" y="150" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">notifyObservers() → 逐个回调 update()</text>}

        <text x="20" y="172" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">Spring 的 ApplicationEvent、MQ 的发布订阅都是这个思想；要新增订阅者，主题代码不用改。</text>
      </svg>
    </Figure>
  )
}

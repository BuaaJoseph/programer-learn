import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const TRIGGERS = {
  reject: '消息被消费者拒绝(basic.nack/reject)且 requeue=false',
  ttl: '消息在队列里超过 TTL 仍未被消费(过期)',
  full: '队列达到最大长度上限，再进来的被挤掉',
}

export default function DeadLetter() {
  const [trig, setTrig] = useState('ttl')
  const [delay, setDelay] = useState(false)

  const controls = (
    <>
      {Object.keys(TRIGGERS).map((k) => (
        <button key={k} className={`fig-btn ${trig === k ? 'active' : ''}`} onClick={() => setTrig(k)}>
          {k === 'reject' ? '被拒绝' : k === 'ttl' ? '过期(TTL)' : '队列满'}
        </button>
      ))}
      <button className={`fig-btn ${delay ? 'active' : ''}`} onClick={() => setDelay((d) => !d)}>{delay ? '✓ 延迟队列玩法' : '看延迟队列玩法'}</button>
    </>
  )

  return (
    <Figure caption="消息被拒绝、过期或队列满，就变成死信，被转投到死信交换机(DLX)指向的死信队列。利用「设 TTL 的普通队列 + DLX」就能实现延迟队列。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="死信队列与延迟队列">
        {/* 业务队列 */}
        <rect x="20" y="40" width="130" height="50" rx="10" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="85" y="62" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--accent-strong)">{delay ? '延迟队列(无消费者)' : '业务队列'}</text>
        <text x="85" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">{delay ? 'TTL=30min' : '正常消费'}</text>

        {/* 触发 */}
        <text x="20" y="112" fontFamily="var(--mono)" fontSize="10" fill="var(--rose)">触发死信：</text>
        <foreignObject x="20" y="116" width="160" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '10.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{delay ? '消息到期(TTL 到) → 变死信' : TRIGGERS[trig]}</div>
        </foreignObject>

        {/* DLX */}
        <rect x="200" y="42" width="80" height="46" rx="8" fill="var(--rose)" />
        <text x="240" y="63" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">DLX</text>
        <text x="240" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">死信交换机</text>
        <line x1="150" y1="64" x2="200" y2="64" stroke="var(--rose)" strokeWidth="2" markerEnd="url(#dl-a)" />
        <text x="175" y="56" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--rose)">死信</text>

        {/* 死信队列 */}
        <rect x="320" y="42" width="120" height="46" rx="8" fill="var(--rose-soft)" stroke="var(--rose-line)" />
        <text x="380" y="63" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--rose)">{delay ? '真正消费队列' : '死信队列'}</text>
        <text x="380" y="78" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-soft)">{delay ? '到点才被消费' : '排查/重试/告警'}</text>
        <line x1="280" y1="64" x2="320" y2="64" stroke="var(--rose)" strokeWidth="2" markerEnd="url(#dl-a)" />
        <defs><marker id="dl-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker></defs>

        <rect x="20" y="162" width="420" height="30" rx="8" fill={delay ? 'var(--violet)' : 'var(--bg-subtle)'} fillOpacity={delay ? 0.12 : 1} stroke={delay ? 'var(--violet)' : 'var(--border)'} />
        <foreignObject x="28" y="164" width="404" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>
            {delay
              ? '延迟队列原理：消息进一个没有消费者、只设了 TTL 的队列；到期变死信，经 DLX 进入真正的消费队列——于是消息被「延迟」了 TTL 那么久才被处理。'
              : '死信常用于：失败重试、人工排查、超时取消订单等。配置 x-dead-letter-exchange 指定 DLX。'}
          </div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

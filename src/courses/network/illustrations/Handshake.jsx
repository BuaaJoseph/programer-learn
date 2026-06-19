import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const OPEN = [
  { desc: '① 客户端发 SYN(seq=x)，进入 SYN_SENT', from: 'c', label: 'SYN seq=x' },
  { desc: '② 服务端回 SYN+ACK(seq=y, ack=x+1)，进入 SYN_RCVD', from: 's', label: 'SYN+ACK' },
  { desc: '③ 客户端回 ACK(ack=y+1)，双方进入 ESTABLISHED，连接建立', from: 'c', label: 'ACK ack=y+1' },
  { desc: '为什么三次？两次无法确认「客户端的接收能力」，且能防止历史失效连接请求被误建立。', from: null },
]
const CLOSE = [
  { desc: '① 客户端发 FIN，进入 FIN_WAIT_1(我没数据要发了)', from: 'c', label: 'FIN' },
  { desc: '② 服务端回 ACK，进入 CLOSE_WAIT(我可能还有数据要发)', from: 's', label: 'ACK' },
  { desc: '③ 服务端数据发完，发 FIN，进入 LAST_ACK', from: 's', label: 'FIN' },
  { desc: '④ 客户端回 ACK，进入 TIME_WAIT(等 2MSL 再关，确保对端收到 ACK)', from: 'c', label: 'ACK' },
]

export default function Handshake() {
  const [mode, setMode] = useState('open')
  const [step, setStep] = useState(0)
  const steps = mode === 'open' ? OPEN : CLOSE
  const s = steps[Math.min(step, steps.length - 1)]

  const sw = (m) => { setMode(m); setStep(0) }
  const controls = (
    <>
      <button className={`fig-btn ${mode === 'open' ? 'active' : ''}`} onClick={() => sw('open')}>三次握手</button>
      <button className={`fig-btn ${mode === 'close' ? 'active' : ''}`} onClick={() => sw('close')}>四次挥手</button>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, steps.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
    </>
  )

  return (
    <Figure caption="TCP 建立连接要三次握手(确认双方收发能力都正常)，释放连接要四次挥手(因为关闭是半双工的，服务端的 ACK 和 FIN 通常要分开发)。点「下一步」逐步看报文往返。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="TCP 握手与挥手">
        <rect x="40" y="20" width="90" height="30" rx="7" fill="var(--accent)" />
        <text x="85" y="40" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">客户端</text>
        <rect x="330" y="20" width="90" height="30" rx="7" fill="var(--green)" />
        <text x="375" y="40" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">服务端</text>
        <line x1="85" y1="50" x2="85" y2="150" stroke="var(--border-strong)" strokeDasharray="3 3" />
        <line x1="375" y1="50" x2="375" y2="150" stroke="var(--border-strong)" strokeDasharray="3 3" />

        {steps.slice(0, step + 1).map((st, idx) => {
          if (!st.from) return null
          const y = 64 + idx * 22
          const ltr = st.from === 'c'
          return (
            <g key={idx}>
              <line x1={ltr ? 85 : 375} y1={y} x2={ltr ? 375 : 85} y2={y + 14} stroke={ltr ? 'var(--accent)' : 'var(--green)'} strokeWidth="2" markerEnd="url(#hs-a)" />
              <text x="230" y={y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill={ltr ? 'var(--accent-strong)' : 'var(--green)'}>{st.label}</text>
            </g>
          )
        })}
        <defs><marker id="hs-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="160" width="420" height="32" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="162" width="404" height="28">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const STEPS = [
  { desc: '① 客户端 ClientHello：支持的 TLS 版本、加密套件、随机数', from: 'c' },
  { desc: '② 服务端 ServerHello + 证书(含公钥) + 随机数', from: 's' },
  { desc: '③ 客户端验证证书(CA 链可信？域名对得上？没过期？)', from: 'c', verify: true },
  { desc: '④ 客户端用公钥加密「预主密钥」发给服务端；双方据此算出同一个对称密钥', from: 'c' },
  { desc: '⑤ 之后用对称密钥加密通信(快)——非对称只用来安全地协商出这把对称钥', from: null, done: true },
]

export default function HttpsHandshake() {
  const [step, setStep] = useState(0)
  const s = STEPS[Math.min(step, STEPS.length - 1)]

  const controls = (
    <>
      <button className="fig-btn" onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}>下一步 ▸</button>
      <button className="fig-btn" onClick={() => setStep(0)}>重来</button>
      <span className="fig-note">{`第 ${Math.min(step, STEPS.length - 1) + 1}/${STEPS.length} 步`}</span>
    </>
  )

  return (
    <Figure caption="HTTPS = HTTP + TLS。难点在于：用非对称加密(公钥加密、私钥解密)安全地协商出一把对称密钥，之后用对称加密高效传输。证书 + CA 解决「公钥到底是不是对方的」这个信任问题。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="HTTPS TLS 握手">
        <rect x="40" y="20" width="90" height="28" rx="7" fill="var(--accent)" />
        <text x="85" y="39" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">客户端</text>
        <rect x="330" y="20" width="90" height="28" rx="7" fill="var(--green)" />
        <text x="375" y="39" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">服务端</text>
        <line x1="85" y1="48" x2="85" y2="150" stroke="var(--border-strong)" strokeDasharray="3 3" />
        <line x1="375" y1="48" x2="375" y2="150" stroke="var(--border-strong)" strokeDasharray="3 3" />

        {STEPS.slice(0, step + 1).map((st, idx) => {
          if (!st.from) return null
          const y = 64 + idx * 20
          const ltr = st.from === 'c'
          return <g key={idx}>
            <line x1={ltr ? 85 : 375} y1={y} x2={ltr ? 375 : 85} y2={y + 12} stroke={st.verify ? 'var(--amber)' : ltr ? 'var(--accent)' : 'var(--green)'} strokeWidth="2" markerEnd="url(#hh-a)" />
          </g>
        })}
        {s.done && <text x="230" y="140" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--green)">🔒 对称加密通信</text>}
        <defs><marker id="hh-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>

        <rect x="20" y="160" width="420" height="34" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="162" width="404" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11.5px var(--sans)', color: 'var(--ink)', lineHeight: 1.3 }}>{s.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 漏桶限流：恒定速率放行，桶满则拒绝/排队。
const RATES = {
  strict: { label: 'burst=0', pass: 3, reject: 3, desc: 'limit_req rate=3r/s 无突发缓冲：超过速率的请求直接 503 拒绝，最平滑但不友好。' },
  burst: { label: 'burst=3', pass: 6, reject: 0, desc: 'burst=3 给一个缓冲队列：突发请求先排队等待匀速放行，体验更好。' },
  nodelay: { label: 'burst+nodelay', pass: 6, reject: 0, desc: 'nodelay：突发请求立即处理(占用桶容量)、不排队等待，兼顾平滑与低延迟。' },
}

export default function RateLimit() {
  const [k, setK] = useState('burst')
  const r = RATES[k]
  const total = 6

  const controls = (
    <>
      {Object.entries(RATES).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
      <span className="fig-note">瞬时来 6 个请求，rate=3r/s</span>
    </>
  )

  return (
    <Figure caption="Nginx 用漏桶算法做限流：limit_req 限请求速率(恒定放行)、limit_conn 限并发连接。burst 给突发一个缓冲队列，nodelay 让突发不排队。是挡在最前面的一道流量防线。" controls={controls}>
      <svg viewBox="0 0 460 190" width="460" role="img" aria-label="Nginx 限流漏桶">
        {/* 进入的请求 */}
        <text x="20" y="30" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">瞬时 6 个请求</text>
        {Array.from({ length: total }).map((_, i) => (
          <circle key={i} cx={26 + i * 18} cy="48" r="6" fill="var(--accent)" />
        ))}

        {/* 漏桶 */}
        <rect x="180" y="36" width="90" height="60" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
        <text x="225" y="60" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">漏桶</text>
        <text x="225" y="76" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-soft)">恒定 3r/s</text>
        <line x1="150" y1="48" x2="180" y2="60" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#rl-a)" />

        {/* 放行 */}
        <rect x="330" y="24" width="110" height="34" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="385" y="45" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--green)">放行 {r.pass}</text>
        <line x1="270" y1="56" x2="330" y2="42" stroke="var(--green)" strokeWidth="2" markerEnd="url(#rl-g)" />

        {/* 拒绝 */}
        <rect x="330" y="74" width="110" height="34" rx="7" fill={r.reject ? 'var(--rose-soft)' : 'var(--bg-sunken)'} stroke={r.reject ? 'var(--rose-line)' : 'var(--border-strong)'} />
        <text x="385" y="95" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={r.reject ? 'var(--rose)' : 'var(--ink-faint)'}>503 拒绝 {r.reject}</text>
        <line x1="270" y1="76" x2="330" y2="90" stroke={r.reject ? 'var(--rose)' : 'var(--border-strong)'} strokeWidth="2" strokeDasharray={r.reject ? '0' : '4 3'} markerEnd="url(#rl-r)" />

        <defs>
          <marker id="rl-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker>
          <marker id="rl-g" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--green)" /></marker>
          <marker id="rl-r" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--rose)" /></marker>
        </defs>

        <rect x="20" y="124" width="420" height="50" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="128" width="404" height="44">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.4 }}>{r.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

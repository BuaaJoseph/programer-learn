import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

export default function ProxyType() {
  const [reverse, setReverse] = useState(true)

  const controls = (
    <>
      <button className={`fig-btn ${!reverse ? 'active' : ''}`} onClick={() => setReverse(false)}>正向代理</button>
      <button className={`fig-btn ${reverse ? 'active' : ''}`} onClick={() => setReverse(true)}>反向代理</button>
      <span className="fig-note">{reverse ? '代理在服务端这侧，客户端只看到 Nginx' : '代理在客户端这侧，服务端只看到代理'}</span>
    </>
  )

  return (
    <Figure caption="正向代理替「客户端」出门(如翻墙、统一出口)，服务端不知道真实客户端；反向代理替「服务端」挡门(如网关/负载均衡)，客户端不知道背后有哪些服务器。Nginx 最常用作反向代理。" controls={controls}>
      <svg viewBox="0 0 460 180" width="460" role="img" aria-label="正向代理 vs 反向代理">
        {reverse ? (
          <>
            <rect x="20" y="70" width="80" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x="60" y="94" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">客户端</text>
            <rect x="170" y="66" width="90" height="48" rx="9" fill="var(--green)" />
            <text x="215" y="86" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">Nginx</text>
            <text x="215" y="102" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">反向代理</text>
            <line x1="100" y1="90" x2="170" y2="90" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#pt-a)" />
            {[40, 90, 140].map((y, i) => (
              <g key={i}>
                <rect x="340" y={y - 14} width="100" height="28" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x="390" y={y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">server {i + 1}</text>
                <line x1="260" y1="90" x2="340" y2={y} stroke="var(--green)" strokeWidth="1.4" markerEnd="url(#pt-a)" />
              </g>
            ))}
            <text x="300" y="150" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-soft)">客户端不知道背后有几台服务器</text>
          </>
        ) : (
          <>
            {[40, 90, 140].map((y, i) => (
              <g key={i}>
                <rect x="20" y={y - 14} width="90" height="28" rx="6" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x="65" y={y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">客户端 {i + 1}</text>
                <line x1="110" y1={y} x2="190" y2="90" stroke="var(--ink-faint)" strokeWidth="1.4" markerEnd="url(#pt-a)" />
              </g>
            ))}
            <rect x="190" y="66" width="90" height="48" rx="9" fill="var(--accent)" />
            <text x="235" y="86" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="#ffffff">代理</text>
            <text x="235" y="102" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="#ffffff">正向代理</text>
            <rect x="350" y="70" width="90" height="40" rx="8" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="395" y="94" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--green)">目标网站</text>
            <line x1="280" y1="90" x2="350" y2="90" stroke="var(--ink-faint)" strokeWidth="1.5" markerEnd="url(#pt-a)" />
            <text x="235" y="150" textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-soft)">目标网站只看到代理的 IP</text>
          </>
        )}
        <defs><marker id="pt-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="var(--ink-faint)" /></marker></defs>
      </svg>
    </Figure>
  )
}

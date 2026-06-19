import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

export default function LocalVsRpc() {
  const [rpc, setRpc] = useState(true)

  const controls = (
    <>
      <button className={`fig-btn ${!rpc ? 'active' : ''}`} onClick={() => setRpc(false)}>本地调用</button>
      <button className={`fig-btn ${rpc ? 'active' : ''}`} onClick={() => setRpc(true)}>RPC 远程调用</button>
      <span className="fig-note">代码长得一样，背后差很多</span>
    </>
  )

  return (
    <Figure caption="RPC 的目标：让你写 userService.getById(1) 就像调本地方法，框架在背后偷偷完成了代理、序列化、网络往返。代码一样，代价不同。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="本地调用 vs RPC">
        <rect x="20" y="16" width="420" height="30" rx="6" fill="var(--bg-code)" stroke="#2c3252" />
        <text x="32" y="36" fontFamily="var(--mono)" fontSize="12" fill="#d8dcec">User u = <tspan fill="#82aaff">userService</tspan>.getById(<tspan fill="#ffb86c">1</tspan>);</text>

        {!rpc ? (
          <>
            <rect x="140" y="80" width="180" height="56" rx="10" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="230" y="104" textAnchor="middle" fontFamily="var(--sans)" fontSize="13" fontWeight="600" fill="var(--green)">同一个 JVM 内</text>
            <text x="230" y="124" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">一次方法调用 · 纳秒级</text>
          </>
        ) : (
          <>
            <rect x="20" y="78" width="110" height="44" rx="8" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="75" y="104" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--green)">Consumer</text>
            <rect x="330" y="78" width="110" height="44" rx="8" fill="var(--green-soft)" stroke="var(--green-line)" />
            <text x="385" y="104" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--green)">Provider</text>
            {['代理', '序列化', '网络', '反序列化'].map((t, i) => (
              <g key={t}>
                <rect x={142 + i * 46} y="84" width="42" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x={163 + i * 46} y="104" textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5" fill="var(--accent-strong)">{t}</text>
              </g>
            ))}
            <line x1="130" y1="100" x2="142" y2="100" stroke="var(--ink-faint)" strokeWidth="1.4" />
            <line x1="326" y1="100" x2="330" y2="100" stroke="var(--ink-faint)" strokeWidth="1.4" />
            <text x="230" y="138" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">跨进程/跨机器 · 毫秒级 · 可能失败</text>
          </>
        )}

        <rect x="20" y="160" width="420" height="30" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="179" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">
          {rpc ? 'RPC：框架用动态代理把「网络调用」伪装成「本地方法」，但要面对序列化开销、网络延迟与失败。' : '本地：直接压栈调用，没有序列化和网络，不会因为网络而失败。'}
        </text>
      </svg>
    </Figure>
  )
}

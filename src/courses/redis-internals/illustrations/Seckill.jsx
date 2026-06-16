import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 对比：非原子的「读-判断-写」会超卖；Lua 脚本把判断+扣减做成一个原子操作则不会。
export default function Seckill() {
  const [atomic, setAtomic] = useState(false)
  // 模拟 3 个并发请求争抢库存 1
  const result = atomic
    ? { stock: 0, success: 1, oversold: 0, note: 'Lua 原子执行：3 个请求串行判断+扣减，只有 1 个成功，库存正好到 0' }
    : { stock: -2, success: 3, oversold: 2, note: '非原子：3 个请求都读到 stock=1 都判断「有货」，各自扣减 → 超卖 2 件！' }

  const controls = (
    <>
      <button className={`fig-btn ${!atomic ? 'active' : ''}`} onClick={() => setAtomic(false)}>非原子(读-判-写)</button>
      <button className={`fig-btn ${atomic ? 'active' : ''}`} onClick={() => setAtomic(true)}>Lua 原子扣减</button>
      <span className="fig-note">初始库存 = 1，3 个请求并发抢</span>
    </>
  )

  return (
    <Figure caption="秒杀超卖的根因是「读库存→判断→扣减」三步非原子，并发下多个请求同时读到有货。把这三步用 Lua 脚本在 Redis 里一次原子执行，就能杜绝超卖。" controls={controls}>
      <svg viewBox="0 0 460 210" width="460" role="img" aria-label="秒杀原子扣减">
        {/* 三个并发请求 */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={20 + i * 150} y="20" width="130" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x={85 + i * 150} y="38" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">请求 {i + 1}</text>
            <text x={85 + i * 150} y="53" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">{atomic ? '排队原子执行' : '同时读到 stock=1'}</text>
          </g>
        ))}

        {/* 库存盒 */}
        <rect x="160" y="86" width="140" height="50" rx="10" fill={result.oversold ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={result.oversold ? 'var(--rose-line)' : 'var(--green-line)'} strokeWidth="2" />
        <text x="230" y="106" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">最终库存 stock</text>
        <text x="230" y="126" textAnchor="middle" fontFamily="var(--display)" fontSize="18" fontWeight="700" fill={result.oversold ? 'var(--rose)' : 'var(--green)'}>{result.stock}</text>

        {/* 结果统计 */}
        <g>
          <rect x="20" y="150" width="200" height="22" rx="5" fill="var(--bg-subtle)" stroke="var(--border)" />
          <text x="30" y="165" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">下单成功：<tspan fontWeight="700">{result.success}</tspan> 单</text>
          <rect x="240" y="150" width="200" height="22" rx="5" fill={result.oversold ? 'var(--rose-soft)' : 'var(--green-soft)'} stroke={result.oversold ? 'var(--rose-line)' : 'var(--green-line)'} />
          <text x="250" y="165" fontFamily="var(--mono)" fontSize="11" fill={result.oversold ? 'var(--rose)' : 'var(--green)'}>超卖：<tspan fontWeight="700">{result.oversold}</tspan> 件</text>
        </g>

        <text x="20" y="194" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{result.note}</text>
      </svg>
    </Figure>
  )
}

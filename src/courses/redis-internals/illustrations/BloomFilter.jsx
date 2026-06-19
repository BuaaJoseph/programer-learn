import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 布隆过滤器：k 个哈希把元素映射到位数组的 k 个位置并置 1；查询时全为 1 才「可能存在」。
const SIZE = 16
// 预先加入的元素占用的位
const ADDED = {
  'user:1001': [2, 7, 11],
  'user:1002': [4, 7, 14],
}
const QUERIES = {
  'user:1001': [2, 7, 11], // 都为1 → 可能存在
  'user:9999': [1, 7, 11], // 位1为0 → 一定不存在
  'user:1002': [4, 7, 14],
}

export default function BloomFilter() {
  const [q, setQ] = useState('user:9999')
  const bits = new Array(SIZE).fill(0)
  Object.values(ADDED).forEach((arr) => arr.forEach((i) => (bits[i] = 1)))
  const qbits = QUERIES[q]
  const allSet = qbits.every((i) => bits[i] === 1)

  const controls = (
    <>
      {Object.keys(QUERIES).map((k) => (
        <button key={k} className={`fig-btn ${q === k ? 'active' : ''}`} onClick={() => setQ(k)}>
          查 {k}
        </button>
      ))}
      <span className="fig-note">已加入：user:1001、user:1002</span>
    </>
  )

  return (
    <Figure caption="布隆过滤器用 k 个哈希函数把元素映射到位数组的 k 个位并置 1。查询时只要有一位是 0，就「一定不存在」；全为 1 才「可能存在」(有小概率误判)。用极小空间挡住大量不存在的 key。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="布隆过滤器">
        <text x="20" y="30" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">位数组 bit array</text>
        {bits.map((b, i) => {
          const checking = qbits.includes(i)
          return (
            <g key={i}>
              <rect x={20 + i * 26} y="40" width="22" height="26" rx="4"
                fill={b ? 'var(--rose)' : 'var(--bg-sunken)'} stroke={checking ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={checking ? 2.5 : 1} />
              <text x={31 + i * 26} y="58" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={b ? '#ffffff' : 'var(--ink-faint)'}>{b}</text>
              <text x={31 + i * 26} y="80" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="var(--ink-faint)">{i}</text>
            </g>
          )
        })}

        <text x="20" y="108" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">
          hash(<tspan fill="var(--accent-strong)">{q}</tspan>) → 位 [{qbits.join(', ')}]
        </text>

        <rect x="20" y="124" width="420" height="48" rx="10"
          fill={allSet ? 'var(--amber-soft)' : 'var(--green-soft)'} stroke={allSet ? 'var(--amber-line)' : 'var(--green-line)'} />
        <text x="36" y="146" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={allSet ? 'var(--amber)' : 'var(--green)'}>
          {allSet ? '这些位全为 1 → 可能存在（放行去查缓存/DB）' : '存在为 0 的位 → 一定不存在（直接拦截，挡住穿透）'}
        </text>
        <text x="36" y="164" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-soft)">
          {allSet ? '注意：可能是误判(false positive)，但绝不会漏判已存在的元素。' : '省去一次无谓的缓存/DB 查询。'}
        </text>
      </svg>
    </Figure>
  )
}

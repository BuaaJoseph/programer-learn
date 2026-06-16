import { useState } from 'react'
import Figure from './Figure.jsx'

// 演示 KV cache：逐步生成 token，对比「无缓存(每步重算全部)」与「有缓存(只算新 token)」的计算量。
const TOKENS = ['深', '度', '学', '习', '很', '有', '趣']

export default function KVCacheViz() {
  const [n, setN] = useState(3) // 已生成的 token 数
  const [cache, setCache] = useState(true)

  const next = () => setN((v) => Math.min(v + 1, TOKENS.length))
  const reset = () => setN(3)

  // 本步计算量：无缓存=对前 n 个 token 都算 K/V；有缓存=只算第 n 个
  const stepCost = cache ? 1 : n
  // 累计计算量
  let total = 0
  for (let i = 3; i <= n; i++) total += cache ? 1 : i

  const controls = (
    <>
      <button className="fig-btn" onClick={next}>生成下一个 token ▸</button>
      <button className="fig-btn" onClick={reset}>重置</button>
      <button className={`fig-btn ${cache ? 'active' : ''}`} onClick={() => setCache((c) => !c)}>
        {cache ? '✓ KV Cache 开' : 'KV Cache 关'}
      </button>
    </>
  )

  return (
    <Figure caption="生成第 N 个 token 本需要它与前面所有 token 做注意力。无缓存时每步都重算全部 token 的 K/V(O(n²))；KV cache 把已算过的 K/V 存下来，每步只算新 token——代价是显存随长度线性增长。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="KV Cache 演示">
        {TOKENS.map((t, i) => {
          const generated = i < n
          const isNew = i === n - 1
          // 是否在本步参与计算
          const computing = generated && (cache ? isNew : true) && n <= TOKENS.length
          const cached = generated && cache && !isNew
          return (
            <g key={i}>
              <rect x={20 + i * 60} y="40" width="50" height="44" rx="8"
                fill={!generated ? 'var(--bg-sunken)' : computing ? 'var(--accent)' : cached ? 'var(--green-soft)' : 'var(--accent-soft)'}
                stroke={!generated ? 'var(--border-strong)' : computing ? 'var(--accent-strong)' : cached ? 'var(--green-line)' : 'var(--accent-line)'}
                strokeWidth={computing ? 2.5 : 1} />
              <text x={45 + i * 60} y="60" textAnchor="middle" fontFamily="var(--display)" fontSize="16" fontWeight="700"
                fill={computing ? '#ffffff' : !generated ? 'var(--ink-faint)' : 'var(--ink)'}>{t}</text>
              <text x={45 + i * 60} y="77" textAnchor="middle" fontFamily="var(--mono)" fontSize="8"
                fill={computing ? '#ffffff' : 'var(--ink-faint)'}>
                {!generated ? '未生成' : computing ? '算K/V' : cached ? '命中缓存' : '重算'}
              </text>
            </g>
          )
        })}

        <rect x="20" y="104" width="210" height="36" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="32" y="120" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">本步计算 K/V 的 token 数</text>
        <text x="32" y="135" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={cache ? 'var(--green)' : 'var(--rose)'}>{stepCost}</text>

        <rect x="244" y="104" width="196" height="36" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <text x="256" y="120" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">从第4个起累计计算量</text>
        <text x="256" y="135" fontFamily="var(--display)" fontSize="14" fontWeight="700" fill={cache ? 'var(--green)' : 'var(--rose)'}>{total}</text>

        <rect x="20" y="154" width="420" height="32" rx="8"
          fill={cache ? 'var(--green-soft)' : 'var(--rose-soft)'} stroke={cache ? 'var(--green-line)' : 'var(--rose-line)'} />
        <text x="32" y="174" fontFamily="var(--sans)" fontSize="12.5" fill={cache ? 'var(--green)' : 'var(--rose)'}>
          {cache ? 'KV Cache：每步只算 1 个新 token，避免重复计算，代价是缓存占显存' : '无缓存：每步重算全部，计算量随序列长度成平方增长'}
        </text>
      </svg>
    </Figure>
  )
}

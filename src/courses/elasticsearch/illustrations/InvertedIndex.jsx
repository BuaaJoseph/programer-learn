import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 文档 → 分词 → 倒排索引；查询时直接查词拿文档列表。
const DOCS = [
  { id: 1, text: '苹果 手机 好用' },
  { id: 2, text: '苹果 很 好吃' },
  { id: 3, text: '手机 续航 好' },
]
const INDEX = {
  苹果: [1, 2], 手机: [1, 3], 好用: [1], 好吃: [2], 续航: [3], 好: [3], 很: [2],
}

export default function InvertedIndex() {
  const [q, setQ] = useState('苹果')
  const hits = INDEX[q] || []

  const controls = (
    <>
      {['苹果', '手机', '好吃'].map((w) => (
        <button key={w} className={`fig-btn ${q === w ? 'active' : ''}`} onClick={() => setQ(w)}>搜「{w}」</button>
      ))}
      <span className="fig-note">查词 → 直接拿到文档列表，无需扫全表</span>
    </>
  )

  return (
    <Figure caption="数据库 LIKE %词% 要逐行扫描；ES 把文档分词后建「词 → 文档列表」的倒排索引，搜索时直接用词查到文档 id 列表(再求交集)——这就是快几个数量级的原因。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="倒排索引">
        {/* docs */}
        <text x="20" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">原始文档</text>
        {DOCS.map((d, i) => {
          const hit = hits.includes(d.id)
          return (
            <g key={d.id}>
              <rect x="20" y={32 + i * 38} width="150" height="30" rx="6" fill={hit ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={hit ? 'var(--green)' : 'var(--border)'} />
              <text x="30" y={51 + i * 38} fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">doc{d.id}: {d.text}</text>
            </g>
          )
        })}

        {/* inverted index */}
        <text x="220" y="24" fontFamily="var(--mono)" fontSize="10" fill="var(--accent-strong)">倒排索引(词 → 文档)</text>
        {Object.entries(INDEX).slice(0, 5).map(([term, ids], i) => {
          const sel = term === q
          return (
            <g key={term}>
              <rect x="220" y={32 + i * 30} width="220" height="24" rx="5" fill={sel ? 'var(--accent)' : 'var(--bg-subtle)'} stroke={sel ? 'var(--accent-strong)' : 'var(--border)'} />
              <text x="232" y={48 + i * 30} fontFamily="var(--mono)" fontSize="11" fontWeight={sel ? '700' : '400'} fill={sel ? '#ffffff' : 'var(--ink)'}>{term}</text>
              <text x="300" y={48 + i * 30} fontFamily="var(--mono)" fontSize="11" fill={sel ? '#ffffff' : 'var(--ink-soft)'}>→ [{ids.join(', ')}]</text>
            </g>
          )
        })}

        <rect x="20" y="178" width="420" height="0" fill="none" />
        <text x="20" y="194" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">搜「{q}」→ 命中文档 {hits.length ? hits.map((h) => 'doc' + h).join('、') : '无'}</text>
      </svg>
    </Figure>
  )
}

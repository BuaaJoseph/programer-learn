import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

const QUERIES = {
  match: { label: 'match', analyze: true, exact: false, desc: 'match 会对查询词分词，再去倒排索引匹配——全文检索用它(如搜「苹果手机」会拆成「苹果」「手机」)。' },
  term: { label: 'term', analyze: false, exact: true, desc: 'term 不分词、精确匹配原始词项——用于 keyword、状态、ID 等(注意：对 text 字段用 term 常常搜不到)。' },
  bool: { label: 'bool', analyze: true, exact: false, desc: 'bool 组合多个条件：must(且/参与打分)、should(或)、filter(过滤·不打分·可缓存)、must_not(非)。' },
}

export default function QueryDsl() {
  const [k, setK] = useState('match')
  const q = QUERIES[k]

  const controls = (
    <>
      {Object.entries(QUERIES).map(([key, v]) => (
        <button key={key} className={`fig-btn ${k === key ? 'active' : ''}`} onClick={() => setK(key)}>{v.label}</button>
      ))}
    </>
  )

  const codes = {
    match: 'GET /goods/_search\n{ "query": { "match": { "title": "苹果手机" } } }',
    term: 'GET /goods/_search\n{ "query": { "term": { "status": "on_sale" } } }',
    bool: 'GET /goods/_search\n{ "query": { "bool": {\n  "must":   [ { "match": { "title": "手机" } } ],\n  "filter": [ { "range": { "price": { "lte": 5000 } } } ]\n} } }',
  }

  return (
    <Figure caption="ES 查询用 Query DSL(JSON)。最常考的是 match(分词、全文) vs term(不分词、精确)的区别，以及 bool 如何用 must/should/filter 组合条件。选下面看差异。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="ES Query DSL">
        <g>
          <rect x="20" y="20" width="135" height="30" rx="6" fill={q.analyze ? 'var(--green-soft)' : 'var(--bg-sunken)'} stroke={q.analyze ? 'var(--green)' : 'var(--border-strong)'} />
          <text x="87" y="39" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={q.analyze ? 'var(--green)' : 'var(--ink-faint)'}>{q.analyze ? '✓ 会分词' : '✗ 不分词'}</text>
          <rect x="165" y="20" width="135" height="30" rx="6" fill={q.exact ? 'var(--accent-soft)' : 'var(--bg-sunken)'} stroke={q.exact ? 'var(--accent)' : 'var(--border-strong)'} />
          <text x="232" y="39" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={q.exact ? 'var(--accent-strong)' : 'var(--ink-faint)'}>{q.exact ? '精确匹配' : '相关性匹配'}</text>
        </g>

        <rect x="20" y="60" width="420" height="76" rx="8" fill="var(--bg-code)" stroke="#2c3252" />
        <foreignObject x="30" y="66" width="404" height="66">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '11px var(--mono)', color: '#d8dcec', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{codes[k]}</div>
        </foreignObject>

        <rect x="20" y="146" width="420" height="48" rx="8" fill="var(--bg-subtle)" stroke="var(--border)" />
        <foreignObject x="28" y="150" width="404" height="42">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ font: '12px var(--sans)', color: 'var(--ink)', lineHeight: 1.35 }}><strong style={{ color: 'var(--accent-strong)' }}>{q.label}：</strong>{q.desc}</div>
        </foreignObject>
      </svg>
    </Figure>
  )
}

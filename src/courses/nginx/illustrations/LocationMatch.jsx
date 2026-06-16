import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// location 优先级：= 精确 > ^~ 前缀(不再正则) > ~ ~* 正则(按顺序) > 普通前缀(最长)
const LOCATIONS = [
  { sel: '= /', type: '精确匹配', prio: 1 },
  { sel: '^~ /static/', type: '前缀(优先,不再查正则)', prio: 2 },
  { sel: '~ \\.(gif|jpg)$', type: '正则(区分大小写)', prio: 3 },
  { sel: '/', type: '普通前缀(兜底)', prio: 4 },
]
const URLS = {
  '/': 0,
  '/static/app.js': 1,
  '/img/a.jpg': 2,
  '/api/users': 3,
}

export default function LocationMatch() {
  const [url, setUrl] = useState('/static/app.js')
  const matched = URLS[url]

  const controls = (
    <>
      {Object.keys(URLS).map((u) => (
        <button key={u} className={`fig-btn ${url === u ? 'active' : ''}`} onClick={() => setUrl(u)}>{u}</button>
      ))}
    </>
  )

  return (
    <Figure caption="一个请求进来，Nginx 在 location 里按优先级挑规则：= 精确 > ^~ 前缀(命中就不再查正则) > ~/~* 正则(按书写顺序) > 普通前缀(最长者胜)。选不同 URL 看命中哪条。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="Nginx location 匹配">
        <text x="20" y="26" fontFamily="var(--mono)" fontSize="11" fill="var(--accent-strong)">请求 URL：{url}</text>
        {LOCATIONS.map((l, i) => {
          const hit = matched === i
          return (
            <g key={i}>
              <rect x="20" y={38 + i * 34} width="420" height="28" rx="6" fill={hit ? 'var(--green-soft)' : 'var(--bg-subtle)'} stroke={hit ? 'var(--green)' : 'var(--border)'} strokeWidth={hit ? 2 : 1} />
              <text x="32" y={57 + i * 34} fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill="var(--ink)">location {l.sel}</text>
              <text x="240" y={57 + i * 34} fontFamily="var(--sans)" fontSize="10" fill="var(--ink-soft)">{l.type}</text>
              <text x="430" y={57 + i * 34} textAnchor="end" fontFamily="var(--mono)" fontSize="11" fontWeight="700" fill={hit ? 'var(--green)' : 'var(--ink-faint)'}>{hit ? '✓ 命中' : ''}</text>
            </g>
          )
        })}
        <rect x="20" y="180" width="420" height="0" fill="none" />
        <text x="20" y="194" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">优先级：= ＞ ^~ ＞ ~ / ~* ＞ 普通前缀（最长匹配）</text>
      </svg>
    </Figure>
  )
}

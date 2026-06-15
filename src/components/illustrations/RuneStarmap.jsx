import { useState } from 'react'
import Figure from './Figure.jsx'

// 分词 / 词向量 双视图。
const TOKENS = ['模型', '把', '文字', '切成', 'token']
const POINTS = [
  { w: '国王', x: 120, y: 70 },
  { w: '女王', x: 150, y: 110 },
  { w: '男人', x: 320, y: 80 },
  { w: '女人', x: 350, y: 120 },
  { w: '苹果', x: 250, y: 190 },
]

export default function RuneStarmap() {
  const [view, setView] = useState('token')

  const controls = (
    <>
      <button className={`fig-btn ${view === 'token' ? 'active' : ''}`} onClick={() => setView('token')}>
        分词视图
      </button>
      <button className={`fig-btn ${view === 'vector' ? 'active' : ''}`} onClick={() => setView('vector')}>
        词向量视图
      </button>
      <span className="fig-note">{view === 'token' ? '一句话被切成 token' : 'token → 向量空间坐标'}</span>
    </>
  )

  return (
    <Figure caption="模型先把文字切成 token，再把每个 token 查成一串数字向量；语义相近的词，向量也相近。" controls={controls}>
      <svg viewBox="0 0 460 240" width="460" role="img" aria-label="分词与词向量">
        {view === 'token' ? (
          <>
            <text x="20" y="40" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">
              原文 → token 序列
            </text>
            {TOKENS.map((t, i) => (
              <g key={i} transform={`translate(${20 + i * 88} 60)`}>
                <rect width="78" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x="39" y="25" textAnchor="middle" fontFamily="var(--display)" fontSize="14" fill="var(--ink)">
                  {t}
                </text>
                <text x="39" y="118" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-faint)">
                  #{1000 + i * 37}
                </text>
              </g>
            ))}
            <text x="20" y="180" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
              每个 token 对应词表里的一个编号
            </text>
          </>
        ) : (
          <>
            <line x1="30" y1="210" x2="430" y2="210" stroke="var(--border-strong)" />
            <line x1="40" y1="30" x2="40" y2="215" stroke="var(--border-strong)" />
            <line x1="120" y1="70" x2="150" y2="110" stroke="var(--accent-line)" strokeDasharray="4 3" />
            <line x1="320" y1="80" x2="350" y2="120" stroke="var(--accent-line)" strokeDasharray="4 3" />
            {POINTS.map((p) => (
              <g key={p.w}>
                <circle cx={p.x} cy={p.y} r="7" fill="var(--accent)" />
                <text x={p.x + 11} y={p.y + 4} fontFamily="var(--display)" fontSize="13" fill="var(--ink)">
                  {p.w}
                </text>
              </g>
            ))}
            <text x="30" y="232" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">
              国王 − 男人 + 女人 ≈ 女王（向量可做算术）
            </text>
          </>
        )}
      </svg>
    </Figure>
  )
}

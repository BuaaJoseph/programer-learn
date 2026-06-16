import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 跳表查找：多层索引，从最高层开始「能跳就跳」，逐层下降逼近目标。
const NODES = [10, 23, 37, 48, 55, 62, 78, 90]
// 每个节点的层高（简化固定，营造跳表层次）
const LEVELS = [1, 2, 1, 3, 1, 2, 1, 2]
const TARGETS = [55, 78, 23]

export default function SkipList() {
  const [target, setTarget] = useState(55)
  const xs = NODES.map((_, i) => 56 + i * 48)
  const targetIdx = NODES.indexOf(target)

  // 简化的查找路径：高层快速逼近，最后一层命中
  const controls = (
    <>
      {TARGETS.map((t) => (
        <button key={t} className={`fig-btn ${target === t ? 'active' : ''}`} onClick={() => setTarget(t)}>
          查 {t}
        </button>
      ))}
      <span className="fig-note">ZSet 用跳表：O(log N) 找到分数、支持范围/排名</span>
    </>
  )

  const maxLv = 3
  return (
    <Figure caption="跳表在原始链表上叠加多层「快速通道」。查找从最高层开始，能跳就跳、跳过头就下降一层，平均 O(log N)——这正是 ZSet 排行榜按分数排序与范围查询的底座。" controls={controls}>
      <svg viewBox="0 0 460 200" width="460" role="img" aria-label="跳表查找">
        {/* 各层 */}
        {[3, 2, 1].map((lv, li) => {
          const y = 30 + li * 42
          return (
            <g key={lv}>
              <text x="14" y={y + 5} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">L{lv}</text>
              <line x1="40" y1={y} x2="440" y2={y} stroke="var(--border)" />
              {NODES.map((n, i) => {
                if (LEVELS[i] < lv) return null
                const hit = n === target
                return (
                  <g key={i}>
                    <circle cx={xs[i]} cy={y} r="11" fill={hit ? 'var(--rose)' : 'var(--rose-soft)'} stroke={hit ? 'var(--rose)' : 'var(--rose-line)'} />
                    <text x={xs[i]} y={y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fontWeight={hit ? '700' : '400'} fill={hit ? '#ffffff' : 'var(--ink)'}>{n}</text>
                  </g>
                )
              })}
            </g>
          )
        })}
        {/* 命中标注 */}
        <rect x="40" y="158" width="400" height="30" rx="7" fill="var(--green-soft)" stroke="var(--green-line)" />
        <text x="52" y="178" fontFamily="var(--mono)" fontSize="12" fill="var(--green)">
          ZRANK 得到「{target}」的排名 = 第 {targetIdx + 1} 名（从高层快速逼近，再下沉命中）
        </text>
      </svg>
    </Figure>
  )
}

import AlgoPlayer from './AlgoPlayer.jsx'
import { SORT_BUILDERS, SORT_LABELS } from './sortFrames.js'

// 排序动画：柱状图播放四种排序的执行过程。
// 颜色含义：灰=普通，橙=正在比较，红=正在交换/移动，紫=基准 pivot，绿=已就位。
const COLORS = {
  default: '#b9c2d4',
  cmp: 'var(--amber)',
  swap: 'var(--rose)',
  write: 'var(--accent)',
  pivot: 'var(--violet)',
  key: 'var(--amber)',
  sorted: 'var(--green)',
}

function renderBars(frame) {
  const { arr, roles, sorted, pointers } = frame
  const n = arr.length
  const W = 460, baseY = 168, maxH = 120, padX = 24
  const slot = (W - padX * 2) / n
  const barW = Math.min(slot - 8, 40)
  const maxVal = Math.max(...arr)
  const ptrByIndex = {}
  ;(pointers || []).forEach((p) => { ptrByIndex[p.i] = (ptrByIndex[p.i] ? ptrByIndex[p.i] + '/' : '') + p.label })

  return (
    <g fontFamily="var(--mono)">
      {arr.map((v, i) => {
        const h = Math.max(10, (v / maxVal) * maxH)
        const x = padX + i * slot + (slot - barW) / 2
        const y = baseY - h
        let role = roles[i]
        if (!role && sorted?.has(i)) role = 'sorted'
        const fill = COLORS[role] || COLORS.default
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill={fill} />
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">{v}</text>
            <text x={x + barW / 2} y={baseY + 13} textAnchor="middle" fontSize="8.5" fill="var(--ink-faint)">{i}</text>
            {ptrByIndex[i] && (
              <text x={x + barW / 2} y={baseY + 28} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--accent-strong)">▲{ptrByIndex[i]}</text>
            )}
          </g>
        )
      })}
      <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="var(--border-strong)" strokeWidth="1" />
    </g>
  )
}

const DEFAULT_DATA = [5, 2, 8, 1, 9, 3, 7, 4]

export default function SortPlayer({ algo = 'insertion', data = DEFAULT_DATA, caption }) {
  const frames = (SORT_BUILDERS[algo] || SORT_BUILDERS.insertion)(data)
  return (
    <AlgoPlayer
      frames={frames}
      renderFrame={renderBars}
      ariaLabel={`${SORT_LABELS[algo]}动画`}
      caption={caption || `${SORT_LABELS[algo]}：橙=比较，红=交换/移动，紫=基准，绿=已就位。点 ▶ 看数据如何一步步变得有序。`}
    />
  )
}

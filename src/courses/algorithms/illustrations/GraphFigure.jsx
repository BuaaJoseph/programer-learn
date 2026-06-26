import AlgoPlayer from './AlgoPlayer.jsx'
import { GRAPH, GRAPH_EDGES, GRAPH_BUILDERS, GRAPH_LABELS } from './graphFrames.js'

// 图遍历动画：高亮当前节点与已访问集合，下方显示访问序列与队列/递归栈。
function renderGraph(frame) {
  const { current, visited, frontier, frontierKind } = frame
  const visitedSet = new Set(visited)
  const frontierSet = new Set(frontier)
  const order = new Map(visited.map((id, i) => [id, i + 1]))

  return (
    <g fontFamily="var(--mono)">
      <g stroke="var(--border-strong)" strokeWidth="1.6">
        {GRAPH_EDGES.map(([a, b], i) => (
          <line key={i} x1={GRAPH.nodes[a].x} y1={GRAPH.nodes[a].y} x2={GRAPH.nodes[b].x} y2={GRAPH.nodes[b].y} />
        ))}
      </g>
      {Object.entries(GRAPH.nodes).map(([id, n]) => {
        const isCur = id === current
        const isVisited = visitedSet.has(id)
        const inFrontier = frontierSet.has(id) && !isVisited
        const fill = isCur ? 'var(--amber)' : isVisited ? 'var(--green)' : inFrontier ? 'var(--accent-soft)' : 'var(--bg)'
        const stroke = isCur ? 'var(--amber)' : isVisited ? 'var(--green)' : inFrontier ? 'var(--accent)' : 'var(--border-strong)'
        const text = isCur || isVisited ? '#fff' : 'var(--ink)'
        return (
          <g key={id}>
            <circle cx={n.x} cy={n.y} r="19" fill={fill} stroke={stroke} strokeWidth="2" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={text}>{id}</text>
            {order.has(id) && <circle cx={n.x + 16} cy={n.y - 16} r="8" fill="var(--accent)" />}
            {order.has(id) && <text x={n.x + 16} y={n.y - 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{order.get(id)}</text>}
          </g>
        )
      })}
      <text x="20" y="206" fontSize="10" fill="var(--ink-soft)">访问序列：</text>
      <text x="86" y="206" fontSize="12" fontWeight="700" fill="var(--green)">{visited.join('  →  ') || '—'}</text>
      <text x="20" y="228" fontSize="10" fill="var(--ink-soft)">{frontierKind}：</text>
      <g>
        {(frontier || []).map((id, i) => (
          <g key={i}>
            <rect x={70 + i * 28} y={218} width="22" height="16" rx="3" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x={81 + i * 28} y={230} textAnchor="middle" fontSize="10" fill="var(--accent-strong)">{id}</text>
          </g>
        ))}
        {(!frontier || frontier.length === 0) && <text x="70" y="230" fontSize="10" fill="var(--ink-faint)">空</text>}
      </g>
    </g>
  )
}

export default function GraphPlayer({ mode = 'bfs', start = 'A', caption }) {
  const frames = (GRAPH_BUILDERS[mode] || GRAPH_BUILDERS.bfs)(start)
  const def = mode === 'bfs'
    ? 'BFS 用队列，像水波一样一圈圈扩散：橙=当前，绿=已访问，蓝边=已发现待访问。'
    : 'DFS 用递归栈，一条路扎到底再回退：橙=当前，绿=已访问，下方是「来时的路」。'
  return (
    <AlgoPlayer
      frames={frames}
      renderFrame={renderGraph}
      height={244}
      ariaLabel={`${GRAPH_LABELS[mode]}动画`}
      caption={caption || def}
    />
  )
}

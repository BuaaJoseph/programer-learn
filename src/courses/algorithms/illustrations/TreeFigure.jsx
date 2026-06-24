import AlgoPlayer from './AlgoPlayer.jsx'
import { TREE, EDGES, TREE_BUILDERS, TREE_LABELS } from './treeFrames.js'

// 二叉树遍历动画：高亮「当前访问」节点，下方实时显示访问序列与辅助结构（递归栈/队列/栈）。
function renderTree(frame) {
  const { current, visited, aux, auxKind } = frame
  const visitedSet = new Set(visited)
  const order = new Map(visited.map((id, i) => [id, i + 1]))

  return (
    <g fontFamily="var(--mono)">
      {/* 连线 */}
      <g stroke="var(--border-strong)" strokeWidth="1.6">
        {EDGES.map(([a, b], i) => (
          <line key={i} x1={TREE.nodes[a].x} y1={TREE.nodes[a].y} x2={TREE.nodes[b].x} y2={TREE.nodes[b].y} />
        ))}
      </g>
      {/* 节点 */}
      {Object.entries(TREE.nodes).map(([id, n]) => {
        const isCur = +id === current
        const isVisited = visitedSet.has(+id)
        const fill = isCur ? 'var(--amber)' : isVisited ? 'var(--green)' : 'var(--bg)'
        const stroke = isCur ? 'var(--amber)' : isVisited ? 'var(--green)' : 'var(--border-strong)'
        const text = isCur || isVisited ? '#fff' : 'var(--ink)'
        return (
          <g key={id}>
            <circle cx={n.x} cy={n.y} r="18" fill={fill} stroke={stroke} strokeWidth="2" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={text}>{n.v}</text>
            {order.has(+id) && (
              <circle cx={n.x + 15} cy={n.y - 15} r="8" fill="var(--accent)" />
            )}
            {order.has(+id) && (
              <text x={n.x + 15} y={n.y - 11} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{order.get(+id)}</text>
            )}
          </g>
        )
      })}
      {/* 访问序列 */}
      <text x="20" y="196" fontSize="10" fill="var(--ink-soft)">访问序列：</text>
      <text x="86" y="196" fontSize="12" fontWeight="700" fill="var(--green)">
        {visited.map((id) => TREE.nodes[id].v).join('  →  ') || '—'}
      </text>
      {/* 辅助结构 */}
      <text x="20" y="220" fontSize="10" fill="var(--ink-soft)">{auxKind}：</text>
      <g>
        {(aux || []).map((id, i) => (
          <g key={i}>
            <rect x={70 + i * 30} y={210} width="24" height="16" rx="3" fill="var(--accent-soft)" stroke="var(--accent-line)" />
            <text x={82 + i * 30} y={222} textAnchor="middle" fontSize="10" fill="var(--accent-strong)">{TREE.nodes[id].v}</text>
          </g>
        ))}
        {(!aux || aux.length === 0) && <text x="70" y="222" fontSize="10" fill="var(--ink-faint)">空</text>}
      </g>
    </g>
  )
}

const CAPTIONS = {
  preorder: '先序：到一个节点先输出它（根），再依次进入左、右子树。橙=当前节点，绿=已访问，角标=访问次序。',
  inorder: '中序：先把左子树走完，回到节点时才输出它，再进右子树。二叉搜索树的中序结果是升序。',
  postorder: '后序：左右子树都处理完，最后才输出根。适合「先处理孩子再处理自己」的场景。',
  levelorder: '层序(BFS)：用队列一层一层访问。看右下角队列怎么先进先出。',
  dfs: 'DFS：用栈实现，一条路深入到底再回头。看栈怎么后进先出。',
}

export default function TreePlayer({ order = 'preorder', caption }) {
  const frames = (TREE_BUILDERS[order] || TREE_BUILDERS.preorder)()
  return (
    <AlgoPlayer
      frames={frames}
      renderFrame={renderTree}
      height={236}
      ariaLabel={`${TREE_LABELS[order]}动画`}
      caption={caption || CAPTIONS[order]}
    />
  )
}

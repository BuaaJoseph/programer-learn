import { useState } from 'react'
import Figure from '@/components/illustrations/Figure.jsx'

// 数据结构静态/轻交互图解合集。每个组件就是一张讲解用的图。

// ========== 数组：连续内存 + O(1) 随机访问 ==========
export function ArrayMemory() {
  const [sel, setSel] = useState(3)
  const data = [12, 25, 7, 40, 18, 33]
  const base = 1000
  return (
    <Figure
      caption="数组在内存里是一整块连续空间。知道首地址和下标，地址 = 首地址 + 下标 × 元素大小，一步算出，所以随机访问是 O(1)。"
      controls={<>
        {data.map((_, i) => (
          <button key={i} className={`fig-btn ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>a[{i}]</button>
        ))}
        <span className="fig-note">地址 = {base} + {sel}×4 = {base + sel * 4}</span>
      </>}
    >
      <svg viewBox="0 0 460 150" width="460" fontFamily="var(--mono)">
        {data.map((v, i) => {
          const x = 24 + i * 70
          const on = i === sel
          return (
            <g key={i}>
              <rect x={x} y={44} width="62" height="46" rx="4" fill={on ? 'var(--accent-soft)' : 'var(--bg)'} stroke={on ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth={on ? 2 : 1.2} />
              <text x={x + 31} y={73} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--ink)">{v}</text>
              <text x={x + 31} y={34} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">下标 {i}</text>
              <text x={x + 31} y={106} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">{base + i * 4}</text>
            </g>
          )
        })}
        <text x="24" y="128" fontSize="10" fill="var(--ink-faint)">连续地址，每格 4 字节 →</text>
      </svg>
    </Figure>
  )
}

// ========== 链表：分散节点 + next 指针 ==========
export function LinkedListView() {
  const [inserted, setInserted] = useState(false)
  const nodes = [{ v: 12 }, { v: 25 }, { v: 7 }]
  return (
    <Figure
      caption="链表的节点散落在内存各处，靠每个节点的 next 指针串起来。随机访问要从头一个个跳，是 O(n)；但在已知位置插入/删除只改指针，是 O(1)。点按钮看「插入」如何只改两根指针。"
      controls={<button className={`fig-btn ${inserted ? 'active' : ''}`} onClick={() => setInserted((v) => !v)}>
        {inserted ? '复原' : '在 12 和 25 之间插入 99'}
      </button>}
    >
      <svg viewBox="0 0 460 140" width="460" fontFamily="var(--mono)">
        <defs>
          <marker id="ll-arr" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" /></marker>
        </defs>
        {/* 头三个节点 */}
        {nodes.map((n, i) => {
          const x = 20 + i * 150
          return (
            <g key={i}>
              <rect x={x} y={40} width="92" height="40" rx="6" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="1.4" />
              <line x1={x + 60} y1={40} x2={x + 60} y2={80} stroke="var(--border-strong)" />
              <text x={x + 30} y={65} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">{n.v}</text>
              <text x={x + 76} y={64} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">next</text>
            </g>
          )
        })}
        {/* 指针 1→2（插入时绕行） */}
        {!inserted ? (
          <line x1={112} y1={60} x2={168} y2={60} stroke="var(--accent)" strokeWidth="1.8" markerEnd="url(#ll-arr)" />
        ) : (
          <>
            <line x1={112} y1={60} x2={188} y2={108} stroke="var(--rose)" strokeWidth="1.8" markerEnd="url(#ll-arr)" />
            <line x1={232} y1={100} x2={168} y2={72} stroke="var(--rose)" strokeWidth="1.8" markerEnd="url(#ll-arr)" />
            <g>
              <rect x={170} y={92} width="92" height="36" rx="6" fill="var(--rose-soft)" stroke="var(--rose)" strokeWidth="1.6" />
              <line x1={230} y1={92} x2={230} y2={128} stroke="var(--rose)" />
              <text x={200} y={115} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">99</text>
            </g>
          </>
        )}
        <line x1={262} y1={60} x2={318} y2={60} stroke="var(--accent)" strokeWidth="1.8" markerEnd="url(#ll-arr)" />
        <text x={432} y={64} textAnchor="middle" fontSize="11" fill="var(--ink-faint)">∅</text>
        <text x="20" y="28" fontSize="11" fontWeight="700" fill="var(--accent-strong)">head →</text>
      </svg>
    </Figure>
  )
}

// ========== 栈 与 队列 ==========
export function StackQueueView() {
  return (
    <Figure caption="栈是 LIFO（后进先出）：只能在一端进出，像叠盘子。队列是 FIFO（先进先出）：一端进、另一端出，像排队。DFS 用栈、BFS 用队列，正是因为这两种「下一个该处理谁」的取法。">
      <svg viewBox="0 0 460 200" width="460" fontFamily="var(--mono)">
        {/* 栈 */}
        <text x="90" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">栈 Stack · LIFO</text>
        <g>
          {['A', 'B', 'C'].map((t, i) => (
            <g key={i}>
              <rect x={50} y={150 - i * 34} width="80" height="30" rx="4" fill={i === 2 ? 'var(--amber)' : 'var(--accent-soft)'} stroke={i === 2 ? 'var(--amber)' : 'var(--accent-line)'} strokeWidth="1.4" />
              <text x={90} y={170 - i * 34} textAnchor="middle" fontSize="13" fontWeight="700" fill={i === 2 ? '#fff' : 'var(--accent-strong)'}>{t}</text>
            </g>
          ))}
          <line x1={42} y1={48} x2={42} y2={182} stroke="var(--border-strong)" strokeWidth="1.5" />
          <line x1={138} y1={48} x2={138} y2={182} stroke="var(--border-strong)" strokeWidth="1.5" />
          <line x1={42} y1={182} x2={138} y2={182} stroke="var(--border-strong)" strokeWidth="1.5" />
          <text x={90} y={66} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">↑ push / pop 都在顶部</text>
        </g>
        {/* 队列 */}
        <text x="330" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">队列 Queue · FIFO</text>
        <g>
          {['A', 'B', 'C'].map((t, i) => (
            <g key={i}>
              <rect x={240 + i * 56} y={86} width="48" height="34" rx="4" fill={i === 0 ? 'var(--green)' : 'var(--accent-soft)'} stroke={i === 0 ? 'var(--green)' : 'var(--accent-line)'} strokeWidth="1.4" />
              <text x={264 + i * 56} y={108} textAnchor="middle" fontSize="13" fontWeight="700" fill={i === 0 ? '#fff' : 'var(--accent-strong)'}>{t}</text>
            </g>
          ))}
          <text x={264} y={138} textAnchor="middle" fontSize="9" fill="var(--green)">↑ 出队(队首)</text>
          <text x={404} y={138} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">入队(队尾)↑</text>
        </g>
      </svg>
    </Figure>
  )
}

// ========== 二叉搜索树：有序性 ==========
export function BinaryTreeView() {
  const nodes = {
    50: { x: 230, y: 36 }, 30: { x: 130, y: 96 }, 70: { x: 330, y: 96 },
    20: { x: 80, y: 156 }, 40: { x: 180, y: 156 }, 60: { x: 280, y: 156 }, 80: { x: 380, y: 156 },
  }
  const edges = [[50, 30], [50, 70], [30, 20], [30, 40], [70, 60], [70, 80]]
  return (
    <Figure caption="二叉搜索树(BST)：每个节点都满足「左子树都比它小、右子树都比它大」。于是查找一个数就像猜数字——每比较一次就排除一半，平均 O(log n)。中序遍历它会得到升序序列。">
      <svg viewBox="0 0 460 190" width="460" fontFamily="var(--mono)">
        <g stroke="var(--border-strong)" strokeWidth="1.6">
          {edges.map(([a, b], i) => <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />)}
        </g>
        {Object.entries(nodes).map(([v, n]) => (
          <g key={v}>
            <circle cx={n.x} cy={n.y} r="20" fill={v === '50' ? 'var(--accent)' : 'var(--bg)'} stroke={v === '50' ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth="2" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={v === '50' ? '#fff' : 'var(--ink)'}>{v}</text>
          </g>
        ))}
        <text x="230" y="182" textAnchor="middle" fontSize="10" fill="var(--ink-faint)">查 60：60&gt;50 走右 → 60&lt;70 走左 → 命中，只比较 3 次</text>
      </svg>
    </Figure>
  )
}

// ========== B树 / B+树 ==========
export function BTreeView() {
  const [mode, setMode] = useState('bplus')
  return (
    <Figure
      caption={mode === 'bplus'
        ? 'B+树：一个节点存多个键、有很多孩子，所以树很「矮胖」，查一次只需读几层磁盘页。数据全在叶子层，且叶子用链表横向相连——范围查询(如 BETWEEN)可以顺着叶子链表扫，这正是 MySQL 索引用它的原因。'
        : 'B树：每个节点存多个键并把数据分散在各层节点上。同样矮胖、适合磁盘，但范围查询不如 B+ 树顺滑（数据不在同一层、无叶子链表）。'}
      controls={<>
        <button className={`fig-btn ${mode === 'btree' ? 'active' : ''}`} onClick={() => setMode('btree')}>B 树</button>
        <button className={`fig-btn ${mode === 'bplus' ? 'active' : ''}`} onClick={() => setMode('bplus')}>B+ 树</button>
      </>}
    >
      <svg viewBox="0 0 460 180" width="460" fontFamily="var(--mono)">
        {/* 根 */}
        <Node3 x={180} y={26} keys={['30', '60']} />
        <g stroke="var(--border-strong)" strokeWidth="1.4">
          <line x1={196} y1={52} x2={90} y2={88} /><line x1={216} y1={52} x2={216} y2={88} /><line x1={236} y1={52} x2={350} y2={88} />
        </g>
        {/* 叶子层 */}
        <Node3 x={44} y={90} keys={['10', '20']} leaf={mode === 'bplus'} />
        <Node3 x={180} y={90} keys={['30', '40', '50'].slice(0, 2)} leaf={mode === 'bplus'} />
        <Node3 x={316} y={90} keys={['60', '80']} leaf={mode === 'bplus'} />
        {mode === 'bplus' && (
          <>
            <g stroke="var(--green)" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#bt-a)">
              <line x1={116} y1={132} x2={178} y2={132} /><line x1={252} y1={132} x2={314} y2={132} />
            </g>
            <defs><marker id="bt-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--green)" /></marker></defs>
            <text x="230" y="162" textAnchor="middle" fontSize="10" fill="var(--green)">叶子链表：范围查询顺着它扫 →</text>
          </>
        )}
      </svg>
    </Figure>
  )
}
function Node3({ x, y, keys, leaf }) {
  const w = keys.length * 28 + 8
  return (
    <g fontFamily="var(--mono)">
      <rect x={x - w / 2} y={y} width={w} height={26} rx="4" fill={leaf ? 'var(--green-soft)' : 'var(--accent-soft)'} stroke={leaf ? 'var(--green-line)' : 'var(--accent-line)'} strokeWidth="1.4" />
      {keys.map((k, i) => (
        <text key={i} x={x - w / 2 + 18 + i * 28} y={y + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{k}</text>
      ))}
    </g>
  )
}

// ========== 图的两种表示：邻接矩阵 / 邻接表 ==========
export function GraphRepr() {
  const [mode, setMode] = useState('list')
  const V = ['A', 'B', 'C', 'D']
  const edges = { A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'D'], D: ['B', 'C'] }
  const has = (a, b) => edges[a].includes(b)
  return (
    <Figure
      caption={mode === 'matrix'
        ? '邻接矩阵：用 n×n 的二维表，matrix[i][j]=1 表示 i、j 之间有边。判断两点是否相连是 O(1)，但稀疏图会浪费大量空间（n² 个格子大多是 0）。'
        : '邻接表：每个顶点挂一条链，列出它的邻居。空间随边数增长、对稀疏图友好，遍历邻居很高效，是最常用的图存储方式。'}
      controls={<>
        <button className={`fig-btn ${mode === 'matrix' ? 'active' : ''}`} onClick={() => setMode('matrix')}>邻接矩阵</button>
        <button className={`fig-btn ${mode === 'list' ? 'active' : ''}`} onClick={() => setMode('list')}>邻接表</button>
      </>}
    >
      <svg viewBox="0 0 460 180" width="460" fontFamily="var(--mono)">
        {/* 左：图 */}
        <g>
          {[['A', 60, 40], ['B', 150, 40], ['C', 60, 140], ['D', 150, 140]].map(([id, x, y]) => (
            <g key={id}>
              <circle cx={x} cy={y} r="17" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="1.8" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">{id}</text>
            </g>
          ))}
          <g stroke="var(--border-strong)" strokeWidth="1.5">
            <line x1={77} y1={40} x2={133} y2={40} /><line x1={60} y1={57} x2={60} y2={123} />
            <line x1={150} y1={57} x2={150} y2={123} /><line x1={77} y1={140} x2={133} y2={140} />
          </g>
        </g>
        {/* 右：表示 */}
        {mode === 'matrix' ? (
          <g>
            {V.map((c, j) => <text key={j} x={280 + j * 34} y={36} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">{c}</text>)}
            {V.map((r, i) => (
              <g key={i}>
                <text x={250} y={60 + i * 30} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">{r}</text>
                {V.map((c, j) => (
                  <g key={j}>
                    <rect x={266 + j * 34} y={48 + i * 30} width="28" height="22" rx="3" fill={has(r, c) ? 'var(--accent-soft)' : 'var(--bg)'} stroke="var(--border-strong)" />
                    <text x={280 + j * 34} y={63 + i * 30} textAnchor="middle" fontSize="11" fontWeight="700" fill={has(r, c) ? 'var(--accent-strong)' : 'var(--ink-faint)'}>{has(r, c) ? 1 : 0}</text>
                  </g>
                ))}
              </g>
            ))}
          </g>
        ) : (
          <g>
            <defs><marker id="gr-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" /></marker></defs>
            {V.map((v, i) => (
              <g key={v}>
                <rect x={250} y={34 + i * 32} width="26" height="22" rx="3" fill="var(--accent-soft)" stroke="var(--accent-line)" />
                <text x={263} y={49 + i * 32} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--accent-strong)">{v}</text>
                {edges[v].map((n, k) => (
                  <g key={k}>
                    <line x1={276 + k * 56} y1={45 + i * 32} x2={296 + k * 56} y2={45 + i * 32} stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#gr-a)" />
                    <rect x={296 + k * 56} y={34 + i * 32} width="26" height="22" rx="3" fill="var(--bg)" stroke="var(--border-strong)" />
                    <text x={309 + k * 56} y={49 + i * 32} textAnchor="middle" fontSize="12" fill="var(--ink)">{n}</text>
                  </g>
                ))}
              </g>
            ))}
          </g>
        )}
      </svg>
    </Figure>
  )
}

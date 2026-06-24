// 图遍历帧录制器（纯逻辑）。一张 6 节点无向图：
// A–B, A–D, B–C, B–E, C–F, D–E, E–F
export const GRAPH = {
  nodes: {
    A: { x: 70, y: 60 }, B: { x: 220, y: 45 }, C: { x: 370, y: 70 },
    D: { x: 110, y: 165 }, E: { x: 250, y: 155 }, F: { x: 380, y: 170 },
  },
  adj: {
    A: ['B', 'D'], B: ['A', 'C', 'E'], C: ['B', 'F'],
    D: ['A', 'E'], E: ['B', 'D', 'F'], F: ['C', 'E'],
  },
}

export const GRAPH_EDGES = (() => {
  const seen = new Set(); const edges = []
  for (const [a, nbrs] of Object.entries(GRAPH.adj)) {
    for (const b of nbrs) {
      const key = [a, b].sort().join('-')
      if (!seen.has(key)) { seen.add(key); edges.push([a, b]) }
    }
  }
  return edges
})()

// BFS：队列 + 入队即标记已发现，避免重复访问
export function buildBFS(start = 'A') {
  const frames = []
  const visited = []
  const discovered = new Set([start])
  const queue = [start]
  const snap = (current, note) => frames.push({ current, visited: [...visited], frontier: [...queue], frontierKind: '队列', note })
  snap(null, `BFS 从 ${start} 出发：起点入队并标记为「已发现」。每次从队首取一个访问，把它未发现的邻居入队。`)
  while (queue.length) {
    const cur = queue.shift()
    visited.push(cur)
    const fresh = GRAPH.adj[cur].filter((n) => !discovered.has(n))
    fresh.forEach((n) => { discovered.add(n); queue.push(n) })
    snap(cur, `访问 ${cur}，把未发现的邻居 ${fresh.join('、') || '（无）'} 入队。队列里是「待访问」的一圈节点。`)
  }
  frames.push({ current: null, visited: [...visited], frontier: [], frontierKind: '队列', note: `BFS 顺序：${visited.join(' → ')}（按「离起点的层数」由近及远）` })
  return frames
}

// DFS：递归，一条路走到底再回退
export function buildDFS(start = 'A') {
  const frames = []
  const visited = []
  const seen = new Set()
  const snap = (current, path, note) => frames.push({ current, visited: [...visited], frontier: [...path], frontierKind: '递归栈', note })
  const dfs = (cur, path) => {
    seen.add(cur)
    visited.push(cur)
    const p = [...path, cur]
    const next = GRAPH.adj[cur].filter((n) => !seen.has(n))
    snap(cur, p, `访问 ${cur}，沿第一个未访问邻居 ${next[0] || '（无，回退）'} 继续深入。递归栈记录了「来时的路」。`)
    for (const n of GRAPH.adj[cur]) if (!seen.has(n)) dfs(n, p)
  }
  frames.push({ current: null, visited: [], frontier: [], frontierKind: '递归栈', note: `DFS 从 ${start} 出发：访问一个节点后，立刻扎进它的第一个未访问邻居，走到底再回退。` })
  dfs(start, [])
  frames.push({ current: null, visited: [...visited], frontier: [], frontierKind: '递归栈', note: `DFS 顺序：${visited.join(' → ')}（一条路走到底再回头）` })
  return frames
}

export const GRAPH_BUILDERS = { bfs: buildBFS, dfs: buildDFS }
export const GRAPH_LABELS = { bfs: '广度优先 BFS', dfs: '深度优先 DFS' }

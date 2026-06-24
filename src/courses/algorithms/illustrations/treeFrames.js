// 二叉树遍历的帧录制器（纯逻辑）。一棵固定的 7 节点满二叉树：
//          1
//        /   \
//       2     3
//      / \   / \
//     4  5  6   7
export const TREE = {
  nodes: {
    1: { v: 1, x: 230, y: 36 },
    2: { v: 2, x: 130, y: 96 }, 3: { v: 3, x: 330, y: 96 },
    4: { v: 4, x: 80, y: 156 }, 5: { v: 5, x: 180, y: 156 },
    6: { v: 6, x: 280, y: 156 }, 7: { v: 7, x: 380, y: 156 },
  },
  children: { 1: [2, 3], 2: [4, 5], 3: [6, 7], 4: [], 5: [], 6: [], 7: [] },
  root: 1,
}

const EDGES = []
for (const [p, kids] of Object.entries(TREE.children)) for (const c of kids) EDGES.push([+p, c])
export { EDGES }

function rec() {
  const frames = []
  const visited = []
  const push = (current, note, { aux = [], auxKind = '递归栈' } = {}) => {
    frames.push({ current, visited: [...visited], note, aux: [...aux], auxKind })
  }
  const visit = (id, note, opts) => { visited.push(id); push(id, note, opts) }
  return { frames, visit, push, visited }
}

const val = (id) => TREE.nodes[id].v

// 先序：根 → 左 → 右
export function buildPreorder() {
  const { frames, visit } = rec()
  const dfs = (id, path) => {
    if (id == null) return
    const p = [...path, id]
    visit(id, `先序 = 根→左→右：每到一个节点先「输出根”，再去左子树。当前输出 ${val(id)}。`, { aux: p })
    const [l, r] = TREE.children[id]
    dfs(l, p)
    dfs(r, p)
  }
  dfs(TREE.root, [])
  frames.push({ current: null, visited: frames[frames.length - 1].visited, note: `先序遍历结果：${frames[frames.length - 1].visited.map(val).join(' → ')}`, aux: [], auxKind: '递归栈' })
  return frames
}

// 中序：左 → 根 → 右（对二叉搜索树会得到升序）
export function buildInorder() {
  const { frames, visit } = rec()
  const dfs = (id, path) => {
    if (id == null) return
    const p = [...path, id]
    const [l, r] = TREE.children[id]
    dfs(l, p)
    visit(id, `中序 = 左→根→右：先走完整棵左子树，回到节点时才「输出根”，再去右子树。当前输出 ${val(id)}。`, { aux: p })
    dfs(r, p)
  }
  dfs(TREE.root, [])
  frames.push({ current: null, visited: frames[frames.length - 1].visited, note: `中序遍历结果：${frames[frames.length - 1].visited.map(val).join(' → ')}（对二叉搜索树正好是升序）`, aux: [], auxKind: '递归栈' })
  return frames
}

// 后序：左 → 右 → 根
export function buildPostorder() {
  const { frames, visit } = rec()
  const dfs = (id, path) => {
    if (id == null) return
    const p = [...path, id]
    const [l, r] = TREE.children[id]
    dfs(l, p)
    dfs(r, p)
    visit(id, `后序 = 左→右→根：左右子树都处理完，最后才「输出根”。当前输出 ${val(id)}。`, { aux: p })
  }
  dfs(TREE.root, [])
  frames.push({ current: null, visited: frames[frames.length - 1].visited, note: `后序遍历结果：${frames[frames.length - 1].visited.map(val).join(' → ')}（常用于先释放子节点再释放自己）`, aux: [], auxKind: '递归栈' })
  return frames
}

// 层序 / BFS：借助队列，一层一层访问
export function buildLevelorder() {
  const { frames, visit } = rec()
  const queue = [TREE.root]
  frames.push({ current: null, visited: [], note: '层序 = 用一个队列：根入队；每次从队首取出一个访问，再把它的左右孩子入队。', aux: [...queue], auxKind: '队列' })
  while (queue.length) {
    const id = queue.shift()
    const kids = TREE.children[id].filter(Boolean)
    visit(id, `从队首取出 ${val(id)} 访问，把它的孩子 ${kids.map(val).join('、') || '（无）'} 加入队尾。`, { aux: [...queue, ...kids], auxKind: '队列' })
    for (const c of kids) queue.push(c)
  }
  frames.push({ current: null, visited: frames[frames.length - 1].visited, note: `层序遍历结果：${frames[frames.length - 1].visited.map(val).join(' → ')}`, aux: [], auxKind: '队列' })
  return frames
}

// DFS（显式栈版）：用栈模拟深度优先，直观展示「一条路走到底再回头」
export function buildDFS() {
  const { frames, visit } = rec()
  const stack = [TREE.root]
  const seen = new Set()
  frames.push({ current: null, visited: [], note: 'DFS 用一个栈：根入栈；每次弹出栈顶访问，再把它的孩子（先右后左）压栈，保证先深入左边。', aux: [...stack], auxKind: '栈' })
  while (stack.length) {
    const id = stack.pop()
    if (seen.has(id)) continue
    seen.add(id)
    const kids = TREE.children[id].filter(Boolean)
    visit(id, `弹出栈顶 ${val(id)} 访问；把孩子压栈（先右后左），下一步会先深入左孩子。`, { aux: [...stack, ...[...kids].reverse()], auxKind: '栈' })
    for (const c of [...kids].reverse()) stack.push(c)
  }
  frames.push({ current: null, visited: frames[frames.length - 1].visited, note: `DFS 访问顺序：${frames[frames.length - 1].visited.map(val).join(' → ')}（沿一条路走到底再回退）`, aux: [], auxKind: '栈' })
  return frames
}

export const TREE_BUILDERS = {
  preorder: buildPreorder, inorder: buildInorder, postorder: buildPostorder,
  levelorder: buildLevelorder, dfs: buildDFS,
}
export const TREE_LABELS = {
  preorder: '先序遍历', inorder: '中序遍历', postorder: '后序遍历',
  levelorder: '层序遍历(BFS)', dfs: '深度优先(DFS)',
}

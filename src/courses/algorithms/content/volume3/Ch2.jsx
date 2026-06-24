import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import TreePlayer from '@/courses/algorithms/illustrations/TreeFigure.jsx'
import GraphPlayer from '@/courses/algorithms/illustrations/GraphFigure.jsx'

const code = `# 递归版（用系统调用栈）
def dfs(node, visited):
    if node in visited:
        return
    visited.add(node)
    visit(node)
    for nxt in graph[node]:      # 沿每个未访问的邻居深入
        dfs(nxt, visited)

# 显式栈版（手动维护栈，等价于上面）
def dfs_iter(start):
    visited, stack = set(), [start]
    while stack:
        node = stack.pop()       # 取栈顶——最近压入的，所以「最深」优先
        if node in visited:
            continue
        visited.add(node)
        visit(node)
        for nxt in graph[node]:
            if nxt not in visited:
                stack.append(nxt)`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          走迷宫时有一种最朴素的策略：选一条路一直往前走，走到死胡同就<em>退回</em>上一个岔路口，换一条没走过的路接着走。
          这就是<strong>深度优先搜索（DFS）</strong>的全部精神——<strong>不撞南墙不回头，一条路扎到底再回退</strong>。
          它既能走树，也能走图，是无数算法的骨架。
        </p>
      </Lead>

      <h2>DFS 的引擎是「栈」</h2>
      <p>
        「走到底再回退」这个动作，靠的正是第一卷讲的<strong>栈</strong>（后进先出）。
        每深入一个节点，就把它记到栈里；遇到死路，就从栈顶弹出、回到上一个节点。
        实现上有两种等价写法：用<em>递归</em>（借助系统的调用栈，最简洁），或用一个<em>显式栈</em>自己维护。
        本质都一样：<strong>总是优先处理「最近遇到」的那个节点</strong>。
      </p>

      <CodeBlock lang="python" title="dfs.py" code={code} />

      <h2>先在树上看：一条路走到底</h2>
      <p>
        下面这棵树用栈实现 DFS。盯住它的轨迹：从根 1 出发，一头扎进左边 1→2→4，走到叶子 4 这个「死胡同」后<em>回退</em>，
        再去 5；左边整条线走完才回头去右边的 3→6→7。下方的栈记录着「还没走完的岔路口」。
      </p>
      <TreePlayer order="dfs" caption="树上的 DFS：用栈实现，一条路深入到底再回退。橙=当前，绿=已访问，下方=栈（后进先出）。" />

      <h2>再到图上：多了一件事——记录「访问过没」</h2>
      <p>
        树没有环，不会走回头路。但图<strong>可能有环</strong>（A→B→C→A），如果不加防范就会无限绕圈。
        所以图的 DFS 多了一个关键动作：用一个 <code>visited</code> 集合<strong>标记访问过的节点，绝不重复进入</strong>。
        除此之外，思路和树上完全一样——沿第一个没去过的邻居深入，无路可走就回退。
      </p>
      <GraphPlayer mode="dfs" start="A" caption="图上的 DFS：沿未访问邻居深入，遇到访问过的就跳过（防止成环死循环），无路可走则回退。" />

      <Callout variant="note" title="时间复杂度：每个点、每条边各看一次">
        <p>
          DFS 会访问每个顶点一次、检查每条边一次，所以是 <strong>O(V + E)</strong>（V 是顶点数、E 是边数）。
          这是图遍历的「标准价格」，BFS 也是同样的复杂度——区别只在<em>访问顺序</em>，不在快慢。
        </p>
      </Callout>

      <Example title="DFS 能解决哪些问题">
        <p>
          <strong>连通性 / 找连通块</strong>（一个点能到达哪些点）、<strong>走迷宫 / 路径搜索</strong>、
          <strong>检测有没有环</strong>、<strong>拓扑排序</strong>（任务依赖的执行顺序，基于后序）、
          <strong>岛屿数量</strong>这类网格题……都是 DFS 的主场。凡是「顺着一条线索深入挖掘、不行再回退」的问题，先想 DFS。
        </p>
      </Example>

      <KeyIdea title="一句话记住 DFS">
        <p>
          深度优先 = 一条路走到底，死胡同再回退，引擎是<strong>栈</strong>（递归或显式栈）。
          在图上务必用 <code>visited</code> 防止成环死循环。复杂度 O(V+E)，用于连通块、路径、环检测、拓扑排序。
        </p>
      </KeyIdea>

      <Summary
        points={[
          'DFS 像走迷宫：沿一条路深入到底，遇到死胡同就回退换路。',
          '它的引擎是栈——可用递归（系统调用栈）或显式栈实现，总是优先处理最近遇到的节点。',
          '在图上必须用 visited 集合标记已访问，避免在环里无限打转。',
          '复杂度 O(V+E)，是连通块、路径搜索、环检测、拓扑排序等问题的通用骨架。',
        ]}
      />
    </>
  )
}

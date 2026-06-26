import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import GraphPlayer from '@/courses/algorithms/illustrations/GraphFigure.jsx'

const code = `from collections import deque

def bfs(start):
    visited = {start}            # 入队即标记，避免重复入队
    queue = deque([start])
    while queue:
        node = queue.popleft()   # 从队首取——最早入队的，所以「最近的层」优先
        visit(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt) # 新发现的邻居排到队尾

# 求无权图最短路径：记录每个点到起点的层数
def shortest_path_len(start, target):
    visited = {start}
    queue = deque([(start, 0)])
    while queue:
        node, dist = queue.popleft()
        if node == target:
            return dist          # 第一次到达即最短
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append((nxt, dist + 1))
    return -1`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          DFS 是「一头扎到底」，而<strong>广度优先搜索（BFS）</strong>恰恰相反：它<strong>一圈一圈地向外扩散</strong>。
          先访问起点，再访问所有「一步能到」的邻居，然后是「两步能到」的，像往水里扔一颗石子，
          涟漪从中心一环环荡开。正因为它严格按「离起点的远近」推进，BFS 能干一件 DFS 不擅长的事——<strong>找最短路径</strong>。
        </p>
      </Lead>

      <h2>BFS 的引擎是「队列」</h2>
      <p>
        要实现「由近及远、先来先处理」，就得用<strong>队列</strong>（先进先出）。算法骨架只有三步，循环执行：
        从队首<em>取出</em>一个节点访问 → 把它所有<em>没见过</em>的邻居加入队尾 → 重复。
        因为先入队的节点先被处理，离起点近的节点总是排在前面，所以访问顺序天然是「第 0 层、第 1 层、第 2 层……」。
      </p>

      <Callout variant="tip" title="一个关键细节：入队时就标记 visited">
        <p>
          标记「已发现」要在<strong>入队那一刻</strong>做，而不是出队时。否则同一个节点可能被多个邻居重复加入队列，
          既浪费又可能出错。记住：<em>发现即标记，绝不重复入队</em>。
        </p>
      </Callout>

      <CodeBlock lang="python" title="bfs.py" code={code} />

      <h2>按下播放，看涟漪怎么扩散</h2>
      <p>
        同一张图，这次用 BFS 从 A 出发。橙色是当前正在访问的节点，绿色是已访问，蓝色边框的是「已发现、在队列里等待」的节点。
        盯住下方的队列：它严格先进先出，于是访问顺序正好是按层推进——先 A，再 A 的邻居，再邻居的邻居。
        对比上一章 DFS 的「深钻」轨迹，差别一目了然。
      </p>
      <GraphPlayer mode="bfs" start="A" caption="图上的 BFS：用队列一圈圈扩散。橙=当前，绿=已访问，蓝边=已入队待访问。访问顺序严格按离起点的层数。" />

      <h2>BFS 的杀手锏：无权图最短路径</h2>
      <p>
        因为 BFS 按层推进，<strong>第一次到达某个节点时，所走的层数一定是从起点到它的最短步数</strong>——
        不可能有更近的路径还没被发现。所以在「每条边权重都相同」的图里（迷宫、棋盘、社交关系），
        求最短路径/最少步数，BFS 是标准答案。代码里只要在入队时多记一个「层数」即可。
        而 DFS 一头扎到底，第一次到达往往绕了远路，给不出最短保证。
      </p>

      <Example title="BFS vs DFS：怎么选">
        <p>
          要<strong>最短路径 / 最少步数</strong>（无权图）、或只关心「附近一圈」→ 用 <strong>BFS</strong>（队列，按层扩散）。
          要<strong>探索所有路径、检测环、拓扑排序、深挖到底</strong>，或图很深而解可能就在附近的对立面（很宽）→ 用 <strong>DFS</strong>（栈，深钻回退）。
          两者复杂度同为 O(V+E)，区别只在「下一个处理谁」——这又回到了第一卷：<strong>队列 vs 栈</strong>。
        </p>
      </Example>

      <table>
        <thead><tr><th></th><th>BFS</th><th>DFS</th></tr></thead>
        <tbody>
          <tr><td>数据结构</td><td>队列(FIFO)</td><td>栈(LIFO)/递归</td></tr>
          <tr><td>访问顺序</td><td>按层、由近及远</td><td>一条路深入到底</td></tr>
          <tr><td>最短路径(无权)</td><td><strong>能</strong></td><td>不保证</td></tr>
          <tr><td>复杂度</td><td>O(V+E)</td><td>O(V+E)</td></tr>
        </tbody>
      </table>

      <KeyIdea title="一句话记住 BFS">
        <p>
          广度优先 = 从起点一圈圈向外扩散，引擎是<strong>队列</strong>，入队即标记。它按「离起点的层数」推进，
          所以能在无权图里求最短路径，这是 DFS 给不了的。复杂度同为 O(V+E)。
        </p>
      </KeyIdea>

      <Summary
        points={[
          'BFS 像水波，从起点一圈圈向外扩散，用队列（先进先出）实现。',
          '核心循环：队首取出访问、未见过的邻居入队尾；入队时就标记 visited，避免重复。',
          '第一次到达某点的层数就是最短步数，所以 BFS 是无权图最短路径的标准解法。',
          'BFS 用队列按层扩散、DFS 用栈深钻回退，复杂度同为 O(V+E)，按需求选择。',
        ]}
      />
    </>
  )
}

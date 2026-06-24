import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { GraphRepr } from '@/courses/algorithms/illustrations/StructureFigures.jsx'

const code = `# 邻接表：每个顶点挂一个邻居列表（最常用）
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D'],
    'C': ['A', 'D'],
    'D': ['B', 'C'],
}
# 遍历 A 的所有邻居，O(A 的度数)
for neighbor in graph['A']:
    print(neighbor)`

export default function Ch6() {
  return (
    <>
      <Lead>
        <p>
          树是一种特别「规矩」的结构：有根、不回头、节点之间只有一条路。可现实里的关系往往更混乱——
          朋友圈里 A 认识 B、B 认识 C、C 又认识 A，绕成了环。描述这种<em>任意</em>关系的结构，就是<strong>图</strong>。
          它由<em>顶点（vertex）</em>和连接顶点的<em>边（edge）</em>组成。其实树只是图的一个特例：无环、连通的图。
        </p>
      </Lead>

      <h2>图的几种面貌</h2>
      <ul>
        <li><strong>无向图 / 有向图</strong>：边没方向（互相认识）还是有方向（我关注了你，你未必关注我）。</li>
        <li><strong>带权图</strong>：边上带数字，比如城市间的距离、网络的带宽。求最短路径就建立在带权图上。</li>
        <li><strong>连通性、环</strong>：任意两点是否走得通？有没有形成回路？这些性质决定了能用什么算法。</li>
      </ul>

      <h2>关键问题：图怎么存进计算机</h2>
      <p>
        图的结构再灵活，最终也要落成数据。两种主流存法，是一道绕不开的权衡题：
      </p>
      <ul>
        <li>
          <strong>邻接矩阵</strong>：开一个 n×n 的二维表，<code>matrix[i][j]=1</code> 表示 i 到 j 有边。
          判断任意两点是否相连是 <strong>O(1)</strong>，但不管有多少边，都要占 <strong>n²</strong> 的空间——
          顶点多、边少的<em>稀疏图</em>会浪费大量内存在存 0。
        </li>
        <li>
          <strong>邻接表</strong>：每个顶点挂一条链，只列出它<em>真正的</em>邻居。空间随边数增长，对稀疏图友好，
          遍历某点的邻居也很高效。绝大多数实际图（社交、地图、网页）都是稀疏的，所以<strong>邻接表是最常用的存法</strong>。
        </li>
      </ul>
      <p>切换下图的两种表示，对照同一张图看它们各自长什么样、各自的取舍。</p>

      <GraphRepr />

      <CodeBlock lang="python" title="graph_adjacency.py" code={code} />

      <Callout variant="tip" title="存法决定遍历效率">
        <p>
          下一卷的 BFS / DFS 都要反复问「这个点的邻居有谁」。用邻接表，答案就挂在那里、直接取；
          用邻接矩阵，得扫一整行 n 个格子才能找全邻居。所以稠密图（边接近 n²）用矩阵、稀疏图用邻接表，
          是一个会实实在在影响性能的选择。
        </p>
      </Callout>

      <Example title="图能描述的现实问题">
        <p>
          社交网络的好友关系（找共同好友、推荐）、地图导航（最短路径）、任务依赖与编译顺序（拓扑排序）、
          网页之间的链接（PageRank）、状态机与流程……都是图问题。学会把现实建模成「顶点 + 边」，
          再套上遍历或最短路算法，是解决一大类问题的通用思路。
        </p>
      </Example>

      <KeyIdea title="图一句话">
        <p>
          图用顶点和边描述任意关系，树是它的无环连通特例。存储有两种：邻接矩阵判连接 O(1) 但耗 n² 空间、适合稠密图；
          邻接表省空间、遍历邻居高效、适合稀疏图，是最常用的选择。存法直接影响后续遍历的效率。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '图由顶点和边组成，能描述任意关系；树是无环、连通的特殊图。',
          '图分无向/有向、带权/无权，连通性与环决定了可用的算法。',
          '邻接矩阵用 n×n 表，判两点相连 O(1) 但占 n² 空间，适合稠密图。',
          '邻接表每个顶点挂邻居列表，省空间、遍历邻居高效，是稀疏图的首选存法。',
        ]}
      />
    </>
  )
}

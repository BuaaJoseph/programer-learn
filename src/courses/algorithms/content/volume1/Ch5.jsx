import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { BTreeView } from '@/courses/algorithms/illustrations/StructureFigures.jsx'

export default function Ch5() {
  return (
    <>
      <Lead>
        <p>
          二叉搜索树很优雅，但它有个隐藏前提：数据在<strong>内存</strong>里，每次比较都极快。
          可数据库的索引动辄几十 GB，根本塞不进内存，得躺在<em>磁盘</em>上——而读一次磁盘比读内存慢上万倍。
          这时候「树有多少层」就成了生死线：每下一层就可能多读一次盘。
          <strong>多叉树、B 树、B+ 树</strong>就是为「少读盘」而生的。
        </p>
      </Lead>

      <h2>把树压矮：一个节点存很多键</h2>
      <p>
        二叉树每个节点只存 1 个键、最多 2 个孩子，数据一多树就长得很高。
        要降低高度，办法很直接：<strong>让一个节点存多个键、连向多个孩子</strong>，这就是<em>多叉树</em>。
        如果一个节点能存上百个键、连上百个孩子，那么三四层的树就能索引上亿条数据——
        查一条记录只需读三四个磁盘页。「矮胖」正是磁盘场景想要的形状。
      </p>

      <h2>B 树：为磁盘量身定制的平衡多叉树</h2>
      <p>
        <strong>B 树</strong >把这个思路规范化：每个节点存一批<em>有序</em>的键，键与键之间的「空隙」各连一个孩子子树，
        并通过分裂/合并保持所有叶子在同一层（完全平衡）。一个节点通常设计得正好等于一个磁盘页的大小，
        这样「读一个节点 = 读一次盘」，把磁盘 IO 压到最少。
      </p>

      <h2>B+ 树：B 树的「数据库特化版」</h2>
      <p>
        MySQL 的 InnoDB 索引用的不是 B 树，而是 <strong>B+ 树</strong>。它在 B 树基础上改了两点，全是为查询服务：
      </p>
      <ul>
        <li><strong>数据只放在叶子层</strong>：上层节点只存键当「路标」、不存数据，于是每个节点能塞更多键、树更矮。</li>
        <li><strong>叶子之间用链表横向相连</strong>：找到范围的起点后，顺着叶子链表一路扫即可——
          <code>WHERE age BETWEEN 20 AND 30</code> 这类<em>范围查询</em>因此极其高效。</li>
      </ul>
      <p>切换下图的「B 树 / B+ 树」，重点看 B+ 树底部那条把叶子串起来的绿色链表。</p>

      <BTreeView />

      <Callout variant="note" title="为什么数据库偏爱 B+ 树而不是二叉树或哈希">
        <p>
          <strong>对比二叉树</strong>：同样的数据量，B+ 树矮得多，读盘次数少一个数量级。
          <strong>对比哈希索引</strong>：哈希查单个值是 O(1)，但它无序，做不了范围查询和排序；B+ 树的叶子有序且相连，
          范围查询、<code>ORDER BY</code>、最左前缀匹配都能走索引。这就是关系型数据库默认用 B+ 树的原因。
        </p>
      </Callout>

      <Example title="一道经典面试题：B 树和 B+ 树的区别">
        <p>
          标准答法三句话：①B+ 树<strong>数据只在叶子节点</strong>，内部节点纯当索引，所以更矮、单次查询更稳定；
          ②B+ 树<strong>叶子用链表相连</strong>，范围查询和遍历极快，B 树做不到；
          ③正因如此，B+ 树的查询性能更<em>稳定</em>（任何键都要走到叶子），而 B 树偶尔能在上层命中、个别查询更快但不稳定。
        </p>
      </Example>

      <KeyIdea title="一句话记住 B/B+ 树">
        <p>
          数据在磁盘上时，树要「矮胖」才能少读盘。B 树让每个节点存多键多孩子、保持平衡；
          B+ 树进一步把数据全压到叶子、并用链表把叶子串起来，专为范围查询优化——这就是数据库索引的底座。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '磁盘比内存慢上万倍，磁盘上的树要尽量矮，以减少读盘次数。',
          '多叉树让一个节点存多个键、连多个孩子，三四层即可索引上亿数据。',
          'B 树是平衡多叉树，节点大小常对齐磁盘页，读一个节点=读一次盘。',
          'B+ 树把数据只放叶子、叶子用链表相连，范围查询极快，是 MySQL 索引的底层结构。',
        ]}
      />
    </>
  )
}

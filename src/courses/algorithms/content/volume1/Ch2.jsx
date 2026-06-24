import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { LinkedListView } from '@/courses/algorithms/illustrations/StructureFigures.jsx'

const code = `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None      # 指向下一个节点；末尾节点指向 None

# 在节点 p 之后插入 x：只动两根指针，O(1)
def insert_after(p, x):
    node = Node(x)
    node.next = p.next        # 1) 新节点接上 p 的后继
    p.next = node             # 2) p 改指向新节点

# 想访问第 k 个节点，只能从头一个个跳，O(n)
def get(head, k):
    cur = head
    for _ in range(k):
        cur = cur.next        # 没有下标公式，只能顺着指针走
    return cur`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          数组要求所有元素挤在一块连续内存里，这在「中间插入」时很吃亏。
          <strong>链表</strong>换了个思路：每个元素装进一个独立的<em>节点</em>，节点可以散落在内存任何角落，
          靠每个节点里的一根 <code>next</code> 指针指向下一个，像珠子被一根线串起来。
        </p>
      </Lead>

      <h2>用指针换来「改得快」</h2>
      <p>
        既然节点不要求连续，插入和删除就不必搬家了。想在某个位置插入一个新节点？
        只需让新节点指向后继、再让前驱指向新节点——<strong>两根指针一改就完成，O(1)</strong>。
        删除也一样，把前驱的 next「跳过」被删节点即可。点下图的按钮，看插入时究竟动了哪两根指针。
      </p>

      <LinkedListView />

      <h2>代价：随机访问变慢了</h2>
      <p>
        天下没有免费的午餐。数组能一步算出第 <code>i</code> 个元素的地址，是因为它连续；链表节点四散各处，
        <strong>没有地址公式</strong>，想找第 k 个节点只能从头顺着指针一个个跳过去，是 <strong>O(n)</strong>。
        所以链表和数组刚好互补：
      </p>
      <CodeBlock lang="python" title="linked_list.py" code={code} />

      <table>
        <thead>
          <tr><th>操作</th><th>数组</th><th>链表</th></tr>
        </thead>
        <tbody>
          <tr><td>按下标随机访问</td><td><strong>O(1)</strong></td><td>O(n)</td></tr>
          <tr><td>已知位置插入/删除</td><td>O(n)（搬移）</td><td><strong>O(1)</strong>（改指针）</td></tr>
          <tr><td>内存</td><td>连续、紧凑</td><td>分散，多一根指针的开销</td></tr>
        </tbody>
      </table>

      <Callout variant="note" title="单链表、双链表、循环链表">
        <p>
          只有一根 <code>next</code> 的叫<strong>单链表</strong>，只能往后走。如果再加一根 <code>prev</code> 指向前驱，
          就是<strong>双向链表</strong>，可以前后双向遍历、删除时也能 O(1) 找到前驱——前一章 LRU 缓存用的就是它。
          把末尾的 next 接回头部，则成了<strong>循环链表</strong>。
        </p>
      </Callout>

      <Example title="链表在哪儿真实出现">
        <p>
          它远不止是教科书概念：Java 的 <code>LinkedList</code>、Redis 的 List（quicklist）、操作系统里把空闲内存块串起来的<em>空闲链表</em>、
          哈希表里同一个桶发生冲突时拉出的<em>拉链</em>、以及 LRU 缓存的双向链表——背后都是链表。
          凡是「频繁在中间增删、又不需要按下标随机访问」的场景，链表就有用武之地。
        </p>
      </Example>

      <KeyIdea title="数组 vs 链表怎么选">
        <p>
          要频繁按位置读、元素相对稳定 → 用<strong>数组</strong>（随机访问 O(1)）。
          要频繁在中间插入删除、很少按下标访问 → 用<strong>链表</strong>（改指针 O(1)）。
          一句话：数组读快改慢，链表改快读慢。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '链表用独立节点 + next 指针把数据串起来，节点在内存中可以不连续。',
          '已知位置的插入/删除只改指针，是 O(1)，不必像数组那样搬移元素。',
          '代价是没有地址公式，随机访问只能从头跳，是 O(n)——与数组正好互补。',
          '双向链表多一根 prev 指针，支持双向遍历，是 LRU、哈希拉链等结构的基础。',
        ]}
      />
    </>
  )
}

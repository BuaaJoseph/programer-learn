import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import PageReplace from '@/courses/os/illustrations/PageReplace.jsx'

const lruCode = `# 双向链表 + 哈希表实现 O(1) 的 LRU
class Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}                 # key -> Node，O(1) 定位
        self.head, self.tail = Node(), Node()   # 哑头哑尾
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node):       # 插到头部 = 最近使用
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)            # 命中就挪到头部
        self._add_front(node)
        return node.val

    def put(self, key, val):
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, val)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.cap:  # 超容量，淘汰尾部（最久未用）
            lru = self.tail.prev
            self._remove(lru)
            del self.map[lru.key]`

const compareCode = `# 访问序列（页号）：7 0 1 2 0 3 0 4 2 3 0 3 2
# 物理页框数 = 3，统计三种算法各缺页几次

seq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]

def fifo(seq, k):
    frames, queue, miss = set(), [], 0
    for p in seq:
        if p not in frames:
            miss += 1
            if len(frames) >= k:           # 满了就换出最早进来的
                old = queue.pop(0)
                frames.discard(old)
            frames.add(p); queue.append(p)
    return miss

# FIFO=10  LRU=9  OPT=7（OPT 是不可实现的理论下限）
print('FIFO 缺页:', fifo(seq, 3))`

const clockCode = `# Clock（二次机会）：环形数组 + 一个指针 + 每页一个访问位
def clock_replace(frames, ref_bits, hand, new_page):
    while True:
        if ref_bits[hand] == 0:        # 找到访问位为 0 的，换它
            frames[hand] = new_page
            ref_bits[hand] = 1         # 新页刚进来，置 1
            hand = (hand + 1) % len(frames)
            return hand
        ref_bits[hand] = 0             # 给它第二次机会：清零、跳过
        hand = (hand + 1) % len(frames)
# 命中时只需把对应页的访问位置 1，几乎零成本 —— 这就是它比 LRU 省的地方`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          缺页中断来了，可物理页框已经满了，操作系统必须先<strong>换出</strong>一页腾地方，才能把新页调进来。
          换出哪一页，直接决定了后面会不会马上又把它换回来、缺页率高不高。这道「踢谁」的选择题，
          就是<em>页面置换算法</em>（page replacement）要回答的。
        </p>
      </Lead>

      <h2>评判标准：缺页越少越好</h2>
      <p>
        换页要读写磁盘，比访存慢几个数量级，所以一个置换算法好不好，几乎就看它在相同访问序列、相同页框数下
        <strong>缺页次数</strong>有多少。理想情况是：换出去的恰好是「以后最久都不会再用」的那一页。这听起来简单，
        难点在于谁也不知道未来，所以各种算法本质上都是在<em>猜未来</em>。
      </p>
      <p>
        换出还有个常被忽略的细节：换出脏页（被改过的）必须先写回磁盘才能丢，换出干净页可以直接丢。所以实际算法会优先
        淘汰<strong>既最久未用又干净</strong>的页——这正是页表项里 <code>D</code>（dirty）标志位的用武之地。Linux 还把页分成
        活跃和非活跃两条链表，先从非活跃链表里找受害者，进一步降低误踢热页的概率。
      </p>

      <h2>几种经典算法</h2>
      <ul>
        <li>
          <strong>OPT（最优）</strong>：换出「未来最长时间内不会被访问」的页。它需要预知未来，<em>无法实现</em>，
          只作为衡量其他算法的理论下限存在。
        </li>
        <li>
          <strong>FIFO（先进先出）</strong>：换出最早进入内存的页。实现最简单（一个队列），但「来得早」不等于「以后用不到」，
          常常把热页误踢掉，还会出现 Belady 异常。
        </li>
        <li>
          <strong>LRU（最近最少使用）</strong>：换出「最久没被访问」的页，用「最近的过去」来预测「最近的将来」，
          符合局部性，效果好，是工程里最常用的近似。
        </li>
        <li>
          <strong>Clock（时钟/二次机会）</strong>：LRU 的高效近似。给每页一个访问位，淘汰时像时钟指针一样扫一圈，
          访问位为 1 的清零并跳过（给第二次机会），为 0 的才换出，避免了 LRU 维护精确顺序的开销。
        </li>
        <li>
          <strong>LFU（最不经常使用）</strong>：换出访问<em>次数</em>最少的页。对长期热点友好，但对「曾经很火、现在冷了」的页反应迟钝，
          且要维护计数。
        </li>
      </ul>
      <p>
        为什么 LRU 在硬件上几乎不直接做精确版？因为精确 LRU 要给每次访存都更新一个全局时间戳或调整链表，
        而访存太频繁，硬件代价吃不消。Clock 只在淘汰时扫指针、命中时置一个位，把成本压到几乎为零，这才是真实系统的选择。
      </p>
      <CodeBlock lang="python" title="clock.py" code={clockCode} />

      <Example title="同一序列，三种算法对比">
        <p>
          固定 3 个页框，访问序列 <code>7 0 1 2 0 3 0 4 2 3 0 3 2</code>，跑下来缺页次数大致是：
          <strong>OPT 最少（理论下限），LRU 次之，FIFO 最多</strong>。可以用下面的代码亲手统计 FIFO，
          再对照感受 LRU 为什么更聪明。
        </p>
        <CodeBlock lang="python" title="compare.py" code={compareCode} />
        <p>
          关键差别在那些「中途又被回访」的页：LRU 因为刚访问过会把它留住，FIFO 却可能因为它进来得早而把它换出，
          结果没多久又缺页换回来。
        </p>
      </Example>

      <PageReplace />

      <table>
        <thead>
          <tr><th>算法</th><th>淘汰依据</th><th>是否可实现</th><th>缺点</th></tr>
        </thead>
        <tbody>
          <tr><td>OPT</td><td>未来最久不用</td><td>否（要预知未来）</td><td>仅作理论下限</td></tr>
          <tr><td>FIFO</td><td>进入最早</td><td>是，最简单</td><td>误踢热页、Belady 异常</td></tr>
          <tr><td>LRU</td><td>最久未访问</td><td>是，但维护贵</td><td>精确版硬件代价高</td></tr>
          <tr><td>Clock</td><td>访问位为 0</td><td>是，常用</td><td>近似、略逊精确 LRU</td></tr>
          <tr><td>LFU</td><td>访问次数最少</td><td>是</td><td>对冷却的旧热点反应慢</td></tr>
        </tbody>
      </table>

      <Callout variant="warn" title="Belady 异常：加页框反而更糟">
        <p>
          直觉上页框越多、缺页应该越少。但 <strong>FIFO 会出现反例</strong>：某些访问序列下，把页框从 3 个增加到 4 个，
          缺页次数<em>不降反升</em>，这就是 <em>Belady 异常</em>。根因是 FIFO 的淘汰顺序和「未来是否还会用」毫无关系，
          加页框反而打乱了原本侥幸合适的换出节奏。LRU、OPT 这类满足「栈性质」的算法不会有这个毛病——这也是面试爱考的点。
        </p>
      </Callout>
      <Callout variant="info" title="什么是栈性质">
        <p>
          满足<strong>栈性质</strong>的算法保证：用 n 个页框时驻留的页集合，一定是用 n+1 个页框时驻留集合的子集——
          换句话说页框越多，留住的页只增不减，所以缺页只会更少、不会反弹，天然免疫 Belady 异常。LRU/OPT 满足它，
          FIFO 不满足。被追问「为什么 LRU 没有 Belady 异常」时，答到「栈性质」这个词就到位了。
        </p>
      </Callout>

      <h2>LRU 的实现与 Redis 的联系</h2>
      <p>
        精确 LRU 要求每次访问都能 O(1) 地把某页标记为「最新」，并能 O(1) 地找出「最旧」。标准做法是
        <strong>双向链表 + 哈希表</strong>：哈希表用 key 直接定位到链表节点，链表头是最近使用、尾是最久未用；
        命中就把节点挪到头部，淘汰就摘掉尾部。Java 里的 <code>LinkedHashMap</code> 本质就是这个结构，开启访问序后能直接当 LRU 缓存用。
      </p>
      <p>
        有意思的是 <em>Redis</em> 的 LRU 并非精确实现：精确 LRU 要给每个 key 维护链表指针，内存开销大。Redis 用的是
        <strong>近似 LRU</strong>——随机采样若干 key，淘汰其中最久未访问的那个，用很小的代价换取接近 LRU 的效果，
        这和操作系统用 Clock 近似 LRU 是同一种工程权衡思路。
      </p>
      <p>
        再补一个真实演进：Redis 后来还提供 <strong>LFU</strong> 淘汰策略，并给计数器加了「随时间衰减」的机制，
        解决了纯 LFU「旧热点冷了也赖着不走」的毛病。MySQL 的 InnoDB 缓冲池则用<strong>分段 LRU</strong>
        （young/old 两区，新页先进 old 区，被再次访问才升入 young 区），专门防全表扫描这种「一次性大量访问」把真正的热页全冲掉——
        这个问题叫<strong>缓存污染</strong>，是纯 LRU 的经典软肋。
      </p>

      <KeyIdea title="工作集与抖动">
        <p>
          一个进程在某段时间内频繁访问的页的集合，叫它的<em>工作集</em>（working set）。只要分给它的物理页框能装下工作集，
          缺页就很少；一旦页框不够、连工作集都装不下，进程就会<strong>不停缺页、不停换页</strong>，CPU 大部分时间花在搬页上、
          几乎不干正事，这种现象叫<em>抖动</em>（thrashing）。解决办法是按工作集大小分配页框，
          页框实在不够时干脆挂起部分进程，而不是让所有进程一起抖动。
        </p>
      </KeyIdea>
      <p>
        抖动在生产环境很常见也很危险：内存吃紧时系统疯狂换页（swap），<code>top</code> 里 CPU 的 <code>wa</code>（IO 等待）飙高、
        负载暴涨但吞吐归零，看起来「卡死」其实是在拼命搬页。所以数据库、JVM 服务器常常<strong>直接关闭 swap</strong>
        或调小 <code>swappiness</code>，宁可触发 OOM Killer 快速杀掉一个进程，也不让整机陷入抖动慢性死亡。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问页面置换，先建立坐标系：<strong>OPT 是理论下限、不可实现；LRU 是好用的近似；FIFO 简单但有 Belady 异常；
        Clock 是 LRU 的高效近似</strong>。然后准备好三个高频追问：手写 LRU（双向链表+哈希）、解释 Belady 异常为什么只在 FIFO 出现、
        以及抖动的成因与缓解。能顺带提一句「Redis 用近似 LRU、操作系统用 Clock，都是为了省维护成本」，会很加分。
      </p>

      <Practice title="手写一个 O(1) 的 LRU">
        <p>
          这是面试出现频率极高的题。核心是<strong>哈希表负责 O(1) 定位、双向链表负责 O(1) 维护使用顺序</strong>：
          命中或写入就把节点移到头部，容量超了就摘掉尾节点。
        </p>
        <CodeBlock lang="python" title="lru_cache.py" code={lruCode} />
        <p>
          想偷懒可以直接用 <code>collections.OrderedDict</code> 或 Java 的 <code>LinkedHashMap</code>，
          但面试官通常要你手写链表，目的就是考你对「为什么这两个数据结构配合能做到 O(1)」的理解。
        </p>
      </Practice>

      <Summary
        points={[
          '缺页且页框满时要换出一页，目标是让总缺页次数最少；换出策略就是页面置换算法。',
          '实际换出优先选既久未用又干净的页，脏页要先写回磁盘，靠页表的 dirty 位区分。',
          'OPT 换出未来最久不用的页，是不可实现的理论下限；LRU 用最近的过去预测将来，是常用的好近似。',
          'FIFO 实现最简单但会出现 Belady 异常（加页框反而缺页更多），因为它不满足栈性质。',
          'Clock（二次机会）是 LRU 的高效近似，命中只置位、淘汰才扫指针，避免维护精确顺序；LFU 按访问次数淘汰。',
          'LRU 的经典实现是双向链表+哈希表做到 O(1)；Redis 用随机采样近似 LRU，InnoDB 用分段 LRU 防缓存污染。',
          '工作集装不进物理页框就会抖动，CPU 忙于换页吞吐归零，生产上常关 swap 或靠 OOM Killer 兜底。',
        ]}
      />
    </>
  )
}

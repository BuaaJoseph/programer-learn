import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const overviewSnippet = `// Collection 体系（单值集合）
Collection
├── List          有序、可重复、有下标
│   ├── ArrayList         动态数组，查快增删慢
│   ├── LinkedList        双向链表，增删快查慢，兼做 Deque
│   └── Vector            古老的线程安全 List（方法 synchronized）
│       └── Stack         继承 Vector，后进先出
├── Set           不可重复、无下标
│   ├── HashSet           底层是 HashMap，无序
│   ├── LinkedHashSet     按插入顺序
│   └── TreeSet           基于红黑树，有序
└── Queue         队列 / 双端队列
    ├── ArrayDeque        数组实现的双端队列
    ├── LinkedList        也实现了 Deque
    └── PriorityQueue     优先级队列（小顶堆）

// Map 体系（键值对集合，不属于 Collection）
Map
├── HashMap               数组+链表+红黑树
├── LinkedHashMap         记录插入/访问顺序
├── TreeMap               红黑树，按 key 排序
└── Hashtable             古老的线程安全 Map`

const arrayVsListSnippet = `// 数组：长度固定，类型确定，下标随机访问 O(1)
int[] arr = new int[10];
arr[3] = 42;            // 直接按内存偏移定位

// 链表：节点离散分布，靠指针串联
class Node {
    int val;
    Node prev;
    Node next;
}
// 访问第 i 个元素要从头/尾遍历 O(n)，
// 但已知位置后插入/删除只改指针 O(1)`

const arrayListGrowSnippet = `// JDK 8 ArrayList 扩容核心（简化）
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    // 新容量 = 旧容量 + 旧容量 >> 1，即 1.5 倍
    int newCapacity = oldCapacity + (oldCapacity >> 1);
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;          // 一次 addAll 大量元素时
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    // 关键：复制到新数组，旧数组等待 GC
    elementData = Arrays.copyOf(elementData, newCapacity);
}

// 默认初始容量 10（第一次 add 时才真正分配，懒加载）
// 容量序列：10 -> 15 -> 22 -> 33 -> 49 ...`

const cowSnippet = `// CopyOnWriteArrayList：写时复制
public boolean add(E e) {
    synchronized (lock) {              // 写操作互斥
        Object[] es = getArray();
        int len = es.length;
        Object[] newElements = Arrays.copyOf(es, len + 1);  // 复制整个数组
        newElements[len] = e;
        setArray(newElements);         // 用 volatile 数组引用一次性切换
        return true;
    }
}
// 读操作完全无锁，读的是切换前的旧数组快照
public E get(int index) {
    return elementAt(getArray(), index);
}`

const cmeSnippet = `List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));

// 错误：遍历中直接用 list.remove，触发 ConcurrentModificationException
for (Integer x : list) {           // foreach 底层用 Iterator
    if (x == 2) list.remove(x);    // modCount++，但迭代器 expectedModCount 没变
}

// 正确：用迭代器自身的 remove
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() == 2) it.remove();   // 同步 expectedModCount
}

// 或用 removeIf（内部安全）
list.removeIf(x -> x == 2);`

export default function Ch1() {
  return (
    <article>
      <Lead>
        集合是 Java 工程师每天都在用、面试官每次都在问的话题。这一章我们从最常用的 List 入手：
        先俯瞰整个集合框架的两大体系，再把数组与链表这对数据结构的本质讲透，进而拆解
        <code>ArrayList</code> 与 <code>LinkedList</code> 的取舍、<code>ArrayList</code> 的扩容机制、
        线程安全的 <code>CopyOnWriteArrayList</code>，最后讲清那个几乎人人踩过的
        <code>ConcurrentModificationException</code> 到底怎么来的。
      </Lead>

      <h2>一、集合框架总览：两大体系</h2>
      <p>
        Java 集合分成两条主线：一条是单值集合 <code>Collection</code>，下面挂着 <code>List</code>、
        <code>Set</code>、<code>Queue</code>；另一条是键值对集合 <code>Map</code>，它<strong>不属于</strong>
        <code>Collection</code>，是独立的一支。很多人面试一上来就把 <code>Map</code> 归进 <code>Collection</code>，
        这是第一个易错点。
      </p>
      <CodeBlock lang="java" title="集合框架两大体系" code={overviewSnippet} />
      <KeyIdea>
        记住一句话：<code>Collection</code> 装单个元素，<code>Map</code> 装键值对，两者平级、互不继承。
        <code>List</code> 有序可重复，<code>Set</code> 不可重复，<code>Queue</code> 强调出入顺序——
        选哪个集合，先想清楚你要的是「有序」「去重」还是「键值映射」。
      </KeyIdea>

      <h2>二、数组 vs 链表：一切 List 的底座</h2>
      <p>
        理解 List 的性能差异，根子在数组与链表这两种底层结构。数组在内存里是<strong>连续的一整块</strong>，
        每个元素大小相同，所以「第 i 个元素」可以用「首地址 + i × 元素大小」直接算出地址——
        这就是随机访问 O(1) 的来历。代价是长度固定，扩容要重新分配并复制；中间插入 / 删除要把后面
        所有元素整体搬动，是 O(n)。
      </p>
      <p>
        链表则是一堆<strong>离散</strong>的节点，每个节点存着数据和指向相邻节点的指针。它没有「按下标算地址」
        的能力，要找第 i 个元素只能从头（或尾）一个个走，是 O(n)；但一旦定位到位置，插入 / 删除只需要
        改几个指针，是 O(1)。
      </p>
      <CodeBlock lang="java" title="数组与链表的本质差异" code={arrayVsListSnippet} />
      <table>
        <thead>
          <tr><th>操作</th><th>数组</th><th>链表</th></tr>
        </thead>
        <tbody>
          <tr><td>按下标访问</td><td>O(1)</td><td>O(n)</td></tr>
          <tr><td>头部插入 / 删除</td><td>O(n)</td><td>O(1)</td></tr>
          <tr><td>尾部插入</td><td>均摊 O(1)（可能扩容）</td><td>O(1)</td></tr>
          <tr><td>中间插入 / 删除</td><td>O(n)</td><td>O(n) 查 + O(1) 改</td></tr>
          <tr><td>内存</td><td>连续、紧凑</td><td>离散、每节点多存指针</td></tr>
        </tbody>
      </table>

      <h2>三、ArrayList vs LinkedList：到底怎么选</h2>
      <p>
        <code>ArrayList</code> 底层是动态数组，<code>LinkedList</code> 底层是双向链表。这决定了它们几乎相反的性能曲线：
        前者查改快、随机访问强；后者头尾增删快。但实战里有个反直觉结论——<strong>绝大多数场景都该用
        ArrayList</strong>。
      </p>
      <Callout variant="note" title="为什么实战偏爱 ArrayList">
        理论上 <code>LinkedList</code> 中间增删 O(1)，但前提是「已经定位到了那个节点」，而定位本身要 O(n)
        遍历；加上链表节点离散，CPU 缓存命中率差，每个节点还多占两个指针的内存。结果就是：除非你
        <strong>反复在头部增删且不随机访问</strong>，否则 <code>ArrayList</code> 在实际跑分里几乎全面胜出。
        需要队列 / 栈语义时，也更推荐 <code>ArrayDeque</code> 而非 <code>LinkedList</code>。
      </Callout>
      <table>
        <thead>
          <tr><th>维度</th><th>ArrayList</th><th>LinkedList</th></tr>
        </thead>
        <tbody>
          <tr><td>底层</td><td>Object[] 动态数组</td><td>双向链表 Node</td></tr>
          <tr><td>随机访问 get(i)</td><td>O(1)，快</td><td>O(n)，慢</td></tr>
          <tr><td>尾部 add</td><td>均摊 O(1)</td><td>O(1)</td></tr>
          <tr><td>头部 / 中间增删</td><td>O(n) 搬移</td><td>定位 O(n)，改指针 O(1)</td></tr>
          <tr><td>内存</td><td>紧凑（可能有预留空位）</td><td>每节点多两个指针</td></tr>
          <tr><td>额外接口</td><td>RandomAccess</td><td>Deque（可当队列/栈）</td></tr>
        </tbody>
      </table>

      <h2>四、ArrayList 扩容机制</h2>
      <p>
        <code>ArrayList</code> 的默认初始容量是 10，但有个细节：<code>new ArrayList&lt;&gt;()</code> 时并不会真的
        分配长度 10 的数组，而是指向一个空数组，<strong>第一次 add 时才懒加载</strong>分配到 10。这是
        JDK7 之后的优化，避免大量空 List 浪费内存。
      </p>
      <p>
        当元素个数超过当前容量，触发扩容：新容量 = 旧容量 + 旧容量 &gt;&gt; 1，也就是<strong>约 1.5 倍</strong>。
        扩容的实质是 <code>Arrays.copyOf</code> 申请一个更大的新数组、把旧元素全部复制过去，旧数组交给 GC。
        所以频繁扩容是有代价的——能预估大小时，应当用 <code>new ArrayList&lt;&gt;(expectedSize)</code> 指定初始容量。
      </p>
      <CodeBlock lang="java" title="ArrayList grow 扩容核心" code={arrayListGrowSnippet} />
      <Callout variant="tip" title="为什么是 1.5 倍而不是 2 倍">
        1.5 倍是「空间浪费」和「扩容频率」之间的折中。倍数太小，扩容太频繁，复制开销大；倍数太大（如 2 倍），
        容易留下大量永远用不到的空位、浪费内存，且新申请的大块内存难以复用之前释放的碎片。1.5 倍让被释放的
        旧数组在多次扩容后有机会被新申请复用，是经过权衡的工程选择。
      </Callout>

      <h2>五、CopyOnWriteArrayList：写时复制的并发 List</h2>
      <p>
        普通 <code>ArrayList</code> 不是线程安全的，多线程并发读写会出问题。
        <code>CopyOnWriteArrayList</code>（COW）是 JUC 包提供的线程安全 List，思路很特别：
        <strong>读不加锁，写时把整个底层数组复制一份，在副本上改完再原子替换引用</strong>。
      </p>
      <CodeBlock lang="java" title="CopyOnWriteArrayList 写时复制" code={cowSnippet} />
      <p>
        因为写操作总是在新数组上进行，读操作读的是「切换前的旧数组」，所以读永远不会读到写了一半的中间状态，
        也就<strong>无需加锁</strong>。代价是：每次写都要全量复制，写多了内存和性能都吃不消；而且读到的可能是
        旧快照，存在<strong>弱一致性</strong>（数据最终一致，但某一刻读到的不一定最新）。
      </p>
      <Callout variant="note" title="CopyOnWriteArrayList vs Collections.synchronizedList">
        两者都能让 List 线程安全，但路线相反。<code>Collections.synchronizedList</code> 是给所有方法套一把
        互斥锁，<strong>读写都要抢锁</strong>，读并发性能差，但写不复制、内存友好。
        <code>CopyOnWriteArrayList</code> 读完全无锁、并发读极快，但写要复制整个数组、内存开销大。
        结论：<strong>读多写极少</strong>（如配置、监听器列表、白名单）用 COW；
        <strong>读写较均衡</strong>则用 synchronizedList 或 <code>ConcurrentXxx</code> 结构。
      </Callout>

      <h2>六、ConcurrentModificationException 怎么产生的</h2>
      <p>
        这是 List 面试的经典必考题。它<strong>不是并发独有</strong>——单线程里遍历同时修改也会触发。
        根源在 fail-fast（快速失败）机制：集合内部有一个 <code>modCount</code> 记录结构性修改次数，
        迭代器创建时会把它快照成 <code>expectedModCount</code>。每次 <code>next()</code> 都会校验两者是否相等，
        一旦你在遍历途中用 <code>list.add/remove</code> 改了集合（<code>modCount++</code> 而 <code>expectedModCount</code> 没动），
        校验失败就抛出 <code>ConcurrentModificationException</code>。
      </p>
      <CodeBlock lang="java" title="CME 的产生与正确写法" code={cmeSnippet} />
      <Example title="为什么 foreach 删除会中招">
        <p>
          增强 for 循环（foreach）在编译后其实是用 <code>Iterator</code> 实现的。当你在循环体里调用
          <code>list.remove(x)</code>，改的是集合的 <code>modCount</code>，但迭代器手里的
          <code>expectedModCount</code> 不知情；下一次 <code>it.next()</code> 检查发现两者对不上，立刻抛异常。
          正确做法是用迭代器自己的 <code>it.remove()</code>（它会同步更新 <code>expectedModCount</code>），
          或直接用 <code>removeIf</code>。
        </p>
      </Example>
      <Callout variant="warn" title="fail-fast 不是并发安全保证">
        <code>modCount</code> 的检查没有任何加锁，它只是一种「尽力而为」的错误探测，目的是<strong>帮你尽早发现 bug</strong>，
        而非保证线程安全。多线程下它可能漏报也可能误报，绝不能把「没抛 CME」当成「线程安全」。
        真要并发遍历修改，请用 <code>CopyOnWriteArrayList</code> 这类 fail-safe 集合。
      </Callout>

      <Summary
        points={[
          '集合分 Collection（单值：List/Set/Queue）与 Map（键值对）两大体系，Map 不属于 Collection。',
          '数组连续内存、随机访问 O(1) 但增删搬移 O(n)；链表离散、增删改指针 O(1) 但访问 O(n)。',
          'ArrayList 底层动态数组、查快；LinkedList 底层双向链表、头尾增删快；实战绝大多数场景用 ArrayList。',
          'ArrayList 默认容量 10（懒加载），扩容约 1.5 倍，本质是 Arrays.copyOf 复制到新数组；能预估大小就指定初始容量。',
          'CopyOnWriteArrayList 读无锁、写时复制整个数组再原子替换，适合读多写极少；synchronizedList 读写都加锁。',
          'ConcurrentModificationException 源于 fail-fast 的 modCount 校验，遍历中改集合即触发；用迭代器 remove 或 removeIf 解决。',
        ]}
      />
    </article>
  )
}

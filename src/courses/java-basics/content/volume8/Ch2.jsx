import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const structSnippet = `// HashMap 底层结构（JDK 1.8）
// 一个 Node 数组（桶），每个桶挂一条链表，链表过长转红黑树
transient Node<K,V>[] table;

static class Node<K,V> {
    final int hash;     // key 的扰动后 hash
    final K key;
    V value;
    Node<K,V> next;     // 链表指针
}

static final int DEFAULT_INITIAL_CAPACITY = 16;     // 默认容量
static final float DEFAULT_LOAD_FACTOR = 0.75f;     // 默认负载因子
static final int TREEIFY_THRESHOLD = 8;             // 链表转红黑树阈值
static final int UNTREEIFY_THRESHOLD = 6;           // 红黑树退化回链表阈值
static final int MIN_TREEIFY_CAPACITY = 64;         // 转树的最小表容量`

const hashSnippet = `// 扰动函数：让高位也参与运算，减少碰撞
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 定位桶下标：用位与代替取模（容量是 2 的 n 次方才成立）
int index = (table.length - 1) & hash;
// 例如 length=16，length-1=0b1111，与 hash 做 & 就是取低 4 位`

const resizeSnippet = `// JDK 1.8 扩容：容量翻倍，元素要么留在原位，要么移到 "原位+oldCap"
// 关键优化：无需重新计算 hash，只看 hash 在新增的那一位上是 0 还是 1
final Node<K,V>[] resize() {
    int newCap = oldCap << 1;        // 容量翻倍
    // 遍历旧桶，对每条链表做 lo/hi 拆分
    // (e.hash & oldCap) == 0  -> 留在原索引 j
    // (e.hash & oldCap) != 0  -> 移到索引 j + oldCap
    ...
}`

const tipSnippet = `// 性能技巧 1：预估容量，避免反复扩容
// 想装 1000 个元素，初始容量应设为 1000 / 0.75 + 1，向上取 2 的幂 = 2048
Map<String, User> map = new HashMap<>(2048);
// JDK 19+ 可用工厂方法直接给「期望元素数」
Map<String, User> m2 = HashMap.newHashMap(1000);

// 性能技巧 2：value 计算用 computeIfAbsent，避免双重查找
map.computeIfAbsent(key, k -> new ArrayList<>()).add(item);

// 性能技巧 3：key 用不可变且 hashCode 分布好的类型（String/Integer 最佳）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        <code>HashMap</code> 是 Java 面试里被问得最深、最细的一个类，没有之一。这一章我们把它彻底拆开：
        底层的数组 + 链表 + 红黑树结构、Hash 碰撞如何解决、扩容机制、为何容量必须是 2 的 n 次方、
        负载因子为何取 0.75、JDK1.8 做了哪些改动；最后横向扫一遍它和 <code>Hashtable</code> 的区别，
        以及 <code>LinkedHashMap</code>、<code>TreeMap</code>、<code>WeakHashMap</code> 等一众变体。
      </Lead>

      <h2>一、HashMap 的底层结构</h2>
      <p>
        JDK 1.8 的 <code>HashMap</code> 是<strong>数组 + 链表 + 红黑树</strong>的组合。主干是一个 <code>Node</code> 数组
        （俗称「桶 bucket」）；每个桶里可以挂一条链表，存放 hash 冲突到同一位置的多个键值对；当某个桶的链表
        长度超过阈值且表容量足够大时，链表会转成红黑树，把查找从 O(n) 降到 O(log n)。
      </p>
      <CodeBlock lang="java" title="HashMap 核心结构与常量" code={structSnippet} />
      <KeyIdea>
        一次 <code>put(k, v)</code> 的路径：算出 key 的扰动 hash → 用 <code>(n-1) &amp; hash</code> 定位桶 →
        桶空就直接放，桶非空就沿链表 / 红黑树找相同 key（<code>equals</code> 比较），找到则覆盖 value，
        找不到则在末尾追加；插入后若元素总数超过阈值就扩容。
      </KeyIdea>

      <h2>二、Hash 碰撞是什么，怎么解决</h2>
      <p>
        不同的 key 经过 hash 运算后落到<strong>同一个桶下标</strong>，就叫 Hash 碰撞（冲突）。
        因为桶的数量有限而 key 可以无穷多，碰撞无法避免，只能想办法化解。常见的解决思路有开放寻址法
        （冲突就探测下一个空位）和链地址法（冲突就在该桶挂一条链）。
      </p>
      <p>
        <code>HashMap</code> 用的是<strong>链地址法</strong>：同一个桶里的冲突元素串成链表。JDK 1.8 进一步优化——
        当一个桶的链表长度达到 8、且数组容量已达 64 时，把这条链表转成<strong>红黑树</strong>，避免极端情况下
        某个桶退化成长链导致查询 O(n)。当树节点因删除降到 6 以下，又会退化回链表。
      </p>
      <CodeBlock lang="java" title="扰动函数与桶定位" code={hashSnippet} />
      <Callout variant="note" title="扰动函数为什么要异或高 16 位">
        定位桶用的是 <code>(n-1) &amp; hash</code>，而 n 通常不大，<code>n-1</code> 只有低几位是 1，意味着<strong>只有 hash 的低位
        参与了定位</strong>。如果两个 key 的低位恰好相同就会碰撞。扰动函数 <code>h ^ (h &gt;&gt;&gt; 16)</code> 把高 16 位
        异或到低 16 位，让高位信息也掺进来，使分布更均匀、碰撞更少——用一次廉价的位运算换更好的散列质量。
      </Callout>

      <h2>三、扩容机制</h2>
      <p>
        当 <code>size &gt; 容量 × 负载因子</code>（默认 16 × 0.75 = 12）时触发扩容：容量<strong>翻倍</strong>，
        然后把旧桶里的元素重新分布到新桶（rehash）。JDK 1.8 在这里做了一个漂亮的优化：因为容量是 2 的幂、
        扩容是翻倍，元素在新表中<strong>要么待在原索引 j，要么移到 j + 旧容量</strong>，二选一。
      </p>
      <CodeBlock lang="java" title="JDK 1.8 扩容的 lo/hi 拆分" code={resizeSnippet} />
      <p>
        判断走哪条只需看 <code>hash &amp; oldCap</code> 这一位是 0 还是 1，<strong>无需重新计算整个 hash 与取模</strong>，
        效率比 JDK 1.7 高很多。同时 1.8 用尾插法保持链表顺序，避免了 1.7 头插法在并发扩容时形成环形链表
        导致 CPU 100% 的著名 bug。
      </p>

      <h2>四、为何容量是 2 的 n 次方</h2>
      <p>
        这是 <code>HashMap</code> 设计里最精巧的一处。定位桶本应用取模 <code>hash % n</code>，但取模运算慢。
        当 n 是 2 的幂时，<code>hash % n</code> 完全等价于 <code>hash &amp; (n-1)</code>——<strong>用一次位与代替取模</strong>，
        快得多。要让这个等价成立，n 必须是 2 的 n 次方。
      </p>
      <Example title="位与代替取模">
        <p>
          设 n = 16，则 n − 1 = <code>0b1111</code>。任意 hash 与 <code>0b1111</code> 做按位与，结果就是 hash 的
          低 4 位，范围恰好是 0 到 15，正好覆盖所有桶下标且分布均匀。如果 n 不是 2 的幂（比如 15），
          <code>n-1 = 0b1110</code> 最低位永远是 0，下标里所有奇数桶永远用不到，散列严重不均、碰撞激增。
        </p>
      </Example>
      <p>
        附带好处：扩容翻倍时，新容量仍是 2 的幂，上面那套「原位 / 原位 + 旧容量」的快速 rehash 才能成立。
        即使你 <code>new HashMap&lt;&gt;(20)</code> 传一个非 2 的幂的初始容量，内部也会用
        <code>tableSizeFor</code> 自动向上取整到最近的 2 的幂（32）。
      </p>

      <h2>五、为何默认负载因子是 0.75</h2>
      <p>
        负载因子（load factor）决定「桶用到几成满就扩容」。它是<strong>空间与时间的权衡</strong>：
      </p>
      <ul>
        <li>负载因子<strong>太大</strong>（如 1.0）：桶装得很满才扩容，省内存，但碰撞概率高、链表变长、查询变慢。</li>
        <li>负载因子<strong>太小</strong>（如 0.5）：很快就扩容，碰撞少查询快，但大量桶空着、浪费内存且频繁扩容。</li>
      </ul>
      <p>
        0.75 是官方在数学（泊松分布下，0.75 时一个桶里链表长度达到 8 的概率极低，约千万分之六）和工程经验上
        取得的折中点：既不太浪费空间，碰撞又足够少。这也是为什么链表转红黑树阈值定为 8——在 0.75 的前提下，
        正常使用几乎不会触发树化，树化只为应对恶意构造或极端散列的兜底。
      </p>

      <h2>六、JDK 1.8 对 HashMap 的改动</h2>
      <table>
        <thead>
          <tr><th>方面</th><th>JDK 1.7</th><th>JDK 1.8</th></tr>
        </thead>
        <tbody>
          <tr><td>结构</td><td>数组 + 链表</td><td>数组 + 链表 + 红黑树</td></tr>
          <tr><td>链表插入</td><td>头插法（并发扩容可成环）</td><td>尾插法（避免成环）</td></tr>
          <tr><td>扩容 rehash</td><td>逐个重新计算下标</td><td>看 hash &amp; oldCap 一位，原位 / 原位+oldCap</td></tr>
          <tr><td>hash 扰动</td><td>四次位移异或</td><td>一次 h ^ (h &gt;&gt;&gt; 16)，更简洁</td></tr>
          <tr><td>查找最坏</td><td>O(n)</td><td>树化后 O(log n)</td></tr>
        </tbody>
      </table>
      <p>
        除了上表，1.8 还把链表节点 <code>Entry</code> 改名 <code>Node</code>、树节点用 <code>TreeNode</code>，
        并把「先判断再插入」的逻辑重排得更紧凑。核心收益是：<strong>极端碰撞下查询从 O(n) 降到 O(log n)</strong>，
        且修复了 1.7 头插法在并发下死循环的隐患（但 1.8 仍非线程安全，并发会丢数据）。
      </p>

      <h2>七、HashMap 使用性能技巧</h2>
      <CodeBlock lang="java" title="HashMap 常见性能技巧" code={tipSnippet} />
      <ul>
        <li><strong>预估容量</strong>：能预知元素数量时指定初始容量（按 元素数 / 0.75 向上取 2 的幂），避免反复扩容复制。</li>
        <li><strong>选好 key 类型</strong>：用不可变且 <code>hashCode</code> 分布均匀的类型（<code>String</code>、<code>Integer</code> 最佳）；
            自定义 key 必须同时正确重写 <code>hashCode</code> 和 <code>equals</code>。</li>
        <li><strong>善用新 API</strong>：<code>computeIfAbsent</code>、<code>merge</code>、<code>getOrDefault</code> 既简洁又少一次查找。</li>
        <li><strong>别用可变对象当 key</strong>：key 入桶后如果其 hashCode 变了，就再也找不到了。</li>
      </ul>

      <h2>八、HashMap vs Hashtable，及各类变体</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>HashMap</th><th>Hashtable</th></tr>
        </thead>
        <tbody>
          <tr><td>线程安全</td><td>否</td><td>是（方法 synchronized，整表加锁）</td></tr>
          <tr><td>null 键值</td><td>允许一个 null key、多个 null value</td><td>都不允许</td></tr>
          <tr><td>初始容量 / 扩容</td><td>16，翻倍</td><td>11，2n+1</td></tr>
          <tr><td>定位</td><td>位与（容量 2 的幂）</td><td>取模</td></tr>
          <tr><td>地位</td><td>主流</td><td>遗留类，并发首选 ConcurrentHashMap</td></tr>
        </tbody>
      </table>
      <p>
        <strong>HashSet vs HashMap</strong>：<code>HashSet</code> 内部就是一个 <code>HashMap</code>，元素作为 key 存进去，
        value 全是同一个常量对象 <code>PRESENT</code>。所以 <code>HashSet</code> 的去重、无序、性能特征都直接来自
        <code>HashMap</code>。
      </p>
      <p>各类 Map 变体的用途：</p>
      <ul>
        <li><strong>LinkedHashMap</strong>：在 HashMap 基础上用一条双向链表串起所有节点，能保持<strong>插入顺序</strong>；
            构造时传 <code>accessOrder=true</code> 还能按<strong>访问顺序</strong>排列，重写 <code>removeEldestEntry</code> 即可两行实现一个 LRU 缓存。</li>
        <li><strong>TreeMap</strong>：基于红黑树，key <strong>按自然顺序或 Comparator 排序</strong>，支持范围查询
            （<code>firstKey</code>/<code>floorKey</code>/<code>subMap</code> 等），增删查均 O(log n)。</li>
        <li><strong>IdentityHashMap</strong>：用 <code>==</code> 而非 <code>equals</code> 比较 key，即<strong>按引用相等</strong>判断，
            少数序列化 / 深拷贝场景下用来追踪「同一个对象」。</li>
        <li><strong>WeakHashMap</strong>：key 是<strong>弱引用</strong>，当 key 不再被外部强引用时，下次 GC 会自动回收该条目，
            常用作缓存、避免内存泄漏（ThreadLocalMap 的设计思想与之相通）。</li>
      </ul>
      <Callout variant="tip" title="选型口诀">
        要顺序遍历用 <code>LinkedHashMap</code>，要排序 / 范围查用 <code>TreeMap</code>，要并发用 <code>ConcurrentHashMap</code>，
        要自动回收的缓存用 <code>WeakHashMap</code>，普通场景用 <code>HashMap</code>。<code>Hashtable</code> 已不推荐使用。
      </Callout>

      <Summary
        points={[
          'HashMap = 数组 + 链表 + 红黑树；put 经扰动 hash、(n-1)&hash 定位桶、链表/树内 equals 找 key。',
          'Hash 碰撞用链地址法解决；链表长 8 且容量 64 转红黑树（查询 O(n)→O(log n)），降到 6 退化回链表。',
          '扩容触发于 size > 容量×0.75，容量翻倍；1.8 用 hash & oldCap 一位决定留原位还是移到原位+oldCap，免重算。',
          '容量取 2 的 n 次方是为了用 (n-1)&hash 的位与代替慢的取模，并使快速 rehash 成立；负载因子 0.75 是空间与碰撞的折中。',
          'JDK1.8 引入红黑树、改尾插法（修复 1.7 并发成环）、优化 rehash 与扰动函数，但仍非线程安全。',
          'HashMap 允许 null 键值、非线程安全；Hashtable 整表加锁是遗留类；HashSet 底层就是 HashMap；变体按顺序/排序/弱引用/并发各有所长。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const seg17Snippet = `// JDK 1.7：分段锁 Segment（继承 ReentrantLock）
// 整个 Map 切成若干段，每段独立加锁，不同段可并发写
static final class Segment<K,V> extends ReentrantLock {
    transient volatile HashEntry<K,V>[] table;   // 每段是一个小 HashMap
}
// 默认 16 段 -> 最多支持 16 个线程同时写不同段
// 定位要两次 hash：先定位 Segment，再定位段内桶
// 并发度 = Segment 数量，初始化后不可变`

const node18Snippet = `// JDK 1.8：放弃 Segment，回归 HashMap 式的 Node 数组 + CAS + synchronized
transient volatile Node<K,V>[] table;

static class Node<K,V> {
    final int hash;
    final K key;
    volatile V val;          // value 用 volatile 保证可见性
    volatile Node<K,V> next; // next 用 volatile
}
// 锁的粒度细化到「单个桶（链表头/树根）」`

const put18Snippet = `// JDK 1.8 put 的核心流程（简化）
final V putVal(K key, V value, boolean onlyIfAbsent) {
    int hash = spread(key.hashCode());
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i;
        if (tab == null) tab = initTable();                 // 懒初始化（CAS 抢初始化权）
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            // 桶为空：直接 CAS 放入，无锁，失败则自旋重试
            if (casTabAt(tab, i, null, new Node<>(hash, key, value)))
                break;
        }
        else if (f.hash == MOVED)
            tab = helpTransfer(tab, f);                     // 正在扩容，当前线程协助迁移
        else {
            synchronized (f) {                              // 桶非空：只锁这一个桶头
                // 在链表或红黑树里查找并插入/覆盖
            }
        }
    }
    addCount(1L, ...);                                      // 用 CounterCell 分段统计 size
    return null;
}`

const getSnippet = `// get 全程无锁
public V get(Object key) {
    Node<K,V>[] tab; Node<K,V> e; int n; K ek;
    int h = spread(key.hashCode());
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (e = tabAt(tab, (n - 1) & h)) != null) {
        // 直接读 volatile 的桶与节点，无需加锁
        ...
    }
    return null;
}`

export default function Ch3() {
  return (
    <article>
      <Lead>
        当你需要一个<strong>线程安全又高性能</strong>的 Map 时，答案几乎总是 <code>ConcurrentHashMap</code>。
        它是 JUC 包的明星类，也是高级面试的重灾区。这一章我们讲透它的实现原理、
        JDK 1.7 分段锁与 1.8「CAS + synchronized + 红黑树」两代设计的根本区别、
        <code>get</code> 为何能完全不加锁、为何不允许 null 键值，以及它和 <code>Hashtable</code> 的对比。
      </Lead>

      <h2>一、为什么需要 ConcurrentHashMap</h2>
      <p>
        <code>HashMap</code> 非线程安全，并发写会丢数据甚至（1.7）死循环；
        <code>Hashtable</code> 和 <code>Collections.synchronizedMap</code> 虽然安全，却是给<strong>整张表</strong>
        加一把大锁——任何时刻只有一个线程能操作整个 Map，读也要抢锁，并发度极差。
        <code>ConcurrentHashMap</code> 的目标就是：在保证线程安全的前提下，把锁的粒度尽量缩小，让尽可能多的
        线程能同时操作不冲突的部分。
      </p>
      <KeyIdea>
        <code>ConcurrentHashMap</code> 的核心思想是<strong>缩小锁粒度 + 无锁读</strong>。
        1.7 把表切成 16 段、各段独立加锁（分段锁）；1.8 更进一步，把锁缩小到「单个桶」，
        空桶用 CAS 无锁写入，非空桶只 <code>synchronized</code> 锁住那个桶头，读操作则全程无锁。
      </KeyIdea>

      <h2>二、JDK 1.7：分段锁 Segment</h2>
      <p>
        1.7 的设计是「<strong>大表拆小表</strong>」：整个 <code>ConcurrentHashMap</code> 由若干个 <code>Segment</code>
        组成（默认 16 个），每个 <code>Segment</code> 本质就是一个加了锁的小 <code>HashMap</code>，它继承自
        <code>ReentrantLock</code>。写某个 key 时，先定位它属于哪个 <code>Segment</code>，只锁住那一段，
        其余段不受影响。
      </p>
      <CodeBlock lang="java" title="JDK 1.7 分段锁结构" code={seg17Snippet} />
      <p>
        这样默认就能支持 16 个线程并发写不同段，并发度等于 <code>Segment</code> 数量。代价是：
        定位一个元素要做<strong>两次 hash</strong>（先定位段，再定位段内桶）；并发度在初始化后<strong>固定不变</strong>，
        设小了热点段竞争激烈，设大了浪费内存；而且每个段都预留了独立结构，整体内存开销偏大。
      </p>

      <h2>三、JDK 1.8：CAS + synchronized + 红黑树</h2>
      <p>
        1.8 彻底重写，<strong>放弃了 Segment 分段锁</strong>，结构回归到和 <code>HashMap</code> 一样的
        <code>Node</code> 数组 + 链表 + 红黑树，但在并发控制上换了一套更精细的方案：
      </p>
      <CodeBlock lang="java" title="JDK 1.8 Node 结构" code={node18Snippet} />
      <ul>
        <li><strong>空桶用 CAS</strong>：要往一个空桶放元素时，用 <code>casTabAt</code> 无锁地比较并设置，成功就完成，
            失败说明有别人抢先了，自旋重试。整个过程不加锁。</li>
        <li><strong>非空桶用 synchronized</strong>：桶里已有链表 / 红黑树时，只 <code>synchronized</code> 锁住<strong>那个桶的头节点</strong>，
            在链表 / 树里查找插入。锁粒度精确到「一个桶」，不同桶之间完全并发。</li>
        <li><strong>红黑树</strong>：和 1.8 HashMap 一样，链表长 8 且容量 64 时树化，查询 O(log n)。</li>
        <li><strong>协助扩容</strong>：扩容时多个线程可以<strong>一起迁移</strong>不同区段的桶（helpTransfer），扩容也是并发的。</li>
      </ul>
      <CodeBlock lang="java" title="JDK 1.8 putVal 核心流程" code={put18Snippet} />
      <Callout variant="note" title="为什么 1.8 敢用 synchronized 而不用 ReentrantLock">
        早期 <code>synchronized</code> 性能差，所以 1.7 用 <code>ReentrantLock</code>。但 JDK 6 之后
        <code>synchronized</code> 经过锁升级优化（偏向锁 → 轻量级锁 → 重量级锁），无竞争或低竞争时性能很好，
        且由 JVM 内建、无需手动 <code>unlock</code>、不会忘记释放。1.8 锁的对象只是「一个桶头」，竞争本就稀疏，
        因此用 <code>synchronized</code> 既简洁又高效。这也说明：选锁要看实际竞争程度，不能只看口碑。
      </Callout>

      <h3>1.7 与 1.8 对比一览</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>JDK 1.7</th><th>JDK 1.8</th></tr>
        </thead>
        <tbody>
          <tr><td>结构</td><td>Segment 数组 + HashEntry 链表</td><td>Node 数组 + 链表 + 红黑树</td></tr>
          <tr><td>锁</td><td>分段锁 ReentrantLock，锁一个 Segment</td><td>CAS + synchronized，锁一个桶头</td></tr>
          <tr><td>锁粒度</td><td>段（默认 1/16 张表）</td><td>桶（更细）</td></tr>
          <tr><td>并发度</td><td>= Segment 数，固定</td><td>≈ 桶数量，远高于 16</td></tr>
          <tr><td>定位</td><td>两次 hash（段 + 段内桶）</td><td>一次 hash</td></tr>
          <tr><td>查询最坏</td><td>O(n)</td><td>O(log n)（树化后）</td></tr>
          <tr><td>扩容</td><td>段内扩容</td><td>多线程协助迁移</td></tr>
        </tbody>
      </table>

      <h2>四、get 方法需要加锁吗</h2>
      <p>
        <strong>不需要</strong>。这是 <code>ConcurrentHashMap</code> 高性能的关键之一：读操作全程无锁。
        它靠的是 <code>volatile</code>——<code>Node</code> 的 <code>val</code> 和 <code>next</code> 都用 <code>volatile</code> 修饰，
        底层桶数组也通过 <code>volatile</code> 语义的 <code>tabAt</code>（Unsafe 的 volatile 读）访问。
      </p>
      <CodeBlock lang="java" title="get 全程无锁" code={getSnippet} />
      <p>
        因为 <code>volatile</code> 保证了<strong>可见性</strong>，写线程对 value 的修改能立刻被读线程看到；
        而 <code>get</code> 只是顺着链表 / 树读，不修改结构，不会破坏一致性。所以读完全不需要锁，
        多个线程可以无限并发地读。这就是「写加细锁、读全无锁」的精髓。
      </p>
      <Callout variant="tip" title="弱一致性">
        无锁读带来的代价是<strong>弱一致性</strong>：<code>get</code> 可能读到的是某个并发写「之前」的值，
        <code>size()</code>、迭代器反映的也是某一瞬间的近似快照而非严格实时。这在并发容器里是可接受的取舍——
        要的是高吞吐，而不是像数据库事务那样的强一致。
      </Callout>

      <h2>五、为何不支持 key 或 value 为 null</h2>
      <p>
        <code>HashMap</code> 允许 null 键值，但 <code>ConcurrentHashMap</code> 一律禁止，put null 会抛
        <code>NullPointerException</code>。原因是<strong>并发下的二义性</strong>。
      </p>
      <Example title="null 在并发下的二义性">
        <p>
          假设允许 null value。当你 <code>map.get(key)</code> 返回 null 时，存在两种无法区分的情况：
          ① key 根本不存在；② key 存在但 value 恰好就是 null。单线程里你可以再用 <code>containsKey</code>
          确认一下，但在<strong>并发</strong>环境下，<code>get</code> 和 <code>containsKey</code> 是两次独立操作，
          中间可能有别的线程插入或删除了这个 key——你永远无法可靠地分辨「不存在」和「值为 null」。
          为了消除这种<strong>歧义</strong>，作者 Doug Lea 干脆禁止 null。
        </p>
      </Example>
      <p>
        Doug Lea 本人解释过：在单线程 Map 里，调用者可以自己用别的手段消歧；但并发容器无法保证两次调用之间状态不变，
        所以「宁可不允许 null，把模糊地带彻底封死」。这也是一种<strong>API 设计上的防御</strong>。
      </p>

      <h2>六、ConcurrentHashMap vs Hashtable</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>ConcurrentHashMap</th><th>Hashtable</th></tr>
        </thead>
        <tbody>
          <tr><td>锁粒度</td><td>桶级（1.8）/ 段级（1.7），细</td><td>整张表一把锁，粗</td></tr>
          <tr><td>读操作</td><td>无锁（volatile）</td><td>也要加锁</td></tr>
          <tr><td>并发性能</td><td>高，多线程可并发读写</td><td>低，任一时刻只有一个线程</td></tr>
          <tr><td>null 键值</td><td>禁止</td><td>禁止</td></tr>
          <tr><td>迭代器</td><td>弱一致（fail-safe）</td><td>fail-fast，遍历改抛 CME</td></tr>
          <tr><td>地位</td><td>并发场景首选</td><td>遗留类，不推荐</td></tr>
        </tbody>
      </table>
      <p>
        一句话总结：<code>Hashtable</code> 用一把大锁锁全表、读写都串行，是上个时代的产物；
        <code>ConcurrentHashMap</code> 把锁拆到桶级、读还无锁，并发吞吐高出一个量级。
        今天写并发代码，需要线程安全 Map 就直接用 <code>ConcurrentHashMap</code>，没有理由再选 <code>Hashtable</code>。
      </p>
      <Callout variant="warn" title="复合操作仍需额外同步">
        <code>ConcurrentHashMap</code> 保证<strong>单个方法</strong>的原子性，但「先 get 再 put」这种<strong>复合操作</strong>
        不是原子的，并发下仍可能出错。要原子地「不存在才放」「累加」请用它提供的
        <code>putIfAbsent</code>、<code>computeIfAbsent</code>、<code>compute</code>、<code>merge</code> 等内建原子方法，
        而不是自己拼 get + put。
      </Callout>

      <Summary
        points={[
          'ConcurrentHashMap 核心是缩小锁粒度 + 无锁读，比 Hashtable 的整表锁并发度高得多。',
          'JDK1.7 用分段锁 Segment（默认 16 段，继承 ReentrantLock），定位需两次 hash，并发度固定为段数。',
          'JDK1.8 放弃 Segment，改为 Node 数组 + 链表 + 红黑树；空桶 CAS、非空桶 synchronized 锁桶头，锁粒度细到单个桶，还支持多线程协助扩容。',
          'get 全程无锁，靠 volatile 的 val/next 与 tabAt 保证可见性，代价是弱一致性。',
          '不允许 null 键值，是为了消除并发下「key 不存在」与「值为 null」无法区分的二义性。',
          'vs Hashtable：锁更细、读无锁、并发更高、迭代器弱一致；并发首选 ConcurrentHashMap，复合操作用其内建原子方法。',
        ]}
      />
    </article>
  )
}

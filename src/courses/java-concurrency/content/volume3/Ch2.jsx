import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Chm from '@/courses/java-concurrency/illustrations/Chm.jsx'

const chmCode = `import java.util.concurrent.ConcurrentHashMap;

ConcurrentHashMap<String, Integer> stock = new ConcurrentHashMap<>();

// putIfAbsent：键不存在才放入，存在则返回旧值，整个判断 + 放入是原子的
stock.putIfAbsent("sku-1001", 100);

// computeIfAbsent：键不存在时用函数算出值再放入，常用来做「懒加载缓存」
ConcurrentHashMap<String, List<Order>> cache = new ConcurrentHashMap<>();
List<Order> orders = cache.computeIfAbsent(
    "user-42",
    uid -> loadOrdersFromDb(uid)  // 只有第一次会查库，之后命中缓存
);

// 高并发安全自增：内部用 CAS + synchronized，比 get 后再 put 安全得多
ConcurrentHashMap<String, Integer> counter = new ConcurrentHashMap<>();
counter.merge("pv", 1, Integer::sum);            // 累加访问量
counter.compute("pv", (k, v) -> v == null ? 1 : v + 1);`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          多线程往一个 Map 里读写，<em>HashMap</em> 不安全、<em>Hashtable</em> 又把整张表锁死太慢。
          <em>ConcurrentHashMap</em>（简称 <strong>CHM</strong>）是工程里最常用的并发容器，面试几乎必问它
          「1.7 怎么做的、1.8 又改成了什么、为什么 get 不加锁」。这一章把这条演进线讲透。
        </p>
      </Lead>

      <h2>为什么不用 Hashtable / HashMap</h2>
      <p>
        <em>Hashtable</em> 的每个方法上都加了 <code>synchronized</code>，锁的是<strong>整张表</strong>：
        一个线程在 put，其他线程连 get 都得排队，并发度等于 1，性能很差。
      </p>
      <p>
        <em>HashMap</em> 则干脆<strong>线程不安全</strong>：多线程同时 put 可能丢数据；尤其在 1.7 的实现里，
        并发扩容时采用头插法迁移链表，可能把链表接成<strong>环</strong>（俗称「死链」），后续 get 落到这个桶会陷入死循环、
        CPU 直接打满。1.8 改成尾插法缓解了死链，但多线程下数据丢失、状态错乱依旧存在，仍然不能在并发场景用。
      </p>

      <h3>JDK 1.7：Segment 分段锁</h3>
      <p>
        1.7 的思路是「<strong>分段</strong>」：把整张表切成若干个 <em>Segment</em>，每个 Segment 是一把可重入锁，
        内部再挂一个 <em>HashEntry</em> 数组。写某个 key 时只锁住它所在的那个 Segment，别的 Segment 照样能并发读写。
      </p>
      <p>
        于是<strong>并发度等于 Segment 的个数</strong>（默认 16），相比 Hashtable 锁整表，并发能力提升了一个量级。
        缺点是 Segment 一旦确定就不能再分，锁的粒度还是偏粗。
      </p>

      <h3>JDK 1.8：Node 数组 + CAS + synchronized</h3>
      <p>
        1.8 彻底抛弃了 Segment，结构回归成和 HashMap 类似的 <em>Node</em> 数组，把锁的粒度细化到<strong>单个桶</strong>：
      </p>
      <ul>
        <li>桶为空时，用 <strong>CAS</strong> 直接把头节点放进去，无锁、最快。</li>
        <li>桶非空（已有节点）时，用 <code>synchronized</code> 锁住<strong>桶的头节点</strong>，只阻塞落到同一个桶的线程。</li>
        <li>链表过长会转红黑树：链表长度达到 <strong>8</strong> 且数组容量达到 <strong>64</strong> 才树化，否则优先扩容。</li>
      </ul>
      <p>
        锁的粒度从「一段」细到「一个桶」，并发度由桶的数量决定，远高于 1.7 的固定段数。
      </p>

      <Example title="高并发缓存与计数">
        <p>
          做一个商品详情缓存：用 <code>computeIfAbsent</code>，多个请求同时打到同一个冷 key 时，CHM 会保证只有一个线程
          去查库、其余线程拿到同一个结果，避免缓存击穿。再做一个 PV 计数：用 <code>merge</code> 原子自增，
          不会像「get 出来加一再 put 回去」那样在并发下丢更新。
        </p>
      </Example>

      <Chm />

      <KeyIdea title="get 为什么不用加锁">
        <p>
          CHM 的 <code>get</code> 全程<strong>不加锁</strong>，靠的是 <em>volatile</em>：Node 的 <code>val</code> 和
          <code>next</code> 都用 volatile 修饰，table 数组本身也是 volatile。volatile 保证了可见性——一个线程写入的
          新值，别的线程 get 时立刻能看到。读多写少的场景下，无锁读让 CHM 的吞吐非常高。
        </p>
      </KeyIdea>

      <h3>size 是怎么算出来的</h3>
      <p>
        高并发下如果用一个全局计数器记元素个数，这个计数器自己就会成为竞争热点。1.8 借鉴了 <em>LongAdder</em> 的思路：
        用一个基准值 <code>baseCount</code> 加上一组 <em>CounterCell</em> 分散计数——线程更新时优先去改自己对应的 cell，
        分散了热点；求 size 时把 <code>baseCount</code> 和所有 CounterCell 累加起来。
      </p>

      <Callout variant="warn" title="原子方法不等于复合操作原子">
        <p>
          CHM 保证<strong>单个方法</strong>（put、get、merge…）的原子性，但<strong>不保证</strong>你把几个方法拼起来还原子。
          像「<code>get</code> 判断存在，再 <code>put</code>」这种复合逻辑，中间仍可能被别的线程插队。
          要原子地「不存在才放」，请用 <code>putIfAbsent</code> / <code>computeIfAbsent</code>，而不是自己拼。
        </p>
      </Callout>

      <h2>实战与面试怎么答</h2>
      <p>
        被问「1.7 和 1.8 的区别」，按这条主线答最清晰：<strong>结构</strong>从 Segment + HashEntry 变成 Node 数组；
        <strong>锁</strong>从分段锁变成 CAS 加 synchronized 锁桶头；<strong>并发度</strong>从固定段数变成桶级别，更高；
        <strong>数据结构</strong>新增了链表转红黑树（阈值 8 / 64）。再补一句「get 靠 volatile 无锁、size 用 baseCount 加
        CounterCell 分散计数」，基本就满分了。
      </p>

      <Practice title="用对 CHM 的原子方法">
        <p>
          把「先查后写」的代码改成 <code>putIfAbsent</code> / <code>computeIfAbsent</code>，把「get 加一再 put」的计数改成
          <code>merge</code>，体会复合操作如何被一个原子方法替代。
        </p>
        <CodeBlock lang="java" title="ChmUsage.java" code={chmCode} />
        <p>
          注意 <code>computeIfAbsent</code> 里的映射函数会在锁桶的状态下执行，别在里面做耗时操作或再去操作同一个 CHM，
          否则可能拖慢甚至死锁。
        </p>
      </Practice>

      <Summary
        points={[
          'Hashtable 锁整表并发度为 1；HashMap 线程不安全，1.7 头插法并发扩容还会形成死链导致 CPU 打满。',
          'JDK 1.7：Segment 分段锁 + HashEntry 数组，并发度等于段数（默认 16），锁粒度偏粗。',
          'JDK 1.8：Node 数组 + 空桶 CAS + synchronized 锁桶头，链表转红黑树阈值 8 / 64，并发度按桶计更高。',
          'get 不加锁，靠 val、next、table 的 volatile 保证可见性，读多写少时吞吐很高。',
          'size 用 baseCount 加一组 CounterCell 分散计数，避免单一计数器成为热点。',
          'CHM 只保证单方法原子，复合操作要用 putIfAbsent / computeIfAbsent / merge，别自己拼 get 再 put。',
        ]}
      />
    </>
  )
}

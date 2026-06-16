import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DistLock from '@/courses/zookeeper/illustrations/DistLock.jsx'

const rawLock = `# 加锁：在锁目录下创建临时顺序节点
create -e -s /lock/order_   ->  /lock/order_0000000003
# 取出 /lock 下所有子节点并排序
ls /lock  ->  [order_0000000001, order_0000000002, order_0000000003]
# 我是 order_0000000003，不是最小的 -> 没抢到锁
# 只 watch 紧挨在我前面的那个：order_0000000002
# 等它被删除时被唤醒，再重新判断自己是不是最小`

const curatorCode = `// Curator 现成实现：InterProcessMutex
CuratorFramework client = CuratorFrameworkFactory.newClient(
    "zk1:2181,zk2:2181,zk3:2181",
    new ExponentialBackoffRetry(1000, 3));
client.start();

InterProcessMutex lock = new InterProcessMutex(client, "/lock/order");

if (lock.acquire(5, TimeUnit.SECONDS)) {   // 最多等 5 秒
    try {
        // 临界区：扣库存、生成订单，保证同一时刻只有一个线程在做
        placeOrder();
    } finally {
        lock.release();                     // 释放锁（删除自己的临时节点）
    }
} else {
    // 没拿到锁，按业务降级或重试
}`

const lockPseudo = `// 加锁/解锁的核心逻辑（理解 Curator 内部在干什么）
String lock() {
    myNode = create("/lock/order_", EPHEMERAL_SEQUENTIAL); // 排队拿号
    while (true) {
        children = sort(getChildren("/lock"));
        if (myNode == children[0]) return myNode;          // 我最小，拿锁
        prev = children[indexOf(myNode) - 1];              // 找前一个
        if (exists("/lock/" + prev, watch=true)) {
            wait();                                         // 阻塞，等前者删除唤醒
        }
        // exists 返回 false 说明前者刚好已删，循环再判一次（关键防漏唤醒）
    }
}
void unlock(myNode) { delete("/lock/" + myNode); }         // 释放即删自己`

const readWriteLockCode = `// Curator 还提供读写锁：读读共享、读写/写写互斥
InterProcessReadWriteLock rwLock =
    new InterProcessReadWriteLock(client, "/lock/cache");

rwLock.readLock().acquire();    // 多个读可同时持有
// ... 读缓存 ...
rwLock.readLock().release();

rwLock.writeLock().acquire();   // 写独占，会等所有读释放
// ... 刷新缓存 ...
rwLock.writeLock().release();`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          分布式锁要解决的是：多个进程、跨多台机器，如何保证同一时刻只有一个能进临界区。ZooKeeper 用
          <em>临时顺序节点</em>就能优雅实现，而且天然公平、能防惊群、还不会因为持锁者崩溃而死锁。
          这一章把这套经典方案讲清楚，并对比 Redis 锁、给出 Curator 现成实现。
        </p>
      </Lead>

      <h2>临时顺序节点方案</h2>
      <p>
        先回忆两个节点特性：<em>临时节点</em>（ephemeral）在创建它的会话断开时自动删除；
        <em>顺序节点</em>（sequential）创建时 ZooKeeper 会自动在名字后面追加一个全局递增的编号。
        把两者结合起来，加锁的流程是这样：
      </p>
      <ul>
        <li>每个客户端在锁目录（比如 <code>/lock</code>）下创建一个<strong>临时顺序节点</strong>。</li>
        <li>取出 <code>/lock</code> 下所有子节点排序，<strong>判断自己是不是序号最小的那个</strong>。</li>
        <li>是最小的，说明<strong>抢到锁</strong>，进入临界区。</li>
        <li>不是最小的，就只 <em>watch</em><strong>紧挨在自己前面的那个节点</strong>，然后阻塞等待。</li>
        <li>前一个节点被删除（前一个客户端释放锁或崩溃）时，自己被唤醒，重新判断是否轮到自己。</li>
      </ul>
      <p>
        把这套流程写成伪代码，你会更清楚 Curator 内部在替你做什么——尤其是「watch 前一个节点失败时要重判一次」
        这个防漏唤醒的细节：
      </p>
      <CodeBlock lang="java" title="加锁/解锁核心逻辑伪代码" code={lockPseudo} />

      <Example title="下单防重">
        <p>
          电商下单要防止同一笔订单被并发处理两次。三个请求几乎同时到达，都想给订单 1024 加锁：
        </p>
        <ul>
          <li>三者分别在 <code>/lock/order_</code> 下建出 <code>order_0000000001/2/3</code>。</li>
          <li>建出 <code>...001</code> 的是最小序号，拿到锁，开始扣库存生成订单。</li>
          <li>建出 <code>...002</code> 的只 watch <code>...001</code>；建出 <code>...003</code> 的只 watch <code>...002</code>。</li>
          <li><code>...001</code> 处理完释放锁（删除节点），<code>...002</code> 被唤醒拿到锁，依次往下。</li>
        </ul>
      </Example>

      <DistLock />

      <KeyIdea title="为什么只 watch 前一个节点">
        <p>
          关键设计是<strong>每个节点只监听紧挨它前面的那一个</strong>，而不是监听锁目录的所有变化。
          如果所有等待者都监听同一个目录，那么锁一释放会<strong>同时唤醒所有人</strong>去抢，造成大量无效竞争，
          这就是<em>惊群</em>（herd effect）。只 watch 前一个，则锁释放时只唤醒下一个排队者，
          像排队取号一样既<strong>公平</strong>（按序号先来先得）又<strong>无惊群</strong>。
        </p>
        <p>
          量化一下惊群的危害：假设 1000 个客户端排队等锁。若都监听锁目录，每释放一次锁就触发 1000 个 watch 事件、
          1000 次重新 getChildren，绝大多数发现自己仍不是最小、白忙一场——这会反复产生<strong>读风暴</strong>。
          改成「链式监听前一个」，每次释放只唤醒 1 个客户端，事件量从 O(n) 降到 O(1)。这是 ZooKeeper 锁设计里
          最值得品味的一笔，本质和第一卷讲 watch 时提到的「避免读风暴」是同一个道理。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="临时节点天然防死锁">
        <p>
          用临时节点而不是持久节点，是为了防死锁。设想持锁的进程突然崩溃：
        </p>
        <ul>
          <li>如果是持久节点，它创建的锁节点不会消失，后面所有人永远等不到它删除——<strong>死锁</strong>。</li>
          <li>用临时节点，进程崩溃会导致会话超时断开，ZooKeeper <strong>自动删除</strong>它的临时节点，
          下一个排队者随即被唤醒拿到锁，锁自动释放，不会死锁。</li>
        </ul>
        <p>
          这是 ZooKeeper 锁相比手写实现的一大优势：崩溃即释放，不需要额外的超时兜底逻辑。
        </p>
        <p>
          但有一个绕不开的边界——<strong>GC / 网络抖动导致的 session 假死</strong>。持锁者发生长时间 STW GC，
          ZK 误判 session 过期、删了它的锁节点、把锁给了下一个；GC 结束后老持锁者「以为自己还持有锁」继续写临界区，
          就发生了<strong>两个客户端同时进临界区</strong>。这不是 ZK 独有的缺陷，是所有「靠租约的分布式锁」的共性
          （Redis 锁同样有），根治要靠 fencing token（拿锁时带一个单调递增的版本号，写后端时校验，旧持有者的旧 token 被拒）。
          面试能讲到这一层，就远超普通候选人了。
        </p>
      </Callout>

      <h3>读写锁与可重入</h3>
      <p>
        除了互斥锁，Curator 还提供<strong>读写锁</strong>：读读共享、读写互斥、写写互斥，适合「读多写少又要保证写时无人读」
        的缓存刷新场景。实现上是用两类带前缀的顺序节点（read- / write-）配合不同的等待规则。
      </p>
      <CodeBlock lang="java" title="Curator 读写锁" code={readWriteLockCode} />
      <p>
        <code>InterProcessMutex</code> 还是<strong>可重入</strong>的：同一个客户端实例多次 <code>acquire</code> 同一把锁
        只会真正加一次锁、内部计数，对应次数的 <code>release</code> 才真正释放。这点和 JDK 的 ReentrantLock 一致，
        避免了同线程递归调用时自己把自己锁死。
      </p>

      <h3>对比 Redis 分布式锁</h3>
      <p>
        Redis 也能做分布式锁（<code>SET key val NX EX</code> 或 RedLock），两者各有取舍。
        Redis 锁<strong>性能高、延迟低</strong>，但可靠性弱：靠超时时间兜底，超时设短了业务没跑完锁就被别人抢走、
        设长了崩溃后要等很久才释放，主从切换还可能丢锁。ZooKeeper 锁<strong>更可靠</strong>：
        崩溃即自动释放、有公平排队和顺序保证，但因为每次加锁解锁都涉及过半写，<strong>性能比 Redis 低</strong>。
        选型口诀：<strong>要极致性能选 Redis，要强可靠和公平选 ZooKeeper</strong>。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>ZooKeeper 锁</th><th>Redis 锁（SET NX）</th></tr>
        </thead>
        <tbody>
          <tr><td>持锁者崩溃</td><td>session 过期自动释放</td><td>等 TTL 过期才释放</td></tr>
          <tr><td>公平性</td><td>顺序节点天然公平排队</td><td>不公平，谁抢到算谁</td></tr>
          <tr><td>惊群</td><td>链式监听，无惊群</td><td>无队列，靠轮询/订阅重试</td></tr>
          <tr><td>性能</td><td>较低（每次过半写）</td><td>高（内存单机操作）</td></tr>
          <tr><td>GC 假死风险</td><td>有，需 fencing token</td><td>有，需 fencing token</td></tr>
          <tr><td>过期续期</td><td>不需要（靠 session 心跳）</td><td>需 watchdog 续期（Redisson）</td></tr>
        </tbody>
      </table>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 怎么实现分布式锁」：建临时顺序节点，取所有子节点排序，自己最小就拿锁，
        不是最小就只 watch 前一个节点、等它删除被唤醒。再主动说三个优点——公平（按序号）、防惊群（只 watch 前一个）、
        防死锁（临时节点崩溃自动释放）。最后对比 Redis：ZK 更可靠但性能低，并提一句生产别手写、用 Curator 的
        <code>InterProcessMutex</code> 现成实现。
      </p>
      <p>
        高频追问：<strong>「ZK 锁绝对安全吗？」</strong>——不绝对，GC/抖动导致 session 假死时可能两个客户端同时进临界区，
        要 fencing token 兜底。<strong>「为什么不直接用 create 同名节点抢锁？」</strong>——那叫非公平锁，能用但会惊群、
        不公平；临时顺序节点方案是其改进版。<strong>「Curator 的 acquire 超时返回 false 后节点怎么办？」</strong>——
        Curator 会自动删掉它刚建的排队节点，避免残留影响后面排队。
      </p>

      <Practice title="原理伪代码与 Curator 实现">
        <p>先看裸操作版，理解流程：</p>
        <CodeBlock lang="text" title="临时顺序节点加锁原理" code={rawLock} />
        <p>
          生产中不要自己拼这些细节，直接用 Apache Curator 的 <code>InterProcessMutex</code>，
          它已经处理好顺序、watch、重入、重试等所有坑：
        </p>
        <CodeBlock lang="java" title="Curator InterProcessMutex" code={curatorCode} />
        <p>
          动手实验：开两个进程都用 Curator 抢同一把锁，让先拿到锁的进程 sleep 一会儿，观察第二个进程在第一个
          release（或被 kill 触发 session 过期）后立刻拿到锁；再 <code>ls /lock</code> 看排队节点的增删，
          把上面的理论对上号。
        </p>
      </Practice>

      <Summary
        points={[
          '加锁流程：在锁目录建临时顺序节点，判断自己是不是最小，最小则拿锁、否则只 watch 前一个节点等待。',
          '只 watch 紧挨自己前面的节点，把唤醒从 O(n) 降到 O(1)，避免惊群读风暴，并保证按序号公平排队。',
          '用临时节点而非持久节点，持锁进程崩溃会话断开后节点自动删除，锁自动释放，天然防死锁。',
          'GC/网络抖动会导致 session 假死、两客户端同进临界区，这是租约锁通病，要 fencing token 兜底。',
          'Curator 还提供可重入锁、读写锁（读读共享、读写/写写互斥），覆盖更多并发场景。',
          '对比 Redis 锁：Redis 性能高但靠 TTL 兜底、不公平；ZooKeeper 更可靠公平、崩溃即释放但性能较低。',
          '生产中用 Apache Curator 的 InterProcessMutex 现成实现，避免自己处理顺序/watch/重入的细节。',
          '一句话记忆：临时顺序节点 + 只盯前一个 = 公平、无惊群、不死锁的可靠分布式锁。',
        ]}
      />
    </>
  )
}

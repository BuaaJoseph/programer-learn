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
      </Callout>

      <h3>对比 Redis 分布式锁</h3>
      <p>
        Redis 也能做分布式锁（<code>SET key val NX EX</code> 或 RedLock），两者各有取舍。
        Redis 锁<strong>性能高、延迟低</strong>，但可靠性弱：靠超时时间兜底，超时设短了业务没跑完锁就被别人抢走、
        设长了崩溃后要等很久才释放，主从切换还可能丢锁。ZooKeeper 锁<strong>更可靠</strong>：
        崩溃即自动释放、有公平排队和顺序保证，但因为每次加锁解锁都涉及过半写，<strong>性能比 Redis 低</strong>。
        选型口诀：<strong>要极致性能选 Redis，要强可靠和公平选 ZooKeeper</strong>。
      </p>

      <h2>面试怎么答</h2>
      <p>
        问「ZooKeeper 怎么实现分布式锁」：建临时顺序节点，取所有子节点排序，自己最小就拿锁，
        不是最小就只 watch 前一个节点、等它删除被唤醒。再主动说三个优点——公平（按序号）、防惊群（只 watch 前一个）、
        防死锁（临时节点崩溃自动释放）。最后对比 Redis：ZK 更可靠但性能低，并提一句生产别手写、用 Curator 的
        <code>InterProcessMutex</code> 现成实现。
      </p>

      <Practice title="原理伪代码与 Curator 实现">
        <p>先看裸操作版，理解流程：</p>
        <CodeBlock lang="text" title="临时顺序节点加锁原理" code={rawLock} />
        <p>
          生产中不要自己拼这些细节，直接用 Apache Curator 的 <code>InterProcessMutex</code>，
          它已经处理好顺序、watch、重入、重试等所有坑：
        </p>
        <CodeBlock lang="java" title="Curator InterProcessMutex" code={curatorCode} />
      </Practice>

      <Summary
        points={[
          '加锁流程：在锁目录建临时顺序节点，判断自己是不是最小，最小则拿锁、否则只 watch 前一个节点等待。',
          '只 watch 紧挨自己前面的节点，能避免锁释放时同时唤醒所有人的惊群问题，并保证按序号公平排队。',
          '用临时节点而非持久节点，持锁进程崩溃会话断开后节点自动删除，锁自动释放，天然防死锁。',
          '对比 Redis 锁：Redis 性能高但靠超时兜底、可靠性弱；ZooKeeper 更可靠公平但性能较低。',
          '生产中用 Apache Curator 的 InterProcessMutex 现成实现，避免自己处理顺序/watch/重入的细节。',
          '一句话记忆：临时顺序节点 + 只盯前一个 = 公平、无惊群、不死锁的可靠分布式锁。',
        ]}
      />
    </>
  )
}

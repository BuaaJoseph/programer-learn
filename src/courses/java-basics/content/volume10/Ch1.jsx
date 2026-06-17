import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const syncSnippet = `// synchronized 三种用法，锁的是不同对象
class Demo {
    public synchronized void m1() {}          // 锁 this（当前实例）
    public static synchronized void m2() {}    // 锁 Demo.class（类对象）
    public void m3() {
        synchronized (this) {}                 // 锁指定对象
    }
}
// 编译后：同步块用 monitorenter / monitorexit 指令，
// 同步方法靠方法表的 ACC_SYNCHRONIZED 标志，
// 两者最终都依赖对象的 Monitor（管程）`

const upgradeSnippet = `// 锁升级路径（JDK 6 引入，单向不可逆，越升越重）
无锁
  ↓ 第一个线程访问
偏向锁     // 对象头记录线程 ID，同一线程再进无需 CAS，几乎零开销
  ↓ 出现第二个线程竞争
轻量级锁   // CAS 自旋抢锁，适合锁持有时间极短、竞争不激烈
  ↓ 自旋超过阈值 / 竞争激烈
重量级锁   // 阻塞挂起，靠 OS 互斥量，竞争激烈时反而高效

// 对象头 Mark Word 用几位标记当前锁状态
// 注意：JDK 15 起偏向锁默认禁用，JDK 18 彻底移除`

const casSnippet = `// CAS：比较并交换，无锁原子操作的基石
// 伪代码：仅当内存值仍等于期望值 expect 时，才更新为 newVal
boolean compareAndSwap(addr, expect, newVal) {
    if (*addr == expect) { *addr = newVal; return true; }
    return false;
}

// AtomicInteger 自增就靠 CAS 自旋
public final int incrementAndGet() {
    int cur, next;
    do {
        cur = get();
        next = cur + 1;
    } while (!compareAndSet(cur, next));   // 失败就重试
    return next;
}`

const abaSnippet = `// ABA 问题：值从 A 改成 B 又改回 A，CAS 以为没变过
// 解决：加版本号 / 时间戳
AtomicStampedReference<Integer> ref =
    new AtomicStampedReference<>(100, 0);   // 值 100，戳 0

int stamp = ref.getStamp();
ref.compareAndSet(100, 200, stamp, stamp + 1);  // 同时比对值和版本戳`

const rwLockSnippet = `// 读写锁：读读共享、读写/写写互斥，适合读多写少
ReadWriteLock rwLock = new ReentrantReadWriteLock();

rwLock.readLock().lock();      // 多个读线程可同时持有
try { /* 读 */ } finally { rwLock.readLock().unlock(); }

rwLock.writeLock().lock();     // 写独占，阻塞所有读和写
try { /* 写 */ } finally { rwLock.writeLock().unlock(); }`

export default function Ch1() {
  return (
    <article>
      <Lead>
        锁是并发的深水区，也是高级面试最爱深挖的地方。这一章把锁讲到底：
        <code>synchronized</code> 如何实现（对象头、Monitor、锁升级）、修饰静态与普通方法的区别、
        轻量级锁的自旋、能否禁止指令重排、升级到重量级锁后是否还能降级、自适应自旋、
        <code>synchronized</code> 与 <code>ReentrantLock</code> 的对比、<code>ReentrantLock</code> 与 AQS 原理、
        CAS 与 ABA 问题、读写锁、<code>StampedLock</code>、如何优化锁、以及 <code>volatile</code> 与 <code>synchronized</code> 的区别。
      </Lead>

      <h2>一、synchronized 如何实现</h2>
      <p>
        <code>synchronized</code> 是 JVM 内建的关键字。它的实现绕不开三个概念：<strong>对象头、Monitor、锁升级</strong>。
      </p>
      <CodeBlock lang="java" title="synchronized 的三种用法与底层指令" code={syncSnippet} />
      <ul>
        <li><strong>对象头 Mark Word</strong>：每个 Java 对象头里有一块 Mark Word，存哈希码、GC 年龄，以及<strong>锁状态标志位</strong>，
            锁信息就记在这里。</li>
        <li><strong>Monitor（管程）</strong>：每个对象关联一个 Monitor。重量级锁下，线程要进同步块必须先持有该对象的 Monitor，
            底层对应一个互斥量（mutex），抢不到就进入 Monitor 的等待队列阻塞。</li>
        <li><strong>字节码</strong>：同步代码块编译成 <code>monitorenter</code> / <code>monitorexit</code> 一对指令；
            同步方法则在方法表上打 <code>ACC_SYNCHRONIZED</code> 标志，进入方法时隐式获取 Monitor。</li>
      </ul>

      <h2>二、修饰静态方法 vs 普通方法</h2>
      <KeyIdea>
        <code>synchronized</code> 普通方法锁的是<strong>当前实例对象 this</strong>；静态方法锁的是<strong>类的 Class 对象</strong>。
        因为锁的对象不同，一个线程在执行静态同步方法、另一个线程执行同名的实例同步方法，<strong>互不阻塞</strong>，
        因为它们抢的是两把不同的锁。
      </KeyIdea>
      <p>
        实例锁是「每个对象一把」，不同实例的同步方法可以并发；类锁是「全类共享一把」，所有实例的静态同步方法
        都争这同一把锁。设计时要想清楚你要保护的是「单个对象的状态」还是「全类共享的静态状态」。
      </p>

      <h2>三、锁升级：偏向锁、轻量级锁、重量级锁</h2>
      <p>
        早期 <code>synchronized</code> 一上来就用重量级锁（OS 互斥量，要在用户态 / 内核态切换，慢）。
        JDK 6 引入<strong>锁升级</strong>机制：根据竞争激烈程度，锁从轻到重逐级升级，绝大多数低竞争场景能用更轻的方式。
      </p>
      <CodeBlock lang="java" title="锁升级路径" code={upgradeSnippet} />
      <ul>
        <li><strong>偏向锁</strong>：假设「锁总是同一个线程拿」，在对象头记下线程 ID，同线程再进直接放行、几乎零开销。</li>
        <li><strong>轻量级锁</strong>：出现第二个线程竞争时升级，用 <strong>CAS 自旋</strong>抢锁，不阻塞，适合锁持有极短的场景。</li>
        <li><strong>重量级锁</strong>：自旋失败 / 竞争激烈时升级，线程<strong>阻塞挂起</strong>，靠 OS 调度，竞争激烈时反而比空转省 CPU。</li>
      </ul>
      <Callout variant="note" title="偏向锁的现状">
        偏向锁在多核高并发下收益不明显且维护成本高，<strong>JDK 15 起默认禁用，JDK 18 彻底移除</strong>。
        所以在新版本里讲锁升级，重点是「无锁 → 轻量级 → 重量级」这条主线。
      </Callout>

      <h3>轻量级锁是否自旋？</h3>
      <p>
        <strong>是</strong>。轻量级锁的核心就是自旋——线程不立刻阻塞，而是<strong>循环 CAS 尝试抢锁</strong>，赌「锁很快会释放」。
        自旋避免了线程挂起 / 唤醒的昂贵上下文切换，对持有时间极短的锁非常划算；但如果锁迟迟不放，
        自旋就是在白白空耗 CPU，所以自旋有次数上限，超过就升级为重量级锁去阻塞。
      </p>
      <h3>锁自适应自旋</h3>
      <p>
        JDK 6 还引入了<strong>自适应自旋</strong>：自旋次数不再是固定值，而是 JVM 根据<strong>历史经验</strong>动态调整——
        如果某个锁上次自旋很快就抢到了，这次就多自旋几次；如果上次自旋很久都没抢到，这次干脆少自旋甚至直接阻塞。
        让自旋更聪明，避免在「肯定抢不到」的锁上空转。
      </p>
      <h3>能否禁止指令重排？升级后能否降级？</h3>
      <p>
        <code>synchronized</code> <strong>能保证有序性</strong>：同步块内的代码对外表现为一个不可分割的整体，
        进入和退出有内存屏障语义，能防止「同步块内外的指令」被重排到块外，从而保证可见性与有序性
        （但块内部指令仍可在不影响单线程语义下重排）。
      </p>
      <Callout variant="warn" title="升级到重量级后还能降级吗">
        <code>synchronized</code> 的锁升级在运行时<strong>基本是单向、不可逆</strong>的——一旦升级到重量级锁，
        即使后来竞争消失、所有线程都释放了锁，它通常<strong>仍保持重量级状态</strong>，不会自动降回轻量级。
        （HotSpot 仅在 STW 的安全点等极少数内部时机才可能做批量降级，对应用代码而言可视为不可逆。）
        这也是为什么要尽量缩小同步范围、避免锁被升级。
      </Callout>

      <h2>四、synchronized vs ReentrantLock</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>synchronized</th><th>ReentrantLock</th></tr>
        </thead>
        <tbody>
          <tr><td>层面</td><td>JVM 关键字</td><td>JDK 类（java.util.concurrent）</td></tr>
          <tr><td>加 / 解锁</td><td>自动（出块自动释放）</td><td>手动 lock / unlock（须 finally）</td></tr>
          <tr><td>可中断</td><td>不可</td><td>lockInterruptibly 可中断</td></tr>
          <tr><td>超时</td><td>不支持</td><td>tryLock(timeout) 支持</td></tr>
          <tr><td>公平性</td><td>非公平</td><td>可选公平 / 非公平</td></tr>
          <tr><td>条件队列</td><td>一个（wait/notify）</td><td>多个 Condition</td></tr>
        </tbody>
      </table>
      <p>
        两者都可重入。<code>synchronized</code> 简单、不会忘记释放、JVM 持续优化，能满足大多数场景就优先用它；
        需要<strong>可中断、可超时、公平锁、多条件队列</strong>这些高级能力时才上 <code>ReentrantLock</code>，
        但务必在 <code>finally</code> 里 <code>unlock</code>，否则锁泄漏。
      </p>

      <h2>五、ReentrantLock 与 AQS 原理</h2>
      <p>
        <code>ReentrantLock</code> 的底层是 <strong>AQS（AbstractQueuedSynchronizer，抽象队列同步器）</strong>。
        AQS 是 JUC 几乎所有锁与同步工具（<code>ReentrantLock</code>、<code>Semaphore</code>、<code>CountDownLatch</code>、
        读写锁等）的共同基座。
      </p>
      <p>AQS 的两个核心：</p>
      <ul>
        <li><strong>一个 volatile int state</strong>：表示同步状态。对 <code>ReentrantLock</code>，state 是<strong>重入次数</strong>——
            0 表示没人持有，每重入一次 +1，释放一次 -1，减到 0 才真正放锁。</li>
        <li><strong>一个 CLH 双向队列</strong>：抢锁失败的线程被包装成节点排进 FIFO 等待队列，前驱释放锁时唤醒后继。</li>
      </ul>
      <p>
        抢锁时先 CAS 改 state，成功就持有；失败则入队并 <code>park</code> 阻塞。公平锁会检查队列里有没有更早等待者
        （有就乖乖排队），非公平锁则允许「插队」直接抢——非公平吞吐通常更高，是默认选项。

      </p>

      <h2>六、CAS 与 ABA 问题</h2>
      <p>
        <strong>CAS（Compare-And-Swap，比较并交换）</strong>是无锁并发的基石：它是一条 CPU 原子指令，
        语义是「仅当内存里的值仍等于我期望的旧值时，才把它更新为新值」。靠这一条，原子类、AQS 都能不加锁地修改共享变量。
      </p>
      <CodeBlock lang="java" title="CAS 与原子自增" code={casSnippet} />
      <p>
        CAS 的代价是<strong>自旋</strong>：失败就重试，高竞争下会空转烧 CPU；而且它只能保证「一个变量」的原子性。
        还有一个著名的逻辑缺陷——<strong>ABA 问题</strong>。
      </p>
      <Example title="什么是 ABA 问题">
        <p>
          线程 1 读到值是 A，准备 CAS 改成 C。在它动手前，线程 2 把值从 A 改成 B 又改回 A。
          此时线程 1 的 CAS 发现「值还是 A」，于是认为「没人动过」、成功更新。但实际上中间已经被改动了两次，
          这种「看起来没变其实变过」就是 ABA。多数场景无害，但在涉及对象复用、无锁栈等场景可能引发严重 bug。
        </p>
      </Example>
      <p>
        解决办法是<strong>加版本号</strong>：用 <code>AtomicStampedReference</code>，每次修改不仅比对值还比对一个递增的版本戳，
        即便值绕回 A，版本戳也变了，CAS 就会失败。
      </p>
      <CodeBlock lang="java" title="用版本戳解决 ABA" code={abaSnippet} />

      <h2>七、读写锁与 StampedLock</h2>
      <p>
        普通互斥锁不分读写、一律独占，但很多场景<strong>读远多于写</strong>，读之间本不冲突。
        <code>ReentrantReadWriteLock</code> 把锁拆成读锁和写锁：<strong>读读共享，读写互斥，写写互斥</strong>，
        读多写少时并发度大幅提升。
      </p>
      <CodeBlock lang="java" title="读写锁" code={rwLockSnippet} />
      <p>
        但读写锁有<strong>写饥饿</strong>风险：读太多时写线程可能长期抢不到锁。JDK 8 的 <code>StampedLock</code>
        进一步引入<strong>乐观读</strong>：读之前拿一个戳、读完校验这期间有没有发生写，没写就直接用（全程无锁、最快），
        有写才退化成悲观读锁。它读性能更好，但不可重入、用法更复杂，是读写锁的高性能升级版。
      </p>

      <h2>八、如何优化锁，及 volatile vs synchronized</h2>
      <p>锁优化的常见手段：</p>
      <ul>
        <li><strong>减小锁粒度</strong>：只锁真正需要保护的代码 / 数据，别锁整个方法（如 <code>ConcurrentHashMap</code> 锁单桶）。</li>
        <li><strong>缩短锁持有时间</strong>：把耗时操作（IO、计算）挪到锁外。</li>
        <li><strong>锁分离</strong>：读写分离、不同业务用不同锁。</li>
        <li><strong>用无锁结构</strong>：CAS、原子类、<code>LongAdder</code> 替代锁。</li>
        <li><strong>避免锁升级到重量级</strong>：减少竞争、缩小范围。</li>
      </ul>
      <table>
        <thead>
          <tr><th>维度</th><th>volatile</th><th>synchronized</th></tr>
        </thead>
        <tbody>
          <tr><td>原子性</td><td>不保证（除单次读 / 写）</td><td>保证</td></tr>
          <tr><td>可见性</td><td>保证</td><td>保证</td></tr>
          <tr><td>有序性</td><td>禁止重排（部分）</td><td>保证</td></tr>
          <tr><td>是否加锁 / 阻塞</td><td>否，轻量</td><td>是，可能阻塞</td></tr>
          <tr><td>用于</td><td>变量（状态标志、双重检查锁的引用）</td><td>方法 / 代码块（复合操作互斥）</td></tr>
        </tbody>
      </table>
      <p>
        一句话：<code>volatile</code> 解决<strong>可见性 + 有序性</strong>但不保证原子性，适合一写多读的状态标志；
        <code>synchronized</code> 三者全保证但有锁开销，适合需要互斥的复合操作。要原子地修改一个数值，
        两者都不如直接用原子类。
      </p>

      <Summary
        points={[
          'synchronized 靠对象头 Mark Word + Monitor 实现，同步块用 monitorenter/exit，同步方法用 ACC_SYNCHRONIZED 标志。',
          '普通同步方法锁 this，静态同步方法锁 Class 对象，两者是不同的锁、互不阻塞。',
          '锁升级：无锁→偏向→轻量级(CAS 自旋)→重量级(阻塞)，单向基本不可逆；JDK15+ 偏向锁默认禁用、JDK18 移除；有自适应自旋。',
          'ReentrantLock 基于 AQS（volatile int state 记重入次数 + CLH 队列）；比 synchronized 多了可中断/超时/公平/多 Condition。',
          'CAS 是无锁基石（比较旧值再交换），缺陷是自旋耗 CPU、只保单变量、ABA 问题（用 AtomicStampedReference 加版本戳解决）。',
          '读写锁读读共享/读写互斥适合读多写少，StampedLock 加乐观读更快；优化锁靠减小粒度/缩短持有/无锁结构；volatile 保可见有序不保原子，synchronized 三者皆保但有锁开销。',
        ]}
      />
    </article>
  )
}

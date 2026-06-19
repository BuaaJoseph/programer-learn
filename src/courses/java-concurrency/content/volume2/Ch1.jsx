import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LockUpgrade from '@/courses/java-concurrency/illustrations/LockUpgrade.jsx'

const usageCode = `public class SyncDemo {
    private int count = 0;
    private static int total = 0;

    // 1) 实例方法：锁的是 this（当前实例对象）
    public synchronized void incr() {
        count++;
    }

    // 2) 静态方法：锁的是 SyncDemo.class（类对象，全类唯一）
    public static synchronized void incrTotal() {
        total++;
    }

    // 3) 同步代码块：锁的是括号里写的那个对象
    private final Object lock = new Object();
    public void incrBlock() {
        synchronized (lock) {   // 锁 lock 这个对象
            count++;
        }
    }
}`

const reentrantCode = `// synchronized 是可重入锁：同一线程已持有锁，再次进入同一把锁的同步块无需重新竞争
public class Reentrant {
    public synchronized void a() {
        System.out.println("a");
        b();   // a 已经持有 this 锁，调 b 时直接重入，不会自己把自己锁死
    }
    public synchronized void b() {
        System.out.println("b");
    }
}
// monitor 内部维护一个计数器：重入一次 +1，退出一次 -1，归零才真正释放锁`

const wrongLockCode = `// 反例 1：锁了一个会变的引用，等于没锁
public class WrongLock {
    private Integer lock = 0;             // Integer 不可变，++ 会换新对象
    public void bad() {
        synchronized (lock) {
            lock++;                       // 每次都换了一个新的锁对象！互斥失效
        }
    }
}

// 反例 2：锁了字符串常量，可能和别的无关代码撞同一把锁
private static final String LOCK = "lock";   // 字符串常量池里全局唯一，极易误共享`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          <code>synchronized</code> 是 Java 里最古老、也最常被面试官追问的关键字。八股的核心不是「会用」，
          而是说清楚三件事：它锁的到底是哪个对象、底层靠什么实现互斥、以及 JDK 6 之后的锁升级机制让它
          「从慢到快」的全过程。把这三件事讲透，这道题就稳了。
        </p>
      </Lead>

      <h2>三种用法，锁的到底是谁</h2>
      <p>
        <code>synchronized</code> 的本质是「拿到某个对象的锁才能进入」。它有三种写法，区别只在于
        <strong>锁的是哪一个对象</strong>，而不在于语法本身：
      </p>
      <ul>
        <li><strong>修饰实例方法</strong>：锁的是 <code>this</code>，也就是调用方法的那个实例。</li>
        <li><strong>修饰静态方法</strong>：锁的是 <code>类.class</code>，整个类只有一份，所有实例共享。</li>
        <li><strong>修饰代码块</strong>：锁的是 <code>synchronized(obj)</code> 括号里写的那个 <code>obj</code>。</li>
      </ul>
      <p>
        最容易踩的坑：实例方法的锁和静态方法的锁是<strong>两把不同的锁</strong>（一个是实例、一个是类对象），
        它们之间不会互斥。两个线程一个调实例方法、一个调静态方法，可以同时进入。
      </p>
      <Callout variant="warn" title="锁对象千万别选错：可变引用 / 字符串常量">
        <p>
          锁对象有两条铁律：<strong>必须是 final 的</strong>（不能中途被换成另一个对象，否则不同线程锁的是不同对象，互斥直接失效），
          以及<strong>不要锁字符串常量或包装类缓存对象</strong>（如 <code>"lock"</code>、<code>Integer.valueOf(1)</code>）。
          字符串常量在常量池里全局唯一，你这里锁它、别处某段毫不相干的代码也锁了同一个字面量，就会莫名其妙互相阻塞，
          排查起来极其痛苦。最佳实践：用一个 <code>private final Object lock = new Object();</code> 专门当锁。
        </p>
        <CodeBlock lang="java" title="两个经典反例" code={wrongLockCode} />
      </Callout>

      <Example title="同一把锁才会互斥">
        <p>
          假设有 10 个线程，全都调用同一个对象的同步实例方法——它们抢的是同一个 <code>this</code> 锁，
          所以必须排队，同一时刻只有一个能进。但如果这 10 个线程分别操作 10 个<em>不同</em>的实例对象，
          那就是 10 把锁、互不干扰，全部能并行执行，等于没加锁的效果。
        </p>
        <p>
          所以面试官问「我加了 <code>synchronized</code> 为什么还线程不安全」，十有八九是
          <strong>锁错了对象</strong>：本该锁同一个对象，结果每个线程锁了各自的对象。
        </p>
      </Example>

      <h2>synchronized 是可重入的</h2>
      <p>
        一个常被追问的特性：<code>synchronized</code> 是<strong>可重入锁</strong>。同一个线程已经持有某把锁，
        再次进入用同一把锁保护的代码时，<strong>不需要重新竞争</strong>，直接放行。如果不可重入，会怎样？看下面 <code>a()</code> 调 <code>b()</code> 的例子：
        a 已经拿着 this 锁，调 b 又要 this 锁——若不可重入，线程就会等一把<strong>自己已经持有</strong>的锁，<strong>把自己锁死</strong>（自锁死锁）。
        可重入正是为了避免这种荒谬的自我死锁。实现上 monitor 内部有个<strong>重入计数器</strong>：重入 +1、退出 -1，减到 0 才真正释放锁。
      </p>
      <CodeBlock lang="java" title="Reentrant.java" code={reentrantCode} />

      <h2>底层实现：monitor 与对象头</h2>
      <p>
        编译后，同步代码块会生成一对字节码指令 <code>monitorenter</code> 和 <code>monitorexit</code>，
        分别在进入和退出时执行（同步方法则是在方法的访问标志里打一个 <code>ACC_SYNCHRONIZED</code> 标记，
        由 JVM 隐式完成加解锁）。它们操作的对象叫 <em>monitor</em>（监视器锁），是每个 Java 对象都自带的一把锁。
      </p>
      <p>
        细节追问：为什么字节码里常看到<strong>一个 monitorenter 配两个 monitorexit</strong>？因为 JVM 要保证<strong>异常路径也能释放锁</strong>——
        正常退出走第一个 monitorexit，一旦同步块内抛异常，则走编译器自动生成的异常处理 monitorexit。这就是为什么 synchronized
        即使临界区抛异常也<strong>不会死锁</strong>（锁一定被释放），而手写 Lock 必须自己在 finally 里 unlock。
      </p>
      <p>
        锁信息存在对象的<em>对象头</em>里，具体是其中一块叫 <em>Mark Word</em> 的区域。Mark Word 会随着锁状态
        复用同一段内存：无锁时存哈希码和分代年龄，加锁后则改存指向锁记录或 monitor 的指针、以及标记当前锁的级别。
        正是因为 Mark Word 能记录「当前是哪一级锁」，才有了下面要讲的锁升级。重量级锁状态下，monitor 对应一个 C++ 的
        <code>ObjectMonitor</code> 对象，里面有 <code>_owner</code>（持锁线程）、<code>_EntryList</code>（抢锁阻塞队列）、
        <code>_WaitSet</code>（调用 wait 后的等待队列）三个关键结构——这也解释了 wait/notify 为什么必须在 synchronized 里：它们操作的就是这个 monitor 的 WaitSet。
      </p>

      <LockUpgrade />

      <h2>锁升级：从无锁到重量级</h2>
      <p>
        JDK 6 之前，<code>synchronized</code> 一上来就是重量级锁——要向操作系统申请互斥量、把竞争失败的线程
        挂起并切换到内核态，开销极大，所以那时大家都说它「慢」。JDK 6 引入了
        <strong>锁升级</strong>（也叫锁膨胀）机制，根据竞争激烈程度，让锁从轻到重逐级演进：
      </p>
      <ul>
        <li>
          <strong>无锁</strong>：对象刚创建、没人加锁的初始状态。
        </li>
        <li>
          <strong>偏向锁</strong>：只有一个线程反复进出同步块、根本没有竞争时，把这个线程 ID 记进 Mark Word。
          下次同一个线程再进来，发现 ID 是自己，直接放行，连 CAS 都省了。适合「一个线程独占」的场景。
        </li>
        <li>
          <strong>轻量级锁</strong>：当出现第二个线程来抢（但抢得不凶）时，偏向锁撤销，升级为轻量级锁。
          线程通过 <em>CAS</em> 自旋去抢锁——不挂起、空转几圈等持锁线程释放，避免昂贵的线程切换。
        </li>
        <li>
          <strong>重量级锁</strong>：当竞争激烈、自旋多次仍抢不到时，再升级为重量级锁，走操作系统的互斥量，
          抢不到的线程被<em>挂起</em>（阻塞、让出 CPU），等持锁线程释放后再被唤醒。
        </li>
      </ul>
      <Callout variant="info" title="偏向锁撤销为什么贵：StopTheWorld">
        <p>
          偏向锁看着省，但它的<strong>撤销</strong>代价不小。撤销时 JVM 要找到当前持有偏向锁的线程、把它停在一个安全点（safepoint），
          检查它是否还活着、是否还在同步块里，再改写 Mark Word。在到达安全点这一刻会有一次轻量的「STW」。
          如果应用里大量对象先被一个线程偏向、随后又被别的线程访问（撤销频繁），偏向锁带来的撤销开销反而超过它省下的 CAS。
          这正是 JDK 15 把偏向锁<strong>默认关闭并标记废弃</strong>的现实原因：现代服务端应用普遍多线程高竞争，偏向锁性价比变低了。
        </p>
      </Callout>

      <KeyIdea title="只升不降，按竞争强度演进">
        <p>
          锁升级是<strong>单向</strong>的：一旦升到重量级，就不会再降回轻量级或偏向锁。设计思路是「乐观假设」——
          先假设没竞争（偏向），错了再假设竞争不激烈（轻量级自旋），还错才付出最贵的代价（重量级挂起）。
          这样在绝大多数低竞争场景下，都能避免昂贵的内核态切换。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="自旋是把双刃剑">
        <p>
          轻量级锁的 CAS 自旋适合「锁持有时间很短」的场景：空转一会儿就能拿到，比线程切换划算。
          但如果持锁线程长时间不放，自旋就是在<strong>白白烧 CPU</strong>。所以竞争一旦变激烈、自旋达到阈值，
          JVM 就果断升级成重量级锁，让抢不到的线程睡过去，而不是继续空转。这正是「只升不降」的合理性所在。
          JVM 还有<strong>自适应自旋</strong>：根据上一次在同一把锁上自旋成功与否，动态调整下次自旋的次数，让自旋更聪明。
        </p>
      </Callout>

      <h2>锁优化：锁消除与锁粗化</h2>
      <p>
        除了锁升级，JIT 编译器还会做两类自动优化：
      </p>
      <ul>
        <li>
          <strong>锁消除</strong>：通过逃逸分析发现某把锁保护的对象<strong>根本不可能被多线程访问</strong>（比如方法内局部创建、没逃逸出去的 <code>StringBuffer</code>），
          就直接把加锁去掉。所以单线程里用 StringBuffer，那些 synchronized 其实被消除了，不必为此换 StringBuilder。
        </li>
        <li>
          <strong>锁粗化</strong>：发现循环体里反复对同一把锁加解锁（如循环里每次 append），就把锁的范围<strong>扩大到整个循环外</strong>，
          避免反复加解锁的开销。
        </li>
      </ul>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「<code>synchronized</code> 慢不慢」，不要笼统说慢。标准答法是：<strong>JDK 6 之前</strong>确实慢，
        因为它直接用重量级锁、每次加锁都要内核态切换；<strong>JDK 6 之后</strong>引入了偏向锁、轻量级锁和自旋优化，
        实现了锁升级，绝大多数低竞争场景下开销已经很小，因此「不再慢」。再补一句：偏向锁在高版本 JDK（15+）
        已被废弃，因为现代应用竞争普遍偏高、维护偏向锁的成本反而不划算——这能体现你跟进了新版本。
      </p>

      <Practice title="对照三种用法，想清楚锁的是谁">
        <p>
          看下面这段代码，对每个方法默念一遍「它锁的是哪个对象、和别的方法会不会互斥」。重点体会：
          <code>incr</code> 锁 <code>this</code>、<code>incrTotal</code> 锁类对象、<code>incrBlock</code>
          锁 <code>lock</code> 字段——三者是三把不同的锁，互不影响。
        </p>
        <CodeBlock lang="java" title="SyncDemo.java" code={usageCode} />
        <p>
          追问自己：如果把 <code>incrBlock</code> 里的 <code>synchronized(lock)</code> 换成
          <code>synchronized(this)</code>，它就会和 <code>incr</code> 共用同一把锁、互相排队了——这正是
          「锁同一个对象才互斥」的体现。
        </p>
      </Practice>

      <Summary
        points={[
          'synchronized 锁的是对象：实例方法锁 this，静态方法锁 类.class，代码块锁括号里指定的对象。',
          '只有抢同一个对象的锁才会互斥；线程不安全往往是锁错了对象；锁对象要 final，别锁可变引用/字符串常量。',
          'synchronized 可重入：monitor 内部用重入计数器，重入 +1 退出 -1，归零才释放，避免自我死锁。',
          '底层靠 monitorenter/monitorexit 指令操作对象自带的 monitor；多一个 monitorexit 保证异常路径也释放锁。',
          'monitor 对应 ObjectMonitor，含 owner/EntryList/WaitSet，wait/notify 操作的就是 WaitSet，故须在 synchronized 内。',
          '锁升级路径：无锁→偏向锁→轻量级锁（CAS 自旋）→重量级锁（OS 挂起），只升不降，按竞争强度演进。',
          '偏向锁撤销有 STW 代价，现代高竞争应用性价比低，JDK 15+ 默认关闭并废弃；自适应自旋让自旋更聪明。',
          'JIT 还会做锁消除（去掉不逃逸对象的锁）和锁粗化（合并循环内反复加解锁）。',
        ]}
      />
    </>
  )
}

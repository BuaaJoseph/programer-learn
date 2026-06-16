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

      <h2>底层实现：monitor 与对象头</h2>
      <p>
        编译后，同步代码块会生成一对字节码指令 <code>monitorenter</code> 和 <code>monitorexit</code>，
        分别在进入和退出时执行（同步方法则是在方法的访问标志里打一个 <code>ACC_SYNCHRONIZED</code> 标记，
        由 JVM 隐式完成加解锁）。它们操作的对象叫 <em>monitor</em>（监视器锁），是每个 Java 对象都自带的一把锁。
      </p>
      <p>
        锁信息存在对象的<em>对象头</em>里，具体是其中一块叫 <em>Mark Word</em> 的区域。Mark Word 会随着锁状态
        复用同一段内存：无锁时存哈希码和分代年龄，加锁后则改存指向锁记录或 monitor 的指针、以及标记当前锁的级别。
        正是因为 Mark Word 能记录「当前是哪一级锁」，才有了下面要讲的锁升级。
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
        </p>
      </Callout>

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
          '只有抢同一个对象的锁才会互斥；线程不安全往往是锁错了对象（本该共用却各锁各的）。',
          '底层靠 monitorenter/monitorexit 指令操作对象自带的 monitor，锁状态记在对象头的 Mark Word 里。',
          '锁升级路径：无锁→偏向锁→轻量级锁（CAS 自旋）→重量级锁（OS 挂起），按竞争强度逐级演进。',
          '锁升级只升不降，遵循“先乐观再悲观”的设计，在低竞争场景下避免昂贵的内核态切换。',
          'JDK 6 之后因偏向锁、自旋等优化 synchronized 不再慢；偏向锁在 JDK 15+ 已被废弃。',
        ]}
      />
    </>
  )
}

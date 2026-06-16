import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Cas from '@/courses/java-concurrency/illustrations/Cas.jsx'

const atomicCode = `import java.util.concurrent.atomic.AtomicInteger;

public class Counter {
    private final AtomicInteger count = new AtomicInteger(0);

    // 无锁自增：底层就是 CAS 自旋
    public void incr() {
        count.incrementAndGet();   // 等价于下面的手写自旋
    }

    // 手写一遍 CAS 自旋，看清它在干什么
    public void incrByHand() {
        for (;;) {
            int cur = count.get();          // 1. 读当前值（期望值）
            int next = cur + 1;             // 2. 算出新值
            if (count.compareAndSet(cur, next)) {
                return;                     // 3. CAS 成功就退出
            }
            // CAS 失败说明别的线程改过了，重读重试
        }
    }
}`

const abaCode = `import java.util.concurrent.atomic.AtomicStampedReference;

// 初始值 100，初始版本号 0
AtomicStampedReference<Integer> ref =
        new AtomicStampedReference<>(100, 0);

int stamp = ref.getStamp();                 // 拿到当前版本号
Integer val = ref.getReference();           // 拿到当前值

// 比较时连版本号一起比：值对、版本号也对，才更新
boolean ok = ref.compareAndSet(
        val,        // 期望的旧值
        50,         // 要写入的新值
        stamp,      // 期望的旧版本号
        stamp + 1   // 写入时把版本号 +1
);`

const fieldUpdaterCode = `import java.util.concurrent.atomic.AtomicIntegerFieldUpdater;

// 不想为每个对象都包一个 AtomicInteger（省内存），可以用 FieldUpdater
// 对普通的 volatile int 字段做原子更新
public class Node {
    volatile int version;        // 必须是 volatile、非 private、非 static
    static final AtomicIntegerFieldUpdater<Node> V =
        AtomicIntegerFieldUpdater.newUpdater(Node.class, "version");

    void bump() {
        V.incrementAndGet(this);  // 原子地把这个对象的 version + 1
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          锁能保证线程安全，但加锁、解锁、线程挂起唤醒都有代价。有没有「不加锁也能安全更新」的办法？有，
          那就是 <em>CAS</em>。它是整个 <code>java.util.concurrent</code>（JUC）里原子类和各种无锁结构的地基。
          面试这块的八股，绕不开 CAS 怎么工作、原子类怎么用它、以及那个经典的 ABA 问题。
        </p>
      </Lead>

      <h2>CAS 是什么</h2>
      <p>
        <em>CAS</em> 是 Compare-And-Swap（比较并交换）的缩写。它一口气做三件事：传入「内存位置、我期望的旧值、
        要写的新值」，<strong>只有当前内存值确实等于我期望的旧值时，才把它改成新值</strong>，否则什么都不做，
        并返回是否成功。关键在于：这三步是<strong>一条 CPU 原子指令</strong>（x86 上是 <code>cmpxchg</code>）
        完成的，中途不会被打断，所以天然线程安全。
      </p>
      <p>
        因为它是「先假设没人动过、动了就重试」的思路，CAS 属于<em>乐观锁</em>——不像 <code>synchronized</code>
        那样一上来就独占（悲观锁），而是乐观地直接试着改，失败了再说。
      </p>
      <Callout variant="info" title="CAS 凭什么是原子的：硬件级保证">
        <p>
          很多人疑惑：「比较」和「交换」明明是两步，CAS 凭什么不会被打断？答案在<strong>硬件</strong>。x86 用带 <code>lock</code> 前缀的
          <code>cmpxchg</code> 指令，<code>lock</code> 会锁住缓存行（现代 CPU 是锁缓存行而非锁总线，成本小得多），保证这条指令执行期间
          其他核动不了这块内存。所以 CAS 的原子性不是 JVM 软件实现的，而是<strong>直接落到一条 CPU 指令</strong>上。Java 里这条指令的入口是
          <code>Unsafe.compareAndSwapXxx</code>（JDK 9+ 改为 <code>VarHandle</code>），原子类只是对它的封装。
        </p>
      </Callout>

      <Cas />

      <h2>原子类：CAS + 自旋的封装</h2>
      <p>
        <code>AtomicInteger</code>、<code>AtomicLong</code>、<code>AtomicReference</code> 这些原子类，
        内部都是借助 <code>Unsafe</code> 类调用底层 CAS 指令，再套一层<strong>自旋</strong>：CAS 失败了
        就重新读最新值、重新计算、再 CAS，循环直到成功。所以「原子自增」并不是一步到位，而是「读—算—比较交换—
        失败重试」的循环。
      </p>
      <p>
        原子类家族还有几个常被追问的成员：<code>AtomicReference</code>{'<T>'} 原子更新对象引用；
        <code>AtomicIntegerArray</code> 原子更新数组某个下标；<code>AtomicIntegerFieldUpdater</code>{'<T>'}
        在不为每个对象都包一个原子类（省内存）的前提下，对已有的 <code>volatile</code> 字段做原子更新——
        大型框架里为了节省内存常用它。
      </p>
      <CodeBlock lang="java" title="FieldUpdater：省内存的原子更新" code={fieldUpdaterCode} />

      <Example title="无锁计数器">
        <p>
          多个线程同时给一个计数器加一。用锁的话，每次自增都要抢锁；用 <code>AtomicInteger</code>，
          线程各自读到当前值、算出 +1 后的值，然后用 CAS 写回。只有一个线程能 CAS 成功，
          其余失败的线程发现值变了，就重读重试一遍。
        </p>
        <p>
          竞争不激烈时，这比加锁快得多——没有线程挂起唤醒的开销。但竞争一激烈，大量线程都在反复 CAS 失败、空转重试，
          CPU 就被白白消耗，这就是下面要说的 CAS 三大问题之一。
        </p>
      </Example>

      <h2>CAS 的三大问题</h2>
      <ul>
        <li>
          <strong>ABA 问题</strong>：线程读到值是 A，准备 CAS；其间别的线程把它从 A 改成 B、又改回 A。
          当前线程的 CAS 看到「还是 A」就成功了，却没察觉中间发生过变化。多数计数场景无所谓，但涉及
          「值虽相同、状态已变」（比如指针、对象引用）时就会出错。
        </li>
        <li>
          <strong>自旋开销</strong>：高竞争下 CAS 频繁失败，线程一直循环重试，空耗 CPU。
        </li>
        <li>
          <strong>只能保证一个变量</strong>：CAS 一次只能原子地更新一个变量。想原子地更新多个，
          得用 <code>AtomicReference</code> 把它们封成一个对象一起换，或者退回去用锁。
        </li>
      </ul>
      <Callout variant="warn" title="ABA 不是危言耸听：无锁栈的真实 bug">
        <p>
          ABA 在<strong>无锁数据结构</strong>里是真实会出事的。设想一个用 CAS 实现的无锁栈，栈顶是节点 A（A.next = B）。
          线程 1 读到栈顶 A，准备 <code>CAS(top, A, B)</code> 弹出 A，刚读完就被挂起。这时线程 2 弹出 A、弹出 B，又压入了一个<strong>复用的旧节点 A</strong>
          （但此时 A.next 已经不是 B 了，可能指向已被回收的内存）。线程 1 恢复，CAS 发现栈顶「还是 A」，成功！于是把 top 设成了一个<strong>悬空/错误的 B</strong>，
          数据结构被破坏。这就是 C/C++ 无锁编程里臭名昭著的 ABA。解药就是下面的版本号。
        </p>
      </Callout>

      <KeyIdea title="ABA 的解药：加版本号">
        <p>
          解决 ABA 的标准做法是<strong>给值附带一个版本号（戳记）</strong>，每次修改都让版本号 +1。
          这样即使值从 A 变 B 又变回 A，版本号也已经从 0 涨到 2，CAS 时连版本号一起比较，就能识破「中间被动过」。
          Java 提供了 <code>AtomicStampedReference</code>（带 int 版本号）来做这件事；如果只关心
          「有没有被动过」而不在乎动了几次，可以用更轻的 <code>AtomicMarkableReference</code>（带布尔标记）。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="高并发计数别用 AtomicLong，用 LongAdder">
        <p>
          <code>AtomicLong</code> 让所有线程去 CAS <strong>同一个</strong>变量，竞争一高就疯狂自旋重试。
          <code>LongAdder</code> 换了思路：把一个值拆成多个 <em>Cell</em> 分段，不同线程更新不同的 Cell、
          各自 CAS 互不打架，要取总和时再把所有 Cell 加起来。这是用「空间换并发」，把热点分散开。
          所以<strong>写多读少、追求高并发吞吐</strong>就选 LongAdder；要求每次读都拿到精确实时值、或竞争不高，
          才用 AtomicLong。
        </p>
        <p>
          补一个底层细节：LongAdder 的多个 Cell 之所以快，还因为它做了<strong>缓存行填充</strong>（<code>@Contended</code>），
          让相邻 Cell 落在不同缓存行，避免「<strong>伪共享</strong>」——多个核更新同一缓存行里的不同变量却互相导致缓存失效。
          伪共享是高性能并发里很隐蔽的杀手，这点拿出来说能让面试官眼前一亮。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「CAS 和锁的区别」，答：CAS 是乐观锁、靠 CPU 原子指令无锁更新，低竞争下快；
        <code>synchronized</code> 是悲观锁、会阻塞线程，高竞争下更稳。被追问「CAS 有什么缺点」，
        就报出三大问题并给出对应方案：ABA 用 <code>AtomicStampedReference</code> 加版本号、
        自旋开销在高竞争下改用锁或 <code>LongAdder</code>、多变量用 <code>AtomicReference</code> 打包。
        能把「问题—方案」成对说出来，这题就满分了。
      </p>

      <Practice title="手写 CAS 自增，再用版本号破 ABA">
        <p>
          先看无锁计数器：注意 <code>incrByHand</code> 那个 <code>for(;;)</code> 自旋循环，它就是
          <code>incrementAndGet</code> 内部干的事。
        </p>
        <CodeBlock lang="java" title="Counter.java" code={atomicCode} />
        <p>
          再看怎么用 <code>AtomicStampedReference</code> 防 ABA：CAS 时把值和版本号一起比对，更新时版本号 +1。
          只要中间有人动过，版本号对不上，CAS 就会失败。
        </p>
        <CodeBlock lang="java" title="AbaDemo.java" code={abaCode} />
      </Practice>

      <Summary
        points={[
          'CAS（比较并交换）是一条 CPU 原子指令（cmpxchg + lock 前缀锁缓存行），值等于期望旧值才更新，是无锁的乐观锁。',
          'CAS 的原子性由硬件保证，Java 入口是 Unsafe（JDK 9+ 用 VarHandle），原子类是其封装。',
          'AtomicInteger 等原子类用 CAS + 自旋实现；还有 AtomicReference、数组类、FieldUpdater（省内存更新 volatile 字段）。',
          'CAS 三大问题：ABA、自旋开销、只能保证一个变量；ABA 在无锁栈等结构里会真正破坏数据。',
          'ABA 用 AtomicStampedReference 加版本号解决；多变量用 AtomicReference 打包；高竞争自旋大可改用锁。',
          'LongAdder 把值分段成多个 Cell、分散热点，并用缓存行填充避免伪共享，高并发写比 AtomicLong 吞吐高。',
          '选型：低竞争或要精确实时值用 AtomicLong，写多读少追求吞吐用 LongAdder。',
        ]}
      />
    </>
  )
}

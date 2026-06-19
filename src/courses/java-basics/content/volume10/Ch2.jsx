import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jmmSnippet = `// JMM 抽象：每个线程有自己的工作内存（对应寄存器/缓存），
// 共享变量在主内存；线程改的是工作内存副本，需同步回主内存
//
//   线程A 工作内存 --写回--> 主内存 <--读取-- 线程B 工作内存
//
// 没有同步手段时，线程 A 的修改对线程 B 不一定可见 -> 可见性问题

// 三大特性
// 原子性：一个或一组操作不可被中断（i++ 不是原子的！含读-改-写三步）
// 可见性：一个线程的修改，其他线程能立刻看到
// 有序性：程序执行顺序符合代码顺序（编译器/CPU 可能重排）`

const volatileSnippet = `// volatile 双重作用：可见性 + 禁止重排
class Singleton {
    // 必须 volatile：防止「分配内存->赋值引用->初始化对象」被重排，
    // 否则别的线程可能拿到「引用非空但对象没初始化完」的半成品
    private static volatile Singleton instance;
    public static Singleton get() {
        if (instance == null) {                 // 第一次检查（不加锁）
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查（加锁内）
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
// volatile 不保证原子性：volatile int 的 i++ 仍线程不安全`

const adderSnippet = `// 高并发计数：LongAdder 远胜 AtomicLong
LongAdder counter = new LongAdder();
counter.increment();        // 多线程分散到不同 Cell，减少 CAS 冲突
long total = counter.sum(); // 求和时汇总所有 Cell

// AtomicLong 高并发下所有线程争同一个 value，CAS 失败重试激烈；
// LongAdder 把热点拆成多个 Cell 分摊写，最后求和 —— 写多读少时吞吐高得多`

const toolSnippet = `// CountDownLatch：等 N 个任务都完成（一次性，倒计时到 0）
CountDownLatch latch = new CountDownLatch(3);
// 每个子任务结束时 latch.countDown();
latch.await();                          // 主线程阻塞直到归零

// CyclicBarrier：N 个线程互相等待，到齐再一起继续（可重复使用）
CyclicBarrier barrier = new CyclicBarrier(3, () -> System.out.println("到齐了"));
barrier.await();

// Semaphore：信号量，控制同时访问的线程数（限流）
Semaphore sem = new Semaphore(5);       // 最多 5 个并发
sem.acquire(); try { /* 临界区 */ } finally { sem.release(); }`

const threadLocalSnippet = `// ThreadLocal：每个线程一份独立副本，天然隔离，无需加锁
private static final ThreadLocal<SimpleDateFormat> FMT =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

String s = FMT.get().format(new Date());   // 各线程用自己的 SDF，互不干扰

// 关键：用完必须 remove，否则线程池复用线程会内存泄漏 + 脏数据
try {
    FMT.get();
} finally {
    FMT.remove();
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        并发的最后一块拼图是<strong>内存模型与并发工具</strong>。这一章讲透：JMM 是什么、并发三大特性
        （原子性 / 可见性 / 有序性）、happens-before 规则、指令重排、<code>final</code> 与 <code>volatile</code> 的作用、
        原子类与累加器 <code>LongAdder</code>、三大同步工具（<code>Semaphore</code> / <code>CyclicBarrier</code> / <code>CountDownLatch</code>）、
        <code>CompletableFuture</code>、<code>ForkJoinPool</code>，并把 <code>ThreadLocal</code> 从原理到坑全部拆开。
      </Lead>

      <h2>一、JMM：Java 内存模型</h2>
      <p>
        JMM（Java Memory Model）不是物理内存结构，而是一套<strong>规范</strong>：它定义了多线程下，一个线程对共享变量的
        写入<strong>何时、以何种顺序</strong>对另一个线程可见。它要解决的是现代 CPU 多级缓存、编译器优化、指令重排带来的
        「我改了你却看不到 / 看到的顺序乱了」问题。
      </p>
      <CodeBlock lang="java" title="JMM 抽象与三大特性" code={jmmSnippet} />
      <p>
        JMM 把内存抽象成<strong>主内存</strong>（所有线程共享）和每个线程私有的<strong>工作内存</strong>。
        线程操作变量时，先把主内存的值拷到工作内存，改完再写回。问题就出在「写回」与「读取」的时机不确定——
        没有同步手段时，一个线程的修改可能迟迟不被另一个线程看到。
      </p>

      <h2>二、原子性、可见性、有序性</h2>
      <ul>
        <li><strong>原子性</strong>：一个操作（或一组操作）要么全做完、要么都不做，中间不可被打断。
            注意 <code>i++</code> <strong>不是</strong>原子的——它含「读 i、加 1、写回」三步，多线程交错会丢更新。</li>
        <li><strong>可见性</strong>：一个线程修改了共享变量，其他线程能<strong>立即</strong>看到最新值。可见性问题正是缓存不同步导致的。</li>
        <li><strong>有序性</strong>：程序实际执行的顺序与代码书写顺序一致。但编译器和 CPU 为了优化会做<strong>指令重排</strong>，
            在单线程下不影响结果，多线程下却可能出乱子。</li>
      </ul>
      <KeyIdea>
        并发 bug 几乎都能归到这三个特性上。<code>synchronized</code> 三者都能保证；
        <code>volatile</code> 保证可见性和有序性、不保证原子性；原子类用 CAS 保证（单变量的）原子性 + 可见性。
        选工具，就是看你缺哪个特性。
      </KeyIdea>

      <h2>三、指令重排与 happens-before</h2>
      <p>
        <strong>指令重排</strong>是编译器、CPU 为提升性能调整指令执行顺序的优化。只要保证<strong>单线程内结果不变</strong>
        （as-if-serial），它就可以重排。但多线程下，A 线程看到的 B 线程指令顺序可能和代码不一致，引发诡异 bug。
      </p>
      <p>
        JMM 用 <strong>happens-before</strong> 规则来约束：如果操作 A happens-before 操作 B，那么 A 的结果对 B
        <strong>一定可见</strong>，且 A 一定排在 B 之前（语义上）。这是判断「两个操作是否存在可见性 / 有序性保证」的核心准则。
      </p>
      <p>常用的 happens-before 规则：</p>
      <ul>
        <li><strong>程序顺序规则</strong>：单线程内，前面的操作 happens-before 后面的操作。</li>
        <li><strong>锁规则</strong>：一个锁的解锁 happens-before 后续对同一锁的加锁。</li>
        <li><strong>volatile 规则</strong>：对 volatile 变量的写 happens-before 后续对它的读。</li>
        <li><strong>传递性</strong>：A hb B，B hb C，则 A hb C。</li>
        <li><strong>线程启动 / 终止规则</strong>：<code>start()</code> hb 子线程内操作；子线程内操作 hb 其他线程的 <code>join()</code> 返回。</li>
      </ul>

      <h2>四、volatile 与 final 的作用</h2>
      <p><code>volatile</code> 做两件事：</p>
      <ul>
        <li><strong>保证可见性</strong>：写 volatile 变量立刻刷回主内存，读时直接读主内存最新值。</li>
        <li><strong>禁止重排</strong>：在 volatile 读 / 写前后插入内存屏障，阻止相关指令越过它重排——双重检查锁的单例必须给字段加 volatile，
            就是为了防止「对象引用赋值」与「对象初始化」被重排导致拿到半成品。</li>
      </ul>
      <CodeBlock lang="java" title="volatile 与双重检查锁单例" code={volatileSnippet} />
      <Callout variant="note" title="final 能保证可见性吗">
        <strong>能，部分地。</strong>JMM 对 <code>final</code> 字段有特殊规定：只要在构造函数里正确初始化了 final 字段、
        且构造期间没把 <code>this</code> 引用泄漏出去，那么<strong>其他线程拿到这个对象的引用后，一定能看到 final 字段被正确赋的值</strong>，
        无需额外同步。这就是「final 字段的初始化安全保证」。它靠的是在构造函数末尾插入 StoreStore 屏障，
        防止 final 写被重排到对象引用发布之后。注意它只保证「构造时的初始值可见」，不解决普通可变字段的可见性。
      </Callout>

      <h2>五、原子类与 LongAdder</h2>
      <p>
        <code>java.util.concurrent.atomic</code> 提供 <code>AtomicInteger</code>、<code>AtomicLong</code>、
        <code>AtomicReference</code> 等，用 <strong>CAS 无锁</strong>实现原子的自增、更新等操作，比加锁轻。
        它们正是解决「<code>i++</code> 非原子」的标准手段。
      </p>
      <p>
        但高并发下 <code>AtomicLong</code> 有瓶颈：所有线程争同一个 value、CAS 大量失败重试。
        JDK 8 的 <strong>LongAdder</strong> 用「<strong>分散热点</strong>」思路——把计数拆成多个 Cell，不同线程更新不同 Cell，
        减少 CAS 冲突，求和时再把所有 Cell 加起来。<strong>写多读少的计数场景</strong>，LongAdder 吞吐远超 AtomicLong。
      </p>
      <CodeBlock lang="java" title="LongAdder vs AtomicLong" code={adderSnippet} />

      <h2>六、并发工具类</h2>
      <CodeBlock lang="java" title="三大同步工具" code={toolSnippet} />
      <table>
        <thead>
          <tr><th>工具</th><th>作用</th><th>能否重用</th></tr>
        </thead>
        <tbody>
          <tr><td>CountDownLatch</td><td>一个 / 多个线程等待 N 个事件完成（倒计时）</td><td>否（到 0 即废）</td></tr>
          <tr><td>CyclicBarrier</td><td>N 个线程互相等待、到齐再一起走</td><td>是（可循环）</td></tr>
          <tr><td>Semaphore</td><td>控制同时访问的线程数（限流 / 资源池）</td><td>是</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="Latch 与 Barrier 别混">
        <code>CountDownLatch</code> 是「<strong>一个或几个线程等一群任务都干完</strong>」（如主线程等所有子任务），减计数、一次性；
        <code>CyclicBarrier</code> 是「<strong>一群线程互相等彼此都到达某点</strong>」再齐步走（如多阶段并行计算），可重复用。
      </Callout>

      <h2>七、CompletableFuture 与 ForkJoinPool</h2>
      <p>
        <strong>CompletableFuture</strong>（JDK 8）是异步编排利器，弥补了 <code>Future</code> 不能链式回调、不能组合的缺陷。
        它支持 <code>thenApply</code>（转换结果）、<code>thenCompose</code>（串联两个异步）、<code>thenCombine</code>（合并两个结果）、
        <code>exceptionally</code>（异常兜底）、<code>allOf</code> / <code>anyOf</code>（聚合多个），把回调地狱写成流畅的链式调用。
      </p>
      <p>
        <strong>ForkJoinPool</strong> 是为<strong>分治任务</strong>设计的线程池：把大任务递归拆成小任务（fork），
        再合并结果（join）。它的核心是<strong>工作窃取（work-stealing）</strong>——每个线程有自己的双端队列，
        干完自己的活就去「偷」别的线程队列尾部的任务，最大化 CPU 利用率。
        Java 8 的并行流（<code>parallelStream</code>）和 <code>CompletableFuture</code> 默认都跑在公共 ForkJoinPool 上。
      </p>

      <h2>八、ThreadLocal 全解</h2>
      <p>
        <code>ThreadLocal</code> 提供<strong>线程本地变量</strong>：每个线程访问它都拿到自己的一份独立副本，线程间天然隔离，
        从而<strong>无需加锁就能保证线程安全</strong>。典型用途：包裹非线程安全的工具（如 <code>SimpleDateFormat</code>）、
        在一次请求链路里传递上下文（用户信息、traceId）、数据库连接 / 事务的线程绑定。
      </p>
      <CodeBlock lang="java" title="ThreadLocal 正确用法" code={threadLocalSnippet} />
      <h3>为什么用它 / 资源隔离如何实现</h3>
      <p>
        关键在存储结构：变量其实不存在 <code>ThreadLocal</code> 对象里，而是存在<strong>每个 Thread 自己的 ThreadLocalMap</strong> 里。
        <code>threadLocal.get()</code> 实际是「拿当前线程的 ThreadLocalMap，以这个 ThreadLocal 实例为 key 取值」。
        因为 map 属于线程自己，各线程读写的是各自的 map，自然隔离，不存在竞争。
      </p>
      <h3>key 为何用弱引用</h3>
      <p>
        <code>ThreadLocalMap</code> 的 Entry 的 key（即 ThreadLocal 实例）是<strong>弱引用</strong>，value 是强引用。
        这样设计是为了：当外部不再强引用某个 ThreadLocal 时，GC 能回收这个 key，避免 ThreadLocal 对象本身泄漏。
      </p>
      <Callout variant="warn" title="ThreadLocal 的内存泄漏与最佳实践">
        弱引用只回收了 key，<strong>value 仍是强引用</strong>。如果线程长期存活（如线程池的复用线程），key 被回收变成 null、
        value 却一直挂着，就形成「key=null 的脏 Entry」——既泄漏内存，下次复用线程时还可能读到上次的脏数据。
        最佳实践：<strong>用完一定在 finally 里 remove()</strong>，并优先把 ThreadLocal 声明为 <code>static final</code>。
      </Callout>
      <h3>InheritableThreadLocal / FastThreadLocal / TransmittableThreadLocal</h3>
      <ul>
        <li><strong>InheritableThreadLocal</strong>：让<strong>子线程能继承父线程</strong>创建时的值（父 new 子时拷贝过去）。
            缺陷：对线程池<strong>无效</strong>——池里线程是复用的、不是每次 new 的，拿到的是创建时的旧值。</li>
        <li><strong>FastThreadLocal</strong>：Netty 提供的实现，用<strong>数组下标</strong>而非 hash 定位，避免了 ThreadLocalMap 的
            hash 冲突探测，配合 <code>FastThreadLocalThread</code> 访问更快，适合 Netty 这种极致性能场景。</li>
        <li><strong>TransmittableThreadLocal（TTL）</strong>：阿里开源，专门解决「<strong>线程池场景下上下文传递</strong>」——
            通过装饰任务，在任务提交时捕获父线程的值、执行时还原，弥补 InheritableThreadLocal 对线程池失效的问题，
            是分布式链路追踪、跨线程传 traceId 的常用方案。</li>
      </ul>

      <Summary
        points={[
          'JMM 是规范，定义共享变量在主内存/工作内存间的可见时机；要解决可见性/有序性问题。',
          '并发三大特性：原子性(i++ 非原子)、可见性、有序性；synchronized 全保，volatile 保可见+有序不保原子。',
          '指令重排在单线程下保 as-if-serial；happens-before（程序顺序/锁/volatile/传递/start-join）是判断跨线程可见的准则。',
          'volatile 保可见性+禁重排(双重检查锁需 volatile)；final 有初始化安全保证，正确构造且不泄漏 this 时其值对其他线程可见。',
          '原子类用 CAS 实现原子操作；高并发计数用 LongAdder（分散热点 Cell）胜过 AtomicLong；CountDownLatch/CyclicBarrier/Semaphore 各司其职。',
          'CompletableFuture 链式异步编排，ForkJoinPool 分治+工作窃取；ThreadLocal 靠线程私有 ThreadLocalMap 隔离、key 弱引用、用完必须 remove，TTL 解决线程池上下文传递。',
        ]}
      />
    </article>
  )
}

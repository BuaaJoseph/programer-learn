import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createSnippet = `// 方式 1：继承 Thread，重写 run（不推荐，占用继承名额）
class MyThread extends Thread {
    public void run() { System.out.println("running"); }
}
new MyThread().start();

// 方式 2：实现 Runnable（推荐，面向接口）
Runnable r = () -> System.out.println("running");
new Thread(r).start();

// 方式 3：Callable + FutureTask（有返回值、能抛异常）
Callable<Integer> c = () -> 42;
FutureTask<Integer> task = new FutureTask<>(c);
new Thread(task).start();
Integer result = task.get();   // 阻塞拿结果

// 方式 4：线程池（实际工程首选，复用线程）
ExecutorService pool = Executors.newFixedThreadPool(4);
Future<Integer> f = pool.submit(() -> 42);`

const stateSnippet = `// Thread.State 六种状态（枚举）
NEW            // 已创建未 start
RUNNABLE       // 可运行（包含 OS 层的就绪与运行，Java 不细分）
BLOCKED        // 等待进入 synchronized 同步块（抢锁失败）
WAITING        // 无限等待：wait() / join() / park()
TIMED_WAITING  // 限时等待：sleep(t) / wait(t) / join(t)
TERMINATED     // 执行结束

// 典型流转：
// NEW --start--> RUNNABLE
// RUNNABLE --抢锁失败--> BLOCKED --拿到锁--> RUNNABLE
// RUNNABLE --wait()--> WAITING --notify()--> BLOCKED（要重新抢锁）--> RUNNABLE
// RUNNABLE --run 结束--> TERMINATED`

const waitNotifySnippet = `// wait / notify 必须在 synchronized 块内，且锁对象就是调用对象
final Object lock = new Object();

// 消费者
synchronized (lock) {
    while (!conditionMet) {     // 必须用 while 而非 if，防虚假唤醒
        lock.wait();            // 释放锁并挂起，被唤醒后重新抢锁
    }
    // 处理数据
}

// 生产者
synchronized (lock) {
    conditionMet = true;
    lock.notifyAll();           // 唤醒所有等待者（notify 只唤醒一个，可能丢信号）
}`

const orderSnippet = `// 控制线程执行顺序：用 join 让 t1 -> t2 -> t3 顺序执行
Thread t1 = new Thread(() -> System.out.println("1"));
Thread t2 = new Thread(() -> System.out.println("2"));
Thread t3 = new Thread(() -> System.out.println("3"));

t1.start();
t1.join();      // 主线程等 t1 结束
t2.start();
t2.join();      // 等 t2 结束
t3.start();
t3.join();
// 也可用 CountDownLatch / 单线程池 / CompletableFuture.thenRun 串联`

const deadlockSnippet = `// 经典死锁：两个线程以相反顺序获取两把锁
Object A = new Object(), B = new Object();

// 线程 1：先 A 后 B
synchronized (A) { synchronized (B) { } }
// 线程 2：先 B 后 A
synchronized (B) { synchronized (A) { } }
// 1 持有 A 等 B，2 持有 B 等 A —— 互相等待，死锁

// 避免：所有线程按同一全局顺序获取锁（如总是先 A 后 B）`

export default function Ch1() {
  return (
    <article>
      <Lead>
        并发是 Java 高级面试的分水岭。这一章打基础：如何创建线程、线程的六种生命周期状态、
        什么是线程同步与线程安全、线程之间怎么通信、协程是什么 Java 又支持到什么程度、
        <code>sleep</code> 与 <code>yield</code> 的区别、<code>wait</code>/<code>notify</code> 三件套、
        死锁如何产生与避免、如何控制多个线程的执行顺序、以及主线程怎么知道子线程是否成功。
      </Lead>

      <h2>一、如何创建多线程</h2>
      <p>
        Java 创建线程主要有四种方式，背后其实只有两类：要么<strong>提供任务体</strong>（run / call），
        要么把任务交给<strong>线程载体</strong>（Thread / 线程池）去跑。
      </p>
      <CodeBlock lang="java" title="四种创建线程的方式" code={createSnippet} />
      <ul>
        <li><strong>继承 Thread</strong>：简单但占掉唯一的继承名额，耦合高，不推荐。</li>
        <li><strong>实现 Runnable</strong>：面向接口，任务与线程解耦，可被多个线程复用，推荐。</li>
        <li><strong>Callable + FutureTask</strong>：能<strong>返回结果、抛受检异常</strong>，<code>future.get()</code> 阻塞取值。</li>
        <li><strong>线程池</strong>：复用线程、控制并发数，<strong>工程实战首选</strong>，下一章详讲。</li>
      </ul>
      <Callout variant="warn" title="必须调 start 而不是 run">
        直接调 <code>run()</code> 只是<strong>在当前线程同步执行一个普通方法</strong>，不会开新线程；
        只有 <code>start()</code> 才会向 JVM / OS 申请新线程并由它回调 <code>run()</code>。
        而且一个线程对象 <code>start()</code> 只能调用一次，再调抛 <code>IllegalThreadStateException</code>。
      </Callout>

      <h2>二、线程生命周期：六种状态</h2>
      <p>
        Java 用 <code>Thread.State</code> 枚举定义了六种状态。注意它<strong>不区分操作系统层的「就绪」和「运行」</strong>，
        两者统称 <code>RUNNABLE</code>。
      </p>
      <CodeBlock lang="java" title="线程六种状态与流转" code={stateSnippet} />
      <table>
        <thead>
          <tr><th>状态</th><th>含义</th><th>如何进入</th></tr>
        </thead>
        <tbody>
          <tr><td>NEW</td><td>新建未启动</td><td>new Thread()</td></tr>
          <tr><td>RUNNABLE</td><td>可运行（就绪或运行中）</td><td>start()</td></tr>
          <tr><td>BLOCKED</td><td>等待进入 synchronized</td><td>抢锁失败</td></tr>
          <tr><td>WAITING</td><td>无限等待</td><td>wait() / join() / park()</td></tr>
          <tr><td>TIMED_WAITING</td><td>限时等待</td><td>sleep(t) / wait(t) / join(t)</td></tr>
          <tr><td>TERMINATED</td><td>已结束</td><td>run() 返回或抛异常</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="BLOCKED 与 WAITING 的区别">
        <code>BLOCKED</code> 专指「抢 <code>synchronized</code> 锁没抢到」时的等待，是被动卡在锁门口；
        <code>WAITING</code> 是主动调用 <code>wait</code> / <code>join</code> 让出执行、等别人唤醒。
        关键差异：被 <code>notify</code> 唤醒的线程不会直接回到 RUNNABLE，而是先进入 <code>BLOCKED</code>
        去重新争抢那把锁，抢到才 RUNNABLE。
      </Callout>

      <h2>三、线程同步与线程安全</h2>
      <p>
        <strong>线程安全</strong>是指：多个线程并发访问同一份共享数据时，无论它们如何交错执行，结果都正确、
        符合预期，不会因为竞态条件（race condition）出现脏数据。<strong>线程同步</strong>则是达成线程安全的手段——
        通过某种机制让对共享资源的访问<strong>有序、互斥</strong>。
      </p>
      <p>常见同步手段：</p>
      <ul>
        <li><code>synchronized</code>：JVM 内建的互斥锁，修饰方法或代码块。</li>
        <li><code>ReentrantLock</code> 等显式锁：更灵活，可中断、可超时、可公平。</li>
        <li><code>volatile</code>：保证可见性与有序性（不保证原子性）。</li>
        <li>原子类 <code>AtomicInteger</code> 等：用 CAS 做无锁原子操作。</li>
        <li>线程封闭：<code>ThreadLocal</code>、局部变量，让数据不共享。</li>
      </ul>

      <h2>四、线程间如何通信</h2>
      <p>
        线程通信指多个线程为了协作而<strong>互相通知 / 等待</strong>。Java 提供多种机制：
      </p>
      <ul>
        <li><strong>wait / notify / notifyAll</strong>：最基础的等待 / 通知，必须在 <code>synchronized</code> 内用。</li>
        <li><strong>共享变量 + volatile</strong>：一个线程改标志位，另一个轮询读。</li>
        <li><strong>BlockingQueue</strong>：生产者放、消费者取，队列自动阻塞 / 唤醒，最常用。</li>
        <li><strong>Condition</strong>：<code>ReentrantLock</code> 配套的等待 / 通知，可多条件队列。</li>
        <li><strong>CountDownLatch / CyclicBarrier</strong>：用于「等所有人到齐」类协同。</li>
      </ul>
      <CodeBlock lang="java" title="wait / notify 标准范式" code={waitNotifySnippet} />
      <h3>wait、notify、notifyAll 的要点</h3>
      <ul>
        <li>三者都是 <code>Object</code> 的方法，必须在 <strong>持有该对象锁的 synchronized 块内</strong>调用，否则抛 <code>IllegalMonitorStateException</code>。</li>
        <li><code>wait()</code> 会<strong>释放锁</strong>并挂起；被唤醒后要<strong>重新抢锁</strong>才继续。这是它和 <code>sleep</code> 最大的不同——sleep 不释放锁。</li>
        <li>判断条件要用 <code>while</code> 而非 <code>if</code>，防止<strong>虚假唤醒</strong>（spurious wakeup）后条件其实未满足就往下走。</li>
        <li><code>notify</code> 只随机唤醒一个等待者，可能<strong>唤醒了不该醒的、导致信号丢失</strong>；多数情况下用 <code>notifyAll</code> 更安全。</li>
      </ul>

      <h2>五、协程：Java 支持吗</h2>
      <p>
        协程是一种<strong>用户态的轻量级「线程」</strong>，由程序自己（而非操作系统内核）调度，创建和切换成本极低，
        一个进程可以开几十万个。Go 的 goroutine、Kotlin 的 coroutine 都是代表。
      </p>
      <p>
        Java 长期没有原生协程，只能靠线程（重，受 OS 调度，一个线程约占 1MB 栈）或第三方库（Quasar）。
        但 <strong>JDK 21 正式发布的虚拟线程（Virtual Thread，Project Loom）</strong>补上了这一块——它就是 JVM 层面的
        轻量级线程，由 JVM 调度、映射到少量平台线程上，能轻松开百万级，写法和普通线程一样但开销极小。
        所以到 2026 年，<strong>Java 已经通过虚拟线程支持了协程式的并发模型</strong>。
      </p>
      <Callout variant="tip" title="虚拟线程">
        <code>Thread.ofVirtual().start(task)</code> 或 <code>Executors.newVirtualThreadPerTaskExecutor()</code> 即可使用。
        它特别适合<strong>大量阻塞 I/O</strong>的场景：阻塞时虚拟线程会自动让出底层平台线程，不再像传统线程那样
        「一个阻塞就占着一个 OS 线程」。
      </Callout>

      <h2>六、sleep、yield、sleep(0)</h2>
      <table>
        <thead>
          <tr><th>方法</th><th>是否释放锁</th><th>状态</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td>Thread.sleep(t)</td><td>否</td><td>TIMED_WAITING</td><td>让出 CPU 指定时长，到点自动恢复</td></tr>
          <tr><td>Thread.yield()</td><td>否</td><td>仍 RUNNABLE</td><td>提示调度器「我可以让一让」，仅建议无保证</td></tr>
          <tr><td>Object.wait()</td><td>是</td><td>WAITING</td><td>等通知，需 notify 唤醒</td></tr>
        </tbody>
      </table>
      <p>
        <code>sleep</code> 让线程睡指定时间，期间不释放持有的锁；<code>yield</code> 只是给调度器一个「让出当前时间片」的
        <strong>提示</strong>，调度器完全可以无视，线程也可能立刻又被选中，所以 <code>yield</code> 几乎不用于生产逻辑。
      </p>
      <Callout variant="note" title="sleep(0) 有什么用">
        <code>Thread.sleep(0)</code> 不是「睡 0 毫秒等于啥也没干」。它会触发一次<strong>线程调度</strong>：
        当前线程主动放弃剩余时间片、和其他同优先级线程重新竞争 CPU。本质上相当于一次「立即让出再争抢」，
        历史上偶尔用来缓解某线程长期独占 CPU 饿死他人的问题，但现代代码很少这样写。
      </Callout>

      <h2>七、死锁：成因与避免</h2>
      <p>
        死锁是指两个或多个线程<strong>互相持有对方需要的资源、又都在等对方先释放</strong>，谁也不让步，永久卡死。
      </p>
      <CodeBlock lang="java" title="经典死锁示例" code={deadlockSnippet} />
      <p>死锁的四个必要条件（缺一不可）：</p>
      <ul>
        <li><strong>互斥</strong>：资源同一时刻只能被一个线程占用。</li>
        <li><strong>持有并等待</strong>：持有部分资源的同时去申请其他资源。</li>
        <li><strong>不可剥夺</strong>：已得到的资源不能被强行抢走，只能自己释放。</li>
        <li><strong>循环等待</strong>：存在一条线程互相等待的环。</li>
      </ul>
      <p>避免之道就是<strong>破坏其中任一条件</strong>：最常用的是破坏「循环等待」——让所有线程按<strong>同一全局顺序</strong>申请锁；
        其次可用 <code>tryLock(timeout)</code> 超时放弃来破坏「不可剥夺」；或一次性申请全部锁来破坏「持有并等待」。</p>

      <h2>八、控制线程执行顺序</h2>
      <p>
        默认线程并发执行、顺序不可控。要强制 t1 → t2 → t3 顺序，最直接的是 <code>join()</code>：让后一个线程的启动
        等在前一个线程结束之后。
      </p>
      <CodeBlock lang="java" title="用 join 控制顺序" code={orderSnippet} />
      <p>
        其他做法：用<strong>单线程线程池</strong>串行提交任务、用 <code>CountDownLatch</code> 让后者等前者倒计时归零、
        或用 <code>CompletableFuture</code> 的 <code>thenRun</code> / <code>thenApply</code> 把任务链式编排起来。
      </p>

      <h2>九、主线程如何知道子线程是否成功</h2>
      <p>
        子线程内部抛出的异常<strong>不会传播到主线程</strong>（主线程根本感知不到），所以不能靠 try-catch 包住
        <code>start()</code>。可靠的办法有：
      </p>
      <ul>
        <li><strong>Future / Callable</strong>：用线程池 <code>submit</code> 提交，<code>future.get()</code> 时如果子任务抛了异常，
            会以 <code>ExecutionException</code> 包装重新抛出——这是最干净的方式。</li>
        <li><strong>UncaughtExceptionHandler</strong>：给线程设置未捕获异常处理器，子线程崩溃时回调。</li>
        <li><strong>CompletableFuture</strong>：用 <code>exceptionally</code> / <code>whenComplete</code> 拿到异常或结果。</li>
        <li><strong>共享状态</strong>：子线程把结果 / 异常写进共享变量，主线程 <code>join</code> 后读取（最原始）。</li>
      </ul>
      <Example title="用 Future 感知子线程异常">
        <p>
          <code>Future&lt;?&gt; f = pool.submit(task);</code> 之后调用 <code>f.get()</code>。如果 <code>task</code> 正常结束，
          <code>get</code> 返回结果；如果 <code>task</code> 内部抛了异常，<code>get</code> 会抛出
          <code>ExecutionException</code>，其 <code>getCause()</code> 就是原始异常。
          这样主线程就能明确知道「这个子任务到底成功还是失败、失败原因是什么」。
        </p>
      </Example>

      <Summary
        points={[
          '创建线程四法：继承 Thread、实现 Runnable（推荐）、Callable+FutureTask（有返回值）、线程池（实战首选）；必须调 start 而非 run。',
          '线程六态：NEW/RUNNABLE/BLOCKED/WAITING/TIMED_WAITING/TERMINATED；BLOCKED 专指抢锁失败，WAITING 是主动等待。',
          '线程安全=并发下结果仍正确，线程同步是手段（synchronized、Lock、volatile、原子类、ThreadLocal）。',
          'wait/notify 必须在 synchronized 内、wait 释放锁、用 while 防虚假唤醒、优先 notifyAll；sleep 不释放锁，yield 只是提示。',
          '协程是用户态轻量线程；JDK21 虚拟线程（Loom）让 Java 支持百万级轻量并发，尤宜大量阻塞 I/O。',
          '死锁四条件（互斥/持有等待/不可剥夺/循环等待），破坏循环等待最常用（统一加锁顺序）；用 join/Latch/CompletableFuture 控制顺序；用 Future.get 感知子线程成败。',
        ]}
      />
    </article>
  )
}

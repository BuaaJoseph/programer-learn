import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ThreadState from '@/courses/java-concurrency/illustrations/ThreadState.jsx'

const callableCode = `import java.util.concurrent.Callable;
import java.util.concurrent.FutureTask;

public class CallableDemo {
    public static void main(String[] args) throws Exception {
        // Callable 有返回值，可以抛出受检异常，Runnable 都不行
        Callable<Integer> task = () -> {
            int sum = 0;
            for (int i = 1; i <= 100; i++) sum += i;
            return sum;
        };

        // 用 FutureTask 把 Callable 包成一个能交给 Thread 跑的任务
        FutureTask<Integer> future = new FutureTask<>(task);
        new Thread(future).start();

        // get() 会阻塞当前线程，直到结果算完
        System.out.println('结果 = ' + future.get());
    }
}`

const waitNotifyCode = `// wait/notify 必须在 synchronized 块里调用，否则抛 IllegalMonitorStateException
synchronized (lock) {
    // 必须用 while 而不是 if，防止虚假唤醒（spurious wakeup）
    while (!conditionMet) {
        lock.wait();   // 释放锁并进入 WAITING，被唤醒后重新抢锁
    }
    // 条件满足，继续干活
}

// 另一个线程改完条件后唤醒
synchronized (lock) {
    conditionMet = true;
    lock.notifyAll();  // 优先用 notifyAll，notify 只随机唤醒一个，容易丢信号
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          面试聊并发，几乎一定从线程开起头：进程和线程有什么区别？怎么创建一个线程？线程有几种状态、怎么流转？
          这些问题看着基础，其实是后面所有锁、内存模型、线程池的地基。本章把这块地基一次夯实。
        </p>
      </Lead>

      <h2>进程 vs 线程</h2>
      <p>
        <em>进程</em>（process）是操作系统资源分配的基本单位，每个进程有自己<strong>独立的内存空间</strong>；
        <em>线程</em>（thread）是 CPU 调度的基本单位，是进程里的一条执行流。一个进程可以有多个线程，它们
        <strong>共享进程的堆和方法区</strong>，但各自有独立的栈和程序计数器。
      </p>
      <p>
        一句话记牢：进程之间内存隔离、通信要靠管道/socket 等手段，开销大；线程之间共享内存、通信方便，
        但也正因为「共享」才带来了并发安全问题——这就是整门课要解决的核心矛盾。
      </p>

      <h2>创建线程的几种方式</h2>
      <p>常见的有四种，面试时要能说清各自的取舍：</p>
      <ul>
        <li>
          <strong>继承 Thread</strong>：重写 <code>run()</code>。简单，但 Java 单继承，继承了 Thread 就没法再继承别的类，扩展性差。
        </li>
        <li>
          <strong>实现 Runnable</strong>：把任务和线程解耦，更推荐。但 <code>run()</code> 没有返回值、不能抛受检异常。
        </li>
        <li>
          <strong>Callable + FutureTask</strong>：<code>call()</code> 有返回值、能抛异常，配合 <code>FutureTask</code> 拿结果。
        </li>
        <li>
          <strong>线程池</strong>（ThreadPoolExecutor）：生产环境的标准做法，复用线程、控制并发量，后面会专门讲。
        </li>
      </ul>
      <Callout variant="warn" title="启动线程用 start 不是 run">
        <p>
          调 <code>start()</code> 才会真正新建一个线程并由 JVM 调度执行 <code>run()</code>；直接调 <code>run()</code>
          只是在<strong>当前线程</strong>里普通地执行了一个方法，根本没有开新线程。这是最常见的低级错误，面试也爱问。
        </p>
      </Callout>

      <h2>线程的 6 种状态</h2>
      <p>
        Java 在 <code>Thread.State</code> 里定义了 6 种状态，注意它和操作系统的线程状态<strong>不是一一对应</strong>的：
      </p>
      <ul>
        <li><strong>NEW</strong>：刚 new 出来，还没 start。</li>
        <li>
          <strong>RUNNABLE</strong>：可运行。Java 把操作系统层面的「就绪」和「运行」<strong>合并成了一个</strong> RUNNABLE，
          所以一个 RUNNABLE 的线程可能正在 CPU 上跑，也可能在等 CPU。
        </li>
        <li>
          <strong>BLOCKED</strong>：阻塞。<strong>专指</strong>线程在等待进入 <code>synchronized</code> 同步块/方法时抢不到锁。
        </li>
        <li><strong>WAITING</strong>：无限期等待，需要别的线程显式唤醒，如 <code>wait()</code>、<code>join()</code>。</li>
        <li><strong>TIMED_WAITING</strong>：有超时的等待，如 <code>sleep(ms)</code>、<code>wait(ms)</code>。</li>
        <li><strong>TERMINATED</strong>：run 执行完或异常退出，线程结束。</li>
      </ul>

      <Example title="线程状态流转">
        <p>顺着一个线程的一生看状态怎么变，就全串起来了：</p>
        <ul>
          <li>new 出来 → <code>NEW</code>；</li>
          <li>调 <code>start()</code> → <code>RUNNABLE</code>（可能在跑，也可能在等 CPU）；</li>
          <li>抢 synchronized 锁没抢到 → <code>BLOCKED</code>，抢到后回到 <code>RUNNABLE</code>；</li>
          <li>在锁里调 <code>wait()</code> → <code>WAITING</code>，被 <code>notify()</code> 唤醒后先去抢锁；</li>
          <li>调 <code>sleep(1000)</code> → <code>TIMED_WAITING</code>，时间到自动回到 <code>RUNNABLE</code>；</li>
          <li>run 跑完 → <code>TERMINATED</code>，不可逆。</li>
        </ul>
      </Example>

      <ThreadState />

      <KeyIdea title="BLOCKED 和 WAITING 的区别">
        <p>
          这是高频考点。<strong>BLOCKED</strong> 只在抢 <code>synchronized</code> 锁失败时出现，它在等的是「锁」；
          <strong>WAITING</strong> 是主动调 <code>wait()</code>/<code>join()</code> 等进入的，它在等的是「别人来唤醒」。
          一个被动、一个主动；一个等锁、一个等信号。<code>LockSupport.park()</code> 造成的也是 WAITING，而非 BLOCKED。
        </p>
      </KeyIdea>

      <h2>上下文切换的成本</h2>
      <p>
        CPU 在线程之间切换时，要保存当前线程的寄存器、程序计数器等<em>上下文</em>，再加载下一个线程的上下文，这叫
        <em>上下文切换</em>（context switch）。它本身不干活，纯属开销；切换太频繁，CPU 时间就被「搬家」耗掉了。
      </p>
      <p>
        所以线程不是越多越好：线程数远超 CPU 核数时，频繁切换反而拖慢系统。这也是为什么我们用线程池来<strong>限制并发数</strong>，
        以及为什么减少锁竞争（竞争会导致大量阻塞与切换）能提升性能。

      </p>

      <h2>sleep 与 wait 的区别</h2>
      <p>这对「双胞胎」几乎逢面试必问，记住四点差异：</p>
      <ul>
        <li><strong>所属类</strong>：<code>sleep()</code> 是 <code>Thread</code> 的静态方法；<code>wait()</code> 是 <code>Object</code> 的方法。</li>
        <li><strong>锁</strong>：<code>sleep()</code> <strong>不释放锁</strong>，抱着锁睡；<code>wait()</code> <strong>释放锁</strong>，让别人能进。</li>
        <li><strong>使用场景</strong>：<code>wait()</code> 必须在 <code>synchronized</code> 块里用，否则抛异常；<code>sleep()</code> 哪都能用。</li>
        <li><strong>唤醒</strong>：<code>sleep()</code> 到点自动醒；<code>wait()</code> 要等 <code>notify()</code>/<code>notifyAll()</code> 或超时。</li>
      </ul>

      <Practice title="Callable 取结果 + wait/notify 协作">
        <p>
          先用 <code>Callable + FutureTask</code> 跑一个有返回值的任务，体会 <code>get()</code> 的阻塞语义：
        </p>
        <CodeBlock lang="java" title="CallableDemo.java" code={callableCode} />
        <p>
          再看 <code>wait/notify</code> 的标准写法。两个要点：必须在 <code>synchronized</code> 里调用，且判断条件要用
          <code>while</code> 而非 <code>if</code>（防虚假唤醒）：
        </p>
        <CodeBlock lang="java" title="wait/notify 标准范式" code={waitNotifyCode} />
      </Practice>

      <Summary
        points={[
          '进程是资源分配单位、内存隔离；线程是调度单位、共享进程内存，共享带来了并发安全问题。',
          '创建线程有四种方式：继承 Thread、实现 Runnable、Callable+FutureTask（有返回值）、线程池（生产首选）。',
          '启动线程用 start() 而不是 run()；run() 直接调只是普通方法调用，不开新线程。',
          'Java 有 6 种线程状态，把就绪+运行合并为 RUNNABLE；BLOCKED 专指抢 synchronized 锁失败。',
          'BLOCKED 在等锁、被动；WAITING 在等唤醒、主动。上下文切换是纯开销，故要限制并发、减少锁竞争。',
          'sleep 不释放锁、到点自醒；wait 释放锁、须在 synchronized 内、靠 notify 唤醒，且要用 while 防虚假唤醒。',
        ]}
      />
    </>
  )
}

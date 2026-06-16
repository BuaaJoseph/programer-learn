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

const interruptCode = `// 中断不是「强行杀死线程」，而是给线程发一个「请你停下」的协作信号
public class InterruptDemo {
    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            // 检查中断标志：协作式退出的标准写法
            while (!Thread.currentThread().isInterrupted()) {
                // 干活...
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    // 关键：sleep/wait/join 被中断会抛异常，并「清除」中断标志
                    // 想让上层感知，必须重新设置中断标志
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            System.out.println("收到中断，优雅退出");
        });
        worker.start();
        Thread.sleep(500);
        worker.interrupt();   // 发出中断请求，而不是 stop()
    }
}`

const daemonCode = `// 守护线程（daemon）随主线程一起退出，常用于后台 GC、心跳、监控
Thread daemon = new Thread(() -> {
    while (true) {
        // 后台轮询...
    }
});
daemon.setDaemon(true);   // 必须在 start() 之前设置，否则抛 IllegalThreadStateException
daemon.start();
// main 一结束，JVM 不会等这个 daemon，直接退出`

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
      <p>
        再往下挖一层：为什么线程的栈是私有的？因为栈里放的是<strong>方法调用帧、局部变量</strong>，这些天然是「每条执行流自己的事」，
        互不干扰；而堆里放的是 <code>new</code> 出来的对象，方法区里放的是类元信息、常量、静态变量——这些是「大家共用的资源」。
        正因为静态变量和堆对象被共享，两个线程同时读写同一个对象字段时才会撞车。理解了「栈私有、堆共享」这条分界线，
        后面判断「这个变量会不会有线程安全问题」就有了直觉：只在方法内部 new 出来、不逃逸出去的对象天然安全（这就是后面会讲的「逃逸分析」与「栈封闭」）。
      </p>
      <Callout variant="info" title="为什么不直接用多进程做并发">
        <p>
          多进程也能并发，而且内存隔离让它更安全（一个崩了不影响另一个，所以 Chrome 用多进程做沙箱）。
          但进程的创建、切换、通信成本都远高于线程：进程切换要换页表、刷 TLB，进程间通信要走内核拷贝。
          服务端追求高吞吐、低延迟，绝大多数场景用线程（或更轻的协程/虚拟线程）来榨干单机性能，代价就是要自己处理共享内存的安全问题。
        </p>
      </Callout>

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
      <p>
        面试追问常考：「这四种到底有几种？」严格说<strong>本质只有一种</strong>——都是给 <code>Thread</code> 提供一个要执行的任务。
        继承 Thread 是重写它自己的 <code>run()</code>；Runnable/Callable 是把任务作为参数传进去。<code>Thread</code> 的 <code>run()</code>
        默认实现就是「如果构造时传了 Runnable，就执行它的 run」。所以从设计角度看，<strong>组合优于继承</strong>：传 Runnable 把「线程」和「任务」解耦，
        一个任务能复用、能丢给线程池、能换执行方式，这正是 Runnable 比继承 Thread 更被推崇的根本原因。
      </p>
      <Callout variant="warn" title="启动线程用 start 不是 run">
        <p>
          调 <code>start()</code> 才会真正新建一个线程并由 JVM 调度执行 <code>run()</code>；直接调 <code>run()</code>
          只是在<strong>当前线程</strong>里普通地执行了一个方法，根本没有开新线程。这是最常见的低级错误，面试也爱问。
        </p>
        <p>
          源码层面：<code>start()</code> 会调用本地方法 <code>start0()</code>，由 JVM 向操作系统申请一个内核线程并回调 <code>run()</code>。
          还有个细节——<strong>同一个 Thread 对象不能 start 两次</strong>。<code>start()</code> 里会检查线程状态 <code>threadStatus</code>，
          不为 0（即已经启动过）就抛 <code>IllegalThreadStateException</code>。这也解释了为什么线程不可「重启」，要复用只能用线程池。
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
      <Callout variant="info" title="RUNNABLE 为什么把 IO 阻塞也算进去">
        <p>
          一个反直觉的点：线程在做<strong>阻塞式 IO</strong>（比如读 socket、读文件）时，从操作系统看它确实「阻塞」了，
          但 <code>Thread.State</code> 仍然是 <strong>RUNNABLE</strong>，而不是 BLOCKED。原因是 JVM 的状态划分只关心「JVM 层面的等待」，
          它管不到、也不想管操作系统的 IO 等待——对 JVM 而言这个线程随时可能被唤醒去跑，所以归为 RUNNABLE。
          这就是为什么用 jstack 抓线程栈时，看到一堆卡在 socketRead 的线程状态都是 RUNNABLE。这是排查线上「CPU 不高但请求堆积」时的关键认知。
        </p>
      </Callout>

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
        <p>
          一个常被忽略的中间态：被 <code>notify()</code> 唤醒后并不会直接回到 RUNNABLE 接着跑，而是要<strong>重新去抢锁</strong>——
          这一瞬间它其实处于 BLOCKED（在等重新进入 synchronized）。所以 wait 的完整路径是
          WAITING → BLOCKED（抢锁）→ RUNNABLE。理解这个细节，才知道为什么「notify 之后被唤醒的线程不会立刻执行」。
        </p>
      </Example>

      <ThreadState />

      <KeyIdea title="BLOCKED 和 WAITING 的区别">
        <p>
          这是高频考点。<strong>BLOCKED</strong> 只在抢 <code>synchronized</code> 锁失败时出现，它在等的是「锁」；
          <strong>WAITING</strong> 是主动调 <code>wait()</code>/<code>join()</code> 等进入的，它在等的是「别人来唤醒」。
          一个被动、一个主动；一个等锁、一个等信号。<code>LockSupport.park()</code> 造成的也是 WAITING，而非 BLOCKED。
        </p>
        <p>
          再补一个常被混淆的点：<code>ReentrantLock.lock()</code> 抢不到锁时，线程进入的也是 <strong>WAITING/TIMED_WAITING</strong>（底层是 LockSupport.park），
          <strong>不是 BLOCKED</strong>。BLOCKED 这个状态名是专门留给 <code>synchronized</code> 的。这也侧面说明 synchronized 和 Lock 的底层实现机制不同
          （一个走 JVM 的 monitor，一个走 AQS + LockSupport）。
        </p>
      </KeyIdea>

      <h2>中断机制：怎么优雅地停一个线程</h2>
      <p>
        早期 Java 有 <code>Thread.stop()</code>，但它已被<strong>废弃</strong>：stop 会立刻释放线程持有的所有锁、强行抛异常，可能让对象停在
        一个被改了一半的不一致状态，引发难以排查的数据损坏。现代的做法是<strong>中断</strong>（interrupt）——它不强杀，只是设置一个标志位，
        相当于「礼貌地敲门说：方便的话请停一下」，停不停、什么时候停由目标线程自己决定，所以叫<strong>协作式中断</strong>。
      </p>
      <ul>
        <li><code>interrupt()</code>：给目标线程设置中断标志（发出请求）。</li>
        <li><code>isInterrupted()</code>：查标志，<strong>不清除</strong>。</li>
        <li><code>Thread.interrupted()</code>：查标志并<strong>清除</strong>（静态方法，查的是当前线程）。</li>
      </ul>
      <p>
        最容易踩的坑：当线程正卡在 <code>sleep/wait/join</code> 里被中断，会抛出 <code>InterruptedException</code> 并<strong>自动清除中断标志</strong>。
        如果你在 catch 里只是打了个日志就吞掉，上层就再也感知不到这次中断了，循环会继续跑下去。正确做法是要么向上抛，要么
        <code>Thread.currentThread().interrupt()</code> 把标志重新设上，让中断信号继续传播。
      </p>
      <CodeBlock lang="java" title="InterruptDemo.java" code={interruptCode} />

      <h2>守护线程</h2>
      <p>
        线程分两类：<strong>用户线程</strong>和<strong>守护线程</strong>（daemon）。JVM 的退出条件是「所有<strong>用户</strong>线程都结束」——
        守护线程不算数。一旦最后一个用户线程退出，JVM 会直接终止，不会等守护线程跑完。所以守护线程适合做后台辅助工作：
        GC 线程、心跳上报、监控采集。注意两点：<code>setDaemon(true)</code> 必须在 <code>start()</code> 之前调用；守护线程里
        <strong>不要写收尾逻辑</strong>（比如关文件、刷盘），因为 JVM 退出时它可能在任意一步被掐断，finally 都不保证执行。
      </p>
      <CodeBlock lang="java" title="守护线程" code={daemonCode} />

      <h2>上下文切换的成本</h2>
      <p>
        CPU 在线程之间切换时，要保存当前线程的寄存器、程序计数器等<em>上下文</em>，再加载下一个线程的上下文，这叫
        <em>上下文切换</em>（context switch）。它本身不干活，纯属开销；切换太频繁，CPU 时间就被「搬家」耗掉了。
      </p>
      <p>
        所以线程不是越多越好：线程数远超 CPU 核数时，频繁切换反而拖慢系统。这也是为什么我们用线程池来<strong>限制并发数</strong>，
        以及为什么减少锁竞争（竞争会导致大量阻塞与切换）能提升性能。
      </p>
      <p>
        切换还有「隐性成本」：CPU 缓存失效。线程 A 把数据预热进了 L1/L2 缓存，切到线程 B 后这些缓存被 B 的数据挤掉，
        等切回 A 又得重新从内存加载（缓存未命中）。这部分开销不在「保存/恢复寄存器」的账面上，却往往是切换真正的大头。
        经验法则：<strong>CPU 密集型</strong>任务线程数取「核数 + 1」左右；<strong>IO 密集型</strong>任务因为线程大量时间在等 IO，
        可以远多于核数（常用经验公式 <code>核数 × (1 + 等待时间/计算时间)</code>）。
      </p>

      <h2>sleep 与 wait 的区别</h2>
      <p>这对「双胞胎」几乎逢面试必问，记住四点差异：</p>
      <ul>
        <li><strong>所属类</strong>：<code>sleep()</code> 是 <code>Thread</code> 的静态方法；<code>wait()</code> 是 <code>Object</code> 的方法。</li>
        <li><strong>锁</strong>：<code>sleep()</code> <strong>不释放锁</strong>，抱着锁睡；<code>wait()</code> <strong>释放锁</strong>，让别人能进。</li>
        <li><strong>使用场景</strong>：<code>wait()</code> 必须在 <code>synchronized</code> 块里用，否则抛异常；<code>sleep()</code> 哪都能用。</li>
        <li><strong>唤醒</strong>：<code>sleep()</code> 到点自动醒；<code>wait()</code> 要等 <code>notify()</code>/<code>notifyAll()</code> 或超时。</li>
      </ul>
      <p>
        面试追问「为什么 wait 设计在 Object 而不是 Thread 上？」答案：wait/notify 是<strong>基于对象监视器（monitor）</strong>的机制，
        每个 Java 对象天生自带一把锁和一个等待队列。<code>wait()</code> 操作的是「<strong>当前对象的</strong>监视器」，所以它必须是 Object 的方法——
        这样任何对象都能当锁、当协作信号源。而 sleep 只是让「当前线程」歇一会儿，跟具体对象无关，所以放在 Thread 上是静态方法。
      </p>
      <Callout variant="warn" title="为什么必须用 notifyAll 而不是 notify">
        <p>
          <code>notify()</code> 只随机唤醒等待队列里的<strong>一个</strong>线程，如果唤醒的恰好是个「条件还不满足、会立刻重新 wait」的线程，
          而真正该被唤醒的那个还在睡，就会出现「信号丢失 / 死等」。在生产者-消费者这种多个线程等同一把锁、但等待条件不同的场景里，
          <code>notify()</code> 极易踩坑。除非你能严格证明所有等待线程都是「同质」的，否则<strong>无脑用 notifyAll</strong>，把所有人叫醒让它们各自 while 复查条件，是最稳的。
        </p>
      </Callout>

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
          '进程是资源分配单位、内存隔离；线程是调度单位、共享进程内存，共享带来了并发安全问题。栈私有、堆与方法区共享。',
          '创建线程有四种方式：继承 Thread、实现 Runnable、Callable+FutureTask（有返回值）、线程池（生产首选）；本质都是给 Thread 一个任务，组合优于继承。',
          '启动线程用 start() 而不是 run()；run() 直接调只是普通方法调用，不开新线程；同一 Thread 不能 start 两次。',
          'Java 有 6 种线程状态，把就绪+运行合并为 RUNNABLE（IO 阻塞也算 RUNNABLE）；BLOCKED 专指抢 synchronized 锁失败。',
          'BLOCKED 在等锁、被动；WAITING 在等唤醒、主动；ReentrantLock 抢锁失败也是 WAITING 不是 BLOCKED。',
          '停线程用协作式中断而非废弃的 stop()；sleep/wait/join 被中断会清标志，catch 里要重设或上抛。',
          '守护线程随用户线程结束而终止，适合后台任务，不要在其中写收尾逻辑；setDaemon 须在 start 前。',
          'sleep 不释放锁、到点自醒；wait 释放锁、须在 synchronized 内、靠 notify 唤醒，用 while 防虚假唤醒，优先 notifyAll。',
        ]}
      />
    </>
  )
}

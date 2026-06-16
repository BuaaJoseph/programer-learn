import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ThreadPool from '@/courses/java-concurrency/illustrations/ThreadPool.jsx'

const poolCode = `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

// 电商下单线程池：不要用 Executors，手动 new
ThreadPoolExecutor orderPool = new ThreadPoolExecutor(
    8,                              // corePoolSize：常驻 8 个核心线程
    16,                             // maximumPoolSize：高峰最多 16 个
    60L, TimeUnit.SECONDS,          // keepAliveTime + unit：非核心线程空闲 60 秒后回收
    new ArrayBlockingQueue<>(1000), // workQueue：有界队列，挡住 1000 个排队任务
    new ThreadFactory() {           // threadFactory：自定义线程名，方便排查问题
        private final AtomicInteger seq = new AtomicInteger(1);
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "order-pool-" + seq.getAndIncrement());
            t.setDaemon(false);
            return t;
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy() // handler：满了让提交者自己跑，起到降速作用
);

orderPool.execute(() -> createOrder(userId, skuId));`

const submitCode = `// 提交一个任务时，ThreadPoolExecutor 内部的判断顺序（高频面试题）
// 1. 当前线程数 < corePoolSize         -> 新建核心线程执行
// 2. 否则尝试放入 workQueue            -> 入队成功就排队等
// 3. 队列满了且线程数 < maximumPoolSize -> 新建非核心线程执行
// 4. 队列满且线程数已达 maximum         -> 触发拒绝策略 handler`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一来请求就 <code>new Thread()</code>，请求一多，线程数失控、内存被吃光、CPU 在频繁切换里空转——
          这是新手写并发最常踩的坑。线程池把「创建线程」这件事接管过来：线程可以<strong>复用</strong>、并发量可以
          <strong>控制</strong>、运行状态可以<strong>监控</strong>。面试里 <em>ThreadPoolExecutor</em> 的七个参数和那条
          提交流程，几乎是必考题。
        </p>
      </Lead>

      <h2>为什么要用线程池</h2>
      <p>
        线程不是免费的：创建和销毁一个线程要向操作系统申请栈内存、做内核态切换，开销远比想象中大；线程开太多，CPU
        大部分时间花在上下文切换上，吞吐反而下降。线程池解决三件事：
      </p>
      <ul>
        <li><strong>复用</strong>：核心线程跑完一个任务不销毁，留着接下一个，省掉反复创建销毁的开销。</li>
        <li><strong>控并发</strong>：通过最大线程数和队列，把同时在跑的任务数压在一个可控范围内，保护下游。</li>
        <li><strong>可管理</strong>：统一管理线程的生命周期，能拿到活跃线程数、队列长度等指标，方便监控与调优。</li>
      </ul>

      <h3>七个参数</h3>
      <p>
        <em>ThreadPoolExecutor</em> 的完整构造函数有七个参数，记住它们各管什么，提交流程也就顺理成章了：
      </p>
      <ul>
        <li><code>corePoolSize</code>：核心线程数，常驻不回收（除非开了 allowCoreThreadTimeOut）。</li>
        <li><code>maximumPoolSize</code>：最大线程数，核心加非核心的上限。</li>
        <li><code>keepAliveTime</code>：非核心线程的空闲存活时间，超时就回收。</li>
        <li><code>unit</code>：上面这个时间的单位。</li>
        <li><code>workQueue</code>：任务等待队列，核心线程满了之后任务先在这里排队。</li>
        <li><code>threadFactory</code>：创建线程的工厂，常用来给线程起有意义的名字、设是否守护。</li>
        <li><code>handler</code>：拒绝策略，队列满且线程到达最大值时怎么处理新任务。</li>
      </ul>

      <h3>提交一个任务，内部到底走了几步</h3>
      <p>
        这是整章最高频的考点。提交任务时，线程池<strong>不是</strong>「先把线程开满再排队」，而是「先开核心线程，再去排队，
        队列也满了才开非核心线程，全满才拒绝」。顺序非常关键，记反了就答错：
      </p>
      <CodeBlock lang="text" title="任务提交判断顺序" code={submitCode} />
      <p>
        注意一个反直觉点：只要队列没满，线程数就停在 <code>corePoolSize</code> 不动，<strong>不会</strong>提前扩容到
        <code>maximumPoolSize</code>。这也是为什么用无界队列时，最大线程数形同虚设——队列永远不会满。
      </p>

      <Example title="电商下单线程池怎么排队">
        <p>假设核心 8、最大 16、队列容量 1000。大促瞬间涌入下单请求：</p>
        <ul>
          <li>前 8 个请求：各自起一个核心线程直接处理。</li>
          <li>第 9 到第 1008 个：核心线程都在忙，进入队列排队（最多排 1000 个）。</li>
          <li>第 1009 个开始：队列满了，开始创建非核心线程，直到线程总数到 16。</li>
          <li>线程到 16、队列还满着，再来的请求触发拒绝策略。</li>
        </ul>
      </Example>

      <ThreadPool />

      <KeyIdea title="队列容量决定了最大线程数有没有意义">
        <p>
          扩容到 <code>maximumPoolSize</code> 的<strong>唯一触发条件</strong>是「队列满了」。所以队列大小和最大线程数
          要配合着设：有界队列才能逼出非核心线程、才能在真正扛不住时触发拒绝；无界队列则会让任务无限堆积，
          最大线程数永远用不上，最终撑爆内存。
        </p>
      </KeyIdea>

      <h3>四种拒绝策略</h3>
      <p>
        当线程满、队列满，新任务无处安放，<code>handler</code> 决定它的命运，JDK 自带四种：
      </p>
      <ul>
        <li><strong>AbortPolicy</strong>（默认）：直接抛 <code>RejectedExecutionException</code>，让调用方感知失败。</li>
        <li><strong>CallerRunsPolicy</strong>：交给提交任务的那个线程自己执行，相当于反压降速，不丢任务。</li>
        <li><strong>DiscardOldestPolicy</strong>：丢掉队列里最老的那个任务，再尝试提交当前任务。</li>
        <li><strong>DiscardPolicy</strong>：默默丢弃当前任务，不抛异常、不报错（最危险，丢了数据还不知道）。</li>
      </ul>

      <Callout variant="warn" title="为什么阿里规约不推荐用 Executors">
        <p><code>Executors</code> 的几个快捷工厂方法看着方便，坑都埋在默认参数里：</p>
        <ul>
          <li>
            <code>newFixedThreadPool</code> 和 <code>newSingleThreadExecutor</code>：用的是无界
            <em>LinkedBlockingQueue</em>，任务能无限堆积，最终 <strong>OOM</strong>。
          </li>
          <li>
            <code>newCachedThreadPool</code>：最大线程数是 <code>Integer.MAX_VALUE</code>，请求一多就疯狂建线程，
            同样 OOM。
          </li>
        </ul>
        <p>正确做法是手动 <code>new ThreadPoolExecutor</code>，自己把有界队列和拒绝策略定清楚。</p>
      </Callout>

      <h2>核心线程数到底设多少</h2>
      <p>没有银弹，要看任务是 CPU 密集还是 IO 密集，给一个常用的经验起点：</p>
      <ul>
        <li>
          <strong>CPU 密集型</strong>（加密、压缩、大量计算）：线程多了只会抢 CPU、增加切换开销，
          一般设 <code>N + 1</code>（N 为核心数），多的那一个用来在偶发缺页或中断时顶上。
        </li>
        <li>
          <strong>IO 密集型</strong>（调接口、读数据库、读文件）：线程大部分时间在等 IO、不占 CPU，
          可以多开，常用 <code>2N</code> 起步，再结合压测调整。
        </li>
      </ul>
      <p>
        这两个公式只是<strong>起点</strong>，最终值要靠压测：盯着 CPU 利用率、响应时间、队列长度，逐步逼近最优。
      </p>

      <Practice title="手写一个可控的线程池">
        <p>
          照着电商下单的场景，手动构造 <em>ThreadPoolExecutor</em>，把七个参数都显式写出来，并配一个有界队列和
          <code>CallerRunsPolicy</code>。运行时打印线程名，观察核心线程是怎么被复用的。
        </p>
        <CodeBlock lang="java" title="OrderThreadPool.java" code={poolCode} />
        <p>
          试着把队列改成无界的 <code>LinkedBlockingQueue</code>，再猛灌任务，观察最大线程数是不是完全没起作用、
          内存是不是一直涨——亲手复现一次「为什么不要用无界队列」。
        </p>
      </Practice>

      <Summary
        points={[
          '线程池的价值是复用线程、控制并发、统一管理，避免无脑 new Thread 导致的资源失控。',
          'ThreadPoolExecutor 七参数：corePoolSize、maximumPoolSize、keepAliveTime、unit、workQueue、threadFactory、handler。',
          '提交流程顺序：核心线程 → 入队 → 队列满再开到 maximumPoolSize → 全满触发拒绝策略，这是高频考点。',
          '四种拒绝策略：AbortPolicy 抛异常、CallerRunsPolicy 调用者执行、DiscardOldestPolicy 丢最老、DiscardPolicy 默默丢。',
          '不推荐 Executors：FixedThreadPool/SingleThreadExecutor 队列无界会 OOM，CachedThreadPool 线程无界也会 OOM。',
          '线程数经验值：CPU 密集 N+1、IO 密集 2N，仅是起点，最终靠压测确定。',
        ]}
      />
    </>
  )
}

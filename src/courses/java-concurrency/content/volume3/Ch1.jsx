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

const ctlCode = `// ThreadPoolExecutor 用一个 AtomicInteger 同时存「状态」和「线程数」
// 高 3 位 = 运行状态，低 29 位 = 工作线程数，一次 CAS 就能原子地更新两者
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
private static final int COUNT_BITS = Integer.SIZE - 3;        // 29
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;   // 最多约 5 亿线程

private static int runStateOf(int c) { return c & ~CAPACITY; } // 取高 3 位：状态
private static int workerCountOf(int c) { return c & CAPACITY; } // 取低 29 位：线程数
// 状态流转：RUNNING -> SHUTDOWN -> STOP -> TIDYING -> TERMINATED`

const shutdownCode = `// 优雅关闭线程池的标准姿势
orderPool.shutdown();                 // 不再接新任务，已提交的（含队列里的）继续跑完
try {
    // 等一段时间让存量任务跑完
    if (!orderPool.awaitTermination(30, TimeUnit.SECONDS)) {
        orderPool.shutdownNow();      // 还没跑完就强制中断，返回队列里没执行的任务
    }
} catch (InterruptedException e) {
    orderPool.shutdownNow();
    Thread.currentThread().interrupt();
}`

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
      <Callout variant="info" title="线程池里的线程为什么不会跑完就死">
        <p>
          一个常被追问的细节：线程池的线程为什么能「复用」？秘密在 <code>Worker</code> 线程的 <code>runWorker</code> 里有个 <strong>while 循环</strong>——
          它执行完一个任务后，不会退出，而是回头去 <code>getTask()</code> 从阻塞队列里<strong>取下一个任务</strong>，队列空就 <code>take()</code> 阻塞等待。
          所以「复用」本质是「一个常驻线程不停地从队列拉任务执行」。非核心线程的回收也在这里实现：<code>getTask()</code> 用带超时的 <code>poll(keepAliveTime)</code>，
          超时还没拿到任务就返回 null，循环退出，线程结束。理解了这个 while 循环，线程池的复用与回收就全通了。
        </p>
      </Callout>

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
      <Callout variant="info" title="队列怎么选：三类常见 workQueue">
        <p>
          队列的选择直接决定线程池的行为：<strong>ArrayBlockingQueue</strong>（有界、数组实现）——最稳妥，能逼出非核心线程、能触发拒绝，生产首选；
          <strong>LinkedBlockingQueue</strong>（默认无界）——任务无限堆积，最大线程数失效，最终 OOM，是 Executors 的坑根源；
          <strong>SynchronousQueue</strong>（不存储元素，一进一出）——每个任务必须当场有线程接，否则立刻开新线程，<code>newCachedThreadPool</code> 用它配 <code>Integer.MAX_VALUE</code>，请求一多就线程爆炸。
          记住：<strong>队列大小和最大线程数是一对配合关系</strong>，无界队列等于放弃了最大线程数这道闸。
        </p>
      </Callout>

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
      <p>
        延伸的设计哲学追问：「为什么是先排队、后扩容，而不是先扩容、后排队？」因为线程池<strong>把开新线程视为更贵的资源</strong>——
        排队几乎零成本，开线程要申请栈内存、做内核态调度。所以默认策略是「能排队就别开线程」。但这套策略对延迟敏感的业务并不友好
        （任务在队列里等而不去开空闲容量的线程）。Tomcat 就为此定制了 <code>TaskQueue</code>，反转成「先用满最大线程数、再排队」，更适合 Web 请求。
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
      <p>
        实战选型：<code>CallerRunsPolicy</code> 是最被推崇的——它让提交线程（往往是 Tomcat 工作线程）自己去执行任务，
        提交线程一忙起来就没法再接收新请求，相当于天然的<strong>反压（back-pressure）</strong>，把压力顺着链路往上游传，避免雪崩。
        关键业务绝不要用 <code>DiscardPolicy</code>，它<strong>静默丢任务</strong>，事后排查「订单怎么没了」会非常痛苦。
      </p>

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

      <h2>ctl：一个 int 同时管状态和线程数</h2>
      <p>
        源码里有个精巧设计值得一提：线程池用一个 <code>AtomicInteger ctl</code> 把「运行状态」和「工作线程数」<strong>打包进一个整数</strong>——
        高 3 位存状态、低 29 位存线程数。这样一次 CAS 就能原子地同时更新两者，省去了为两个字段分别加锁、还要保证它们一致的麻烦。
        这是「用位运算把多个状态压进一个原子变量」的经典套路，CHM、AQS 里都有类似手法。
      </p>
      <CodeBlock lang="java" title="ctl 的位拆分" code={ctlCode} />
      <p>
        线程池有 5 个状态：<code>RUNNING</code>（正常接活）→ <code>SHUTDOWN</code>（不收新任务但跑完存量）→ <code>STOP</code>（中断所有任务）→
        <code>TIDYING</code>（都停了，准备收尾）→ <code>TERMINATED</code>（terminated 钩子执行完）。<code>shutdown()</code> 触发前者，<code>shutdownNow()</code> 触发后者。
      </p>

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
        线上更稳的做法是把核心数、最大数、队列长度做成<strong>动态可配</strong>（如美团的动态线程池方案），结合监控告警实时调整，
        而不是写死在代码里上线后再也改不动。
      </p>

      <Callout variant="warn" title="一个真实事故：共用线程池导致级联阻塞">
        <p>
          线上常见踩坑：A、B 两个业务图省事共用一个线程池。某天 B 调的下游接口超时、把线程池里的线程全占满并卡住，
          结果毫不相干的 A 业务也跟着提交不进去、全部被拒，故障从 B 蔓延到 A。教训：<strong>不同业务、尤其有外部 IO 调用的，要做线程池隔离</strong>，
          一个池子拖垮不影响别的（这正是 Hystrix「舱壁隔离」的思想）。
        </p>
      </Callout>

      <Practice title="手写一个可控的线程池">
        <p>
          照着电商下单的场景，手动构造 <em>ThreadPoolExecutor</em>，把七个参数都显式写出来，并配一个有界队列和
          <code>CallerRunsPolicy</code>。运行时打印线程名，观察核心线程是怎么被复用的。
        </p>
        <CodeBlock lang="java" title="OrderThreadPool.java" code={poolCode} />
        <p>
          试着把队列改成无界的 <code>LinkedBlockingQueue</code>，再猛灌任务，观察最大线程数是不是完全没起作用、
          内存是不是一直涨——亲手复现一次「为什么不要用无界队列」。最后别忘了优雅关闭：
        </p>
        <CodeBlock lang="java" title="优雅关闭" code={shutdownCode} />
      </Practice>

      <Summary
        points={[
          '线程池的价值是复用线程、控制并发、统一管理，避免无脑 new Thread 导致的资源失控。',
          '复用的本质是 Worker 的 while 循环不停从阻塞队列拉任务；非核心线程靠带超时的 getTask 返回 null 退出来回收。',
          'ThreadPoolExecutor 七参数：corePoolSize、maximumPoolSize、keepAliveTime、unit、workQueue、threadFactory、handler。',
          '提交流程顺序：核心线程 → 入队 → 队列满再开到 maximumPoolSize → 全满触发拒绝策略，这是高频考点；设计上「开线程比排队贵」。',
          'workQueue 选型：ArrayBlockingQueue 有界稳妥、LinkedBlockingQueue 无界会 OOM、SynchronousQueue 配 cached 会线程爆炸。',
          '四种拒绝策略：AbortPolicy 抛异常、CallerRunsPolicy 调用者执行（天然反压，推荐）、DiscardOldestPolicy 丢最老、DiscardPolicy 静默丢（危险）。',
          'ctl 用一个 AtomicInteger 的高 3 位存状态、低 29 位存线程数，一次 CAS 原子更新两者；5 个状态 RUNNING→…→TERMINATED。',
          '线程数经验值：CPU 密集 N+1、IO 密集 2N，仅是起点，靠压测确定；不同业务做线程池隔离防级联阻塞。',
        ]}
      />
    </>
  )
}

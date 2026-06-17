import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const ctorSnippet = `// ThreadPoolExecutor 七大核心参数
new ThreadPoolExecutor(
    corePoolSize,      // 核心线程数：常驻，即使空闲也不回收（默认）
    maximumPoolSize,   // 最大线程数：核心 + 临时线程的上限
    keepAliveTime,     // 临时线程空闲多久后回收
    unit,              // keepAliveTime 的时间单位
    workQueue,         // 阻塞队列：核心线程都忙时，任务先进这里排队
    threadFactory,     // 线程工厂：自定义线程名/优先级/守护属性
    handler            // 拒绝策略：队列满且线程达上限时怎么办
);`

const flowSnippet = `// 提交一个任务时线程池的决策流程：
// 1) 核心线程未满       -> 新建核心线程执行
// 2) 核心线程已满       -> 任务进 workQueue 排队
// 3) 队列已满 + 线程未达 max -> 新建临时（非核心）线程执行
// 4) 队列满 + 线程达 max     -> 触发拒绝策略
//
// 注意顺序：先用核心线程，再排队，最后才扩到 max。
// 所以「队列无界」时永远到不了第 3 步，max 形同虚设。`

const customSnippet = `// 实战推荐：手动 new，参数显式可控，绝不用 Executors 工厂
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8, 16, 60L, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(1000),                 // 有界队列，防 OOM
    new ThreadFactoryBuilder().setNameFormat("biz-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy());     // 让提交者自己跑，自带降速

// 运行时动态调参（生产排障常用）
pool.setCorePoolSize(12);       // 核心线程数可在运行时修改
pool.setMaximumPoolSize(24);`

const exSnippet = `// 任务异常后如何定位：submit 的异常被 Future 吞掉，要 get 才暴露
Future<?> f = pool.submit(() -> { throw new RuntimeException("boom"); });
try {
    f.get();                       // 这里才抛出 ExecutionException
} catch (ExecutionException e) {
    log.error("任务失败", e.getCause());
}

// 用 execute 提交则异常会走线程的 UncaughtExceptionHandler
// 也可重写 ThreadPoolExecutor.afterExecute(Runnable, Throwable) 统一捕获`

export default function Ch2() {
  return (
    <article>
      <Lead>
        线程池是并发实战与面试的绝对核心。这一章把它讲透：七大核心参数与一次任务提交的完整工作流程、
        如何合理设置线程数、四种拒绝策略、内置的几种线程池及其陷阱、核心线程数能否在运行时修改、
        <code>shutdown</code> 与 <code>shutdownNow</code> 的区别、任务出异常后如何定位、有哪些阻塞队列，
        以及 <code>DelayQueue</code>、定时任务与时间轮。
      </Lead>

      <h2>一、为什么要用线程池</h2>
      <p>
        频繁地 <code>new Thread</code> 有三大问题：创建 / 销毁线程开销大；线程数失控会耗尽内存与 CPU；
        缺乏统一管理（无法监控、限流、复用）。线程池的本质是<strong>线程复用 + 任务排队 + 资源管控</strong>：
        预先维护一批线程反复执行提交进来的任务，把「任务」和「执行任务的线程」解耦。
      </p>

      <h2>二、核心参数与工作流程</h2>
      <CodeBlock lang="java" title="ThreadPoolExecutor 七大参数" code={ctorSnippet} />
      <KeyIdea>
        理解线程池只需记住一条决策链：<strong>核心线程 → 阻塞队列 → 临时线程（到 max）→ 拒绝策略</strong>。
        来一个任务，先看核心线程满没满，没满就开核心线程；满了就丢进队列排队；队列也满了才开临时线程到上限；
        再满不下就执行拒绝策略。
      </KeyIdea>
      <CodeBlock lang="java" title="任务提交的决策流程" code={flowSnippet} />
      <Callout variant="warn" title="一个反直觉的坑">
        因为「先排队、后扩 max」的顺序，如果你用了<strong>无界队列</strong>（如 <code>LinkedBlockingQueue</code> 默认无界），
        队列永远填不满，于是<strong>临时线程永远不会被创建</strong>，<code>maximumPoolSize</code> 完全失效，
        且任务无限堆积可能直接 OOM。这正是后面要讲的 <code>newFixedThreadPool</code> 的隐患。
      </Callout>

      <h2>三、如何合理设置线程数</h2>
      <p>
        没有放之四海皆准的公式，但有经验起点，关键看任务是<strong>CPU 密集</strong>还是<strong>IO 密集</strong>：
      </p>
      <ul>
        <li><strong>CPU 密集型</strong>（大量计算、少阻塞）：线程数 ≈ CPU 核数 + 1。线程太多只会增加上下文切换开销。</li>
        <li><strong>IO 密集型</strong>（大量等待网络 / 磁盘 / DB）：线程数可远大于核数，经验公式
            线程数 ≈ 核数 × (1 + 平均等待时间 / 平均计算时间)。等待占比越高，能开的线程越多。</li>
      </ul>
      <Callout variant="tip" title="不要迷信公式">
        实际生产中线程数应当<strong>压测 + 监控调出来</strong>，而非套公式拍脑袋。先用经验值起步，观察 CPU 利用率、
        队列堆积、响应时间，再迭代调整。能动态调参更好（见下文）。如果用 JDK21 虚拟线程，IO 密集场景甚至
        可以「一任务一虚拟线程」，不再纠结线程数。
      </Callout>

      <h2>四、四种拒绝策略</h2>
      <p>当队列满且线程已达 <code>maximumPoolSize</code>，新任务会触发 <code>RejectedExecutionHandler</code>：</p>
      <table>
        <thead>
          <tr><th>策略</th><th>行为</th></tr>
        </thead>
        <tbody>
          <tr><td>AbortPolicy（默认）</td><td>直接抛 RejectedExecutionException</td></tr>
          <tr><td>CallerRunsPolicy</td><td>由提交任务的线程自己执行，天然反压降速</td></tr>
          <tr><td>DiscardPolicy</td><td>静默丢弃新任务，不抛异常</td></tr>
          <tr><td>DiscardOldestPolicy</td><td>丢弃队列最老的任务，再尝试提交新任务</td></tr>
        </tbody>
      </table>
      <p>
        实战常用 <code>CallerRunsPolicy</code>——它让提交者「自己干活」，自动放慢提交速度形成背压，
        既不丢任务也不崩溃；或者自定义 handler 把任务落库 / 入 MQ 后续重试。

      </p>

      <h2>五、内置线程池及其区别</h2>
      <p><code>Executors</code> 工厂提供了几种现成线程池，但<strong>阿里规约明确禁止在生产中使用</strong>，原因都在参数：</p>
      <table>
        <thead>
          <tr><th>工厂方法</th><th>特点</th><th>隐患</th></tr>
        </thead>
        <tbody>
          <tr><td>newFixedThreadPool</td><td>固定线程数，无界队列</td><td>队列无限堆积 OOM</td></tr>
          <tr><td>newSingleThreadExecutor</td><td>单线程，无界队列</td><td>同上，且串行</td></tr>
          <tr><td>newCachedThreadPool</td><td>线程数无上限，SynchronousQueue</td><td>线程暴涨 OOM</td></tr>
          <tr><td>newScheduledThreadPool</td><td>支持定时 / 周期任务</td><td>延迟队列无界</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="实战：手动创建并动态调参" code={customSnippet} />
      <Callout variant="warn" title="为什么禁用 Executors 工厂">
        <code>FixedThreadPool</code> / <code>SingleThreadExecutor</code> 用<strong>无界队列</strong>，任务堆积会撑爆内存；
        <code>CachedThreadPool</code> 的 <code>maximumPoolSize</code> 是 <code>Integer.MAX_VALUE</code>，瞬时高并发会创建海量线程直接 OOM。
        正确做法是<strong>手动 new ThreadPoolExecutor</strong>，显式指定有界队列和合理上限。
      </Callout>

      <h2>六、核心线程数能否运行时修改</h2>
      <p>
        <strong>可以</strong>。<code>ThreadPoolExecutor</code> 提供 <code>setCorePoolSize</code> 与 <code>setMaximumPoolSize</code>，
        运行时直接调用即可生效。调大 <code>corePoolSize</code> 后，若有排队任务且当前线程少于新核心数，会按需补建线程；
        调小则多出的线程在空闲后被回收。
      </p>
      <p>
        这给了线上一个重要的<strong>不重启降级 / 扩容</strong>手段：很多公司把线程池参数接入配置中心，
        监控到队列堆积就动态调大核心线程数。前提是<strong>当初要自己持有 ThreadPoolExecutor 引用</strong>
        （用 Executors 工厂返回的是包了一层的 <code>ExecutorService</code>，调不到这些方法）。
      </p>

      <h2>七、shutdown vs shutdownNow</h2>
      <table>
        <thead>
          <tr><th>方法</th><th>已提交任务</th><th>队列中任务</th><th>返回值</th></tr>
        </thead>
        <tbody>
          <tr><td>shutdown()</td><td>继续执行完</td><td>继续执行完</td><td>void</td></tr>
          <tr><td>shutdownNow()</td><td>尝试中断（interrupt）</td><td>不再执行，直接清空</td><td>未执行任务的 List</td></tr>
        </tbody>
      </table>
      <p>
        <code>shutdown()</code> 是<strong>优雅关闭</strong>：不再接收新任务，但把已在跑和已排队的任务都执行完。
        <code>shutdownNow()</code> 是<strong>立即关闭</strong>：不再接新任务，给正在跑的线程发中断信号，
        把队列里还没跑的任务<strong>原样返回</strong>给你处理。两者调用后都进入 <code>SHUTDOWN</code> / <code>STOP</code> 状态，
        通常配合 <code>awaitTermination</code> 等待真正终止。
      </p>

      <h2>八、任务异常后如何定位是哪个线程出错</h2>
      <p>
        这是个高频坑：用 <code>submit</code> 提交时，任务抛的异常会被<strong>封进 Future 默默吞掉</strong>，
        不调 <code>get()</code> 你根本看不到，线程也不会打印堆栈。
      </p>
      <CodeBlock lang="java" title="捕获线程池任务异常" code={exSnippet} />
      <p>三种定位办法：</p>
      <ul>
        <li><strong>future.get()</strong>：submit 提交后调 get，异常会以 <code>ExecutionException</code> 重新抛出，<code>getCause</code> 是原因。</li>
        <li><strong>UncaughtExceptionHandler</strong>：用 <code>execute</code> 提交时异常会冒泡到线程的未捕获异常处理器（可在 ThreadFactory 里统一设置）。</li>
        <li><strong>重写 afterExecute</strong>：继承 <code>ThreadPoolExecutor</code> 重写 <code>afterExecute(r, t)</code>，统一记录每个任务的异常。</li>
      </ul>

      <h2>九、阻塞队列与定时任务</h2>
      <p>常见的 <code>BlockingQueue</code> 实现：</p>
      <ul>
        <li><strong>ArrayBlockingQueue</strong>：数组实现的<strong>有界</strong>队列，一把锁，适合做线程池工作队列。</li>
        <li><strong>LinkedBlockingQueue</strong>：链表实现，默认<strong>无界</strong>（可指定容量），读写两把锁吞吐高。</li>
        <li><strong>SynchronousQueue</strong>：<strong>不存元素</strong>的队列，一个 put 必须等一个 take，<code>CachedThreadPool</code> 用它。</li>
        <li><strong>PriorityBlockingQueue</strong>：带优先级的无界队列，按 Comparator 出队。</li>
        <li><strong>DelayQueue</strong>：延迟队列，元素到期才能取出，用于定时调度。</li>
      </ul>
      <Callout variant="note" title="DelayQueue vs ScheduledThreadPool vs Timer vs 时间轮">
        <strong>DelayQueue</strong>：基于优先级队列，按到期时间排序，取队首未到期就阻塞；是定时能力的基础数据结构。<br />
        <strong>ScheduledThreadPoolExecutor</strong>：内部用 <code>DelayedWorkQueue</code> 实现，支持
        <code>schedule</code> / <code>scheduleAtFixedRate</code>，<strong>多线程、单任务异常不影响其他任务</strong>，是 Timer 的现代替代品。<br />
        <strong>Timer</strong>：古老的定时器，<strong>单线程</strong>执行所有 TimerTask，一个任务抛异常会拖垮整个 Timer，已不推荐。<br />
        <strong>时间轮（Time Wheel）</strong>：把时间划成一圈刻度的环形数组（像时钟），任务挂在对应刻度的槽上，
        指针每 tick 走一格执行该槽任务，增删任务 O(1)，<strong>适合海量定时任务</strong>（Netty 的
        <code>HashedWheelTimer</code>、Kafka 都用它），代价是精度受刻度粒度限制。
      </Callout>
      <Example title="为什么海量定时任务用时间轮而非 DelayQueue">
        <p>
          <code>DelayQueue</code> 底层是堆，插入 / 删除是 O(log n)，定时任务一多（几十万级）堆操作开销显著。
          时间轮把任务按到期时刻散列到环形槽里，添加和触发都接近 O(1)，且不需要为每个任务排序，
          因此在「任务量巨大、精度要求不极致」的场景（如连接超时、心跳检测）里碾压延迟队列。
        </p>
      </Example>

      <Summary
        points={[
          '线程池七参数：corePoolSize/maximumPoolSize/keepAliveTime/unit/workQueue/threadFactory/handler；本质是线程复用+任务排队+资源管控。',
          '工作流程：核心线程→阻塞队列→临时线程(到max)→拒绝策略；无界队列会让 max 失效并可能 OOM。',
          '线程数按 CPU 密集(核数+1)或 IO 密集(核数×(1+等待/计算))起步，最终靠压测监控调优；虚拟线程可弱化此问题。',
          '四种拒绝策略：Abort(默认抛异常)/CallerRuns(提交者执行,反压)/Discard(丢新)/DiscardOldest(丢最老)；Executors 工厂因无界队列/无限线程被规约禁用。',
          'corePoolSize 可运行时 setCorePoolSize 修改(需持有 ThreadPoolExecutor 引用)；shutdown 跑完已有任务，shutdownNow 中断并返回未执行任务。',
          'submit 异常被 Future 吞,需 get 才暴露(或用 afterExecute/UncaughtExceptionHandler);队列有 Array/Linked/Synchronous/Priority/Delay;海量定时任务用时间轮,ScheduledThreadPool 取代 Timer。',
        ]}
      />
    </article>
  )
}

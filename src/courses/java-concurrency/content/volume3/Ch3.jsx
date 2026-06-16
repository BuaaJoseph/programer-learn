import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const latchCode = `import java.util.concurrent.*;

// 主线程等所有子任务跑完：CountDownLatch
int taskCount = 5;
CountDownLatch latch = new CountDownLatch(taskCount);
ExecutorService pool = Executors.newFixedThreadPool(taskCount);

for (int i = 0; i < taskCount; i++) {
    final int id = i;
    pool.execute(() -> {
        try {
            doSubTask(id);
        } finally {
            latch.countDown(); // 不管成功失败，计数都要减一，放在 finally
        }
    });
}
latch.await();   // 主线程阻塞，直到计数减到 0
System.out.println("所有子任务完成，开始汇总");`

const semaphoreCode = `import java.util.concurrent.Semaphore;

// 限流：同一时刻最多放 10 个线程进入临界区
Semaphore semaphore = new Semaphore(10);

void callThirdParty(Request req) throws InterruptedException {
    semaphore.acquire();             // 拿一个许可，没有就阻塞
    try {
        invokeRemote(req);           // 受保护的有限资源
    } finally {
        semaphore.release();         // 用完务必归还，否则许可会越来越少
    }
}`

const threadLocalCode = `import java.text.SimpleDateFormat;

// 每个线程独享一份 SimpleDateFormat（它本身线程不安全）
private static final ThreadLocal<SimpleDateFormat> FMT =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

String format(java.util.Date date) {
    try {
        return FMT.get().format(date); // 拿到的是本线程专属的实例
    } finally {
        FMT.remove();  // 线程池场景下，用完一定 remove，防止内存泄漏与脏数据
    }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          <code>synchronized</code> 和 <code>Lock</code> 解决的是「互斥」，但实际项目里还有别的协作需求：等一组任务全跑完、
          一批线程到齐再一起出发、把并发数限制在某个上限、给每个线程一份私有变量。JDK 的
          <code>java.util.concurrent</code> 包提供了几个现成的工具——
          <em>CountDownLatch</em>、<em>CyclicBarrier</em>、<em>Semaphore</em>、<em>ThreadLocal</em>，是面试高频对比题。
        </p>
      </Lead>

      <h2>CountDownLatch：等一组任务完成</h2>
      <p>
        <em>CountDownLatch</em> 是一个倒数计数器：初始化一个计数 N，每完成一件事就 <code>countDown()</code> 减一，
        在 <code>await()</code> 上等待的线程会一直阻塞，直到计数减到 0 才放行。它适合「<strong>一个或多个线程，
        等一组任务全部完成</strong>」的场景。
      </p>
      <p>
        关键特性是<strong>一次性</strong>：计数只能减不能增，归零之后这个 latch 就报废了，不能重置复用。
      </p>

      <Example title="主线程等所有子任务">
        <p>
          下单后要并行做「扣库存、发优惠券、记日志、推送消息」四件子任务，全部完成才返回成功。主线程
          <code>await()</code> 阻塞，每个子任务在 finally 里 <code>countDown()</code>，四个都减完，主线程被唤醒去汇总结果。
          这就是 CountDownLatch 最典型的「汇聚」用法。
        </p>
      </Example>

      <h2>CyclicBarrier：一批线程互相等齐</h2>
      <p>
        <em>CyclicBarrier</em>（循环栅栏）解决的是另一种协作：<strong>一组线程互相等待</strong>，都到达同一个屏障点后，
        再一起继续往下走。和 CountDownLatch 的「别人等我」不同，它是「<strong>大家互相等</strong>」。
      </p>
      <p>
        名字里的 <em>cyclic</em> 说明它<strong>可重用</strong>：所有线程冲过屏障后，栅栏会自动重置，可以进入下一轮，
        这点和一次性的 CountDownLatch 正好相反。还可以传一个 barrierAction，在最后一个线程到达时执行一段汇总逻辑。
      </p>

      <h2>Semaphore：信号量限流</h2>
      <p>
        <em>Semaphore</em>（信号量）管理一组「许可证」：<code>acquire()</code> 拿一个许可，许可不够就阻塞；
        <code>release()</code> 用完归还。它能把同时进入某段代码的线程数限制在一个上限，是最朴素的<strong>限流</strong>工具。
      </p>

      <Example title="限制 10 个并发">
        <p>
          调一个第三方接口，对方只允许我们最多 10 个并发连接。用 <code>new Semaphore(10)</code>，每个线程进临界区前
          <code>acquire()</code>、出来时 <code>release()</code>，无论来多少请求，同一时刻最多 10 个真正在调，
          其余排队等待，既保护了下游也避免被限流封禁。
        </p>
      </Example>

      <KeyIdea title="三者一句话区分">
        <p>
          <strong>CountDownLatch</strong>「一个等一组」，一次性；<strong>CyclicBarrier</strong>「一组互相等齐再一起走」，
          可重用；<strong>Semaphore</strong>「控制同时进入的数量」，做限流。记住「谁等谁、能不能重用」这两点，
          面试对比题就稳了。
        </p>
      </KeyIdea>

      <h2>ThreadLocal：线程隔离</h2>
      <p>
        前面三个是线程间协作，<em>ThreadLocal</em> 反过来——它让每个线程拥有<strong>一份自己独享的变量副本</strong>，
        互不干扰，从而避免共享、规避同步。常见用途是给非线程安全的对象（如 <em>SimpleDateFormat</em>）每线程一份，
        或在一次请求链路里传递用户上下文。
      </p>
      <h3>原理与内存泄漏</h3>
      <p>
        每个 <em>Thread</em> 内部都挂着一个 <em>ThreadLocalMap</em>，它的 key 是 ThreadLocal 对象（以
        <strong>弱引用</strong>持有），value 是你存的值。<code>get/set</code> 操作的都是当前线程自己的这张 map，
        所以天然隔离。
      </p>
      <p>
        风险在于：key 是弱引用，ThreadLocal 没有强引用时会被 GC 回收，于是 map 里出现 key 为 null 但 value 还在的
        <strong>脏 entry</strong>；如果这个线程被线程池长期复用，value 就一直无法释放，造成<strong>内存泄漏</strong>，
        而且下一个复用该线程的任务还可能读到上一个任务的脏数据。
      </p>

      <Callout variant="warn" title="用完一定要 remove">
        <p>
          线程池里的线程不会销毁，ThreadLocal 用完不清理，残留的 value 既泄漏内存又污染下一次任务。
          固定写法是把业务逻辑放在 try 里、把 <code>ThreadLocal.remove()</code> 放在 <code>finally</code> 里，
          确保无论是否异常都清理干净。
        </p>
      </Callout>

      <h2>实战与面试怎么答</h2>
      <p>
        被问到这几个工具，先按「协作 vs 隔离」分两组：CountDownLatch / CyclicBarrier / Semaphore 是线程间协作，
        ThreadLocal 是线程隔离。再就协作三件套强调区别——「等的方向」和「能否重用」。最后单独补 ThreadLocal：
        原理是 ThreadLocalMap 以弱引用 ThreadLocal 为 key，结论是<strong>线程池场景务必 remove</strong>，
        这是最常考的落地点。
      </p>

      <Practice title="串起三个工具用一遍">
        <p>
          用 CountDownLatch 让主线程等所有子任务完成，用 Semaphore 把并发压在 10 以内，再用 ThreadLocal 给每个线程一份
          私有格式化器并在 finally 里 remove。三段都是面试可以直接默写的模板。
        </p>
        <CodeBlock lang="java" title="CountDownLatchDemo.java" code={latchCode} />
        <CodeBlock lang="java" title="SemaphoreDemo.java" code={semaphoreCode} />
        <CodeBlock lang="java" title="ThreadLocalDemo.java" code={threadLocalCode} />
      </Practice>

      <Summary
        points={[
          'CountDownLatch：一个或多个线程等一组任务完成，countDown 减、await 等，计数归零即报废，一次性。',
          'CyclicBarrier：一组线程互相等齐再一起继续，冲过屏障自动重置，可重用，还能带 barrierAction 汇总。',
          'Semaphore：管理许可、acquire/release，把同时进入临界区的线程数限制在上限，用于限流。',
          'ThreadLocal：每线程一份私有副本实现隔离，原理是 Thread 内的 ThreadLocalMap 以弱引用 ThreadLocal 为 key。',
          'ThreadLocal 的内存泄漏来自 key 被回收后残留的 value，线程池复用时务必在 finally 里 remove。',
          '区分口诀：协作三件套看「谁等谁、能否重用」，ThreadLocal 看「隔离与 remove」。',
        ]}
      />
    </>
  )
}

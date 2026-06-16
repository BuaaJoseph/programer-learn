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

const inheritableCode = `// 普通 ThreadLocal 在子线程里取不到父线程的值
// InheritableThreadLocal 能让子线程「继承」父线程创建子线程那一刻的值
static final InheritableThreadLocal<String> CTX = new InheritableThreadLocal<>();

CTX.set("traceId-123");
new Thread(() -> {
    System.out.println(CTX.get());   // 子线程能拿到 "traceId-123"
}).start();

// 但有大坑：线程池里线程是复用的，子线程「创建时」继承的值不会随任务更新，
// 所以线程池 + InheritableThreadLocal 传递链路上下文会串味儿，
// 生产里链路追踪要用阿里的 TransmittableThreadLocal(TTL) 解决`

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
        底层就是上一卷讲的 AQS：用 <code>state</code> 存初始计数，<code>countDown</code> 是 CAS 把 state 减 1，
        减到 0 时唤醒所有在 <code>await</code>（共享模式 acquire）上阻塞的线程。关键特性是<strong>一次性</strong>：
        计数只能减不能增，归零之后这个 latch 就报废了，不能重置复用——要可重用得用下面的 CyclicBarrier。
      </p>
      <Callout variant="warn" title="countDown 一定放 finally，并配超时 await">
        <p>
          实战两个坑：一是 <code>countDown()</code> 必须放在子任务的 <code>finally</code> 里——如果任务抛异常没减成功，
          主线程会在 <code>await()</code> 上<strong>永久阻塞</strong>，整个流程卡死。二是优先用带超时的 <code>await(timeout)</code>，
          给一个兜底时限，避免某个子任务挂了拖垮全局。这两点是「等一组任务」类代码最容易出的生产事故。
        </p>
      </Callout>

      <Example title="主线程等所有子任务">
        <p>
          下单后要并行做「扣库存、发优惠券、记日志、推送消息」四件子任务，全部完成才返回成功。主线程
          <code>await()</code> 阻塞，每个子任务在 finally 里 <code>countDown()</code>，四个都减完，主线程被唤醒去汇总结果。
          这就是 CountDownLatch 最典型的「汇聚」用法（也可以用 <code>CompletableFuture.allOf</code> 更现代地实现）。
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
      <Callout variant="info" title="CyclicBarrier 的实现底座不一样">
        <p>
          一个容易被忽略但很显功力的对比：CountDownLatch 直接用 AQS 的共享模式实现；而 CyclicBarrier 底层是
          <strong>ReentrantLock + Condition</strong>，靠「计数减到 0 就 signalAll、否则 await」来实现互相等待和栅栏重置。
          还有个坑：CyclicBarrier 的等待是<strong>全有或全无</strong>——如果有一个线程在等待时被中断或超时，会抛 <code>BrokenBarrierException</code>，
          整个栅栏「破损」，其余所有等待线程也一起异常退出。所以它适合「要么一起成功、要么一起失败」的并行计算分阶段场景。
        </p>
      </Callout>

      <h2>Semaphore：信号量限流</h2>
      <p>
        <em>Semaphore</em>（信号量）管理一组「许可证」：<code>acquire()</code> 拿一个许可，许可不够就阻塞；
        <code>release()</code> 用完归还。它能把同时进入某段代码的线程数限制在一个上限，是最朴素的<strong>限流</strong>工具。
        底层同样是 AQS 共享模式，<code>state</code> 就是剩余许可数，acquire 减、release 加。
      </p>
      <Callout variant="warn" title="release 不必由 acquire 的同一线程调，是把双刃剑">
        <p>
          Semaphore 一个特别的地方：<code>release()</code> 并不要求由调 acquire 的那个线程来调，甚至可以 release 超过初始许可数
          （许可总数会被「凭空」增加）。这带来灵活性，但也是隐患——如果业务里漏 release（比如没放 finally、异常路径没归还），许可会越来越少，
          最终所有线程都 acquire 不到、全部卡死。所以 <code>acquire</code>/<code>release</code> 必须严格成对，<code>release</code> 放 finally。
        </p>
      </Callout>

      <Example title="限制 10 个并发">
        <p>
          调一个第三方接口，对方只允许我们最多 10 个并发连接。用 <code>new Semaphore(10)</code>，每个线程进临界区前
          <code>acquire()</code>、出来时 <code>release()</code>，无论来多少请求，同一时刻最多 10 个真正在调，
          其余排队等待，既保护了下游也避免被限流封禁。要避免无限排队，可改用 <code>tryAcquire(timeout)</code> 拿不到就快速失败/降级。
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
        或在一次请求链路里传递用户上下文（如登录用户、traceId）。
      </p>
      <h3>原理与内存泄漏</h3>
      <p>
        每个 <em>Thread</em> 内部都挂着一个 <em>ThreadLocalMap</em>，它的 key 是 ThreadLocal 对象（以
        <strong>弱引用</strong>持有），value 是你存的值。<code>get/set</code> 操作的都是当前线程自己的这张 map，
        所以天然隔离。ThreadLocalMap 解决 hash 冲突用的是<strong>开放寻址法</strong>（线性探测），和 HashMap 的链地址法不同，这也是常考的细节。
      </p>
      <p>
        风险在于：key 是弱引用，ThreadLocal 没有强引用时会被 GC 回收，于是 map 里出现 key 为 null 但 value 还在的
        <strong>脏 entry</strong>；如果这个线程被线程池长期复用，value 就一直无法释放，造成<strong>内存泄漏</strong>，
        而且下一个复用该线程的任务还可能读到上一个任务的脏数据。
      </p>
      <Callout variant="info" title="追问：key 为什么用弱引用而不是强引用">
        <p>
          这是 ThreadLocal 最爱被追问的点。如果 key 用<strong>强引用</strong>：ThreadLocal 对象即使在外部已经没人用了，
          也会因为被 ThreadLocalMap 强引用着而无法回收，泄漏更严重、更彻底。改用<strong>弱引用</strong>后，外部没有强引用时 key（ThreadLocal）能被 GC 掉，
          至少把「key 的泄漏」消除了。剩下的 value 泄漏，JDK 在 <code>get/set/remove</code> 时会顺手清理一部分 key 为 null 的脏 entry 兜底。
          但「兜底」不可靠（不一定触发到那个槽位），所以最终解还是<strong>手动 remove</strong>。弱引用是「两害相权取其轻」的设计权衡。
        </p>
      </Callout>

      <Callout variant="warn" title="用完一定要 remove">
        <p>
          线程池里的线程不会销毁，ThreadLocal 用完不清理，残留的 value 既泄漏内存又污染下一次任务。
          固定写法是把业务逻辑放在 try 里、把 <code>ThreadLocal.remove()</code> 放在 <code>finally</code> 里，
          确保无论是否异常都清理干净。线上有过真实事故：用户上下文存在 ThreadLocal 没 remove，线程被复用后
          B 用户的请求读到了 A 用户残留的身份信息，<strong>越权访问</strong>——这已经不只是内存问题，而是安全漏洞了。
        </p>
      </Callout>

      <h3>跨线程传递：InheritableThreadLocal 与 TTL</h3>
      <p>
        普通 ThreadLocal 在子线程里读不到父线程的值。<code>InheritableThreadLocal</code> 能在<strong>创建子线程那一刻</strong>把父线程的值复制给子线程。
        但它在<strong>线程池</strong>下会失灵——线程是复用的，「创建时」继承的值不会随每次提交的任务更新，导致上下文「串味儿」。
        生产里做全链路追踪（traceId 透传到异步线程/线程池）通常用阿里开源的 <code>TransmittableThreadLocal</code>(TTL) 来解决。
      </p>
      <CodeBlock lang="java" title="InheritableThreadLocal 的边界" code={inheritableCode} />

      <h2>实战与面试怎么答</h2>
      <p>
        被问到这几个工具，先按「协作 vs 隔离」分两组：CountDownLatch / CyclicBarrier / Semaphore 是线程间协作，
        ThreadLocal 是线程隔离。再就协作三件套强调区别——「等的方向」和「能否重用」，并能点出 CountDownLatch/Semaphore 基于 AQS、CyclicBarrier 基于 Lock+Condition。
        最后单独补 ThreadLocal：原理是 ThreadLocalMap 以弱引用 ThreadLocal 为 key、开放寻址解冲突，结论是<strong>线程池场景务必 remove</strong>，
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
          'CountDownLatch：一个或多个线程等一组任务完成，countDown 减、await 等，计数归零即报废，一次性，底层 AQS 共享模式。',
          'countDown 放 finally 并用带超时的 await，否则子任务异常会让主线程永久阻塞。',
          'CyclicBarrier：一组线程互相等齐再一起继续，可重用、带 barrierAction，底层 ReentrantLock+Condition，一处中断会 BrokenBarrierException 全员破损。',
          'Semaphore：管理许可、acquire/release（可不同线程、放 finally），限制同时进入数量做限流，底层 AQS 共享模式。',
          'ThreadLocal：每线程一份私有副本实现隔离，Thread 内的 ThreadLocalMap 以弱引用 ThreadLocal 为 key、开放寻址解冲突。',
          'key 用弱引用是为了至少回收 ThreadLocal 本身；value 泄漏靠 get/set 兜底清理不可靠，线程池务必 finally 里 remove，否则泄漏甚至越权。',
          'InheritableThreadLocal 可让子线程继承父线程值，但线程池下会串味儿，链路透传用阿里 TTL。',
          '区分口诀：协作三件套看「谁等谁、能否重用」，ThreadLocal 看「隔离与 remove」。',
        ]}
      />
    </>
  )
}

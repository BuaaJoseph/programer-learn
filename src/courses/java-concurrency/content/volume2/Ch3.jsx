import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Aqs from '@/courses/java-concurrency/illustrations/Aqs.jsx'

const mutexCode = `import java.util.concurrent.locks.AbstractQueuedSynchronizer;

// 用 AQS 实现一个最简单的不可重入互斥锁（骨架）
public class SimpleMutex {

    // 把同步逻辑交给一个 AQS 子类：state=0 未锁，state=1 已锁
    private static class Sync extends AbstractQueuedSynchronizer {
        @Override
        protected boolean tryAcquire(int arg) {
            // 把 state 从 0 改成 1，成功就拿到锁
            if (compareAndSetState(0, 1)) {
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;   // 失败：AQS 会自动把当前线程入队并 park
        }

        @Override
        protected boolean tryRelease(int arg) {
            setExclusiveOwnerThread(null);
            setState(0);    // 释放：state 归 0，AQS 会唤醒队首
            return true;
        }
    }

    private final Sync sync = new Sync();

    public void lock()   { sync.acquire(1); }   // 模板方法，内部调 tryAcquire
    public void unlock() { sync.release(1); }   // 模板方法，内部调 tryRelease
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          <code>ReentrantLock</code>、<code>Semaphore</code>、<code>CountDownLatch</code>、读写锁……
          JUC 里这一大票同步工具，底层全都建在同一个类上：<em>AQS</em>（AbstractQueuedSynchronizer，
          抽象队列同步器）。把 AQS 搞懂，等于一把钥匙开了 JUC 的一整扇门，所以它是并发面试的重头戏。
        </p>
      </Lead>

      <h2>AQS 的两大件：state 与 CLH 队列</h2>
      <p>
        AQS 的全部秘密就藏在两样东西里：
      </p>
      <ul>
        <li>
          <strong>一个 <code>volatile int state</code></strong>：用来表示「同步状态」。它是什么含义由子类自己定义——
          可以是锁的重入次数、信号量的剩余许可、闩锁的剩余计数。对它的修改全靠 CAS，保证原子。
        </li>
        <li>
          <strong>一个 CLH 变体的双向队列</strong>：抢不到同步状态的线程，会被包成一个 Node 节点，排进这个
          先进先出（FIFO）的<em>等待队列</em>里，乖乖排队，而不是疯狂自旋。
        </li>
      </ul>
      <p>
        AQS 用的是<em>模板方法</em>模式：它把「入队、阻塞、唤醒、排队公平性」这些通用的复杂逻辑都写好了，
        只把「<code>state</code> 怎么算才叫拿到/释放成功」这一小块留给子类去填（重写 <code>tryAcquire</code> /
        <code>tryRelease</code> 等）。子类只管定义规则，排队和阻塞的脏活累活 AQS 全包。
      </p>

      <Aqs />

      <h2>获取与释放：park 和 unpark</h2>
      <p>
        以独占模式为例，获取锁的流程是：调用 <code>acquire</code> → 先试 <code>tryAcquire</code>，
        成功就直接进去；<strong>失败</strong>则把当前线程包成 Node 加入队尾，然后调
        <code>LockSupport.park</code> 把自己<em>阻塞</em>挂起，让出 CPU。释放时：调用 <code>release</code> →
        <code>tryRelease</code> 改 <code>state</code> 成功后，<code>unpark</code> <strong>唤醒队首</strong>
        那个等待的线程，让它醒来再去抢。这套「失败入队 park、释放唤醒队首」就是 AQS 的核心节奏。
      </p>

      <h3>独占模式 vs 共享模式</h3>
      <p>
        AQS 支持两种模式：<strong>独占</strong>（exclusive）——同一时刻只有一个线程能拿到，比如
        <code>ReentrantLock</code>；<strong>共享</strong>（shared）——允许多个线程同时拿到，比如
        <code>Semaphore</code>、<code>CountDownLatch</code>、读写锁里的读锁。两种模式对应不同的方法
        （<code>tryAcquire</code> / <code>tryAcquireShared</code>），区别在于「拿到后是否还允许后面的线程继续拿」。
      </p>

      <Example title="ReentrantLock 是怎么用 AQS 的">
        <p>
          <code>ReentrantLock</code> 内部有个继承 AQS 的 <code>Sync</code>。它用 <code>state</code> 记
          <strong>重入次数</strong>：第一次加锁把 state 从 0 改成 1、并记下持锁线程；同一线程再加锁，
          发现持锁的是自己，就把 state 加 1（这就是「可重入」）；解锁则把 state 减 1，减到 0 才算真正释放、
          才唤醒队列里等待的线程。
        </p>
        <p>
          顺着这个思路，其他同步器只是把 <code>state</code> 的含义换了：<code>Semaphore</code> 用 state 记
          <strong>剩余许可数</strong>，acquire 减、release 加；<code>CountDownLatch</code> 用 state 记
          <strong>剩余计数</strong>，countDown 减一、减到 0 时唤醒所有 await 的线程；
          <code>ReentrantReadWriteLock</code> 更巧妙，把一个 int 的<strong>高 16 位记读锁数量、低 16 位记写锁数量</strong>，
          一个 state 同时管两种锁。
        </p>
      </Example>

      <KeyIdea title="一个 state，玩出所有同步器">
        <p>
          理解 AQS 的关键，是抓住「<strong>所有同步器的差别，只在于怎么解释和操作那个 state</strong>」。
          排队、阻塞、唤醒的机制是共用的，各家只是给 state 赋予了不同含义。背面试题时，按
          「ReentrantLock=重入次数、Semaphore=许可、CountDownLatch=计数、读写锁=高低位拆分」
          这条线索串起来，记得又快又牢。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="公平 vs 非公平">
        <p>
          AQS 队列默认可以是<strong>非公平</strong>的：一个线程来抢锁时，会先「插队」直接 CAS 试一把，
          抢到就走，根本不看队列里有没有人等——这会让排队的线程「饿」一会儿，但减少了线程切换、吞吐更高，
          所以 <code>ReentrantLock</code> 默认就是非公平。<strong>公平</strong>模式则相反：抢锁前先检查队列，
          有人排在前面就乖乖去队尾排队，严格 FIFO、不插队，更公平但吞吐略低。绝大多数场景用非公平就好。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「AQS 原理」，主干就一句话：<strong>一个 volatile 的 state 表示同步状态 + 一个 CLH 双向队列管理等待线程</strong>，
        抢不到就入队 park、释放后 unpark 唤醒队首；它用模板方法把通用逻辑封好，子类只重写 tryAcquire/tryRelease。
        再举 <code>ReentrantLock</code> 用 state 记重入次数当例子，并顺带点出 Semaphore、CountDownLatch、
        读写锁各自怎么用 state，最后补一句公平与非公平的区别——这套答法层次分明，很加分。
      </p>

      <Practice title="用 AQS 撸一个最简互斥锁">
        <p>
          自己写一个 AQS 子类，<code>state=0</code> 表示没锁、<code>state=1</code> 表示已锁。
          只需重写 <code>tryAcquire</code>（CAS 把 0 改 1）和 <code>tryRelease</code>（把 state 归 0），
          入队、park、唤醒这些全交给 AQS 的 <code>acquire</code> / <code>release</code> 模板方法。
        </p>
        <CodeBlock lang="java" title="SimpleMutex.java" code={mutexCode} />
        <p>
          体会一下：你只写了「怎么判定拿到/释放成功」这十几行，一把可用的互斥锁就成了——
          排队和阻塞的复杂度全被 AQS 吃掉了。这正是 AQS 设计的精妙之处。
        </p>
      </Practice>

      <Summary
        points={[
          'AQS 是 JUC 的基石：ReentrantLock、Semaphore、CountDownLatch、读写锁全都建在它之上。',
          '两大件：一个 volatile int state 表示同步状态（含义由子类定），一个 CLH 双向 FIFO 等待队列。',
          '获取失败的线程入队并 park 阻塞；释放时 unpark 唤醒队首线程，再去争抢。',
          '支持独占与共享两种模式；用模板方法把通用逻辑封装，子类只重写 tryAcquire/tryRelease 等。',
          '各同步器只是 state 含义不同：ReentrantLock 记重入次数、Semaphore 记许可、CountDownLatch 记计数、读写锁高低位拆读写。',
          '公平锁严格 FIFO 排队，非公平锁允许插队抢、吞吐更高（ReentrantLock 默认非公平）。',
        ]}
      />
    </>
  )
}

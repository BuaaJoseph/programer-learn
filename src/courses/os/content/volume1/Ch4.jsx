import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Deadlock from '@/courses/os/illustrations/Deadlock.jsx'

const deadlockCode = `// 反例：两个线程交叉加锁，会死锁
void* thread_A(void* arg) {
    lock(mutex_1);    // A 先拿锁 1
    sleep(1);
    lock(mutex_2);    // 再等锁 2 —— 但锁 2 在 B 手里
    // ... 临界区
    unlock(mutex_2);
    unlock(mutex_1);
}

void* thread_B(void* arg) {
    lock(mutex_2);    // B 先拿锁 2
    sleep(1);
    lock(mutex_1);    // 再等锁 1 —— 但锁 1 在 A 手里
    // ... 临界区
    unlock(mutex_1);
    unlock(mutex_2);
}`

const fixCode = `// 解法：所有线程都按“固定顺序”加锁（先 1 后 2）
void acquire_both() {
    lock(mutex_1);    // 永远先拿编号小的锁
    lock(mutex_2);    // 再拿编号大的锁
    // ... 临界区
    unlock(mutex_2);  // 释放顺序通常与加锁相反
    unlock(mutex_1);
}

// 既然大家都先 1 后 2，就不会出现 A 持 1 等 2、B 持 2 等 1
// 的循环等待，循环等待这一必要条件被破坏，死锁不再发生。

// 另一种思路：加锁带超时，拿不到就回退重试
if (try_lock(mutex_2, timeout=100ms)) {
    // 拿到了，继续
} else {
    unlock(mutex_1);   // 主动放弃已持有的锁，避免占有并等待
    retry();
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          多个进程或线程互相等着对方手里的资源，谁也不肯撒手，结果<strong>全都卡死、永远等下去</strong>——
          这就是<em>死锁</em>（deadlock）。它是并发编程里最经典也最折磨人的 bug：偶发、难复现、一出就是线上事故。
          这一章把死锁的成因、四个必要条件、各种处理策略讲透，并给出实际开发里最实用的防身招式。
        </p>
      </Lead>

      <h2>死锁是什么</h2>
      <p>
        想象一个最小的例子：线程 A 拿着锁 1，想再去拿锁 2；与此同时线程 B 拿着锁 2，想再去拿锁 1。
        A 在等 B 放锁 2，B 在等 A 放锁 1，两边都不肯先放手——于是双双僵在原地，谁也走不下去。
        这种「彼此持有对方所需资源、互相干等」的状态，就是死锁。资源越多、加锁越乱，越容易踩中。
      </p>

      <h3>死锁的四个必要条件</h3>
      <p>
        死锁发生，下面四个条件必须<strong>同时成立</strong>（缺一不可，这也是预防的突破口）：
      </p>
      <ul>
        <li><strong>互斥</strong>（mutual exclusion）：资源同一时刻只能被一个线程占用，不能共享。</li>
        <li><strong>占有并等待</strong>（hold and wait）：线程已经握着一些资源，又在等待另一些资源，且不释放已握的。</li>
        <li><strong>不可剥夺</strong>（no preemption）：资源只能由持有者主动释放，别人和系统都不能强抢。</li>
        <li><strong>循环等待</strong>（circular wait）：存在一条等待环，A 等 B、B 等 C……最后又绕回 A。</li>
      </ul>

      <Example title="两线程交叉加锁">
        <p>
          下面这段代码就是死锁的标准教科书反例：A 先锁 1 再锁 2，B 先锁 2 再锁 1。只要时序凑巧
          （A 拿到锁 1、B 拿到锁 2 之后双方再去拿第二把锁），就会形成「A 持 1 等 2、B 持 2 等 1」的循环等待，整个程序卡死。
        </p>
        <CodeBlock lang="c" title="deadlock_demo.c" code={deadlockCode} />
        <p>
          注意中间的 <code>sleep</code> 只是为了让死锁<strong>必然</strong>触发；真实代码里不需要它，死锁照样会偶发，
          这也是它难复现的原因——它依赖特定的时序。
        </p>
      </Example>

      <Deadlock />

      <KeyIdea title="处理死锁的四类策略">
        <p>
          应对死锁有四条路。<strong>预防</strong>（prevention）：破坏四个必要条件之一，比如固定加锁顺序破坏循环等待。
          <strong>避免</strong>（avoidance）：运行时动态判断分配资源后是否还安全，代表是<em>银行家算法</em>
          （Banker's algorithm），只在「分配后系统仍处于安全状态」时才批准。
          <strong>检测与恢复</strong>（detection &amp; recovery）：允许死锁发生，定期扫描资源等待图找环，发现了就杀进程或回滚来打破。
          <strong>鸵鸟策略</strong>（ostrich algorithm）：假装看不见，因为死锁概率低、预防成本高，不少通用系统就这么干。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="死锁、活锁、饥饿别搞混">
        <p>
          这三个常被一起考。<strong>死锁</strong>：线程都<em>卡住不动</em>、互相干等，谁也没在执行。
          <strong>活锁</strong>（livelock）：线程一直<em>在动</em>、在不停地响应对方、重试退让，却始终没有实质进展——
          像两个人在走廊相遇，同时往同一边让，反复横跳谁也过不去。<strong>饥饿</strong>（starvation）：某个线程一直拿不到资源，
          但<em>别的线程在正常推进</em>，只是它被持续插队（如低优先级进程永远抢不过高优先级的）。
          一句话区分：死锁是都停了、活锁是都白忙、饥饿是个别被饿着。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「实际开发怎么避免死锁」时，别背银行家算法（工程里几乎不用），要给可落地的招：
      </p>
      <ul>
        <li>
          <strong>按固定顺序加锁</strong>：全项目约定一个全局的加锁顺序（比如按锁的地址或编号从小到大），
          所有线程都遵守，就破坏了循环等待——这是最常用、最有效的一招。
        </li>
        <li>
          <strong>加锁带超时</strong>：用 <code>try_lock</code> 配超时，拿不到就主动释放已持有的锁、回退重试，破坏「占有并等待」。
        </li>
        <li>
          <strong>减少锁粒度 / 缩短持锁时间</strong>：锁住的范围越小、持有时间越短，碰撞和嵌套的机会就越少，从源头降低死锁概率。
        </li>
        <li>
          <strong>能不嵌套就不嵌套</strong>：尽量避免一个线程同时持有多把锁，必须嵌套时严格遵守固定顺序。
        </li>
      </ul>

      <Practice title="用固定加锁顺序避免死锁">
        <p>
          回到刚才那个交叉加锁的反例，修复的关键就一句话：<strong>让所有线程都按同一个固定顺序加锁</strong>。
          下面给出「固定顺序」和「超时回退」两种写法。
        </p>
        <CodeBlock lang="c" title="fix_deadlock.c" code={fixCode} />
        <p>
          核心理解：原来 A 先 1 后 2、B 先 2 后 1 才会成环；现在大家都「先 1 后 2」，就不可能出现一个持 1 等 2、
          另一个持 2 等 1 的局面，循环等待这个必要条件被破坏，死锁自然消失。
        </p>
      </Practice>

      <Summary
        points={[
          '死锁是多个线程互相持有对方所需资源、彼此干等、全部卡死永不前进的状态。',
          '死锁的四个必要条件须同时成立：互斥、占有并等待、不可剥夺、循环等待，缺一不可。',
          '处理策略分四类：预防（破坏四条件）、避免（银行家算法保证安全状态）、检测加恢复、以及鸵鸟策略。',
          '死锁是都停住干等，活锁是都在忙却无进展，饥饿是个别线程被持续插队而别人正常推进。',
          '工程上最实用的防死锁招是按固定顺序加锁，从根上破坏循环等待。',
          '其余实战手段：加锁带超时回退、减小锁粒度缩短持锁时间、尽量避免嵌套持有多把锁。',
        ]}
      />
    </>
  )
}

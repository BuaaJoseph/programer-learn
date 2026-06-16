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

const bankerCode = `# 银行家算法核心：试探性分配后检查系统是否还"安全"
# 安全 = 存在一个执行序列，能让所有进程都拿到所需资源跑完

def is_safe(available, allocation, need):
    work = available[:]              # 当前可用资源
    finish = [False] * len(need)
    while True:
        progressed = False
        for i in range(len(need)):
            # 找一个还没完成、且剩余需求能被满足的进程
            if not finish[i] and all(need[i][j] <= work[j]
                                     for j in range(len(work))):
                # 假设它跑完，归还它占的资源
                for j in range(len(work)):
                    work[j] += allocation[i][j]
                finish[i] = True
                progressed = True
        if not progressed:
            break
    return all(finish)               # 全部能跑完 = 安全状态`

const rustCode = `// 编译期防御：Rust 用所有权和类型系统在编译时挡住数据竞争
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));   // 数据被锁包裹，不锁拿不到
let mut handles = vec![];
for _ in 0..10 {
    let c = Arc::clone(&counter);
    handles.push(thread::spawn(move || {
        let mut num = c.lock().unwrap();  // 必须先拿锁才能访问数据
        *num += 1;                        // 离开作用域自动解锁，忘不了
    }));
}
for h in handles { h.join().unwrap(); }`

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
      <p>
        要把死锁讲到位，先得有<strong>临界区</strong>和<strong>互斥</strong>的概念垫底。多个线程会同时访问的共享数据段叫临界区，
        为防止并发写出竞态，进临界区前要加锁、出来再解锁，保证同一时刻只有一个线程在里面，这就是互斥。死锁恰恰是
        「为了互斥而加的锁」彼此纠缠出来的副作用——所以它和加锁机制是一体两面，不可能完全消灭，只能管理。
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
      <p>
        这四条不只是要背，更要会用：每一条都对应一种预防手段。破坏「互斥」——把资源做成可共享或无锁结构（如用原子操作、
        读写锁让多读者并存）；破坏「占有并等待」——要么一次性申请全部资源，要么拿不到就先全放掉；破坏「不可剥夺」——允许抢占，
        拿不到新资源就被迫吐出已有的；破坏「循环等待」——给资源全局编号，强制按序申请。其中破坏循环等待最实用，下面会反复讲。
      </p>

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

      <h3>银行家算法：避免策略的代表</h3>
      <p>
        银行家算法常被笔试考到，逻辑是：每次有进程申请资源时，先<strong>试探性地分配</strong>，再检查分配之后系统是否还处于
        <em>安全状态</em>——所谓安全，就是至少存在一个执行序列，能让所有进程依次拿到它们声明的最大需求、顺利跑完。
        如果安全就真的分配，不安全就让该进程先等着。它要求进程<strong>预先声明最大资源需求</strong>，这在现实里几乎做不到，
        所以工程上基本不用，但它把「安全状态」这个思想讲得很清楚。
      </p>
      <CodeBlock lang="python" title="banker.py" code={bankerCode} />

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
      <p>
        还可以补两句加分项。其一，区分<strong>悲观锁与乐观锁</strong>：悲观锁假设冲突常发生，先加锁再操作（如 <code>mutex</code>）；
        乐观锁假设冲突罕见，不加锁直接干，提交时用 <em>CAS</em>（Compare-And-Swap）检查有没有被人改过，被改了就重试——
        乐观锁无锁，自然没有死锁问题，但高冲突场景重试会很多。其二，现代语言把防御提前到<strong>编译期</strong>：
        Rust 用所有权 + <code>Send/Sync</code> 类型约束，让数据竞争在编译时就报错，锁和数据被强制绑在一起，几乎不可能忘记加锁。
      </p>
      <CodeBlock lang="rust" title="rust_mutex.rs" code={rustCode} />
      <Callout variant="info" title="一个真实案例：数据库死锁">
        <p>
          数据库是死锁的重灾区。两个事务各自先更新了一行、再去更新对方锁住的行，就构成循环等待。数据库不会傻等，
          它内置<strong>死锁检测</strong>：周期性构建等待图找环，一旦发现就挑一个「代价最小」的事务作为牺牲者
          回滚（报 <code>deadlock detected</code>），让另一个继续。所以应用层要做的不是消灭死锁，而是<strong>捕获回滚错误并重试</strong>，
          同时让所有事务按相同顺序访问表和行，从源头减少成环——这正是「固定顺序」思想在数据库层的落地。
        </p>
      </Callout>

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
          '死锁的四个必要条件须同时成立：互斥、占有并等待、不可剥夺、循环等待，缺一不可，每条都对应一种预防手段。',
          '处理策略分四类：预防（破坏四条件）、避免（银行家算法保证安全状态）、检测加恢复、以及鸵鸟策略。',
          '银行家算法的核心是分配前检查系统是否仍处于安全状态，但要预先声明最大需求，工程上少用。',
          '死锁是都停住干等，活锁是都在忙却无进展，饥饿是个别线程被持续插队而别人正常推进。',
          '工程上最实用的防死锁招是按固定顺序加锁，从根上破坏循环等待。',
          '其余实战手段：加锁带超时回退、减小锁粒度、避免嵌套；乐观锁用 CAS 无锁可绕开死锁，Rust 在编译期挡数据竞争。',
          '数据库内置死锁检测，发现成环就回滚代价最小的事务，应用层要捕获并重试。',
        ]}
      />
    </>
  )
}

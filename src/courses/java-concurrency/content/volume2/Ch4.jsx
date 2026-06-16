import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cacheCode = `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantReadWriteLock;

// 读多写少的缓存：读读并发，写时独占
public class Cache {
    private final Map<String, Object> map = new HashMap<>();
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final ReentrantReadWriteLock.ReadLock  r = rw.readLock();
    private final ReentrantReadWriteLock.WriteLock w = rw.writeLock();

    public Object get(String key) {
        r.lock();                 // 读锁：多个线程可同时读
        try {
            return map.get(key);
        } finally {
            r.unlock();           // 解锁务必放 finally
        }
    }

    public void put(String key, Object val) {
        w.lock();                 // 写锁：独占，挡住所有读和写
        try {
            map.put(key, val);
        } finally {
            w.unlock();
        }
    }
}`

const condCode = `import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

// ReentrantLock + Condition 实现生产者消费者
public class Buffer {
    private final Object[] items = new Object[10];
    private int count, putPtr, takePtr;

    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();   // 队列不满
    private final Condition notEmpty = lock.newCondition();   // 队列非空

    public void put(Object x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();   // 满了就等
            items[putPtr] = x;
            if (++putPtr == items.length) putPtr = 0;
            count++;
            notEmpty.signal();                               // 唤醒消费者
        } finally {
            lock.unlock();
        }
    }

    public Object take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();             // 空了就等
            Object x = items[takePtr];
            if (++takePtr == items.length) takePtr = 0;
            count--;
            notFull.signal();                                // 唤醒生产者
            return x;
        } finally {
            lock.unlock();
        }
    }
}`

const tryLockCode = `// 用 tryLock 双向加锁避免死锁：抢不全就全部退掉重来
boolean transfer(Account from, Account to, int amount) {
    while (true) {
        if (from.lock.tryLock()) {
            try {
                if (to.lock.tryLock()) {
                    try {
                        from.balance -= amount;
                        to.balance += amount;
                        return true;
                    } finally {
                        to.lock.unlock();
                    }
                }
            } finally {
                from.lock.unlock();   // 没抢到第二把锁，先把第一把退掉
            }
        }
        // 两把没能同时拿到，睡一会儿随机退避后重试，打破死锁的「循环等待」
        Thread.sleep((long) (Math.random() * 10));
    }
}`

const downgradeCode = `// 锁降级：持写锁 → 拿读锁 → 放写锁，平滑过渡，期间数据不被别人改
rwLock.writeLock().lock();
try {
    data = recompute();                 // 写：更新数据
    rwLock.readLock().lock();           // 降级第一步：先拿读锁（此时还持有写锁）
} finally {
    rwLock.writeLock().unlock();        // 降级第二步：释放写锁，仍持读锁
}
try {
    use(data);                          // 现在以读锁身份安全使用刚算好的数据
} finally {
    rwLock.readLock().unlock();
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          上一章讲了 AQS，这一章看它最常用的两个产物：<code>ReentrantLock</code> 和读写锁。
          面试最爱问「<code>ReentrantLock</code> 和 <code>synchronized</code> 有什么区别」，
          以及「读多写少用什么锁」。把功能差异和适用场景说清楚，这两道连环题就拿下了。
        </p>
      </Lead>

      <h2>ReentrantLock：比 synchronized 多了什么</h2>
      <p>
        两者都是可重入的独占锁，但 <code>ReentrantLock</code> 是用 Java 代码（基于 AQS）实现的，比关键字
        <code>synchronized</code> 灵活得多，多出这几样能力：
      </p>
      <ul>
        <li><strong>可中断</strong>：<code>lockInterruptibly()</code> 等锁时能响应 <code>interrupt</code>，不会傻等。</li>
        <li><strong>可超时 / 可尝试</strong>：<code>tryLock()</code> 抢不到立刻返回，<code>tryLock(time)</code> 限时等待，能有效避免死锁。</li>
        <li><strong>可公平</strong>：构造时传 <code>true</code> 得到公平锁（<code>synchronized</code> 只能非公平）。</li>
        <li><strong>多个等待条件</strong>：一把锁能 <code>newCondition()</code> 出多个 <code>Condition</code>，分组唤醒，比 <code>wait/notify</code> 精细。</li>
      </ul>
      <p>
        代价是：<code>synchronized</code> 出了同步块/方法会自动释放锁，而 <code>ReentrantLock</code> 必须
        <strong>手动 <code>unlock</code></strong>，而且要写在 <code>finally</code> 里——否则一旦中间抛异常，
        锁就永远不释放，直接死锁。
      </p>

      <Callout variant="warn" title="unlock 必须放 finally">
        <p>
          这是用 <code>ReentrantLock</code> 最容易出的事故。<code>lock()</code> 之后如果业务代码抛了异常，
          又没把 <code>unlock()</code> 放进 <code>finally</code>，这把锁就再也没人解，后续线程全部卡死。
          固定写法是：<code>lock()</code> 紧跟着 <code>try</code>，<code>unlock()</code> 写在
          <code>finally</code> 第一行。务必形成肌肉记忆。
        </p>
        <p>
          还有一个反向的坑：<code>lock()</code> 不要写在 <code>try</code> <strong>里面</strong>。如果 lock 本身抛异常（极少见但理论存在），
          finally 里又无脑 unlock，就会去解一把根本没拿到的锁，抛 <code>IllegalMonitorStateException</code> 把原始异常盖住。
          正确顺序永远是「<code>lock()</code> 在 try 外、紧贴 try」。
        </p>
      </Callout>

      <h2>用 tryLock 破解死锁</h2>
      <p>
        <code>tryLock</code> 最实用的价值是<strong>打破死锁</strong>。经典的转账死锁：线程 1 锁住账户 A 等账户 B，线程 2 锁住 B 等 A，
        互相死等。用 <code>tryLock</code> 改写后，谁要是没能<strong>同时</strong>抢到两把锁，就把已经拿到的那把<strong>主动退掉</strong>、
        随机退避一下再重来——这就破坏了死锁四个必要条件里的「<strong>占有并等待</strong>」和「<strong>不可剥夺</strong>」，死锁自然不会形成。
      </p>
      <CodeBlock lang="java" title="tryLock 防死锁转账" code={tryLockCode} />

      <h2>Condition：比 wait/notify 更精细的等待</h2>
      <p>
        <code>Condition</code> 的 <code>await</code> / <code>signal</code> 对应 <code>Object</code> 的
        <code>wait</code> / <code>notify</code>，作用都是「让线程在某个条件不满足时挂起等待、条件满足时被唤醒」。
        区别在于：一把 <code>synchronized</code> 锁只有<strong>一个</strong>等待集合，
        <code>notify</code> 只能随机唤醒一个、<code>notifyAll</code> 把所有人全叫醒（包括不该醒的）；
        而一把 <code>ReentrantLock</code> 能创建<strong>多个</strong> <code>Condition</code>，
        让生产者等在「不满」上、消费者等在「非空」上，<strong>分别精准唤醒对方</strong>，避免无谓的惊群。
      </p>
      <p>
        原理上，每个 <code>Condition</code> 内部维护一个<strong>独立的等待队列</strong>。<code>await()</code> 会把线程从 AQS 的同步队列移到这个
        Condition 的等待队列并释放锁；<code>signal()</code> 则把它从等待队列<strong>转移回</strong>同步队列去重新抢锁。所以「多个 Condition」=「多个独立等待队列」，
        这就是它能分组唤醒的根本。注意 <code>await</code> 同样要在 <code>while</code> 循环里复查条件，防虚假唤醒——和 wait 一个道理。
      </p>

      <KeyIdea title="怎么选：synchronized 还是 ReentrantLock">
        <p>
          原则是「<strong>能简单就简单</strong>」。普通互斥、没有特殊需求，优先用 <code>synchronized</code>——
          它自动释放锁、不会忘解锁、JVM 还在持续优化。只有当你确实需要<strong>可中断、可超时、公平锁、
          或多个 Condition 分组等待</strong>中的某一项时，才上 <code>ReentrantLock</code>。
        </p>
      </KeyIdea>

      <h2>读写锁：读多写少的利器</h2>
      <p>
        普通互斥锁不管读还是写都互相排斥，可现实里很多数据是「读远多于写」的（比如缓存、配置）。
        <code>ReentrantReadWriteLock</code> 把锁拆成读锁和写锁，规则是：<strong>读读并发</strong>（多个线程能同时读）、
        <strong>读写互斥、写写互斥</strong>（写的时候谁都不许动）。读多写少时，读操作几乎可以全程并发，吞吐大幅提升。
      </p>

      <Example title="读多写少的缓存">
        <p>
          一个缓存，每秒上千次读、偶尔才更新一次。用 <code>synchronized</code> 的话，连「读」都要排队，浪费。
          换成读写锁：<code>get</code> 加读锁，成百上千个读线程能同时进；只有 <code>put</code> 加写锁时，
          才短暂挡住所有读和写。这正是读写锁的主战场。
        </p>
      </Example>

      <Callout variant="warn" title="写锁饥饿：读太多写不进去">
        <p>
          读写锁有个隐患：如果读线程<strong>源源不断</strong>，写线程可能永远抢不到写锁（写饥饿）。为缓解这点，
          <code>ReentrantReadWriteLock</code> 的实现里有一条规则——当队列中<strong>有写线程在等待</strong>时，
          后来的读线程不再「插队」与正在读的线程并发，而是也去排队（公平模式下尤其严格）。这保证了写线程总有机会被调度到。
          实战中如果发现写延迟很高，要警惕读侧是否把锁占太满。
        </p>
      </Callout>

      <p>
        读写锁还支持<em>锁降级</em>：一个线程在持有写锁的情况下，可以再获取读锁，然后释放写锁——
        平滑地从「写」过渡到「读」，期间数据不会被别的写线程篡改。反过来的「锁升级」（持读锁再要写锁）
        是<strong>不允许</strong>的，会死锁。为什么不允许升级？因为可能有<strong>多个</strong>读线程同时持读锁，若它们<strong>都</strong>想升级成写锁，
        就会互相等对方先释放读锁——谁也不肯让，直接死锁。降级则没有这个问题，因为写锁本就是独占的，只有一个线程能降。
      </p>
      <CodeBlock lang="java" title="锁降级标准写法" code={downgradeCode} />

      <Callout variant="warn" title="StampedLock：更进一步的乐观读">
        <p>
          JDK 8 又加了 <code>StampedLock</code>，提供<strong>乐观读</strong>：读的时候先不加锁，只拿一个戳记
          （<code>tryOptimisticRead</code>），读完再用 <code>validate</code> 检查这期间有没有人写过——
          没写过就直接用结果，连读锁的开销都省了；万一写过，再退回去加真正的读锁重读。读极多写极少时性能比
          <code>ReentrantReadWriteLock</code> 还高。代价：它<strong>不可重入、也不支持 Condition</strong>，用起来更需小心。
        </p>
        <p>
          额外的大坑：<code>StampedLock</code> 的乐观读期间，共享数据可能正被写线程改到一半，所以你<strong>必须先把字段读进局部变量、validate 通过后再用</strong>，
          中途绝不能基于这些可能不一致的值做有副作用的操作（比如解引用一个可能为 null 的引用）。这也是为什么乐观读代码总是「读快照 → validate → 用快照」三段式。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        「<code>ReentrantLock</code> vs <code>synchronized</code>」按四点答：可中断、可超时(tryLock)、可公平、
        多 Condition，但要手动 unlock（放 finally）。「读多写少用什么」答：读写锁
        <code>ReentrantReadWriteLock</code>，读读并发、写独占，还能锁降级；若读极多写极少、可进一步用
        <code>StampedLock</code> 的乐观读。能顺带说出选型原则（能 synchronized 就别上 Lock）会很加分。
      </p>

      <Practice title="二选一：读写锁缓存 或 Condition 生产者消费者">
        <p>
          先看读写锁缓存：注意 <code>get</code> 用读锁、<code>put</code> 用写锁，解锁都在 <code>finally</code>。
        </p>
        <CodeBlock lang="java" title="Cache.java" code={cacheCode} />
        <p>
          再看 <code>ReentrantLock</code> + 两个 <code>Condition</code> 实现的生产者消费者：生产者等在
          <code>notFull</code>、消费者等在 <code>notEmpty</code>，互相精准唤醒；条件判断用
          <code>while</code> 而非 <code>if</code>，防止虚假唤醒。
        </p>
        <CodeBlock lang="java" title="Buffer.java" code={condCode} />
      </Practice>

      <Summary
        points={[
          'ReentrantLock 相比 synchronized 多了：可中断、可超时(tryLock)、可公平、多个 Condition。',
          'ReentrantLock 必须手动 unlock 且要放在 finally，lock() 要在 try 外紧贴 try，否则异常时锁不释放会死锁。',
          'tryLock 抢不全就主动退锁重试，可打破死锁的「占有并等待」，是转账类场景的标准防死锁手段。',
          'Condition 的 await/signal 对应 wait/notify，每个 Condition 是一条独立等待队列，故能分组精准唤醒；await 也要用 while。',
          'ReentrantReadWriteLock：读读并发、读写互斥、写写互斥，适合读多写少；有写线程等待时读不再插队以防写饥饿。',
          '支持锁降级（持写锁→拿读锁→放写锁），不允许锁升级（多读线程同时升级会互相死等）。',
          'StampedLock（JDK8）提供乐观读，读极多写极少时更快，但不可重入、不支持 Condition，须「读快照→validate→用」。',
          '选型原则：普通互斥优先 synchronized，需要中断/超时/公平/多条件时才用 ReentrantLock。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Volatile from '@/courses/java-concurrency/illustrations/Volatile.jsx'

const flagStopCode = `public class StopDemo {
    // volatile 保证一个线程改了 running，工作线程能立刻看到
    private static volatile boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) {
                // 干活……
            }
            System.out.println('收到停止信号，优雅退出');
        });
        worker.start();

        Thread.sleep(1000);
        running = false;  // 主线程改标志，worker 会及时看到并退出循环
    }
}`

const counterCode = `// 反例：volatile 不保证原子性，count++ 仍然会丢更新
public class WrongCounter {
    private static volatile int count = 0;

    public static void main(String[] args) throws InterruptedException {
        Runnable r = () -> { for (int i = 0; i < 10000; i++) count++; };
        Thread t1 = new Thread(r), t2 = new Thread(r);
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println(count);  // 不是 20000，要原子性请用 AtomicInteger
    }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          volatile 是面试的常客，也是最容易答错的关键字。很多人脱口而出「volatile 保证线程安全」，
          一追问就翻车。它到底保证什么、不保证什么？底层靠什么实现？这一章把它彻底讲透。
        </p>
      </Lead>

      <h2>volatile 保证什么</h2>
      <p>记住这句总纲：volatile <strong>保证可见性和有序性，但不保证原子性</strong>。拆开看：</p>
      <ul>
        <li>
          <strong>可见性</strong>：对 volatile 变量的写会<strong>立即刷回主内存</strong>；读会<strong>直接从主内存读</strong>，
          而不是用工作内存里的旧副本。所以一个线程改了，别的线程下次读就能看到最新值。
        </li>
        <li>
          <strong>有序性</strong>：JVM 会在 volatile 读写前后插入<strong>内存屏障</strong>（memory barrier），
          禁止把屏障两边的指令重排过去，从而保证顺序。
        </li>
        <li>
          <strong>不保证原子性</strong>：<code>count++</code> 这种复合操作，volatile 管不了——它只保证你每次读到的是最新值，
          但「读-改-写」三步之间仍可能被别的线程插入。
        </li>
      </ul>

      <Example title="while(!flag) 死循环">
        <p>
          经典坑：一个线程跑 <code>while (!flag) {}</code> 等待，另一个线程把 <code>flag</code> 改成 true。
          如果 <code>flag</code> <strong>没加 volatile</strong>，等待线程很可能<strong>永远跳不出循环</strong>——
          因为它把 flag 缓存在工作内存里，看不到主内存的最新值；编译器甚至可能把循环优化成「永真」。
        </p>
        <p>
          给 <code>flag</code> 加上 volatile，写立刻刷回主内存、读直接读主内存，等待线程下一圈就能看到 true 并退出。
          这就是 volatile 最典型、最纯粹的用途：<strong>状态标志位</strong>。
        </p>
      </Example>

      <Volatile />

      <h2>实现原理</h2>
      <p>
        在字节码/底层层面，对 volatile 变量的写操作会带上一条 <code>lock</code> 前缀指令（在 x86 上）。这条指令做了两件事：
        把当前处理器缓存行的数据<strong>立即写回主内存</strong>，并通过缓存一致性协议<strong>让其他核的对应缓存行失效</strong>，
        逼它们重新从主内存读。这就是可见性的硬件实现。
      </p>
      <p>
        有序性则靠<em>内存屏障</em>：JMM 规定在 volatile 写之前插 StoreStore 屏障、之后插 StoreLoad 屏障，
        在 volatile 读之后插 LoadLoad/LoadStore 屏障，从而禁止特定方向的指令重排。
      </p>

      <KeyIdea title="为什么不保证原子性">
        <p>
          volatile 只保证<strong>单次读、单次写</strong>是从/到主内存的，但 <code>count++</code> 是「读 → +1 → 写」三个独立动作。
          两个线程可能都读到 5，各自 +1 算成 6，各自写回 6，丢了一次更新。volatile 让你读到的「那一刻」是最新值，
          却挡不住这三步之间的交错。要原子性，得用 <code>synchronized</code> 或 <code>AtomicInteger</code> 这类原子类。
        </p>
      </KeyIdea>

      <h2>典型用途</h2>
      <ul>
        <li>
          <strong>状态标志位</strong>：如优雅停止线程的 <code>volatile boolean running</code>。只有一个线程写、其他线程读，
          不涉及复合操作，正是 volatile 的舞台。
        </li>
        <li>
          <strong>DCL 单例的实例引用</strong>：给 <code>instance</code> 加 volatile，禁止 new 对象时的指令重排，
          避免别的线程拿到半成品对象（见上一章）。
        </li>
      </ul>

      <h2>实战/面试怎么答</h2>
      <p>
        被问「volatile 和 synchronized 的区别」，按这几点对比：volatile 是<strong>轻量级</strong>的，只保证可见性和有序性、
        不保证原子性、不会阻塞线程；synchronized 是<strong>重量级</strong>的（会引入锁竞争与阻塞），三者全保证、能互斥。
        volatile 只能修饰变量，synchronized 能修饰方法和代码块。一句话定调：<strong>volatile 适合「一写多读」的状态同步，
        需要原子的复合操作就上 synchronized 或原子类</strong>。
      </p>

      <Callout variant="warn" title="别拿 volatile 当锁用">
        <p>
          只要存在「读出来再基于它修改」的复合操作（计数、累加、判断后赋值），volatile 就靠不住。这是面试最爱挖的坑：
          看到 <code>volatile int count</code> 配 <code>count++</code>，直接判定有并发 bug。
        </p>
      </Callout>

      <Practice title="标志位优雅停止 vs 自增反例">
        <p>正面用法：用 volatile 标志位让工作线程优雅退出，改了立刻可见：</p>
        <CodeBlock lang="java" title="StopDemo.java" code={flagStopCode} />
        <p>反面教材：volatile 救不了 count++，结果几乎永远不是 20000：</p>
        <CodeBlock lang="java" title="WrongCounter.java" code={counterCode} />
      </Practice>

      <Summary
        points={[
          'volatile 保证可见性和有序性，但不保证原子性——这是答题总纲。',
          '可见性：写立即刷回主内存，读直接读主内存；底层靠 lock 前缀指令 + 缓存一致性让别的缓存失效。',
          '有序性：通过插入内存屏障禁止指令重排。',
          '不保证原子性：count++ 是读-改-写三步，volatile 挡不住交错，要用 synchronized 或 AtomicInteger。',
          '典型用途：一写多读的状态标志位（优雅停止线程）、DCL 单例的实例引用。',
          'vs synchronized：volatile 轻量、只管可见性与有序性、不阻塞、只修饰变量；synchronized 三者全保证、能互斥。',
        ]}
      />
    </>
  )
}

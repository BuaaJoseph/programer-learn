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

const piggybackCode = `// volatile 的「写屏障」效应：被它保护的不止它自己
class Config {
    private int timeout;        // 普通字段
    private String url;         // 普通字段
    private volatile boolean initialized = false;

    void init() {
        timeout = 3000;         // 1
        url = "http://api";     // 2
        initialized = true;     // 3 volatile 写：StoreStore 屏障保证 1、2 不重排到它后面
    }

    void use() {
        // 一旦看到 initialized==true，timeout 和 url 必然已是初始化后的值
        if (initialized) {
            System.out.println(url + " " + timeout);
        }
    }
}`

const longCode = `// 64 位的 long/double 在 JMM 里允许「非原子读写」（拆成两个 32 位）
// 极端情况下可能读到「高 32 位是新值、低 32 位是旧值」的撕裂值
public class LongTearing {
    static long value = 0L;          // 没加 volatile：32 位平台理论上可能撕裂
    // static volatile long value;   // 加上 volatile 后，long/double 的读写一定原子
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
      <Callout variant="info" title="一个例外：volatile 让 long/double 读写原子">
        <p>
          JMM 规定，对 64 位的 <code>long</code>/<code>double</code> 的读写<strong>允许</strong>被拆成两次 32 位操作（非原子）。
          在 32 位平台上，理论上可能出现「读到一半」的<strong>撕裂值</strong>（高 32 位是新的、低 32 位还是旧的）。
          给它加上 <code>volatile</code>，JMM 就强制保证读写的原子性。这是 volatile「不保证原子性」总纲下唯一的例外——
          它保证的是<strong>单次读、单次写</strong>本身的原子，而不是 <code>i++</code> 这种复合操作。
        </p>
        <CodeBlock lang="java" title="LongTearing.java" code={longCode} />
      </Callout>

      <Example title="while(!flag) 死循环">
        <p>
          经典坑：一个线程跑 <code>while (!flag) {'{}'}</code> 等待，另一个线程把 <code>flag</code> 改成 true。
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
      <Callout variant="info" title="MESI 与 lock 前缀的关系">
        <p>
          很多人把 volatile 直接等同于「MESI 缓存一致性协议」，不够准确。MESI 是<strong>硬件层面</strong>各核缓存保持一致的协议，它一直在工作。
          问题在于：CPU 为了不被 MESI 的「失效确认」拖慢，引入了<strong>写缓冲区（store buffer）</strong>和<strong>失效队列（invalidate queue）</strong>，
          写操作先丢进缓冲区就返回，于是又出现了「写了但别的核没立刻看到」的窗口。<code>lock</code> 前缀（以及内存屏障）的作用就是<strong>强制排空写缓冲、等待失效确认</strong>，
          把这个窗口关掉。所以 MESI 保证「最终一致」，volatile 的屏障保证「<strong>立即</strong>一致」，两者层次不同。
        </p>
      </Callout>

      <KeyIdea title="为什么不保证原子性">
        <p>
          volatile 只保证<strong>单次读、单次写</strong>是从/到主内存的，但 <code>count++</code> 是「读 → +1 → 写」三个独立动作。
          两个线程可能都读到 5，各自 +1 算成 6，各自写回 6，丢了一次更新。volatile 让你读到的「那一刻」是最新值，
          却挡不住这三步之间的交错。要原子性，得用 <code>synchronized</code> 或 <code>AtomicInteger</code> 这类原子类。
        </p>
      </KeyIdea>

      <h2>搭便车效应：volatile 保护的不止它自己</h2>
      <p>
        一个进阶但极其有用的认知：volatile 写的那道<strong>StoreStore 屏障</strong>会保证「写 volatile <strong>之前</strong>的所有普通写」不会被重排到它后面，
        而读 volatile 又能看到这些写。结果就是——你可以用一个 volatile「门闩」字段，<strong>顺带把它前面写的一堆普通字段也安全发布</strong>出去。
        这正是很多框架做「初始化完成标志」的套路：把对象的所有字段写好，最后一步翻转一个 volatile 的 <code>initialized</code>，读者只要看到这个 true，
        前面所有字段就都是可见且初始化完成的。
      </p>
      <CodeBlock lang="java" title="搭便车发布" code={piggybackCode} />

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
        <li>
          <strong>一次性安全发布</strong>：配置加载完、缓存预热完后翻转一个 volatile 完成标志，利用搭便车效应发布前面的普通字段。
        </li>
      </ul>

      <h2>实战/面试怎么答</h2>
      <p>
        被问「volatile 和 synchronized 的区别」，按这几点对比：volatile 是<strong>轻量级</strong>的，只保证可见性和有序性、
        不保证原子性、不会阻塞线程；synchronized 是<strong>重量级</strong>的（会引入锁竞争与阻塞），三者全保证、能互斥。
        volatile 只能修饰变量，synchronized 能修饰方法和代码块。一句话定调：<strong>volatile 适合「一写多读」的状态同步，
        需要原子的复合操作就上 synchronized 或原子类</strong>。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>volatile</th><th>synchronized</th></tr>
        </thead>
        <tbody>
          <tr><td>可见性</td><td>保证</td><td>保证</td></tr>
          <tr><td>有序性</td><td>保证</td><td>保证</td></tr>
          <tr><td>原子性</td><td>仅单次读/写</td><td>整个临界区</td></tr>
          <tr><td>是否阻塞</td><td>不阻塞</td><td>抢不到锁会阻塞</td></tr>
          <tr><td>修饰对象</td><td>只能变量</td><td>方法 / 代码块</td></tr>
          <tr><td>典型场景</td><td>一写多读的标志</td><td>复合操作的互斥</td></tr>
        </tbody>
      </table>

      <Callout variant="warn" title="别拿 volatile 当锁用">
        <p>
          只要存在「读出来再基于它修改」的复合操作（计数、累加、判断后赋值），volatile 就靠不住。这是面试最爱挖的坑：
          看到 <code>volatile int count</code> 配 <code>count++</code>，直接判定有并发 bug。
        </p>
        <p>
          还有一个真实线上案例：用 <code>volatile List</code> 当「线程安全的集合」。注意——volatile 只保证<strong>引用本身</strong>的可见性
          （你换了一个新 List 别人能看到），但<strong>对 List 内部元素的增删改完全不受保护</strong>。多个线程同时 <code>list.add()</code> 照样会丢数据、抛
          <code>ArrayIndexOutOfBoundsException</code>。要线程安全的集合得用 <code>CopyOnWriteArrayList</code> 或 <code>Collections.synchronizedList</code>。
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
          'volatile 保证可见性和有序性，但不保证原子性——这是答题总纲；唯一例外是让 long/double 的单次读写原子。',
          '可见性：写立即刷回主内存，读直接读主内存；底层靠 lock 前缀指令 + 缓存一致性让别的缓存失效。',
          'MESI 保证最终一致，volatile 的屏障靠排空写缓冲/失效队列保证立即一致，两者层次不同。',
          '有序性：通过插入内存屏障禁止指令重排。',
          '不保证原子性：count++ 是读-改-写三步，volatile 挡不住交错，要用 synchronized 或 AtomicInteger。',
          '搭便车效应：volatile 写的 StoreStore 屏障可顺带安全发布它前面写的普通字段，是「初始化完成标志」的原理。',
          '典型用途：一写多读的状态标志位（优雅停止线程）、DCL 单例的实例引用、一次性安全发布。',
          'vs synchronized：volatile 轻量、只管可见性与有序性、不阻塞、只修饰变量；synchronized 三者全保证、能互斥；volatile List 不保护元素操作。',
        ]}
      />
    </>
  )
}

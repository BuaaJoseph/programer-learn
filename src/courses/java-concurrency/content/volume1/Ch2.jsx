import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const incrCode = `// i++ 看着是一行，其实是三步：读、加、写
// 1. 从主内存读 i 到工作内存
// 2. i + 1
// 3. 把结果写回
// 多线程下这三步会交错，导致丢更新
public class NotAtomic {
    static int i = 0;
    public static void main(String[] args) throws InterruptedException {
        Runnable r = () -> { for (int k = 0; k < 10000; k++) i++; };
        Thread t1 = new Thread(r), t2 = new Thread(r);
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println(i);  // 几乎永远不是 20000
    }
}`

const dclCode = `public class Singleton {
    // volatile 不可省：禁止 new 的指令重排，避免拿到未初始化完成的对象
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查：没锁，避免每次都加锁
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查：拿到锁后再确认一次
                    instance = new Singleton(); // 这一步不是原子的，分三个子步骤
                }
            }
        }
        return instance;
    }
}`

const visibilityCode = `// 经典可见性 bug：没有 volatile，循环可能永远停不下来
public class VisibilityBug {
    // 去掉 volatile，工作线程可能永远看不到 flag 被改成 false
    private static /* volatile */ boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (running) { /* 空转，JIT 可能把它优化成 while(true) */ }
            System.out.println("停下来了");
        }).start();

        Thread.sleep(1000);
        running = false;   // 主线程改了，工作线程不一定看得到
        System.out.println("已请求停止");
    }
}`

const happensBeforeCode = `// volatile 的「搭便车」效应：写 volatile 前的普通写，对读到该 volatile 的线程也可见
class Holder {
    int data;                 // 普通变量
    volatile boolean ready;   // volatile

    // 线程 A
    void publish() {
        data = 42;            // 1. 普通写
        ready = true;         // 2. volatile 写（内存屏障，1 不能重排到它后面）
    }

    // 线程 B
    void read() {
        if (ready) {          // 3. volatile 读
            // 一旦读到 ready == true，data 一定是 42（happens-before 传递）
            System.out.println(data);
        }
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          为什么多线程程序会出各种诡异的 bug：明明改了变量别的线程却看不到？代码明明按顺序写的却像被打乱了执行？
          这一切的根源，都要从 Java 内存模型 <em>JMM</em> 说起。它是理解 volatile、synchronized 的总纲。
        </p>
      </Lead>

      <h2>什么是 JMM</h2>
      <p>
        <em>Java 内存模型</em>（Java Memory Model，JMM）是一套规范，它定义了多线程下变量的读写规则。在 JMM 的抽象里，
        所有共享变量都存在<strong>主内存</strong>（main memory）中，而<strong>每个线程有自己的工作内存</strong>
        （working memory，对应 CPU 缓存/寄存器）。
      </p>
      <p>
        线程不能直接读写主内存，只能操作自己工作内存里的<strong>副本</strong>：先把变量拷贝到工作内存，改完再某个时刻写回主内存。
        问题就出在这里——一个线程改了自己的副本，还没写回，或者别的线程没及时同步，就会读到旧值。
      </p>
      <Callout variant="info" title="JMM 是抽象，不是物理结构">
        <p>
          要分清：「主内存 / 工作内存」是 JMM 的<strong>抽象概念</strong>，不是真实存在的两块内存。它对应的物理实体是「内存 vs CPU 寄存器/各级缓存/写缓冲区」。
          JMM 之所以做这层抽象，是为了<strong>屏蔽硬件差异</strong>——x86、ARM 的内存一致性模型强弱不同，JMM 给 Java 程序员一套统一的、跨平台一致的语义保证，
          让你写一次并发代码，在任何 CPU 上行为都符合规范。这正是「Write Once, Run Anywhere」在并发语义上的延伸。
        </p>
      </Callout>

      <h2>并发的三大问题</h2>
      <p>JMM 要解决的，归根结底是三个问题：</p>
      <ul>
        <li>
          <strong>可见性</strong>（visibility）：一个线程改了共享变量，<strong>别的线程看不到</strong>。因为改动还停在它的工作内存里。
        </li>
        <li>
          <strong>有序性</strong>（ordering）：为了优化性能，编译器和 CPU 会对指令<strong>重排序</strong>，
          导致代码的实际执行顺序和你写的顺序不一致。
        </li>
        <li>
          <strong>原子性</strong>（atomicity）：一个操作要么全做完、要么不做，中间<strong>不能被打断</strong>。
          而像 <code>i++</code> 这种看似一步的操作其实会被打断。
        </li>
      </ul>
      <p>
        厘清三者的「武器配对」很重要，这是面试高频追问：
      </p>
      <table>
        <thead>
          <tr><th>问题</th><th>synchronized</th><th>volatile</th><th>final</th><th>原子类(CAS)</th></tr>
        </thead>
        <tbody>
          <tr><td>可见性</td><td>保证</td><td>保证</td><td>保证(正确发布)</td><td>保证</td></tr>
          <tr><td>有序性</td><td>保证</td><td>保证</td><td>部分(构造内)</td><td>保证</td></tr>
          <tr><td>原子性</td><td>保证</td><td><strong>不保证</strong></td><td>—</td><td>保证(单变量)</td></tr>
        </tbody>
      </table>
      <p>
        看这张表能立刻破解一个经典误区：<strong>volatile 不保证原子性</strong>。所以 <code>volatile int i; i++;</code> 在多线程下照样会丢更新——
        volatile 只保证你每次读到的是最新值、写完立刻可见，但「读-改-写」这三步之间还是会被别的线程插队。要原子地自增，得用
        <code>synchronized</code> 或 <code>AtomicInteger</code>。
      </p>

      <Callout variant="warn" title="问题从哪来：缓存 + 重排">
        <p>
          可见性问题的根源是 <strong>CPU 多级缓存</strong>：每个核有自己的缓存，改了不一定立刻同步给别的核。
          有序性问题的根源是 <strong>编译器和 CPU 的重排序优化</strong>：在不改变单线程结果的前提下，它们会调整指令顺序以提速。
          这两个优化在单线程下毫无问题，一到多线程就出事。
        </p>
      </Callout>

      <h2>可见性 bug 实例</h2>
      <p>
        最经典的可见性 bug 是「靠一个普通 boolean 控制线程停止，结果停不下来」。工作线程把 <code>running</code> 读进了寄存器，
        JIT 编译器进一步把热循环优化成「读一次、永远用」，主线程改了主内存里的 <code>running</code>，工作线程压根不再回主内存看，
        于是死循环。给变量加 <code>volatile</code>，强制每次读主内存、写立即刷回，问题消失。
      </p>
      <CodeBlock lang="java" title="VisibilityBug.java" code={visibilityCode} />
      <p>
        实战教训：任何「一个线程设置标志、另一个线程轮询标志」的场景，标志位<strong>必须 volatile</strong>。线上见过太多「优雅停机开关」
        因为漏了 volatile 而在生产偶发失效，且本地几乎复现不出来（debug 模式、负载低时 JIT 不激进优化，反而表现正常，更具迷惑性）。
      </p>

      <Example title="i++ 非原子 & DCL 为什么需要 volatile">
        <p>
          <strong>i++ 不是原子操作</strong>：它实际是「读 i → 算 i+1 → 写回 i」三步。两个线程同时读到 i=5，各自算成 6，
          各自写回 6——本该是 7，结果丢了一次更新。这就是原子性被破坏。
        </p>
        <p>
          <strong>双重检查锁（DCL）需要 volatile</strong>：<code>instance = new Singleton()</code> 也不是原子的，它分三步：
          分配内存、调用构造方法初始化、把引用指向内存。第 2、3 步可能被<strong>重排</strong>成「先指向内存、再初始化」。
          一旦重排，另一个线程在第一次检查时看到 <code>instance != null</code>，就会拿到一个<strong>还没初始化完</strong>的半成品对象。
          加上 volatile 禁止这种重排，问题才消失。
        </p>
      </Example>

      <h2>happens-before 原则</h2>
      <p>
        JMM 不可能枚举所有重排规则，于是用 <em>happens-before</em> 给程序员一个简单的承诺：如果操作 A
        happens-before 操作 B，那么 A 的结果对 B <strong>一定可见</strong>，且 A 在 B 之前执行的效果有保证。
        常考的几条规则：
      </p>
      <ul>
        <li><strong>程序顺序规则</strong>：同一线程内，前面的操作 happens-before 后面的操作。</li>
        <li><strong>锁规则</strong>：对一个锁的解锁 happens-before 后续对它的加锁。</li>
        <li><strong>volatile 规则</strong>：对 volatile 变量的写 happens-before 后续对它的读。</li>
        <li><strong>传递性</strong>：A happens-before B，B happens-before C，则 A happens-before C。</li>
        <li><strong>线程启动/结束规则</strong>：<code>start()</code> happens-before 新线程的所有操作；线程的所有操作 happens-before 别的线程从 <code>join()</code> 返回。</li>
        <li><strong>中断规则</strong>：对线程 <code>interrupt()</code> 的调用 happens-before 被中断线程检测到中断。</li>
        <li><strong>对象终结规则</strong>：对象构造完成 happens-before 它的 <code>finalize()</code> 开始。</li>
      </ul>
      <p>
        关键要理解：happens-before <strong>不是说 A 一定在时间上先于 B 执行</strong>，而是说「如果 B 看到了 A 的某些效果，那么 A 的<strong>全部</strong>效果对 B 都可见」。
        最有用的是把<strong>传递性</strong>和 volatile/锁规则串起来用——这就是下面的「搭便车」效应。
      </p>
      <CodeBlock lang="java" title="happens-before 搭便车" code={happensBeforeCode} />
      <p>
        上面代码里 <code>data</code> 是普通变量，本来没有可见性保证。但因为 <code>data = 42</code>（程序顺序）happens-before <code>ready = true</code>（volatile 写），
        而 volatile 写 happens-before <code>读到 ready==true</code>，再 happens-before 读 <code>data</code>——传递下来，<strong>只要读到 ready 是 true，data 必然已是 42</strong>。
        这就是「<strong>正确发布</strong>」对象的核心套路：用一个 volatile/final 字段当「门闩」，门闩之前写好的所有普通字段都会安全地暴露给读到门闩的线程。
      </p>

      <KeyIdea title="as-if-serial 与 happens-before">
        <p>
          <strong>as-if-serial</strong> 是给<strong>单线程</strong>的承诺：不管底层怎么重排，单线程的执行结果不能变，
          所以单线程下你感觉不到重排。<strong>happens-before</strong> 是给<strong>多线程</strong>的承诺：
          告诉你在什么情况下，一个线程的写对另一个线程的读是可见且有序的。一个管单线程语义、一个管跨线程可见性，配合使用。
        </p>
      </KeyIdea>

      <h2>内存屏障：volatile 的底层实现</h2>
      <p>
        happens-before 是规范层的「承诺」，落到实现层靠的是<strong>内存屏障</strong>（memory barrier / fence）。编译器在
        volatile 写之前插 <code>StoreStore</code> 屏障、之后插 <code>StoreLoad</code> 屏障，在 volatile 读之后插 <code>LoadLoad</code>/<code>LoadStore</code> 屏障。
        屏障的作用有二：<strong>禁止屏障两侧的特定重排</strong>，以及<strong>强制把写缓冲刷回主内存、让缓存失效后重新加载</strong>。
        其中 <code>StoreLoad</code> 屏障开销最大（要把写缓冲全部排空），这也是为什么 volatile 写比读贵、滥用 volatile 也有性能代价的原因。
      </p>

      <h2>实战/面试怎么答</h2>
      <p>
        被问到「JMM 是什么」时，别背定义，按这条线讲：JMM 抽象出主内存 + 工作内存的模型 → 由此引出可见性、有序性、原子性三大问题
        → 问题根源是 CPU 缓存和指令重排 → JMM 用 happens-before 规则给出可见性与有序性的保证 → 底层靠内存屏障落地 → 我们用 volatile/synchronized
        来满足这些规则。这样一条逻辑链下来，面试官会觉得你是真懂，而不是背的。
      </p>
      <Callout variant="info" title="高频追问：volatile 能替代锁吗">
        <p>
          不能，要看场景。volatile 适合「<strong>一写多读</strong>、且写操作不依赖当前值」的场景（典型：状态标志位、配置开关、DCL 的实例引用）。
          一旦写操作依赖旧值（如 <code>count++</code>），或者要保证多个变量的<strong>复合操作</strong>原子，volatile 就无能为力，必须上 synchronized / Lock / 原子类。
          一句话：volatile 解决的是<strong>可见性和有序性</strong>，不解决<strong>原子性</strong>。
        </p>
      </Callout>

      <Practice title="用 volatile 修好 DCL 单例">
        <p>先直观感受 i++ 的非原子性，跑出来几乎永远不是 20000：</p>
        <CodeBlock lang="java" title="NotAtomic.java" code={incrCode} />
        <p>
          再看双重检查锁单例的标准写法。重点理解那个 <code>volatile</code> 为什么<strong>不能删</strong>：
        </p>
        <CodeBlock lang="java" title="Singleton.java" code={dclCode} />
      </Practice>

      <Summary
        points={[
          'JMM 抽象出主内存 + 每线程工作内存：线程只操作变量副本，改完才写回，这是一切问题的根源；它是抽象规范，屏蔽硬件差异。',
          '并发三大问题：可见性（改了别人看不到）、有序性（指令重排）、原子性（操作被打断）。',
          'volatile 保证可见性+有序性但不保证原子性，所以 volatile int 的 i++ 照样丢更新；要原子用 synchronized/原子类。',
          'i++ 不是原子操作（读-改-写三步）；new 对象也不是原子的，会被重排成半成品。',
          'happens-before 是跨线程的可见性+有序性承诺：程序顺序、锁、volatile、传递性、线程启动/结束、中断等规则。',
          '利用 happens-before 传递性可做「正确发布」：volatile/final 字段当门闩，门闩前的普通写对读到门闩的线程可见。',
          'as-if-serial 保证单线程结果不变，happens-before 保证跨线程可见；底层都由内存屏障实现，StoreLoad 最贵。',
          'DCL 单例必须给 instance 加 volatile，禁止 new 的指令重排，否则可能拿到未初始化完成的对象。',
        ]}
      />
    </>
  )
}

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

      <Callout variant="warn" title="问题从哪来：缓存 + 重排">
        <p>
          可见性问题的根源是 <strong>CPU 多级缓存</strong>：每个核有自己的缓存，改了不一定立刻同步给别的核。
          有序性问题的根源是 <strong>编译器和 CPU 的重排序优化</strong>：在不改变单线程结果的前提下，它们会调整指令顺序以提速。
          这两个优化在单线程下毫无问题，一到多线程就出事。
        </p>
      </Callout>

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
      </ul>

      <KeyIdea title="as-if-serial 与 happens-before">
        <p>
          <strong>as-if-serial</strong> 是给<strong>单线程</strong>的承诺：不管底层怎么重排，单线程的执行结果不能变，
          所以单线程下你感觉不到重排。<strong>happens-before</strong> 是给<strong>多线程</strong>的承诺：
          告诉你在什么情况下，一个线程的写对另一个线程的读是可见且有序的。一个管单线程语义、一个管跨线程可见性，配合使用。
        </p>
      </KeyIdea>

      <h2>实战/面试怎么答</h2>
      <p>
        被问到「JMM 是什么」时，别背定义，按这条线讲：JMM 抽象出主内存 + 工作内存的模型 → 由此引出可见性、有序性、原子性三大问题
        → 问题根源是 CPU 缓存和指令重排 → JMM 用 happens-before 规则给出可见性与有序性的保证 → 我们用 volatile/synchronized
        来满足这些规则。这样一条逻辑链下来，面试官会觉得你是真懂，而不是背的。
      </p>

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
          'JMM 抽象出主内存 + 每线程工作内存：线程只操作变量副本，改完才写回，这是一切问题的根源。',
          '并发三大问题：可见性（改了别人看不到）、有序性（指令重排）、原子性（操作被打断）。',
          'i++ 不是原子操作（读-改-写三步）；new 对象也不是原子的，会被重排成半成品。',
          'happens-before 是跨线程的可见性+有序性承诺：程序顺序、锁、volatile、传递性、线程启动/结束等规则。',
          'as-if-serial 保证单线程结果不变（管单线程），happens-before 保证跨线程可见（管多线程），二者配合。',
          'DCL 单例必须给 instance 加 volatile，禁止 new 的指令重排，否则可能拿到未初始化完成的对象。',
        ]}
      />
    </>
  )
}

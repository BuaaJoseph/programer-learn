import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const serializeSnippet = `import java.io.*;

// 实现 Serializable（标记接口）才能被序列化
class User implements Serializable {
    private static final long serialVersionUID = 1L;  // 版本号，强烈建议显式声明
    String name;
    transient String password;   // transient：该字段不参与序列化
    static int count;            // static 字段不属于对象，也不序列化
}

// 写出（序列化）
try (var out = new ObjectOutputStream(new FileOutputStream("u.dat"))) {
    out.writeObject(new User());
}
// 读回（反序列化）
try (var in = new ObjectInputStream(new FileInputStream("u.dat"))) {
    User u = (User) in.readObject();
}`

const threadStartSnippet = `Thread t = new Thread(() -> System.out.println("run"));
t.start();      // 第一次：合法，启动新线程
t.start();      // 第二次：抛 IllegalThreadStateException！

// 原因：start() 内部检查线程状态，线程一旦从 NEW 进入其它状态就不能再 start。
// 想再跑一次，必须 new 一个新的 Thread 对象。
// 注意：直接调 t.run() 不会启动新线程，只是在当前线程里普通调用该方法。`

const execSnippet = `// 调用外部程序 / 系统命令：用 ProcessBuilder（比 Runtime.exec 更可控）
ProcessBuilder pb = new ProcessBuilder("ping", "-c", "2", "example.com");
pb.redirectErrorStream(true);            // 合并错误流到标准输出
Process p = pb.start();
try (var reader = new BufferedReader(
        new InputStreamReader(p.getInputStream()))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);        // 必须读走输出，否则缓冲区满会卡死
    }
}
int code = p.waitFor();                  // 等待进程结束，拿退出码`

const waitSleepSnippet = `// wait：释放锁，必须在 synchronized 块内，靠 notify 唤醒，属于 Object
synchronized (lock) {
    while (!condition) {
        lock.wait();       // 释放 lock，让出锁，进入等待
    }
}
synchronized (lock) {
    condition = true;
    lock.notify();         // 唤醒在 lock 上等待的线程
}

// sleep：不释放锁，定时自动醒，属于 Thread 静态方法
Thread.sleep(1000);        // 当前线程睡 1 秒，期间持有的锁不释放`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章扫一遍高频「杂项」考点：序列化与反序列化的机制和坑、为什么线程不能两次调用 <code>start()</code>、
        如何在 Java 里调用外部程序或系统命令、以及 <code>wait</code> 与 <code>sleep</code> 的本质区别。
        这些题单独看都不难，但细节多、易答错，正好是拉开差距的地方。
      </Lead>

      <h2>一、序列化与反序列化</h2>
      <KeyIdea>
        序列化（Serialization）是把对象转成<strong>字节序列</strong>以便存储或网络传输；
        反序列化是反过来把字节序列重建成对象。要支持序列化，类必须实现标记接口 <code>Serializable</code>。
        它让对象能「跨进程、跨网络、跨时间」地保存与恢复。
      </KeyIdea>
      <CodeBlock lang="java" title="序列化的基本用法与关键字" code={serializeSnippet} />

      <h3>面试题 1：序列化要注意什么？</h3>
      <table>
        <thead>
          <tr><th>要点</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Serializable</code></td><td>标记接口，无方法，实现它才允许被序列化</td></tr>
          <tr><td><code>serialVersionUID</code></td><td>版本号，类结构变了若 UID 对不上会抛 InvalidClassException；应显式声明</td></tr>
          <tr><td><code>transient</code></td><td>修饰的字段不参与序列化（如密码、临时缓存）</td></tr>
          <tr><td><code>static</code> 字段</td><td>属于类不属于对象，不会被序列化</td></tr>
          <tr><td>引用字段</td><td>必须也可序列化，否则抛 NotSerializableException</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="为什么要显式声明 serialVersionUID？">
        不写的话，JVM 会根据类结构<strong>自动算</strong>一个 UID。一旦类改了字段/方法，UID 就变，
        反序列化旧数据会抛 <code>InvalidClassException</code>。显式写死一个 UID，能让类做兼容性演进时仍能反序列化老数据。
      </Callout>
      <Callout variant="warn" title="安全风险：反序列化漏洞">
        反序列化会根据字节流重建对象、调用其逻辑，攻击者可构造恶意字节流触发危险代码（著名的反序列化 RCE 漏洞）。
        所以<strong>绝不要反序列化不可信来源的数据</strong>；生产中也常用 JSON / Protobuf 等更安全可控的格式替代原生 Java 序列化。
      </Callout>

      <h2>二、线程两次 start()</h2>
      <h3>面试题 2：为什么一个线程不能两次调用 start()？</h3>
      <p>
        因为 <code>start()</code> 只对处于 <strong>NEW（新建）</strong>状态的线程有效。
        线程一旦 start，状态就从 NEW 转走（RUNNABLE 等），再调 <code>start()</code> 会被状态检查拦下，
        抛 <code>IllegalThreadStateException</code>。线程对象的生命周期是<strong>一次性</strong>的，跑完即终结，不能重启。
      </p>
      <CodeBlock lang="java" title="两次 start 抛异常" code={threadStartSnippet} />
      <Callout variant="note" title="start() 和 run() 的区别别搞混">
        <code>start()</code> 才会真正<strong>启动一个新线程</strong>并由它执行 run；
        直接调 <code>run()</code> 只是<strong>在当前线程里</strong>普通方法调用，不会有新线程。
        想复用「执行单元」，正确做法是用<strong>线程池</strong>提交任务，而不是反复 start 同一个 Thread。
      </Callout>
      <Example title="想再执行一次怎么办？">
        <p>
          线程对象用完即弃，要再跑一遍逻辑，就 <code>new</code> 一个新 Thread。
          但频繁创建/销毁线程开销大，工程上应该用 <code>ExecutorService</code> 线程池，
          把「任务」（Runnable）和「执行线程」解耦——线程被复用，任务可以提交无数次。这才是正确姿势。
        </p>
      </Example>

      <h2>三、调用外部程序 / 系统命令</h2>
      <h3>面试题 3：Java 怎么调用外部程序或执行系统命令？</h3>
      <p>
        两种方式：老的 <code>Runtime.getRuntime().exec(...)</code> 和更推荐的 <code>ProcessBuilder</code>。
        后者能更好地控制参数、工作目录、环境变量和输入输出流。
      </p>
      <CodeBlock lang="java" title="用 ProcessBuilder 执行系统命令" code={execSnippet} />
      <Callout variant="warn" title="易踩的两个坑">
        其一，<strong>必须及时读走子进程的输出流</strong>：子进程的 stdout/stderr 缓冲区满了而没人读，
        子进程会阻塞，主程序也跟着卡死（经典死锁）。其二，<strong>命令拼接有注入风险</strong>：
        别把用户输入直接拼进命令字符串，应把命令和参数分开传给 ProcessBuilder 的参数列表，避免命令注入。
      </Callout>

      <h2>四、wait vs sleep</h2>
      <h3>面试题 4：wait 和 sleep 有什么区别？</h3>
      <KeyIdea>
        最核心的区别是<strong>锁</strong>：<code>wait()</code> 会<strong>释放</strong>它持有的对象锁，让别的线程能拿锁；
        <code>sleep()</code> <strong>不释放</strong>任何锁，只是让当前线程暂停一段时间。
        前者是 Object 的方法、用于线程协作；后者是 Thread 的静态方法、用于定时暂停。
      </KeyIdea>
      <CodeBlock lang="java" title="wait 与 sleep 的用法" code={waitSleepSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>wait()</th><th>sleep()</th></tr>
        </thead>
        <tbody>
          <tr><td>所属</td><td>Object 实例方法</td><td>Thread 静态方法</td></tr>
          <tr><td>是否释放锁</td><td>释放对象锁</td><td>不释放</td></tr>
          <tr><td>调用前提</td><td>必须在 synchronized 块/方法内</td><td>任意位置</td></tr>
          <tr><td>唤醒方式</td><td>靠 notify/notifyAll 或超时</td><td>到时自动醒</td></tr>
          <tr><td>用途</td><td>线程间协作/条件等待</td><td>定时暂停</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="wait 一定要放在循环里判断条件">
        要在 <code>while (条件不满足) wait()</code> 而不是 <code>if</code> 里调用 wait，
        以防「虚假唤醒（spurious wakeup）」——线程可能在条件未满足时被唤醒。用 while 重新检查条件才安全。
        另外 wait/notify 必须持有该对象的锁才能调用，否则抛 <code>IllegalMonitorStateException</code>。
      </Callout>
      <Callout variant="tip" title="面试追问：为什么 wait 在 Object 而 sleep 在 Thread？">
        因为 wait/notify 是基于<strong>对象监视器锁</strong>的协作，锁加在任意对象上，所以放在所有对象的祖先 Object 里；
        而 sleep 只是让<strong>当前线程</strong>暂停，与具体对象无关，自然是 Thread 的静态方法。这个对比能体现你理解了它们的本质。
      </Callout>

      <h3>面试题 5：notify 和 notifyAll 有什么区别？</h3>
      <p>
        两者都用来唤醒在对象上等待的线程，区别在唤醒<strong>几个</strong>：<code>notify()</code> 随机唤醒
        <strong>一个</strong>等待线程；<code>notifyAll()</code> 唤醒<strong>所有</strong>等待线程，让它们重新竞争锁。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>notify</th><th>notifyAll</th></tr>
        </thead>
        <tbody>
          <tr><td>唤醒数量</td><td>任意一个</td><td>全部</td></tr>
          <tr><td>风险</td><td>可能唤醒「不该被唤醒」的线程，导致信号丢失/死锁</td><td>更安全，但有惊群开销</td></tr>
          <tr><td>建议</td><td>明确只需唤醒一个且条件单一时</td><td>多数场景的稳妥选择</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="为什么通常推荐 notifyAll？">
        如果有多种等待条件共用一把锁，<code>notify</code> 可能恰好唤醒了一个「条件还不满足」的线程，
        它检查后又继续 wait，而真正该被唤醒的线程却没被叫醒，造成<strong>信号丢失甚至死锁</strong>。
        <code>notifyAll</code> 唤醒全部、让大家重新检查条件（配合 while 循环），更不容易出错。
        当然，现代并发更推荐用 <code>java.util.concurrent</code> 的高级工具（如 Condition、BlockingQueue）替代裸 wait/notify。
      </Callout>

      <h3>面试题 6：序列化时如何控制哪些字段不被持久化？</h3>
      <p>
        除了前面提到的 <code>transient</code> 和 <code>static</code> 字段不参与序列化，还有几种更精细的控制手段：
      </p>
      <ul>
        <li><strong>transient 关键字</strong>：最直接，标记的字段序列化时被跳过（如密码、临时缓存、大对象引用）。</li>
        <li><strong>自定义 writeObject/readObject</strong>：在类里实现这两个私有方法，完全掌控序列化/反序列化逻辑（如对敏感字段加密后再写）。</li>
        <li><strong>Externalizable 接口</strong>：比 Serializable 更彻底，由你手动实现 <code>writeExternal</code>/<code>readExternal</code>，决定每个字段怎么读写。</li>
      </ul>
      <Callout variant="tip" title="transient 字段反序列化后是什么值？">
        被 <code>transient</code> 修饰的字段不会被写入字节流，所以反序列化重建对象时，它们会是<strong>默认值</strong>
        （对象为 null、int 为 0）。如果这些字段需要值，得在 <code>readObject</code> 里手动重新计算/赋值。
        这是个容易忽略的细节——以为加了 transient 就万事大吉，结果反序列化后该字段莫名其妙是 null。
      </Callout>

      <h3>面试题 7：创建线程有哪几种方式？</h3>
      <p>
        承接 start 这道题，把「怎么创建线程」也理一遍。主流有四种方式：
      </p>
      <table>
        <thead>
          <tr><th>方式</th><th>做法</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>继承 Thread</td><td>重写 run，new 后 start</td><td>简单，但占用唯一继承名额</td></tr>
          <tr><td>实现 Runnable</td><td>实现 run，交给 Thread 执行</td><td>推荐，任务与线程解耦，无返回值</td></tr>
          <tr><td>实现 Callable + Future</td><td>call 有返回值，配 FutureTask</td><td>能拿返回值、能抛异常</td></tr>
          <tr><td>线程池 ExecutorService</td><td>submit 提交任务</td><td>生产首选，复用线程、可控</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="本质上只有一种：实现 Runnable/Callable">
        严格说，「继承 Thread」也是重写它的 run，而 Thread 本身就实现了 Runnable。
        所以本质上线程要执行的「任务」都是一个 run/call 方法。生产中<strong>几乎都用线程池</strong>提交 Runnable/Callable，
        而不是手动 new Thread——这把「任务」和「执行线程」彻底解耦，呼应了前面「线程不能复用、要用池」的结论。
      </Callout>

      <h3>面试题 8：sleep(0) 和 yield() 有什么用？</h3>
      <p>
        这两个都和「主动让出 CPU」有关，是 sleep 题的延伸：<code>Thread.yield()</code> 是给调度器一个「我愿意让出」的<strong>提示</strong>
        （不保证一定让），让出后线程仍是<strong>可运行</strong>状态，可能立刻又被选中；
        <code>Thread.sleep(0)</code> 效果类似，触发一次调度但不真正睡眠。
      </p>
      <Callout variant="note" title="它们都不释放锁，且不可靠">
        和 sleep 一样，yield 也<strong>不释放锁</strong>，只是让出 CPU 时间片；而且 yield 只是「建议」，
        不同平台/调度器行为不一，<strong>不能用它来保证线程执行顺序或做同步</strong>。
        真正的线程协作要用 wait/notify、锁、或 java.util.concurrent 的工具，yield 基本只在极少数性能调优场景才用得到。
      </Callout>

      <Summary
        points={[
          '序列化把对象转字节序列以存储/传输，需实现 Serializable；应显式声明 serialVersionUID，transient 与 static 字段不被序列化。',
          '反序列化有 RCE 安全风险，绝不反序列化不可信数据；生产常用 JSON/Protobuf 替代原生序列化。',
          'start() 只对 NEW 状态线程有效，线程跑过后状态已变，再 start 抛 IllegalThreadStateException；线程生命周期一次性，复用要用线程池。',
          'start() 启动新线程执行 run，直接调 run() 只是当前线程的普通方法调用，不开新线程。',
          '调用系统命令用 ProcessBuilder（优于 Runtime.exec）：必须及时读走子进程输出避免缓冲区满卡死，参数分开传防命令注入。',
          'wait 释放锁、属 Object、须在 synchronized 内、靠 notify 唤醒、用于协作；sleep 不释放锁、属 Thread、定时自动醒；wait 要放在 while 里防虚假唤醒。',
        ]}
      />
    </article>
  )
}

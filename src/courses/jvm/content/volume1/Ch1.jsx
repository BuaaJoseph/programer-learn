import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MemoryAreas from '@/courses/jvm/illustrations/MemoryAreas.jsx'

const heapOomCode = `import java.util.ArrayList;
import java.util.List;

// 运行参数：-Xmx16m
// 不停往堆里塞对象，且让它们一直被引用、无法回收
public class HeapOom {
    public static void main(String[] args) {
        List<byte[]> list = new ArrayList<>();
        while (true) {
            list.add(new byte[1024 * 1024]); // 每次 1MB
        }
    }
}
// 抛出：java.lang.OutOfMemoryError: Java heap space`

const stackSofCode = `// 运行参数：-Xss256k
// 递归没有终止条件，栈帧不断压入、永不弹出
public class StackSof {
    private int depth = 0;

    public void recurse() {
        depth++;
        recurse();
    }

    public static void main(String[] args) {
        StackSof s = new StackSof();
        try {
            s.recurse();
        } catch (Throwable t) {
            System.out.println("递归深度：" + s.depth);
            throw t;
        }
    }
}
// 抛出：java.lang.StackOverflowError`

const metaspaceOomCode = `import net.bytebuddy.ByteBuddy;
import net.bytebuddy.dynamic.loading.ClassLoadingStrategy;

// 运行参数：-XX:MaxMetaspaceSize=16m
// 不停动态生成新类，每个类的元信息都压进元空间
public class MetaspaceOom {
    public static void main(String[] args) throws Exception {
        int i = 0;
        while (true) {
            // 每轮造一个全新的类，类名都不一样，无法复用
            new ByteBuddy()
                .subclass(Object.class)
                .name("Gen$" + (i++))
                .make()
                .load(MetaspaceOom.class.getClassLoader(),
                      ClassLoadingStrategy.Default.WRAPPER);
        }
    }
}
// 抛出：java.lang.OutOfMemoryError: Metaspace`

const nmtCode = `# 启动时打开 Native Memory Tracking
java -XX:NativeMemoryTracking=summary -jar app.jar

# 运行中查看本地内存各部分占用（含 Metaspace / Thread / Code 等）
jcmd <pid> VM.native_memory summary

# 输出里能看到类似：
# - Class (reserved=... committed=...)  这就是元空间相关占用
# - Thread (reserved=... committed=...) 线程栈占用，线程多时这块会很大`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          面试官问「JVM 的内存结构」，几乎是 Java 八股的第一道送分题，也是最容易答得稀碎的一道。
          关键不在于背出几个名词，而在于讲清楚一条主线：哪些区域是<strong>线程共享</strong>的、哪些是<strong>线程私有</strong>的，
          每个区域存什么、满了会抛哪种错误。把这条主线串起来，后面的对象创建、垃圾回收、类加载才有地方落脚。
        </p>
      </Lead>

      <h2>两类区域：共享还是私有</h2>
      <p>
        JVM 运行时数据区（<em>runtime data areas</em>）一共五块，按「是不是每个线程都有一份」分成两类。
        线程<strong>共享</strong>的只有两块：<em>堆</em>（heap）和<em>方法区</em>（method area）。
        线程<strong>私有</strong>的有三块：<em>虚拟机栈</em>（VM stack）、<em>本地方法栈</em>（native method stack）和
        <em>程序计数器</em>（program counter register）。判断依据很直观：堆和方法区里放的是大家共用的对象和类信息，
        所以一份就够；而每个线程各自在执行不同的方法、走到了代码的不同位置，所以栈和计数器必须人手一份。
      </p>
      <p>
        为什么要这样设计？本质是为了在「共享与隔离」之间取得平衡。对象和类信息天然是要被多个线程共用的——
        一个 <code>HashMap</code> 实例可能被多个线程同时读，<code>String</code> 类只需要加载一次，
        如果每个线程都复制一份既浪费内存又难以保证一致性，所以放在共享区。而方法的执行进度是高度线程局部的：
        线程 A 执行到 <code>foo</code> 的第 17 行、线程 B 执行到 <code>bar</code> 的第 3 行，它们的局部变量、
        调用链、下一条指令都互不相干，强行共享只会引入加锁开销和并发错误，所以放在私有区。
        记住这条「共享数据 vs 局部执行状态」的分界线，你就不会记混哪个区域是共享的。
      </p>

      <h3>各区域存什么</h3>
      <ul>
        <li>
          <strong>堆</strong>：几乎所有对象实例和数组都分配在这里，是垃圾回收的主战场，也是占内存最大的区域。
        </li>
        <li>
          <strong>方法区</strong>：存类的元信息（类结构、字段、方法字节码）、运行时常量池、静态变量等。
          它是一个「逻辑概念」，不同 JDK 版本用不同实现来落地（下面会讲永久代到元空间的变迁）。
        </li>
        <li>
          <strong>虚拟机栈</strong>：每个 Java 方法调用对应一个<em>栈帧</em>（stack frame），存局部变量表、操作数栈等
          （下一章细讲）。方法调用即压栈帧，方法返回即弹栈帧。
        </li>
        <li>
          <strong>本地方法栈</strong>：和虚拟机栈类似，但服务于 <code>native</code> 方法（比如用 C 写的底层调用）。
        </li>
        <li>
          <strong>程序计数器</strong>：记录当前线程执行到哪条字节码指令，是唯一一块<strong>不会</strong>抛 OOM 的区域。
        </li>
      </ul>

      <h3>一张表对照五大区域</h3>
      <p>面试前快速过一遍这张表，把「共享/私有、存什么、抛什么错」三列对上号，临场就不会卡壳：</p>
      <table>
        <thead>
          <tr>
            <th>区域</th>
            <th>共享/私有</th>
            <th>主要存放</th>
            <th>溢出错误</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>堆 Heap</td>
            <td>共享</td>
            <td>对象实例、数组</td>
            <td>OutOfMemoryError: Java heap space</td>
          </tr>
          <tr>
            <td>方法区 / 元空间</td>
            <td>共享</td>
            <td>类元信息、运行时常量池、静态变量</td>
            <td>OutOfMemoryError: Metaspace</td>
          </tr>
          <tr>
            <td>虚拟机栈</td>
            <td>私有</td>
            <td>栈帧（局部变量表、操作数栈等）</td>
            <td>StackOverflowError / OOM</td>
          </tr>
          <tr>
            <td>本地方法栈</td>
            <td>私有</td>
            <td>native 方法调用状态</td>
            <td>StackOverflowError / OOM</td>
          </tr>
          <tr>
            <td>程序计数器</td>
            <td>私有</td>
            <td>当前字节码指令地址</td>
            <td>无（唯一不溢出）</td>
          </tr>
        </tbody>
      </table>

      <Example title="一个对象、一次调用分别用到哪些区">
        <p>看一行最普通的代码：<code>User u = new User();</code>，它就同时用到了三块区域。</p>
        <ul>
          <li>
            <strong>方法区</strong>：先检查 <code>User</code> 类有没有加载过，没有就把类信息加载进方法区。
          </li>
          <li>
            <strong>堆</strong>：<code>new User()</code> 真正创建的对象实例，分配在堆里。
          </li>
          <li>
            <strong>虚拟机栈</strong>：局部变量 <code>u</code> 这个引用（一个指向堆对象的地址），存在当前方法栈帧的局部变量表里。
          </li>
        </ul>
        <p>
          所以经典结论是：<strong>对象在堆上，引用在栈上</strong>。而当你调用 <code>u.login()</code> 时，
          虚拟机栈会为 <code>login</code> 方法压入一个新的栈帧，方法执行完这个栈帧就弹出。
        </p>
      </Example>

      <MemoryAreas />

      <Callout variant="tip" title="边界情况：对象一定在堆上吗">
        <p>
          课本说「对象都在堆上」，但这有例外。HotSpot 的<strong>逃逸分析</strong>（escape analysis）会判断一个对象会不会
          「逃出」当前方法——如果一个对象只在方法内部使用、不会被外部引用，JIT 可能做<strong>标量替换</strong>，
          把它拆成几个局部变量直接放栈上，根本不在堆里分配，从而省掉了 GC 的负担。这就是为什么有些临时对象
          「new 了几亿次也不见堆涨」。所以更严谨的说法是：<em>对象通常在堆上，但逃逸分析可能让它栈上分配或被消除</em>。
        </p>
      </Callout>

      <KeyIdea title="区域和错误一一对应">
        <p>
          面试时把「区域」和「错误」绑定记忆，最不容易忘：堆放不下对象会抛
          <em>OutOfMemoryError: Java heap space</em>；虚拟机栈深度超限（典型是递归太深）会抛
          <em>StackOverflowError</em>；方法区（元空间）放不下类信息会抛
          <em>OutOfMemoryError: Metaspace</em>。只有<strong>程序计数器</strong>不会内存溢出，因为它只存一个行号，空间是固定的。
        </p>
      </KeyIdea>

      <h2>永久代去哪了：JDK 8 的元空间</h2>
      <p>
        方法区是规范里的概念，HotSpot 虚拟机用具体实现去落地它，而这个实现换过一次。
        JDK 7 及以前，方法区是用<em>永久代</em>（PermGen）实现的，它属于堆的一部分，受 <code>-XX:MaxPermSize</code> 限制，
        类加载多了就容易抛 <code>OutOfMemoryError: PermGen space</code>。JDK 8 起，永久代被彻底移除，
        改用<em>元空间</em>（Metaspace）实现，最大的变化是：元空间不在堆里，而是搬到了<strong>本地内存</strong>
        （native memory，即操作系统直接管理的内存）。
      </p>
      <p>
        为什么要做这个改动？永久代有几个挥之不去的痛点。其一，永久代大小和堆共用一套调参逻辑，但类信息的增长规律
        和对象的增长规律完全不同，硬挤在堆里很难调；其二，永久代的回收（卸载类、回收常量池）效率低、容易出问题，
        实践中 PermGen OOM 是经典的线上事故来源；其三，Oracle 收购 Sun 后要把 HotSpot 和 JRockit 合并，
        而 JRockit 根本没有永久代的概念。改成元空间后，类元信息直接用本地内存，默认上限就是机器物理内存，
        调参从「在堆里抠一块」变成了「向操作系统借」，这才是元空间设计的真正动机。
      </p>
      <Callout variant="warn" title="元空间不是无限大">
        <p>
          很多人误以为「元空间用本地内存所以不会满」。其实不然：默认情况下它确实可以一直向操作系统申请，
          但一旦设了 <code>-XX:MaxMetaspaceSize</code>，或者本地内存本身被耗尽，照样会抛
          <em>OutOfMemoryError: Metaspace</em>。常见诱因是不断动态生成类（如某些框架用 CGLIB 大量生成代理类），
          导致类信息越积越多。
        </p>
      </Callout>

      <Example title="亲手压爆元空间">
        <p>
          堆和栈的溢出好复现，元空间的溢出最容易被忽视，但它在线上更隐蔽也更要命。常见场景：用字节码库
          （ByteBuddy、CGLIB、Javassist）不停生成新类，或者反复部署导致旧类加载器没被回收、类信息越堆越多。
          下面用 ByteBuddy 制造无限新类，配 <code>-XX:MaxMetaspaceSize=16m</code> 很快就能看到 Metaspace OOM：
        </p>
        <CodeBlock lang="java" title="MetaspaceOom.java（配 -XX:MaxMetaspaceSize=16m）" code={metaspaceOomCode} />
        <p>
          注意这里每个类名都不同（<code>Gen$0</code>、<code>Gen$1</code>……），所以无法被复用或卸载，
          元空间只增不减。真实排障里，如果发现 Metaspace 持续上涨且不回落，八成是有人在动态造类却没有清理，
          重点排查动态代理、热部署、脚本引擎、ORM 字节码增强这几个方向。
        </p>
      </Example>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到这道题，建议按「先分类、再展开、最后挂错误」的顺序答：
        第一句先说清「共享的堆和方法区、私有的栈和计数器」这条主线；
        第二句逐区说存什么；第三句把每个区会触发的错误点出来；
        如果时间够，再补一句「JDK 8 把永久代换成了搬到本地内存的元空间」。
        这样回答既有结构又有细节，比平铺直叙背名词高一个档次。
        被追问「为什么程序计数器不会 OOM」，答「它只记一个字节码行号，占用是固定的常量级」即可。
      </p>
      <p>
        几个高频追问要提前备好答案。<strong>「字符串常量池在哪？」</strong>——JDK 7 起字符串常量池从永久代搬到了堆里，
        这也是 <code>String.intern()</code> 行为在 7 前后不同的原因。<strong>「静态变量在哪？」</strong>——
        JDK 7 起类的静态变量也随类对象放到堆里，方法区只存类的元信息引用。
        <strong>「直接内存算不算 JVM 内存？」</strong>——<code>DirectByteBuffer</code> 用的直接内存不属于五大运行时数据区，
        它在堆外、由 <code>-XX:MaxDirectMemorySize</code> 控制，NIO、Netty 大量用它，溢出时抛
        <em>OutOfMemoryError: Direct buffer memory</em>。这几问答好了，档次立刻拉开。
      </p>

      <Practice title="亲手触发各类内存错误 + 用 NMT 看本地内存">
        <p>
          理论记十遍不如亲手抛一次。先认识几个最常用的内存参数：<code>-Xmx</code> 设堆的最大值（如 <code>-Xmx16m</code>）、
          <code>-Xss</code> 设单个线程栈的大小（如 <code>-Xss256k</code>）、<code>-XX:MaxMetaspaceSize</code> 设元空间上限。
          然后用下面两段代码分别把堆和栈压爆，对照看抛出的错误信息。
        </p>
        <CodeBlock lang="java" title="HeapOom.java（配 -Xmx16m）" code={heapOomCode} />
        <CodeBlock lang="java" title="StackSof.java（配 -Xss256k）" code={stackSofCode} />
        <p>
          把 <code>-Xmx</code> 调小，堆 OOM 来得更快；把 <code>-Xss</code> 调小，递归在更浅的深度就栈溢出。
          运行时打印出的「递归深度」会随 <code>-Xss</code> 变化，这能直观感受到栈大小和栈帧数量的关系。
          进阶一步：元空间用本地内存，普通堆工具看不到它，要用 <em>NMT</em>（Native Memory Tracking）才看得清。
        </p>
        <CodeBlock lang="bash" title="用 NMT 观察本地内存占用" code={nmtCode} />
        <p>
          线上排查「内存涨了但堆没满」的诡异现象时，NMT 几乎是必备手段——它能把 Class（元空间）、Thread（线程栈）、
          Code（JIT 编译后的本地代码）等堆外占用一项项列出来，帮你定位到底是哪块在漏。
        </p>
      </Practice>

      <Summary
        points={[
          'JVM 运行时数据区分五块：线程共享的堆与方法区，线程私有的虚拟机栈、本地方法栈、程序计数器。',
          '分界线是「共享数据 vs 局部执行状态」：对象和类信息共用，方法执行进度线程局部。',
          '对象实例在堆上，引用变量在栈的局部变量表里；类信息在方法区；调用方法即压栈帧、返回即弹栈帧。',
          '区域与错误一一对应：堆抛 OutOfMemoryError: Java heap space，栈抛 StackOverflowError，元空间抛 OutOfMemoryError: Metaspace。',
          '程序计数器是唯一不会内存溢出的区域，它只记录当前字节码行号，占用固定。',
          'JDK 8 移除永久代，改用元空间实现方法区，并把它从堆搬到了本地内存；动机是更好调参、回收和与 JRockit 合并。',
          '元空间也会满：设了 -XX:MaxMetaspaceSize 或本地内存耗尽时，照样抛 OutOfMemoryError: Metaspace，常因动态造类。',
          '逃逸分析可能让对象栈上分配甚至被消除，直接内存（DirectByteBuffer）在堆外、不属于五大区域。',
        ]}
      />
    </>
  )
}

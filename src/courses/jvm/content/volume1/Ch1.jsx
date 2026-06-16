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
      <Callout variant="warn" title="元空间不是无限大">
        <p>
          很多人误以为「元空间用本地内存所以不会满」。其实不然：默认情况下它确实可以一直向操作系统申请，
          但一旦设了 <code>-XX:MaxMetaspaceSize</code>，或者本地内存本身被耗尽，照样会抛
          <em>OutOfMemoryError: Metaspace</em>。常见诱因是不断动态生成类（如某些框架用 CGLIB 大量生成代理类），
          导致类信息越积越多。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到这道题，建议按「先分类、再展开、最后挂错误」的顺序答：
        第一句先说清「共享的堆和方法区、私有的栈和计数器」这条主线；
        第二句逐区说存什么；第三句把每个区会触发的错误点出来；
        如果时间够，再补一句「JDK 8 把永久代换成了搬到本地内存的元空间」。
        这样回答既有结构又有细节，比平铺直叙背名词高一个档次。
        被追问「为什么程序计数器不会 OOM」，答「它只记一个字节码行号，占用是固定的常量级」即可。
      </p>

      <Practice title="亲手触发各类内存错误">
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
        </p>
      </Practice>

      <Summary
        points={[
          'JVM 运行时数据区分五块：线程共享的堆与方法区，线程私有的虚拟机栈、本地方法栈、程序计数器。',
          '对象实例在堆上，引用变量在栈的局部变量表里；类信息在方法区；调用方法即压栈帧、返回即弹栈帧。',
          '区域与错误一一对应：堆抛 OutOfMemoryError: Java heap space，栈抛 StackOverflowError，元空间抛 OutOfMemoryError: Metaspace。',
          '程序计数器是唯一不会内存溢出的区域，它只记录当前字节码行号，占用固定。',
          'JDK 8 移除永久代，改用元空间实现方法区，并把它从堆搬到了本地内存。',
          '元空间也会满：设了 -XX:MaxMetaspaceSize 或本地内存耗尽时，照样抛 OutOfMemoryError: Metaspace。',
        ]}
      />
    </>
  )
}

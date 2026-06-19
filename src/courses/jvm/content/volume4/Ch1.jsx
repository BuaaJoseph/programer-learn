import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const memLayout = `// 一个普通 Java 对象在 64 位 HotSpot 里的内存布局（开启压缩指针）
// +-------------------------------+
// | Mark Word            8 byte   |  对象头：hashCode/GC 分代年龄/锁标志位
// +-------------------------------+
// | Klass Pointer        4 byte   |  对象头：指向类元信息（压缩后 4 字节）
// +-------------------------------+
// | int    value         4 byte   |  实例数据
// +-------------------------------+
// | long   id            8 byte   |  实例数据
// +-------------------------------+
// | (padding)            ? byte   |  对齐填充：补足到 8 的整数倍
// +-------------------------------+`

const oomHeap = `// 1) 堆 OOM：不断往集合里塞对象且无法回收
import java.util.ArrayList;
import java.util.List;

public class HeapOom {
    public static void main(String[] args) {
        List<byte[]> list = new ArrayList<>();
        while (true) {
            list.add(new byte[1024 * 1024]); // 每次 1MB，list 强引用导致无法回收
        }
        // Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
    }
}`

const oomMeta = `// 2) 元空间 OOM：动态生成大量类（CGLib / 动态代理常见）
// 运行参数：-XX:MaxMetaspaceSize=10m
// java.lang.OutOfMemoryError: Metaspace`

const jvmArgs = `# 控制各内存区域大小的常用参数
-Xms512m -Xmx512m            # 堆初始/最大（生产建议两者相等，避免动态扩缩）
-Xmn256m                     # 新生代大小
-Xss512k                     # 每个线程虚拟机栈大小（影响栈深度与线程数）
-XX:MaxMetaspaceSize=256m    # 元空间上限（默认不限，受本机内存约束）
-XX:MaxDirectMemorySize=128m # 直接内存（堆外）上限，默认约等于 -Xmx
-XX:+UseTLAB                 # 启用 TLAB（默认开启）`

export default function Ch1() {
  return (
    <article>
      <Lead>
        这一章我们用「面试官追问」的方式，把 JVM 内存结构这一组高频题逐个讲透。
        从「JVM 由哪几部分组成」这种总览题，到「方法区会不会 OOM」「对象在虚拟机里到底怎么存」
        这类需要画图才能讲清的细节题。每一题都先给一句能直接答出来的结论，再展开原理、对比和易错点，
        最后补上面试官可能的追问。把这一章吃透，内存区域相关的面试基本不会被问倒。
      </Lead>

      <h2>一、JVM 由哪几部分组成？</h2>
      <p>
        这是开场总览题，回答要分层。一个完整的 JVM 实现，大致可以拆成三大块：
        <strong>类加载子系统</strong>（把 .class 字节码加载、链接、初始化成可用的类）、
        <strong>运行时数据区</strong>（程序运行期间各种数据的存放区域）、
        <strong>执行引擎</strong>（解释器 + JIT 编译器 + GC，负责真正执行字节码并管理内存）。
        此外还有连接本地库的<strong>本地方法接口（JNI）</strong>与本地方法库。
      </p>
      <KeyIdea>
        记忆口诀：<strong>「加载、存储、执行」</strong>三段式。类加载子系统负责「加载」，
        运行时数据区负责「存储」，执行引擎（含 GC）负责「执行与回收」。面试时先报这三块，
        再被追问哪一块就深入哪一块，结构清晰不会乱。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>组成部分</th><th>职责</th></tr>
        </thead>
        <tbody>
          <tr><td>类加载子系统</td><td>加载、验证、准备、解析、初始化字节码</td></tr>
          <tr><td>运行时数据区</td><td>堆、方法区、虚拟机栈、本地方法栈、程序计数器</td></tr>
          <tr><td>执行引擎</td><td>解释器、JIT 编译器、垃圾回收器</td></tr>
          <tr><td>本地方法接口</td><td>调用 C/C++ 等本地库（JNI）</td></tr>
        </tbody>
      </table>

      <h2>二、运行时内存区域如何划分？</h2>
      <p>
        这是上一题里「运行时数据区」的展开。按<strong>是否被线程共享</strong>来划分最清晰：
      </p>
      <ul>
        <li><strong>线程共享</strong>：堆（Heap）、方法区（Method Area，HotSpot 8 后由元空间实现）。</li>
        <li><strong>线程私有</strong>：虚拟机栈（Java 方法调用）、本地方法栈（native 方法调用）、程序计数器（记录当前线程执行到的字节码地址）。</li>
      </ul>
      <p>
        线程私有区域随线程而生、随线程而灭，所以它们的内存分配回收都是确定的，不需要 GC 操心；
        而堆和方法区是所有线程共享的，对象的生命周期不确定，正是 GC 的主战场。
      </p>
      <Callout variant="tip" title="程序计数器是唯一不会 OOM 的区域">
        程序计数器只存一个字节码行号指示器，占用极小且大小确定，是 Java 规范里
        <strong>唯一一个没有规定任何 OutOfMemoryError 的区域</strong>。这是个高频送分追问点。
      </Callout>

      <h2>三、堆和栈有什么区别？</h2>
      <p>
        「堆」和「栈」是面试里被混用最多的两个词，要先澄清：这里的「栈」通常指<strong>虚拟机栈</strong>
        （更准确说是栈帧里的局部变量表），「堆」指 Java 堆。它们的区别可以从五个维度对比：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>堆（Heap）</th><th>虚拟机栈（Stack）</th></tr>
        </thead>
        <tbody>
          <tr><td>线程关系</td><td>线程共享</td><td>线程私有</td></tr>
          <tr><td>存什么</td><td>对象实例、数组</td><td>栈帧（局部变量表、操作数栈等）</td></tr>
          <tr><td>生命周期</td><td>由 GC 管理，不确定</td><td>随方法调用入栈、返回出栈，确定</td></tr>
          <tr><td>分配方式</td><td>动态分配，速度较慢</td><td>后进先出，分配极快</td></tr>
          <tr><td>异常</td><td>OutOfMemoryError</td><td>StackOverflowError / OOM</td></tr>
        </tbody>
      </table>
      <p>
        一个常见的误解是「基本类型存栈、对象存堆」。更准确的说法是：<strong>局部变量</strong>
        （无论基本类型的值，还是对象的引用）存在栈帧的局部变量表里，而<strong>对象实例本身</strong>
        几乎都在堆上（逃逸分析下的标量替换是例外，下一章会讲）。也就是说，
        <code>{'Object o = new Object()'}</code> 里，<code>o</code> 这个引用在栈，<code>new</code> 出的实例在堆。
      </p>

      <h2>四、方法区会内存溢出吗？</h2>
      <p>
        会。方法区存放<strong>类的元信息、运行时常量池、静态变量</strong>等。
        当程序动态生成大量类（典型如 CGLib 动态代理、大量 JSP、频繁热部署、反射代理类）时，
        类元信息撑满方法区就会 OOM。
      </p>
      <p>
        这里有个版本演进的关键点：JDK 7 及以前，方法区由<strong>永久代（PermGen）</strong>实现，
        在堆内，受 <code>-XX:MaxPermSize</code> 限制，溢出报 <code>PermGen space</code>；
        JDK 8 起永久代被废除，方法区改由<strong>元空间（Metaspace）</strong>实现，
        放在<strong>本地内存</strong>里，溢出报 <code>Metaspace</code>。
      </p>
      <CodeBlock lang="java" title="模拟元空间 OOM" code={oomMeta} />

      <h2>五、哪几种情况会产生 OOM？</h2>
      <p>
        OOM 不是只有一种，面试要能分门别类报出来，并说清各自成因：
      </p>
      <table>
        <thead>
          <tr><th>OOM 类型</th><th>区域</th><th>典型成因</th></tr>
        </thead>
        <tbody>
          <tr><td>Java heap space</td><td>堆</td><td>对象太多 / 内存泄漏 / 堆设太小</td></tr>
          <tr><td>Metaspace</td><td>元空间</td><td>动态生成类过多</td></tr>
          <tr><td>unable to create new native thread</td><td>栈 / 本地</td><td>线程数过多，每个线程的栈占满本地内存</td></tr>
          <tr><td>Direct buffer memory</td><td>直接内存</td><td>NIO/Netty 分配的堆外内存超限且未释放</td></tr>
          <tr><td>GC overhead limit exceeded</td><td>堆</td><td>GC 占用 98% 时间却只回收不到 2% 堆</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="模拟堆 OOM" code={oomHeap} />
      <p>
        注意栈区其实有两种异常：单线程递归太深、栈帧撑爆是 <code>StackOverflowError</code>；
        而线程数太多、无法再为新线程分配栈空间，则是
        <code>{'OutOfMemoryError: unable to create new native thread'}</code>。这两者别混。
      </p>

      <h2>六、什么是直接内存（堆外内存）？</h2>
      <p>
        直接内存<strong>不属于运行时数据区</strong>，也不受 <code>-Xmx</code> 直接管理，它是 JVM 通过
        本地方法直接向操作系统申请的那部分内存。最典型的使用者是 NIO 的
        <code>DirectByteBuffer</code>：它在堆里只放一个很小的引用对象，真正的数据缓冲区在堆外。
      </p>
      <KeyIdea>
        直接内存的最大价值是<strong>避免一次数据拷贝</strong>。普通 IO 要把数据从内核空间拷到 JVM 堆，
        再从堆拷给业务；而直接内存让缓冲区直接落在堆外的本地内存，内核与缓冲区可以
        共享或减少拷贝，这就是「零拷贝」类优化的基础，也是 Netty 高性能的来源之一。
      </KeyIdea>
      <p>
        代价是：堆外内存的回收依赖 <code>DirectByteBuffer</code> 被 GC 后触发的 <code>Cleaner</code>，
        如果堆内的引用对象迟迟不被回收，堆外内存就会一直占着，容易出现
        <code>{'OutOfMemoryError: Direct buffer memory'}</code>。可用 <code>-XX:MaxDirectMemorySize</code> 设上限。
      </p>

      <h2>七、常量池都有哪些？别搞混</h2>
      <p>
        「常量池」是个被滥用的词，面试时要能区分三种，否则一追问就露馅：
      </p>
      <table>
        <thead>
          <tr><th>名称</th><th>位置</th><th>内容</th></tr>
        </thead>
        <tbody>
          <tr><td>Class 文件常量池</td><td>.class 文件中</td><td>编译期生成的字面量与符号引用</td></tr>
          <tr><td>运行时常量池</td><td>方法区（元空间）</td><td>类加载后，Class 常量池的运行时表示</td></tr>
          <tr><td>字符串常量池（String Pool）</td><td>堆中（JDK 7 起）</td><td>字符串字面量与 intern 的字符串引用</td></tr>
        </tbody>
      </table>
      <p>
        重点提醒：字符串常量池在 <strong>JDK 7 已从永久代移到了堆</strong>。这就是为什么
        <code>{'new String("a").intern()'}</code> 在 JDK 6 和 7 上表现不同的根源——经典追问题。
      </p>
      <Example title="一个会被追问的字符串题">
        <p>
          <code>{'String s = new String("ab");'}</code> 创建了几个对象？答：可能两个——
          堆里 <code>new</code> 出来的一个 String 对象，以及若常量池里还没有
          <code>{'"ab"'}</code> 字面量，则常量池里再创建一个。若已存在则只新建堆里那一个。
        </p>
      </Example>

      <h2>八、对象在虚拟机里如何存储？</h2>
      <p>
        这是需要画图回答的题。一个对象在堆里的内存布局分三部分：
        <strong>对象头（Header）、实例数据（Instance Data）、对齐填充（Padding）</strong>。
      </p>
      <ul>
        <li><strong>对象头</strong>：又分两部分。<em>Mark Word</em> 存 hashCode、GC 分代年龄、锁标志位
          （偏向锁/轻量级锁/重量级锁会改写它）；<em>Klass Pointer</em> 指向方法区里该对象所属类的元信息。
          数组对象还多一个记录长度的字段。</li>
        <li><strong>实例数据</strong>：对象真正的字段内容，包括从父类继承来的字段，按一定规则排列以节省空间。</li>
        <li><strong>对齐填充</strong>：HotSpot 要求对象起始地址是 8 字节的整数倍，不够就补几个字节占位。</li>
      </ul>
      <CodeBlock lang="text" title="对象内存布局示意" code={memLayout} />
      <p>
        追问点：<strong>对象怎么被访问定位？</strong>有两种主流方式——<em>句柄</em>（栈里存的引用指向句柄池，
        句柄再分别指向对象实例和类信息，对象移动时只改句柄、引用不变）和<em>直接指针</em>
        （引用直接指向对象，HotSpot 采用此方式，访问快一次寻址，但对象移动时要改引用）。
      </p>

      <h2>九、什么是 TLAB？</h2>
      <p>
        TLAB（Thread Local Allocation Buffer，本地线程分配缓冲）是堆上的一块<strong>线程私有的小块预分配区域</strong>。
        在 Eden 区里，JVM 给每个线程划一小块自己的缓冲，线程创建对象时优先在自己的 TLAB 里分配。
      </p>
      <KeyIdea>
        TLAB 解决的是<strong>多线程并发分配对象时的竞争问题</strong>。如果所有线程都在 Eden 同一个指针上
        「指针碰撞」分配，就需要加锁或 CAS 来保证不冲突；有了 TLAB，每个线程在自己的私有缓冲里分配，
        无需同步，只有缓冲用完了向 Eden 申请新缓冲时才需要一次同步。这是典型的「以空间换并发」。
      </KeyIdea>
      <p>
        TLAB 默认开启（<code>-XX:+UseTLAB</code>）。当 TLAB 放不下一个较大对象时，JVM 会判断是直接在
        Eden 慢分配，还是给该线程换一个新 TLAB。这也是为什么大对象有时会绕过 TLAB 直接分配。
      </p>

      <CodeBlock lang="bash" title="本章涉及的内存相关参数" code={jvmArgs} />

      <Callout variant="warn" title="易错点汇总">
        ① 程序计数器不 OOM；② JDK 8 后是元空间不是永久代，且在本地内存；
        ③ 字符串常量池 JDK 7 起在堆；④ 栈有两种异常（SOF 和 OOM）；
        ⑤ 局部变量在栈、对象实例在堆，别说成「基本类型在栈」。
      </Callout>

      <Summary
        points={[
          'JVM 三大块：类加载子系统、运行时数据区、执行引擎（含 GC），外加 JNI。',
          '运行时数据区按线程共享/私有划分：堆与方法区共享，栈与程序计数器私有；程序计数器不会 OOM。',
          '堆存对象、线程共享、GC 管理；栈存栈帧、线程私有、随调用入出栈，分别对应 OOM 与 StackOverflowError。',
          '方法区会 OOM（动态生成类过多）；JDK 8 起方法区由本地内存里的元空间实现，永久代被废除。',
          'OOM 分多种：堆、元空间、无法创建线程、直接内存、GC overhead；要能分类说成因。',
          '对象布局＝对象头(Mark Word+Klass Pointer)+实例数据+对齐填充；访问有句柄与直接指针两种，HotSpot 用直接指针。',
          'TLAB 是线程私有的 Eden 预分配缓冲，用空间换取并发分配时的无锁，默认开启。',
        ]}
      />
    </article>
  )
}

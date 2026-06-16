import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const layoutCode = `// 一个最普通的对象
public class User {
    int age;        // 4 字节
    boolean active; // 1 字节
}

// 64 位 HotSpot、开启指针压缩时，new User() 在堆上大致是：
// [ Mark Word 8B ][ 类型指针 4B ][ age 4B ][ active 1B ][ 对齐填充 3B ]
//  ----- 对象头 12B -----        --- 实例数据 5B ---     --- 填充 ---
// 合计 24 字节（必须是 8 的倍数）`

const jolCode = `import org.openjdk.jol.info.ClassLayout;

public class JolDemo {
    public static void main(String[] args) {
        User u = new User();
        // 打印对象的内存布局：对象头、各字段的偏移与大小、对齐填充
        System.out.println(ClassLayout.parseInstance(u).toPrintable());
    }
}
// Maven 依赖：org.openjdk.jol:jol-core
// 输出里能看到 OFFSET / SIZE / TYPE / DESCRIPTION 四列`

const markWordCode = `// Mark Word 在不同锁状态下复用同一块空间（64 位，简化示意）：
//
// 无锁    : | hashcode(31) | 分代年龄(4) | 偏向(0) | 锁标志 01 |
// 偏向锁  : | 线程ID(54)   | epoch | 分代年龄(4) | 偏向(1) | 锁标志 01 |
// 轻量级锁: | 指向栈中锁记录的指针 ............... | 锁标志 00 |
// 重量级锁: | 指向 monitor(重量级锁)的指针 ........ | 锁标志 10 |
// GC标记  : | ...................................... | 锁标志 11 |
//
// 关键：同样 8 字节，靠最后 2~3 位的"锁标志"区分当前处于哪种状态`

const hashIdentityCode = `Object o = new Object();
// 第一次调用 identityHashCode 时，HotSpot 计算出哈希并写进 Mark Word
int h = System.identityHashCode(o);

// 注意：一旦对象的 identityHashCode 被计算并存入 Mark Word，
// 这个对象就无法再进入"偏向锁"状态了——因为偏向锁要用 Mark Word
// 存线程 ID，没地方再放哈希。这是 hashCode 与偏向锁互斥的底层原因。
synchronized (o) {
    // 此处只能走轻量级锁，无法偏向
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说「<code>new User()</code> 的对象在堆上」，但堆上那块内存到底长什么样、是怎么一步步建起来的？
          这一章把 <code>new</code> 拆开看：从类加载检查、分配内存、设置对象头，到最后执行构造方法，
          再看对象在内存里的三段式布局，以及程序拿到引用后是怎么找到对象的。这是面试里区分「会用」和「懂原理」的分水岭。
        </p>
      </Lead>

      <h2>new 一个对象，到底发生了什么</h2>
      <p>
        当虚拟机遇到一条 <code>new</code> 字节码指令，它会按下面几步走：
      </p>
      <ul>
        <li>
          <strong>类加载检查</strong>：先看这个类有没有被加载、解析、初始化过。没有，就先触发类加载（第四卷的内容）。
        </li>
        <li>
          <strong>分配内存</strong>：类加载完后，对象需要多大内存就已经确定了，于是从堆里划出一块。
        </li>
        <li>
          <strong>初始化零值</strong>：把分配到的内存空间（不含对象头）全部置为零值，这保证了对象的字段不赋初值也能直接用——
          <code>int</code> 是 0、<code>boolean</code> 是 <code>false</code>、引用是 <code>null</code>。
        </li>
        <li>
          <strong>设置对象头</strong>：把这个对象属于哪个类、哈希码、GC 分代年龄等信息填进对象头。
        </li>
        <li>
          <strong>执行 init</strong>：上面几步做完，从虚拟机视角对象已经「生」出来了，但从 Java 程序视角还没有——
          还要执行 <code>{'<init>'}</code>（即构造方法），按你写的代码给字段赋真正的初值。
        </li>
      </ul>
      <p>
        这里有个常被忽略的细节：<strong>「分配内存」和「设置对象头、执行构造方法」不是原子的</strong>，
        多个线程并发 <code>new</code> 时，可能一个线程刚把引用赋出去、构造方法还没跑完，另一个线程就读到了
        「半初始化」的对象。这正是 <code>double-checked locking</code> 单例必须给字段加 <code>volatile</code> 的根本原因——
        <code>volatile</code> 禁止「赋引用」和「初始化对象」之间发生指令重排序。把对象创建拆成几步看清楚，
        很多并发难题的根源就浮出水面了。
      </p>

      <h3>分配内存的两种方式</h3>
      <p>
        从堆里划内存有两种策略，取决于堆是否规整。如果堆里用过和空闲的内存各占一边、中间有个分界指针，
        那分配就是把指针往空闲那侧挪一段，这叫<em>指针碰撞</em>（bump the pointer）。
        如果用过和空闲的内存交错在一起、堆不规整，虚拟机就得维护一张记录哪些块空闲的表，从表里找一块够大的划给对象，
        这叫<em>空闲列表</em>（free list）。用哪种取决于垃圾回收器是否会压缩整理内存。
      </p>
      <p>
        具体到回收器：带压缩整理的（如 Serial、ParNew、G1 的部分阶段）回收后内存规整，用指针碰撞；
        基于标记-清除、不压缩的（如老年代用 CMS）回收后留下碎片、内存不规整，只能用空闲列表。
        这就是为什么「用哪种分配方式」其实是被「选了哪种 GC」决定的——分配策略和回收策略是一对绑定的设计。
      </p>
      <Callout variant="tip" title="TLAB：避免多线程抢内存">
        <p>
          堆是线程共享的，多个线程同时分配对象就会争抢同一个分界指针。HotSpot 的解法是
          <em>TLAB</em>（Thread Local Allocation Buffer，线程本地分配缓冲）：
          每个线程预先从堆里领一小块私有缓冲区，分配对象时优先在自己的 TLAB 里做指针碰撞，
          不用加锁，只有 TLAB 用完了才去争抢共享堆。这是「对象创建很快」的重要原因。
        </p>
        <p>
          边界情况：如果一个对象太大、单个 TLAB 放不下，会直接去堆里分配（走慢路径，要加锁/CAS）；
          TLAB 用 <code>-XX:+UseTLAB</code>（默认开）控制，可用 <code>-XX:TLABSize</code> 调初始大小。
          TLAB 会有「浪费」——快满时塞不下下一个对象就会作废剩余空间，所以它的大小是被自适应调优过的折中。
        </p>
      </Callout>

      <h2>对象在内存里的布局</h2>
      <p>
        一个对象在堆里存储，分成三块：<em>对象头</em>（header）、<em>实例数据</em>（instance data）、
        <em>对齐填充</em>（padding）。
      </p>
      <ul>
        <li>
          <strong>对象头</strong>：又分两部分。一是 <em>Mark Word</em>，存哈希码、GC 分代年龄、锁状态标志、
          偏向锁线程 ID 等运行时数据，它会随对象状态复用同一块空间。二是<em>类型指针</em>，指向方法区里该对象所属类的元信息，
          虚拟机靠它确定「这是哪个类的实例」。如果对象是数组，对象头里还会多一块记录数组长度。
        </li>
        <li>
          <strong>实例数据</strong>：对象真正存放的字段内容，包括从父类继承下来的字段。
          虚拟机会按一定规则排列字段，让相同宽度的字段尽量挨在一起，以节省空间。
        </li>
        <li>
          <strong>对齐填充</strong>：不是必需的，只起占位作用。HotSpot 要求对象起始地址是 8 字节的整数倍，
          所以对象总大小若不是 8 的倍数，就补几个字节凑齐。
        </li>
      </ul>

      <h3>Mark Word：一块空间复用多种用途</h3>
      <p>
        Mark Word 是对象头里最精妙的设计。它只有 8 字节（64 位），却要同时承载哈希码、GC 分代年龄、锁信息——
        这些信息加起来远超 8 字节，怎么办？答案是<strong>复用</strong>：靠末尾几位「锁标志位」标明当前是哪种状态，
        在不同状态下，这 8 字节存的内容完全不同。理解了这一点，你才能真正读懂 <code>synchronized</code> 的锁升级
        （无锁 → 偏向锁 → 轻量级锁 → 重量级锁），那本质就是 Mark Word 在改写自己的内容。
      </p>
      <CodeBlock lang="text" title="Mark Word 在不同状态下的复用布局" code={markWordCode} />
      <Example title="为什么算过 hashCode 的对象不能再偏向">
        <p>
          一个很冷但很能体现理解深度的追问：偏向锁要用 Mark Word 存线程 ID，而 <code>identityHashCode</code> 一旦被计算，
          这个哈希也要存进 Mark Word。两者抢同一块空间，于是只要对象的 identity hashCode 被生成过，
          它就<strong>永久失去</strong>进入偏向锁的资格，只能走轻量级锁。
        </p>
        <CodeBlock lang="java" title="hashCode 与偏向锁互斥" code={hashIdentityCode} />
        <p>
          这也是为什么有些「锁优化」的微基准会因为先打印了 <code>hashCode</code> 而测出和预期不符的结果——
          Mark Word 就这么大，谁先占了谁说了算。（注：偏向锁在新版 JDK 已默认关闭/废弃，但理解机制仍有价值。）
        </p>
      </Example>

      <Example title="看清一个 User 对象占多少字节">
        <p>
          以 64 位 HotSpot、开启指针压缩为例，对象头是 12 字节（Mark Word 8 字节 + 压缩后的类型指针 4 字节）。
          下面这个只有一个 <code>int</code> 和一个 <code>boolean</code> 的类，实例数据是 5 字节，
          加起来 17 字节不是 8 的倍数，于是补 3 字节填充，最终占 24 字节。
        </p>
        <CodeBlock lang="java" title="对象布局示意" code={layoutCode} />
        <p>
          这解释了为什么「字段越少的对象也不一定省内存」——对象头本身就是固定开销，对齐填充又可能浪费几字节。
          推论：一个空的 <code>new Object()</code> 实际占 16 字节（12 字节头 + 4 字节填充），而不是 0；
          所以海量小对象的内存开销，相当大一部分是对象头吃掉的，这也是为什么高性能场景偏爱用基本类型数组而非对象数组。
        </p>
      </Example>

      <KeyIdea title="句柄 vs 直接指针">
        <p>
          程序通过栈上的引用去操作堆里的对象，「引用怎么定位对象」有两种主流方式。
          <strong>句柄</strong>方式：堆里划出一块句柄池，引用存的是句柄地址，句柄里再分别存对象实例数据的地址和类型数据的地址；
          好处是对象被移动（GC 整理内存时常发生）只需改句柄，引用本身不用动。
          <strong>直接指针</strong>方式：引用直接存对象地址，对象头里的类型指针再指向类信息；
          好处是少一次间接寻址，访问更快。<strong>HotSpot 采用的是直接指针</strong>，
          因为对象访问极其频繁，省下的这次寻址收益很大。
        </p>
      </KeyIdea>

      <h3>指针压缩：为什么 64 位 JVM 没那么费内存</h3>
      <p>
        64 位系统上一个指针本应是 8 字节，类型指针、引用字段全用 8 字节会让对象明显膨胀、缓存命中率下降。
        HotSpot 的对策是<em>压缩指针</em>（Compressed Oops，<code>-XX:+UseCompressedOops</code>，默认开）：
        把 64 位指针压成 32 位存储。原理是对象都按 8 字节对齐，所以地址末尾 3 位恒为 0，
        可以省掉不存、用时再左移 3 位还原，等于用 32 位寻址 32GB（2³² × 8）的空间。
        这就是为什么<strong>堆超过约 32GB 后指针压缩失效</strong>，对象反而变大、有时 30GB 堆的实际可用还不如 31GB——
        一个反直觉但很经典的调优陷阱。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「<code>new</code> 一个对象的过程」，按「类加载检查 → 分配内存（指针碰撞或空闲列表，加上 TLAB 加速）→
        置零值 → 设对象头 → 执行构造方法」这条线背即可，能说出每一步的目的更佳。
        被问「对象内存布局」，答「对象头（Mark Word + 类型指针）、实例数据、对齐填充」三段。
        被问「对象怎么访问定位」，答「句柄和直接指针两种，HotSpot 用直接指针，胜在访问快」。
        如果面试官追问「为什么要置零值」，答「保证字段未显式赋值时也有确定的默认值」。
      </p>
      <p>
        加分追问：<strong>「new 出来的对象一定是线程安全发布的吗？」</strong>——不是，分配和构造非原子，
        要靠 <code>final</code> 字段语义或 <code>volatile</code> 保证安全发布。
        <strong>「为什么 64 位 JVM 推荐堆别超 32G？」</strong>——超过后指针压缩失效，对象变大、得不偿失。
        <strong>「对象头能省掉吗？」</strong>——不能，但 Project Lilliput 正在尝试把对象头从 16/12 字节压到更小，
        说明对象头开销是 JVM 在持续优化的真实痛点。
      </p>

      <Practice title="用 JOL 实测对象大小与布局">
        <p>
          口说无凭，<em>JOL</em>（Java Object Layout）是 OpenJDK 官方的小工具，能把对象在内存里的真实布局打印出来——
          对象头多大、每个字段在第几个偏移、补了几字节填充，一目了然。
          引入 <code>jol-core</code> 依赖后，用 <code>ClassLayout.parseInstance(obj).toPrintable()</code> 即可。
        </p>
        <CodeBlock lang="java" title="JolDemo.java" code={jolCode} />
        <p>
          可以做几组对比实验：给 <code>User</code> 加一个 <code>long</code> 字段看大小怎么涨；
          用 <code>-XX:-UseCompressedOops</code> 关掉指针压缩，看对象头从 12 字节变回 16 字节；
          再 <code>parseInstance</code> 一个空数组，观察对象头里多出来的「数组长度」那一块。
        </p>
        <p>
          进阶实验：先对一个对象调用 <code>System.identityHashCode</code> 再用 JOL 看 Mark Word，
          对比没调用过的对象，能直接看到哈希码被写进了对象头；
          再用 <code>jol-cli</code> 的 <code>estimates</code> 命令对比开启/关闭压缩指针时同一个对象的大小差异，
          这些都是「眼见为实」的好素材，比死记结论扎实得多。
        </p>
      </Practice>

      <Summary
        points={[
          'new 的过程：类加载检查 → 分配内存 → 初始化零值 → 设置对象头 → 执行构造方法（init）。',
          '分配和构造非原子，并发下可能读到半初始化对象，这是 DCL 单例要加 volatile 的根因。',
          '分配内存有指针碰撞（堆规整）和空闲列表（堆不规整）两种，选哪种由 GC 是否压缩整理决定。',
          'TLAB 让每个线程在自己的私有缓冲区里无锁分配对象，是对象创建快的关键。',
          '对象内存布局三段式：对象头（Mark Word + 类型指针）、实例数据、对齐填充（凑成 8 的倍数）。',
          'Mark Word 只有 8 字节，靠锁标志位复用存哈希/分代年龄/锁信息，这是锁升级的底层基础。',
          '访问定位有句柄和直接指针两种方式，HotSpot 用直接指针，省一次间接寻址、访问更快。',
          '压缩指针让 64 位 JVM 省内存，但堆超过约 32GB 后失效，是经典调优陷阱。',
          '用 JOL 工具的 ClassLayout.parseInstance 可以实测对象头大小、字段偏移和对齐填充。',
        ]}
      />
    </>
  )
}

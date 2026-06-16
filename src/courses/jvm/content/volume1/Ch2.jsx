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
          还要执行 <code>&lt;init&gt;</code>（即构造方法），按你写的代码给字段赋真正的初值。
        </li>
      </ul>

      <h3>分配内存的两种方式</h3>
      <p>
        从堆里划内存有两种策略，取决于堆是否规整。如果堆里用过和空闲的内存各占一边、中间有个分界指针，
        那分配就是把指针往空闲那侧挪一段，这叫<em>指针碰撞</em>（bump the pointer）。
        如果用过和空闲的内存交错在一起、堆不规整，虚拟机就得维护一张记录哪些块空闲的表，从表里找一块够大的划给对象，
        这叫<em>空闲列表</em>（free list）。用哪种取决于垃圾回收器是否会压缩整理内存。
      </p>
      <Callout variant="tip" title="TLAB：避免多线程抢内存">
        <p>
          堆是线程共享的，多个线程同时分配对象就会争抢同一个分界指针。HotSpot 的解法是
          <em>TLAB</em>（Thread Local Allocation Buffer，线程本地分配缓冲）：
          每个线程预先从堆里领一小块私有缓冲区，分配对象时优先在自己的 TLAB 里做指针碰撞，
          不用加锁，只有 TLAB 用完了才去争抢共享堆。这是「对象创建很快」的重要原因。
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

      <Example title="看清一个 User 对象占多少字节">
        <p>
          以 64 位 HotSpot、开启指针压缩为例，对象头是 12 字节（Mark Word 8 字节 + 压缩后的类型指针 4 字节）。
          下面这个只有一个 <code>int</code> 和一个 <code>boolean</code> 的类，实例数据是 5 字节，
          加起来 17 字节不是 8 的倍数，于是补 3 字节填充，最终占 24 字节。
        </p>
        <CodeBlock lang="java" title="对象布局示意" code={layoutCode} />
        <p>
          这解释了为什么「字段越少的对象也不一定省内存」——对象头本身就是固定开销，对齐填充又可能浪费几字节。
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

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「<code>new</code> 一个对象的过程」，按「类加载检查 → 分配内存（指针碰撞或空闲列表，加上 TLAB 加速）→
        置零值 → 设对象头 → 执行构造方法」这条线背即可，能说出每一步的目的更佳。
        被问「对象内存布局」，答「对象头（Mark Word + 类型指针）、实例数据、对齐填充」三段。
        被问「对象怎么访问定位」，答「句柄和直接指针两种，HotSpot 用直接指针，胜在访问快」。
        如果面试官追问「为什么要置零值」，答「保证字段未显式赋值时也有确定的默认值」。
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
      </Practice>

      <Summary
        points={[
          'new 的过程：类加载检查 → 分配内存 → 初始化零值 → 设置对象头 → 执行构造方法（init）。',
          '分配内存有指针碰撞（堆规整）和空闲列表（堆不规整）两种，选哪种取决于 GC 是否压缩整理。',
          'TLAB 让每个线程在自己的私有缓冲区里无锁分配对象，是对象创建快的关键。',
          '对象内存布局三段式：对象头（Mark Word + 类型指针）、实例数据、对齐填充（凑成 8 的倍数）。',
          '访问定位有句柄和直接指针两种方式，HotSpot 用直接指针，省一次间接寻址、访问更快。',
          '用 JOL 工具的 ClassLayout.parseInstance 可以实测对象头大小、字段偏移和对齐填充。',
        ]}
      />
    </>
  )
}

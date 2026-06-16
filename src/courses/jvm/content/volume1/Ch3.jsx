import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const incrCode = `int i = 0;
i = i++;
// 等价于操作数栈上的执行过程：
// 1) iload   i      把 i 的当前值 0 压入操作数栈
// 2) iinc    i, 1   直接给局部变量表里的 i 加 1，i 变成 1
// 3) istore  i      把栈顶的旧值 0 弹出，写回局部变量表的 i
// 最终 i = 0，而不是 1 —— 经典面试坑`

const sofCode = `// 运行参数：-Xss256k
// 递归没有出口，每调用一次就压入一个栈帧，永不返回
public class Recursion {
    private static int depth = 0;

    static void dive() {
        depth++;
        dive(); // 自己调自己，栈帧只进不出
    }

    public static void main(String[] args) {
        try {
            dive();
        } catch (StackOverflowError e) {
            System.out.println("栈溢出时的递归深度：" + depth);
        }
    }
}
// -Xss 越小，能压入的栈帧越少，打印出的 depth 越小`

const slotReuseCode = `public void m() {
    {
        byte[] big = new byte[64 * 1024 * 1024]; // 占用一个 slot
    } // big 作用域结束，但 slot 还被它占着

    int a = 1; // a 复用了 big 腾出的 slot 位置吗？

    // 关键：如果 a 没有复用 big 的 slot，那 big 引用一直在局部变量表里，
    // 即使逻辑上不可达，GC 也可能因为"栈上还有引用"而不回收那 64MB！
    // 解法：在块结束后手动 big = null，或让后续变量复用该 slot。
}`

const threadOomCode = `// 危险：不停创建不退出的线程，每个线程都要分配栈空间
// 在 32 位或受限内存机器上，线程一多就抛 OOM: unable to create new native thread
public class ThreadOom {
    public static void main(String[] args) {
        int n = 0;
        while (true) {
            new Thread(() -> {
                try { Thread.sleep(Long.MAX_VALUE); }
                catch (InterruptedException ignored) {}
            }).start();
            System.out.println("已创建线程数：" + (++n));
        }
    }
}
// 此时调小 -Xss 反而能多创建一些线程`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          第一章说虚拟机栈是线程私有的，第二章说方法调用会「压栈帧、弹栈帧」。这一章就把这个最小执行单元——
          <em>栈帧</em>（stack frame）拆开看：它由哪几部分组成、一次方法调用在栈上怎么进出、
          为什么递归太深会 <em>StackOverflowError</em> 而线程太多会 <em>OutOfMemoryError</em>。
          把栈帧搞透，你就真正理解了「Java 方法是怎么跑起来的」。
        </p>
      </Lead>

      <h2>虚拟机栈与栈帧的关系</h2>
      <p>
        每个线程有一个自己的虚拟机栈，这个栈里装的就是一个个<em>栈帧</em>。
        线程每调用一个方法，就为它创建一个栈帧压入栈顶；方法执行完毕（正常返回或抛异常），这个栈帧就出栈销毁。
        正在执行的那个方法对应的栈帧，永远在栈顶，叫<em>当前栈帧</em>（current frame）。
        所以一个线程的调用链有多深，它的虚拟机栈里就叠了多少个栈帧。
      </p>
      <p>
        为什么用栈这种结构而不是别的？因为方法调用天然符合<strong>后进先出</strong>：最后被调用的方法一定最先返回。
        用栈来表达「调用-返回」是最自然、寻址最快的方式——压栈/弹栈只动一个栈顶指针，是常数级操作。
        这也解释了为什么 Java 方法不能像某些语言那样「随意跳转返回」：栈帧的进出顺序被结构本身锁死了，
        想跨多层返回只能靠异常这种特殊机制（它会沿栈一路弹帧，即「栈展开」stack unwinding）。
      </p>

      <h3>栈帧的四个组成部分</h3>
      <ul>
        <li>
          <strong>局部变量表</strong>（local variable table）：存方法的参数和方法内定义的局部变量。
          它以「槽」（slot）为单位，一个 slot 放一个 <code>int</code>、<code>float</code>、引用等，
          <code>long</code> 和 <code>double</code> 占两个 slot。表的大小在编译期就确定了。
        </li>
        <li>
          <strong>操作数栈</strong>（operand stack）：一个后进先出的工作区，字节码指令就是在这里取操作数、做运算、放结果。
          比如做加法，就是把两个数压栈、执行 <code>iadd</code> 弹出两个、把和压回去。
        </li>
        <li>
          <strong>动态链接</strong>（dynamic linking）：指向运行时常量池里该方法的引用，
          用于把字节码里的「符号引用」（方法名等）在运行期转换成实际的「直接引用」（内存地址），支撑方法的动态调用。
        </li>
        <li>
          <strong>方法返回地址</strong>（return address）：记录方法返回后，调用者应当从哪条指令继续执行，
          相当于「执行完这个方法，回到哪里」的书签。
        </li>
      </ul>

      <h3>局部变量表的两个细节：slot 复用与 this</h3>
      <p>
        局部变量表有两个常被忽略却很能体现深度的点。其一，<strong>实例方法的第 0 个 slot 永远是 <code>this</code></strong>，
        这就是为什么实例方法里能直接用 <code>this</code>、而静态方法不能——静态方法没有 <code>this</code>，
        第 0 个 slot 直接从第一个参数开始。其二，<strong>slot 是可以复用的</strong>：
        一个局部变量过了作用域后，它占的 slot 可以被后面的变量重用，以压缩局部变量表大小。
      </p>
      <Example title="slot 复用引发的内存泄漏假象">
        <p>
          slot 复用有个经典副作用：如果一个大对象的引用占着 slot，过了作用域却没有被新变量复用，
          那这个引用就一直挂在局部变量表里，GC 看到「栈上还引用着它」就不敢回收，造成看似的内存泄漏。
        </p>
        <CodeBlock lang="java" title="slot 复用与隐性持有" code={slotReuseCode} />
        <p>
          这就是早年「手动置 <code>null</code> 能帮助 GC」说法的来源。不过现代 JIT 编译后的代码通常能正确处理这种情况，
          真正需要手动置 <code>null</code> 的场景已经很少；但理解背后「栈上引用即 GC Root」这个机制，
          对排查「对象该回收却没回收」的问题至关重要。
        </p>
      </Example>

      <Example title="i = i++ 为什么不自增：操作数栈视角">
        <p>
          这道经典面试题，用操作数栈和局部变量表的配合就能讲清。<code>i = i++</code> 编译后大致是三步：
          先把 <code>i</code> 的旧值压入操作数栈，再直接对局部变量表里的 <code>i</code> 做自增，
          最后把栈顶那个「旧值」写回 <code>i</code>，于是自增的结果被旧值覆盖了。
        </p>
        <CodeBlock lang="java" title="i = i++ 的字节码语义" code={incrCode} />
        <p>
          关键在于：<code>i++</code> 是「先取值后自增」，取出的旧值被暂存在操作数栈上，
          而 <code>istore</code> 又把这个旧值写了回去，所以最终 <code>i</code> 还是 0。
          这正说明了局部变量表和操作数栈是两个独立的位置，值在它们之间来回搬动。
          对比 <code>i = ++i</code>：它先 <code>iinc</code> 再 <code>iload</code> 压入新值，结果就是 1——
          一字之差，字节码顺序完全相反。用 <code>javap -c</code> 反编译一对照，这道题就再也不会忘。
        </p>
      </Example>

      <KeyIdea title="一次调用 = 压栈帧，一次返回 = 弹栈帧">
        <p>
          把方法调用想象成叠盘子：调用 <code>a()</code>，压入 a 的栈帧；a 里调用 <code>b()</code>，再压入 b 的栈帧；
          b 返回，弹出 b 的栈帧，控制权（靠方法返回地址）回到 a；a 返回，弹出 a 的栈帧。
          整个过程严格后进先出。理解了这一点，就能解释为什么<strong>局部变量天生线程安全</strong>——
          它们活在各自线程私有的栈帧里，别的线程根本碰不到。
        </p>
      </KeyIdea>

      <h2>两种栈相关的错误：SOF 还是 OOM</h2>
      <p>
        虚拟机栈会抛两种不同的错误，面试常拿来对比。
        第一种是 <em>StackOverflowError</em>：单个线程请求的栈深度超过了允许的最大深度。
        最典型的诱因就是<strong>没有终止条件的递归</strong>——栈帧只压不弹，很快把这一个线程的栈空间叠满。
        第二种是 <em>OutOfMemoryError</em>：当虚拟机栈允许动态扩展、却无法再申请到足够内存时抛出，
        实践中更常见的触发方式是<strong>创建大量线程</strong>——每个线程都要分配一块栈空间，线程太多就把内存耗尽了。
      </p>
      <p>
        要分清两者，记一句话：<strong>SOF 是「一个线程的栈太高」，OOM 是「线程太多、所有栈加起来太大」</strong>。
        一个是纵向叠太深，一个是横向铺太多。线上排查时，看到 <code>StackOverflowError</code> 几乎可以直奔
        「是不是有无限递归 / 循环依赖的递归调用 / 序列化时的循环引用」；看到
        <code>unable to create new native thread</code>，则要查「线程池有没有失控、是不是每个请求都 new 线程」。
      </p>
      <Callout variant="warn" title="想缓解线程太多的 OOM，别盲目调大 -Xss">
        <p>
          这里有个反直觉的点：当 OOM 是「线程太多」导致的，<strong>调小</strong> <code>-Xss</code>（每个线程栈更小）
          反而能容纳更多线程；而调大 <code>-Xss</code> 会让每个线程更费内存，能创建的线程数变少。
          <code>-Xss</code> 调大是用来缓解「单线程递归太深的 StackOverflowError」的，两个场景别搞反。
        </p>
        <p>
          另一个常被忽略的点：线程栈用的是<strong>本地内存</strong>，不占用 <code>-Xmx</code> 设的堆。
          所以你可能遇到「堆还很空，但创建线程就 OOM」的怪事——因为本地内存被一堆线程栈吃光了。
          真正治本的办法往往不是调 <code>-Xss</code>，而是<strong>用线程池限制线程总数</strong>，从源头控制。
        </p>
      </Callout>
      <Example title="复现 unable to create new native thread">
        <p>
          下面这段代码不停创建睡死的线程，在内存受限的环境里很快就会触发线程相关的 OOM。
          它和递归的 SOF 是完全不同的两种「栈出事」，对照着跑一遍，区别就刻进脑子了。
        </p>
        <CodeBlock lang="java" title="ThreadOom.java（小心，会吃满资源）" code={threadOomCode} />
        <p>
          实测时建议在容器或虚拟机里跑，并设好资源上限，别把开发机搞挂。观察到 OOM 后，
          试着把 <code>-Xss</code> 从默认（约 1M）调到 <code>256k</code>，会发现能创建的线程数明显增多——
          这就是「线程太多时调小 -Xss」的直接证据。
        </p>
      </Example>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「栈帧由什么组成」，答「局部变量表、操作数栈、动态链接、方法返回地址」四部分，能各说一句作用更佳。
        被问「StackOverflowError 和 OOM 的区别」，答「前者是单线程栈太深（常因递归无出口），
        后者常因线程太多耗尽内存」，并补一句「<code>-Xss</code> 调大治递归深、调小反而能开更多线程」。
        被问「为什么局部变量不用考虑线程安全」，答「它们存在线程私有的栈帧的局部变量表里，不被共享」。
      </p>
      <p>
        高频追问储备：<strong>「尾递归 Java 优化吗？」</strong>——很遗憾，HotSpot 至今不做尾调用优化，
        所以再「尾」的递归也会一层层压栈、照样可能 SOF，写深递归务必改成迭代或显式用栈。
        <strong>「异常对象很贵吗？」</strong>——构造异常时填充栈轨迹（fillInStackTrace）要遍历整个栈帧链，
        这就是为什么「用异常控制流程」性能差；可以重写 <code>fillInStackTrace</code> 让自定义异常变轻。
        <strong>「-Xss 默认多大？」</strong>——HotSpot 通常约 512K~1M，随平台不同，能用 <code>java -XX:+PrintFlagsFinal</code> 查
        <code>ThreadStackSize</code>。
      </p>

      <Practice title="复现栈溢出并观察 -Xss 的影响">
        <p>
          写一个没有出口的递归就能稳定复现 <em>StackOverflowError</em>。
          在 <code>catch</code> 里打印出溢出时的递归深度，再配合不同的 <code>-Xss</code> 反复运行，
          就能直观看到「栈越小、能叠的栈帧越少、深度越浅」。
        </p>
        <CodeBlock lang="java" title="Recursion.java（配 -Xss256k）" code={sofCode} />
        <p>
          先用默认参数跑一次记下深度，再加 <code>-Xss256k</code> 跑，深度会明显变小；
          换成 <code>-Xss1m</code> 深度又会回升。如果在 <code>dive</code> 里多声明几个局部变量，
          每个栈帧变大，相同 <code>-Xss</code> 下溢出深度也会变浅——这正好印证了栈帧大小和栈容量的关系。
        </p>
        <p>
          再做一组对比：把 <code>dive</code> 写成<strong>互相递归</strong>（a 调 b、b 调 a），SOF 照样发生——
          说明栈溢出看的是「栈帧总数」，与是不是「直接自调用」无关。这也提醒你排查 SOF 时，
          循环依赖、相互递归、JSON 序列化里的双向引用，都是真实的坑点。
        </p>
      </Practice>

      <Summary
        points={[
          '虚拟机栈由栈帧组成，每个线程一个栈；正在执行的方法对应栈顶的当前栈帧。',
          '用栈表达调用-返回是因为它天然后进先出，压栈/弹栈是常数级操作。',
          '栈帧四部分：局部变量表、操作数栈、动态链接、方法返回地址。',
          '局部变量表第 0 个 slot 是 this（静态方法没有），slot 可复用，复用不当会造成回收延迟。',
          '一次方法调用即压入一个栈帧，一次返回即弹出一个栈帧，严格后进先出。',
          'i = i++ 不自增，是因为旧值先被压上操作数栈，最后又写回覆盖了自增结果；i = ++i 则为 1。',
          'StackOverflowError 多因单线程递归太深；OutOfMemoryError 多因线程太多耗尽本地内存。',
          '-Xss 调大缓解递归深的栈溢出，调小反而能创建更多线程；治本是用线程池限制线程数。',
          'HotSpot 不做尾递归优化，深递归务必改迭代；异常的栈轨迹填充很贵，别用异常控流程。',
        ]}
      />
    </>
  )
}

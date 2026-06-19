import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import GcRoots from '@/courses/jvm/illustrations/GcRoots.jsx'

const refCode = `import java.lang.ref.SoftReference;
import java.lang.ref.WeakReference;

public class ReferenceDemo {
    public static void main(String[] args) {
        // 软引用：内存不够时才回收，适合做缓存
        SoftReference<byte[]> soft =
                new SoftReference<>(new byte[10 * 1024 * 1024]);
        System.out.println(soft.get() != null);   // 通常还在

        // 弱引用：只要一次 GC 就会被回收
        WeakReference<Object> weak =
                new WeakReference<>(new Object());
        System.gc();   // 触发一次回收
        System.out.println(weak.get());            // 多半已是 null
    }
}`

const refQueueCode = `import java.lang.ref.*;

// 虚引用 + 引用队列：在对象被回收时收到通知，做善后清理
public class PhantomDemo {
    public static void main(String[] args) throws Exception {
        ReferenceQueue<Object> queue = new ReferenceQueue<>();
        Object obj = new Object();
        PhantomReference<Object> phantom =
                new PhantomReference<>(obj, queue);

        System.out.println(phantom.get()); // 永远是 null

        obj = null;       // 去掉强引用
        System.gc();      // 触发回收

        // 对象被回收后，它的虚引用会被放入 queue，可在此做资源清理
        Reference<?> ref = queue.remove(1000);
        System.out.println("收到回收通知：" + (ref != null));
    }
}`

const leakCode = `// 经典内存泄漏：静态集合无限增长
public class LeakCache {
    // static 字段是 GC Root，它引用的对象永远可达、永不回收
    private static final List<byte[]> CACHE = new ArrayList<>();

    public void handle() {
        // 每次请求都往里塞，却从不清理 —— 老年代只涨不降
        CACHE.add(new byte[1024 * 1024]);
    }
}
// 修复思路：设容量上限、用带过期/淘汰的缓存（如 Caffeine），
// 或用 WeakHashMap 让 key 不再被外部引用时条目自动消失`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          垃圾回收要做的第一件事，不是「怎么回收」，而是「先判断谁是垃圾」。
          一个对象只要还可能被用到，就不能动它；只有确认「再也没人用得到」，才能把它的内存收回去。
          那么 JVM 是怎么判断一个对象「已经死了」的？答案是<em>可达性分析</em>（reachability analysis）。
        </p>
      </Lead>

      <h2>最朴素的思路：引用计数法</h2>
      <p>
        最直觉的办法是给每个对象配一个计数器：有一个地方引用它，计数加一；引用失效，计数减一；
        减到零就说明没人用了，可以回收。这种做法叫<em>引用计数法</em>（reference counting），实现简单、回收及时，
        Python、早期的某些脚本语言都用过它。
      </p>
      <p>
        但 Java 没有采用它，原因是一个致命缺陷：<strong>循环引用</strong>。两个对象互相引用对方，
        哪怕外界已经没有任何地方再用到它们，它俩的计数器也永远不会归零，于是这块内存就永远收不回来，成了泄漏。
      </p>
      <p>
        引用计数法还有两个常被忽略的代价：其一，<strong>每次赋值都要改计数器</strong>，
        引用频繁变动的场景里这笔开销不小，还要保证并发下计数器的原子性；
        其二，回收一个对象时要<strong>递归地</strong>把它引用的对象计数也减一，可能引发连锁回收、产生不可控的停顿。
        所以「实现简单」其实只是表面，真正用到大型托管运行时里，问题一大堆。Python 用它，是因为额外配了
        一个专门处理循环引用的 GC 来打补丁——这恰恰说明引用计数自己搞不定循环引用。
      </p>

      <Example title="两个对象互相引用，却谁都不需要">
        <p>设想 <code>a</code> 和 <code>b</code> 互相持有对方：</p>
        <ul>
          <li><code>a.next = b</code>，于是 <code>b</code> 的计数为 1；</li>
          <li><code>b.next = a</code>，于是 <code>a</code> 的计数为 1；</li>
          <li>随后把外部的 <code>a = null; b = null</code>，外界再也碰不到它们。</li>
        </ul>
        <p>
          此时 <code>a</code> 和 <code>b</code> 的计数都还是 1（彼此撑着对方），引用计数法会认为它们「还活着」，
          于是这两块内存被永久困住。这就是引用计数法解决不了的循环引用问题。
        </p>
      </Example>

      <h2>JVM 的方案：可达性分析</h2>
      <p>
        可达性分析换了个角度：不去数「有多少人引用我」，而是从一组<strong>一定存活</strong>的起点出发，
        顺着引用关系往下走，凡是能走到的对象都判为存活，走不到（不可达）的对象就判为垃圾。
        这组起点叫 <em>GC Roots</em>。把对象想象成一张大网，从 GC Roots 拉一根线，能扯到的就留，扯不到的就丢——
        循环引用的那两个对象虽然互相牵着，但整团都和 GC Roots 断了线，于是一起被判死，缺陷自然消失。
      </p>

      <GcRoots />

      <h3>哪些东西可以当 GC Roots</h3>
      <p>能作为 GC Roots 的，都是「当下正在被使用、不可能是垃圾」的引用入口，常见的有：</p>
      <ul>
        <li><strong>虚拟机栈中的本地变量</strong>：每个线程正在执行的方法里，那些局部变量所引用的对象；</li>
        <li><strong>方法区里的静态变量</strong>：类的 <code>static</code> 字段所引用的对象，类不卸载就一直在；</li>
        <li><strong>方法区里的常量</strong>：比如字符串常量池中的引用；</li>
        <li><strong>本地方法栈中 JNI 引用</strong>：Native 方法持有的对象引用；</li>
        <li>此外还有被同步锁 <code>synchronized</code> 持有的对象、JVM 内部的系统类加载器等。</li>
      </ul>
      <p>
        记住「<strong>static 字段是 GC Root</strong>」这一条尤其重要，它是绝大多数内存泄漏的根源：
        一个不断往里塞东西、却从不清理的静态集合，会让里面所有对象永远可达、永远回收不掉。
      </p>
      <Example title="最常见的内存泄漏：静态集合越长越大">
        <CodeBlock lang="java" title="LeakCache.java" code={leakCode} />
        <p>
          这段代码里 <code>CACHE</code> 是静态的，等于一条永不断开的 GC Root 引用链；
          只要往里 <code>add</code>、不 <code>remove</code>，这些 <code>byte[]</code> 就永远活着、不断晋升到老年代，
          表现就是「Full GC 越来越频繁、老年代占用降不下来」。八成的「线上内存泄漏」最后都查到一个失控的静态容器。
        </p>
      </Example>

      <Callout variant="tip" title="可达性分析也要 STW：三色标记与并发难题">
        <p>
          可达性分析不是一瞬间完成的，遍历整张对象图很耗时。如果遍历期间业务线程还在改引用关系，
          就可能<strong>把活对象误判成垃圾</strong>。学术上用<strong>三色标记</strong>（白/灰/黑）描述这个过程：
          白色未访问、灰色已访问但孩子没处理完、黑色完全处理完。漏标的两个充要条件是
          「黑色对象新指向了白色对象」且「灰色到该白色的所有路径被切断」。
        </p>
        <p>
          解决办法有两类：<strong>增量更新</strong>（记录黑色新增的引用，CMS 用）和
          <strong>原始快照 SATB</strong>（记录被删除的引用，G1 用），靠写屏障把这些变动记下来，
          重新标记阶段再补扫。这就是为什么再「并发」的收集器也躲不开一两次短暂 STW——可达性分析的并发正确性是有代价的。
        </p>
      </Callout>

      <KeyIdea title="可达 ≠ 一定不回收">
        <p>
          可达性只是「是否还连着 GC Roots」的判断，但是否真的要回收，还取决于引用的<strong>强弱</strong>。
          Java 把引用分成四档，强度依次递减：强引用、软引用、弱引用、虚引用——同样是「被引用」，
          回收时机却天差地别。
        </p>
      </KeyIdea>

      <h3>四种引用与回收时机</h3>
      <ul>
        <li>
          <strong>强引用</strong>（strong）：最普通的 <code>Object o = new Object()</code>。
          只要强引用还在，对象<strong>绝不会</strong>被回收，哪怕内存溢出（OOM）也不动它。
        </li>
        <li>
          <strong>软引用</strong>（<em>SoftReference</em>）：内存够用时保留，<strong>内存不足、即将 OOM 时</strong>才回收。
          天生适合做缓存——平时留着，紧张时让路。
        </li>
        <li>
          <strong>弱引用</strong>（<em>WeakReference</em>）：只能活到<strong>下一次 GC</strong>，一旦发生垃圾回收就被清掉，
          常用于 <code>WeakHashMap</code> 这类「键没人用了就让条目自动消失」的场景。
        </li>
        <li>
          <strong>虚引用</strong>（<em>PhantomReference</em>）：最弱，<code>get()</code> 永远返回 <code>null</code>，
          唯一用途是在对象被回收时收到一个通知，配合引用队列做善后（如堆外内存的清理）。
        </li>
      </ul>
      <Example title="虚引用 + 引用队列：怎么收到回收通知">
        <p>
          虚引用最难理解，因为 <code>get()</code> 永远返回 <code>null</code>，它根本不是用来「拿对象」的，
          而是用来「知道对象什么时候被回收」的。配合 <code>ReferenceQueue</code>，对象被回收时它的虚引用会进队列，
          你就能在那一刻做善后——这正是 <code>DirectByteBuffer</code> 用 <code>Cleaner</code> 释放堆外内存的机制。
        </p>
        <CodeBlock lang="java" title="PhantomDemo.java" code={refQueueCode} />
        <p>
          注意四种引用都能配引用队列：软/弱引用进队列时对象已被回收（<code>get()</code> 返回 null），
          这正是 <code>WeakHashMap</code> 清理失效条目的底层依据。
        </p>
      </Example>

      <Callout variant="warn" title="别指望 finalize() 救场">
        <p>
          对象被判不可达后，并不是立刻清掉，而是会先看它有没有重写 <code>finalize()</code> 方法。如果有，
          JVM 会把它放进一个队列，由一个低优先级线程去执行 <code>finalize()</code>——但这个机制<strong>极不可靠</strong>：
        </p>
        <ul>
          <li>执行时机完全不确定，甚至可能<strong>永远不被执行</strong>；</li>
          <li>它运行在一个优先级很低、随时可能被卡住的线程上；</li>
          <li>在 <code>finalize()</code> 里「自救」（重新被 GC Roots 引用）只能成功一次，且代码极易出错。</li>
          <li>有 <code>finalize()</code> 的对象<strong>至少要经历两次 GC</strong> 才能被回收，平白拖慢回收、增大停顿。</li>
        </ul>
        <p>
          所以 <code>finalize()</code> 早已被官方标记为废弃，<strong>千万不要用它来做资源释放</strong>。
          需要确定性清理就用 <code>try-with-resources</code> 或 <code>Cleaner</code>。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Java 怎么判断对象可以回收」，标准答法是：<strong>不是引用计数法，而是可达性分析</strong>。
        先点出引用计数法的循环引用缺陷，再说 JVM 从 GC Roots（栈本地变量、静态变量、常量、JNI 引用）出发做可达性遍历，
        不可达即垃圾。如果面试官追问，再补上四种引用的回收时机，以及 <code>finalize()</code> 不可靠、不要用。
        这样一条线下来，既有「为什么」又有「怎么做」，是很完整的回答。
      </p>
      <p>
        加分追问：<strong>「可达性分析时业务线程在改引用怎么办？」</strong>——讲三色标记的漏标问题，
        以及增量更新（CMS）/ SATB（G1）配合写屏障来修正。
        <strong>「软引用一定能防 OOM 吗？」</strong>——不能完全保证，软引用回收发生在「即将 OOM」时，
        如果对象增长太快、回收赶不上，照样 OOM；而且大量软引用本身会增加 GC 负担，所以缓存更推荐用带容量和过期策略的专门库。
        <strong>「WeakHashMap 适合做缓存吗？」</strong>——它的 key 弱引用一旦外部不再持有就被回收，
        生命周期不可控，做缓存效果差，它更适合「附属信息」这类随 key 共存亡的场景。
      </p>

      <Practice title="动手看软引用与弱引用的差别">
        <p>
          下面这段代码分别用软引用和弱引用持有对象，触发一次 GC 后观察它们各自是否还在。
          软引用在内存充裕时通常仍存活，而弱引用经过一次 GC 多半已被清为 <code>null</code>。
        </p>
        <CodeBlock lang="java" title="ReferenceDemo.java" code={refCode} />
        <p>
          试着把软引用那行的数组改得很大、再用 <code>-Xmx</code> 把堆压到很小，你会看到软引用也开始被回收——
          这正是它「内存不足才让路」的特性。
        </p>
        <p>
          再做一个泄漏实验：把对象不停 <code>add</code> 进一个 <code>static List</code> 并打开 GC 日志，
          会看到老年代占用一路上涨、Full GC 越来越密却降不下去；改用 <code>WeakHashMap</code> 或设上限的缓存后，
          内存曲线立刻恢复健康。这能让你亲手把「static 是 GC Root」和「内存泄漏」这两件事串起来。
        </p>
      </Practice>

      <Summary
        points={[
          '引用计数法简单及时，但解决不了循环引用，且每次赋值都改计数、回收会连锁，所以 Java 不用它。',
          'JVM 用可达性分析：从 GC Roots 出发遍历引用链，不可达的对象判为垃圾。',
          'GC Roots 包括虚拟机栈本地变量、方法区静态变量与常量、本地方法栈的 JNI 引用等。',
          'static 字段是 GC Root，失控的静态集合是最常见的内存泄漏根源。',
          '可达性分析也要并发正确：三色标记的漏标靠写屏障 + 增量更新(CMS)/SATB(G1) 修正，故躲不开短暂 STW。',
          '引用分强、软、弱、虚四档：强引用绝不回收，软引用内存不足才回收，弱引用一次 GC 即回收，虚引用仅用于回收通知。',
          'finalize() 执行时机不确定、可能不执行、还拖慢回收，已废弃，绝不能用它做资源释放，改用 Cleaner / try-with-resources。',
          '面试核心：先否掉引用计数法，再讲 GC Roots 可达性分析，最后补四种引用与三色标记。',
        ]}
      />
    </>
  )
}

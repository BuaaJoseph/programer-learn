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

      <Callout variant="warn" title="别指望 finalize() 救场">
        <p>
          对象被判不可达后，并不是立刻清掉，而是会先看它有没有重写 <code>finalize()</code> 方法。如果有，
          JVM 会把它放进一个队列，由一个低优先级线程去执行 <code>finalize()</code>——但这个机制<strong>极不可靠</strong>：
        </p>
        <ul>
          <li>执行时机完全不确定，甚至可能<strong>永远不被执行</strong>；</li>
          <li>它运行在一个优先级很低、随时可能被卡住的线程上；</li>
          <li>在 <code>finalize()</code> 里「自救」（重新被 GC Roots 引用）只能成功一次，且代码极易出错。</li>
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
      </Practice>

      <Summary
        points={[
          '引用计数法简单及时，但解决不了循环引用，所以 Java 不用它。',
          'JVM 用可达性分析：从 GC Roots 出发遍历引用链，不可达的对象判为垃圾。',
          'GC Roots 包括虚拟机栈本地变量、方法区静态变量与常量、本地方法栈的 JNI 引用等。',
          '引用分强、软、弱、虚四档：强引用绝不回收，软引用内存不足才回收，弱引用一次 GC 即回收，虚引用仅用于回收通知。',
          'finalize() 执行时机不确定、可能不执行，已废弃，绝不能用它做资源释放。',
          '面试核心：先否掉引用计数法，再讲 GC Roots 可达性分析，最后补四种引用的回收时机。',
        ]}
      />
    </>
  )
}

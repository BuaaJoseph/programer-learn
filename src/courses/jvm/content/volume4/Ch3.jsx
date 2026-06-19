import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const loaderTree = `// 类加载器的层级（JDK 8 与 JDK 9+ 命名不同）
// JDK 8
Bootstrap ClassLoader（C++ 实现，加载 jre/lib/rt.jar 等核心类）
   ▲ parent
Extension ClassLoader（加载 jre/lib/ext 下的扩展类）
   ▲ parent
Application ClassLoader（加载 classpath 上的应用类）
   ▲ parent
（自定义 ClassLoader）

// JDK 9+（模块化后）
Bootstrap → Platform ClassLoader → Application ClassLoader`

const refDemo = `import java.lang.ref.SoftReference;
import java.lang.ref.WeakReference;
import java.lang.ref.PhantomReference;
import java.lang.ref.ReferenceQueue;

Object obj = new Object();

// 强引用：只要 strong 还指着，GC 永不回收
Object strong = obj;

// 软引用：内存够就留着，内存不足将被回收（适合做缓存）
SoftReference<Object> soft = new SoftReference<>(new Object());

// 弱引用：只要发生 GC 就被回收（WeakHashMap、ThreadLocal 用它做 key）
WeakReference<Object> weak = new WeakReference<>(new Object());

// 虚引用：取不到对象（get 永远返回 null），仅用于在对象被回收时收到通知
ReferenceQueue<Object> queue = new ReferenceQueue<>();
PhantomReference<Object> phantom = new PhantomReference<>(new Object(), queue);`

export default function Ch3() {
  return (
    <article>
      <Lead>
        这一章收尾「内存与执行」卷，讲两组高频题：<strong>类加载器与双亲委派</strong>（双亲委派在
        卷三已系统讲过，这里以面试问答视角快速回顾并交叉引用，重点放在「为什么」），
        以及<strong>四种引用类型</strong>——强、软、弱、虚。引用类型是面试里区分「背过」和「理解」的分水岭，
        因为它直接关系到缓存设计、ThreadLocal 内存泄漏、堆外内存回收这些实战问题。
      </Lead>

      <h2>一、Java 有哪些类加载器？</h2>
      <p>
        从上到下三（或四）层，每层负责加载不同范围的类：
      </p>
      <table>
        <thead>
          <tr><th>类加载器</th><th>实现</th><th>加载范围</th></tr>
        </thead>
        <tbody>
          <tr><td>启动类加载器（Bootstrap）</td><td>C++（JVM 内部）</td><td>核心类库（rt.jar / lib 下）</td></tr>
          <tr><td>扩展类加载器（Extension，JDK 8）</td><td>Java</td><td>jre/lib/ext 下扩展类</td></tr>
          <tr><td>平台类加载器（Platform，JDK 9+）</td><td>Java</td><td>替代 Extension，加载平台模块</td></tr>
          <tr><td>应用类加载器（Application）</td><td>Java</td><td>classpath 上的应用类</td></tr>
          <tr><td>自定义类加载器</td><td>用户</td><td>按需（热部署、加密、隔离等）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="text" title="类加载器层级" code={loaderTree} />
      <Callout variant="tip" title="Bootstrap 取不到？这是个坑">
        启动类加载器是 C++ 写在 JVM 里的，在 Java 代码里通过 <code>getClassLoader()</code> 拿到的是
        <code>null</code>。所以核心类（如 <code>String</code>）的 <code>getClassLoader()</code> 返回 null，
        不代表「没有加载器」，而是它由 Bootstrap 加载、在 Java 层无法表示。
      </Callout>

      <h2>二、双亲委派模型（回顾）</h2>
      <p>
        这部分在<strong>卷三「双亲委派模型」</strong>里已系统讲解过，这里以面试问答视角速记，细节请回看卷三。
      </p>
      <KeyIdea>
        双亲委派：类加载器收到加载请求时，<strong>先把请求委派给父加载器</strong>，一层层向上，
        直到 Bootstrap；只有当父加载器表示「我加载不了」时，子加载器才自己尝试加载。
        核心目的有二：① <strong>保证核心类安全</strong>——你自己写一个 <code>java.lang.String</code>
        也加载不了，因为请求会被一路上交给 Bootstrap，由它加载真正的核心类；
        ② <strong>避免类重复加载</strong>——同一个类只会被同一个加载器加载一次。
      </KeyIdea>
      <p>
        追问点：<strong>怎么打破双亲委派？</strong>典型有三种场景——① 重写 <code>loadClass()</code>
        （如 Tomcat 为 Web 应用做类隔离，优先自己加载）；② 线程上下文类加载器
        （SPI 机制如 JDBC，让 Bootstrap 加载的核心类能反向调用应用类加载器加载的实现）；
        ③ OSGi 的网状加载模型。这些是「为什么要打破」的好谈资。
      </p>
      <p>
        还有一个判等追问：<strong>两个类相等的前提是什么？</strong>不仅类的全限定名相同，
        还必须是<strong>同一个类加载器加载</strong>的。同一份字节码被两个不同加载器加载，
        在 JVM 里就是两个不同的类，互相 <code>instanceof</code> 会是 false——这是类隔离能成立的根基。
      </p>

      <h2>三、四种引用：强、软、弱、虚</h2>
      <p>
        Java 把引用按「与 GC 的关系强弱」分成四档。强度依次递减，被回收的「容易程度」依次递增。
        这是面试里最能拉开差距的一组概念。
      </p>
      <table>
        <thead>
          <tr><th>引用类型</th><th>回收时机</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td>强引用 Strong</td><td>永不回收（只要可达）</td><td>普通 new 出的对象，最常见</td></tr>
          <tr><td>软引用 Soft</td><td>内存不足时回收</td><td>内存敏感的缓存</td></tr>
          <tr><td>弱引用 Weak</td><td>下次 GC 即回收</td><td>WeakHashMap、ThreadLocal 的 key</td></tr>
          <tr><td>虚引用 Phantom</td><td>随时可能被回收，仅作回收通知</td><td>管理堆外内存、对象回收跟踪</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="四种引用的创建" code={refDemo} />

      <h3>强引用（Strong Reference）</h3>
      <p>
        最普通的引用，<code>{'Object o = new Object()'}</code> 里的 <code>o</code> 就是强引用。
        只要强引用还在（对象可达），GC 宁可抛 OOM 也<strong>绝不回收</strong>它。
        内存泄漏的本质往往就是：本该释放的对象还被某个强引用（如静态集合）拉着不放。
      </p>

      <h3>软引用（Soft Reference）</h3>
      <p>
        「内存够就留着，内存不足就回收」。这种「可有可无、内存紧张时优先牺牲」的语义，
        天生适合做<strong>缓存</strong>：缓存命中能省计算，内存不够时被回收也不影响正确性，最多重算一次。
      </p>
      <Example title="软引用做缓存">
        <p>
          用 <code>{'SoftReference<Bitmap>'}</code> 缓存大图：内存充裕时图片留在缓存命中复用；
          内存吃紧、即将 OOM 时，GC 会先回收这些软引用对象腾出空间，避免应用崩溃。
          代价是下次用到要重新加载。这是「在 OOM 边缘自动降级」的经典手法。
        </p>
      </Example>

      <h3>弱引用（Weak Reference）</h3>
      <p>
        比软引用更弱：<strong>只要发生 GC，无论内存是否充足，弱引用指向的对象都会被回收</strong>。
        最经典的应用是 <code>WeakHashMap</code> 和 <code>ThreadLocal</code>：它们用弱引用做 key，
        当外部不再强引用这个 key 时，GC 能自动清掉对应条目，避免内存堆积。
      </p>
      <Callout variant="warn" title="ThreadLocal 内存泄漏的真相">
        <code>ThreadLocal</code> 内部的 <code>Entry</code> 用<strong>弱引用持有 key（ThreadLocal 对象本身）</strong>，
        但 <strong>value 是强引用</strong>。当 ThreadLocal 被回收后，key 变 null，value 却仍被线程的
        ThreadLocalMap 强引用着——若线程长期存活（如线程池），value 就泄漏了。
        所以用完务必 <code>remove()</code>。这是高频深挖题。
      </Callout>

      <h3>虚引用（Phantom Reference）</h3>
      <p>
        最弱的引用。它<strong>无法通过 <code>get()</code> 拿到对象</strong>（永远返回 null），
        唯一作用是：当它指向的对象被 GC 回收时，能收到一个<strong>通知</strong>
        （虚引用会被放入构造时关联的 <code>ReferenceQueue</code>）。
      </p>
      <p>
        它的实战意义是做<strong>对象被回收后的清理工作</strong>。最典型的就是上一章讲过的
        <code>DirectByteBuffer</code>：堆外内存无法靠 GC 直接回收，于是用虚引用（Cleaner 机制）
        在堆内的引用对象被回收时收到通知，再去释放对应的堆外内存。可以理解为比
        <code>finalize()</code> 更可控、更安全的「析构」替代方案。
      </p>
      <Callout variant="tip" title="为什么不用 finalize 做清理">
        <code>finalize()</code> 的执行时机完全不确定（由 GC 决定，甚至可能永远不执行），
        还会让对象「多活一轮」、拖慢回收，异常被吞掉也难排查。虚引用 + <code>ReferenceQueue</code>
        把「对象已被回收」这一事实<strong>主动推给你处理</strong>，时机和异常都可控，所以现代 JDK
        全面用 <code>Cleaner</code>（基于虚引用）取代了 <code>finalize</code>。这是个加分追问点。
      </Callout>

      <h3>ReferenceQueue：软/弱/虚引用的「回收回执」</h3>
      <p>
        软、弱、虚引用都可以在构造时关联一个 <code>ReferenceQueue</code>。当引用指向的对象被回收后，
        这个 <code>Reference</code> 对象本身会被<strong>放进队列</strong>。于是你可以起一个线程不断
        <code>poll</code> 这个队列，每取到一个就知道「对应的对象已经没了」，从而做后续清理
        （如从映射里删掉那条失效的 entry）。<code>WeakHashMap</code> 内部正是用这套机制清理过期 key 的。
      </p>
      <Example title="为什么 WeakHashMap 能自动清理">
        <p>
          <code>WeakHashMap</code> 的 key 是弱引用，并关联了内部的 <code>ReferenceQueue</code>。
          当某个 key 在外部不再被强引用、被 GC 回收后，对应的弱引用进入队列；下次对 map 做
          <code>get/put/size</code> 等操作时，它会顺手 <code>poll</code> 队列、删掉这些已失效的 entry——
          这就是它「key 没人用了，条目自动消失」的实现原理，也是「用弱引用做规范映射 key」的范本。
        </p>
      </Example>

      <h2>四、四种引用横向对比</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>强</th><th>软</th><th>弱</th><th>虚</th></tr>
        </thead>
        <tbody>
          <tr><td>GC 是否回收</td><td>否</td><td>内存不足时</td><td>每次 GC</td><td>每次 GC</td></tr>
          <tr><td>get() 能否取到</td><td>能</td><td>能（未回收时）</td><td>能（未回收时）</td><td>不能（恒 null）</td></tr>
          <tr><td>是否配 Queue</td><td>无</td><td>可选</td><td>可选</td><td>必须</td></tr>
          <tr><td>用途</td><td>普通对象</td><td>内存敏感缓存</td><td>规范映射 key</td><td>回收通知 / 堆外清理</td></tr>
        </tbody>
      </table>

      <Callout variant="tip" title="一句话串联">
        从强到虚，是「对 GC 的抵抗力」一路递减：强引用拼死不放，软引用内存紧张才松手，
        弱引用一遇 GC 就走，虚引用连对象都看不见、只为了知道对象「走了」好做善后。
      </Callout>

      <h2>五、引用类型的实战选择</h2>
      <p>
        面试官常追问「什么时候该用哪种引用」。给一个可直接复述的判断框架：
      </p>
      <ul>
        <li><strong>默认用强引用</strong>：99% 的业务对象都是强引用，不要无脑套软/弱引用，那只会让逻辑变复杂、对象意外消失。</li>
        <li><strong>做缓存且能接受丢失</strong>：用软引用——内存紧张时自动让路，避免缓存把内存撑爆引发 OOM。但更推荐用成熟的缓存库（带容量上限和过期策略），软引用的回收时机不可控、易抖动。</li>
        <li><strong>做「附属信息映射」</strong>：key 的生命周期不该被这张表延长时，用弱引用做 key（WeakHashMap）。典型如「给某对象挂一些元数据，对象没了元数据也该没」。</li>
        <li><strong>管理堆外资源</strong>：用虚引用 + Cleaner，在对象回收时释放本地内存/句柄，替代不可靠的 finalize。</li>
      </ul>
      <Callout variant="warn" title="软引用做缓存的坑">
        软引用缓存看着美好，实战却常翻车：它的回收完全由 JVM 在「内存不足」时统一触发，
        可能一次性把整个缓存清空，导致缓存命中率剧烈抖动、瞬间大量回源。生产里更稳妥的是用
        Caffeine/Guava 这类带<strong>明确容量与过期策略</strong>的缓存，把回收时机攥在自己手里。
      </Callout>

      <Summary
        points={[
          '类加载器分 Bootstrap（C++，getClassLoader 返回 null）、Extension/Platform、Application 三层，外加自定义加载器。',
          '双亲委派（详见卷三）：先委派父加载器，目的是保证核心类安全 + 避免重复加载；可通过重写 loadClass、线程上下文加载器、OSGi 打破。',
          '两个类相等需「全限定名相同 + 同一加载器」，这是类隔离的根基。',
          '四种引用强度递减：强引用永不回收；软引用内存不足时回收，适合缓存。',
          '弱引用每次 GC 即回收，用于 WeakHashMap、ThreadLocal 的 key；ThreadLocal 的 value 是强引用，用完要 remove 防泄漏。',
          '虚引用 get 恒为 null，仅配合 ReferenceQueue 做回收通知，典型用于 DirectByteBuffer 堆外内存的 Cleaner 清理。',
        ]}
      />
    </article>
  )
}

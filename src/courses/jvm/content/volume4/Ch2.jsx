import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const flow = `// 一段 Java 代码从源码到运行的完整流程
Hello.java
   │  javac（编译期）
   ▼
Hello.class（字节码，平台无关）
   │  类加载子系统：加载 → 验证 → 准备 → 解析 → 初始化
   ▼
方法区里的 Class 元信息
   │  执行引擎
   ├── 解释器：逐条把字节码翻译成机器指令执行（启动快）
   └── JIT：把热点方法/循环整体编译成本地机器码并缓存（运行快）
   ▼
操作系统 / CPU 执行`

const escapeDemo = `// 逃逸分析：sb 没有逃出方法，JIT 可优化
public String concat(String a, String b) {
    StringBuilder sb = new StringBuilder(); // 未逃逸：仅在本方法内使用
    sb.append(a).append(b);
    return sb.toString();                   // 返回的是 String，sb 本身没逃逸
}

// 对比：this 逃逸 / 返回内部对象 = 发生逃逸，无法做栈上分配等优化
public StringBuilder leak() {
    StringBuilder sb = new StringBuilder();
    return sb;                              // sb 被返回，逃逸到方法外
}`

const jitArgs = `# JIT / 编译相关常用参数
-XX:+TieredCompilation        # 分层编译（默认开启，C1+C2 协同）
-XX:CompileThreshold=10000    # 方法调用计数达到此阈值触发 JIT（非分层时）
-XX:+PrintCompilation         # 打印哪些方法被 JIT 编译
-XX:ReservedCodeCacheSize=256m# Code Cache 大小（JIT 编译产物存放处）
-XX:+DoEscapeAnalysis         # 启用逃逸分析（默认开启）
-XX:+EliminateAllocations     # 标量替换（逃逸分析的后续优化，默认开启）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        执行引擎是 JVM 里「真正干活」的部分，也是面试从「Java 为什么能跨平台」一路问到
        「JIT 编译的代码存哪、什么是逃逸分析」的高频区。这一章按提问顺序逐题展开：
        先讲清跨平台的本质，再辨析解释执行与编译执行、JIT 与 AOT 的区别，
        最后讲逃逸分析与它带来的三大优化，以及 PLAB 这个容易被忽略的小点。
      </Lead>

      <h2>一、Java 是如何实现跨平台的？</h2>
      <p>
        一句话结论：<strong>靠中间字节码 + 各平台各自的 JVM</strong>。Java 源码先被 <code>javac</code>
        编译成与平台无关的<strong>字节码（.class）</strong>，这份字节码在哪都一样；
        而每个操作系统平台都有一个对应的 JVM 实现，由它负责把字节码翻译成本机的机器指令。
      </p>
      <KeyIdea>
        跨平台的关键不是 Java 语言本身，而是<strong>「字节码这一层抽象 + 平台相关的 JVM」</strong>。
        所以人们说「Write Once, Run Anywhere」，准确说是「字节码一次编译，靠各平台的 JVM 到处运行」。
        跨平台的成本被转移到了 JVM 厂商身上——他们为每个平台写一个 JVM。
      </KeyIdea>
      <p>
        引申追问：那 JVM 本身跨平台吗？不跨。Windows 的 JVM 和 Linux 的 JVM 是两个不同的本地程序。
        跨平台的是<strong>你的字节码</strong>，不是 JVM。另外字节码不仅服务 Java，Kotlin、Scala、Groovy
        都编译成 JVM 字节码，所以它们也能跑在 JVM 上，这是「语言无关性」。
      </p>

      <h2>二、编译执行 vs 解释执行，JVM 用哪种？</h2>
      <p>
        这是个「都用，看场景」的题，回答要点出 JVM 的<strong>混合模式</strong>。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>解释执行</th><th>编译执行（JIT）</th></tr>
        </thead>
        <tbody>
          <tr><td>方式</td><td>逐条把字节码翻译成机器码并立即执行</td><td>把整段热点代码一次性编译成本地机器码再执行</td></tr>
          <tr><td>启动速度</td><td>快，无需等待编译</td><td>慢，要先花时间编译</td></tr>
          <tr><td>运行速度</td><td>慢，每次都要翻译</td><td>快，编译产物可重复执行</td></tr>
          <tr><td>内存</td><td>省</td><td>需要 Code Cache 存编译结果</td></tr>
        </tbody>
      </table>
      <p>
        HotSpot 默认是<strong>混合模式（mixed mode）</strong>：程序刚启动时用<strong>解释器</strong>快速跑起来，
        同时统计哪些方法/循环是「热点」；一旦某段代码足够热，就交给 <strong>JIT</strong> 编译成机器码缓存，
        之后直接执行机器码。这样兼顾了「启动快」和「跑得久之后快」。
      </p>
      <CodeBlock lang="text" title="一段 Java 代码的完整执行流程" code={flow} />

      <h2>三、JIT 是什么？编译后的代码存哪？</h2>
      <p>
        JIT（Just-In-Time，即时编译）在运行期把热点字节码编译成本地机器码。HotSpot 有两个编译器：
        <strong>C1（Client）</strong>编译快、优化轻；<strong>C2（Server）</strong>编译慢但优化重。
        现代 JDK 默认开启<strong>分层编译（Tiered Compilation）</strong>，先用 C1 快速编译并收集运行数据，
        再用 C2 对最热的代码做深度优化。
      </p>
      <KeyIdea>
        JIT 编译产物存放在 JVM 的一块专门区域：<strong>Code Cache（代码缓存）</strong>。
        它在本地内存里，由 <code>-XX:ReservedCodeCacheSize</code> 控制大小。
        如果 Code Cache 满了，JIT 会停止编译，程序退回解释执行，性能骤降——这是个隐蔽的生产问题。
      </KeyIdea>
      <p>
        怎么判定「热点」？两种计数器：<strong>方法调用计数器</strong>（方法被调用多少次）和
        <strong>回边计数器</strong>（循环体回跳多少次，用于发现热点循环，触发 OSR 栈上替换编译）。
        超过阈值就提交编译请求。
      </p>
      <CodeBlock lang="bash" title="JIT 相关参数" code={jitArgs} />

      <h2>四、AOT 又是什么？和 JIT 有何不同？</h2>
      <p>
        AOT（Ahead-Of-Time，提前编译）是在<strong>程序运行之前</strong>就把字节码编译成机器码，
        而不是运行期。最有代表性的是 GraalVM Native Image，它能把 Java 程序打包成一个
        不依赖 JVM 的本地可执行文件。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>JIT（运行期编译）</th><th>AOT（提前编译）</th></tr>
        </thead>
        <tbody>
          <tr><td>编译时机</td><td>运行时，按热点动态编译</td><td>构建/部署前，静态编译</td></tr>
          <tr><td>启动速度</td><td>慢（要预热）</td><td>极快（无需预热，毫秒级启动）</td></tr>
          <tr><td>峰值性能</td><td>高（能用运行期信息深度优化）</td><td>通常略低（缺乏运行期反馈）</td></tr>
          <tr><td>典型场景</td><td>长时间运行的服务</td><td>Serverless、CLI、短生命周期程序</td></tr>
        </tbody>
      </table>
      <p>
        所以 AOT 牺牲了一点峰值性能，换来了极快的启动和更低的内存占用，特别适合云原生里
        「快速冷启动、短命」的函数计算场景。JIT 则在「跑得久」的服务里靠运行期信息做更激进的优化反超。
      </p>

      <h2>五、什么是逃逸分析？它能带来哪些优化？</h2>
      <p>
        逃逸分析（Escape Analysis）是 JIT 的一项分析技术：判断一个对象的<strong>作用域是否「逃出」了
        创建它的方法或线程</strong>。如果一个对象只在方法内部使用、没有被返回、没有被赋给外部变量，
        那它就「没有逃逸」，JVM 就能做一系列优化。
      </p>
      <CodeBlock lang="java" title="逃逸 vs 未逃逸" code={escapeDemo} />
      <p>基于逃逸分析，可以做三种优化：</p>
      <ul>
        <li><strong>栈上分配</strong>：未逃逸的对象可以直接分配在栈帧上，随方法返回自动销毁，
          减轻堆和 GC 的压力。</li>
        <li><strong>标量替换</strong>（<code>EliminateAllocations</code>）：把对象拆成一个个独立的标量字段，
          压根不创建对象，直接用局部变量表示这些字段——这是 HotSpot 里逃逸分析真正落地的主要形式。</li>
        <li><strong>锁消除</strong>（<code>EliminateLocks</code>）：如果加锁的对象不会被其他线程访问（未线程逃逸），
          那这个同步就是多余的，JIT 会直接把锁去掉。</li>
      </ul>
      <Callout variant="tip" title="为什么说 HotSpot 没有真正的栈上分配">
        严格来说，HotSpot 并未实现纯粹的「栈上分配对象」，而是通过<strong>标量替换</strong>达到等效效果——
        把未逃逸对象的字段直接当作局部标量处理，相当于对象「不存在」了。面试这么答更准确。
      </Callout>

      <h2>六、什么是 PLAB？和 TLAB 有什么关系？</h2>
      <p>
        PLAB（Promotion Local Allocation Buffer，晋升本地分配缓冲）是 GC 在<strong>对象晋升时</strong>用的缓冲。
        回忆上一章的 TLAB——那是<strong>应用线程在 Eden 分配新对象</strong>时的私有缓冲；
        而 PLAB 是 <strong>GC 工作线程在把对象从新生代复制/晋升到老年代时</strong>，
        每个 GC 线程在老年代里申请的私有缓冲。
      </p>
      <table>
        <thead>
          <tr><th></th><th>TLAB</th><th>PLAB</th></tr>
        </thead>
        <tbody>
          <tr><td>使用者</td><td>应用线程</td><td>GC 工作线程</td></tr>
          <tr><td>时机</td><td>分配新对象</td><td>对象晋升 / 复制</td></tr>
          <tr><td>位置</td><td>Eden</td><td>晋升的目标区（如老年代 / Survivor）</td></tr>
          <tr><td>目的</td><td>减少分配竞争</td><td>减少并行 GC 时的复制竞争</td></tr>
        </tbody>
      </table>
      <p>
        两者目的一致：<strong>用线程私有缓冲消除并发分配/复制时的同步开销</strong>。
        多线程并行 GC 时，多个 GC 线程同时往老年代搬对象，如果没有 PLAB 就会在分配指针上激烈竞争。
      </p>

      <h2>七、把整个执行流程串起来</h2>
      <Example title="一行 System.out.println 经历了什么">
        <p>
          源码 <code>{'System.out.println("hi")'}</code> 被 javac 编成字节码里的若干指令；运行时类加载器把
          相关类加载进方法区；解释器开始逐条执行字节码，若这段代码反复执行成为热点，JIT 把它编译进
          Code Cache；逃逸分析发现某些临时对象未逃逸则做标量替换；最终 CPU 执行的是本地机器指令。
          一条语句，串起了编译、加载、解释、即时编译、运行期优化全过程。
        </p>
      </Example>

      <Callout variant="warn" title="易错点汇总">
        ① 跨平台的是字节码不是 JVM；② JVM 是「解释+JIT 混合模式」，不是纯解释或纯编译；
        ③ JIT 产物存 Code Cache，满了会退回解释执行；④ HotSpot 的逃逸优化主要靠标量替换而非真正的栈上分配；
        ⑤ TLAB 给应用线程分配用，PLAB 给 GC 晋升用，别混。
      </Callout>

      <Summary
        points={[
          'Java 跨平台＝平台无关的字节码 + 各平台各自的 JVM；跨平台的是字节码，JVM 本身不跨平台。',
          'JVM 默认混合模式：解释器保证启动快，JIT 把热点代码编译成机器码保证长期运行快。',
          'JIT 有 C1/C2，默认分层编译；编译产物存在 Code Cache，满了会停止编译退回解释执行。',
          'AOT 在运行前静态编译（如 GraalVM Native Image），启动极快、内存低，但峰值性能通常略逊于 JIT。',
          '逃逸分析判断对象是否逃出方法/线程，据此做栈上分配、标量替换、锁消除三类优化。',
          'PLAB 是 GC 线程晋升对象时的私有缓冲，与应用线程分配用的 TLAB 对应，都为消除并发竞争。',
        ]}
      />
    </article>
  )
}

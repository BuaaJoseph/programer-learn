import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const helloSnippet = `// Hello.java —— 源代码
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, JVM!");
    }
}`

const compileRunSnippet = `# 1) 编译：源码 .java -> 字节码 .class（与平台无关）
javac Hello.java        # 产出 Hello.class

# 2) 运行：JVM 加载并解释/JIT 执行字节码
java Hello              # 输出 Hello, JVM!

# 查看字节码（反汇编），看看 .class 里到底是什么
javap -c Hello`

const bytecodeSnippet = `// javap -c 反汇编 main 方法后大致是这样（节选）：
public static void main(java.lang.String[]);
  Code:
     0: getstatic     #7   // Field System.out:Ljava/io/PrintStream;
     3: ldc           #13  // String Hello, JVM!
     5: invokevirtual #15  // Method PrintStream.println:(Ljava/lang/String;)V
     8: return`

const jvmLayerSnippet = `层级关系（包含与被包含）：

JDK  =  JRE  +  开发工具（javac / javap / jdb / jar ...）
JRE  =  JVM  +  核心类库（java.lang / java.util / java.io ...）
JVM  =  字节码的执行引擎（类加载 + 解释器 + JIT + GC + 运行时数据区）

只想运行 .class：理论上 JRE 就够（JDK 9 起官方不再单独发 JRE，用 jlink 裁剪）
要编译写代码：必须装 JDK`

export default function Ch1() {
  return (
    <article>
      <Lead>
        要把 Java 的面试答得有底气，第一步不是背 API，而是先把「语言、平台、虚拟机」三者的关系彻底理顺。
        本章用面试题串讲的方式，把 Java 的核心优势、JDK/JRE/JVM 的层次、字节码与「一次编写到处运行」的真相、
        常用 JDK 工具，以及 Java 与 Go 的取舍一次讲透。这些是后面所有章节的地基。
      </Lead>

      <h2>一、语言与平台：先建立全局心智图</h2>
      <KeyIdea>
        Java 既是一门<strong>编程语言</strong>，也是一个<strong>运行平台</strong>。源代码先被
        <code>javac</code> 编译成与机器无关的<strong>字节码</strong>（.class），再交给安装在各操作系统上的
        JVM 去执行。「跨平台」靠的不是源代码到处都能编译，而是同一份字节码能被不同平台的 JVM 解释执行。
      </KeyIdea>
      <CodeBlock lang="java" title="一个最小的 Java 程序" code={helloSnippet} />
      <CodeBlock lang="bash" title="从源码到运行：两步走" code={compileRunSnippet} />

      <h3>面试题 1：Java 有哪些核心优势，为什么这么流行？</h3>
      <p>
        这道题别只答「跨平台」一个词。我会把 Java 的优势拆成五条，每条都说清「它解决了什么痛点」：
      </p>
      <table>
        <thead>
          <tr><th>优势</th><th>它解决的问题</th></tr>
        </thead>
        <tbody>
          <tr><td>跨平台（WORA）</td><td>编译一次产出字节码，任意装了 JVM 的系统都能跑，免去为每个平台单独编译。</td></tr>
          <tr><td>自动内存管理</td><td>有垃圾回收（GC），开发者基本不用手动 <code>free</code>，大幅降低内存泄漏与悬垂指针风险。</td></tr>
          <tr><td>强类型 + 面向对象</td><td>编译期就能抓住大量类型错误，OOP 让大型系统易于建模与维护。</td></tr>
          <tr><td>成熟生态</td><td>Spring、Netty、Hadoop 等海量框架与中间件，企业级场景几乎都有现成轮子。</td></tr>
          <tr><td>稳定与向后兼容</td><td>语言演进谨慎、向后兼容性好，老代码升级 JDK 大多能平滑过渡，适合长期维护的系统。</td></tr>
        </tbody>
      </table>
      <p>
        一句话收尾：Java 的流行不是因为它「最快」或「最优雅」，而是因为它在<strong>工程可维护性、生态完整度、
        运行稳定性</strong>三者之间取得了极好的平衡，恰好命中企业级后端最看重的诉求。
      </p>
      <Callout variant="tip" title="面试追问：Java 是编译型还是解释型？">
        标准答案是「<strong>既编译也解释</strong>」。<code>javac</code> 先把源码编译成字节码（编译过程），
        运行时 JVM 先解释执行字节码，对热点代码再由 JIT 即时编译成本地机器码（解释 + 编译）。
        所以说它是「编译与解释结合」的语言最准确。
      </Callout>

      <h2>二、JDK、JRE、JVM 三者关系</h2>
      <h3>面试题 2：JDK、JRE、JVM 分别是什么，关系如何？</h3>
      <p>
        这是必考题，关键是把「包含关系」说清楚，而不是分别背三段定义。我喜欢用一句话框住：
        <strong>JDK 包含 JRE，JRE 包含 JVM</strong>，越往里越底层。
      </p>
      <CodeBlock lang="text" title="JDK / JRE / JVM 的层次关系" code={jvmLayerSnippet} />
      <ul>
        <li><strong>JVM（Java Virtual Machine）</strong>：字节码的执行引擎，负责类加载、解释执行、JIT 编译、垃圾回收，是「跨平台」的真正落点——不同平台有不同的 JVM 实现，但都能跑同一份字节码。</li>
        <li><strong>JRE（Java Runtime Environment）</strong>：运行环境 = JVM + 核心类库（如 <code>java.lang</code>、<code>java.util</code>）。只想运行别人编译好的程序，理论上有 JRE 就够。</li>
        <li><strong>JDK（Java Development Kit）</strong>：开发工具包 = JRE + 编译器和调试等工具（<code>javac</code>、<code>javap</code>、<code>jar</code>、<code>jdb</code>）。写代码、编译，必须装 JDK。</li>
      </ul>
      <Callout variant="note" title="JDK 9 起的变化">
        从 JDK 9 开始，官方不再单独提供独立的 JRE 安装包，而是引入模块系统与 <code>jlink</code>，
        让你按需裁剪出一个只含所需模块的精简运行时。所以「装 JRE 就能跑」在新版本里更多是
        「用 jlink 打一个自定义运行时」。面试时点出这一变化是加分项。
      </Callout>

      <h2>三、字节码与「一次编写，到处运行」</h2>
      <h3>面试题 3：什么是字节码？跨平台到底是怎么实现的？</h3>
      <p>
        字节码（bytecode）是 <code>javac</code> 编译产出的、保存在 .class 文件里的中间指令序列。
        它不是某个具体 CPU 的机器码，而是<strong>面向 JVM 这台「虚拟机器」的指令集</strong>——
        指令都很简短（多数一字节操作码，故名 byte-code），基于操作数栈而非寄存器。
      </p>
      <CodeBlock lang="text" title="javap -c 看到的字节码指令（节选）" code={bytecodeSnippet} />
      <p>
        跨平台的链路是这样的：源码 <code>.java</code> 经 <code>javac</code> 编译成<strong>同一份</strong>与平台无关的
        <code>.class</code> 字节码；运行时，目标平台上的 JVM 负责把字节码翻译成<strong>当前 CPU/OS</strong>能执行的机器指令。
        换句话说，<strong>平台差异被 JVM 这一层吸收了</strong>。所以严格说，「跨平台」的是字节码与 JVM 规范，而 JVM 本身是「不跨平台」的——
        每个平台都得有自己的 JVM 实现。
      </p>
      <Example title="为什么是字节码而不是直接编译成机器码？">
        <p>
          若直接编译成机器码，那一份产物只能在一种 CPU 架构上跑，换平台就得重编。
          引入字节码这一<strong>中间层</strong>，相当于约定了一套「虚拟 CPU」的指令，
          编译器只面向这套虚拟指令，把「适配真实硬件」的脏活留给各平台的 JVM。
          这就是经典的「加一个中间层解决兼容性问题」的工程思路。
        </p>
      </Example>
      <Callout variant="warn" title="易错点：字节码不等于机器码">
        别把字节码说成「机器码」。字节码运行时仍需 JVM 翻译；只有经 JIT 编译后的热点代码，
        才会变成可直接执行的本地机器码并被缓存复用。这也是 Java「越跑越快」的原因之一。
      </Callout>

      <h2>四、常用 JDK 工具</h2>
      <h3>面试题 4：你常用哪些 JDK 自带的命令行工具？</h3>
      <p>
        这道题考的是「动手经验」。除了 <code>javac</code> 和 <code>java</code>，下面这些工具能体现你是否真的排查过线上问题：
      </p>
      <table>
        <thead>
          <tr><th>工具</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td><code>javac</code></td><td>编译器，把 .java 编成 .class。</td></tr>
          <tr><td><code>java</code></td><td>启动 JVM 运行字节码。</td></tr>
          <tr><td><code>javap</code></td><td>反汇编 .class，查看字节码与方法签名，分析编译结果。</td></tr>
          <tr><td><code>jar</code></td><td>打包/解包 jar 文件。</td></tr>
          <tr><td><code>jps</code></td><td>列出当前所有 Java 进程及其 PID。</td></tr>
          <tr><td><code>jstack</code></td><td>打印线程栈快照，排查死锁、线程卡死。</td></tr>
          <tr><td><code>jmap</code> / <code>jhat</code></td><td>导出堆内存快照（heap dump）、分析对象分布，排查内存泄漏。</td></tr>
          <tr><td><code>jstat</code></td><td>监控 GC、类加载、JIT 等运行时统计。</td></tr>
          <tr><td><code>jconsole</code> / <code>jvisualvm</code></td><td>图形化监控 JVM（CPU、内存、线程、GC）。</td></tr>
          <tr><td><code>jcmd</code></td><td>统一的诊断入口，可触发 dump、查看标志、运行飞行记录等。</td></tr>
          <tr><td><code>jlink</code> / <code>jdeps</code></td><td>JDK 9+ 模块时代：裁剪自定义运行时、分析依赖。</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="面试加分：把工具串成一条排查链">
        线上 CPU 飙高怎么查？答出一条链最有说服力：<code>jps</code> 找进程 →
        <code>top -Hp pid</code> 找高 CPU 线程 → 把线程 ID 转成 16 进制 →
        <code>jstack pid</code> 里搜这个 nid，定位到具体卡在哪段代码。内存问题则换成
        <code>jmap</code> 导堆 + 工具分析。这样答比单纯罗列工具名强得多。
      </Callout>

      <h2>五、Java 与 Go 的对比与取舍</h2>
      <h3>面试题 5：Java 和 Go 怎么选？各自适合什么场景？</h3>
      <p>
        这类对比题别站队，要讲清「定位不同，各有所长」。两者都是带 GC 的强类型语言，但设计哲学差很多：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Java</th><th>Go</th></tr>
        </thead>
        <tbody>
          <tr><td>运行方式</td><td>编译成字节码，跑在 JVM 上（JIT 优化）</td><td>直接编译成单一本地可执行文件，无虚拟机</td></tr>
          <tr><td>并发模型</td><td>线程 + 线程池（重）；近年有虚拟线程（Project Loom）</td><td>goroutine + channel，轻量协程是语言核心</td></tr>
          <tr><td>启动与内存</td><td>JVM 预热慢、内存占用偏高</td><td>启动快、内存占用小，适合容器/Serverless</td></tr>
          <tr><td>语法与抽象</td><td>面向对象、泛型、注解、生态丰富</td><td>刻意简洁，语言特性少，组合优于继承</td></tr>
          <tr><td>生态</td><td>企业级框架、中间件极其成熟（Spring 等）</td><td>云原生、CLI、网络服务（Docker/K8s 用 Go 写）</td></tr>
          <tr><td>典型场景</td><td>大型企业后端、金融、复杂业务系统</td><td>云原生组件、高并发网关、微服务、运维工具</td></tr>
        </tbody>
      </table>
      <p>
        总结成一句话：要写<strong>复杂业务、依赖成熟框架、团队规模大</strong>的长期系统，Java 的工程化与生态优势明显；
        要写<strong>启动快、资源省、高并发网络</strong>的云原生组件，Go 的轻量协程与单文件部署更顺手。
        两者不是替代关系，而是各自占据不同生态位。
      </p>
      <Callout variant="note" title="面试追问：Go 没有 JVM，那它跨平台吗？">
        Go 靠交叉编译实现跨平台——同一份源码可在编译时指定目标平台（<code>GOOS</code>/<code>GOARCH</code>），
        直接产出对应平台的本地可执行文件。它是「编译期跨平台」，而 Java 是「运行期靠 JVM 跨平台」，
        两条路线的取舍正好相反：Go 把适配放在编译，Java 把适配放在运行。
      </Callout>

      <h3>面试题 6：什么是 JIT？它让 Java「越跑越快」是什么意思？</h3>
      <p>
        JIT（Just-In-Time，即时编译器）是 JVM 里的关键优化部件。程序刚启动时，JVM 先<strong>解释执行</strong>字节码
        （快速启动但慢）；运行中，JVM 会统计哪些方法/循环是<strong>热点（被频繁执行）</strong>，
        把它们<strong>即时编译成本地机器码</strong>并缓存复用，之后这些热点就以接近原生的速度运行。
      </p>
      <ul>
        <li><strong>解释执行</strong>：逐条翻译字节码，启动快、峰值慢。</li>
        <li><strong>JIT 编译</strong>：把热点代码编成机器码，启动有预热成本、但峰值快。</li>
        <li><strong>混合模式</strong>：HotSpot JVM 默认两者结合——冷代码解释、热代码编译，兼顾启动与峰值。</li>
      </ul>
      <Callout variant="note" title="「越跑越快」与「预热」">
        因为 JIT 要先收集运行数据、判定热点、再编译，所以 Java 程序<strong>刚启动时较慢，运行一段时间后达到峰值性能</strong>，
        这就是「越跑越快」和「JVM 预热」的由来。基准测试 Java 性能时必须先充分预热，否则测到的是解释执行阶段的慢速，结论不准。
      </Callout>

      <h3>面试题 7：Oracle JDK 和 OpenJDK 有什么区别？</h3>
      <p>
        日常说的「JDK」如今大多基于 <strong>OpenJDK</strong>（开源参考实现）。Oracle JDK 是 Oracle 基于 OpenJDK
        构建的商业发行版，两者在功能上<strong>几乎一致</strong>，主要差别在许可与支持：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>OpenJDK</th><th>Oracle JDK</th></tr>
        </thead>
        <tbody>
          <tr><td>开源</td><td>是（GPL）</td><td>基于 OpenJDK，含商业条款</td></tr>
          <tr><td>许可/费用</td><td>免费</td><td>生产环境可能需商业订阅</td></tr>
          <tr><td>支持周期</td><td>社区/各发行方</td><td>Oracle 官方长期支持</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="常见发行版">
        除 Oracle 外，还有 Adoptium（Temurin）、Amazon Corretto、Azul Zulu、阿里 Dragonwell 等多个 OpenJDK 发行版，
        多数对生产免费且提供长期支持。选型时关注「是否 LTS、谁提供安全补丁、许可是否免费」三点即可，
        功能层面它们基本对齐 OpenJDK。能聊到这一层会显得对生态很熟。
      </Callout>

      <Summary
        points={[
          'Java 既是语言也是平台：源码经 javac 编成与平台无关的字节码，再由各平台的 JVM 执行；这才是「一次编写到处运行」的真相。',
          'JDK 包含 JRE，JRE 包含 JVM：JVM 是执行引擎，JRE 加了核心类库，JDK 再加编译/调试工具；写代码必须用 JDK。',
          '字节码是面向 JVM 的中间指令，不是机器码；跨平台靠的是「字节码 + 各平台 JVM」这个中间层，JVM 本身并不跨平台。',
          'Java 既编译又解释：javac 编译成字节码，运行时解释执行 + 对热点代码 JIT 编译成本地机器码。',
          '常用 JDK 工具：javac/java/javap/jar 基础四件套，jps/jstack/jmap/jstat/jcmd 等用于线上诊断，能串成排查链是加分项。',
          'Java vs Go：Java 胜在企业级生态与工程化，Go 胜在启动快、内存省、协程并发，适合云原生；两者定位不同而非互相替代。',
        ]}
      />
    </article>
  )
}

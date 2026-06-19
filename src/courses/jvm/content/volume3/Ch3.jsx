import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const troubleshootCode = `# 1. 找到目标 Java 进程的 PID
jps -l

# 2. 实时看 GC 状况：每 1 秒打印一次，共 10 次
#    重点看 YGC/YGCT（Young GC 次数/耗时）、FGC/FGCT（Full GC）、O（老年代占用%）
jstat -gcutil <pid> 1000 10

# 3. 内存持续走高、疑似泄漏，导出堆快照（live 只导存活对象）
jmap -dump:live,format=b,file=heap.hprof <pid>
#    OOM 时也可让 JVM 自动 dump（见下方启动参数）

# 4. 用 jstack 看线程，排查 CPU 飙高 / 死锁
jstack <pid> > thread.txt

# 5. 把 heap.hprof 拖进 MAT（Memory Analyzer），看 Histogram 和
#    Leak Suspects，沿 GC Roots 引用链找到泄漏对象的持有者`

const jvmArgsCode = `# 内存与 OOM 自动 dump（线上必配）
-Xms4g -Xmx4g                 # 初始/最大堆，设成相等避免运行时抖动扩缩
-Xss512k                      # 单线程栈大小
-XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=256m   # 元空间上限
-XX:+HeapDumpOnOutOfMemoryError                     # OOM 时自动导堆
-XX:HeapDumpPath=/var/log/app/heap.hprof

# 新生代与收集器
-XX:NewRatio=2                # 老年代:新生代 = 2:1
-XX:SurvivorRatio=8           # Eden:Survivor = 8:1
-XX:+UseG1GC                  # 选用 G1 收集器
-XX:MaxGCPauseMillis=200      # G1 目标停顿时间

# GC 日志（出问题时能复盘）
-Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20m`

const cpuCode = `# CPU 飙高的标准排查四步（top -> 线程 -> 栈 -> 定位）
# 1. 找出占 CPU 最高的 Java 进程
top
# 2. 找出该进程里最耗 CPU 的线程（H 显示线程，记下十进制 TID）
top -Hp <pid>
# 3. 把十进制 TID 转成十六进制（jstack 里线程 nid 是十六进制）
printf '%x\\n' <tid>
# 4. 在 jstack 输出里搜这个 nid，看它卡在哪段代码
jstack <pid> | grep -A 30 'nid=0x<hex-tid>'

# 死循环/正则回溯/频繁 GC 都会让某线程长期占满一个核，
# 用这套能精确定位到具体的 Java 方法行`

const threadLocalCode = `// ThreadLocal 在线程池里的经典泄漏：用完不 remove
public class TLLeak {
    private static final ThreadLocal<byte[]> CTX = new ThreadLocal<>();

    public void handle() {
        CTX.set(new byte[10 * 1024 * 1024]); // 绑定到当前线程
        try {
            // ... 业务逻辑
        } finally {
            CTX.remove(); // 必须！线程池线程会被复用，不清就一直挂着
        }
    }
}
// 原理：ThreadLocalMap 的 key 是弱引用、value 是强引用。
// 线程池里线程长期不死 -> value 永远可达 -> 泄漏。
// 防御：finally 里 remove；不要把 ThreadLocal 设成实例字段乱建。`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          前面把内存结构、垃圾回收、类加载都讲透了，这一章落到最实战的一环：线上 OOM 了、内存飙升了、GC 停顿太久了，
          你怎么定位、怎么调。面试到这里考的不再是背概念，而是「给你一个出问题的线上系统，你的排查链路是什么」。
          答得有章法，远比罗列一堆参数更打动人。
        </p>
      </Lead>

      <h2>常见的几种 OOM</h2>
      <p>
        <em>OutOfMemoryError</em> 不是只有一种，报错信息后面那行字才是关键，它直接指明是哪块内存爆了：
      </p>
      <ul>
        <li>
          <strong>Java heap space</strong>：堆内存不足，最常见。要么真的对象太多（大集合、缓存无上限），要么内存泄漏导致对象回收不掉。
        </li>
        <li>
          <strong>StackOverflowError</strong>：栈溢出，通常是递归没有正确的终止条件，或方法调用层级过深。注意它是 <code>Error</code> 的栈版本，针对单线程栈深。
        </li>
        <li>
          <strong>Metaspace</strong>：元空间溢出，常见于动态生成大量类（如频繁热部署、CGLIB 代理过多、类加载器泄漏）。
        </li>
        <li>
          <strong>GC overhead limit exceeded</strong>：JVM 花了超过 98% 的时间做 GC 却只回收不到 2% 的内存，说明堆几乎满了、濒临崩溃。
        </li>
        <li>
          <strong>Direct buffer memory</strong>：直接内存（堆外）溢出，常见于 NIO、Netty 大量使用 <code>DirectByteBuffer</code> 而未及时释放。
        </li>
        <li>
          <strong>unable to create new native thread</strong>：不是堆爆了，而是线程太多、本地内存被一堆线程栈吃光，常因线程池失控或每请求 new 线程。
        </li>
      </ul>
      <Callout variant="tip" title="看到 OOM 先读后半句，别急着加 -Xmx">
        <p>
          新手见 OOM 第一反应是「堆不够、加 <code>-Xmx</code>」，这往往是错的。OOM 后半句决定了完全不同的处置方向：
          <code>Metaspace</code> 加 <code>-Xmx</code> 一点用没有，得查动态造类；<code>Direct buffer memory</code> 要查堆外、调
          <code>MaxDirectMemorySize</code> 或排查 Netty 没释放；<code>unable to create new native thread</code> 反而要
          <strong>调小</strong> <code>-Xss</code> 或限制线程数；<code>GC overhead limit</code> 八成是泄漏、盲目加堆只是把崩溃往后推。
          所以第一步永远是<strong>读懂那半句话</strong>，再决定打法。
        </p>
      </Callout>

      <Example title="线上内存飙升如何定位">
        <p>
          收到告警「服务内存持续走高、Full GC 频繁」，一条清晰的排查链路是：
        </p>
        <ul>
          <li><strong>先看现象</strong>：用 <code>jstat -gcutil</code> 确认是不是老年代占用一路涨、Full GC 后也降不下来——这是泄漏的典型信号。</li>
          <li><strong>再抓证据</strong>：用 <code>jmap -dump:live</code> 导出堆快照（或等 OOM 时自动 dump 的文件）。</li>
          <li><strong>后做分析</strong>：把堆快照丢进 MAT，看 <code>Leak Suspects</code> 和支配树，沿引用链找到「谁一直握着这些对象不放」。</li>
          <li><strong>定位代码</strong>：常见元凶是静态集合越堆越大、缓存没设上限/过期、<code>ThreadLocal</code> 用完没 <code>remove</code>、监听器没注销。</li>
        </ul>
        <p>
          关键心法是<strong>先定位，再动手</strong>——别一上来就盲目加大堆或换收集器，那只会把问题往后拖。
        </p>
      </Example>

      <Example title="ThreadLocal 在线程池里的隐蔽泄漏">
        <p>
          实战里最阴的一类泄漏来自 <code>ThreadLocal</code> + 线程池的组合。<code>ThreadLocalMap</code> 的 key 是弱引用、
          value 是强引用，本意是 ThreadLocal 对象没人用时 key 能被回收。但线程池里的线程<strong>长期不死</strong>，
          只要它还活着，这条 <code>Thread → ThreadLocalMap → Entry → value</code> 的强引用链就一直在，value 永远回收不掉。
        </p>
        <CodeBlock lang="java" title="TLLeak.java" code={threadLocalCode} />
        <p>
          铁律是<strong>用完在 finally 里 remove</strong>。这也是为什么很多框架的过滤器/拦截器里，
          请求结束都要清理 ThreadLocal（如 MDC 日志上下文、用户身份、事务上下文）——不清，下一个复用该线程的请求
          可能读到上一个请求的脏数据，既是泄漏又是安全问题。
        </p>
      </Example>

      <KeyIdea title="内存泄漏 vs 内存溢出">
        <p>
          这俩别混。<strong>内存溢出</strong>（OOM）是结果：要用的内存超过了可用上限，程序直接报错。
          <strong>内存泄漏</strong>（Memory Leak）是原因之一：某些对象本该被回收，却因为还被某个 GC Root 间接引用着而无法回收，
          它们日积月累地堆积，最终把堆撑爆、引发 OOM。判断泄漏的标志是：多次 Full GC 之后，老年代占用<strong>仍然降不下来、反而单调上涨</strong>。
          溢出未必是泄漏（可能就是流量大、对象本来就多），但泄漏拖久了几乎必然溢出。
        </p>
      </KeyIdea>

      <h2>排查工具箱</h2>
      <p>
        JDK 自带和社区的工具配合起来用，各管一个环节：
      </p>
      <ul>
        <li><code>jps</code>：列出 Java 进程和 PID，所有排查的起点。</li>
        <li><code>jstat</code>：看 GC 频率与各代占用，判断「是不是 GC 出问题、是哪一代」。</li>
        <li><code>jmap</code>：导出堆快照（heap dump），也能看对象直方图。</li>
        <li><code>MAT</code>：分析堆快照，找泄漏对象和引用链，是定位泄漏的主力。</li>
        <li><code>jstack</code>：导出线程栈，排查 CPU 飙高、死锁、线程卡住。</li>
        <li><code>jcmd</code>：瑞士军刀，能下发 GC、导堆、看 NMT、触发飞行记录器（JFR）等，逐渐取代零散小工具。</li>
        <li><code>arthas</code>：阿里开源的在线诊断神器，不重启就能看方法耗时、热点、动态反编译，线上首选。</li>
        <li><strong>GC 日志 / JFR</strong>：开 <code>-Xlog:gc*</code> 或 Java Flight Recorder，事后复盘 GC 与性能行为最可靠的依据。</li>
      </ul>
      <CodeBlock lang="bash" title="排查命令串起来" code={troubleshootCode} />

      <h3>CPU 飙高怎么查（和内存是两条线）</h3>
      <p>
        内存和 CPU 是两类不同的线上问题，工具链也不同。CPU 100% 时不要去导堆，而要顺着「进程 → 线程 → 栈」往下钻：
        先 <code>top</code> 找进程，再 <code>top -Hp</code> 找最耗 CPU 的线程，把它的十进制 TID 转成十六进制，
        到 <code>jstack</code> 输出里按这个 <code>nid</code> 搜，就能精确定位到正在死循环/疯狂 GC 的那段 Java 代码。
      </p>
      <CodeBlock lang="bash" title="CPU 飙高排查四步" code={cpuCode} />
      <p>
        常见元凶：死循环、正则灾难性回溯、频繁 Full GC（这时凶手往往是 GC 线程，得回去查内存）、
        以及高并发下的锁竞争自旋。能背出这套「top -Hp → 转十六进制 → grep nid」的人，一看就是真上过线的。
      </p>

      <Callout variant="warn" title="调优的正确顺序：先定位，再调参">
        <p>
          调优不是比谁记得参数多。正确思路是：<strong>先用数据定位瓶颈，再针对性地调</strong>。
          典型的调优手段按优先级排：先看代码（有没有泄漏、有没有不必要的大对象）；再调<strong>堆大小</strong>
          （<code>-Xms</code> 与 <code>-Xmx</code> 设相等，避免运行时频繁扩缩抖动）；
          然后是<strong>新生代比例</strong>（朝生夕死的对象多就调大新生代，减少晋升和 Full GC）；
          接着选合适的<strong>收集器</strong>（追求低停顿用 G1/ZGC）；
          核心目标始终是<strong>避免频繁 Full GC 和长停顿</strong>。
          切忌一次改一大堆参数，那样改完都不知道是哪条起了作用。
        </p>
        <p>
          容器时代再补一条坑：在 Docker/K8s 里跑 JVM，老版本（JDK8 早期）<strong>看不到容器的内存上限</strong>，
          会按宿主机的总内存去算默认堆，结果远超 cgroup 限制、被 OOMKilled。务必用较新 JDK（默认开启
          <code>+UseContainerSupport</code>）并用 <code>-XX:MaxRAMPercentage</code> 按容器内存的百分比设堆，
          别再硬写 <code>-Xmx</code> 死值。「明明堆没满进程却被杀」十有八九就是这个容器内存感知问题。
        </p>
      </Callout>

      <h2>实战与面试怎么答</h2>
      <p>
        被问「线上 OOM/内存飙升怎么排查」，按「看现象 → 抓 dump → 分析引用链 → 定位代码 → 验证」这条链路答，
        中间自然带出 <code>jstat</code> 看 GC、<code>jmap</code> 导堆、MAT 找泄漏、<code>jstack</code> 看线程这些工具的分工。
        再点明「先定位再调参」「<code>-Xms</code> 与 <code>-Xmx</code> 设相等」「目标是避免频繁 Full GC」这几条原则，
        最后能背出几个关键启动参数，整个回答就既有方法论又有落地细节。
      </p>
      <p>
        被问「CPU 100% 怎么查」，背「top -Hp 找线程 → 十进制转十六进制 → jstack 按 nid 定位代码」这套。
        被问「OOM 都有哪几种」，强调<strong>看报错后半句对症下药</strong>，并能各举一个典型成因。
        被问「容器里 JVM 要注意什么」，答内存感知 + <code>MaxRAMPercentage</code>。这几条答全，实战分基本拿满。
      </p>

      <Practice title="一套可直接抄的排查与启动参数">
        <p>
          下面这套命令和参数可以当模板。线上务必提前配好 <code>HeapDumpOnOutOfMemoryError</code>，
          否则真 OOM 时连现场都留不下，只能干瞪眼。
        </p>
        <CodeBlock lang="bash" title="排查三连：jmap dump + jstat" code={troubleshootCode} />
        <CodeBlock lang="bash" title="关键 JVM 启动参数清单" code={jvmArgsCode} />
        <p>
          建议在测试环境故意写个无上限的静态 <code>List</code> 不断 <code>add</code>，复现一次 <code>Java heap space</code>，
          再用 <code>jmap</code> + MAT 把它揪出来，走完整条链路一次，比看十遍文章都管用。
        </p>
        <p>
          再加练一题 CPU 场景：写个 <code>while(true){}</code> 的死循环线程，用上面的「top -Hp → 转十六进制 → jstack」
          四步把它定位到代码行；以及写个线程池里不 remove 的 <code>ThreadLocal</code> 持有大对象，
          用 jstat + MAT 复现并定位泄漏。把内存和 CPU 两条排查链各走通一遍，面试时就能讲得有血有肉。
        </p>
      </Practice>

      <Summary
        points={[
          '常见 OOM 看报错后半句：堆 Java heap space、栈 StackOverflowError、元空间 Metaspace、GC overhead limit、直接内存 Direct buffer memory、线程过多 unable to create new native thread。',
          '看到 OOM 先读后半句对症下药，别一律加 -Xmx：元空间查造类、直接内存查堆外、线程过多反而要调小 -Xss。',
          '内存溢出是结果、泄漏是原因；判断泄漏看多次 Full GC 后老年代是否仍单调上涨、降不下来。',
          'ThreadLocal 在线程池里不 remove 是隐蔽泄漏源（key 弱引用、value 强引用、线程长寿），用完务必 finally remove。',
          '排查工具分工：jps 找进程、jstat 看 GC、jmap 导堆、MAT 找泄漏链、jstack 看线程、jcmd/JFR 综合、arthas 在线诊断。',
          'CPU 飙高另走一条线：top -Hp 找线程 → 十进制转十六进制 → jstack 按 nid 定位到代码行。',
          '调优先定位再动手：先查代码，再调堆大小（Xms=Xmx）、新生代比例、收集器，核心是避免频繁 Full GC 和长停顿。',
          '线上必配 -XX:+HeapDumpOnOutOfMemoryError；容器里用新 JDK + MaxRAMPercentage 让 JVM 感知容器内存，避免被 OOMKilled。',
        ]}
      />
    </>
  )
}

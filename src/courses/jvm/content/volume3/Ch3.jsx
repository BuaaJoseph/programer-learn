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
      </ul>

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
        <li><code>arthas</code>：阿里开源的在线诊断神器，不重启就能看方法耗时、热点、动态反编译，线上首选。</li>
        <li><strong>GC 日志</strong>：开 <code>-Xlog:gc*</code>，事后复盘 GC 行为最可靠的依据。</li>
      </ul>
      <CodeBlock lang="bash" title="排查命令串起来" code={troubleshootCode} />

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
      </Callout>

      <h2>实战与面试怎么答</h2>
      <p>
        被问「线上 OOM/内存飙升怎么排查」，按「看现象 → 抓 dump → 分析引用链 → 定位代码 → 验证」这条链路答，
        中间自然带出 <code>jstat</code> 看 GC、<code>jmap</code> 导堆、MAT 找泄漏、<code>jstack</code> 看线程这些工具的分工。
        再点明「先定位再调参」「<code>-Xms</code> 与 <code>-Xmx</code> 设相等」「目标是避免频繁 Full GC」这几条原则，
        最后能背出几个关键启动参数，整个回答就既有方法论又有落地细节。
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
      </Practice>

      <Summary
        points={[
          '常见 OOM 看报错后半句：堆 Java heap space、栈 StackOverflowError、元空间 Metaspace、GC overhead limit、直接内存 Direct buffer memory。',
          '内存溢出是结果、泄漏是原因；判断泄漏看多次 Full GC 后老年代是否仍单调上涨、降不下来。',
          '排查工具分工：jps 找进程、jstat 看 GC、jmap 导堆、MAT 找泄漏链、jstack 看线程、arthas 在线诊断、GC 日志复盘。',
          '排查链路：看现象 → 抓 dump → 分析引用链 → 定位代码（静态集合/缓存无上限/ThreadLocal 未 remove）。',
          '调优先定位再动手：先查代码，再调堆大小（Xms=Xmx）、新生代比例、收集器，核心是避免频繁 Full GC 和长停顿。',
          '线上必配 -XX:+HeapDumpOnOutOfMemoryError，否则 OOM 现场无从查起。',
        ]}
      />
    </>
  )
}

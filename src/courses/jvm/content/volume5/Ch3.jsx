import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const coreArgs = `# 一份生产环境常用 JVM 参数模板
# —— 堆
-Xms4g -Xmx4g                 # 初始=最大，避免运行时动态扩缩带来的停顿
-Xmn1500m                     # 新生代（按对象存活特征调）
# —— 收集器（JDK 9+ 默认 G1）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200       # G1 停顿目标
-XX:InitiatingHeapOccupancyPercent=45  # 老年代占比达到即启动并发标记
# —— 元空间
-XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=256m
# —— 直接内存
-XX:MaxDirectMemorySize=512m
# —— GC 日志（JDK 9+ 统一日志格式）
-Xlog:gc*:file=/var/log/app/gc.log:time,uptime:filecount=5,filesize=20m
# —— OOM 时自动导出堆快照，事后用 MAT 分析
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/app/heapdump.hprof`

const tools = `# 常用诊断命令
jps -l                         # 列出 Java 进程及主类
jstat -gcutil <pid> 1000 10    # 每 1s 采一次 GC 各区使用率，共 10 次
jmap -histo:live <pid>         # 存活对象按类统计（触发一次 Full GC，慎用）
jmap -dump:live,format=b,file=heap.hprof <pid>  # 导出堆快照
jstack <pid>                   # 打印线程栈（排查死锁、CPU 飙高、卡顿）
jinfo -flags <pid>             # 查看运行中 JVM 的参数`

const leakPattern = `// 内存泄漏的典型代码：静态集合只进不出
public class Cache {
    // static 让它的生命周期和类一样长，放进去的对象永远被强引用，无法回收
    private static final Map<String, Object> CACHE = new HashMap<>();

    public void put(String k, Object v) {
        CACHE.put(k, v);   // 只 put 从不清理 / 无过期策略 → 内存只增不减 → 最终 OOM
    }
}`

export default function Ch3() {
  return (
    <article>
      <Lead>
        这一章收尾整个面试卷，讲最贴近实战的一组题：GC 调优到底在调什么、怎么调、有哪些必须背熟的
        JVM 参数、用什么工具分析性能、以及内存泄漏如何定位。这些题答得好不好，直接体现你有没有
        真正在线上「救过火」。我们坚持「先讲目标、再讲方法、最后给工具和案例」的顺序，
        避免变成参数罗列。
      </Lead>

      <h2>一、GC 调优的主要目标是什么？</h2>
      <p>
        GC 调优本质是在两个相互制约的指标间找平衡：<strong>停顿时间（延迟）</strong>和<strong>吞吐量</strong>。
      </p>
      <table>
        <thead>
          <tr><th>目标</th><th>含义</th><th>适用场景</th></tr>
        </thead>
        <tbody>
          <tr><td>低延迟（短停顿）</td><td>单次 GC 的 STW 尽量短</td><td>在线服务、对响应敏感的系统</td></tr>
          <tr><td>高吞吐</td><td>GC 时间占总运行时间比例尽量低</td><td>批处理、后台计算任务</td></tr>
          <tr><td>合理内存占用</td><td>用尽量小的堆达成上述目标</td><td>资源受限 / 成本敏感场景</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        这三者不可兼得，是个「不可能三角」：想停顿更短，往往要牺牲吞吐或加大堆；想吞吐更高，
        单次停顿可能更长。所以调优<strong>第一步永远是明确目标</strong>——这是个在线服务（优先低延迟，选 G1/ZGC）
        还是批处理（优先吞吐，选 Parallel）？目标错了，参数调得再细也是南辕北辙。
      </KeyIdea>

      <h2>二、如何对 GC 调优？</h2>
      <p>调优是个闭环流程，不是拍脑袋改参数：</p>
      <ol>
        <li><strong>定目标</strong>：明确延迟/吞吐的量化指标（如 P99 停顿 &lt; 200ms）。</li>
        <li><strong>采数据</strong>：开 GC 日志，用工具观察现状——GC 频率、单次停顿、各区使用率、晋升速率。</li>
        <li><strong>找瓶颈</strong>：是 Young GC 太频繁？还是 Full GC 频繁/过长？还是晋升太快？</li>
        <li><strong>调参数</strong>：一次只调一个变量（改堆大小、换收集器、调新生代比例、调晋升阈值）。</li>
        <li><strong>验证回归</strong>：压测对比，确认指标改善且没引入新问题，再上线。</li>
      </ol>
      <Callout variant="tip" title="几个常见的调优经验">
        ① <code>-Xms</code> 与 <code>-Xmx</code> 设成相等，避免堆动态扩缩造成的额外停顿；
        ② Full GC 频繁先查是不是内存泄漏（别急着加堆，加堆只是延后爆炸）；
        ③ Young GC 频繁可适当增大新生代；
        ④ 对象过早晋升导致老年代压力大，可增大 Survivor 或调 <code>MaxTenuringThreshold</code>。
      </Callout>

      <h2>三、常用的 JVM 配置参数</h2>
      <p>面试常被要求「报几个你常用的参数」，按类别记忆最不容易漏：</p>
      <table>
        <thead>
          <tr><th>类别</th><th>参数</th></tr>
        </thead>
        <tbody>
          <tr><td>堆</td><td><code>-Xms</code> <code>-Xmx</code> <code>-Xmn</code> <code>-XX:SurvivorRatio</code></td></tr>
          <tr><td>栈</td><td><code>-Xss</code></td></tr>
          <tr><td>元空间</td><td><code>-XX:MetaspaceSize</code> <code>-XX:MaxMetaspaceSize</code></td></tr>
          <tr><td>收集器</td><td><code>-XX:+UseG1GC</code> <code>-XX:MaxGCPauseMillis</code></td></tr>
          <tr><td>排障</td><td><code>-XX:+HeapDumpOnOutOfMemoryError</code> <code>-XX:HeapDumpPath</code></td></tr>
          <tr><td>GC 日志</td><td><code>-Xlog:gc*</code>（JDK 9+ 统一日志）</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="bash" title="生产参数模板" code={coreArgs} />
      <Callout variant="warn" title="务必默认开启的两个">
        <code>-XX:+HeapDumpOnOutOfMemoryError</code> + <code>-XX:HeapDumpPath</code> 几乎是生产标配——
        OOM 现场转瞬即逝，开了它就能在崩溃瞬间自动留下堆快照，事后用 MAT 慢慢分析。
        没开的话，OOM 一闪而过、什么都没留下，排查会非常被动。
      </Callout>

      <h2>四、分析 JVM 性能的工具有哪些？</h2>
      <p>分两类：命令行工具（轻、随 JDK 自带、适合线上）和图形化工具（重、适合深入分析）。</p>
      <table>
        <thead>
          <tr><th>工具</th><th>用途</th></tr>
        </thead>
        <tbody>
          <tr><td>jps</td><td>列出 Java 进程</td></tr>
          <tr><td>jstat</td><td>实时看 GC 统计（各区使用率、GC 次数/耗时）</td></tr>
          <tr><td>jmap</td><td>看对象分布、导出堆快照（heap dump）</td></tr>
          <tr><td>jstack</td><td>打印线程栈，排查死锁、CPU 飙高、卡顿</td></tr>
          <tr><td>jinfo</td><td>查看/修改运行中 JVM 参数</td></tr>
          <tr><td>MAT (Eclipse Memory Analyzer)</td><td>分析 heap dump，定位内存泄漏</td></tr>
          <tr><td>JProfiler / VisualVM / Arthas</td><td>图形化 / 在线诊断（Arthas 不停机看方法、调用链）</td></tr>
          <tr><td>JFR (Java Flight Recorder)</td><td>低开销持续记录运行数据，事后回放分析</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="bash" title="命令行诊断常用命令" code={tools} />
      <KeyIdea>
        一个高频的「CPU 飙高怎么排查」流程值得背熟：<code>top</code> 找到高 CPU 的进程 →
        <code>top -Hp &lt;pid&gt;</code> 找到高 CPU 的线程 → 把线程 id 转成十六进制 →
        <code>jstack &lt;pid&gt;</code> 里搜这个十六进制 nid，定位到具体卡在哪个方法/死循环。
      </KeyIdea>

      <h2>五、内存泄漏如何分析？</h2>
      <p>
        先区分两个概念：<strong>内存泄漏（Memory Leak）</strong>是「对象用不到了却仍被强引用、无法回收」，
        泄漏积累的最终结果是<strong>内存溢出（OOM）</strong>。所以分析的核心是：
        <strong>找出那些「本该死却还活着」的对象，以及拉着它们不放的引用链。</strong>
      </p>
      <CodeBlock lang="java" title="典型泄漏：只进不出的静态集合" code={leakPattern} />
      <p>常见泄漏来源：</p>
      <ul>
        <li><strong>静态集合 / 缓存</strong>无淘汰策略，只增不减（如上例）。</li>
        <li><strong>ThreadLocal</strong> 用完不 <code>remove()</code>，线程池场景下 value 长期残留（见卷四引用章）。</li>
        <li><strong>未关闭的资源</strong>：连接、流、监听器注册后未注销。</li>
        <li><strong>自定义类加载器</strong>未释放，导致整批类元数据无法卸载。</li>
      </ul>
      <Example title="一次内存泄漏排查的完整路径">
        <p>
          现象：服务运行几天后 Full GC 越来越频繁、老年代回收后占用降不下来，最终 OOM。
          排查：① 先看 GC 日志确认老年代「锯齿」在抬高（每次回收后的低点持续上升 = 泄漏特征，
          区别于正常的来回波动）；② 启动参数已开 <code>HeapDumpOnOutOfMemoryError</code>，拿到 hprof；
          ③ 用 <strong>MAT</strong> 打开，看 <em>Dominator Tree</em> 找占用最大的对象，再用
          <em>Path to GC Roots</em> 看是谁强引用着它——一路追到那个只 put 不清理的静态 <code>HashMap</code>；
          ④ 加上 LRU 淘汰 / 改用带过期的缓存，问题解决。
        </p>
      </Example>
      <KeyIdea>
        判断「是泄漏还是单纯堆不够」的关键信号：看 <strong>Full GC 之后老年代的「最低点」</strong>。
        若每次回收后的低点持续走高（锯齿整体上移），是<strong>泄漏</strong>，加堆只是拖延；
        若只是峰值高、回收后能降回稳定水平，那多半是<strong>堆偏小或流量大</strong>，加堆或优化分配即可。
      </KeyIdea>

      <h2>六、读懂 GC 日志：调优的眼睛</h2>
      <p>
        所有调优都建立在「看得懂 GC 日志」之上。一行典型的 G1 Young GC 日志会告诉你这几件事：
        本次是哪种 GC、暂停了多久、回收前后堆/各代的使用量变化。看日志重点抓三个量：
        <strong>停顿时长</strong>（是否超过目标）、<strong>GC 频率</strong>（是否过密）、
        <strong>回收效果</strong>（回收后降了多少，老年代低点是否在涨）。
      </p>
      <table>
        <thead>
          <tr><th>日志信号</th><th>可能问题</th><th>调整方向</th></tr>
        </thead>
        <tbody>
          <tr><td>Young GC 很频繁</td><td>新生代偏小 / 分配速率高</td><td>增大新生代或排查高频分配</td></tr>
          <tr><td>单次停顿超目标</td><td>新生代过大 / 收集器不合适</td><td>调 MaxGCPauseMillis、换 ZGC</td></tr>
          <tr><td>Full GC 频繁</td><td>晋升过快 / 内存泄漏</td><td>查泄漏、调 Survivor 与晋升阈值</td></tr>
          <tr><td>老年代回收后不降</td><td>内存泄漏</td><td>导出 heap dump 用 MAT 分析</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        建议生产<strong>常态化开启 GC 日志并滚动归档</strong>（见前面的 <code>-Xlog:gc*</code> 配置）。
        GC 问题往往是「日积月累」型，事后才发现；只有留着历史日志，才能回看「问题从哪天开始恶化」，
        否则只能干等下一次复现。日志开销很小，但救命时无可替代。
      </KeyIdea>

      <h2>七、几个高频「线上问题」速答模板</h2>
      <p>面试常给场景题，准备好套路化的排查路径能加分：</p>
      <table>
        <thead>
          <tr><th>现象</th><th>第一步看什么</th><th>常见根因</th></tr>
        </thead>
        <tbody>
          <tr><td>接口偶发超时/抖动</td><td>GC 日志看是否有长停顿</td><td>Full GC 过长、晋升风暴</td></tr>
          <tr><td>CPU 持续 100%</td><td>top -Hp + jstack</td><td>死循环、频繁 GC 占 CPU</td></tr>
          <tr><td>内存持续上涨直到 OOM</td><td>heap dump + MAT</td><td>内存泄漏（静态集合/ThreadLocal）</td></tr>
          <tr><td>线程数暴涨</td><td>jstack 看线程状态</td><td>线程池配置不当、阻塞堆积</td></tr>
          <tr><td>启动后元空间 OOM</td><td>类加载数量 / 动态代理</td><td>类元数据膨胀</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="回答场景题的万能结构">
        无论问哪种线上问题，都可套这条线：<strong>看现象 → 抓现场（日志/dump/线程栈）→ 定位（工具分析）
        → 验证假设 → 修复并加监控防复发</strong>。比起直接说答案，展示这套「有方法论的排查思路」
        往往更能打动面试官——因为线上问题的成因千变万化，方法论才是可迁移的能力。
      </Callout>

      <Callout variant="tip" title="本卷收束">
        到这里 JVM 面试两卷讲完：卷四从内存结构讲到执行引擎与引用，卷五从 GC 基础讲到收集器细节与调优排查。
        面试时记住一条主线——<strong>对象在哪生（内存结构）→ 怎么被执行（执行引擎）→ 怎么死（GC）→
        死得不好怎么救（调优排查）</strong>，所有题都能挂到这条线上。
      </Callout>

      <Summary
        points={[
          'GC 调优是在低延迟、高吞吐、低内存间权衡的「不可能三角」，第一步永远是按业务(在线/批处理)定目标。',
          '调优是闭环：定目标→采 GC 日志数据→找瓶颈→一次调一个参数→压测验证再上线；Full GC 频繁先排查泄漏而非盲目加堆。',
          '参数按类别记：堆(-Xms/-Xmx/-Xmn)、栈(-Xss)、元空间、收集器(+UseG1GC/MaxGCPauseMillis)、排障(HeapDumpOnOutOfMemoryError)、GC 日志(-Xlog:gc*)。',
          '工具分命令行(jps/jstat/jmap/jstack/jinfo，线上轻量)与图形化(MAT/VisualVM/Arthas/JFR，深入分析)。',
          'CPU 飙高排查：top 找进程→top -Hp 找线程→线程 id 转十六进制→jstack 搜 nid 定位方法。',
          '内存泄漏＝对象该死却被强引用，靠 heap dump + MAT 的 Dominator Tree 与 Path to GC Roots 定位；常见来源是无淘汰的静态集合、未 remove 的 ThreadLocal。',
          '区分泄漏与堆不够：看 Full GC 后老年代最低点是否持续上移，上移是泄漏(加堆只拖延)，否则是堆偏小。',
        ]}
      />
    </article>
  )
}

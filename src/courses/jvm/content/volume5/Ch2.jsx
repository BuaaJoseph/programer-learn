import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const cmsFlow = `// CMS 四个阶段（基于标记-清除 + 增量更新）
1. 初始标记 Initial Mark     —— STW，仅标记 GC Roots 直接关联的对象（快）
2. 并发标记 Concurrent Mark  —— 与用户线程并发，沿引用链标记（慢，不停顿）
3. 重新标记 Remark           —— STW，修正并发期间引用变动（增量更新）
4. 并发清除 Concurrent Sweep —— 与用户线程并发，清除垃圾（不整理 → 产生碎片）`

const g1Flow = `// G1 一次回收的大致流程（堆被划分成大量等大 Region）
1. 初始标记 Initial Mark     —— STW（搭着一次 Young GC 做）
2. 并发标记 Concurrent Mark  —— 与用户线程并发，基于 SATB 标记
3. 最终标记 Final Mark       —— STW，处理 SATB 残留
4. 筛选回收 Live Data Cleanup—— STW，按「回收收益」排序，优先回收垃圾最多的 Region
                               （Garbage First 名字的由来）→ 复制存活对象到空 Region`

const barrier = `// 写屏障（write barrier）：在「引用赋值」前后插入的一小段逻辑
// 伪代码：object.field = newValue
void oop_field_store(obj, field, newValue) {
    pre_write_barrier(obj.field);   // 写前屏障（G1 SATB：记录旧引用）
    obj.field = newValue;           // 真正的赋值
    post_write_barrier(obj, newValue); // 写后屏障（维护记忆集 / CMS 增量更新）
}`

const gcSelect = `# 选择收集器（JDK 9+ 默认 G1）
-XX:+UseSerialGC        # Serial + Serial Old（单线程，client/小堆）
-XX:+UseParallelGC      # Parallel Scavenge + Parallel Old（吞吐优先）
-XX:+UseConcMarkSweepGC # CMS + ParNew（已在 JDK 14 移除）
-XX:+UseG1GC            # G1（JDK 9+ 默认，平衡停顿与吞吐）
-XX:+UseZGC             # ZGC（超大堆、超低停顿）
-XX:MaxGCPauseMillis=200 # G1/ZGC 的停顿时间目标`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这是 GC 卷里最硬核的一章，集中讲收集器的实现细节，也是面试最容易「深挖到见底」的地方。
        我们会从常见收集器全景出发，重点剖析 CMS 与 G1 的回收流程、两者的进步与差异，
        再深入到一个真正分高下的层次：<strong>记忆集与写屏障</strong>——为什么 G1 不维护年轻代到老年代的记忆集、
        CMS 和 G1 各自怎么靠写屏障保证并发标记的正确性、concurrent mode failure 是怎么来的、
        为什么 CMS 的 Full GC 是单线程、为什么有些新老收集器不能搭配，最后简介 ZGC。
      </Lead>

      <h2>一、常见的垃圾收集器有哪些？</h2>
      <table>
        <thead>
          <tr><th>收集器</th><th>区域</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>Serial / Serial Old</td><td>新 / 老</td><td>单线程，STW，简单，适合小堆</td></tr>
          <tr><td>ParNew</td><td>新生代</td><td>Serial 的多线程版，常配 CMS</td></tr>
          <tr><td>Parallel Scavenge / Parallel Old</td><td>新 / 老</td><td>多线程，吞吐量优先</td></tr>
          <tr><td>CMS</td><td>老年代</td><td>并发标记清除，停顿短，有碎片（JDK 14 移除）</td></tr>
          <tr><td>G1</td><td>整堆分 Region</td><td>可预测停顿，兼顾吞吐，JDK 9+ 默认</td></tr>
          <tr><td>ZGC / Shenandoah</td><td>整堆</td><td>并发、超低停顿（亚毫秒级），适合超大堆</td></tr>
        </tbody>
      </table>

      <h2>二、CMS 的回收流程</h2>
      <p>
        CMS（Concurrent Mark Sweep）的目标是<strong>最短停顿</strong>，基于标记-清除，分四个阶段，
        其中两个并发、两个 STW：
      </p>
      <CodeBlock lang="text" title="CMS 四阶段" code={cmsFlow} />
      <p>
        关键点：CMS 把最耗时的「标记」和「清除」都做成<strong>与用户线程并发</strong>，只在初始标记和
        重新标记两个短暂阶段 STW，所以停顿很短。代价是：① 基于标记-清除会产生<strong>内存碎片</strong>；
        ② 并发期间用户线程仍在产生垃圾（「浮动垃圾」），且占用 CPU。
      </p>

      <h2>三、G1 的回收流程</h2>
      <p>
        G1（Garbage First）把堆切成大量<strong>等大的 Region</strong>，每个 Region 可以扮演 Eden/Survivor/Old/Humongous
        中的任一角色（角色可动态变化）。它不再有物理上固定连续的分代。
      </p>
      <CodeBlock lang="text" title="G1 回收流程" code={g1Flow} />
      <KeyIdea>
        G1 名字「Garbage First」的含义：在筛选回收阶段，它会统计每个 Region 的垃圾占比，
        <strong>优先回收垃圾最多、回收性价比最高的 Region</strong>，并能根据用户设定的
        <code>MaxGCPauseMillis</code> 停顿目标，只挑一部分 Region 来回收——这就是它能做到
        <strong>「可预测停顿」</strong>的原因。回收时用复制把存活对象搬到空 Region，因此整体上<strong>无碎片</strong>。
      </KeyIdea>

      <h2>四、G1 相比 CMS 有哪些进步？</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>CMS</th><th>G1</th></tr>
        </thead>
        <tbody>
          <tr><td>内存碎片</td><td>有（标记-清除）</td><td>无（Region 间复制整理）</td></tr>
          <tr><td>停顿可控性</td><td>不可预测</td><td>可设停顿目标，可预测</td></tr>
          <tr><td>堆布局</td><td>物理连续的固定分代</td><td>逻辑分代 + 等大 Region</td></tr>
          <tr><td>大堆表现</td><td>越大越吃力</td><td>专为大堆设计</td></tr>
          <tr><td>回收策略</td><td>整个老年代</td><td>按收益优先回收（Mixed GC）</td></tr>
        </tbody>
      </table>

      <h2>五、记忆集：CMS 与 G1 的维护差异</h2>
      <p>
        先讲<strong>为什么需要记忆集</strong>。做 Young GC 时只想扫新生代，但老年代里可能有对象引用了
        新生代对象（<strong>跨代引用</strong>）。如果不记录这些跨代引用，就得扫描整个老年代才能确认
        新生代对象是否存活——那 Young GC 就退化成全堆扫描了。
      </p>
      <KeyIdea>
        <strong>记忆集（Remembered Set，RSet）</strong>就是用来记录「跨区域/跨代引用」的数据结构，
        让 GC 在回收某个区域时<strong>不必扫描整个堆，只需扫描这些被记下的引用</strong>。
        它是「分区回收」「避免全堆扫描」能成立的关键基础设施。
      </KeyIdea>
      <table>
        <thead>
          <tr><th>维度</th><th>CMS</th><th>G1</th></tr>
        </thead>
        <tbody>
          <tr><td>结构</td><td>一个 Card Table（卡表，全堆共享）</td><td>每个 Region 各有一个 RSet</td></tr>
          <tr><td>粒度</td><td>记到「卡页」</td><td>记「哪些 Region 引用了我」</td></tr>
          <tr><td>方向</td><td>记老→新（points-out）</td><td>记「谁指向我」（points-into）</td></tr>
          <tr><td>开销</td><td>小（一张表）</td><td>大（Region 多，RSet 占可观内存）</td></tr>
        </tbody>
      </table>
      <p>
        G1 的 RSet 维护开销不小——Region 一多，每个 Region 都要维护「谁引用了我」，内存和 CPU 成本都比
        CMS 的单张卡表高。这是 G1 为「分区灵活回收」付出的代价。
      </p>

      <h2>六、为什么 G1 不维护「年轻代到老年代」的记忆集？</h2>
      <p>
        因为没必要。记忆集是为了<strong>回收某区域时知道外部谁引用了它</strong>。
        想想各种回收的实际情况：
      </p>
      <ul>
        <li>做 <strong>Young GC</strong> 时，<strong>整个年轻代都会被一起回收</strong>，无论老年代回不回收，年轻代都被完整扫描。所以「年轻代引用老年代」这种关系，在回收年轻代时根本用不上记录——年轻代里的对象都要扫。</li>
        <li>做 <strong>Mixed GC / Old 回收</strong>时，年轻代<strong>同样总是被一起回收</strong>。也就是说，年轻代永远「被全量扫描」，从不单独被外部「引用进来」而需要靠记忆集找根。</li>
      </ul>
      <KeyIdea>
        结论：G1 里<strong>年轻代总是被整体回收</strong>，所以「年轻代→老年代」和「年轻代→年轻代」这些
        以年轻代为<strong>来源</strong>的引用，不需要记进记忆集（记了也是浪费）。
        真正需要记的是「<strong>老年代→年轻代</strong>」以及「老年代 Region 间」的引用——
        因为老年代可能被单独/部分回收，必须靠 RSet 知道外部谁引用了正在回收的 Region。
        这样能省下大量 RSet 维护开销。
      </KeyIdea>

      <h2>七、写屏障：CMS 与 G1 如何维持并发正确性</h2>
      <p>
        上一章讲过并发标记会<strong>漏标</strong>。解决漏标和维护记忆集，靠的都是<strong>写屏障</strong>——
        在引用赋值动作前后插入的一段逻辑（注意：和并发编程里的内存屏障是两回事）。
      </p>
      <CodeBlock lang="text" title="写屏障的位置" code={barrier} />
      <table>
        <thead>
          <tr><th>维度</th><th>CMS</th><th>G1</th></tr>
        </thead>
        <tbody>
          <tr><td>屏障类型</td><td>写后屏障（post）</td><td>写前屏障(SATB) + 写后屏障(RSet)</td></tr>
          <tr><td>漏标方案</td><td>增量更新：记录黑色新增的引用，Remark 重扫</td><td>SATB 原始快照：记录被删除的旧引用</td></tr>
          <tr><td>更新方式</td><td>直接更新卡表</td><td>logging write barrier：先入队，由后台线程异步处理</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        G1 用的是 <strong>logging write barrier（记录式写屏障）</strong>：引用变更不立刻去更新 RSet，
        而是先把这条变更<strong>记进一个队列（dirty card queue）</strong>，再由后台线程异步消费、更新 RSet。
        这样把维护成本从「同步、卡住业务线程」转成「异步、批量处理」，降低对应用线程的影响——
        这是 G1 相比 CMS 在屏障设计上的精细之处。
      </KeyIdea>
      <p>
        正确性保证：CMS 靠增量更新——并发标记时若黑色对象新增了对白对象的引用，写后屏障把它记下，
        Remark 阶段重新扫描，避免漏标。G1 靠 SATB——写前屏障在引用<strong>被覆盖前</strong>把旧引用记下，
        相当于「以标记开始那一刻的对象图快照为准」，保证快照里可达的对象本轮都不会被错杀。
      </p>

      <h2>八、concurrent mode failure 是怎么回事？</h2>
      <p>
        这是 CMS 特有的失败模式。CMS 在并发清理老年代时，<strong>用户线程仍在运行、仍在往老年代晋升对象</strong>。
        如果在 CMS 还没清理完之前，老年代就被新晋升的对象填满了，没有足够空间，就发生
        <strong>concurrent mode failure</strong>。
      </p>
      <Callout variant="warn" title="后果很严重">
        一旦 concurrent mode failure，CMS 的并发回收宣告失败，JVM 只能<strong>退化为 Serial Old
        进行一次单线程、Stop-The-World 的 Full GC</strong> 来兜底——这正是 CMS 最长的那次停顿来源。
        缓解办法：调低 <code>-XX:CMSInitiatingOccupancyFraction</code>，让 CMS 更早启动，
        留足并发回收的时间窗口。
      </Callout>

      <h2>九、为什么 CMS 的 Full GC 是单线程？</h2>
      <p>
        因为 CMS 自己<strong>没有实现一个并行的、能整理碎片的老年代收集器</strong>。当 CMS 并发回收失败
        （concurrent mode failure）或碎片太多无法分配大对象时，它需要一次「彻底的、能压缩碎片」的回收，
        而它的兜底实现就是<strong>退化到 Serial Old</strong>——Serial Old 是<strong>单线程</strong>的标记-整理收集器。
        所以「CMS 的 Full GC 单线程」本质上是「CMS 失败后用单线程的 Serial Old 兜底」。
        这也是 CMS 一个长期被诟病的点，G1 用统一的并行回收框架解决了它。
      </p>

      <h2>十、为什么有些新老收集器不能组合？</h2>
      <p>
        新生代收集器和老年代收集器要配合工作，它们之间有<strong>接口和框架的耦合</strong>，
        并非任意搭配。经典的不可组合是 <strong>ParNew + Parallel Old</strong>。
      </p>
      <KeyIdea>
        Parallel Old 是专门为 <strong>Parallel Scavenge</strong> 设计配套的，二者共享一套
        以「吞吐量优先」为目标的框架；而 ParNew 走的是另一套（为配合 CMS 的低停顿框架而生）。
        两套框架的实现接口不兼容，所以 <strong>ParNew 不能和 Parallel Old 组合</strong>。
        合法的经典组合是：ParNew + CMS、Parallel Scavenge + Parallel Old、Serial + Serial Old。
      </KeyIdea>

      <h2>十一、新生代回收如何避免全堆扫描？</h2>
      <p>
        回到第五、六题的记忆集。做 Young GC 时，要判断新生代对象是否存活，除了 GC Roots，
        还要考虑「老年代是否引用了它」。如果没有记忆集，就得扫整个老年代——那就是全堆扫描，Young GC 不再「快」。
      </p>
      <Example title="记忆集如何救场">
        <p>
          有了卡表 / RSet 记录「老年代里哪些位置引用了新生代」，Young GC 时<strong>只需把这些被记录的引用
          也当作根</strong>，加上常规 GC Roots，就能完整判定新生代对象存活性，<strong>完全不必扫描老年代</strong>。
          这就是「分代 + 记忆集」让 Young GC 保持高效的核心机制。
        </p>
      </Example>

      <h2>十二、ZGC 简介</h2>
      <p>
        ZGC 是面向<strong>超大堆（TB 级）、超低停顿（亚毫秒级且与堆大小无关）</strong>的并发收集器。
        它的核心创新是<strong>染色指针（colored pointers）</strong>和<strong>读屏障（load barrier）</strong>：
        把标记/重定位信息直接编码在对象指针的几位里，配合读屏障在「读引用」时按需修正，
        从而把几乎所有工作（标记、转移、重定位）都做成并发，STW 只剩极短的根扫描。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>G1</th><th>ZGC</th></tr>
        </thead>
        <tbody>
          <tr><td>停顿目标</td><td>可预测（百毫秒级）</td><td>亚毫秒级，几乎不随堆增大</td></tr>
          <tr><td>核心技术</td><td>Region + RSet + 写屏障</td><td>染色指针 + 读屏障 + 转发表</td></tr>
          <tr><td>适用堆</td><td>几 GB 到几十 GB</td><td>几十 GB 到 TB 级</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="bash" title="收集器选择参数" code={gcSelect} />

      <Summary
        points={[
          'CMS：标记-清除、四阶段(两并发两 STW)、停顿短但有碎片，JDK 14 已移除；G1：Region 化、Garbage First 按收益回收、可预测停顿、无碎片。',
          '记忆集(RSet/卡表)记录跨代/跨区引用，让回收某区域时无需全堆扫描；CMS 用一张卡表，G1 每个 Region 一个 RSet，开销更大。',
          'G1 不记「年轻代为来源」的引用，因为年轻代总是被整体回收、不会被单独靠记忆集找根；只需记老年代→年轻代及老年代 Region 间引用。',
          'CMS 用写后屏障+增量更新防漏标，G1 用写前屏障(SATB)+logging write barrier(异步入队更新 RSet)兼顾正确性与低开销。',
          'concurrent mode failure：CMS 并发清理时老年代被晋升对象填满，退化为单线程 Serial Old Full GC 兜底——这也是 CMS Full GC 单线程的原因。',
          'ParNew+Parallel Old 不能组合，因分属低停顿与高吞吐两套不兼容框架；合法组合如 ParNew+CMS、PS+Parallel Old。',
          'ZGC 用染色指针+读屏障实现并发标记与转移，亚毫秒停顿且基本不随堆增大，面向 TB 级大堆。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const collectorParamsCode = `# Serial（串行，单线程，适合客户端 / 小堆）
-XX:+UseSerialGC

# Parallel（并行，吞吐优先，JDK 8 默认）
-XX:+UseParallelGC

# CMS（并发标记清除，低停顿，JDK 14 已移除）
-XX:+UseConcMarkSweepGC

# G1（分 Region，可预测停顿，JDK 9+ 默认）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200   # 期望的最大停顿目标

# ZGC（着色指针，超低停顿，适合超大堆）
-XX:+UseZGC`

const g1TuneCode = `# G1 常用调优开关
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200          # 停顿目标，G1 据此挑回收多少 Region
-XX:InitiatingHeapOccupancyPercent=45  # 老年代占比达 45% 启动并发标记(IHOP)
-XX:G1HeapRegionSize=8m           # Region 大小(1~32MB，2 的幂)
-XX:G1NewSizePercent=5            # 新生代最小占比(G1 动态调整)
-XX:+ParallelRefProcEnabled       # 并行处理引用，缓解引用处理拖长 STW

# 经验：别同时硬设 -Xmn 和 MaxGCPauseMillis，
# 固定新生代大小会让 G1 失去为达成停顿目标而动态伸缩的能力`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          前面讲的是回收算法这套「方法论」，这一章讲把方法论落地的「执行者」——垃圾收集器。
          从最古老的串行收集器，到追求吞吐的并行收集器，再到为低延迟而生的 CMS、G1、ZGC，
          它们的演进史，本质就是一部「如何把 STW 越缩越短」的历史。
        </p>
      </Lead>

      <h2>Serial：最古老的单线程收集器</h2>
      <p>
        <em>Serial</em>（串行）收集器只用<strong>一个线程</strong>做垃圾回收，回收时其他所有业务线程必须停下来等它。
        它简单、没有线程切换开销，在堆很小、单核环境或客户端程序里反而高效，至今仍是某些场景的默认选择。
        缺点也明显：堆一大，单线程回收就慢，STW 会很长。
      </p>
      <p>
        别小看 Serial：它在<strong>容器化、微服务、Serverless</strong> 时代反而焕发第二春。
        一个限了 256MB、单核的小容器，跑 G1 这种重型收集器的元数据开销和后台线程反而不划算，
        Serial 的「零额外开销」此时是优点。这也是为什么 JVM 会根据「核数 ≤ 1 且堆 ≤ 约 1792MB」自动选 Serial——
        没有最好的收集器，只有最合适的。
      </p>

      <h2>Parallel：吞吐优先的并行收集器</h2>
      <p>
        <em>Parallel</em>（并行，也叫 Parallel Scavenge / Throughput Collector）把回收工作交给<strong>多个线程并行</strong>完成，
        充分利用多核 CPU。它的设计目标是<strong>吞吐量优先</strong>——即「业务运行时间 ÷（业务 + GC 时间）」尽可能高，
        适合那些不在乎单次停顿、但追求总处理能力的后台批处理、计算型任务。它是 <strong>JDK 8 的默认收集器</strong>。
      </p>
      <p>
        Parallel 有个独门特性叫<strong>自适应调节</strong>（<code>-XX:+UseAdaptiveSizePolicy</code>）：
        你只要告诉它吞吐目标（<code>-XX:GCTimeRatio</code>）和最大停顿（<code>-XX:MaxGCPauseMillis</code>），
        它会自己动态调整新生代大小、Survivor 比例、晋升阈值，省去手工调参。代价是行为不太可预测，
        所以追求稳定停顿时人们更倾向 G1。
      </p>

      <Callout variant="warn" title="别把「并行」和「并发」搞混">
        <p>
          这两个词在 GC 语境里含义精确：<strong>并行（parallel）</strong>指多个 GC 线程同时干活，但业务线程仍处于 STW；
          <strong>并发（concurrent）</strong>指 GC 线程和<strong>业务线程同时运行</strong>，业务基本不停。
          后面 CMS、G1、ZGC 追求的「低停顿」，靠的正是把大量工作做成「并发」而非「并行」。
        </p>
        <p>
          一个记忆锚点：Parallel 是「人多力量大，但你得先停下」；Concurrent 是「我边干你边用，互不耽误」。
          面试被问到这两个词，能用一句话区分清楚，立刻显出功底。
        </p>
      </Callout>

      <h2>CMS：第一个主打低停顿的并发收集器</h2>
      <p>
        <em>CMS</em>（Concurrent Mark Sweep）专为<strong>低停顿</strong>设计，让大部分标记工作和业务线程<strong>并发</strong>进行，
        从而大幅缩短 STW。它基于标记-清除算法，回收老年代时分初始标记、并发标记、重新标记、并发清除几个阶段，
        其中只有两次短暂的标记需要 STW。
      </p>
      <p>四个阶段值得记清楚，因为它是理解所有并发收集器的模板：</p>
      <ul>
        <li><strong>初始标记</strong>（STW，短）：只标记 GC Roots 直接关联的对象；</li>
        <li><strong>并发标记</strong>（与业务并发）：从根出发遍历整个对象图，最耗时但不停顿；</li>
        <li><strong>重新标记</strong>（STW，短）：用增量更新修正并发期间业务改动的引用（对应上一章三色标记的漏标）；</li>
        <li><strong>并发清除</strong>（与业务并发）：清掉死对象，空间记入空闲列表。</li>
      </ul>
      <p>但它有两个硬伤：</p>
      <ul>
        <li><strong>内存碎片</strong>：基于标记-清除，长期运行后老年代碎片化，可能因为没有连续空间而触发 Full GC；</li>
        <li>
          <strong>并发失败（Concurrent Mode Failure）</strong>：并发回收期间业务还在产生新对象，若老年代被填满而回收还没完成，
          就会退化成一次单线程的、漫长的 Full GC。
        </li>
        <li>
          <strong>抢 CPU</strong>：并发阶段 GC 线程要和业务线程争 CPU，吞吐会下降，低延迟是用一部分吞吐换来的。
        </li>
      </ul>
      <p>正因如此，CMS 在 <strong>JDK 9 被标记废弃，JDK 14 彻底移除</strong>，由 G1 接棒。</p>

      <h2>G1：分 Region、可预测停顿</h2>
      <p>
        <em>G1</em>（Garbage First）把堆切成许多大小相等的小块——<em>Region</em>，每个 Region 可以灵活担任 Eden、Survivor 或 Old 的角色。
        它不再固定地整块回收新生代或老年代，而是<strong>优先回收垃圾最多的那些 Region</strong>（这就是「Garbage First」的由来），
        用最小的代价换最大的空间回收。
      </p>
      <p>G1 的两个关键卖点：</p>
      <ul>
        <li>
          <strong>可预测的停顿</strong>：通过 <code>-XX:MaxGCPauseMillis</code> 设定一个停顿目标，G1 会尽量在这个时间预算内
          挑选合适数量的 Region 来回收；
        </li>
        <li>
          <strong>整理避免碎片</strong>：回收时采用复制 / 整理思路把存活对象搬到新 Region，从根上避免了 CMS 的碎片问题。
        </li>
      </ul>
      <p>
        两个 G1 专属概念要会：<strong>Humongous 对象</strong>——大小超过半个 Region 的对象会占用一个或多个连续
        Humongous Region，处理特殊、过多会引发问题；<strong>IHOP</strong>（<code>InitiatingHeapOccupancyPercent</code>）——
        老年代占比达到该阈值就启动并发标记周期，设太高会来不及、退化成 Full GC。
        G1 是 <strong>JDK 9 及以后的默认收集器</strong>，是当下大多数服务端应用的稳妥选择。
      </p>

      <h2>ZGC / Shenandoah：几乎全程并发的超低停顿</h2>
      <p>
        <em>ZGC</em> 和 <em>Shenandoah</em> 是新一代低延迟收集器，目标是把停顿压到<strong>极致——通常小于 10 毫秒，且几乎不随堆大小增长</strong>。
        ZGC 的核心黑科技是<em>着色指针</em>（colored pointers）和读屏障，让对象的标记、移动几乎<strong>全程与业务线程并发</strong>，
        即便堆有几十上百 GB，停顿也稳定在毫秒级。代价是吞吐略有损失、实现复杂。
      </p>
      <p>
        原理一句话点透：传统收集器移动对象时怕业务线程读到旧地址，所以要 STW；ZGC 把「这个对象是否被移动/正在被处理」
        的标记位<strong>染进指针本身</strong>（着色指针），业务线程每次读引用都过一道<strong>读屏障</strong>，
        发现指针「颜色不对」就当场把它修正到新地址（self-healing）。于是移动也能和业务并发，停顿不再随堆和存活对象增多而变长。
        ZGC 从 JDK 15 转正，JDK 21 起还有不分代/分代版本，进一步提升了吞吐。
      </p>

      <KeyIdea title="一条主线：吞吐 vs 停顿的取舍">
        <p>
          收集器的演进始终在两个目标之间权衡：<strong>吞吐量</strong>（单位时间能干多少活）和<strong>停顿时间</strong>（单次卡顿多久）。
          Parallel 极致追求吞吐，CMS / G1 / ZGC 一路追求更低停顿。没有「最好的收集器」，
          只有「最适合你的延迟与吞吐要求、以及堆大小」的收集器。低停顿不是白来的，
          它通常用<strong>读/写屏障的额外开销和一部分吞吐</strong>换来。
        </p>
      </KeyIdea>

      <h2>怎么选</h2>
      <ul>
        <li>客户端程序、小堆、资源受限（小容器单核）：<strong>Serial</strong>；</li>
        <li>后台计算、批处理，只要总吞吐、不在乎单次停顿：<strong>Parallel</strong>；</li>
        <li>一般服务端应用，要兼顾吞吐与停顿：<strong>G1</strong>（首选，也是默认）；</li>
        <li>超大堆、对延迟极敏感（如金融交易、实时系统）：<strong>ZGC / Shenandoah</strong>。</li>
      </ul>

      <h3>一张速查表</h3>
      <table>
        <thead>
          <tr>
            <th>收集器</th>
            <th>并行/并发</th>
            <th>算法</th>
            <th>主打</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Serial</td>
            <td>单线程 STW</td>
            <td>复制 + 标记整理</td>
            <td>简单、小堆</td>
            <td>仍在用</td>
          </tr>
          <tr>
            <td>Parallel</td>
            <td>并行 STW</td>
            <td>复制 + 标记整理</td>
            <td>吞吐量</td>
            <td>JDK8 默认</td>
          </tr>
          <tr>
            <td>CMS</td>
            <td>并发</td>
            <td>标记清除</td>
            <td>低停顿</td>
            <td>JDK14 移除</td>
          </tr>
          <tr>
            <td>G1</td>
            <td>并发 + 并行</td>
            <td>分 Region 整理</td>
            <td>可预测停顿</td>
            <td>JDK9+ 默认</td>
          </tr>
          <tr>
            <td>ZGC</td>
            <td>几乎全并发</td>
            <td>着色指针 + 读屏障</td>
            <td>{'<10ms 停顿'}</td>
            <td>JDK15+ 转正</td>
          </tr>
        </tbody>
      </table>

      <Example title="一个低延迟服务该选哪个">
        <p>
          设想一个对外的实时接口服务，要求 99 分位响应时间稳定、绝不能因为 GC 突然卡顿几百毫秒，堆又开到了 64GB。
        </p>
        <ul>
          <li>Parallel 吞吐虽高，但 Full GC 一来就是长 STW，不符合「绝不长卡顿」的要求，排除；</li>
          <li>G1 能把停顿控制在百毫秒级，已是很多服务的合理选择，但 64GB 大堆下偶尔仍可能超目标；</li>
          <li>
            若延迟要求极严（个位数毫秒），且堆很大，<strong>ZGC</strong> 是更好的答案——它几乎全程并发，
            停顿不随堆增大而恶化。
          </li>
        </ul>
        <p>这就是「看停顿 vs 吞吐、再看堆大小」的实际决策过程。</p>
      </Example>

      <Callout variant="tip" title="调优先动目标，别先动旋钮">
        <p>
          新手调 GC 爱直接堆一堆 <code>-XX</code> 参数，结果越调越乱。正确顺序是：
          先明确目标（要低延迟还是高吞吐、堆多大），选对收集器；再用 <code>-Xmx</code>、<code>MaxGCPauseMillis</code>
          这种「目标型」参数表达意图，让收集器自己去调内部细节；只有当默认行为确实不达标、且你看懂了 GC 日志，
          才动 Region 大小、IHOP 这种「细节旋钮」。常见反面教材：在 G1 上硬设 <code>-Xmn</code> 固定新生代，
          反而剥夺了 G1 为达成停顿目标而动态伸缩新生代的能力。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「有哪些垃圾收集器、怎么选」，按演进线讲：<strong>Serial（单线程）→ Parallel（并行、吞吐优先、JDK8 默认）
        → CMS（并发、低停顿、有碎片和并发失败、已移除）→ G1（分 Region、可预测停顿、JDK9+ 默认）→ ZGC / Shenandoah
        （着色指针、几乎全并发、停顿小于 10ms）</strong>。最后给选型口诀：看延迟还是吞吐、看堆多大。
        如果能点出「并行 ≠ 并发」、CMS 为何被淘汰、G1 为何成为默认，基本就是满分回答。
      </p>
      <p>
        高频追问：<strong>「CMS 的四个阶段哪些 STW？」</strong>——初始标记和重新标记 STW，并发标记和并发清除不停顿。
        <strong>「ZGC 为什么停顿不随堆增大？」</strong>——着色指针 + 读屏障让标记/移动并发、self-healing 修正引用。
        <strong>「G1 的 Humongous / IHOP 是什么？」</strong>——大对象专用 Region；老年代占比触发并发标记的阈值。
        能答出这几个细节，说明你不是只背了收集器名字。
      </p>

      <Practice title="切换收集器并对比 + G1 调优">
        <p>
          用下面的参数给同一个应用换上不同收集器，配合前两章的 GC 日志，对比它们的停顿时长和吞吐表现，
          亲手感受「吞吐优先」和「停顿优先」的差别。
        </p>
        <CodeBlock lang="bash" title="开启不同收集器" code={collectorParamsCode} />
        <p>
          重点对比 <code>-XX:+UseParallelGC</code> 和 <code>-XX:+UseG1GC</code> 下的最大停顿：你会看到 Parallel 总停顿短但单次可能很长，
          而 G1 努力把每次停顿压在你设定的 <code>MaxGCPauseMillis</code> 目标附近。再进一步，调 G1 的几个关键旋钮，
          观察 Mixed GC 频率和停顿如何变化：
        </p>
        <CodeBlock lang="bash" title="G1 进阶调优参数" code={g1TuneCode} />
        <p>
          试着把 <code>MaxGCPauseMillis</code> 从 200 调到 50，会看到 G1 每次回收的 Region 变少、停顿变短，
          但 GC 更频繁、吞吐下降——这就是「停顿与吞吐此消彼长」最直观的实验。
        </p>
      </Practice>

      <Summary
        points={[
          'Serial 单线程回收，简单无切换开销，适合客户端、小堆与单核小容器（JVM 会自动选）。',
          'Parallel 多线程并行、吞吐量优先，带自适应调节，是 JDK 8 的默认收集器。',
          '并行(parallel)是多 GC 线程但业务 STW，并发(concurrent)是 GC 与业务同时跑，低停顿靠并发实现。',
          'CMS 并发标记清除四阶段（初始标记/重新标记 STW），有碎片、并发失败、抢 CPU 问题，JDK 14 已移除。',
          'G1 把堆分 Region、优先回收垃圾多的块，可预测停顿且整理避免碎片，含 Humongous/IHOP 概念，JDK 9+ 默认。',
          'ZGC/Shenandoah 靠着色指针 + 读屏障几乎全程并发、self-healing 修正引用，停顿小于 10ms 且不随堆增大恶化。',
          '选型看「停顿 vs 吞吐」和堆大小：吞吐选 Parallel，通用选 G1，超低延迟大堆选 ZGC；调优先定目标再动旋钮。',
        ]}
      />
    </>
  )
}

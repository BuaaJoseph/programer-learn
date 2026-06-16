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

      <h2>Parallel：吞吐优先的并行收集器</h2>
      <p>
        <em>Parallel</em>（并行，也叫 Parallel Scavenge / Throughput Collector）把回收工作交给<strong>多个线程并行</strong>完成，
        充分利用多核 CPU。它的设计目标是<strong>吞吐量优先</strong>——即「业务运行时间 ÷（业务 + GC 时间）」尽可能高，
        适合那些不在乎单次停顿、但追求总处理能力的后台批处理、计算型任务。它是 <strong>JDK 8 的默认收集器</strong>。
      </p>

      <Callout variant="warn" title="别把「并行」和「并发」搞混">
        <p>
          这两个词在 GC 语境里含义精确：<strong>并行（parallel）</strong>指多个 GC 线程同时干活，但业务线程仍处于 STW；
          <strong>并发（concurrent）</strong>指 GC 线程和<strong>业务线程同时运行</strong>，业务基本不停。
          后面 CMS、G1、ZGC 追求的「低停顿」，靠的正是把大量工作做成「并发」而非「并行」。
        </p>
      </Callout>

      <h2>CMS：第一个主打低停顿的并发收集器</h2>
      <p>
        <em>CMS</em>（Concurrent Mark Sweep）专为<strong>低停顿</strong>设计，让大部分标记工作和业务线程<strong>并发</strong>进行，
        从而大幅缩短 STW。它基于标记-清除算法，回收老年代时分初始标记、并发标记、重新标记、并发清除几个阶段，
        其中只有两次短暂的标记需要 STW。
      </p>
      <p>但它有两个硬伤：</p>
      <ul>
        <li><strong>内存碎片</strong>：基于标记-清除，长期运行后老年代碎片化，可能因为没有连续空间而触发 Full GC；</li>
        <li>
          <strong>并发失败（Concurrent Mode Failure）</strong>：并发回收期间业务还在产生新对象，若老年代被填满而回收还没完成，
          就会退化成一次单线程的、漫长的 Full GC。
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
      <p>G1 是 <strong>JDK 9 及以后的默认收集器</strong>，是当下大多数服务端应用的稳妥选择。</p>

      <h2>ZGC / Shenandoah：几乎全程并发的超低停顿</h2>
      <p>
        <em>ZGC</em> 和 <em>Shenandoah</em> 是新一代低延迟收集器，目标是把停顿压到<strong>极致——通常小于 10 毫秒，且几乎不随堆大小增长</strong>。
        ZGC 的核心黑科技是<em>着色指针</em>（colored pointers）和读屏障，让对象的标记、移动几乎<strong>全程与业务线程并发</strong>，
        即便堆有几十上百 GB，停顿也稳定在毫秒级。代价是吞吐略有损失、实现复杂。
      </p>

      <KeyIdea title="一条主线：吞吐 vs 停顿的取舍">
        <p>
          收集器的演进始终在两个目标之间权衡：<strong>吞吐量</strong>（单位时间能干多少活）和<strong>停顿时间</strong>（单次卡顿多久）。
          Parallel 极致追求吞吐，CMS / G1 / ZGC 一路追求更低停顿。没有「最好的收集器」，
          只有「最适合你的延迟与吞吐要求、以及堆大小」的收集器。
        </p>
      </KeyIdea>

      <h2>怎么选</h2>
      <ul>
        <li>客户端程序、小堆、资源受限：<strong>Serial</strong>；</li>
        <li>后台计算、批处理，只要总吞吐、不在乎单次停顿：<strong>Parallel</strong>；</li>
        <li>一般服务端应用，要兼顾吞吐与停顿：<strong>G1</strong>（首选，也是默认）；</li>
        <li>超大堆、对延迟极敏感（如金融交易、实时系统）：<strong>ZGC / Shenandoah</strong>。</li>
      </ul>

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

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「有哪些垃圾收集器、怎么选」，按演进线讲：<strong>Serial（单线程）→ Parallel（并行、吞吐优先、JDK8 默认）
        → CMS（并发、低停顿、有碎片和并发失败、已移除）→ G1（分 Region、可预测停顿、JDK9+ 默认）→ ZGC / Shenandoah
        （着色指针、几乎全并发、停顿小于 10ms）</strong>。最后给选型口诀：看延迟还是吞吐、看堆多大。
        如果能点出「并行 ≠ 并发」、CMS 为何被淘汰、G1 为何成为默认，基本就是满分回答。
      </p>

      <Practice title="切换收集器并对比">
        <p>
          用下面的参数给同一个应用换上不同收集器，配合前两章的 GC 日志，对比它们的停顿时长和吞吐表现，
          亲手感受「吞吐优先」和「停顿优先」的差别。
        </p>
        <CodeBlock lang="bash" title="开启不同收集器" code={collectorParamsCode} />
        <p>
          重点对比 <code>-XX:+UseParallelGC</code> 和 <code>-XX:+UseG1GC</code> 下的最大停顿：你会看到 Parallel 总停顿短但单次可能很长，
          而 G1 努力把每次停顿压在你设定的 <code>MaxGCPauseMillis</code> 目标附近。
        </p>
      </Practice>

      <Summary
        points={[
          'Serial 单线程回收，简单无切换开销，适合客户端与小堆。',
          'Parallel 多线程并行、吞吐量优先，是 JDK 8 的默认收集器。',
          'CMS 并发标记清除、低停顿，但有内存碎片和并发失败问题，JDK 14 已移除。',
          'G1 把堆分成 Region、优先回收垃圾多的块，可预测停顿且整理避免碎片，是 JDK 9+ 的默认收集器。',
          'ZGC / Shenandoah 靠着色指针几乎全程并发，停顿小于 10ms 且不随堆增大而恶化，适合超大堆与低延迟场景。',
          '选型看「停顿 vs 吞吐」和堆大小：吞吐选 Parallel，通用选 G1，超低延迟大堆选 ZGC。',
        ]}
      />
    </>
  )
}

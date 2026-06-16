import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import HeapGen from '@/courses/jvm/illustrations/HeapGen.jsx'

const genParamsCode = `# 设置新生代大小为 512MB
-Xmn512m

# Eden : Survivor 比例（默认 8 表示 Eden:S0:S1 = 8:1:1）
-XX:SurvivorRatio=8

# 对象晋升老年代的年龄阈值（默认 15，最大 15）
-XX:MaxTenuringThreshold=15

# 大于该值的对象直接进老年代（这里设为 1MB）
-XX:PretenureSizeThreshold=1048576`

const ageHistoCode = `# 打印每次 Minor GC 后各年龄段对象的大小分布
java -Xlog:gc+age=trace -jar app.jar

# 输出类似：
# Age 1: 3145728 bytes, 3145728 total
# Age 2: 1048576 bytes, 4194304 total
# 用它判断"晋升阈值设多少合适"、"是不是发生了动态年龄晋升"
# 老参数等价物：-XX:+PrintTenuringDistribution`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章说到「分代收集」要把堆按存活率分区，这一章就把这张分区图讲透：新生代和老年代到底怎么划，
          一个对象从出生到「升级」要走哪几步，以及大家最常听、却最容易答错的 Minor GC、Major GC、Full GC 到底有什么区别。
        </p>
      </Lead>

      <h2>堆的分代结构</h2>
      <p>
        Java 堆主要分成<strong>新生代</strong>（Young）和<strong>老年代</strong>（Old）。新生代又细分为三块：
        一块 <em>Eden</em> 区，两块大小相等的 <em>Survivor</em> 区（习惯叫 S0 和 S1，也叫 From 和 To）。
        默认比例由 <code>-XX:SurvivorRatio=8</code> 控制，即 <strong>Eden : S0 : S1 = 8 : 1 : 1</strong>——
        新生代里 80% 给 Eden，两个 Survivor 各占 10%。
      </p>
      <p>
        为什么要两个 Survivor？因为新生代用的是复制算法：回收时把 Eden 和「正在用的那个 Survivor」里的存活对象，
        统一复制到「空着的那个 Survivor」，两个 Survivor 轮流当「空闲收容区」，始终留一块空着备用。
      </p>
      <p>
        换个角度想：如果只用一个 Survivor，复制时存活对象会和原有对象混在一起，要么产生碎片、要么得原地整理，
        失去复制算法「无碎片、指针碰撞分配」的优势。用两个 Survivor 轮换，等于每次都有一块「干净空白」的目标区，
        复制完把旧的 Eden + From 整块清空即可——这就是「8:1:1 而不是 8:2」的真正原因：
        只浪费一个 Survivor（10%）的空间，却换来了复制算法的全部好处。
      </p>

      <HeapGen />

      <h2>对象的一生：从 Eden 到老年代</h2>
      <p>
        新对象绝大多数<strong>诞生在 Eden 区</strong>。当 Eden 放满，就触发一次 <em>Minor GC</em>（新生代回收）：
        把 Eden 和当前 Survivor 中还活着的对象复制到另一个 Survivor，没活下来的直接清掉。
        因为新生代对象大多朝生夕死、存活率低，Minor GC <strong>非常频繁但也非常快</strong>。
      </p>
      <h3>对象年龄与晋升</h3>
      <p>
        每个对象有个「年龄」计数（就存在第一卷讲的对象头 Mark Word 里，只有 4 位、所以最大 15）：
        每熬过一次 Minor GC（被复制到 Survivor 一次），年龄加一。当年龄达到
        <strong>晋升阈值</strong>（默认 15，由 <code>-XX:MaxTenuringThreshold</code> 控制），就被「提拔」进<strong>老年代</strong>。
        年龄上限是 15 不是拍脑袋定的，而是 Mark Word 里只给分代年龄留了 4 个 bit，最大就只能表示到 15。
      </p>
      <h3>另外两条「捷径」进老年代</h3>
      <ul>
        <li>
          <strong>动态年龄判定</strong>：不一定非要熬到 15 岁。如果某个 Survivor 中，同年龄及以下对象的总大小
          超过了 Survivor 的一半，那么<strong>大于等于该年龄</strong>的对象会直接晋升，无需等到阈值。
        </li>
        <li>
          <strong>大对象直接进老年代</strong>：超过 <code>-XX:PretenureSizeThreshold</code> 的大对象（比如很长的数组），
          会跳过 Eden 直接分配到老年代，避免在新生代里来回复制的巨大开销。
        </li>
        <li>
          <strong>分配担保 / Survivor 放不下</strong>：一次 Minor GC 后存活对象太多、Survivor 装不下，
          会通过「空间分配担保」直接把它们放进老年代。
        </li>
      </ul>

      <Example title="一个对象从 Eden 一路晋升">
        <p>跟踪一个普通对象 <code>obj</code> 的旅程：</p>
        <ul>
          <li>出生在 Eden；</li>
          <li>第一次 Minor GC 时还被引用着，复制到 S0，年龄 = 1；</li>
          <li>之后每次 Minor GC 都活着，在 S0、S1 之间来回复制，年龄一路加到 15；</li>
          <li>年龄到达阈值，<code>obj</code> 晋升到老年代，从此不再参与 Minor GC；</li>
          <li>它会一直留在老年代，直到某次回收老年代的 GC 才可能被清理。</li>
        </ul>
        <p>这就是「新生代频繁洗牌、老年代沉淀长寿对象」的真实写照。</p>
      </Example>

      <Callout variant="tip" title="动态年龄判定容易被忽视，却很关键">
        <p>
          很多人以为「不到 15 岁绝不会晋升」，这是误区。动态年龄判定的设计意图是：如果一批同龄对象已经占满半个
          Survivor，说明它们大概率会长期存活，与其在两个 Survivor 间反复搬运，不如提前送进老年代。
          实战里如果你看到「明明 <code>MaxTenuringThreshold=15</code>，对象却很年轻就进了老年代」，
          十有八九就是动态年龄判定在起作用——多半是 Survivor 设小了，导致频繁触发。
        </p>
      </Callout>

      <h2>Minor / Major / Full GC 到底差在哪</h2>
      <ul>
        <li><strong>Minor GC</strong>（也叫 Young GC）：只回收<strong>新生代</strong>。触发条件是 Eden 满，频繁但很快。</li>
        <li><strong>Major GC</strong>：通常指回收<strong>老年代</strong>的 GC（不同语境略有出入，面试中说清「老年代回收」即可）。</li>
        <li>
          <strong>Full GC</strong>：回收<strong>整个堆</strong>（新生代 + 老年代），通常还包括方法区。它的 STW 时间最长、
          最伤性能。
        </li>
      </ul>
      <p>
        额外提一个新词，G1 时代常出现：<strong>Mixed GC</strong>（混合回收）。它一次同时回收整个新生代和<strong>部分</strong>老年代
        Region，是 G1 控制老年代增长、避免攒到 Full GC 的常规手段——既不是纯 Young，也不是全堆 Full，介于两者之间。
        看 G1 的日志时分清 Young / Mixed / Full 三种，调优才有的放矢。
      </p>
      <h3>什么时候会触发 Full GC</h3>
      <ul>
        <li>老年代空间不足（对象晋升时塞不下）；</li>
        <li>方法区 / 元空间（Metaspace）空间不足；</li>
        <li>显式调用 <code>System.gc()</code>（只是建议，但常会引发 Full GC）；</li>
        <li>Minor GC 后存活对象太多、老年代担保失败；</li>
        <li>G1 的并发标记没赶上分配速度，触发 Full GC 兜底（即 Evacuation Failure / to-space exhausted）。</li>
      </ul>

      <KeyIdea title="为什么要尽量避免 Full GC">
        <p>
          Full GC 要扫描并整理整个堆，STW 时间往往是 Minor GC 的几十倍甚至上百倍，期间整个应用<strong>完全卡死</strong>。
          线上服务一次长 Full GC 就可能造成大量请求超时。所以 GC 调优的核心目标，就是
          <strong>让对象尽量在新生代被快速回收、减少晋升、从而减少 Full GC 的频率与时长</strong>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="频繁 Full GC 往往是内存泄漏的信号">
        <p>
          如果监控里看到 Full GC 越来越频繁、每次回收后老年代占用却降不下来，多半是<strong>有对象本该死却被一直引用着</strong>
          （比如静态集合不断往里塞、缓存没设上限）。这时不要急着调参数，先用堆转储（heap dump）分析是谁在「占着茅坑」——
          调参治标，找出泄漏才治本。
        </p>
        <p>
          排障套路固定：<code>jstat -gcutil &lt;pid&gt; 1000</code> 看各区占用和 GC 次数随时间的变化，
          确认是「持续上涨不回落」（泄漏）还是「上涨后能回落」（只是分配快、调参即可）；
          若疑似泄漏，<code>jmap -dump:live,format=b,file=heap.hprof &lt;pid&gt;</code> 导出堆，
          用 MAT / JProfiler 看「支配树」找出占内存最大的对象和它的 GC Root 引用链。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「新生代怎么划分」，先答 <strong>Eden + 两个 Survivor，默认 8:1:1</strong>，再讲对象在 Eden 出生、
        Minor GC 时复制到 Survivor、年龄到 15（或动态年龄判定）晋升老年代、大对象直接进老年代。
        被问「Minor GC 和 Full GC 区别」，强调 <strong>回收范围</strong>（新生代 vs 整个堆）和 <strong>STW 代价</strong>
        （快 vs 慢），并主动补一句「调优就是要减少 Full GC」。这套答下来逻辑完整，加分明显。
      </p>
      <p>
        高频追问：<strong>「为什么是两个 Survivor、8:1:1？」</strong>——答轮换提供干净目标区、保留复制算法优势、只浪费 10%。
        <strong>「为什么年龄上限是 15？」</strong>——答 Mark Word 分代年龄只有 4 位。
        <strong>「对象一定要满 15 才晋升吗？」</strong>——不一定，还有动态年龄判定、大对象直入、分配担保三条捷径。
        <strong>「怎么判断是泄漏还是分配快？」</strong>——看老年代回收后能否回落，配合 jstat / 堆 dump 分析。
      </p>

      <Practice title="用参数观察分代行为 + 看年龄分布">
        <p>
          通过下面这几个参数，可以亲手调整新生代大小、Survivor 比例和晋升阈值，再配合上一章的 GC 日志，
          观察对象晋升和 GC 频率怎么随之变化。
        </p>
        <CodeBlock lang="bash" title="常用分代调优参数" code={genParamsCode} />
        <p>
          试着把 <code>-XX:MaxTenuringThreshold</code> 调小（比如 1），你会看到对象很快就晋升到老年代，
          Full GC 也随之变多——这能让你直观体会「晋升过快」的代价。
        </p>
        <p>
          再打开年龄分布日志，直接看每个年龄段的对象有多大，就能判断「晋升阈值该设几」「是不是触发了动态年龄判定」：
        </p>
        <CodeBlock lang="bash" title="观察对象年龄分布" code={ageHistoCode} />
        <p>
          如果某个年龄段对象突然占满半个 Survivor，下一次 GC 它们就会被动态晋升——把这个日志和老年代占用曲线对着看，
          「Survivor 太小 → 提前晋升 → Full GC 变多」这条因果链就一目了然了。
        </p>
      </Practice>

      <Summary
        points={[
          '新生代由 Eden + 两个 Survivor 组成，默认比例 8:1:1，两个 Survivor 轮流空闲以配合复制算法、只浪费 10%。',
          '对象在 Eden 出生，Eden 满触发 Minor GC，存活对象复制到 Survivor，频繁但快。',
          '对象每熬过一次 Minor GC 年龄加一，达到阈值（默认 15）晋升老年代；上限 15 受限于 Mark Word 的 4 位分代年龄。',
          '动态年龄判定、大对象直入、分配担保都会让对象提前或直接进入老年代。',
          'Minor GC 只回收新生代，Full GC 回收整个堆、STW 最长；G1 还有介于两者之间的 Mixed GC。',
          '调优核心是减少晋升、减少 Full GC；频繁 Full GC 且老年代不回落常常是内存泄漏的信号，用 jstat/堆 dump 定位。',
        ]}
      />
    </>
  )
}

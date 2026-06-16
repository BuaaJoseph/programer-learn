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

      <HeapGen />

      <h2>对象的一生：从 Eden 到老年代</h2>
      <p>
        新对象绝大多数<strong>诞生在 Eden 区</strong>。当 Eden 放满，就触发一次 <em>Minor GC</em>（新生代回收）：
        把 Eden 和当前 Survivor 中还活着的对象复制到另一个 Survivor，没活下来的直接清掉。
        因为新生代对象大多朝生夕死、存活率低，Minor GC <strong>非常频繁但也非常快</strong>。
      </p>
      <h3>对象年龄与晋升</h3>
      <p>
        每个对象有个「年龄」计数：每熬过一次 Minor GC（被复制到 Survivor 一次），年龄加一。当年龄达到
        <strong>晋升阈值</strong>（默认 15，由 <code>-XX:MaxTenuringThreshold</code> 控制），就被「提拔」进<strong>老年代</strong>。
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

      <h2>Minor / Major / Full GC 到底差在哪</h2>
      <ul>
        <li><strong>Minor GC</strong>（也叫 Young GC）：只回收<strong>新生代</strong>。触发条件是 Eden 满，频繁但很快。</li>
        <li><strong>Major GC</strong>：通常指回收<strong>老年代</strong>的 GC（不同语境略有出入，面试中说清「老年代回收」即可）。</li>
        <li>
          <strong>Full GC</strong>：回收<strong>整个堆</strong>（新生代 + 老年代），通常还包括方法区。它的 STW 时间最长、
          最伤性能。
        </li>
      </ul>
      <h3>什么时候会触发 Full GC</h3>
      <ul>
        <li>老年代空间不足（对象晋升时塞不下）；</li>
        <li>方法区 / 元空间（Metaspace）空间不足；</li>
        <li>显式调用 <code>System.gc()</code>（只是建议，但常会引发 Full GC）；</li>
        <li>Minor GC 后存活对象太多、老年代担保失败。</li>
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
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「新生代怎么划分」，先答 <strong>Eden + 两个 Survivor，默认 8:1:1</strong>，再讲对象在 Eden 出生、
        Minor GC 时复制到 Survivor、年龄到 15（或动态年龄判定）晋升老年代、大对象直接进老年代。
        被问「Minor GC 和 Full GC 区别」，强调 <strong>回收范围</strong>（新生代 vs 整个堆）和 <strong>STW 代价</strong>
        （快 vs 慢），并主动补一句「调优就是要减少 Full GC」。这套答下来逻辑完整，加分明显。
      </p>

      <Practice title="用参数观察分代行为">
        <p>
          通过下面这几个参数，可以亲手调整新生代大小、Survivor 比例和晋升阈值，再配合上一章的 GC 日志，
          观察对象晋升和 GC 频率怎么随之变化。
        </p>
        <CodeBlock lang="bash" title="常用分代调优参数" code={genParamsCode} />
        <p>
          试着把 <code>-XX:MaxTenuringThreshold</code> 调小（比如 1），你会看到对象很快就晋升到老年代，
          Full GC 也随之变多——这能让你直观体会「晋升过快」的代价。
        </p>
      </Practice>

      <Summary
        points={[
          '新生代由 Eden + 两个 Survivor 组成，默认比例 8:1:1，两个 Survivor 轮流空闲以配合复制算法。',
          '对象在 Eden 出生，Eden 满触发 Minor GC，存活对象复制到 Survivor，频繁但快。',
          '对象每熬过一次 Minor GC 年龄加一，达到阈值（默认 15）晋升老年代。',
          '动态年龄判定和大对象会让对象提前或直接进入老年代。',
          'Minor GC 只回收新生代，Full GC 回收整个堆、STW 最长、最伤性能。',
          '调优核心是减少晋升、减少 Full GC；频繁 Full GC 常常是内存泄漏的信号。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import GcAlgorithms from '@/courses/jvm/illustrations/GcAlgorithms.jsx'

const gcLogCode = `# JDK 9 及以后：统一日志框架，打印 GC 详情
java -Xlog:gc* -jar app.jar

# JDK 8 及以前：老的 GC 日志参数
java -XX:+PrintGCDetails -XX:+PrintGCDateStamps \\
     -Xloggc:gc.log -jar app.jar`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章解决了「谁是垃圾」，这一章解决「怎么把垃圾清掉」。
          清理内存看似简单，其实有三种经典思路，各有取舍：标记-清除、复制、标记-整理。
          理解它们的优缺点，才能明白为什么新生代和老年代要用<strong>不一样</strong>的算法。
        </p>
      </Lead>

      <h2>标记-清除：最朴素，但留下碎片</h2>
      <p>
        <em>Mark-Sweep</em>（标记-清除）分两步：先<strong>标记</strong>出所有存活对象（靠上一章的可达性分析），
        再把没被标记的对象一律<strong>清除</strong>。它是所有回收算法的基础，思路最直白。
      </p>
      <p>
        但它有两个毛病。一是效率不稳定，标记和清除都要扫描大量对象；二是更要命的——清除后会留下一地
        <strong>不连续的内存碎片</strong>。空闲内存零零散散，当需要分配一个大对象却找不到一块足够大的连续空间时，
        就会被迫提前触发又一次回收。
      </p>

      <h2>复制算法：用空间换整齐</h2>
      <p>
        <em>Copying</em>（复制）算法把内存一分为二，每次只用其中一半。回收时，把存活对象<strong>挨个复制</strong>到
        另一半空闲区域，然后把用过的那半整块清空。因为存活对象被紧凑地排在一起，<strong>完全没有碎片</strong>，
        分配新对象只要移动一个指针即可，飞快。
      </p>
      <p>
        代价是<strong>浪费一半内存</strong>——任何时刻都有一半空着备用。所以它只适合「每次回收只有少量对象存活」的场景：
        复制的成本低，浪费的那半也不算太亏。这恰好就是<strong>新生代</strong>的特点。
      </p>

      <h2>标记-整理：移动对象，消除碎片</h2>
      <p>
        <em>Mark-Compact</em>（标记-整理）同样先标记存活对象，但第二步不是直接清除，而是把所有存活对象向内存一端
        <strong>移动（整理）</strong>，然后清掉边界以外的全部空间。它既没有碎片，又不像复制算法那样浪费一半内存。
      </p>
      <p>
        代价是移动对象、更新引用的开销较大，且移动期间往往需要暂停应用。它适合「大量对象长期存活」的场景，
        也就是<strong>老年代</strong>。
      </p>

      <GcAlgorithms />

      <h2>分代收集：按存活率分区，各用其法</h2>
      <p>
        三种算法没有「最好」，只有「最合适」。于是有了<em>分代收集</em>（generational collection）思想：
        根据对象存活率把堆分成不同区域，<strong>对不同区域用不同算法</strong>。
      </p>
      <ul>
        <li><strong>新生代</strong>：绝大多数对象「朝生夕死」，每次回收只有少量存活，用<strong>复制算法</strong>最划算；</li>
        <li><strong>老年代</strong>：能活到这里的对象往往会长期存活，用<strong>标记-整理</strong>，既省内存又无碎片。</li>
      </ul>

      <Example title="为什么新生代用复制、老年代用整理">
        <p>关键在两边对象的「存活率」截然不同：</p>
        <ul>
          <li>
            新生代里 90% 以上的对象很快就死，每次回收只剩一小撮存活。复制这一小撮的成本极低，
            而且换来零碎片和极快的分配——用复制算法正合适。
          </li>
          <li>
            老年代里对象大多长寿，如果用复制算法，每次都要搬动一大批存活对象，还得白白空出一半内存，太亏。
            用标记-整理，只在必要时移动、压实，碎片也没了。
          </li>
        </ul>
        <p>这就是分代思想的精髓：让算法去匹配数据的存活特性，而不是一套算法包打天下。</p>
      </Example>

      <KeyIdea title="STW：绕不开的停顿">
        <p>
          无论哪种算法，在标记、移动这些关键阶段，为了不让对象关系在回收途中被应用线程改乱，
          JVM 往往需要暂停所有业务线程，这就是 <em>Stop The World</em>（STW）。STW 期间应用「卡住」不响应，
          所以 GC 调优的核心目标之一，就是<strong>尽量缩短 STW 时间</strong>——这也是后面 CMS、G1、ZGC 不断演进的主线。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="碎片不是小问题">
        <p>
          内存碎片的危害容易被低估：明明总空闲内存还很多，却因为没有一块足够大的<strong>连续</strong>空间，
          导致大对象分配失败，从而提前触发 Full GC 甚至 OOM。这正是标记-清除式收集器（如 CMS）在长期运行后
          常见的痛点，也是 G1 等采用整理思路的收集器要解决的问题。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「GC 有哪些算法」，按「标记-清除 → 复制 → 标记-整理」的顺序讲，每个都点出<strong>核心缺点</strong>：
        标记-清除有碎片，复制浪费一半内存，标记-整理移动开销大。然后用分代收集收尾——
        新生代存活率低用复制，老年代存活率高用标记-整理，并提一句所有算法都绕不开 STW。
        能把「算法缺点」和「为什么这样分代」讲通，就说明你是真懂而不是背的。
      </p>

      <Practice title="打开 GC 日志，亲眼看回收">
        <p>
          理论之外，最好的学习是看真实的 GC 日志。通过启动参数让 JVM 把每次回收的类型、耗时、前后内存都打印出来，
          就能直观看到新生代回收的频繁与快速、老年代回收的沉重与缓慢。
        </p>
        <CodeBlock lang="bash" title="开启 GC 日志" code={gcLogCode} />
        <p>
          拿日志里出现的 <code>Pause Young</code>、<code>Pause Full</code> 之类字样，对照本章和下一章的内容，
          看看每次回收停顿了多久、回收了多少——这比记一百遍定义都管用。
        </p>
      </Practice>

      <Summary
        points={[
          '标记-清除是基础算法，简单但会留下大量不连续的内存碎片。',
          '复制算法把内存一分为二、把存活对象复制到另一半，无碎片、分配快，但浪费一半内存。',
          '标记-整理移动存活对象到一端再清理，无碎片也不浪费内存，但移动开销大。',
          '分代收集让算法匹配存活率：新生代用复制，老年代用标记-整理。',
          '新生代对象朝生夕死、存活少，复制最划算；老年代对象长寿，整理更省内存。',
          'STW（Stop The World）是回收的固有停顿，缩短它是 GC 调优与收集器演进的主线。',
        ]}
      />
    </>
  )
}

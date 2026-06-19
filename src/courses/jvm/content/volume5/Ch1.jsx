import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const genLayout = `// 分代堆布局（以 G1 之前的传统分代为例）
+-------------------- 堆 Heap --------------------+
|        新生代 Young (约 1/3)                     |
|   +--------+   +--------+   +--------+           |
|   |  Eden  |   |   S0   |   |   S1   |           |
|   |  8     |   |   1    |   |   1    |  (默认 8:1:1)|
|   +--------+   +--------+   +--------+           |
|        老年代 Old (约 2/3)                       |
+-------------------------------------------------+
// 元空间在本地内存，不在堆里`

const tricolor = `// 三色标记：把对象按标记进度分三色
白色：尚未被访问到 —— 标记结束仍为白色 = 垃圾
灰色：自己被访问到，但它引用的对象还没全部扫描完
黑色：自己和它引用的对象都已扫描完，确定存活

// 漏标问题（并发标记时用户线程同时改引用）：
// 当 1) 一个黑色对象新增了对白色对象的引用，且
//    2) 该白色对象与所有灰色对象之间的引用全被删除
// 这个白色对象会被错杀。解法：写屏障（增量更新 / 原始快照 SATB）`

const gcArgs = `# 与分代/GC 相关的常用参数
-Xmn256m                      # 新生代大小
-XX:NewRatio=2                # 老年代:新生代 = 2:1
-XX:SurvivorRatio=8           # Eden:Survivor = 8:1（即 8:1:1）
-XX:MaxTenuringThreshold=15   # 对象晋升老年代的年龄阈值
-XX:PretenureSizeThreshold=1m # 超过此大小的对象直接进老年代（仅部分收集器）`

export default function Ch1() {
  return (
    <article>
      <Lead>
        垃圾回收是 JVM 面试绝对的重头戏，问题密度最高。这一章把 GC 的「基础设施」逐题打透：
        有哪些回收算法、怎么判断一个对象是不是垃圾、为什么要分代、新生代为什么还要细分成
        Eden 和两个 Survivor、三色标记是怎么回事、young/old/full/mixed 这几种 GC 到底有什么区别、
        各自的触发条件，以及 PermGen 为什么被 Metaspace 取代。把这一章作为后面收集器章节的地基。
      </Lead>

      <h2>一、垃圾回收算法有哪些？</h2>
      <p>
        基础回收算法有三种，再加上「分代收集」这个组合策略：
      </p>
      <table>
        <thead>
          <tr><th>算法</th><th>原理</th><th>优点</th><th>缺点</th></tr>
        </thead>
        <tbody>
          <tr><td>标记-清除 Mark-Sweep</td><td>标记存活对象，清除其余</td><td>简单</td><td>产生内存碎片</td></tr>
          <tr><td>复制 Copying</td><td>分两块，存活对象复制到另一块，整块清空</td><td>无碎片、效率高</td><td>浪费一半空间</td></tr>
          <tr><td>标记-整理 Mark-Compact</td><td>标记后把存活对象向一端移动，清理边界外</td><td>无碎片</td><td>移动对象成本高</td></tr>
        </tbody>
      </table>
      <p>
        <strong>分代收集</strong>不是第四种算法，而是一种<strong>组合策略</strong>：根据对象寿命把堆分代，
        对「朝生夕灭」的新生代用复制算法，对「长寿」的老年代用标记-清除或标记-整理。详见第三题。
      </p>

      <h2>二、如何判断一个对象是垃圾？</h2>
      <p>
        两种思路：引用计数法和可达性分析。JVM 用的是后者。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>引用计数</th><th>可达性分析</th></tr>
        </thead>
        <tbody>
          <tr><td>原理</td><td>对象有个计数器，被引用 +1，引用失效 -1，为 0 即垃圾</td><td>从 GC Roots 出发遍历引用链，走不到的对象即垃圾</td></tr>
          <tr><td>致命缺陷</td><td>无法处理循环引用（A 引用 B、B 引用 A，计数都不为 0 却都没用）</td><td>需要 STW 找根、遍历成本高</td></tr>
          <tr><td>谁在用</td><td>Python、部分引用计数语言</td><td>HotSpot JVM</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        JVM 用<strong>可达性分析</strong>，根本原因是引用计数<strong>解决不了循环引用</strong>。
        所谓 GC Roots，是一组「一定存活」的起点：虚拟机栈中引用的对象、方法区里的静态变量与常量、
        本地方法栈 JNI 引用的对象、被同步锁持有的对象等。从这些根走不到的对象，就是垃圾。
      </KeyIdea>
      <p>
        补充追问：不可达的对象一定会立刻被回收吗？不一定。对象「被判死」要经历两次标记，
        若它重写了 <code>finalize()</code> 且尚未被调用，会有一次「自救」机会
        （但 <code>finalize</code> 已不推荐使用，了解即可）。
      </p>

      <h2>三、为什么要分新生代和老年代？</h2>
      <p>
        因为不同对象的寿命差异极大，<strong>分代假说</strong>指出：绝大多数对象朝生夕灭，
        只有少数能活很久。既然如此，就该对它们区别对待。
      </p>
      <KeyIdea>
        分代的本质是<strong>「对症下药，让每次 GC 只扫该扫的部分」</strong>。新生代对象死得快，
        用复制算法（每次只复制极少数存活者，效率极高）；老年代对象长寿、存活率高，
        若也用复制就要复制大量对象、还浪费一半空间，所以改用标记-整理/标记-清除。
        分代让大多数 GC 只需扫描小小的新生代（Minor GC），既快又不影响老年代，大幅降低停顿。
      </KeyIdea>
      <CodeBlock lang="text" title="分代堆布局" code={genLayout} />

      <h2>四、新生代为什么要分 Eden、S0、S1？</h2>
      <p>
        新生代用复制算法，但「对半分」太浪费——一半空间永远空着。HotSpot 的优化是把新生代分成
        <strong>一个 Eden + 两个 Survivor（S0、S1）</strong>，默认比例 8:1:1。
      </p>
      <ul>
        <li>新对象都先在 <strong>Eden</strong> 分配。</li>
        <li>Minor GC 时，把 Eden 和「正在用的那个 Survivor（如 S0）」里的存活对象，复制到「空的那个 Survivor（S1）」，然后清空 Eden 和 S0。</li>
        <li>下一次 GC 角色互换：存活对象从 Eden+S1 复制到 S0。两个 Survivor 始终一个在用、一个备用。</li>
      </ul>
      <KeyIdea>
        这样只浪费 <strong>10%</strong>（一个 Survivor）而不是 50% 的空间，同时仍享受复制算法「无碎片」的好处。
        对象在两个 Survivor 间每来回熬过一次 GC，年龄 +1，达到阈值
        （默认 15，<code>MaxTenuringThreshold</code>）就<strong>晋升</strong>到老年代。
      </KeyIdea>
      <Callout variant="warn" title="Survivor 放不下怎么办">
        如果一次 Minor GC 后存活对象太多，Survivor 装不下，会通过<strong>分配担保</strong>
        直接晋升到老年代。这也是「老年代被快速填满、Full GC 频繁」的一个隐藏诱因。
      </Callout>

      <h2>五、三色标记算法</h2>
      <p>
        现代并发收集器（CMS、G1、ZGC）都基于三色标记来做可达性分析。把对象按标记进度染三种颜色：
      </p>
      <CodeBlock lang="text" title="三色标记与漏标" code={tricolor} />
      <p>
        难点在于<strong>并发标记</strong>：GC 线程在标记的同时，用户线程还在改引用，可能造成
        「<strong>漏标</strong>」（本该存活的对象被错当垃圾回收，这是致命错误）。漏标只在两个条件
        <strong>同时满足</strong>时发生：黑色对象新增了指向白色对象的引用，且该白色对象到灰色对象的所有路径被断开。
      </p>
      <table>
        <thead>
          <tr><th>解法</th><th>思路</th><th>谁用</th></tr>
        </thead>
        <tbody>
          <tr><td>增量更新 Incremental Update</td><td>记录「黑色新增的引用」，重新扫描黑色对象</td><td>CMS</td></tr>
          <tr><td>原始快照 SATB</td><td>记录「被删除的引用」，按标记开始时的快照处理</td><td>G1、ZGC</td></tr>
        </tbody>
      </table>
      <p>这两种解法都靠<strong>写屏障</strong>实现，细节在下一章收集器里展开。</p>

      <h2>六、young / old / full / mixed GC 有什么区别？</h2>
      <table>
        <thead>
          <tr><th>GC 类型</th><th>回收范围</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>Young GC（Minor GC）</td><td>仅新生代</td><td>频繁、快、停顿短</td></tr>
          <tr><td>Old GC / Major GC</td><td>仅老年代</td><td>CMS 这类并发老年代回收</td></tr>
          <tr><td>Full GC</td><td>整个堆 + 方法区</td><td>最重、停顿最长，要尽量避免</td></tr>
          <tr><td>Mixed GC</td><td>整个新生代 + 部分老年代</td><td>G1 特有，回收收益高的老年代分区</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="术语别被绕晕">
        「Major GC」一词在不同资料里含义不一，有人指老年代回收、有人等同 Full GC。
        面试时建议直接用「Young GC / Full GC / G1 的 Mixed GC」这三个明确的词，避免歧义。
      </Callout>

      <h2>七、触发 Young GC 和 Full GC 的条件</h2>
      <p><strong>触发 Young GC：</strong>主要就一个——<strong>Eden 区满了</strong>，无法为新对象分配空间时触发。</p>
      <p><strong>触发 Full GC 的常见情况：</strong></p>
      <ul>
        <li>老年代空间不足（对象晋升或大对象直接进老年代后放不下）。</li>
        <li>方法区 / 元空间不足。</li>
        <li>Minor GC 前的<strong>分配担保失败</strong>（预估晋升对象 &gt; 老年代剩余）。</li>
        <li>显式调用 <code>System.gc()</code>（建议线上禁用：<code>-XX:+DisableExplicitGC</code>）。</li>
        <li>CMS 出现 concurrent mode failure（下一章讲）。</li>
      </ul>
      <CodeBlock lang="bash" title="分代相关参数" code={gcArgs} />

      <h2>八、PermGen 为什么被 Metaspace 取代？</h2>
      <p>
        JDK 8 用<strong>元空间（Metaspace）</strong>取代了<strong>永久代（PermGen）</strong>。原因有三：
      </p>
      <ol>
        <li><strong>大小难调、易 OOM</strong>：永久代在堆内，大小由 <code>-XX:MaxPermSize</code> 固定，
          类一多就 <code>PermGen space</code> OOM，调参又难拿捏。元空间放在<strong>本地内存</strong>，
          默认仅受机器内存限制，大大减少这类 OOM。</li>
        <li><strong>与 GC 解耦、便于回收</strong>：永久代的回收和堆 GC 绑在一起、效果差；
          元空间独立管理，类元数据的回收更高效。</li>
        <li><strong>合并 HotSpot 与 JRockit</strong>：Oracle 收购后要统一两套 JVM，JRockit 没有永久代概念，
          去掉永久代有利于二者融合。</li>
      </ol>
      <Example title="一个直观的差别">
        <p>
          线上服务用了大量动态代理，类越来越多。在 JDK 7 上，永久代很快撑爆报
          <code>PermGen space</code>，要不停调 <code>MaxPermSize</code>；升到 JDK 8 后，
          元空间默认用本地内存，同样的程序基本不再因类元数据而 OOM（但若不设上限，
          失控的类生成会吃光机器内存，所以生产仍建议设 <code>MaxMetaspaceSize</code>）。
        </p>
      </Example>

      <Summary
        points={[
          '三种基础算法：标记-清除(有碎片)、复制(浪费空间)、标记-整理(要移动)；分代收集是组合策略而非第四种算法。',
          '判断垃圾用可达性分析而非引用计数，根因是引用计数解决不了循环引用；从 GC Roots 走不到即垃圾。',
          '分代是为对症下药：新生代朝生夕灭用复制、老年代长寿用标记-整理，让多数 GC 只扫小新生代。',
          '新生代分 Eden+S0+S1(8:1:1) 是为只浪费 10% 空间还能用复制算法；熬过年龄阈值即晋升老年代。',
          '三色标记(白灰黑)支撑并发标记；并发会漏标，CMS 用增量更新、G1/ZGC 用 SATB，均靠写屏障实现。',
          'Young GC 只扫新生代(Eden 满触发)，Full GC 扫整堆+方法区(老年代/元空间不足、担保失败、System.gc 等触发)，G1 还有 Mixed GC。',
          'JDK 8 用本地内存的 Metaspace 取代堆内固定大小的 PermGen，减少 OOM、便于回收、利于 JVM 融合。',
        ]}
      />
    </article>
  )
}

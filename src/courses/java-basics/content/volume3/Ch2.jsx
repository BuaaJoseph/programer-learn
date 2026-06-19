import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const stackQueueSnippet = `import java.util.*;

// 栈（LIFO）：推荐用 Deque，而不是过时的 Stack 类
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
System.out.println(stack.pop());   // 2：后进先出

// 队列（FIFO）：用 LinkedList 或 ArrayDeque 实现 Queue
Queue<Integer> queue = new LinkedList<>();
queue.offer(1); queue.offer(2);
System.out.println(queue.poll());  // 1：先进先出`

const iteratorSnippet = `List<String> list = new ArrayList<>(List.of("a", "b", "c"));
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    if (s.equals("b")) {
        it.remove();   // 用迭代器自己的 remove 才安全，不会抛 ConcurrentModificationException
    }
}
System.out.println(list);   // [a, c]`

const optionalSnippet = `import java.util.Optional;

// 不要这样用 Optional：等于多写一层还得判 isPresent
Optional<String> opt = Optional.ofNullable(findName());

// 推荐链式：用 map 变换、orElse 给默认、ifPresent 消费
String name = Optional.ofNullable(findName())
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .orElse("匿名");

// orElseThrow：没值就抛异常，表达「这里必须有值」
String must = Optional.ofNullable(findName())
        .orElseThrow(() -> new IllegalStateException("name 不能为空"));`

const equalsHashSnippet = `public class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;                 // 同一对象，快速返回
        if (!(o instanceof Point)) return false;    // 类型不符
        Point p = (Point) o;
        return x == p.x && y == p.y;                // 比较关键字段
    }

    @Override public int hashCode() {
        return java.util.Objects.hash(x, y);        // 与 equals 用相同字段
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章收尾「常用类」：栈与队列的结构差异、迭代器 Iterator 的设计、用 Optional 优雅处理空值，
        以及最经典的 <code>hashCode</code>、<code>equals</code>、<code>==</code> 三者关系。
        最后一题几乎是 Java 面试的「必考中的必考」，本章会把它的契约讲到滴水不漏。
      </Lead>

      <h2>一、栈 vs 队列</h2>
      <KeyIdea>
        栈（Stack）是<strong>后进先出（LIFO）</strong>，只在一端进出，像一摞盘子；
        队列（Queue）是<strong>先进先出（FIFO）</strong>，一端进另一端出，像排队买票。
        两者都是线性结构，区别只在「进出顺序」。
      </KeyIdea>
      <CodeBlock lang="java" title="栈与队列的实现" code={stackQueueSnippet} />
      <h3>面试题 1：栈和队列有什么区别？Java 里怎么用？</h3>
      <table>
        <thead>
          <tr><th>维度</th><th>栈 Stack</th><th>队列 Queue</th></tr>
        </thead>
        <tbody>
          <tr><td>顺序</td><td>LIFO 后进先出</td><td>FIFO 先进先出</td></tr>
          <tr><td>操作端</td><td>同一端进出（top）</td><td>一端进（尾）一端出（头）</td></tr>
          <tr><td>典型操作</td><td>push / pop / peek</td><td>offer / poll / peek</td></tr>
          <tr><td>典型应用</td><td>方法调用栈、表达式求值、回溯、撤销</td><td>消息队列、BFS、任务缓冲</td></tr>
          <tr><td>推荐实现</td><td><code>ArrayDeque</code></td><td><code>ArrayDeque</code> / <code>LinkedList</code></td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="别再用古老的 Stack 类">
        <code>java.util.Stack</code> 继承自 <code>Vector</code>，所有方法都同步、性能差，且继承导致它暴露了
        一堆不该有的 List 方法（能从中间插入，违背栈语义）。官方推荐用 <code>ArrayDeque</code> 当栈用，更快也更纯粹。
      </Callout>

      <h2>二、迭代器 Iterator</h2>
      <h3>面试题 2：Iterator 是干什么的，为什么需要它？</h3>
      <p>
        <code>Iterator</code> 是遍历集合的<strong>统一接口</strong>，提供 <code>hasNext()</code>、<code>next()</code>、
        <code>remove()</code> 三个方法。它的价值在于<strong>把「遍历」从「具体集合结构」中解耦</strong>：
        不管底层是数组、链表还是树，调用方都用同一套方法遍历，无需关心内部实现。这正是迭代器设计模式。
      </p>
      <CodeBlock lang="java" title="用 Iterator 安全删除" code={iteratorSnippet} />
      <Callout variant="note" title="为什么遍历中删要用 Iterator.remove()？">
        上一卷讲过 foreach 中直接 <code>list.remove()</code> 会触发 fail-fast 抛
        <code>ConcurrentModificationException</code>。原因是集合的 <code>modCount</code> 和迭代器记录的
        <code>expectedModCount</code> 对不上。而 <code>Iterator.remove()</code> 会<strong>同步更新</strong>这两个计数，
        所以是遍历中删除元素的唯一安全方式（或用 <code>removeIf</code>）。
      </Callout>

      <h2>三、Optional</h2>
      <h3>面试题 3：Optional 是什么，怎么用才优雅？</h3>
      <p>
        <code>Optional</code>（Java 8）是一个<strong>可能为空也可能有值的容器</strong>，
        用来在 API 层面<strong>显式表达「这里可能没有值」</strong>，把空值检查从「靠记忆」变成「靠类型」，
        减少 NPE。它的精髓是配合 <code>map</code> / <code>filter</code> / <code>orElse</code> 链式处理，而不是简单地用 <code>isPresent</code> 再 <code>get</code>。
      </p>
      <CodeBlock lang="java" title="Optional 的优雅用法" code={optionalSnippet} />
      <table>
        <thead>
          <tr><th>方法</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ofNullable(x)</code></td><td>x 可能为 null 时安全包装</td></tr>
          <tr><td><code>map(fn)</code> / <code>flatMap</code></td><td>有值则变换，无值则保持空</td></tr>
          <tr><td><code>filter(pred)</code></td><td>有值且满足条件才保留</td></tr>
          <tr><td><code>orElse</code> / <code>orElseGet</code></td><td>无值时返回默认值（后者惰性求值）</td></tr>
          <tr><td><code>orElseThrow</code></td><td>无值时抛异常</td></tr>
          <tr><td><code>ifPresent(fn)</code></td><td>有值才执行消费逻辑</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="Optional 的使用边界">
        官方意图是把它<strong>用作方法返回值</strong>表达「可能无结果」，<strong>不建议</strong>把它当字段、
        当方法参数、或放进集合元素——会徒增包装开销和复杂度。也别习惯性地 <code>opt.get()</code>，
        那等于又把 NPE 换成了 <code>NoSuchElementException</code>，失去了 Optional 的意义。
      </Callout>

      <h2>四、hashCode、equals、==</h2>
      <h3>面试题 4：hashCode、equals 和 == 有什么关系？</h3>
      <KeyIdea>
        <code>==</code> 比的是<strong>引用</strong>（基本类型则比值）；<code>equals</code> 比的是<strong>逻辑相等</strong>
        （默认也是比引用，需重写才比内容）；<code>hashCode</code> 返回对象的<strong>散列码</strong>，用于哈希表分桶。
        三者由一条契约绑定：<strong>equals 相等的对象，hashCode 必须相等</strong>。
      </KeyIdea>
      <table>
        <thead>
          <tr><th></th><th><code>==</code></th><th><code>equals</code></th><th><code>hashCode</code></th></tr>
        </thead>
        <tbody>
          <tr><td>比较什么</td><td>引用地址（基本类型比值）</td><td>逻辑内容（默认比引用）</td><td>返回 int 散列码</td></tr>
          <tr><td>能否重写</td><td>不能（运算符）</td><td>能</td><td>能</td></tr>
          <tr><td>用途</td><td>判断是否同一对象</td><td>判断内容是否相等</td><td>哈希表定位桶</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="同时重写 equals 与 hashCode" code={equalsHashSnippet} />
      <p>它们之间的契约（Object 规范）必须遵守：</p>
      <ul>
        <li><strong>equals 相等 ⇒ hashCode 必须相等</strong>。</li>
        <li>hashCode 相等<strong>不要求</strong> equals 相等（允许哈希冲突）。</li>
        <li>所以<strong>重写 equals 必须同时重写 hashCode</strong>，否则违反契约。</li>
        <li>equals 还要满足自反、对称、传递、一致性，且 <code>x.equals(null)</code> 恒为 false。</li>
      </ul>
      <Example title="只重写 equals 不重写 hashCode 会怎样？">
        <p>
          假设两个内容相同的 Point 对象，equals 为 true 但 hashCode 不同（默认基于地址）。
          把一个放进 <code>HashSet</code> 后，用另一个去 <code>contains</code> 查：HashSet 先用 hashCode 找桶，
          两者 hashCode 不同会落到不同桶，于是<strong>找不到</strong>——明明 equals 相等却查不到，
          哈希集合彻底失效。这就是为什么二者必须成对重写。
        </p>
      </Example>
      <Callout variant="tip" title="实践：用 IDE 生成或 Objects 工具">
        手写 equals/hashCode 易错，实践中用 IDE 自动生成、Lombok 的 <code>@EqualsAndHashCode</code>，
        或基于 <code>java.util.Objects.equals</code> 与 <code>Objects.hash</code> 来写。
        Java 16+ 的 <code>record</code> 还会自动生成符合契约的 equals/hashCode/toString，更省心。
      </Callout>

      <h3>面试题 5：为什么 hashCode 返回 int，而不是直接用它定位？</h3>
      <p>
        <code>hashCode</code> 返回的 int 范围有 40 多亿，不可能为每个哈希码都开一个桶。
        哈希表（如 HashMap）会先拿到 hashCode，再通过<strong>取模/位运算</strong>把它映射到有限个桶上，
        所以不同的 hashCode 也可能落到同一个桶（哈希冲突）。这就是为什么「hashCode 相等不要求 equals 相等」——
        允许冲突是哈希表设计的一部分。
      </p>
      <ul>
        <li>第一步：用 hashCode 快速定位到桶（O(1)，避免遍历全部元素）。</li>
        <li>第二步：桶里若有多个元素（冲突），再用 equals 逐个精确比对。</li>
      </ul>
      <Callout variant="note" title="好的 hashCode 应「分散」">
        如果所有对象的 hashCode 都相同，它们会全挤进一个桶，哈希表退化成链表/红黑树，查找从 O(1) 变成 O(n) 或 O(log n)，
        失去哈希的意义。所以一个好的 hashCode 实现应让不同对象尽量<strong>分散到不同桶</strong>——
        这也是为什么用 <code>Objects.hash(多个字段)</code> 而不是简单返回某个固定值。
      </Callout>

      <h3>面试题 6：Iterator 和 ListIterator 有什么区别？</h3>
      <p>
        <code>Iterator</code> 是所有集合通用的迭代器，只能<strong>单向</strong>（向前）遍历；
        <code>ListIterator</code> 是 List 专有的增强迭代器，支持<strong>双向</strong>遍历，还能在遍历中<strong>添加、替换</strong>元素。
      </p>
      <table>
        <thead>
          <tr><th>能力</th><th>Iterator</th><th>ListIterator</th></tr>
        </thead>
        <tbody>
          <tr><td>适用</td><td>所有 Collection</td><td>仅 List</td></tr>
          <tr><td>方向</td><td>只能向前</td><td>可前可后（hasPrevious/previous）</td></tr>
          <tr><td>删除</td><td>remove</td><td>remove</td></tr>
          <tr><td>新增/替换</td><td>不支持</td><td>add / set</td></tr>
          <tr><td>索引</td><td>无</td><td>nextIndex / previousIndex</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="选用建议">
        只是顺序遍历、可能删元素，用 <code>Iterator</code> 就够（且能配合所有集合）；
        需要双向走、或边遍历边替换/插入元素，且数据是 List，才用 <code>ListIterator</code>。
        两者的 remove 都比直接调集合的 remove 安全，不会触发 fail-fast 异常。
      </Callout>

      <Summary
        points={[
          '栈是 LIFO（push/pop），队列是 FIFO（offer/poll）；Java 推荐用 ArrayDeque 实现栈与队列，别用过时的 Stack 类。',
          'Iterator 是遍历集合的统一接口，把遍历与具体结构解耦；遍历中删元素必须用 Iterator.remove() 以同步 modCount，避免 fail-fast 异常。',
          'Optional 是显式表达「可能无值」的容器，应链式用 map/filter/orElse(Throw)，避免 isPresent+get；建议只作返回值，别当字段/参数。',
          '== 比引用（基本类型比值），equals 比逻辑相等（默认比引用，需重写），hashCode 返回散列码用于哈希表分桶。',
          '核心契约：equals 相等则 hashCode 必相等；重写 equals 必须同时重写 hashCode，否则哈希集合会失效。',
          'equals 要满足自反/对称/传递/一致性；实践中用 IDE 生成、Objects.hash 或 record 来保证契约正确。',
        ]}
      />
    </article>
  )
}

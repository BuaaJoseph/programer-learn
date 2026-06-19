import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const immutableSnippet = `String s = "abc";
s = s + "d";        // 不是改原对象，而是新建了一个 "abcd"，s 指向它，"abc" 变垃圾

// String 内部（JDK 9+）：
// private final byte[] value;   // value 引用 final，且对外永不暴露可写访问
// 所有「修改」方法（concat、replace、substring）都返回新 String`

const threeSnippet = `// StringBuilder：可变，非线程安全，单线程拼接首选（最快）
StringBuilder sb = new StringBuilder();
sb.append("a").append("b").append(1);
String r1 = sb.toString();      // "ab1"

// StringBuffer：可变，方法加了 synchronized，线程安全但慢
StringBuffer buf = new StringBuffer();
buf.append("x").append("y");

// String：不可变，频繁拼接会产生大量临时对象，循环里别用 +`

const concatLoopSnippet = `// 反例：循环里用 + 拼接，每次都新建对象 + 拷贝，O(n^2)
String s = "";
for (int i = 0; i < 10000; i++) {
    s += i;     // 等价 s = new StringBuilder(s).append(i).toString()，反复重建
}

// 正例：复用一个 StringBuilder，O(n)
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append(i);
}
String result = sb.toString();`

const newStringSnippet = `// 问：String s = new String("abc") 创建了几个对象？
// 答：最多 2 个。
//   1) 字符串字面量 "abc" 在「字符串常量池」里的对象（若池中已有则复用，不再新建）
//   2) new 在「堆」上强制创建的一个新 String 对象
String a = new String("abc");
String b = "abc";
System.out.println(a == b);            // false：a 在堆，b 指向常量池
System.out.println(a.equals(b));       // true：内容相同
System.out.println(a.intern() == b);   // true：intern 返回常量池中的引用`

export default function Ch1() {
  return (
    <article>
      <Lead>
        字符串是 Java 用得最多、也最常被问的类型。本章围绕四道高频题：String 为什么不可变、
        StringBuffer 与 StringBuilder 的区别、StringBuilder 怎么实现的、
        <code>new String("abc")</code> 到底创建几个对象。把这些讲透，字符串相关的笔试题基本都能拿下。
      </Lead>

      <h2>一、String 为什么不可变</h2>
      <KeyIdea>
        <code>String</code> 一旦创建，内容就不能改变：所有「修改」方法（拼接、替换、截取）都返回<strong>新对象</strong>，
        原对象纹丝不动。不可变带来三大好处：线程安全、可安全缓存（如常量池）、能放心当 HashMap 的 key。
      </KeyIdea>
      <CodeBlock lang="java" title="String 的不可变性" code={immutableSnippet} />
      <h3>面试题 1：String 为什么设计成不可变？</h3>
      <ul>
        <li><strong>线程安全</strong>：内容不变，多线程共享无需同步。</li>
        <li><strong>支持字符串常量池</strong>：相同字面量能复用同一对象，节省内存——这只有在不可变前提下才安全。</li>
        <li><strong>可作哈希键 / 缓存键</strong>：hashCode 可以缓存（创建后不变），且不会因内容被改而失效。</li>
        <li><strong>安全性</strong>：类名、文件路径、网络地址等常用 String 表示，不可变能防止被恶意篡改。</li>
      </ul>
      <p>
        实现上，<code>String</code> 内部的字符数组（JDK 9+ 是 <code>byte[]</code>）声明为 <code>final</code> 且私有，
        类本身也是 <code>final</code> 不能被继承篡改，对外不提供任何修改内部数组的方法——三重保障锁死不可变。
      </p>
      <Callout variant="note" title="final 类 + final 数组 + 不暴露 = 不可变">
        注意 <code>final byte[]</code> 只保证「引用不变」，数组元素本可被改。String 之所以真不可变，
        是因为它<strong>从不把这个数组引用泄露出去</strong>，所有方法只读不写。这正是上一卷讲不可变类时强调的「防御性」原则的范例。
      </Callout>

      <h2>二、String / StringBuffer / StringBuilder</h2>
      <h3>面试题 2：三者有什么区别，怎么选？</h3>
      <CodeBlock lang="java" title="三兄弟用法对比" code={threeSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>String</th><th>StringBuffer</th><th>StringBuilder</th></tr>
        </thead>
        <tbody>
          <tr><td>可变性</td><td>不可变</td><td>可变</td><td>可变</td></tr>
          <tr><td>线程安全</td><td>安全（因不可变）</td><td>安全（方法 synchronized）</td><td>不安全</td></tr>
          <tr><td>性能</td><td>拼接慢（频繁建对象）</td><td>中（有锁开销）</td><td>快</td></tr>
          <tr><td>出现版本</td><td>JDK 1.0</td><td>JDK 1.0</td><td>JDK 1.5</td></tr>
          <tr><td>适用</td><td>少量/常量字符串</td><td>多线程拼接（少见）</td><td>单线程频繁拼接（首选）</td></tr>
        </tbody>
      </table>
      <p>
        选型口诀：<strong>很少改 → String；单线程频繁拼接 → StringBuilder；多线程共享同一个缓冲区拼接 → StringBuffer</strong>。
        实际上 StringBuffer 现在很少用，因为多线程下通常各线程用各自的 StringBuilder，而不是共享一个缓冲区。
      </p>
      <CodeBlock lang="java" title="循环拼接：+ 的性能陷阱" code={concatLoopSnippet} />
      <Callout variant="tip" title="编译器优化：单行 + 拼接没问题">
        像 <code>"a" + "b" + var</code> 这种<strong>单条语句</strong>的拼接，编译器会自动优化成一次
        StringBuilder 操作（Java 9+ 用 <code>invokedynamic</code> 的 StringConcatFactory），不用手动改。
        真正有性能问题的是<strong>循环里反复用 +=</strong>，那才要换成显式复用的 StringBuilder。
      </Callout>

      <h2>三、StringBuilder 的实现</h2>
      <h3>面试题 3：StringBuilder 是怎么实现可变和扩容的？</h3>
      <p>
        <code>StringBuilder</code>（和 <code>StringBuffer</code>）都继承自 <code>AbstractStringBuilder</code>，
        内部维护一个<strong>可变的字符数组 value</strong> 和一个 <strong>count（已用长度）</strong>。
        <code>append</code> 时就往数组里写，写满了就<strong>扩容</strong>。
      </p>
      <ul>
        <li>初始容量默认 16（或 <code>16 + 初始字符串长度</code>）。</li>
        <li><code>append</code> 前先 <code>ensureCapacity</code>：若现有容量不够，按「<strong>旧容量 × 2 + 2</strong>」算新容量，
          若仍不够则直接用所需长度。</li>
        <li>扩容时用 <code>Arrays.copyOf</code> 把旧数组内容拷贝到新数组。</li>
      </ul>
      <p>
        关键差别：<code>StringBuffer</code> 把这些方法都加了 <code>synchronized</code>，所以线程安全但慢；
        <code>StringBuilder</code> 不加锁，所以快但只能单线程用。两者逻辑几乎一样，只差一个同步。
      </p>
      <Callout variant="tip" title="性能建议：预估容量减少扩容">
        如果能预估最终长度，构造时直接传初始容量 <code>new StringBuilder(expectedSize)</code>，
        可避免多次扩容带来的数组拷贝。在大量拼接的热点路径上，这是个简单有效的优化。
      </Callout>

      <h2>四、new String("abc") 创建几个对象</h2>
      <h3>面试题 4：String s = new String("abc") 创建了几个对象？</h3>
      <KeyIdea>
        答案是<strong>最多 2 个</strong>：① 字面量 <code>"abc"</code> 在<strong>字符串常量池</strong>里的对象
        （若池中已存在则复用，此时只新建 1 个）；② <code>new</code> 在<strong>堆</strong>上强制创建的新 String 对象。
        所以「1 或 2 个」，取决于常量池里之前有没有 "abc"。
      </KeyIdea>
      <CodeBlock lang="java" title="new String 与常量池" code={newStringSnippet} />
      <Example title="为什么 a == b 是 false？">
        <p>
          <code>String b = "abc"</code> 让 b 直接指向<strong>常量池</strong>里的对象；
          <code>new String("abc")</code> 则在<strong>堆</strong>上另建一个对象，a 指向它。
          两者地址不同，<code>==</code> 比引用自然为 false；但内容相同，<code>equals</code> 为 true。
          调用 <code>a.intern()</code> 会返回常量池中的引用，所以 <code>a.intern() == b</code> 为 true。
        </p>
      </Example>
      <Callout variant="note" title="字符串常量池在哪？">
        字符串常量池（String Pool）在 JDK 7 时从永久代<strong>移到了堆</strong>中。
        字面量字符串和 <code>intern()</code> 进入的字符串都放在这里，目的是复用相同内容、节省内存。
        这也是「字面量赋值的相同字符串 == 为 true，而 new 出来的为 false」的根本原因。
      </Callout>
      <Callout variant="warn" title="易错点：别滥用 intern">
        <code>intern()</code> 能把字符串放进/取自常量池实现复用，但常量池有大小与回收成本，
        对大量不重复的字符串滥用 intern 反而可能拖累性能。一般只在确有大量重复字符串、且内存吃紧时才考虑。
      </Callout>

      <h3>面试题 5：String s1 = "a" + "b" 和 String s2 = "ab" 相等吗？</h3>
      <p>
        相等（<code>s1 == s2</code> 为 true）。因为 <code>"a" + "b"</code> 是<strong>两个编译期常量</strong>相加，
        编译器会在编译期直接折叠（常量折叠）成 <code>"ab"</code>，并放进常量池。
        所以 s1 和 s2 指向常量池里同一个 "ab" 对象。
      </p>
      <table>
        <thead>
          <tr><th>表达式</th><th>是否走常量池</th><th>== "ab"</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"a" + "b"</code>（都是字面量）</td><td>是，编译期折叠</td><td>true</td></tr>
          <tr><td><code>final String a="a"; a+"b"</code></td><td>是（final 常量可折叠）</td><td>true</td></tr>
          <tr><td><code>String a="a"; a+"b"</code>（变量）</td><td>否，运行期 new</td><td>false</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="关键看「能否编译期确定」">
        只要参与拼接的都是<strong>编译期常量</strong>（字面量或 final 常量），结果在编译期就能算出并入池；
        只要有一个是<strong>非 final 的变量</strong>，拼接就推迟到运行期、用 StringBuilder 生成新对象（不在常量池）。
        这是判断「拼接结果 == 字面量是否成立」的唯一标准，比死记结论可靠得多。
      </Callout>

      <h3>面试题 6：为什么 String 适合做 HashMap 的 key？</h3>
      <p>
        因为 <code>String</code> 同时满足做哈希键的三个理想条件，几乎是「为 key 而生」：
      </p>
      <ul>
        <li><strong>不可变</strong>：内容创建后不变，作为 key 放进 map 后不会因被改动而「找不到」，保证一致性。</li>
        <li><strong>hashCode 被缓存</strong>：String 内部缓存了 hashCode（首次算完存起来），后续查找无需重复计算，性能好。</li>
        <li><strong>正确重写了 equals/hashCode</strong>：内容相同的字符串 equals 为 true、hashCode 相等，符合哈希契约。</li>
      </ul>
      <Callout variant="tip" title="反面教材：用可变对象做 key 的灾难">
        如果用一个可变对象（重写了 equals/hashCode 且依赖可变字段）做 key，放进 map 后又改了它的字段，
        它的 hashCode 就变了——再用它去 get 会落到新桶，<strong>查不到原来的值</strong>，等于数据丢了。
        这反过来印证了「不可变 + 缓存 hashCode」对 key 有多重要，也呼应了上一卷不可变类的价值。
      </Callout>

      <h3>面试题 7：String 的 + 拼接和 concat 方法有什么区别？</h3>
      <p>
        两者都能拼接字符串，但机制不同：<code>+</code> 是<strong>语法糖</strong>，编译器会转成 StringBuilder 操作；
        <code>concat</code> 是 String 的<strong>实例方法</strong>，内部直接创建新字符数组拼接。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th><code>+</code> 拼接</th><th><code>concat</code></th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>编译期转 StringBuilder</td><td>String 实例方法</td></tr>
          <tr><td>拼 null</td><td>把 null 当 "null" 拼上</td><td>对 null 抛 NullPointerException</td></tr>
          <tr><td>拼空串</td><td>正常</td><td>拼空串可能返回原对象</td></tr>
          <tr><td>多次拼接</td><td>循环里低效（应改 StringBuilder）</td><td>每次都新建对象</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="易错点：concat(null) 会抛 NPE">
        <code>"a" + null</code> 得到 <code>"anull"</code>（+ 会把 null 转成字符串 "null"），
        但 <code>"a".concat(null)</code> 会直接抛 <code>NullPointerException</code>。
        这个差异常被用作笔试陷阱。日常拼接用 + 即可，对可能为 null 的值更友好。
      </Callout>

      <h3>面试题 8：String.intern() 到底做了什么？</h3>
      <p>
        <code>intern()</code> 的作用是：检查字符串常量池里有没有内容相等的字符串，
        有就返回池中那个的引用，没有就把当前字符串<strong>加入池</strong>并返回。它能让运行期产生的字符串也享受常量池的复用。
      </p>
      <ul>
        <li>对常量池已有的内容，<code>str.intern() == 字面量</code> 为 true。</li>
        <li>JDK 7 后常量池在堆里，intern 时若池中没有，会把<strong>堆中对象的引用</strong>存入池（而非复制），这点和 JDK 6 不同。</li>
      </ul>
      <Callout variant="note" title="intern 的适用与代价">
        intern 适合「大量重复字符串、想去重省内存」的场景（如解析大文件时重复出现的标识）。
        但它有查找和入池成本，常量池过大也影响性能，所以不要对海量不重复字符串无脑 intern。
        现代实践更常用 <code>Map</code> 自己做缓存去重，比依赖全局常量池更可控。
      </Callout>

      <Summary
        points={[
          'String 不可变（final 类 + 私有 final 字节数组 + 不泄露引用），带来线程安全、常量池复用、可做哈希键、安全等好处。',
          '三兄弟：String 不可变；StringBuilder 可变非线程安全、最快、单线程拼接首选；StringBuffer 方法加 synchronized、线程安全但慢。',
          '循环里用 += 拼接是 O(n^2) 陷阱，应复用 StringBuilder；单行 + 拼接编译器已优化，无需手动改。',
          'StringBuilder/StringBuffer 共用 AbstractStringBuilder，内部是可变字符数组，扩容按「旧容量×2+2」并 Arrays.copyOf；StringBuffer 多了 synchronized。',
          'new String("abc") 创建最多 2 个对象：常量池里的字面量对象（可能复用）+ 堆上 new 的对象。',
          '字符串常量池 JDK 7 起移到堆；字面量相同的 String == 为 true，new 出来的 == 为 false，intern() 返回池中引用。',
        ]}
      />
    </article>
  )
}

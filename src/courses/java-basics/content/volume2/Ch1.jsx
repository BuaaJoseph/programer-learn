import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const primitiveSnippet = `// 八种基本数据类型及其包装类
byte    b = 1;          // 1 字节，-128 ~ 127        -> Byte
short   s = 1;          // 2 字节                     -> Short
int     i = 1;          // 4 字节                     -> Integer
long    l = 1L;         // 8 字节                     -> Long
float   f = 1.0f;       // 4 字节，IEEE 754 单精度     -> Float
double  d = 1.0;        // 8 字节，IEEE 754 双精度     -> Double
char    c = 'A';        // 2 字节，UTF-16 码元         -> Character
boolean bool = true;    // 大小未明确规定              -> Boolean`

const boxingSnippet = `Integer a = 100;          // 自动装箱：等价 Integer.valueOf(100)
int b = a;                // 自动拆箱：等价 a.intValue()

// 在集合/泛型里只能放对象，所以频繁触发装箱
List<Integer> list = new ArrayList<>();
list.add(1);              // 装箱
int x = list.get(0);      // 拆箱`

const cacheSnippet = `Integer a = 127, b = 127;
System.out.println(a == b);   // true：在缓存范围内，复用同一对象

Integer c = 128, d = 128;
System.out.println(c == d);   // false：超出缓存，各自 new 新对象

Integer e = new Integer(127), f = new Integer(127);
System.out.println(e == f);   // false：new 强制创建新对象，不走缓存

System.out.println(c.equals(d)); // true：比值才正确`

const unboxNpeSnippet = `Map<String, Integer> map = new HashMap<>();
int count = map.get("missing");   // get 返回 null，拆箱 null.intValue() -> NPE！

Integer i = null;
if (i == 0) {}                    // 同样会拆箱 null，抛 NullPointerException`

export default function Ch1() {
  return (
    <article>
      <Lead>
        数值是 Java 里坑最密集的区域：八种基本类型要记牢，包装类与基本类型的取舍要说清，
        而自动装箱拆箱配合 <code>Integer</code> 缓存池，能制造出「<code>{'a == b'}</code> 有时为真有时为假」
        这种让人抓狂的现象。本章把这些机制讲到能在面试里复现并解释清楚。
      </Lead>

      <h2>一、八种基本数据类型</h2>
      <KeyIdea>
        Java 有八种基本数据类型，它们<strong>不是对象</strong>，直接存值、放在栈上（作为局部变量时），
        没有方法、不能为 null。它们之外的一切都是引用类型。记住「4 整数 + 2 浮点 + 1 字符 + 1 布尔」这个分组。
      </KeyIdea>
      <CodeBlock lang="java" title="八种基本类型与字节宽度" code={primitiveSnippet} />
      <h3>面试题 1：Java 有哪些基本数据类型？</h3>
      <table>
        <thead>
          <tr><th>分组</th><th>类型</th><th>占用</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td rowSpan={4}>整数</td><td><code>byte</code></td><td>1 字节</td><td>-128 ~ 127</td></tr>
          <tr><td><code>short</code></td><td>2 字节</td><td>较少用</td></tr>
          <tr><td><code>int</code></td><td>4 字节</td><td>默认整数类型</td></tr>
          <tr><td><code>long</code></td><td>8 字节</td><td>字面量加 L</td></tr>
          <tr><td rowSpan={2}>浮点</td><td><code>float</code></td><td>4 字节</td><td>单精度，加 f</td></tr>
          <tr><td><code>double</code></td><td>8 字节</td><td>默认浮点类型</td></tr>
          <tr><td>字符</td><td><code>char</code></td><td>2 字节</td><td>UTF-16 码元，无符号</td></tr>
          <tr><td>布尔</td><td><code>boolean</code></td><td>未规定</td><td>true / false</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="两个常被追问的细节">
        其一，<code>char</code> 是 2 字节、无符号，存的是 UTF-16 码元，范围 0~65535；
        其二，<code>boolean</code> 的大小 JVM 规范并未硬性规定，具体取决于实现（常被优化成 int 或位）。
        另外注意：基本类型不是 <code>Object</code> 的子类，所以不能直接放进集合，这正是包装类存在的理由。
      </Callout>

      <h2>二、包装类 vs 基本类型</h2>
      <h3>面试题 2：包装类和基本类型有什么区别？为什么需要包装类？</h3>
      <p>
        每个基本类型都有对应的包装类（<code>Integer</code>、<code>Double</code> 等）。
        包装类是<strong>对象</strong>，能放进集合与泛型、能为 null、带有一堆工具方法（如 <code>Integer.parseInt</code>）。
        代价是有对象开销、且涉及装箱拆箱。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>基本类型</th><th>包装类</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>直接存值</td><td>对象（堆上）</td></tr>
          <tr><td>默认值</td><td>0 / 0.0 / false 等</td><td>null</td></tr>
          <tr><td>能否为 null</td><td>不能</td><td>能</td></tr>
          <tr><td>能否进集合/泛型</td><td>不能</td><td>能</td></tr>
          <tr><td>比较</td><td><code>==</code> 比值</td><td><code>==</code> 比引用，<code>equals</code> 比值</td></tr>
          <tr><td>开销</td><td>小</td><td>对象头 + 装箱拆箱</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="选型建议">
        默认用基本类型，性能好、没有 NPE 风险。只有在「需要进集合/泛型」或「需要用 null 表达『没有值』」
        时才用包装类。比如数据库字段可能为 NULL，映射到对象时就该用 <code>Integer</code> 而非 <code>int</code>，否则 NULL 会被误当成 0。
      </Callout>

      <h2>三、自动装箱与拆箱</h2>
      <h3>面试题 3：什么是自动装箱和拆箱，底层做了什么？</h3>
      <p>
        自动装箱（autoboxing）是把基本类型自动转成包装对象，编译器悄悄插入 <code>Integer.valueOf(...)</code>；
        自动拆箱（unboxing）是反过来，插入 <code>intValue()</code> 之类的调用。这是 Java 5 引入的语法糖。
      </p>
      <CodeBlock lang="java" title="装箱拆箱的等价展开" code={boxingSnippet} />
      <Callout variant="warn" title="拆箱最危险的坑：null 拆箱抛 NPE">
        当一个包装类型的值为 <code>null</code> 却被拆箱时，会对 null 调用 <code>intValue()</code>，
        直接抛 <code>NullPointerException</code>。<code>map.get(key)</code> 没命中返回 null、
        三元表达式混用包装与基本类型，都是常见诱因。所以涉及可能为 null 的包装值，判空要走在拆箱前面。
      </Callout>
      <CodeBlock lang="java" title="null 拆箱引发 NPE" code={unboxNpeSnippet} />

      <h2>四、Integer 缓存池</h2>
      <h3>面试题 4：为什么 Integer 的 == 比较有时为 true 有时为 false？</h3>
      <p>
        这是经典送命题，根源在 <strong>Integer 缓存池</strong>。<code>Integer.valueOf(int)</code> 对
        <strong>-128 到 127</strong> 这个区间的值会返回缓存中的同一个对象；超出区间才 new 新对象。
        而自动装箱走的正是 <code>valueOf</code>。于是用 <code>==</code> 比较时：缓存范围内是同一对象（true），
        范围外是不同对象（false）。
      </p>
      <CodeBlock lang="java" title="Integer 缓存导致的 == 玄学" code={cacheSnippet} />
      <Example title="为什么是 -128 ~ 127 这个范围？">
        <p>
          这是因为小整数使用极其频繁，JVM 预先缓存这一段能显著减少对象创建、节省内存。
          这个上界默认是 127，但可以通过 JVM 参数 <code>-XX:AutoBoxCacheMax</code> 调高。
          <code>Long</code>、<code>Short</code>、<code>Byte</code>、<code>Character</code> 也有类似缓存（范围略有不同），
          而 <code>Float</code>、<code>Double</code> 没有缓存（取值连续无限，缓存无意义）。
        </p>
      </Example>
      <Callout variant="warn" title="结论：比较包装类的值，永远用 equals">
        <code>==</code> 对包装类比的是<strong>对象引用</strong>，缓存让它在小范围内「碰巧相等」，是陷阱不是规律。
        要比较数值，统一用 <code>equals</code>（或先拆箱成基本类型再 <code>==</code>）。
        面试能把「valueOf 走缓存、new 不走缓存、范围 -128~127」三点说全，这题就稳了。
      </Callout>

      <h3>面试题 5：== 在「基本类型与包装类」混合比较时会发生什么？</h3>
      <p>
        这是缓存题的高阶变体，也是笔试常坑。当 <code>==</code> 两侧<strong>一个是基本类型、一个是包装类</strong>时，
        Java 会把<strong>包装类自动拆箱</strong>成基本类型，再按数值比较。所以此时和缓存毫无关系，永远比的是数值。
      </p>
      <table>
        <thead>
          <tr><th>表达式</th><th>结果</th><th>原因</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Integer(200) == int(200)</code></td><td>true</td><td>包装类被拆箱，比数值</td></tr>
          <tr><td><code>Integer(200) == Integer(200)</code></td><td>false</td><td>两个对象，超缓存范围，比引用</td></tr>
          <tr><td><code>Integer(100) == Integer(100)</code></td><td>true</td><td>缓存范围内，同一对象</td></tr>
          <tr><td><code>Integer(200).equals(200)</code></td><td>true</td><td>equals 比数值</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="一句话规律帮你不再混乱">
        只要 <code>==</code> 两侧<strong>有一个是基本类型</strong>，就触发拆箱、比数值；只有<strong>两侧都是包装类</strong>时，
        才比引用、才需要考虑缓存。记住这条分界，所有「Integer == 」的玄学题都能秒答。
      </Callout>

      <h3>面试题 6：包装类的默认值和初始化有什么坑？</h3>
      <p>
        包装类是引用类型，作为对象字段时<strong>默认值是 null</strong>，而不是 0。
        这在「数据库映射」「表单接收」等场景特别要注意：如果用 <code>int</code> 接收一个可能为空的字段，
        null 会被映射成 0，把「没填」和「填了 0」混为一谈；用 <code>Integer</code> 则能用 null 区分二者。
      </p>
      <Example title="一个真实的业务坑">
        <p>
          某优惠系统用 <code>int discount</code> 接收折扣，数据库里该字段为 NULL（表示「无折扣规则」）时被映射成 0，
          结果系统把它当成「打 0 折，全免单」，造成资损。改用 <code>Integer</code> 后，null 就能正确表达「没有这条规则」。
          这说明：<strong>能为空的字段一定要用包装类</strong>，让 null 承担「缺失」的语义。
        </p>
      </Example>
      <Callout variant="warn" title="再强调一次拆箱 NPE">
        承接上一题：一旦用了包装类，就要警惕拆箱 NPE。上面那个 <code>Integer discount</code>，
        若后续写 <code>int d = discount</code> 而 discount 为 null，就会抛 NullPointerException。
        所以「用包装类表达可空」和「拆箱前先判空」是一对必须同时记住的搭配。
      </Callout>

      <h3>面试题 7：基本类型之间怎么转换？什么是隐式转换和强制转换？</h3>
      <p>
        基本类型之间能互相转换，分两种方向：<strong>隐式（自动）转换</strong>和<strong>显式（强制）转换</strong>。
        规律是「小范围 → 大范围」自动转，「大范围 → 小范围」必须强转且可能丢精度。
      </p>
      <table>
        <thead>
          <tr><th>方向</th><th>是否需强转</th><th>风险</th></tr>
        </thead>
        <tbody>
          <tr><td>byte→short→int→long→float→double</td><td>自动（向上）</td><td>无（long→float 可能损精度）</td></tr>
          <tr><td>double→int、long→int 等</td><td>强制（向下）</td><td>截断/溢出，丢数据</td></tr>
          <tr><td>int→double</td><td>自动</td><td>无</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="易错点：强制转换的截断与溢出">
        <code>(int) 3.99</code> 结果是 3（直接<strong>截断</strong>小数，不是四舍五入）；
        <code>(byte) 300</code> 会<strong>溢出</strong>得到一个意外的小值（300 超出 byte 范围被截位）。
        向下转换前要确认数值在目标范围内，否则会悄无声息地得到错误结果——这类 bug 很隐蔽。
      </Callout>
      <Example title="一个容易翻车的整数运算">
        <p>
          <code>int a = 1000000; int b = 1000000; long c = a * b;</code> 结果不是一万亿，而是个溢出的负数！
          因为 <code>a * b</code> 先按 <strong>int</strong> 运算就已经溢出，再赋给 long 也救不回来。
          正确写法是让运算在 long 下进行：<code>long c = (long) a * b;</code>。
          这说明：<strong>转换时机很关键，要在运算「之前」转，而不是之后。</strong>
        </p>
      </Example>

      <Summary
        points={[
          '八种基本类型：4 整数（byte/short/int/long）、2 浮点（float/double）、1 字符（char，2字节 UTF-16）、1 布尔；它们不是对象、不能为 null。',
          '包装类是对象，能进集合/泛型、能为 null、带工具方法，但有对象开销；默认用基本类型，需要 null 语义或进集合时才用包装类。',
          '自动装箱 = Integer.valueOf()，自动拆箱 = intValue()，是 Java 5 的语法糖；null 拆箱会抛 NullPointerException。',
          'Integer 缓存池缓存 -128~127，valueOf 在此范围返回同一对象，故 == 在缓存内为 true、缓存外为 false；new Integer 不走缓存。',
          'Long/Short/Byte/Character 也有缓存，Float/Double 没有；比较包装类数值一律用 equals，不要用 ==。',
        ]}
      />
    </article>
  )
}

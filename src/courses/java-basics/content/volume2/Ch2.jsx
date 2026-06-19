import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const floatProblemSnippet = `System.out.println(0.1 + 0.2);          // 0.30000000000000004，不是 0.3！
System.out.println(0.1 + 0.2 == 0.3);   // false

// 原因：0.1、0.2 在二进制下是无限循环小数，
// IEEE 754 只能存近似值，相加后误差暴露出来。`

const bigDecimalSnippet = `import java.math.BigDecimal;

// 正确：用字符串构造，精确表示十进制
BigDecimal a = new BigDecimal("0.1");
BigDecimal b = new BigDecimal("0.2");
System.out.println(a.add(b));           // 0.3，精确

// 错误：用 double 构造，把浮点误差也带进来了
BigDecimal wrong = new BigDecimal(0.1);
System.out.println(wrong);              // 0.1000000000000000055511151231257827021181583404541015625

// 除法可能除不尽，必须指定精度和舍入模式，否则抛 ArithmeticException
BigDecimal r = BigDecimal.ONE.divide(new BigDecimal("3"), 10, java.math.RoundingMode.HALF_UP);`

const floatCompareSnippet = `// 不能直接用 == 比较浮点，要看差值是否在容差范围内
double x = 0.1 + 0.2, y = 0.3;
double eps = 1e-9;
boolean equal = Math.abs(x - y) < eps;          // true

// 钱算精确比较：转 BigDecimal，用 compareTo（不要用 equals，它连标度也比）
BigDecimal p = new BigDecimal("1.0");
BigDecimal q = new BigDecimal("1.00");
System.out.println(p.equals(q));        // false：标度不同（1 位 vs 2 位小数）
System.out.println(p.compareTo(q) == 0);// true：只比数值大小`

const encodingSnippet = `// 乱码的根源：编码与解码用了不同字符集
String s = "中文";
byte[] gbk = s.getBytes("GBK");          // 用 GBK 编码成字节
String wrong = new String(gbk, "UTF-8"); // 却用 UTF-8 解码 -> 乱码
String right = new String(gbk, "GBK");   // 用相同字符集解码 -> 正常

// 建议：读写文件/网络流统一显式指定 UTF-8，不要依赖平台默认编码`

export default function Ch2() {
  return (
    <article>
      <Lead>
        「为什么 <code>0.1 + 0.2</code> 不等于 <code>0.3</code>」几乎是每个程序员都被坑过的问题。
        本章把浮点精度、<code>BigDecimal</code>、浮点相等判断、字符编码乱码，以及 JDK 9 把 String
        从 <code>char[]</code> 改成 <code>byte[]</code> 的紧凑字符串优化讲透——这些都是又实用又高频的考点。
      </Lead>

      <h2>一、浮点为什么不精确</h2>
      <KeyIdea>
        <code>float</code>/<code>double</code> 用 IEEE 754 二进制浮点格式存储。像 0.1、0.2 这样的十进制小数，
        在二进制下是<strong>无限循环小数</strong>，只能存近似值。多次运算后误差累积并暴露，
        这就是 <code>0.1 + 0.2 != 0.3</code> 的根本原因——不是 Java 的 bug，所有用 IEEE 754 的语言都这样。
      </KeyIdea>
      <CodeBlock lang="java" title="浮点误差的现象" code={floatProblemSnippet} />

      <h2>二、BigDecimal 与精确计算</h2>
      <h3>面试题 1：BigDecimal 为什么不丢精度？怎么正确使用？</h3>
      <p>
        <code>BigDecimal</code> 内部用一个<strong>无标度整数（unscaledValue）+ 标度（scale）</strong>来表示数字，
        本质是「整数 × 10 的负 scale 次方」。它走的是<strong>十进制定点</strong>表示，不依赖二进制浮点，
        所以能精确表示十进制小数，金额计算必用它。
      </p>
      <CodeBlock lang="java" title="BigDecimal 的正确与错误用法" code={bigDecimalSnippet} />
      <Callout variant="warn" title="最关键的坑：必须用 String 构造，不能用 double 构造">
        <code>new BigDecimal(0.1)</code> 会先把 0.1 变成有误差的 double 再转，误差照样带进来；
        <code>new BigDecimal("0.1")</code> 直接解析字符串，才是精确的。
        若手上是 double，用 <code>BigDecimal.valueOf(double)</code>（内部走 <code>Double.toString</code>）也比直接 new 安全。
      </Callout>
      <Callout variant="note" title="除法要指定舍入，否则抛异常">
        <code>divide</code> 遇到除不尽（如 1/3）且没指定 scale 和 <code>RoundingMode</code> 时，
        会抛 <code>ArithmeticException: Non-terminating decimal expansion</code>。
        正确做法是显式给出保留位数和舍入模式（如 <code>HALF_UP</code>）。
      </Callout>

      <h2>三、浮点相等判断</h2>
      <h3>面试题 2：怎么判断两个 float/double 是否相等？</h3>
      <p>
        因为有精度误差，<strong>绝不能直接用 <code>==</code></strong> 比浮点。两种正确做法：
        非金融场景用「差值的绝对值小于一个很小的容差 epsilon」；金融/精确场景转成 <code>BigDecimal</code> 再用 <code>compareTo</code>。
      </p>
      <CodeBlock lang="java" title="浮点比较的正确姿势" code={floatCompareSnippet} />
      <Callout variant="warn" title="BigDecimal 比较用 compareTo，别用 equals">
        <code>equals</code> 会同时比较「数值」和「标度」，所以 <code>1.0</code> 和 <code>1.00</code> 被判为不相等
        （标度一个是 1、一个是 2）。要只比数值大小，必须用 <code>compareTo(...) == 0</code>。这是面试常设的陷阱。
      </Callout>
      <table>
        <thead>
          <tr><th>场景</th><th>推荐方式</th></tr>
        </thead>
        <tbody>
          <tr><td>一般浮点近似比较</td><td><code>Math.abs(a - b) {'<'} eps</code></td></tr>
          <tr><td>金额/精确比较</td><td>转 <code>BigDecimal</code>，用 <code>compareTo</code></td></tr>
          <tr><td>存储金额</td><td>用 <code>BigDecimal</code>，或以「分」为单位用 <code>long</code></td></tr>
        </tbody>
      </table>

      <h2>四、字符编码与乱码</h2>
      <h3>面试题 3：乱码是怎么产生的，如何避免？</h3>
      <p>
        乱码的本质是<strong>编码与解码用了不同的字符集</strong>。文本在内存里是 Unicode 码点，
        但落到字节（写文件、传网络）要按某个字符集编码；读回来时若用了不一致的字符集解码，
        字节被错误地映射成别的字符，就成了乱码。
      </p>
      <CodeBlock lang="java" title="乱码产生与避免" code={encodingSnippet} />
      <ul>
        <li>编码（encode）：字符 → 字节，<code>String.getBytes(charset)</code>。</li>
        <li>解码（decode）：字节 → 字符，<code>new String(bytes, charset)</code>。</li>
        <li>避免：全链路统一用 <strong>UTF-8</strong>，读写流时<strong>显式指定字符集</strong>，不依赖平台默认编码。</li>
      </ul>
      <Callout variant="tip" title="常见乱码现场">
        数据库连接串没设 <code>characterEncoding=utf8</code>、HTTP 请求/响应头 charset 不一致、
        源文件本身存成了 GBK 却用 UTF-8 编译——都会乱码。排查口诀：从「存」到「取」追一遍，
        找出哪一环的字符集和别处不一致。
      </Callout>

      <h2>五、JDK 9 紧凑字符串</h2>
      <h3>面试题 4：JDK 9 为什么把 String 从 char[] 改成 byte[]？</h3>
      <p>
        JDK 9 引入了<strong>紧凑字符串（Compact Strings）</strong>。JDK 8 及以前，<code>String</code>
        内部用 <code>char[]</code> 存储，每个 char 固定占 2 字节（UTF-16）。但现实中大量字符串只含
        Latin-1（ASCII 扩展）字符，每个字符其实 1 字节就够，用 2 字节存是一半浪费。
      </p>
      <p>
        JDK 9 把内部存储改成 <code>byte[]</code>，并加了一个 <code>coder</code> 标志位：
        如果字符串全是 Latin-1 字符，就用 <strong>1 字节/字符</strong>（LATIN1 编码）存；
        一旦含有需要 2 字节的字符，才退回 <strong>UTF-16</strong> 模式。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>JDK 8 及以前</th><th>JDK 9+（紧凑字符串）</th></tr>
        </thead>
        <tbody>
          <tr><td>内部存储</td><td><code>char[]</code></td><td><code>byte[]</code> + <code>coder</code> 标志</td></tr>
          <tr><td>每字符占用</td><td>固定 2 字节</td><td>Latin-1 串 1 字节，含宽字符则 2 字节</td></tr>
          <tr><td>收益</td><td>—</td><td>纯英文/数字串内存减半，降低 GC 压力</td></tr>
        </tbody>
      </table>
      <Example title="为什么这个优化收益很大？">
        <p>
          大型 Java 应用堆里相当大一部分是字符串，而其中很多是英文标识、JSON 键、日志文本等纯 Latin-1 内容。
          把它们的存储砍掉一半，整体内存占用和 GC 频率都能明显下降。这是个「对绝大多数应用无感却普遍受益」的底层优化——
          代码不用改，升级到 JDK 9+ 就自动享受。
        </p>
      </Example>
      <Callout variant="note" title="面试追问：会影响 API 行为吗？">
        不会。<code>String</code> 对外的 API 完全不变，<code>length()</code> 仍返回字符数、
        <code>charAt</code> 仍返回 char。紧凑字符串是纯内部实现优化，对调用方透明。
      </Callout>

      <h3>面试题 5：为什么金额绝不能用 double 存储？应该用什么？</h3>
      <p>
        承接前面的精度问题，这是一道高频实战题。<strong>double 存金额会因浮点误差累积导致对账错误</strong>，
        在金融系统里是致命的。正确方案有两种：
      </p>
      <table>
        <thead>
          <tr><th>方案</th><th>做法</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td>BigDecimal</td><td>用 String 构造，运算指定舍入</td><td>需要小数精度的通用金额计算</td></tr>
          <tr><td>整数「分」</td><td>以最小单位（分）存 long，展示时除 100</td><td>性能敏感、币种单位固定</td></tr>
        </tbody>
      </table>
      <Example title="一个经典的对账翻车现场">
        <p>
          用 double 累加一万笔订单金额，每笔都带一点点误差，累加后总额可能比真实值差几分钱。
          财务对账时这几分钱对不上，排查起来极其痛苦。改用 BigDecimal 或「以分为单位的 long」后，
          每一笔都是精确值，累加结果分毫不差。<strong>凡是涉及钱，第一反应就该排除 double。</strong>
        </p>
      </Example>

      <h3>面试题 6：char 能存中文吗？一个中文占几个字节？</h3>
      <p>
        <code>char</code> 是 2 字节、存的是一个 UTF-16 码元，<strong>能存绝大多数常用中文</strong>
        （它们在基本多文种平面内，一个码元就够）。但「一个中文占几个字节」要分清场景：
      </p>
      <ul>
        <li>在<strong>内存里</strong>（char/String 的 UTF-16 表示）：常用中文占 1 个 char = 2 字节。</li>
        <li>编码成<strong>字节</strong>时取决于字符集：UTF-8 下一个中文通常占 <strong>3 字节</strong>，GBK 下占 <strong>2 字节</strong>。</li>
        <li>少数生僻字/emoji 在 UTF-16 里是<strong>代理对</strong>，要用 2 个 char 表示，单个 char 存不下。</li>
      </ul>
      <Callout variant="warn" title="易混点：内存占用 ≠ 编码后字节数">
        别把「char 是 2 字节」直接等同于「一个中文 2 字节」。前者说的是内存里的 UTF-16 表示，
        后者要看编码字符集——同一个「中」字，UTF-8 编码是 3 字节、GBK 是 2 字节。
        面试被问「一个中文几个字节」，先反问「在内存里还是编码后？用什么编码？」才是高水平回答。
      </Callout>

      <h3>面试题 7：BigInteger 和 BigDecimal 有什么区别？</h3>
      <p>
        两者都用于「超出基本类型范围或需要精确」的数值，区别在于：<code>BigInteger</code> 表示<strong>任意大的整数</strong>
        （没有大小上限，只受内存限制），<code>BigDecimal</code> 表示<strong>任意精度的小数</strong>（带标度）。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>BigInteger</th><th>BigDecimal</th></tr>
        </thead>
        <tbody>
          <tr><td>表示</td><td>任意大整数</td><td>任意精度小数（无标度整数 + 标度）</td></tr>
          <tr><td>解决</td><td>long 也装不下的大整数</td><td>浮点精度丢失</td></tr>
          <tr><td>典型场景</td><td>大数运算、加密、阶乘</td><td>金额、利率等精确计算</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="共同点：不可变 + 用方法运算">
        二者都是<strong>不可变</strong>对象，且不能用 <code>+ - * /</code> 运算符，必须调 <code>add</code>/<code>subtract</code>/
        <code>multiply</code>/<code>divide</code> 等方法，每次运算返回新对象。这点和包装类不同——
        别误以为能直接对 BigDecimal 用算术运算符。理解「不可变 + 方法运算」是用好它们的前提。
      </Callout>

      <h3>面试题 8：== 比较浮点时，NaN 和 0 有什么特殊行为？</h3>
      <p>
        浮点世界有两个反直觉的特殊值，面试偶尔会考：
      </p>
      <ul>
        <li><strong>NaN（非数字）</strong>：<code>NaN == NaN</code> 永远是 <strong>false</strong>，连它自己都不等于自己！判断是否为 NaN 要用 <code>Double.isNaN(x)</code>。</li>
        <li><strong>正零和负零</strong>：<code>0.0 == -0.0</code> 为 true，但 <code>Double.compare(0.0, -0.0)</code> 却认为正零大于负零，<code>new Double(0.0).equals(-0.0)</code> 也是 false。</li>
      </ul>
      <Callout variant="warn" title="为什么这会埋坑？">
        如果用浮点做 Map 的 key 或排序，NaN 和正负零的这些特殊行为可能导致「查不到」「排序异常」。
        所以浮点本就不适合做精确的 key/比较基准——又一个「钱和精确比较别用浮点」的佐证。
        知道 <code>NaN != NaN</code> 这个冷知识，能体现你对 IEEE 754 的了解深度。
      </Callout>

      <Summary
        points={[
          'float/double 用 IEEE 754 二进制浮点，0.1/0.2 等十进制小数是二进制无限循环小数，只能存近似值，故 0.1+0.2 != 0.3。',
          'BigDecimal 用「无标度整数 + 标度」做十进制定点表示，故不丢精度；必须用 String 构造（或 valueOf），不能用 double 构造。',
          'BigDecimal 除法除不尽要指定 scale 和 RoundingMode，否则抛 ArithmeticException。',
          '浮点不能用 == 比较：一般场景用 Math.abs(a-b) < eps，精确场景转 BigDecimal 用 compareTo（不用 equals，它连标度也比）。',
          '乱码源于编码与解码字符集不一致；全链路统一 UTF-8、读写流显式指定字符集可避免。',
          'JDK 9 紧凑字符串把 String 内部从 char[] 改为 byte[]+coder：纯 Latin-1 串每字符省到 1 字节，内存减半且对 API 透明。',
        ]}
      />
    </article>
  )
}

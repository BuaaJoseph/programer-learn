import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ClassLoading from '@/courses/jvm/illustrations/ClassLoading.jsx'

const orderCode = `class Parent {
    static int a = init('Parent.a');         // 父类静态变量
    static { System.out.println('Parent static 块'); }
    int b = init('Parent.b');                // 父类实例变量
    Parent() { System.out.println('Parent 构造方法'); }
    static int init(String s) { System.out.println(s); return 0; }
}

class Child extends Parent {
    static int c = init('Child.c');
    static { System.out.println('Child static 块'); }
    int d = init('Child.d');
    Child() { System.out.println('Child 构造方法'); }
}

public class Demo {
    public static void main(String[] args) {
        new Child();   // 第一次主动引用，触发初始化
        System.out.println('----- 第二次 new -----');
        new Child();   // 类已初始化，clinit 不再执行
    }
}`

const constCode = `public class ConstDemo {
    static int a = 3;            // 准备阶段 a=0，初始化阶段才变 3
    static final int B = 5;      // 准备阶段直接 B=5（编译期常量）
    static final int C = compute(); // 非编译期常量，仍走初始化阶段

    static int compute() { return 10; }
}`

const passiveCode = `class Super {
    static { System.out.println('Super init'); }
    static int VALUE = 123;          // 普通静态字段
    static final String NAME = "hi"; // 编译期常量
}
class Sub extends Super {
    static { System.out.println('Sub init'); }
}

public class Passive {
    public static void main(String[] args) {
        // 1) 通过子类访问父类静态字段：只初始化 Super，不初始化 Sub
        System.out.println(Sub.VALUE);   // 打印 "Super init" 再打印 123

        // 2) 引用编译期常量：常量在编译期已被内联进调用方，
        //    连 Super 都不会初始化（不会打印 "Super init"）
        System.out.println(Super.NAME);

        // 3) new 数组：只初始化数组类型，不初始化元素类型 Super
        Super[] arr = new Super[5];
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个 <code>.class</code> 文件躺在磁盘上只是一堆字节，它要变成 JVM 内存里能 <code>new</code>、能调方法的类，
          中间要走一条固定的流水线：加载、验证、准备、解析、初始化。面试里这五个阶段几乎是必考题，
          而真正容易答错的，是「准备」和「初始化」到底各干了什么、静态变量在这两步分别是什么值。
        </p>
      </Lead>

      <h2>类加载的五个阶段</h2>
      <p>
        类的生命周期里，前面这五步专门负责把字节码变成可用的类：<em>Loading</em>（加载）、<em>Verification</em>（验证）、
        <em>Preparation</em>（准备）、<em>Resolution</em>（解析）、<em>Initialization</em>（初始化）。其中验证、准备、解析
        三步合称<strong>连接</strong>（Linking）。
      </p>
      <ul>
        <li>
          <strong>加载</strong>：通过类的全限定名拿到 <code>.class</code> 字节流，在方法区生成这个类的元信息，
          并在堆里生成一个对应的 <code>Class</code> 对象，作为访问这些元信息的入口。
        </li>
        <li>
          <strong>验证</strong>：检查字节流是否符合规范、是否安全（魔数、版本、语义、符号引用等），防止恶意或损坏的字节码把虚拟机搞崩。
        </li>
        <li>
          <strong>准备</strong>：给类的<em>静态变量</em>分配内存并赋<strong>零值</strong>（不是代码里写的值），
          比如 <code>int</code> 给 0、引用给 <code>null</code>、<code>boolean</code> 给 <code>false</code>。
        </li>
        <li>
          <strong>解析</strong>：把常量池里的<em>符号引用</em>替换成<em>直接引用</em>（真实的内存地址或偏移）。
        </li>
        <li>
          <strong>初始化</strong>：真正执行类构造器 <code>&lt;clinit&gt;</code>，按源码顺序给静态变量赋真实值、执行 static 代码块。
        </li>
      </ul>
      <p>
        为什么要拆成这么多步、而不是「读进来直接用」？核心是<strong>安全</strong>与<strong>惰性</strong>。
        验证这一步是 Java「沙箱」安全的第一道闸——字节码可能来自网络、可能被篡改，不验证就执行等于把虚拟机交给攻击者；
        历史上 JVM 的不少安全漏洞都出在验证逻辑的疏漏上。而把「初始化」单独拎出来、且只在真正用到时才执行，
        是为了<strong>惰性加载</strong>：程序里引了一堆类，但很多到运行时根本没碰，没必要为它们提前跑静态初始化、浪费启动时间。
      </p>
      <p>
        还有一个常被忽略的点：<strong>解析阶段不一定在初始化前完成</strong>。规范允许「延迟解析」——
        某些符号引用直到第一次真正使用（如第一次调用某方法）时才解析成直接引用，这就是<em>晚期绑定</em>的基础，
        支撑了多态。所以「五个阶段」是逻辑顺序，实际执行时解析和初始化可能交错，别死记成严格串行。
      </p>

      <Example title="static int a = 3 在准备和初始化阶段分别是什么值">
        <p>对 <code>static int a = 3;</code> 这一行：</p>
        <ul>
          <li><strong>准备阶段</strong>：<code>a</code> 被分配内存并赋零值，此时 <code>a == 0</code>，那个 <code>3</code> 还没轮到。</li>
          <li><strong>初始化阶段</strong>：执行 <code>&lt;clinit&gt;</code> 里的赋值语句，<code>a</code> 才变成 <code>3</code>。</li>
        </ul>
        <p>
          换句话说，「= 3」这个动作本质是被编译器收集进了 <code>&lt;clinit&gt;</code>，属于初始化阶段，而非准备阶段。
        </p>
      </Example>

      <ClassLoading />

      <KeyIdea title="static final 常量是个例外">
        <p>
          如果写的是 <code>static final int B = 5;</code>，这种<strong>编译期常量</strong>会在<em>准备阶段</em>就直接被赋成 <code>5</code>，
          而不是等到初始化。原因是它的值在编译期就确定了，会被放进常量池（<code>ConstantValue</code> 属性）。
          但如果 final 的值来自方法调用等运行期才能确定的表达式（如 <code>static final int C = compute();</code>），
          它就不是编译期常量，仍然走初始化阶段。这是面试爱挖的细节。
        </p>
        <CodeBlock lang="java" title="ConstDemo.java" code={constCode} />
      </KeyIdea>

      <Callout variant="warn" title="编译期常量内联是个隐蔽的坑">
        <p>
          编译期常量会被<strong>内联</strong>到引用它的字节码里——也就是说，B 模块引用了 A 模块的
          <code>static final int B = 5</code>，编译后 B 模块里存的是字面量 5，而不是「去 A 拿 B」的引用。
          后果是：你只改了 A 里的 <code>B = 6</code> 并重新编译 A，但没重新编译 B，B 跑起来还是 5！
          这就是「改了常量值不生效」的经典灵异事件，根因就是常量内联。教训：常量也要全量重新编译，别只编改动的模块。
        </p>
      </Callout>

      <h2>什么时候才会初始化：主动引用</h2>
      <p>
        加载和初始化不是一回事——类被加载了，未必会被初始化。JVM 规定只有发生<strong>主动引用</strong>时才必须初始化，常见有六种：
      </p>
      <ul>
        <li><code>new</code> 一个对象、读写类的静态字段（非编译期常量）、调用类的静态方法；</li>
        <li>反射调用，如 <code>Class.forName('X')</code>；</li>
        <li>初始化子类时，会先初始化它的父类；</li>
        <li>虚拟机启动时，含 <code>main</code> 方法的主类；</li>
        <li><code>MethodHandle</code> 相关的动态调用；</li>
        <li>接口里定义了 default 方法时，该接口的实现类初始化前会先初始化它。</li>
      </ul>
      <p>
        除此之外都属于<em>被动引用</em>，不会触发初始化：比如通过子类访问父类的静态字段（只初始化父类）、
        引用类的编译期常量（已被内联进调用方）、<code>new</code> 一个数组（只是初始化了数组类型，不初始化元素类型）。
      </p>
      <Example title="三个不触发初始化的被动引用">
        <p>
          被动引用是面试最爱出的「陷阱题」，因为答案违反直觉。下面三种写法都<strong>不会</strong>初始化 <code>Super</code>
          （或不会初始化你以为会初始化的那个类），自己先猜输出，再对照注释：
        </p>
        <CodeBlock lang="java" title="Passive.java" code={passiveCode} />
        <p>
          特别注意第二个：<code>Super.NAME</code> 是编译期常量，编译后 <code>Passive</code> 里直接存了字面量
          <code>"hi"</code>，运行时和 <code>Super</code> 已经没关系了，所以连 <code>Super</code> 的静态块都不会执行——
          这正是上面「常量内联」那个坑的另一面。
        </p>
      </Example>
      <p>
        顺带辨析一个高频追问：<code>Class.forName("X")</code> 和 <code>ClassLoader.loadClass("X")</code> 有什么区别？
        前者默认<strong>会初始化</strong>类（所以 JDBC 驱动用它来触发驱动类的静态注册块），后者只加载、<strong>不初始化</strong>。
        <code>Class.forName</code> 还有个三参重载可以传 <code>initialize=false</code> 来只加载不初始化。
      </p>

      <Callout variant="warn" title="clinit 的线程安全与执行时机">
        <p>
          <code>&lt;clinit&gt;</code> 由编译器自动收集所有静态变量赋值和 static 块拼成，<strong>父类的 clinit 先于子类执行</strong>。
          一个类的 <code>&lt;clinit&gt;</code> 在多线程下只会执行<strong>一次</strong>——JVM 在初始化时会对这个类<strong>加锁</strong>，
          其余线程阻塞等待。这意味着如果某个类的静态初始化里有耗时或死锁逻辑，会卡住所有等它初始化的线程，是线上偶发卡死的隐蔽来源。
          另外要区分 <code>&lt;clinit&gt;</code>（类构造器，初始化静态成员）和 <code>&lt;init&gt;</code>（实例构造器，每次 new 都执行）。
        </p>
        <p>
          这把锁还能引出两个真实事故。其一，<strong>类初始化死锁</strong>：A 的静态块里用了 B、B 的静态块里又用了 A，
          两个线程分别先持有 A、B 的初始化锁再去等对方，<code>jstack</code> 里能看到线程卡在 <code>&lt;clinit&gt;</code>。
          其二，著名的「<strong>静态内部类单例</strong>」之所以线程安全，正是借了这把锁——
          <code>Holder</code> 内部类的 <code>&lt;clinit&gt;</code> 由 JVM 保证只跑一次，天然实现了懒加载且无需手动加锁。
        </p>
      </Callout>

      <h2>实战与面试怎么答</h2>
      <p>
        被问「类加载过程」时，先报五个阶段并点明验证、准备、解析合称连接；接着主动强调两个高频陷阱：
        <strong>准备阶段只赋零值、初始化阶段才赋真实值</strong>，以及 <code>static final</code> 编译期常量在准备阶段就赋值。
        再补一句 <code>&lt;clinit&gt;</code> 的线程安全由 JVM 加锁保证、父类先于子类初始化，基本就拿满分了。
        如果面试官追问「初始化时机」，把六种主动引用和几个被动引用反例说清楚即可。
      </p>
      <p>
        加分追问储备：<strong>「常量改了为什么不生效？」</strong>——编译期常量被内联，要全量重编。
        <strong>「forName 和 loadClass 区别？」</strong>——前者会初始化、后者不会。
        <strong>「静态内部类单例为何线程安全？」</strong>——靠 <code>&lt;clinit&gt;</code> 的初始化锁，JVM 保证只执行一次。
        这三问能答出来，说明你不是死背五阶段。
      </p>

      <Practice title="判断输出顺序">
        <p>
          下面这段代码考的就是「静态先于实例、父类先于子类、clinit 只执行一次」。
          先自己在纸上写出输出，再跑一遍对答案。
        </p>
        <CodeBlock lang="java" title="Demo.java" code={orderCode} />
        <p>
          正确顺序是：<code>Parent.a</code> → <code>Parent static 块</code> → <code>Child.c</code> → <code>Child static 块</code>
          （以上是两个类的 clinit，只在第一次触发时执行）→ <code>Parent.b</code> → <code>Parent 构造方法</code> →
          <code>Child.d</code> → <code>Child 构造方法</code>。第二次 <code>new Child()</code> 时静态部分不再打印，只走实例构造。
        </p>
        <p>
          再跑一遍 <code>Passive.java</code> 验证被动引用，并用 <code>javap -c -p</code> 反编译看看
          <code>Super.NAME</code> 那行字节码里是不是直接是个 <code>ldc "hi"</code>（常量内联）、
          而 <code>Sub.VALUE</code> 那行是不是 <code>getstatic</code>——眼见为实，这两个高频考点就再也不会错。
        </p>
      </Practice>

      <Summary
        points={[
          '类加载五阶段：加载 → 验证 → 准备 → 解析 → 初始化，其中验证、准备、解析合称连接。',
          '拆这么多步是为安全（验证防恶意字节码）和惰性（用到才初始化）；解析可延迟，五阶段是逻辑顺序非严格串行。',
          '准备阶段给静态变量分配内存并赋零值，初始化阶段执行 <clinit> 才赋真实值、跑 static 块。',
          'static final 编译期常量是例外，在准备阶段就赋值，且会被内联进调用方——改了不重编就不生效。',
          '只有六种主动引用才触发初始化；被动引用（子类访问父类静态字段、引用常量、建数组）不触发。',
          'Class.forName 默认初始化类，ClassLoader.loadClass 只加载不初始化。',
          '<clinit> 父类先于子类执行，JVM 对类初始化加锁、只执行一次，可能引发类初始化死锁，也是静态内部类单例线程安全的根因。',
          '区分 <clinit>（类构造器，处理静态成员）与 <init>（实例构造器，每次 new 都执行）。',
        ]}
      />
    </>
  )
}

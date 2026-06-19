import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const interfaceVsAbstractSnippet = `// 抽象类：可以有状态、构造器、具体方法，表达「is-a」
abstract class Shape {
    protected String name;          // 可以有实例字段
    Shape(String name) { this.name = name; }  // 可以有构造器
    abstract double area();         // 抽象方法：留给子类实现
    String describe() { return name + " 面积=" + area(); }  // 具体方法
}

// 接口：表达「能做什么」的能力契约
interface Drawable {
    int LAYER = 0;                  // 隐式 public static final 常量
    void draw();                    // 隐式 public abstract
    default void clear() { System.out.println("清空"); }  // Java 8 默认方法
}

class Circle extends Shape implements Drawable {
    double r;
    Circle(double r) { super("圆"); this.r = r; }
    @Override double area() { return Math.PI * r * r; }
    @Override public void draw() { System.out.println("画圆"); }
}`

const innerClassSnippet = `public class Outer {
    private int x = 10;

    // 1) 成员内部类：持有外部类实例的引用，可访问外部私有成员
    class Member {
        void show() { System.out.println(x); }
    }

    // 2) 静态内部类：不持有外部实例，相当于普通顶层类的命名空间
    static class Nested {
        void show() { System.out.println("不依赖 Outer 实例"); }
    }

    void method() {
        // 3) 局部内部类：定义在方法体内
        class Local { void run() {} }

        // 4) 匿名内部类：定义并实例化一个一次性子类/实现
        Runnable r = new Runnable() {
            @Override public void run() { System.out.println(x); }
        };
        r.run();
    }
}`

const immutableSnippet = `// 设计一个不可变类的要点
public final class Point {              // 1) 类用 final，禁止继承篡改
    private final int x;                // 2) 字段全部 private final
    private final int y;

    public Point(int x, int y) {        // 3) 构造时一次性赋值
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }     // 4) 只提供 getter，不提供 setter
    public int getY() { return y; }

    // 5) 如需「修改」，返回新对象而非改自身
    public Point withX(int nx) { return new Point(nx, y); }
}`

const mutableFieldSnippet = `public final class Holder {
    private final int[] data;           // 引用 final，但数组内容可变！

    public Holder(int[] src) {
        this.data = src.clone();        // 防御性拷贝：不直接存外部引用
    }
    public int[] getData() {
        return data.clone();            // 返回副本，避免外部改动内部数组
    }
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        类型设计是 Java 面试里区分「会写」和「懂设计」的分水岭。本章围绕四道高频题展开：
        接口与抽象类怎么选、四种内部类各自的用途、如何设计一个真正不可变的类、四种访问修饰符的可见范围。
        每道题都讲清原理、给可运行代码，并点出最容易踩的坑。
      </Lead>

      <h2>一、接口 vs 抽象类</h2>
      <KeyIdea>
        抽象类回答「<strong>它是什么</strong>」（is-a，可带状态与默认实现，单继承）；
        接口回答「<strong>它能做什么</strong>」（can-do，能力契约，可多实现）。
        当多个类共享状态和实现细节时用抽象类；当只想约定一组行为、且需要被不相关的类共同具备时用接口。
      </KeyIdea>

      <h3>面试题 1：接口和抽象类有什么区别，怎么选？</h3>
      <CodeBlock lang="java" title="抽象类与接口的对照" code={interfaceVsAbstractSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>抽象类</th><th>接口</th></tr>
        </thead>
        <tbody>
          <tr><td>关键字</td><td><code>abstract class</code> / <code>extends</code></td><td><code>interface</code> / <code>implements</code></td></tr>
          <tr><td>多继承</td><td>单继承（一个父类）</td><td>可实现多个接口</td></tr>
          <tr><td>字段</td><td>可有任意实例字段</td><td>只能是 <code>public static final</code> 常量</td></tr>
          <tr><td>构造器</td><td>有（供子类 super 调用）</td><td>没有</td></tr>
          <tr><td>方法实现</td><td>可有具体方法</td><td>Java 8+ 可有 default/static 方法</td></tr>
          <tr><td>语义</td><td>is-a（强血缘关系）</td><td>can-do（能力/角色）</td></tr>
        </tbody>
      </table>
      <p>
        选择经验：如果几个类<strong>本质上是同一族</strong>、共享字段和大量公共实现，用抽象类；
        如果只是想给一组<strong>可能毫不相关</strong>的类约定共同行为（如「可比较」「可序列化」），用接口。
        现代 Java 倾向「优先用接口」，因为它更灵活、不占用唯一的继承名额。
      </p>
      <Callout variant="tip" title="面试追问：Java 8 后接口能有方法体，那它和抽象类还有区别吗？">
        有，本质区别没变：接口<strong>不能有实例字段、不能有构造器、不能保存对象状态</strong>，
        默认方法只是为了在不破坏已有实现类的前提下给接口「平滑加方法」。抽象类能管状态，接口管行为，这条分界依旧成立。
      </Callout>

      <h2>二、内部类</h2>
      <h3>面试题 2：内部类有哪几种？各自什么用途？</h3>
      <p>Java 有四种内部类，区别在于「定义位置」和「是否持有外部类实例引用」：</p>
      <CodeBlock lang="java" title="四种内部类" code={innerClassSnippet} />
      <table>
        <thead>
          <tr><th>类型</th><th>位置</th><th>持有外部实例</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td>成员内部类</td><td>类内、方法外</td><td>是</td><td>需要紧密访问外部对象状态的辅助类</td></tr>
          <tr><td>静态内部类</td><td>类内、加 static</td><td>否</td><td>逻辑归属外部类但不依赖其实例（如 Builder、Node）</td></tr>
          <tr><td>局部内部类</td><td>方法体内</td><td>是（限定作用域）</td><td>只在某方法内复用一次的小类</td></tr>
          <tr><td>匿名内部类</td><td>表达式中</td><td>是</td><td>一次性实现接口/抽象类（回调、监听器）</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="易错点：成员内部类与内存泄漏">
        非静态内部类会<strong>隐式持有外部类实例的引用</strong>。如果一个长生命周期的对象（如线程、监听器）
        是非静态内部类的实例，它会让外部对象迟迟无法被回收，造成内存泄漏。
        所以「不需要访问外部实例」时，优先用<strong>静态内部类</strong>。这也是为什么很多工具类里 Node、Entry 都是 static。
      </Callout>
      <Callout variant="note" title="匿名内部类与 Lambda 的关系">
        Java 8 的 Lambda 表达式在很多场景可替代「实现单方法接口的匿名内部类」，更简洁。
        但二者不完全等价：Lambda 没有自己的 <code>this</code>（指向外部实例），也不会生成独立的 .class，
        而匿名内部类有自己的 this 且会编译出一个 <code>Outer$1.class</code>。只有函数式接口才能用 Lambda 替代。
      </Callout>

      <h2>三、不可变类</h2>
      <h3>面试题 3：如何设计一个不可变（immutable）类？</h3>
      <p>
        不可变类指对象一旦创建，状态就不能再改变（如 <code>String</code>、<code>Integer</code>、<code>BigDecimal</code>）。
        它的好处是天生线程安全、可安全共享、可放心做缓存键。设计要点有五条：
      </p>
      <CodeBlock lang="java" title="不可变类的五个要点" code={immutableSnippet} />
      <ol>
        <li>类声明为 <code>final</code>，防止子类继承后破坏不可变性；</li>
        <li>所有字段 <code>private final</code>，构造后不可重新赋值；</li>
        <li>只在构造器里赋值一次；</li>
        <li>不提供任何 setter；</li>
        <li>需要「修改」时返回一个新对象（如 <code>String</code> 的所有变换方法）。</li>
      </ol>
      <Callout variant="warn" title="最容易漏的坑：可变字段要做防御性拷贝">
        如果字段是一个可变对象（数组、List、Date），仅仅加 <code>final</code> 是不够的——
        <code>final</code> 只锁住「引用不能改指向」，锁不住「被指对象内部可变」。
        必须在构造时<strong>拷贝传入的可变对象</strong>，在 getter 里<strong>返回副本</strong>，
        否则外部仍能通过引用篡改内部状态。
      </Callout>
      <CodeBlock lang="java" title="可变字段的防御性拷贝" code={mutableFieldSnippet} />
      <Example title="为什么不可变天生线程安全？">
        <p>
          多线程的根本问题是「共享可变状态」。不可变对象状态创建后永不改变，
          所以无论多少线程同时读它，都不可能读到「写到一半」的中间态，自然无需加锁。
          这也是为什么并发编程提倡「能用不可变就用不可变」。
        </p>
      </Example>

      <h2>四、访问修饰符</h2>
      <h3>面试题 4：四种访问修饰符的可见范围？</h3>
      <p>
        Java 有四种访问级别，从最严到最松依次是 <code>private</code>、默认（package-private，不写修饰符）、
        <code>protected</code>、<code>public</code>。记忆口诀是「类内 → 同包 → 子类 → 全局」逐级放开。
      </p>
      <table>
        <thead>
          <tr><th>修饰符</th><th>同类</th><th>同包</th><th>子类（不同包）</th><th>其他包</th></tr>
        </thead>
        <tbody>
          <tr><td><code>private</code></td><td>可</td><td>不可</td><td>不可</td><td>不可</td></tr>
          <tr><td>默认（不写）</td><td>可</td><td>可</td><td>不可</td><td>不可</td></tr>
          <tr><td><code>protected</code></td><td>可</td><td>可</td><td>可</td><td>不可</td></tr>
          <tr><td><code>public</code></td><td>可</td><td>可</td><td>可</td><td>可</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="protected 的两个细节">
        其一，<code>protected</code> 比默认级别<strong>多放开了「不同包的子类」</strong>，但子类只能通过
        <strong>自身或子类类型的引用</strong>访问父类的 protected 成员，不能通过父类类型的引用随意访问。
        其二，顶层类（非内部类）只能用 <code>public</code> 或默认两种修饰符，不能用 private/protected 修饰顶层类。
      </Callout>
      <Callout variant="tip" title="设计建议：最小可见性原则">
        始终用「能满足需求的最小可见性」。字段优先 private，需要时再通过方法放开；
        这能减少耦合、保护封装，也让后续重构内部实现时不影响外部调用方。面试被问到设计原则时，
        这一条配合封装一起讲很自然。
      </Callout>

      <h3>面试题 5：static 关键字能修饰哪些东西？各是什么含义？</h3>
      <p>
        访问修饰符常和 <code>static</code> 一起出现，这道题把 static 的用法补全：static 表示「属于类、不属于实例」。
      </p>
      <table>
        <thead>
          <tr><th>修饰对象</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>静态字段</td><td>类级别共享，所有实例共用一份</td></tr>
          <tr><td>静态方法</td><td>用类名直接调，无 this，不能访问实例成员</td></tr>
          <tr><td>静态代码块</td><td>类首次加载时执行一次，常用于初始化静态资源</td></tr>
          <tr><td>静态内部类</td><td>不持有外部实例引用（见上文内部类）</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="static 不能修饰局部变量">
        <code>static</code> 不能修饰方法内的局部变量（局部变量随方法栈帧创建销毁，谈不上「类级别」）。
        它修饰的是类成员。另外静态成员在类初始化时就绪、生命周期与类相同，这也是它能被「类名直接访问」的原因。
      </Callout>

      <Summary
        points={[
          '抽象类表达 is-a、可带状态与构造器、单继承；接口表达 can-do、无实例状态、可多实现；共享实现用抽象类，约定能力用接口。',
          'Java 8 后接口可有 default/static 方法，但仍无实例字段和构造器，这是它与抽象类的本质分界。',
          '四种内部类：成员/静态/局部/匿名；非静态内部类隐式持有外部实例易致内存泄漏，不依赖外部实例就用静态内部类。',
          '不可变类五要点：类 final、字段 private final、只构造时赋值、无 setter、修改返回新对象；可变字段必须做防御性拷贝。',
          '不可变对象天生线程安全，因为没有可被并发修改的共享可变状态。',
          '访问修饰符 private < 默认 < protected < public 逐级放开；遵循最小可见性原则保护封装。',
        ]}
      />
    </article>
  )
}

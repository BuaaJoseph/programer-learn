import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const encapsulationSnippet = `public class Account {
    // 封装：字段私有，外部不能直接乱改
    private long balance;

    public long getBalance() { return balance; }

    // 通过方法暴露受控的操作，可以在这里加校验
    public void deposit(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("金额必须为正");
        balance += amount;
    }
}`

const polymorphismSnippet = `class Animal {
    String speak() { return "..."; }
}
class Dog extends Animal {
    @Override String speak() { return "汪"; }
}
class Cat extends Animal {
    @Override String speak() { return "喵"; }
}

public class Demo {
    public static void main(String[] args) {
        // 父类引用指向子类对象：编译期看 Animal，运行期看真实类型
        Animal[] zoo = { new Dog(), new Cat() };
        for (Animal a : zoo) {
            System.out.println(a.speak());  // 动态分派：分别输出 汪 / 喵
        }
    }
}`

const diamondSnippet = `// 假想：如果 Java 允许类多继承，会出现「菱形问题」
class A            { void hi() { System.out.println("A"); } }
class B extends A  { void hi() { System.out.println("B"); } }
class C extends A  { void hi() { System.out.println("C"); } }

// class D extends B, C {}   // 编译不通过！
// 若允许：d.hi() 到底调 B 还是 C 的版本？歧义无法消解。
// Java 的选择：类只能单继承，多继承的需求交给「实现多个接口」来满足。`

const interfaceMultiSnippet = `interface Swimmer { default void move() { System.out.println("游"); } }
interface Runner  { default void move() { System.out.println("跑"); } }

class Amphibian implements Swimmer, Runner {
    // 接口默认方法同名冲突时，编译器强制你显式覆写消歧义
    @Override public void move() {
        Swimmer.super.move();   // 显式选择某个父接口的实现
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        面向对象（OOP）是 Java 的灵魂，也是面试必问。但很多人只会背「封装、继承、多态」六个字，
        一追问「它解决了什么问题」「和面向过程到底差在哪」「为什么 Java 不能多继承」就卡住。
        本章把这几道高频题逐一讲透，让 OOP 从口号变成你能讲出设计动机的思维方式。
      </Lead>

      <h2>一、面向对象三大特性</h2>
      <KeyIdea>
        封装、继承、多态不是三个孤立的语法点，而是一条递进的设计主线：<strong>封装</strong>管「隐藏与边界」，
        <strong>继承</strong>管「复用与扩展」，<strong>多态</strong>管「用统一接口应对变化」。
        理解每一条「解决了什么问题」，比记住定义重要得多。
      </KeyIdea>

      <h3>面试题 1：封装、继承、多态各解决什么问题？</h3>
      <p><strong>封装（Encapsulation）</strong>：把数据和操作数据的方法捆在一起，对外只暴露必要接口，隐藏内部实现。
        它解决的是「外部随意访问内部状态导致不可控」的问题。把字段设成 <code>private</code>，
        通过方法暴露受控访问，就能在 setter 里加校验、在内部改实现而不影响调用方。</p>
      <CodeBlock lang="java" title="封装：私有字段 + 受控方法" code={encapsulationSnippet} />

      <p><strong>继承（Inheritance）</strong>：子类复用父类的字段与方法，并可扩展或修改。
        它解决的是「相似类之间大量重复代码」的问题，建立「is-a」关系。
        但要警惕过度继承——继承是强耦合，父类一改子类全受影响，很多场景「组合优于继承」更合适。</p>

      <p><strong>多态（Polymorphism）</strong>：同一个父类引用，指向不同子类对象时，调用同名方法表现出不同行为。
        它解决的是「面对一组同类但行为各异的对象，如何用统一代码处理」的问题。
        多态是 OOP 扩展性的核心：新增一个子类，调用方代码<strong>一行都不用改</strong>。</p>
      <CodeBlock lang="java" title="多态：父类引用 + 运行时动态分派" code={polymorphismSnippet} />
      <Callout variant="note" title="多态的两种形态别混">
        编译时多态（静态）= <strong>方法重载</strong>，靠参数列表在编译期决定调哪个；
        运行时多态（动态）= <strong>方法重写 + 父类引用指向子类对象</strong>，靠 JVM 在运行期根据真实类型分派。
        面试问「多态」通常指后者，但能区分两者会显得更扎实。下一卷会专门讲重载与重写。
      </Callout>

      <h2>二、面向对象 vs 面向过程</h2>
      <h3>面试题 2：面向对象和面向过程有什么区别？</h3>
      <p>
        这道题的关键不是贬低面向过程，而是讲清两种<strong>思考问题的角度</strong>不同。
        面向过程关注「步骤」——把问题拆成一步步的函数调用，数据和函数是分离的；
        面向对象关注「对象」——先识别有哪些实体、它们有什么状态和行为，再让对象之间协作。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>面向过程</th><th>面向对象</th></tr>
        </thead>
        <tbody>
          <tr><td>核心单位</td><td>函数/过程</td><td>对象（数据 + 行为）</td></tr>
          <tr><td>组织方式</td><td>按执行步骤自顶向下分解</td><td>按职责把数据和方法封装成类</td></tr>
          <tr><td>数据与逻辑</td><td>数据和处理它的函数分离</td><td>数据和行为绑定在对象内</td></tr>
          <tr><td>扩展性</td><td>改需求常需改动多处过程</td><td>靠继承/多态扩展，影响面小</td></tr>
          <tr><td>性能</td><td>通常略高（没有对象开销）</td><td>有对象创建/分派开销，但工程价值高</td></tr>
          <tr><td>适用</td><td>简单脚本、性能极致场景</td><td>复杂业务、大型协作系统</td></tr>
        </tbody>
      </table>
      <Example title="同一个需求两种写法">
        <p>
          需求：「让一只动物叫」。<strong>面向过程</strong>会写一个 <code>makeSound(type)</code> 函数，
          里面用 <code>if</code> 判断 type 是 dog 还是 cat，分别打印——新增动物就得回来改这个函数。
          <strong>面向对象</strong>则让每个动物类自己实现 <code>speak()</code>，
          调用方只管 <code>animal.speak()</code>——新增动物只是加个类，老代码不动。
          这就是 OOP「对修改封闭、对扩展开放」的直观体现。
        </p>
      </Example>
      <Callout variant="tip" title="面试别绝对化">
        别说「面向对象一定比面向过程好」。两者是不同抽象层次的工具：写个一次性小脚本，
        面向过程更直接；构建需要长期演进的复杂系统，面向对象的可维护性优势才显现。
        实际上 Java 程序里方法体内部仍然是面向过程的逻辑——它们是互补而非对立。
      </Callout>

      <h2>三、为什么 Java 不支持类的多继承</h2>
      <h3>面试题 3：Java 为什么不支持多继承？接口为什么可以多实现？</h3>
      <p>
        核心原因是为了<strong>避免「菱形继承」带来的二义性</strong>，让语言更简单、更可控。
        假设一个类同时继承两个父类，而这两个父类又都重写了同一个祖父类的方法，
        那么子类调用这个方法时，到底该用哪个父类的版本？这就是著名的菱形问题（diamond problem）。
      </p>
      <CodeBlock lang="java" title="菱形问题：类多继承的二义性" code={diamondSnippet} />
      <p>
        C++ 允许多继承，代价是引入虚继承等复杂机制来消歧义，心智负担很重。
        Java 的设计取舍是：<strong>类只能单继承</strong>（保证继承链清晰、对象内存布局唯一），
        而把「一个类型需要具备多种能力」的需求交给<strong>接口多实现</strong>来满足。
      </p>
      <table>
        <thead>
          <tr><th>对比</th><th>类继承（extends）</th><th>接口实现（implements）</th></tr>
        </thead>
        <tbody>
          <tr><td>数量</td><td>单继承（只能一个父类）</td><td>可实现多个接口</td></tr>
          <tr><td>内容</td><td>有状态字段 + 方法实现</td><td>主要是行为契约（含默认方法）</td></tr>
          <tr><td>二义性</td><td>多继承会产生状态/方法歧义</td><td>接口无实例字段，歧义可控</td></tr>
          <tr><td>语义</td><td>is-a（是一种）</td><td>can-do / has-ability（具备某能力）</td></tr>
        </tbody>
      </table>
      <p>
        接口为什么不怕多实现？因为传统接口<strong>没有实例状态</strong>，只有方法签名，不存在「继承谁的字段」的歧义。
        Java 8 给接口加了默认方法（default method）后，理论上也可能出现同名冲突，
        但 Java 用一条强制规则化解：当多个接口的默认方法签名冲突时，<strong>实现类必须显式覆写</strong>来消歧义。
      </p>
      <CodeBlock lang="java" title="接口默认方法冲突时强制显式覆写" code={interfaceMultiSnippet} />
      <Callout variant="warn" title="易错点：默认方法让接口也能「带实现」了">
        别再说「接口里都是抽象方法、没有实现」。Java 8 起接口可以有 <code>default</code> 和
        <code>static</code> 方法（带方法体），这正是接口能「多实现」却仍可携带通用逻辑的原因。
        但接口仍不能有实例字段，所以不会引入多继承式的状态歧义——这是它和类的本质差别。
      </Callout>

      <h2>四、把三大特性串成设计原则</h2>
      <p>
        最后拔高一层：三大特性最终服务于「<strong>高内聚、低耦合、易扩展</strong>」。
        封装让模块内聚、对外低耦合；继承与接口让能力可复用；多态让系统对扩展开放、对修改封闭。
        面试若被问「OOP 的最终目的是什么」，答这一句会比复述定义更显功力——
        语法只是手段，<strong>管理复杂度</strong>才是面向对象真正要解决的问题。
      </p>

      <h3>面试题 4：继承和组合怎么选？为什么说「组合优于继承」？</h3>
      <p>
        继承表达「is-a」（猫是动物），组合表达「has-a」（汽车有引擎）。虽然继承能复用代码，
        但它是<strong>强耦合</strong>：子类依赖父类的实现细节，父类一改可能波及所有子类（脆弱基类问题）；
        而组合通过持有其它对象的引用来复用功能，耦合松、更灵活。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>继承</th><th>组合</th></tr>
        </thead>
        <tbody>
          <tr><td>关系</td><td>is-a（是一种）</td><td>has-a（拥有）</td></tr>
          <tr><td>耦合</td><td>强（子类绑死父类实现）</td><td>松（只依赖被组合对象的接口）</td></tr>
          <tr><td>灵活性</td><td>编译期固定，单继承受限</td><td>运行期可替换被组合对象</td></tr>
          <tr><td>复用</td><td>继承父类全部</td><td>按需委托所需功能</td></tr>
        </tbody>
      </table>
      <p>
        所以经典原则是「<strong>优先使用组合而非继承</strong>」：只有确实是稳定的「is-a」关系、且需要多态时才用继承；
        单纯为了复用代码就继承，往往会埋下耦合的雷。
      </p>
      <Callout variant="tip" title="一个判断口诀">
        问自己一句：「子类<strong>真的是</strong>父类的一种吗？」如果只是「想用父类的某些方法」，那应该用组合（持有它）；
        只有「子类在任何用到父类的地方都能替换父类」（里氏替换原则）时，继承才站得住。
      </Callout>

      <Summary
        points={[
          '封装隐藏内部状态、暴露受控接口，解决「外部乱改内部」；继承复用并扩展，建立 is-a 关系，但要警惕过度耦合。',
          '多态让父类引用按真实类型表现不同行为，是 OOP 扩展性的核心：新增子类不改调用方代码。',
          '多态分编译时（重载）与运行时（重写 + 动态分派）两种，面试问多态通常指运行时多态。',
          '面向过程关注步骤、数据与函数分离；面向对象关注对象、把数据与行为绑定，更利于复杂系统的演进与协作。',
          'Java 类只能单继承，是为了避免菱形继承的二义性；多种能力的需求由接口多实现满足。',
          '接口可多实现因其无实例状态；Java 8 后接口可有 default/static 方法，同名默认方法冲突时强制实现类显式覆写。',
        ]}
      />
    </article>
  )
}

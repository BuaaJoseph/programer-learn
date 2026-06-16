import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const badOcpCode = `// 反例：每加一种支付方式，就得改这个类
public class PaymentService {

    public void pay(String type, double amount) {
        if ("alipay".equals(type)) {
            System.out.println("用支付宝支付 " + amount);
        } else if ("wechat".equals(type)) {
            System.out.println("用微信支付 " + amount);
        } else if ("unionpay".equals(type)) {
            // 新需求来了：又得回来加一个 else if，改老代码
            System.out.println("用银联支付 " + amount);
        }
    }
}`

const goodOcpCode = `// 正例：面向接口编程，新增支付方式只加类、不改老代码
public interface Payment {
    void pay(double amount);
}

public class Alipay implements Payment {
    public void pay(double amount) {
        System.out.println("用支付宝支付 " + amount);
    }
}

public class WechatPay implements Payment {
    public void pay(double amount) {
        System.out.println("用微信支付 " + amount);
    }
}

// 要加银联？新建一个 UnionPay implements Payment 即可，
// PaymentService 一个字都不用动
public class PaymentService {
    public void pay(Payment payment, double amount) {
        payment.pay(amount);
    }
}`

const lspBadCode = `// 反例：正方形继承长方形，违反里氏替换
public class Rectangle {
    protected int width, height;
    public void setWidth(int w)  { this.width = w; }
    public void setHeight(int h) { this.height = h; }
    public int area() { return width * height; }
}

public class Square extends Rectangle {
    // 为了维持"正方形"，setWidth 顺手改了高 —— 破坏了父类契约
    public void setWidth(int w)  { this.width = w; this.height = w; }
    public void setHeight(int h) { this.width = h; this.height = h; }
}

// 客户端基于父类假设写的代码，遇到 Square 就崩了
void resizeAndCheck(Rectangle r) {
    r.setWidth(5);
    r.setHeight(4);
    assert r.area() == 20;   // 传 Square 进来：area == 16，断言失败
}`

const dipCode = `// 依赖倒置：高层依赖抽象，具体实现由外部注入
public interface OrderRepository {        // 抽象（稳定）
    void save(Order order);
}

public class MySqlOrderRepository implements OrderRepository {
    public void save(Order order) { /* JDBC ... */ }
}

public class OrderService {               // 高层模块
    private final OrderRepository repo;   // 依赖接口，而非 new MySqlOrderRepository()
    public OrderService(OrderRepository repo) {   // 构造注入
        this.repo = repo;
    }
    public void placeOrder(Order order) {
        repo.save(order);                 // 换 Oracle 实现，这里一行都不用动
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          设计模式不是凭空发明的招式，而是一群前辈在无数次「改一个需求牵动半个项目」的痛苦里，
          总结出来的几条朴素道理。这几条道理就是<em>设计原则</em>。先把原则吃透，
          后面的 23 种模式你会发现它们都只是同一组原则在不同场景下的具体落地。
        </p>
      </Lead>

      <h2>为什么先讲原则，再讲模式</h2>
      <p>
        很多人背了一堆模式，面试时却答得很生硬，原因是没抓住「为什么要这样设计」。
        所有模式追求的目标其实只有一个：<strong>让代码在需求变化时，改动尽量小、影响尽量可控</strong>。
        七大设计原则就是把这个目标拆成了七条可操作的指导，模式则是这些原则的「成品方案」。
      </p>
      <p>
        再往上抽一层，软件设计有两个永恒的敌人：<strong>耦合</strong>（一处改动牵连多处）和
        <strong>变化</strong>（需求永远在变）。所有原则都在做同一件事——<strong>识别出系统里「容易变」的那部分，
        把它和「稳定」的那部分隔离开</strong>。Robert C. Martin（Bob 大叔）把其中五条提炼成了著名的
        <strong>SOLID</strong> 缩写（S=SRP、O=OCP、L=LSP、I=ISP、D=DIP），再加上迪米特法则与合成复用原则，
        就是我们常说的「七大原则」。它们不是互相独立的清规戒律，而是从不同角度逼近同一个目标。
      </p>

      <h3>单一职责原则 SRP（Single Responsibility Principle）</h3>
      <p>
        一个类只负责一件事，只有一个引起它变化的原因。比如一个类既管理用户数据、又负责发短信，
        将来改短信逻辑就可能误伤用户逻辑。<strong>反例</strong>：UserService 里塞满了数据库操作、
        日志、邮件发送。<strong>正例</strong>：拆成 UserRepository、Logger、MailSender 各管一摊。
      </p>
      <p>
        Bob 大叔后来把 SRP 重新表述为「一个模块应该只对<strong>一类</strong>角色（actor）负责」。
        换个角度判断职责是否单一，可以问：<em>「将来会有几拨人、因为几种不同的原因来要求我改这个类？」</em>
        如果财务想改算税逻辑、运营想改文案、运维想改日志格式都得动同一个类，那它就承担了多重职责。
        SRP 的好处是修改影响面小、易测试、易复用；但也别走极端——把一个类拆成十几个只有一个方法的「贫血类」，
        反而增加了协作成本，这就是<strong>过度拆分</strong>。
      </p>

      <h3>开闭原则 OCP（Open Closed Principle）</h3>
      <p>
        <strong>对扩展开放，对修改关闭</strong>——这是七大原则里最核心的一条。意思是：
        当有新需求时，应该通过「新增代码」来满足，而不是去「修改已经测试稳定的老代码」。
        改老代码风险大、容易引入回归 bug；加新代码则安全得多。后面几乎所有模式都在为这一条服务。
      </p>
      <p>
        OCP 的实现手段几乎只有一招：<strong>抽象 + 多态</strong>。把「会变的部分」抽成接口/抽象类，
        让调用方依赖抽象；新增变体时实现一个新类即可，调用方代码原封不动。
        需要警惕的是：OCP 是<strong>有方向、有成本的</strong>。你必须预判「哪个维度会变」，
        然后只为那个维度留扩展点。盲目地给每一处都加接口、加抽象，会让系统充斥着「只有一个实现的接口」，
        这是典型的过度设计。正确姿势是<strong>先具体地写，等同类变化出现第二次时再抽象</strong>（即「事不过三」原则）。
      </p>

      <h3>里氏替换原则 LSP（Liskov Substitution Principle）</h3>
      <p>
        子类必须能完全替换父类而不破坏程序的正确性。<strong>反例</strong>：正方形继承长方形，
        重写 setWidth 时顺手改了高，导致「设宽度不改高度」的假设失效。
        <strong>正例</strong>：让两者都实现一个 Shape 接口，而不是强行继承。
      </p>
      <p>
        LSP 的精确表述来自 Barbara Liskov：如果对每个类型 S 的对象都能在「期望类型 T 对象」的场景里使用、
        而程序行为不变，那么 S 才是 T 的合法子类型。落到代码上有三条潜规则：
        <strong>子类不能收窄方法的入参约束、不能放宽返回值范围、不能抛出父类没声明的异常、不能违背父类的不变量</strong>。
        违反 LSP 的代码会让「面向父类编程」的多态假设失效，OCP 也就随之崩塌——所以 LSP 是 OCP 能成立的<strong>前提</strong>。
        下面这段正方形/长方形是 LSP 最经典的反例：
      </p>
      <CodeBlock lang="java" title="反例：正方形继承长方形违反 LSP" code={lspBadCode} />

      <h3>依赖倒置原则 DIP（Dependency Inversion Principle）</h3>
      <p>
        高层模块不要依赖低层模块，两者都应依赖抽象——一句话就是<strong>面向接口（抽象）编程</strong>。
        <strong>反例</strong>：业务类里直接 new 一个 MySQLDao。<strong>正例</strong>：业务类依赖 Dao 接口，
        具体用 MySQL 还是 Oracle 在外部注入。Spring 的依赖注入正是 DIP 的工程化体现。
      </p>
      <p>
        「倒置」二字是相对传统的「高层调用低层、所以高层依赖低层」而言的：引入抽象层后，
        <strong>低层实现反过来去依赖（实现）高层定义的抽象</strong>，依赖箭头被「倒」了过来。
        这正是控制反转（IoC）容器的理论基础——对象不再自己 <code>new</code> 依赖，
        而是把「我需要一个 OrderRepository」声明出来，由容器在运行时注入具体实现。
        三种注入方式中，<strong>构造器注入</strong>最被推荐，因为它能保证依赖在对象创建时就齐全、且可声明为 final。
      </p>
      <CodeBlock lang="java" title="正例：构造注入体现依赖倒置" code={dipCode} />

      <h3>接口隔离原则 ISP（Interface Segregation Principle）</h3>
      <p>
        客户端不应被迫依赖它用不到的方法，接口要小而专。<strong>反例</strong>：一个臃肿的
        Animal 接口同时有 fly、swim、run，企鹅被迫实现 fly。<strong>正例</strong>：拆成
        Flyable、Swimmable 等小接口，谁需要谁实现。
      </p>
      <p>
        ISP 和 SRP 很像，但视角不同：SRP 关注「类的职责」，ISP 关注「接口对调用方的承诺」。
        胖接口的害处是<strong>无谓的耦合</strong>——只要接口里任意一个方法签名变了，所有实现类、
        所有依赖该接口的调用方都得跟着重新编译/适配，哪怕它们根本没用到那个方法。
        Java 标准库里 <code>java.util.concurrent</code> 把读写分离成 <code>ReadWriteLock</code>、
        把 <code>Runnable</code>（无返回）与 <code>Callable</code>（有返回）分开，都是 ISP 的体现。
      </p>

      <h3>迪米特法则 LoD（Law of Demeter，最少知道原则）</h3>
      <p>
        一个对象应尽量少地了解其他对象的内部细节，只和「直接朋友」打交道。
        <strong>反例</strong>：<code>order.getCustomer().getAddress().getCity()</code> 这种火车式调用，
        一旦中间结构变化就全线崩。<strong>正例</strong>：让 order 直接提供一个 getCity 方法把细节封装起来。
      </p>
      <p>
        「直接朋友」的定义是：当前对象本身、它的成员变量、方法的入参、方法内部 new 出来的对象。
        LoD 本质上是在控制<strong>耦合的传递深度</strong>——你越深地穿透别人的对象图，就越依赖它的内部结构。
        但 LoD 也不能极端化：为了避免一次链式调用而给中间每一层都加包装方法，会催生大量「转发方法」，
        反而让类膨胀。流式 API（如 Stream、Builder 链）虽然形似火车式调用，但它们返回的是<strong>同一类型</strong>，
        并未穿透不同对象的内部，因此不算违反 LoD。
      </p>

      <h3>合成复用原则（Composite Reuse Principle）</h3>
      <p>
        优先用<strong>组合 / 聚合</strong>来复用代码，而不是<strong>继承</strong>。继承是强耦合，
        父类一改子类全受影响，且会暴露父类实现细节。组合则是把已有对象当作成员持有，更灵活、耦合更低。
        一句话：<strong>多用组合，少用继承</strong>。
      </p>
      <p>
        继承被称为「白箱复用」——子类能看到父类的实现细节，是<strong>编译期</strong>就定死的强绑定；
        组合是「黑箱复用」——只通过对方的接口交互，可以在<strong>运行期</strong>动态替换。
        判断该用哪个有一句经典口诀：<strong>「is-a」用继承，「has-a」用组合</strong>。
        装饰器、策略、桥接等大量模式之所以强大，正是因为它们用组合替代了继承，从而获得了运行期的灵活性。
        合理的继承应满足 LSP 且层级浅（通常不超过 2~3 层），否则就该考虑改用组合。
      </p>

      <Example title="一句话记住七大原则">
        <ul>
          <li><strong>SRP</strong> · 一个类只干一件事</li>
          <li><strong>OCP</strong> · 加功能靠新增，别改老代码（最核心）</li>
          <li><strong>LSP</strong> · 子类能无痛顶替父类</li>
          <li><strong>DIP</strong> · 依赖接口，别依赖具体实现</li>
          <li><strong>ISP</strong> · 接口要小，别逼别人实现用不到的方法</li>
          <li><strong>LoD</strong> · 少打听别人的内部细节</li>
          <li><strong>合成复用</strong> · 能组合就别继承</li>
        </ul>
      </Example>

      <h2>七大原则速查表</h2>
      <p>
        把每条原则的「一句话目标」「主要手段」「常见违反信号」整理成表，便于复习时快速回忆与对照：
      </p>
      <table>
        <thead>
          <tr>
            <th>原则</th>
            <th>核心目标</th>
            <th>违反的信号</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SRP 单一职责</td>
            <td>降低修改影响面</td>
            <td>一个类有多个改动来源 / 名字里带 And、Util、Manager</td>
          </tr>
          <tr>
            <td>OCP 开闭</td>
            <td>扩展不改老代码</td>
            <td>每加需求都要改同一段 if-else / switch</td>
          </tr>
          <tr>
            <td>LSP 里氏替换</td>
            <td>子类可无痛替换父类</td>
            <td>子类重写后抛新异常 / 返回 null / 留空实现</td>
          </tr>
          <tr>
            <td>DIP 依赖倒置</td>
            <td>面向抽象编程</td>
            <td>业务代码里直接 new 具体实现类</td>
          </tr>
          <tr>
            <td>ISP 接口隔离</td>
            <td>接口小而专</td>
            <td>实现类里大量空方法 / UnsupportedOperationException</td>
          </tr>
          <tr>
            <td>LoD 迪米特</td>
            <td>控制耦合深度</td>
            <td>a.getB().getC().getD() 火车式调用</td>
          </tr>
          <tr>
            <td>合成复用</td>
            <td>用组合换灵活</td>
            <td>继承层级过深 / 为复用而继承（非 is-a）</td>
          </tr>
        </tbody>
      </table>

      <KeyIdea title="模式是原则的落地">
        <p>
          23 种设计模式没有一个是新道理，它们全是上面七条原则在具体场景里的标准答案。
          比如策略模式是<strong>开闭 + 依赖倒置</strong>的落地，装饰器模式是<strong>合成复用</strong>的落地，
          工厂模式是把「new 谁」这件易变的事隔离开以满足<strong>开闭</strong>。
          理解了原则，模式就不用死记，而是能自然推导出来。
        </p>
      </KeyIdea>

      <h2>GoF 23 种模式怎么分类</h2>
      <p>
        《设计模式：可复用面向对象软件的基础》一书由四位作者（Gang of Four，GoF）提出 23 种模式，
        按「意图」分为三大类，这也是本课程后续卷次的组织方式：
      </p>
      <ul>
        <li>
          <strong>创建型（5 种）</strong>——解决「怎么创建对象」：单例、工厂方法、抽象工厂、建造者、原型。
          核心是<strong>把对象的创建和使用解耦</strong>。
        </li>
        <li>
          <strong>结构型（7 种）</strong>——解决「怎么组合类与对象」：适配器、装饰器、代理、外观、桥接、组合、享元。
          核心是<strong>用组合搭出更大、更灵活的结构</strong>。
        </li>
        <li>
          <strong>行为型（11 种）</strong>——解决「对象间怎么协作与分配职责」：策略、模板方法、观察者、责任链、
          状态、命令、迭代器、中介者、备忘录、访问者、解释器。核心是<strong>把易变的算法/流程/通信抽象出来</strong>。
        </li>
      </ul>
      <p>
        一个识别经验：看到「new 谁难定」想创建型，看到「想给对象套层壳/转个接口」想结构型，
        看到「if-else 按类型分流程 / 一处变多处响应」想行为型。
      </p>

      <Callout variant="warn" title="别为了模式而模式">
        <p>
          原则和模式都是为了应对「变化」，但如果一段代码根本不会变、需求很简单，强行套用模式只会增加复杂度。
          过度设计（over-engineering）和不设计一样有害。判断标准很朴素：
          这里<strong>将来真的会扩展吗</strong>？会，才值得用模式去隔离变化。
        </p>
        <p>
          配套两条心法：<strong>YAGNI</strong>（You Aren&apos;t Gonna Need It，你不会用到的别提前做）
          与 <strong>KISS</strong>（Keep It Simple, Stupid，保持简单）。
          一个务实的节奏是：第一次写就直来直去，第二次出现类似变化先忍住，
          第三次再重构成模式——此时「变化的维度」已经被现实证明，抽象才稳。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「设计原则有哪些」，不要干背七个名词。正确姿势是：先点出<strong>开闭原则是核心</strong>、
        其余六条都在为它服务，再各用一句「反例 + 正例」证明你真的理解。最后补一句
        「<strong>模式是原则的落地，原则是模式的灵魂</strong>」，面试官就知道你不是背的。
      </p>
      <p>
        如果被追问「原则之间什么关系」，可以这样串：<strong>LSP 是 OCP 的前提</strong>（子类不可替换，多态就不可靠），
        <strong>DIP 是 OCP 的手段</strong>（依赖抽象才能在不改高层的情况下扩展），
        <strong>ISP 和 SRP 从接口/类两个角度都在控制职责粒度</strong>，
        <strong>LoD 与合成复用则在控制耦合的广度与方式</strong>。能把这张关系网讲清楚，比背七个定义高出一截。
      </p>

      <Practice title="把违反 OCP 的代码重构掉">
        <p>
          下面这段支付代码每加一种支付方式就要回来改 <code>if-else</code>，典型地违反了开闭原则。
          请先看反例，再看如何用接口把它重构成「只新增、不修改」。
        </p>
        <CodeBlock lang="java" title="反例：违反开闭原则" code={badOcpCode} />
        <p>
          重构思路：把「易变的那部分」（具体怎么支付）抽成接口，让调用方只依赖接口。
          以后加银联、加云闪付，都是新建一个实现类，老代码纹丝不动——这就是开闭原则。
        </p>
        <CodeBlock lang="java" title="正例：面向接口，满足开闭" code={goodOcpCode} />
        <p>
          想一想：上面的正例同时满足了几条原则？答案是——OCP（加实现不改老代码）、
          DIP（PaymentService 依赖 Payment 接口而非具体类）、SRP（每个支付类只管自己那种付款）。
          一段好的重构往往同时满足多条原则，这也印证了它们殊途同归。
        </p>
      </Practice>

      <Summary
        points={[
          '设计模式的目标只有一个：让需求变化时改动尽量小、影响尽量可控，七大原则是这个目标的拆解。',
          '开闭原则（对扩展开放、对修改关闭）是七大原则中最核心的一条，其余六条都为它服务。',
          'SRP 一类一职、LSP 子类可替换父类、DIP 面向接口编程、ISP 接口小而专、LoD 最少知道。',
          'SOLID = SRP + OCP + LSP + ISP + DIP，是七大原则中最核心的五条，由 Bob 大叔提炼。',
          '合成复用原则：多用组合少用继承，因为继承耦合强、会暴露父类实现细节（白箱 vs 黑箱复用）。',
          'GoF 23 种模式分创建型、结构型、行为型三类，全是这七条原则在具体场景的落地，理解原则就能推导。',
          '原则与模式都为应对变化，需求简单时强行套用反而是过度设计，遵循 YAGNI 与 KISS，事不过三再抽象。',
        ]}
      />
    </>
  )
}

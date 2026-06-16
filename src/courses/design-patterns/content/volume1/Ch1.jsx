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

      <h3>单一职责原则 SRP（Single Responsibility Principle）</h3>
      <p>
        一个类只负责一件事，只有一个引起它变化的原因。比如一个类既管理用户数据、又负责发短信，
        将来改短信逻辑就可能误伤用户逻辑。<strong>反例</strong>：UserService 里塞满了数据库操作、
        日志、邮件发送。<strong>正例</strong>：拆成 UserRepository、Logger、MailSender 各管一摊。
      </p>

      <h3>开闭原则 OCP（Open Closed Principle）</h3>
      <p>
        <strong>对扩展开放，对修改关闭</strong>——这是七大原则里最核心的一条。意思是：
        当有新需求时，应该通过「新增代码」来满足，而不是去「修改已经测试稳定的老代码」。
        改老代码风险大、容易引入回归 bug；加新代码则安全得多。后面几乎所有模式都在为这一条服务。
      </p>

      <h3>里氏替换原则 LSP（Liskov Substitution Principle）</h3>
      <p>
        子类必须能完全替换父类而不破坏程序的正确性。<strong>反例</strong>：正方形继承长方形，
        重写 setWidth 时顺手改了高，导致「设宽度不改高度」的假设失效。
        <strong>正例</strong>：让两者都实现一个 Shape 接口，而不是强行继承。
      </p>

      <h3>依赖倒置原则 DIP（Dependency Inversion Principle）</h3>
      <p>
        高层模块不要依赖低层模块，两者都应依赖抽象——一句话就是<strong>面向接口（抽象）编程</strong>。
        <strong>反例</strong>：业务类里直接 new 一个 MySQLDao。<strong>正例</strong>：业务类依赖 Dao 接口，
        具体用 MySQL 还是 Oracle 在外部注入。Spring 的依赖注入正是 DIP 的工程化体现。
      </p>

      <h3>接口隔离原则 ISP（Interface Segregation Principle）</h3>
      <p>
        客户端不应被迫依赖它用不到的方法，接口要小而专。<strong>反例</strong>：一个臃肿的
        Animal 接口同时有 fly、swim、run，企鹅被迫实现 fly。<strong>正例</strong>：拆成
        Flyable、Swimmable 等小接口，谁需要谁实现。
      </p>

      <h3>迪米特法则 LoD（Law of Demeter，最少知道原则）</h3>
      <p>
        一个对象应尽量少地了解其他对象的内部细节，只和「直接朋友」打交道。
        <strong>反例</strong>：<code>order.getCustomer().getAddress().getCity()</code> 这种火车式调用，
        一旦中间结构变化就全线崩。<strong>正例</strong>：让 order 直接提供一个 getCity 方法把细节封装起来。
      </p>

      <h3>合成复用原则（Composite Reuse Principle）</h3>
      <p>
        优先用<strong>组合 / 聚合</strong>来复用代码，而不是<strong>继承</strong>。继承是强耦合，
        父类一改子类全受影响，且会暴露父类实现细节。组合则是把已有对象当作成员持有，更灵活、耦合更低。
        一句话：<strong>多用组合，少用继承</strong>。
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

      <KeyIdea title="模式是原则的落地">
        <p>
          23 种设计模式没有一个是新道理，它们全是上面七条原则在具体场景里的标准答案。
          比如策略模式是<strong>开闭 + 依赖倒置</strong>的落地，装饰器模式是<strong>合成复用</strong>的落地，
          工厂模式是把「new 谁」这件易变的事隔离开以满足<strong>开闭</strong>。
          理解了原则，模式就不用死记，而是能自然推导出来。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别为了模式而模式">
        <p>
          原则和模式都是为了应对「变化」，但如果一段代码根本不会变、需求很简单，强行套用模式只会增加复杂度。
          过度设计（over-engineering）和不设计一样有害。判断标准很朴素：
          这里<strong>将来真的会扩展吗</strong>？会，才值得用模式去隔离变化。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「设计原则有哪些」，不要干背七个名词。正确姿势是：先点出<strong>开闭原则是核心</strong>、
        其余六条都在为它服务，再各用一句「反例 + 正例」证明你真的理解。最后补一句
        「<strong>模式是原则的落地，原则是模式的灵魂</strong>」，面试官就知道你不是背的。
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
      </Practice>

      <Summary
        points={[
          '设计模式的目标只有一个：让需求变化时改动尽量小、影响尽量可控，七大原则是这个目标的拆解。',
          '开闭原则（对扩展开放、对修改关闭）是七大原则中最核心的一条，其余六条都为它服务。',
          'SRP 一类一职、LSP 子类可替换父类、DIP 面向接口编程、ISP 接口小而专、LoD 最少知道。',
          '合成复用原则：多用组合少用继承，因为继承耦合强、会暴露父类实现细节。',
          '23 种模式都是这七条原则在具体场景的落地，理解原则就能推导出模式，不必死记。',
          '原则与模式都为应对变化，需求简单时强行套用反而是过度设计，要看「将来是否真会扩展」。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Strategy from '@/courses/design-patterns/illustrations/Strategy.jsx'

const ifElseCode = `// 反例：所有分支挤在一个方法里，每加一种支付方式就要改这里
public class PayService {

    public void pay(String type, long amount) {
        if ("alipay".equals(type)) {
            // 调支付宝 SDK
            System.out.println("支付宝支付 " + amount);
        } else if ("wechat".equals(type)) {
            // 调微信 SDK
            System.out.println("微信支付 " + amount);
        } else if ("unionpay".equals(type)) {
            // 调银联 SDK
            System.out.println("银联支付 " + amount);
        } else {
            throw new IllegalArgumentException("不支持的支付方式: " + type);
        }
    }
}`

const strategyCode = `// 1. 策略接口：把一族可互换的算法抽象成同一个契约
public interface PayStrategy {
    String type();              // 该策略对应的支付方式标识
    void pay(long amount);      // 真正的算法
}

// 2. 具体策略：每种支付方式各自一个类，互不干扰
public class AlipayStrategy implements PayStrategy {
    public String type() { return "alipay"; }
    public void pay(long amount) {
        System.out.println("支付宝支付 " + amount);
    }
}

public class WechatStrategy implements PayStrategy {
    public String type() { return "wechat"; }
    public void pay(long amount) {
        System.out.println("微信支付 " + amount);
    }
}

// 3. 上下文 Context：用 Map 注册并路由，彻底消灭 if-else
public class PayService {

    private final Map<String, PayStrategy> registry = new HashMap<>();

    // 构造时把所有策略注入进来（Spring 里可直接注入 List 或 Map）
    public PayService(List<PayStrategy> strategies) {
        for (PayStrategy s : strategies) {
            registry.put(s.type(), s);
        }
    }

    public void pay(String type, long amount) {
        PayStrategy strategy = registry.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("不支持的支付方式: " + type);
        }
        strategy.pay(amount);   // 多态调用，新增支付方式无需改这里
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个支付方法里塞满了「如果是支付宝就……否则如果是微信就……」，每接入一种新渠道就要回来改这个方法，
          越改越长、越改越怕。策略模式（<em>Strategy</em>）做的事只有一句话：把这一族「可以互相替换的算法」
          各自封装成独立的类，运行时再挑一个用，从而用<strong>多态</strong>替代成片的 if-else。
        </p>
      </Lead>

      <h2>它到底解决什么问题</h2>
      <p>
        当一段逻辑会随「类型」分出很多分支，而每个分支内部又是一套相对独立的算法时，把它们写在一起就埋了三颗雷：
        方法越来越臃肿、改一个分支可能误伤别的分支、新增分支必须修改老代码（违反<em>开闭原则</em>）。
        策略模式把每个分支抽成一个类，让它们实现同一个接口，调用方只面向接口编程，至于具体用哪个，留到运行时再决定。
      </p>

      <h3>三个角色</h3>
      <ul>
        <li>
          <strong>策略接口（Strategy）</strong>：定义这一族算法的统一契约，比如<code>pay(amount)</code>。
        </li>
        <li>
          <strong>具体策略（Concrete Strategy）</strong>：接口的各个实现，一种算法一个类，比如支付宝、微信、银联各一个。
        </li>
        <li>
          <strong>上下文（Context）</strong>：持有一个策略引用，对外提供入口，把实际工作委托给当前选中的策略。
        </li>
      </ul>

      <Example title="把 if-else 改成策略">
        <p>先看一段典型的「随类型分支」的代码，它的问题不在于现在不能跑，而在于每次扩展都得动它：</p>
        <CodeBlock lang="java" title="反例：if-else 堆叠" code={ifElseCode} />
        <p>
          注意这里的坏味道：方法承担了「判断用哪种」和「具体怎么付」两件事，分支越多耦合越重。
          策略模式的思路就是把后者拆出去，让前者退化成一次简单的查表。
        </p>
      </Example>

      <Strategy />

      <KeyIdea title="如何彻底去掉 if-else：用 Map 路由">
        <p>
          很多人以为「策略模式 = 把分支拆成类」，于是写了一堆策略类，却仍在 Context 里用 if-else 决定 new 哪个，
          等于白拆。真正消灭 if-else 的关键是<strong>用 Map 把「类型」映射到「策略实例」</strong>：调用时
          <code>registry.get(type)</code> 直接拿到对象再多态调用。在 Spring 里更省事——
          把策略接口的所有实现声明为 Bean，直接注入 <code>List&lt;PayStrategy&gt;</code> 或
          <code>Map&lt;String, PayStrategy&gt;</code>，容器会自动收集，新增策略只要加一个 Bean，主流程一行不改。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别和状态模式搞混">
        <p>
          策略模式和状态模式（<em>State</em>）结构几乎一样，都是「接口 + 多个实现 + 上下文委托」，区别在<strong>意图</strong>：
          策略模式里各算法是平等、互斥的，由<strong>外部</strong>选择一个，彼此之间不会互相切换；
          状态模式里各状态有先后流转关系，是<strong>状态自己</strong>决定下一步切到哪个状态（如订单：待支付 → 已支付 → 已发货）。
          一句话：策略是「让你挑一个」，状态是「它自己会变」。
        </p>
      </Callout>

      <h2>常见应用与「面试怎么答」</h2>
      <p>
        策略模式在真实代码里随处可见：<strong>多种支付方式</strong>、<strong>多种促销规则</strong>（满减、打折、赠品）、
        <strong>不同下单渠道</strong>（App、小程序、第三方），以及最常被忽视的——
        JDK 里的 <code>Comparator</code>，给 <code>Collections.sort</code> 传不同的比较器，本质就是传入不同的排序策略。
      </p>
      <p>
        面试被问到时，建议这样组织回答：先一句话点意图（封装一族可互换的算法，运行时选择，用多态替代 if-else），
        再说三个角色，接着主动抛出加分项——「我会用 Map 或 Spring 把策略注册起来，从而连选择分支的 if-else 也一起消灭」，
        最后用「和状态模式的区别」收尾，体现你能区分相似模式。能举出 <code>Comparator</code> 这种 JDK 例子会更稳。
      </p>

      <Practice title="用 Map 注册路由实现一族支付策略">
        <p>
          自己动手写一遍：定义 <code>PayStrategy</code> 接口，给出至少两个具体策略，再在 Context 里用
          <code>Map</code> 注册并路由。重点体会：新增一种支付方式时，你只需要加一个类、注册一次，
          <code>pay</code> 方法完全不用动。
        </p>
        <CodeBlock lang="java" title="StrategyDemo.java" code={strategyCode} />
        <p>
          进阶练习：把构造里的手动注册改成 Spring 风格——给每个策略加 <code>@Component</code>，
          Context 里直接注入 <code>List&lt;PayStrategy&gt;</code> 后在构造里转成 Map，体会容器自动收集的爽快。
        </p>
      </Practice>

      <Summary
        points={[
          '策略模式：把一族可互换的算法各自封装成类，运行时选择其一，用多态替代成片的 if-else。',
          '三个角色：策略接口（统一契约）、具体策略（一种算法一个类）、上下文 Context（持有并委托给当前策略）。',
          '彻底去掉 if-else 的关键是用 Map<类型, 策略> 路由，或让 Spring 把策略注入成 List/Map 自动收集。',
          '典型应用：支付方式、促销规则、不同渠道，以及 JDK 的 Comparator 排序。',
          '与状态模式结构相同但意图不同：策略是外部挑一个且互斥，状态是自身按流转规则切换。',
          '扩展时只加新类、注册一次，主流程不改，天然符合开闭原则。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Observer from '@/courses/design-patterns/illustrations/Observer.jsx'

const observerCode = `// 观察者接口：所有关心「下单成功」的下游都实现它
public interface OrderListener {
    void onOrderPaid(String orderId);
}

// 具体观察者：各干各的，互不知道对方存在
public class SmsListener implements OrderListener {
    public void onOrderPaid(String orderId) {
        System.out.println("给用户发短信，订单 " + orderId);
    }
}

public class StockListener implements OrderListener {
    public void onOrderPaid(String orderId) {
        System.out.println("通知仓库扣减库存，订单 " + orderId);
    }
}

public class PointListener implements OrderListener {
    public void onOrderPaid(String orderId) {
        System.out.println("给用户增加积分，订单 " + orderId);
    }
}

// 主题（被观察者）：维护观察者列表，状态变化时一对多地通知
public class OrderSubject {

    private final List<OrderListener> listeners = new ArrayList<>();

    public void subscribe(OrderListener listener) {
        listeners.add(listener);
    }

    // 下单成功后调用：挨个通知，主题不关心下游具体是谁
    public void paid(String orderId) {
        for (OrderListener listener : listeners) {
            listener.onOrderPaid(orderId);
        }
    }
}

// 使用：新增一方通知只要 subscribe 一个观察者，paid 方法不用改
public class Demo {
    public static void main(String[] args) {
        OrderSubject subject = new OrderSubject();
        subject.subscribe(new SmsListener());
        subject.subscribe(new StockListener());
        subject.subscribe(new PointListener());
        subject.paid("NO-20260616-001");
    }
}`

const chainCode = `// 处理器抽象：持有下一个处理器，每个决定自己处理还是往下传
public abstract class Handler {

    protected Handler next;

    public Handler setNext(Handler next) {
        this.next = next;
        return next;   // 返回 next 便于链式拼装
    }

    public abstract void handle(Request request);

    protected void passToNext(Request request) {
        if (next != null) {
            next.handle(request);
        }
    }
}

// 具体处理器：登录校验
public class AuthHandler extends Handler {
    public void handle(Request request) {
        if (request.getToken() == null) {
            System.out.println("拦截：未登录");
            return;            // 链在这里终止，不再往下传
        }
        System.out.println("登录校验通过");
        passToNext(request);   // 交给链上的下一个
    }
}

// 具体处理器：限流
public class RateLimitHandler extends Handler {
    public void handle(Request request) {
        System.out.println("限流校验通过");
        passToNext(request);
    }
}

// 组装并使用过滤器链
public class Demo {
    public static void main(String[] args) {
        Handler auth = new AuthHandler();
        auth.setNext(new RateLimitHandler());   // auth -> rateLimit
        auth.handle(new Request("token-abc"));
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章用策略模式干掉了 if-else。这一章再打包三个高频行为型模式：
          观察者（<em>Observer</em>）让「一处变化、多方响应」自动发生；
          模板方法（<em>Template Method</em>）把「流程固定、步骤可变」固化进父类；
          责任链（<em>Chain of Responsibility</em>）让请求沿一条处理器链层层流过。
          它们在 Spring、JDK、网关里到处都是，面试里也常被串起来考。
        </p>
      </Lead>

      <h2>观察者模式：一处变化，多方响应</h2>
      <p>
        观察者模式又叫<em>发布订阅</em>，描述的是一对多的依赖：当一个对象（主题、被观察者）的状态发生变化时，
        所有依赖它的对象（观察者）都会自动收到通知。主题只持有一份观察者列表，挨个通知，
        并不关心下游具体是谁、要做什么——这就是它带来的<strong>松耦合</strong>。
      </p>
      <p>
        最典型的场景就是「下单成功通知多方」：支付完成后，要发短信、扣库存、加积分、推数据……
        如果把这些全写进支付方法，每加一个下游就要改一次核心流程；用观察者后，支付方法只负责
        「广播一条已支付事件」，谁关心谁去订阅。Spring 的事件机制（<code>ApplicationEvent</code> +
        <code>ApplicationListener</code> / <code>@EventListener</code>）和各种事件总线，本质都是观察者。
      </p>

      <Example title="下单成功通知多方">
        <p>
          想象支付完成这一刻：短信服务想发提醒、仓库想扣库存、积分服务想加分。它们彼此并不认识，
          只是都「订阅」了同一件事。主题广播一次，三方各自响应：
        </p>
        <ul>
          <li>主题（订单）只喊一句「订单 NO-001 已支付」。</li>
          <li>短信、库存、积分三个观察者各自被回调，做自己的事。</li>
        </ul>
        <p>
          以后要再加一个「通知风控」，只需写一个新的观察者并订阅，订单的支付逻辑一行都不用动。
        </p>
      </Example>

      <Observer />

      <KeyIdea title="松耦合的代价与好处">
        <p>
          观察者的精髓是<strong>主题不依赖具体观察者</strong>，只依赖统一的观察者接口，因此下游可以随意增删。
          但松耦合是把双刃剑：通知链路变成隐式的，「这条事件到底触发了什么」散落在各个订阅者里，
          排查时不如直接调用直观。所以用 Spring 事件时，建议给监听器起清晰的名字、留好日志，
          让「发布了什么、谁消费了」可追溯。
        </p>
      </KeyIdea>

      <h2>模板方法模式：流程固定，步骤可变</h2>
      <p>
        模板方法把一个算法的<strong>骨架</strong>定义在父类的一个方法里，其中固定不变的步骤直接写死，
        会变化的步骤声明成抽象方法交给子类实现；还可以留一些<em>钩子方法</em>（hook，有默认空实现），
        子类按需覆盖。这样「整体流程不变、个别步骤定制」的需求就被优雅地表达出来。
      </p>
      <p>
        JDK 和框架里全是它的身影：各种 <code>AbstractList</code>、<code>AbstractMap</code> 等
        <code>AbstractXxx</code> 把通用逻辑放在抽象类、留几个抽象方法给子类；
        <code>AQS</code>（AbstractQueuedSynchronizer）定义了加锁/释放的骨架，
        把 <code>tryAcquire</code>、<code>tryRelease</code> 留给 <code>ReentrantLock</code> 等子类实现。
        你写过的「父类定义 process()，里面调几个 doXxx() 抽象方法」就是模板方法。
      </p>

      <Callout variant="warn" title="模板方法的两个坑">
        <p>
          一是<strong>骨架方法常应设为 final</strong>，防止子类把整个流程覆盖掉，那就失去了「固定流程」的意义；
          二是别把太多步骤都做成抽象方法，否则子类要实现一大堆，复用反而变成负担——
          把真正稳定的留在父类，只把会变的下放给子类。
        </p>
      </Callout>

      <h2>责任链模式：请求沿链层层流过</h2>
      <p>
        责任链把多个处理器串成一条链，请求从链头进入，每个处理器决定<strong>自己处理掉、还是传给下一个</strong>，
        发送方不需要知道最终是谁处理的。它最适合「一串校验/拦截/加工要按顺序执行，且每段都可能中断」的场景。
        Servlet 的 <code>Filter</code> 链、Spring MVC 的拦截器（<code>HandlerInterceptor</code>）、
        Netty 的 <code>pipeline</code>、各类网关的过滤器，全是责任链。
      </p>

      <Example title="过滤器链：一个请求的层层关卡">
        <p>一个 HTTP 请求进来，要依次过几道关：</p>
        <ul>
          <li><strong>登录校验</strong>：没带 token 直接拦下，链终止。</li>
          <li><strong>限流</strong>：超过阈值就拒绝，否则放行。</li>
          <li><strong>日志/鉴权</strong>：记录后继续往后传，直到真正的业务处理器。</li>
        </ul>
        <p>
          每道关只管自己那一段，处理完调用「传给下一个」。要插一道新关卡，只需写一个处理器并接进链里，
          其余处理器毫不知情——这正是责任链的扩展力。
        </p>
      </Example>

      <h2>三者意图对比与「面试怎么答」</h2>
      <p>
        别把这三个混为一谈，它们意图各异：<strong>观察者</strong>是「一对多的通知」，强调状态变化后广播；
        <strong>模板方法</strong>是「复用流程骨架」，强调固定流程 + 可变步骤；
        <strong>责任链</strong>是「请求沿链传递」，强调多个处理器顺序处理且可中断。
        面试里若被连问，可以这样收束：观察者解耦的是「发布方与多个订阅方」，
        责任链解耦的是「请求与多个处理者」，模板方法解耦的是「不变流程与可变实现」。
        每个都配一个框架例子（Spring 事件 / AQS / Servlet Filter），回答立刻有分量。
      </p>

      <Practice title="任选其一手写：观察者 或 责任链">
        <p>
          先实现观察者：定义观察者接口，写几个具体观察者，再让主题维护列表、状态变化时一对多通知。
          重点体会主题完全不依赖具体观察者，新增一方只需 <code>subscribe</code>。
        </p>
        <CodeBlock lang="java" title="ObserverDemo.java" code={observerCode} />
        <p>
          再挑战责任链：让每个处理器持有 <code>next</code>，自己决定处理或调用
          <code>passToNext</code> 往下传，注意中途 <code>return</code> 就能让链终止。
        </p>
        <CodeBlock lang="java" title="ChainDemo.java" code={chainCode} />
      </Practice>

      <Summary
        points={[
          '观察者：发布订阅、一对多，主题状态变化时通知所有观察者，主题不依赖具体观察者，实现松耦合，如 Spring 的 ApplicationEvent 与事件总线。',
          '模板方法：父类定义算法骨架（常设 final），可变步骤做成抽象方法、可选步骤做成钩子方法交给子类，如 AQS 与各种 AbstractXxx。',
          '责任链：请求沿处理器链传递，每个处理器决定自己处理或传给下一个，可中途中断，如 Servlet Filter、拦截器、Netty pipeline、网关。',
          '三者意图不同：观察者是一对多通知，模板方法是复用流程骨架，责任链是请求顺序流过。',
          '它们都通过面向接口/抽象编程来降低耦合，让新增下游、新增关卡、新增子类时主流程不改。',
          '面试时各配一个框架例子（Spring 事件 / AQS / Servlet Filter），并点清各自解耦的是谁与谁。',
        ]}
      />
    </>
  )
}

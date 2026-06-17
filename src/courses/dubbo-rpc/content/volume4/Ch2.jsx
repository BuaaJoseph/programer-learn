import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jdkSpi = `// JDK SPI：一次性把所有实现都实例化，按名取不了
ServiceLoader<LoadBalance> loader = ServiceLoader.load(LoadBalance.class);
for (LoadBalance lb : loader) {   // 遍历，全部实例化
    // 想只要名为 random 的那一个？做不到
}
// 配置文件：META-INF/services/com.demo.LoadBalance
//   com.demo.RandomLoadBalance
//   com.demo.RoundRobinLoadBalance`

const dubboSpiUse = `// Dubbo SPI：按名按需取一个，还能自适应
ExtensionLoader<LoadBalance> loader =
        ExtensionLoader.getExtensionLoader(LoadBalance.class);

// 只加载名为 random 的实现（懒加载，用到才实例化）
LoadBalance lb = loader.getExtension("random");

// 自适应扩展：运行时按 URL 里的 loadbalance 参数动态选实现
LoadBalance adaptive = loader.getAdaptiveExtension();

// 配置文件：META-INF/dubbo/com.demo.LoadBalance
//   random=com.demo.RandomLoadBalance        <- key=value 形式
//   roundrobin=com.demo.RoundRobinLoadBalance`

const customSpi = `// 1) 接口用 @SPI 标注默认实现名
@SPI("random")
public interface LoadBalance {
    <T> Invoker<T> select(List<Invoker<T>> invokers, URL url, Invocation inv);
}

// 2) 写实现类
public class MyLoadBalance implements LoadBalance {
    public <T> Invoker<T> select(List<Invoker<T>> invokers, URL url, Invocation inv) {
        return invokers.get(0); // 仅示意
    }
}

// 3) 在 resources/META-INF/dubbo/ 下建文件，文件名=接口全限定名
//    内容： mylb=com.demo.MyLoadBalance
// 4) 使用： <dubbo:reference loadbalance="mylb" .../>`

const filterCode = `// 自定义 Filter：实现 Filter 接口，做日志/鉴权/埋点等
@Activate(group = {CommonConstants.CONSUMER, CommonConstants.PROVIDER})
public class TraceFilter implements Filter {
    public Result invoke(Invoker<?> invoker, Invocation inv) throws RpcException {
        long start = System.currentTimeMillis();
        try {
            // 调用链向下传递（责任链的核心：把 invoke 继续往下交）
            return invoker.invoke(inv);
        } finally {
            long cost = System.currentTimeMillis() - start;
            // 上报耗时 / 写日志
        }
    }
}
// 注册：META-INF/dubbo/org.apache.dubbo.rpc.Filter
//   trace=com.demo.TraceFilter`

const asyncCode = `// 异步调用：返回 CompletableFuture，不阻塞主线程
@DubboReference(async = true)   // 或方法级 methods 配置
private DemoService demoService;

public void handle() {
    // 异步发起：此处立即返回，结果还没回来
    demoService.sayHello("dubbo");
    CompletableFuture<String> future = RpcContext.getContext().getCompletableFuture();

    // 注册回调：结果回来后由框架线程触发（异步线程）
    future.whenComplete((res, ex) -> {
        if (ex == null) System.out.println("结果=" + res);
    });

    // 如果业务需要在主线程拿到结果（异步转同步）
    String r = future.get();   // 阻塞等待，把异步结果同步回主线程
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        Dubbo「什么都能换」的底气来自 SPI。面试官常常顺着 SPI 一路追下去：和 JDK SPI 有什么区别、怎么自定义扩展、
        Filter 是怎么串成责任链的、线程模型怎么分工、异步调用又怎么和主线程同步。这一章把这条「扩展性主线」讲透，
        让你既能说清机制，也能写出代码。
      </Lead>

      <h2>一、Dubbo SPI 是什么，与 Java SPI 的区别</h2>
      <h3>面试题：Dubbo SPI 和 JDK SPI 有什么区别？</h3>
      <p>
        SPI（Service Provider Interface）是「接口与实现解耦、靠配置文件加载实现」的一种机制。JDK 自带 SPI，但 Dubbo 嫌它不够用，
        自己实现了一套增强版 <code>ExtensionLoader</code>。
      </p>
      <CodeBlock lang="java" title="JDK SPI 的用法与局限" code={jdkSpi} />
      <CodeBlock lang="java" title="Dubbo SPI 的用法" code={dubboSpiUse} />
      <table>
        <thead>
          <tr><th>维度</th><th>JDK SPI</th><th>Dubbo SPI</th></tr>
        </thead>
        <tbody>
          <tr><td>加载方式</td><td>一次性实例化全部实现</td><td>懒加载，按名字只取需要的那个</td></tr>
          <tr><td>配置格式</td><td>纯类名列表</td><td><code>key=实现类</code>，可按名引用</td></tr>
          <tr><td>依赖注入（IoC）</td><td>无</td><td>有，扩展点能自动注入其依赖的扩展</td></tr>
          <tr><td>包装增强（AOP）</td><td>无</td><td>有 Wrapper 机制，可层层包装做切面</td></tr>
          <tr><td>自适应</td><td>无</td><td>有 @Adaptive，运行时按 URL 参数选实现</td></tr>
          <tr><td>自动激活</td><td>无</td><td>有 @Activate，按条件批量激活（如 Filter 链）</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        一句话概括：Dubbo SPI 在 JDK SPI 的基础上，多了<strong>按名加载、IoC、AOP、自适应、自动激活</strong>五样东西。
        正是这五样让 Dubbo 的几乎每个组件都能被替换、被增强、被运行时动态选择。
      </KeyIdea>

      <h2>二、如何自定义一个 SPI 扩展</h2>
      <h3>面试题：让你自定义一个负载均衡扩展，怎么做？</h3>
      <p>
        步骤很固定，记住四步：定接口（带 <code>@SPI</code>）→ 写实现 → 在 <code>META-INF/dubbo/</code> 下放配置文件（文件名是接口全限定名，内容是 <code>key=实现类</code>）→ 配置里用这个 key 引用。
      </p>
      <CodeBlock lang="java" title="自定义负载均衡扩展四步" code={customSpi} />
      <Callout variant="note" title="三个目录优先级">
        Dubbo 会从三个目录加载扩展配置：<code>META-INF/services/</code>（兼容 JDK 写法）、<code>META-INF/dubbo/</code>（用户自定义）、
        <code>META-INF/dubbo/internal/</code>（框架内置）。用户扩展放第二个即可。同名 key 会按目录优先级覆盖，自定义可以覆盖内置默认。
      </Callout>

      <h2>三、自适应扩展（@Adaptive）</h2>
      <h3>面试题：什么是自适应扩展？它解决什么问题？</h3>
      <p>
        问题背景：很多扩展点要到<strong>运行时</strong>才知道该用哪个实现。比如负载均衡，到底用 random 还是 roundrobin，
        取决于消费者发起调用时 URL 里的 <code>loadbalance</code> 参数，而这个参数在框架启动时还不确定。
      </p>
      <p>
        自适应扩展的做法是：Dubbo 为带 <code>@Adaptive</code> 的扩展点<strong>动态生成一个代理类</strong>，
        这个代理类在被调用时，从入参（通常是 <code>URL</code> 或 <code>Invocation</code> 里的 URL）中读出指定的参数值，
        再用这个值去 <code>getExtension(name)</code> 拿到真正的实现并转调。等于把「选哪个实现」这件事推迟到了每次调用时。
      </p>
      <Example title="为什么需要延迟决策">
        <p>
          同一个消费者，可能对 A 服务用 random、对 B 服务用 consistenthash。如果在启动时就把实现写死，就做不到这种「按调用动态切换」。
          自适应扩展让一个统一入口在运行时根据 URL 参数分发到不同实现，这就是它的价值。
        </p>
      </Example>

      <h2>四、Filter 机制：责任链</h2>
      <h3>面试题：Dubbo 的 Filter 是怎么工作的？</h3>
      <p>
        Filter 是 Dubbo 的<strong>责任链</strong>切面机制，调用真正发出前后都会穿过一串 Filter。监控统计、超时、鉴权、
        日志埋点、限流，很多功能都是以 Filter 形式实现的。它靠 <code>@Activate</code> 注解按 group（consumer/provider）自动激活并排序。
      </p>
      <CodeBlock lang="java" title="自定义一个 Filter 并注册" code={filterCode} />
      <p>
        责任链的精髓在那一句 <code>{'invoker.invoke(inv)'}</code>：每个 Filter 在调用它之前可以做「前置处理」，之后可以做「后置处理」，
        中间这一句把控制权交给链上的下一个节点。这和 Servlet 的 <code>Filter</code>、Spring 的拦截器是同一套思想。
        想加一段「所有调用都生效」的横切逻辑，写个 Filter 是最干净的方式。
      </p>

      <h2>五、线程模型</h2>
      <h3>面试题：Dubbo 的线程模型是怎样的？为什么要把请求派发到业务线程池？</h3>
      <p>
        底层用 Netty，有一组 <strong>IO 线程（EventLoop / Worker）</strong>负责网络读写与编解码。关键设计是：
        IO 线程<strong>绝不能</strong>被业务逻辑阻塞，否则一个慢请求会拖垮整条连接上的所有请求。
        所以 Dubbo 提供了「派发策略（Dispatcher）」，决定哪些活留给 IO 线程、哪些派发到独立的<strong>业务线程池</strong>。
      </p>
      <table>
        <thead>
          <tr><th>派发策略</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>all（默认）</td><td>所有消息都派发到业务线程池（连接、断开、请求、响应、心跳）</td></tr>
          <tr><td>direct</td><td>都在 IO 线程上直接处理，不派发（适合极轻量逻辑）</td></tr>
          <tr><td>message</td><td>只有请求响应派发到业务线程池，其余在 IO 线程</td></tr>
          <tr><td>execution</td><td>只有请求派发，响应等在 IO 线程</td></tr>
          <tr><td>connection</td><td>连接事件排队逐个执行，请求响应派发</td></tr>
        </tbody>
      </table>
      <p>
        业务线程池本身也可选：<code>fixed</code>（固定大小，默认 200）、<code>cached</code>、<code>limited</code>、<code>eager</code>。
        默认 fixed 是为了避免线程数无限膨胀。线程池满了会怎样？这是常见追问——默认会抛出异常并打印线程栈，提示你扩容或排查慢调用。
      </p>
      <Callout variant="tip" title="一句话记忆">
        IO 线程管「收发」，业务线程池管「干活」。把二者分开，是为了不让慢业务阻塞网络收发。线程池调优本质就是在「并发吞吐」和「资源占用」之间找平衡。
      </Callout>

      <h2>六、如何支持异步调用，异步又如何与主线程同步</h2>
      <h3>面试题：Dubbo 怎么做异步调用？结果怎么回到主线程？</h3>
      <p>
        Dubbo 2.7 之后用 <code>CompletableFuture</code> 统一了异步模型。异步调用时，发起后<strong>立即返回</strong>，
        不阻塞当前线程，真正的结果通过 future 在响应回来时再交付。
      </p>
      <CodeBlock lang="java" title="异步调用与异步转同步" code={asyncCode} />
      <p>
        理解两个方向：
      </p>
      <ul>
        <li><strong>异步处理结果</strong>：用 <code>{'future.whenComplete(...)'}</code> 注册回调，结果回来后由框架的异步线程触发回调。整个过程主线程不阻塞，吞吐高。</li>
        <li><strong>异步转同步（回到主线程）</strong>：如果业务确实需要在当前线程拿到结果，调用 <code>{'future.get()'}</code> 阻塞等待。这就是「异步如何与主线程同步」的答案——用 future 的阻塞获取把异步结果拉回当前线程。</li>
      </ul>
      <p>
        底层原理：每个请求带唯一 ID，消费者发出后把对应的 future 存进一个「ID → future」的映射表，主线程不等结果直接返回；
        当响应字节回来、由 IO 线程解出请求 ID，框架找到对应 future 并 <code>complete(结果)</code>，于是回调被触发或 <code>get()</code> 被唤醒。

        同步调用其实就是「异步调用 + 立刻 get 阻塞」的特例。
      </p>

      <h2>七、延迟加载（Lazy Loading）</h2>
      <h3>面试题：Dubbo 里有哪些「懒加载」体现？</h3>
      <p>
        「延迟加载」在 Dubbo 里有几层含义，面试时要分清：
      </p>
      <ul>
        <li><strong>SPI 扩展懒加载</strong>：<code>ExtensionLoader.getExtension(name)</code> 只在用到某个扩展时才实例化它，而不是启动就全部加载——这是相对 JDK SPI 的一大优势。</li>
        <li><strong>延迟连接（lazy connect）</strong>：消费者可配置 <code>lazy=true</code>，让 TCP 连接<strong>推迟到第一次真正调用时</strong>才建立，而不是引用初始化时就建连，能加快启动、减少空闲连接。</li>
        <li><strong>延迟暴露（delay）</strong>：提供者可配 <code>delay</code>，延迟一段时间或等 Spring 容器刷新完再注册服务，避免「服务还没初始化好就被调用」。</li>
      </ul>
      <Callout variant="warn" title="别把三者混为一谈">
        面试被问「延迟加载」时，先反问/澄清是指哪一层：扩展懒加载是机制层面、lazy connect 是连接层面、delay 是服务暴露时机层面。
        分清楚才显得你真的理解，而不是背了个名词。
      </Callout>

      <Summary
        points={[
          'Dubbo SPI 相比 JDK SPI 多了五样：按名加载、IoC 依赖注入、AOP 包装、@Adaptive 自适应、@Activate 自动激活。',
          '自定义扩展四步：接口加 @SPI → 写实现 → META-INF/dubbo/ 放 key=类 的配置 → 配置中按 key 引用。',
          '自适应扩展为带 @Adaptive 的扩展点动态生成代理类，运行时按 URL 参数选实现，把「选哪个」推迟到每次调用。',
          'Filter 是责任链切面，靠 @Activate 按 group 激活；invoker.invoke(inv) 一句把控制权交给下一节点，前后可做横切逻辑。',
          '线程模型：IO 线程负责收发不可阻塞，请求派发到业务线程池干活；Dispatcher 选派发策略，线程池默认 fixed=200。',
          '异步用 CompletableFuture：whenComplete 回调不阻塞、future.get() 异步转同步回主线程；同步是异步+立即 get 的特例。',
          '延迟加载分三层：SPI 扩展懒实例化、lazy connect 首调才建连、delay 延迟暴露服务，回答时要先澄清指哪一层。',
        ]}
      />
    </article>
  )
}

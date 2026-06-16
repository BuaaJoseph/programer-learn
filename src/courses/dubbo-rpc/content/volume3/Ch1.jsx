import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jdkSpiCode = `// JDK 原生 SPI 用法
// 1. 接口
public interface Logger {
    void log(String msg);
}

// 2. 配置文件放在 META-INF/services/com.demo.Logger
//    文件内容（每行一个实现类全限定名）：
//    com.demo.ConsoleLogger
//    com.demo.FileLogger

// 3. 加载：一次性把所有实现全部实例化
ServiceLoader<Logger> loader = ServiceLoader.load(Logger.class);
for (Logger logger : loader) {     // 遍历时才知道有哪些实现
    logger.log("hello");           // 想按名字只取一个？做不到
}`

const dubboSpiUseCode = `// Dubbo SPI：按名字按需取一个实现
ExtensionLoader<LoadBalance> loader =
        ExtensionLoader.getExtensionLoader(LoadBalance.class);

// 只加载并实例化名为 random 的那一个实现
LoadBalance lb = loader.getExtension("random");

// 自适应扩展：运行时根据 URL 参数里的 loadbalance 值动态选实现
LoadBalance adaptive = loader.getAdaptiveExtension();`

const customSpiCode = `// 1. 接口，用 @SPI 标记并指定默认实现名
package com.demo.lb;

import org.apache.dubbo.common.extension.SPI;
import org.apache.dubbo.common.URL;

@SPI("roundrobin")
public interface MyLoadBalance {
    String select(URL url);
}

// 2. 一个实现
package com.demo.lb;

import org.apache.dubbo.common.URL;

public class RoundRobinLoadBalance implements MyLoadBalance {
    public String select(URL url) {
        return "round-robin pick";
    }
}

// 3. 配置文件：META-INF/dubbo/com.demo.lb.MyLoadBalance
//    内容（key=实现类全限定名）：
//    roundrobin=com.demo.lb.RoundRobinLoadBalance

// 4. 使用
MyLoadBalance lb = ExtensionLoader
        .getExtensionLoader(MyLoadBalance.class)
        .getExtension("roundrobin");`

const adaptiveCode = `// @Adaptive：Dubbo 在运行时根据 URL 参数动态选实现
// 接口上的方法标注 @Adaptive，Dubbo 会「字节码生成」一个自适应代理类

@SPI("random")
public interface LoadBalance {
    // 括号里是 URL 里用来决定实现名的 key；
    // 取不到就回退到 @SPI 指定的默认值 random
    @Adaptive("loadbalance")
    <T> Invoker<T> select(List<Invoker<T>> invokers, URL url, Invocation inv);
}

// Dubbo 自动生成的代理类，逻辑等价于：
class LoadBalance$Adaptive implements LoadBalance {
    public Invoker select(List invokers, URL url, Invocation inv) {
        // 运行时从 URL 里读 loadbalance 参数，没有就用默认 random
        String name = url.getParameter("loadbalance", "random");
        // 再按 name 去 ExtensionLoader 取真正的实现，转调过去
        LoadBalance real = ExtensionLoader
                .getExtensionLoader(LoadBalance.class).getExtension(name);
        return real.select(invokers, url, inv);
    }
}
// 妙处：实现的选择从「编译期写死」推迟到「每次调用按 URL 决定」`

const wrapperCode = `// Wrapper（AOP）：构造函数接收本接口类型 = 自动成为包装层
public class ProtocolFilterWrapper implements Protocol {
    private final Protocol protocol;
    // 关键：构造器参数是 Protocol 自己 -> Dubbo 认出它是 Wrapper
    public ProtocolFilterWrapper(Protocol protocol) {
        this.protocol = protocol;
    }
    @Override
    public <T> Exporter<T> export(Invoker<T> invoker) {
        // 在真正 export 前后织入逻辑（这里是构建 Filter 链）
        return protocol.export(buildInvokerChain(invoker));
    }
}
// 多个 Wrapper 会层层嵌套：监听器Wrapper -> Filter Wrapper -> 真实实现
// 这就是 Dubbo 不依赖 Spring AOP 也能做横切逻辑的奥秘`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          Dubbo 几乎是「一切皆可替换」的：协议、序列化、负载均衡、集群容错、注册中心，背后都是同一套机制在撑——
          <em>Dubbo SPI</em>。它把 Java 原生的 SPI 重写了一遍，补上了「按需加载、依赖注入、运行时选实现」这几样原生 SPI 缺的能力。
          看懂它，你就看懂了 Dubbo 的「骨架」。
        </p>
      </Lead>

      <h2>先看 Java 原生 SPI 差在哪</h2>
      <p>
        SPI 的全称是 <em>Service Provider Interface</em>，思路是「接口和实现分离，实现由配置文件声明，运行时再发现」。
        JDK 自带的 <code>ServiceLoader</code> 就是它的标准实现：你把实现类的全限定名写进
        <code>META-INF/services/接口全名</code> 这个文件，运行时用 <code>ServiceLoader.load</code> 就能拿到所有实现。
      </p>
      <CodeBlock lang="java" title="JDK 原生 SPI" code={jdkSpiCode} />
      <p>
        看起来很美，但放到框架里就捉襟见肘了，主要有三个硬伤：
      </p>
      <ul>
        <li>
          <strong>一次性加载全部实现</strong>——<code>ServiceLoader</code> 遍历时会把配置里写的每一个实现类都实例化。
          哪怕你这次只想用其中一个，其余的也都被 new 出来了，浪费资源、还可能触发不该有的初始化。
        </li>
        <li>
          <strong>不能按名字按需取</strong>——它只给你一个「迭代器」，想精确拿到「名叫 random 的那个实现」，
          原生 SPI 没有这个概念，你只能自己遍历再比对，很别扭。
        </li>
        <li>
          <strong>没有依赖注入</strong>——一个扩展实现往往要用到别的扩展（比如负载均衡要用到协议），
          原生 SPI 实例化出来就是个「裸对象」，它的依赖得你自己手动塞，框架完全帮不上忙。
        </li>
      </ul>

      <h2>Dubbo SPI 的五项增强</h2>
      <p>
        Dubbo 没有用 <code>ServiceLoader</code>，而是自己写了一个 <code>ExtensionLoader</code>，并把配置文件挪到了
        <code>META-INF/dubbo/</code> 目录下，格式也从「每行一个类名」升级成「<code>key=实现类全限定名</code>」——
        有了 key，就能按名字精确取了。在这之上叠了五项关键能力：
      </p>
      <ul>
        <li>
          <strong>按 name 按需加载</strong>——<code>getExtension("random")</code> 只实例化你点名的那一个，用谁加载谁。
        </li>
        <li>
          <strong>IOC 依赖注入</strong>——扩展实例如果有 setter 依赖别的扩展，Dubbo 会自动把依赖注入进去（自己的一套小 IOC）。
        </li>
        <li>
          <strong>AOP 包装（Wrapper）</strong>——如果某个实现类的构造函数刚好接收本接口类型，Dubbo 把它当作
          <em>Wrapper</em>，自动用它把真正的实现层层包起来，用来做日志、监控等横切逻辑，相当于 AOP。
        </li>
        <li>
          <strong>自适应扩展 @Adaptive</strong>——用 <code>getAdaptiveExtension()</code> 拿到一个「代理」，
          它在<strong>运行时</strong>根据传入 URL 里的参数值，动态决定该路由到哪个实现，而不是写死在编译期。
        </li>
        <li>
          <strong>自动激活 @Activate</strong>——给实现打上 <code>@Activate</code>，在符合条件时（比如某个分组、某个 URL 参数存在）
          它会被自动加进生效列表，典型用在 <em>Filter</em> 链上。
        </li>
      </ul>
      <CodeBlock lang="java" title="Dubbo SPI 的取用方式" code={dubboSpiUseCode} />

      <h2>@Adaptive 自适应扩展：把选择推迟到运行时</h2>
      <p>
        五项增强里最烧脑、也最被面试官追问的是 <strong>@Adaptive</strong>。普通的 <code>getExtension("random")</code>
        是<strong>编译期就写死了名字</strong>，可问题是：负载均衡用哪个，是消费端在配置里指定、甚至能动态下发改的，
        编译时根本不知道。@Adaptive 就是为此而生——Dubbo 在运行期<strong>字节码生成</strong>一个自适应代理类，
        每次调用时从传入的 <code>URL</code> 参数里读出该用哪个实现，再转发过去：
      </p>
      <CodeBlock lang="java" title="@Adaptive 自适应扩展的原理" code={adaptiveCode} />
      <p>
        看懂这段就明白了：为什么 Dubbo 里到处传一个 <code>URL</code> 对象。<strong>URL 是 Dubbo 的「配置总线」</strong>，
        几乎所有参数（协议、序列化、负载均衡、超时、重试……）都塞在这个 URL 里，@Adaptive 代理就是靠读它来动态路由实现的。

      </p>

      <h2>Wrapper：Dubbo 自己的 AOP</h2>
      <p>
        另一个精妙设计是 <strong>Wrapper（包装类）</strong>。规则很简单：如果一个实现类的<strong>构造函数恰好接收本接口类型</strong>，
        Dubbo 就认定它是 Wrapper，不把它当普通实现，而是用它去<strong>层层包裹</strong>真正的实现。
        这就实现了「不改实现代码就织入横切逻辑」——日志、监控、Filter 链构建全靠它，等于 Dubbo 自带的轻量 AOP：
      </p>
      <CodeBlock lang="java" title="Wrapper 实现 AOP 包装" code={wrapperCode} />
      <Callout variant="note" title="为什么不用 Spring AOP">
        <p>
          Dubbo 设计上要能<strong>脱离 Spring 独立运行</strong>（早期很多场景是纯 API/XML 用法），所以它不能依赖 Spring 的 IOC/AOP，
          只能自己造一套小而精的「IOC（setter 注入）+ AOP（Wrapper）」。理解这点，就能理解 Dubbo SPI 为什么要重复造轮子——
          它要的是一个<strong>零外部依赖、可独立工作</strong>的扩展内核。
        </p>
      </Callout>

      <Example title="自定义一个 LoadBalance 扩展是什么体验">
        <p>
          假设你嫌内置的几种负载均衡都不合口味，想加一个自己的策略。在 Dubbo 里这事儿非常顺：
        </p>
        <ul>
          <li>写一个类实现 <code>LoadBalance</code> 接口；</li>
          <li>在 <code>META-INF/dubbo/org.apache.dubbo.rpc.cluster.LoadBalance</code> 里加一行 <code>mylb=你的实现类</code>；</li>
          <li>消费端配置 <code>loadbalance="mylb"</code>。</li>
        </ul>
        <p>
          就这样，你的策略就接管了选址逻辑——你<strong>没有改 Dubbo 一行源码</strong>，全靠 SPI 的「按 name 装配」。
          这就是「一切皆可替换」的实感：内置实现和你写的实现，在 Dubbo 眼里地位完全平等。
        </p>
      </Example>

      <KeyIdea title="SPI 是 Dubbo 的「插线板」">
        <p>
          把 Dubbo 想成一块插线板，每个孔位（协议、序列化、负载均衡、集群、注册中心……）都是一个 <code>@SPI</code> 接口。
          官方给了一批默认插头，你也可以自己做一个插头插进去。<strong>框架本身只面向接口编程</strong>，
          具体用哪个实现，推迟到配置和运行时才决定——这正是它扩展性极强的根本原因。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="几个容易踩的点">
        <p>自定义扩展时，这几处最常出错：</p>
        <ul>
          <li>配置文件路径必须是 <code>META-INF/dubbo/接口全限定名</code>，文件名就是接口的全名，<strong>别写错一个字母</strong>。</li>
          <li>文件内容是 <code>name=实现类全限定名</code>，等号左边的 name 才是你 <code>getExtension</code> 时要用的名字。</li>
          <li>接口上要打 <code>@SPI</code>，否则 <code>ExtensionLoader</code> 直接拒绝加载它。</li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「Dubbo SPI 和 JDK SPI 的区别」，别只背概念，按这个层次答：先说 JDK SPI 的三个局限
        （全量加载、不能按名取、无注入），再说 Dubbo 用 <code>ExtensionLoader</code> 加 <code>key=class</code> 配置补齐了
        按需加载和按名取，最后点出三个高级特性——<strong>IOC 注入、AOP 包装、@Adaptive 自适应</strong>，
        顺带提一句 <code>@Activate</code> 用于 Filter 自动激活。能把「为什么 Dubbo 不直接用 ServiceLoader」讲清楚，这题就稳了。
      </p>

      <Callout variant="warn" title="SPI 的高频追问与误区">
        <ul>
          <li><strong>「@Adaptive 是怎么实现的？」</strong>运行期动态生成一个自适应类的字节码，方法体里从 URL 读参数决定调哪个实现。不是反射、不是预生成，是现编现编译。</li>
          <li><strong>「ExtensionLoader 是单例吗？」</strong>每个扩展接口对应一个 ExtensionLoader，全局缓存；每个扩展实现默认也是单例缓存的（同名只 new 一次）。</li>
          <li><strong>「Wrapper 和普通实现怎么区分？」</strong>看构造函数：有一个接收本接口类型的构造器就是 Wrapper，否则是普通实现。</li>
          <li><strong>误区「Dubbo SPI 就是 JDK SPI 加个 key」</strong>：还差着 IOC 注入、Wrapper AOP、@Adaptive、@Activate 四样，不是简单加个 key。</li>
          <li><strong>配置文件坑</strong>：文件名必须是接口全限定名、放 <code>META-INF/dubbo/</code>（或 internal/services 子目录），写错或漏 <code>@SPI</code> 都会加载不到。</li>
        </ul>
      </Callout>

      <Practice title="写一个最小的自定义 SPI 扩展">
        <p>
          目标：定义一个 <code>MyLoadBalance</code> 接口，用 <code>@SPI</code> 标默认实现，写一个实现类，配上配置文件，再取出来用。
          跑通它，你就完整走了一遍 Dubbo 扩展的装配流程。
        </p>
        <CodeBlock lang="java" title="MyLoadBalance 扩展" code={customSpiCode} />
        <p>
          做完后可以再加一个实现（比如 <code>random=...</code>），观察 <code>getExtension("random")</code> 和
          <code>getExtension("roundrobin")</code> 各自只实例化自己点名的那一个——亲手验证「按 name 按需加载」。
        </p>
      </Practice>

      <Summary
        points={[
          'SPI 是「接口与实现分离、运行时按配置发现实现」的机制，JDK 用 ServiceLoader 实现。',
          'JDK 原生 SPI 三大局限：一次性加载全部实现、不能按 name 按需取、没有依赖注入。',
          'Dubbo 自研 ExtensionLoader，配置放在 META-INF/dubbo/ 下，格式为 name=实现类，支持按名按需加载。',
          'Dubbo SPI 五项增强：按 name 加载、IOC 依赖注入、AOP 包装（Wrapper）、@Adaptive 自适应扩展、@Activate 自动激活。',
          '协议、序列化、负载均衡、集群、注册中心等几乎所有组件都通过 SPI 可替换，自定义扩展无需改源码。',
          '自定义扩展三步走：接口打 @SPI、写实现类、在 META-INF/dubbo/ 配 name=class，即可被按名装配。',
        ]}
      />
    </>
  )
}

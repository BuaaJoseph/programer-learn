import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const jdkProxySnippet = `import java.lang.reflect.*;

interface Service { void work(); }
class RealService implements Service {
    public void work() { System.out.println("干活"); }
}

// JDK 动态代理：基于接口，运行时生成实现该接口的代理类
Service proxy = (Service) Proxy.newProxyInstance(
    Service.class.getClassLoader(),
    new Class[]{ Service.class },           // 必须有接口
    (Object p, Method m, Object[] args) -> {
        System.out.println("前置：开始计时");
        Object r = m.invoke(new RealService(), args);  // 反射调真实方法
        System.out.println("后置：结束计时");
        return r;
    }
);
proxy.work();   // 触发 InvocationHandler.invoke`

const cglibSnippet = `// CGLIB：通过生成「目标类的子类」来代理，不要求接口
// （概念示意，需引入 cglib 依赖）
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(RealService.class);          // 代理的是子类
enhancer.setCallback((MethodInterceptor)
    (obj, method, args, proxy) -> {
        System.out.println("前置");
        Object r = proxy.invokeSuper(obj, args);    // 调父类（目标）方法
        System.out.println("后置");
        return r;
    });
RealService s = (RealService) enhancer.create();
s.work();`

const spiSnippet = `// SPI：面向接口，运行时从 classpath 加载实现
// 1) 定义接口
public interface Codec { String name(); }

// 2) 实现方在 jar 的 META-INF/services/ 下放一个文件：
//    文件名 = 接口全限定名：com.demo.Codec
//    文件内容 = 实现类全限定名（每行一个）：com.demo.JsonCodec

// 3) 使用方用 ServiceLoader 加载所有实现
ServiceLoader<Codec> loader = ServiceLoader.load(Codec.class);
for (Codec c : loader) {
    System.out.println(c.name());   // 自动发现并实例化所有已注册实现
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        动态代理是 Spring AOP、RPC 框架的核心技术，SPI 则是 JDBC 驱动、日志门面等「插拔式扩展」的底层机制。
        本章讲清动态代理的原理与用途、JDK 动态代理与 CGLIB 的差异与取舍，
        以及 Java SPI 如何实现「面向接口编程、运行时加载实现」。
      </Lead>

      <h2>一、动态代理</h2>
      <KeyIdea>
        代理（Proxy）就是给目标对象套一层「壳」，调用先经过壳，壳里可以加额外逻辑（日志、事务、权限）再转发给目标。
        <strong>动态代理</strong>是在<strong>运行时</strong>动态生成这个壳类，而不用手写——这正是 AOP「无侵入地给方法加横切逻辑」的基础。
      </KeyIdea>

      <h3>面试题 1：什么是动态代理，有什么用？</h3>
      <p>
        静态代理要为每个被代理类手写一个代理类，类一多就爆炸。动态代理在运行时根据接口/类<strong>自动生成</strong>代理对象，
        把「调用前后做什么」集中到一个处理器里。典型用途：
      </p>
      <ul>
        <li><strong>AOP</strong>：Spring 用动态代理给方法织入事务、日志、缓存、权限等横切逻辑。</li>
        <li><strong>RPC</strong>：客户端拿到的「远程服务接口」其实是代理，调用时被转成网络请求。</li>
        <li><strong>Mock / 拦截</strong>：测试框架生成 mock 对象，拦截方法返回预设值。</li>
      </ul>
      <CodeBlock lang="java" title="JDK 动态代理" code={jdkProxySnippet} />

      <h3>面试题 2：JDK 动态代理和 CGLIB 有什么区别？</h3>
      <p>
        这是必考对比题。核心差异在<strong>实现方式</strong>：JDK 动态代理基于<strong>接口</strong>，
        运行时生成一个实现目标接口的代理类；CGLIB 基于<strong>继承</strong>，运行时生成目标类的<strong>子类</strong>来代理。
      </p>
      <CodeBlock lang="java" title="CGLIB 代理（示意）" code={cglibSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>JDK 动态代理</th><th>CGLIB</th></tr>
        </thead>
        <tbody>
          <tr><td>实现原理</td><td>实现目标接口，生成代理类</td><td>生成目标类的子类（字节码增强）</td></tr>
          <tr><td>前提</td><td>目标必须有接口</td><td>不要求接口，但目标类/方法不能是 final</td></tr>
          <tr><td>依赖</td><td>JDK 内置（<code>java.lang.reflect.Proxy</code>）</td><td>需引入 CGLIB / ASM</td></tr>
          <tr><td>核心 API</td><td><code>Proxy</code> + <code>InvocationHandler</code></td><td><code>Enhancer</code> + <code>MethodInterceptor</code></td></tr>
          <tr><td>限制</td><td>只能代理接口方法</td><td>不能代理 final 类/方法</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="Spring 怎么选？">
        Spring AOP 的默认策略：目标类<strong>实现了接口</strong>就用 JDK 动态代理，<strong>没有接口</strong>
        就用 CGLIB（也可强制全用 CGLIB）。Spring Boot 2.x 起默认改为 CGLIB，以减少「注入了接口却拿不到具体类」的困惑。
        这是个高频追问点。
      </Callout>
      <Callout variant="warn" title="易错点：CGLIB 不能代理 final">
        因为 CGLIB 靠生成子类、重写方法来增强，所以 <code>final</code> 类不能被继承代理、<code>final</code>/
        <code>private</code>/<code>static</code> 方法不能被重写代理。这也解释了为什么有些方法上的注解（如自调用的 @Transactional）会「不生效」。
      </Callout>

      <h2>二、SPI 机制</h2>
      <h3>面试题 3：什么是 SPI，它解决什么问题？</h3>
      <KeyIdea>
        SPI（Service Provider Interface）是 Java 的<strong>服务发现机制</strong>：调用方只面向接口编程，
        具体实现由第三方在<strong>运行时</strong>通过约定的配置文件「插」进来，用 <code>ServiceLoader</code> 加载。
        它实现了「<strong>调用方与实现方解耦</strong>」——加新实现不用改调用方代码，只要丢个 jar 进 classpath。
      </KeyIdea>
      <p>
        它解决的是「<strong>面向接口编程，但实现可插拔</strong>」的问题。最经典的例子是 JDBC：
        <code>java.sql.Driver</code> 是接口，MySQL、PostgreSQL 各自提供实现 jar，
        程序无需写死用哪个驱动，运行时按 classpath 里有哪个 SPI 实现自动加载。
      </p>
      <CodeBlock lang="java" title="SPI 的三步约定" code={spiSnippet} />
      <table>
        <thead>
          <tr><th>角色</th><th>做什么</th></tr>
        </thead>
        <tbody>
          <tr><td>接口定义方</td><td>定义服务接口（如 <code>Driver</code>）</td></tr>
          <tr><td>实现提供方</td><td>实现接口，并在 <code>META-INF/services/接口全限定名</code> 文件里登记实现类</td></tr>
          <tr><td>使用方</td><td>用 <code>ServiceLoader.load(接口.class)</code> 加载全部实现</td></tr>
        </tbody>
      </table>
      <Example title="SPI 与 API 的区别">
        <p>
          普通 API 是「<strong>实现方定接口、调用方调用</strong>」，控制反转方向朝下；
          SPI 是「<strong>调用方定接口、实现方填实现</strong>」，控制反转方向朝上。
          换句话说，SPI 把「选哪个实现」的决定权从代码里挪到了 classpath/配置里，
          这正是它能做「插件化、可扩展」的根源。Dubbo、日志门面（SLF4J 绑定具体日志库）都用了类似思想。
        </p>
      </Example>
      <Callout variant="warn" title="原生 SPI 的局限">
        JDK 原生 <code>ServiceLoader</code> 会<strong>一次性加载并实例化所有</strong>实现（即使你只想用一个），
        且不支持按名称获取、不支持依赖注入。所以 Dubbo、Spring 等都实现了自己增强版的 SPI
        （支持懒加载、按 key 取、自适应扩展）。面试能点出「原生 SPI 不够用、所以框架自造」会很加分。
      </Callout>

      <h3>面试题 4：静态代理、动态代理、装饰器模式有什么区别？</h3>
      <p>
        这三者长得像（都是「套一层」），但意图不同，面试容易被一起问：
      </p>
      <table>
        <thead>
          <tr><th>方式</th><th>生成时机</th><th>意图</th></tr>
        </thead>
        <tbody>
          <tr><td>静态代理</td><td>编译期手写代理类</td><td>为特定类加固定的增强，类一多就爆炸</td></tr>
          <tr><td>动态代理</td><td>运行时自动生成</td><td>统一为一批类/方法织入横切逻辑（AOP）</td></tr>
          <tr><td>装饰器模式</td><td>编译期手写，运行时层叠</td><td>动态地给对象叠加新功能（如 IO 流）</td></tr>
        </tbody>
      </table>
      <p>
        代理强调「<strong>控制访问 + 增强</strong>」（调用前后做事、甚至决定要不要真正调用目标）；
        装饰器强调「<strong>功能扩展</strong>」（在不改原类的前提下叠加能力）。
        动态代理是代理模式的「运行时自动化」版本，省去了静态代理为每个类手写壳的重复劳动。
      </p>
      <Example title="为什么 Spring 用动态代理而不是静态代理做 AOP？">
        <p>
          如果用静态代理，每个要被增强的业务类都得手写一个代理类，几百个 Service 就要几百个代理类，无法维护。
          动态代理在运行时根据接口/类<strong>批量生成</strong>代理，所有横切逻辑收敛到一个 <code>InvocationHandler</code>/
          <code>MethodInterceptor</code> 里，一处定义、处处生效。这正是 AOP「无侵入、可复用」的根本，
          也是「为什么必须用动态代理」的答案。
        </p>
      </Example>
      <Callout variant="tip" title="串起本卷：反射是这一切的底座">
        回头看会发现：动态代理在 <code>invoke</code> 里用反射调真实方法，SPI 用反射实例化实现类，
        而上一章的注解也靠反射读取。<strong>反射是 Java 框架级能力的共同底座</strong>——
        把反射、注解、动态代理、SPI 串成一条线理解，你就能看懂绝大多数框架的「魔法」从何而来。
      </Callout>

      <Summary
        points={[
          '动态代理在运行时自动生成代理「壳」，把调用前后的横切逻辑集中处理，是 Spring AOP、RPC、Mock 的基础。',
          'JDK 动态代理基于接口（Proxy + InvocationHandler），要求目标有接口；CGLIB 基于生成子类（Enhancer + MethodInterceptor），不要求接口但不能代理 final。',
          'Spring AOP：有接口默认用 JDK 代理、无接口用 CGLIB；Spring Boot 2.x 起默认 CGLIB。CGLIB 靠子类增强，故 final/private/static 方法和自调用注解可能失效。',
          'SPI 是 Java 服务发现机制：调用方面向接口、实现方通过 META-INF/services 登记，ServiceLoader 运行时加载，实现调用方与实现方解耦。',
          'API 是实现方定接口被调用，SPI 是调用方定接口由实现方填充，把「选哪个实现」的决定权挪到 classpath/配置，支撑插件化。',
          '原生 ServiceLoader 一次性加载全部实现、不支持按名取与注入，故 Dubbo/Spring 自造增强版 SPI。',
        ]}
      />
    </article>
  )
}

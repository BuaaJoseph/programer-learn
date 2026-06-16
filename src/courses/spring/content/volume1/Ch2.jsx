import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import BeanLifecycle from '@/courses/spring/illustrations/BeanLifecycle.jsx'

const postConstructCode = `@Component
public class CacheLoader {

    @Autowired
    private DataSource dataSource;

    public CacheLoader() {
        // 此刻 dataSource 还是 null！构造器执行时依赖尚未注入
        System.out.println("构造器：dataSource = " + dataSource);
    }

    @PostConstruct
    public void init() {
        // 到这里属性已经填充完成，dataSource 可以放心使用
        System.out.println("初始化：dataSource = " + dataSource);
    }
}`

const lifecycleHookCode = `// 同时实现两个初始化入口，观察执行顺序
@Component
public class OrderService implements InitializingBean {

    @PostConstruct                       // 1. 最先执行
    public void postConstruct() {
        System.out.println("1 @PostConstruct");
    }

    @Override                            // 2. 其次执行
    public void afterPropertiesSet() {
        System.out.println("2 InitializingBean.afterPropertiesSet");
    }
}

// 配合自定义 init-method（3 最后执行）：
@Bean(initMethod = "myInit")
public OrderService orderService() {
    return new OrderService();
}`

const awareCode = `@Component
public class ContextHolder
        implements BeanNameAware, ApplicationContextAware {

    private String beanName;
    private ApplicationContext ctx;

    @Override   // 容器把这个 Bean 的名字告诉它
    public void setBeanName(String name) {
        this.beanName = name;
    }

    @Override   // 容器把自己（上下文）交给这个 Bean
    public void setApplicationContext(ApplicationContext ctx) {
        // 拿到 ctx 后就能在运行期主动 getBean、发布事件
        this.ctx = ctx;
    }
}`

const destroyCode = `@Component
public class ConnectionPool implements DisposableBean {

    @PreDestroy                 // 1. 销毁阶段最先执行
    public void preDestroy() {
        System.out.println("1 @PreDestroy 释放资源");
    }

    @Override                   // 2. 其次执行
    public void destroy() {
        System.out.println("2 DisposableBean.destroy");
    }
    // 3. 最后执行 @Bean(destroyMethod="...") 指定的方法
}

// 注意：销毁回调只对 singleton 生效；
// prototype Bean 容器创建后就撒手不管，@PreDestroy 永远不会被调用`

const bppCode = `@Component
public class TimingBeanPostProcessor implements BeanPostProcessor {

    @Override   // 初始化方法执行之前回调（每个 Bean 都会经过）
    public Object postProcessBeforeInitialization(Object bean, String name) {
        System.out.println("BPP 前置：" + name);
        return bean;
    }

    @Override   // 初始化方法执行之后回调，AOP 代理正是在这里织入
    public Object postProcessAfterInitialization(Object bean, String name) {
        System.out.println("BPP 后置：" + name);
        return bean;   // 这里可以返回一个代理对象替换原始 Bean
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          一个 Bean 从「一团内存」到「能干活的对象」，中间要走一条固定的流水线：
          先被造出来，再被填上依赖，接着接受各种回调和加工，最后才交到你手上用；
          容器关闭时还要走一遍销毁。把这条流水线记牢，不仅面试能答，
          更能解释清楚「为什么构造器里拿不到依赖」「AOP 代理到底在哪一步生成」这类实战难题。
        </p>
      </Lead>

      <h2>完整的生命周期流程</h2>
      <p>
        以单例 Bean 为例，从创建到销毁大致经过这几步：
      </p>
      <ul>
        <li>
          <strong>实例化</strong>（Instantiation）：容器通过构造器把对象 new 出来，此时只是个空壳，依赖还没注入。
        </li>
        <li>
          <strong>属性填充</strong>（Populate）：把依赖注入进去，也就是 DI 真正发生的地方。
        </li>
        <li>
          <strong>Aware 回调</strong>：如果 Bean 实现了 <code>BeanNameAware</code>、<code>ApplicationContextAware</code>
          等接口，容器会回调它们，把容器内部的资源（如 Bean 名字、容器本身）告诉这个 Bean。
        </li>
        <li>
          <strong>BeanPostProcessor 前置处理</strong>：调用所有 <em>BeanPostProcessor</em> 的
          <code>postProcessBeforeInitialization</code>。
        </li>
        <li>
          <strong>初始化</strong>：依次执行 <code>@PostConstruct</code> → <code>InitializingBean.afterPropertiesSet</code>
          → 自定义 <code>init-method</code>。
        </li>
        <li>
          <strong>BeanPostProcessor 后置处理</strong>：调用 <code>postProcessAfterInitialization</code>，
          <strong>AOP 代理就在这一步织入</strong>。
        </li>
        <li>
          <strong>使用</strong>：Bean 准备就绪，放进容器供你取用。
        </li>
        <li>
          <strong>销毁</strong>：容器关闭时执行 <code>@PreDestroy</code> → <code>DisposableBean.destroy</code>
          → 自定义 <code>destroy-method</code>。
        </li>
      </ul>
      <p>
        <strong>为什么要拆这么多步？</strong>因为 Spring 想给你足够多的「插槽」去介入对象的诞生过程，
        又要保证介入的<strong>时机精确可控</strong>。实例化和属性填充分开，才能做到「先有半成品再补依赖」，
        进而解决循环依赖；初始化前后各留一个 BPP 钩子，才能让 AOP、注解处理这些增强逻辑
        无侵入地挂上去。每一步都是为某类扩展能力存在的，理解了「为什么分步」，整条流水线就不再是死记硬背。
      </p>

      <h3>Aware 回调：让 Bean 反向感知容器</h3>
      <p>
        正常情况下我们追求「业务 Bean 对容器零感知」，但有些基础设施型的 Bean 确实需要拿到容器内部资源
        （自己的名字、容器本身、ClassLoader 等）。Spring 用一组 <code>*Aware</code> 接口满足这种需求，
        实现哪个接口，容器就在属性填充之后、初始化之前回调对应方法把资源「喂」进来：
      </p>
      <CodeBlock lang="java" title="ContextHolder.java（Aware 回调示例）" code={awareCode} />
      <p>
        这其实是一种<strong>受控的依赖查找</strong>——能力很强但会让 Bean 耦合 Spring API，
        所以只在写工具类、框架适配层时用，普通业务别碰。</p>

      <Example title="@PostConstruct 何时执行">
        <p>
          很多人第一反应是「在构造器里就能用注入的依赖」，这是错的。看下面这段代码：
        </p>
        <CodeBlock lang="java" title="CacheLoader.java" code={postConstructCode} />
        <p>
          运行结果是：构造器里 <code>dataSource</code> 为 <code>null</code>，
          而 <code>@PostConstruct</code> 标注的 <code>init()</code> 里 <code>dataSource</code> 已经可用。
          原因就在流水线顺序上——<strong>实例化（构造器）在前，属性填充和初始化在后</strong>。
          所以一切「需要依赖已就位」的初始化逻辑，都该放进 <code>@PostConstruct</code>，而不是构造器。
        </p>
      </Example>

      <BeanLifecycle />

      <KeyIdea title="两个必考的考点">
        <p>
          第一，<strong>AOP 代理在 BeanPostProcessor 的后置处理里织入</strong>：
          Spring 用一个特殊的后置处理器（<code>AnnotationAwareAspectJAutoProxyCreator</code>），
          在 <code>postProcessAfterInitialization</code> 里把原始 Bean 包成代理对象返回，
          于是容器里最终存的是代理，而不是你写的那个原始对象。
        </p>
        <p>
          第二，<strong>BeanPostProcessor 是 Spring 的扩展核心</strong>：它能在每个 Bean
          初始化前后插一脚，AOP、<code>@Autowired</code> 注解的处理、<code>@Async</code> 等
          大量功能都是靠它实现的。理解了 BPP，就理解了 Spring 是怎么「无侵入」地增强你的 Bean 的。
        </p>
      </KeyIdea>

      <Callout variant="info" title="BeanPostProcessor 与 BeanFactoryPostProcessor 别搞混">
        <p>
          名字像，时机和对象完全不同，这是源码层面的高频追问：
        </p>
        <ul>
          <li>
            <strong>BeanFactoryPostProcessor（BFPP）</strong>：在所有 Bean <strong>实例化之前</strong>执行，
            操作的是 Bean 的「定义」（<code>BeanDefinition</code>，相当于图纸），可以改属性默认值、改作用域。
            <code>{'@Value'}</code> 里 <code>{'${...}'}</code> 占位符的解析、<code>@Configuration</code> 类的处理，
            靠的就是 <code>PropertySourcesPlaceholderConfigurer</code> 和 <code>ConfigurationClassPostProcessor</code> 这类 BFPP。
          </li>
          <li>
            <strong>BeanPostProcessor（BPP）</strong>：在每个 Bean <strong>实例化之后</strong>、初始化前后执行，
            操作的是 Bean 的「实例」（已经 new 出来的对象）。
          </li>
        </ul>
        <p>一句话：BFPP 改图纸（定义），BPP 改成品（实例）；BFPP 整体早于 BPP。</p>
      </Callout>

      <Example title="销毁阶段的执行顺序与陷阱">
        <p>
          销毁和初始化对称，也是「注解 → 接口 → 自定义方法」三连，但有个大坑：
        </p>
        <CodeBlock lang="java" title="ConnectionPool.java（销毁回调）" code={destroyCode} />
        <p>
          关键边界：<strong>销毁回调只对 singleton 生效</strong>。prototype Bean 一旦交付，
          容器就不再持有它的引用，<code>@PreDestroy</code> 永远不会触发，资源释放得自己兜底
          （比如 try-with-resources 或显式 close）。另外，只有正常关闭容器
          （<code>ctx.close()</code> 或注册了 JVM 关闭钩子）才会走销毁；进程被 kill -9 直接拍死，什么回调都不会执行。
        </p>
      </Example>

      <Callout variant="warn" title="单例 Bean 什么时候被创建">
        <p>
          默认情况下，<strong>单例 Bean 在容器启动时就全部创建并初始化好</strong>（即「预实例化」），
          而不是等到第一次 <code>getBean</code> 才造。好处是启动时就能暴露配置错误（快速失败），
          坏处是启动会慢一点。想让某个单例延迟到首次使用才创建，可以加 <code>@Lazy</code>。
          而 prototype 作用域的 Bean 则相反，每次获取时才新建，且容器<strong>不负责销毁</strong>它。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Bean 的生命周期」，按四段式背最清楚：<strong>实例化 → 属性填充 → 初始化 → 销毁</strong>，
        然后在「初始化」前后补上 Aware 回调和 BeanPostProcessor 的前置／后置，
        再点出两个亮点——「AOP 代理在 BPP 后置织入」「BeanPostProcessor 是扩展核心」。
        如果面试官追问初始化方法的执行顺序，记住：
        <code>@PostConstruct</code> 早于 <code>InitializingBean</code> 早于 <code>init-method</code>。
      </p>

      <Practice title="实现 InitializingBean 与 BeanPostProcessor 观察顺序">
        <p>
          先在一个 Bean 上同时挂 <code>@PostConstruct</code>、<code>InitializingBean</code> 和 <code>init-method</code>，
          打印各自的执行顺序：
        </p>
        <CodeBlock lang="java" title="OrderService.java" code={lifecycleHookCode} />
        <p>
          再写一个自定义的 <code>BeanPostProcessor</code>，在前置和后置方法里打印 Bean 名字，
          直观感受它在每个 Bean 初始化前后被调用：
        </p>
        <CodeBlock lang="java" title="TimingBeanPostProcessor.java" code={bppCode} />
        <p>
          启动容器，按打印顺序串一遍整条流水线；
          再给某个 Bean 加上 <code>@Transactional</code>，用 <code>getClass()</code>
          打印它的真实类型，你会看到类名里多了 <code>$$EnhancerBySpringCGLIB</code>——这就是后置处理织入的代理。
        </p>
      </Practice>

      <Summary
        points={[
          'Bean 生命周期主线：实例化 → 属性填充（DI）→ Aware 回调 → BPP 前置 → 初始化 → BPP 后置 → 使用 → 销毁。',
          '初始化方法执行顺序：@PostConstruct → InitializingBean.afterPropertiesSet → 自定义 init-method。',
          '构造器执行时依赖还没注入，需要依赖的初始化逻辑要放进 @PostConstruct 而非构造器。',
          'AOP 代理在 BeanPostProcessor 的后置处理（postProcessAfterInitialization）里织入，容器最终存的是代理对象。',
          'BeanPostProcessor 是 Spring 的扩展核心，AOP、@Autowired、@Async 等都靠它在 Bean 初始化前后插手。',
          '单例 Bean 默认在容器启动时就预先创建（可用 @Lazy 延迟），prototype Bean 每次获取才新建且不被容器销毁。',
        ]}
      />
    </>
  )
}

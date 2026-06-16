import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const oldWayCode = `// 没有 Spring 的年代：对象自己 new 自己的依赖
public class UserController {
    // Controller 亲自决定用哪个实现、怎么造它
    private UserService userService = new UserServiceImpl();

    public String getUser(Long id) {
        return userService.findById(id);
    }
}
// 痛点：换实现要改源码、UserServiceImpl 的依赖也得自己 new、
// 测试时没法塞一个假的 userService 进来`

const constructorInjectCode = `@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;

    // 构造器注入：依赖通过构造参数传入，由容器负责传
    // 字段可以声明成 final，对象一建好就不可变
    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public String findById(Long id) {
        return userRepository.selectName(id);
    }
}`

const javaConfigCode = `@Configuration
public class AppConfig {

    // 用 @Bean 把第三方类或自己装配的对象交给容器管理
    @Bean
    public UserService userService(UserRepository userRepository) {
        return new UserServiceImpl(userRepository);
    }

    @Bean
    public UserRepository userRepository() {
        return new JdbcUserRepository();
    }
}

// 取用：容器会自动把依赖装配好
ApplicationContext ctx =
        new AnnotationConfigApplicationContext(AppConfig.class);
UserService service = ctx.getBean(UserService.class);`

const qualifierCode = `// 同一个接口有两个实现，按类型注入会冲突
public interface PayService { void pay(); }

@Service("aliPay")
public class AliPayService implements PayService { /* ... */ }

@Service("wxPay")
public class WxPayService implements PayService { /* ... */ }

@Service
public class CheckoutService {

    // 方案一：@Qualifier 按 Bean 名字精确指定
    @Autowired
    @Qualifier("wxPay")
    private PayService payService;

    // 方案二：变量名恰好等于 Bean 名字，Spring 会按名兜底
    // @Autowired private PayService wxPay;

    // 方案三：在某个实现上打 @Primary，标记为默认首选
}`

const circularCode = `// 字段注入下的循环依赖：A 需要 B，B 又需要 A
@Service
public class A {
    @Autowired private B b;   // setter/字段注入能被三级缓存救活
}

@Service
public class B {
    @Autowired private A a;
}

// 但改成构造器注入就会直接启动失败：
// BeanCurrentlyInCreationException
// 因为造 A 必须先有 B，造 B 又必须先有 A，死锁无解`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          学 Spring，绕不开的第一个词是 <em>IoC</em>。它听起来玄乎，其实只回答一个问题：
          一个对象需要的依赖，到底由<strong>谁</strong>来创建、由<strong>谁</strong>来塞进去。
          在传统写法里，是对象自己动手 <code>new</code>；在 Spring 里，这件事被交给了「容器」。
          这个「交出去」的动作，就是控制反转。
        </p>
      </Lead>

      <h2>什么是 IoC，什么是 DI</h2>
      <p>
        <em>IoC</em>（Inversion of Control，控制反转）说的是：对象的创建权和依赖管理权，
        从对象自己手里「反转」给了容器。原来是「我要用什么，我自己造」，现在变成「我要用什么，容器给我」。
        控制方向掉了个头，所以叫「反转」。
      </p>
      <p>
        <em>DI</em>（Dependency Injection，依赖注入）则是 IoC 的<strong>具体实现方式</strong>。
        IoC 是一种思想、一个目标；DI 是落地手段——容器在创建对象时，把它需要的依赖「注入」进去。
        换句话说：你描述「我依赖谁」，容器负责「把谁递给你」。两者关系记一句话就够：
        IoC 是思想，DI 是手段。
      </p>
      <p>
        <strong>为什么要这么设计？</strong>本质是把「<em>稳定的业务逻辑</em>」和「<em>易变的装配关系</em>」分开。
        业务代码只关心「调用某个能力」，而「这个能力是哪个类、它的依赖怎么拼起来、单例还是多例」
        这些会随环境变化的决策，全部上提到容器和配置层。这就是著名的<strong>好莱坞原则</strong>：
        「Don&apos;t call us, we&apos;ll call you」——别你来 new 我，时机到了我来给你。
        对象从「主动获取依赖」变成「被动接受依赖」，主动权（控制权）方向反了，这就是「反转」二字的由来。
      </p>
      <Callout variant="info" title="IoC 不止 DI 一种实现">
        <p>
          严格说，IoC 是个大概念，依赖注入只是它最常见的落地形式。还有一种叫<strong>依赖查找</strong>
          （Dependency Lookup，DL），比如手动 <code>ctx.getBean(Xxx.class)</code> 主动去容器里捞——
          这也是控制反转，只是没那么优雅，需要业务代码直接耦合容器 API。
          Spring 早年大量用 DL，后来全面转向 DI，因为 DI 让业务代码对容器<strong>零感知</strong>，
          换个容器、脱离容器跑单测都不受影响。
        </p>
      </Callout>

      <Example title="Controller 依赖 Service，不再自己 new">
        <p>先看没有 Spring 时，对象是怎么「亲力亲为」的：</p>
        <CodeBlock lang="java" title="UserController.java（传统写法）" code={oldWayCode} />
        <p>
          问题很明显：<code>UserController</code> 和 <code>UserServiceImpl</code> 被焊死在一起。
          想换个实现、想在测试里塞个假对象，都得动源码。交给容器后，Controller 只需要声明
          「我需要一个 <code>UserService</code>」，至于是哪个实现、怎么造出来，全由容器决定。
        </p>
      </Example>

      <KeyIdea title="IoC 到底好在哪">
        <p>
          把控制权交给容器，换来三样东西：<strong>解耦</strong>（调用方只依赖接口，不依赖具体实现）、
          <strong>可替换</strong>（换实现只改配置，不改业务代码）、
          <strong>易测试</strong>（测试时能轻松注入 mock 或 stub）。
          这三点是后面所有 Spring 特性的地基。
        </p>
      </KeyIdea>

      <h2>三种注入方式：构造器、setter、字段</h2>
      <p>
        DI 在代码里有三种落地姿势，面试常被追问优劣：
      </p>
      <ul>
        <li>
          <strong>构造器注入</strong>（推荐）：依赖通过构造参数传入，字段可声明为 <code>final</code>，
          保证依赖<strong>不可变</strong>且<strong>不为空</strong>；对象一旦建成就是完整可用的。
          循环依赖在构造器注入下会直接报错，反而能帮你早点发现设计问题。
        </li>
        <li>
          <strong>setter 注入</strong>：通过 setter 方法注入，适合<strong>可选依赖</strong>或需要在运行期重新配置的场景。
        </li>
        <li>
          <strong>字段注入</strong>：直接在字段上写 <code>@Autowired</code>，写起来最省事，
          但依赖被藏在内部、无法用 <code>final</code>、脱离容器难以单测，
          因此<strong>不推荐</strong>在生产代码里大量使用。
        </li>
      </ul>

      <KeyIdea title="为什么官方逐渐推荐构造器注入">
        <p>
          Spring 4.3 之后，<strong>构造器只有一个时甚至可以省略 <code>@Autowired</code></strong>，
          官方文档也明确把构造器注入列为首选。背后有几条硬道理：
        </p>
        <ul>
          <li>
            <strong>依赖显式化</strong>：构造参数列表就是这个类的「依赖清单」。
            如果一个类构造器参数多到七八个，恰恰是在告诉你「这个类职责过重，该拆了」——
            字段注入会把这种坏味道藏起来，构造器注入会逼你直面它。
          </li>
          <li>
            <strong>对象天生完整</strong>：构造完成即可用，不存在「半初始化」状态，配合 <code>final</code> 还能保证线程安全发布。
          </li>
          <li>
            <strong>脱离容器可测</strong>：单测里直接 <code>new UserServiceImpl(mockRepo)</code> 就能跑，
            根本不需要起 Spring 容器，也不需要反射去塞私有字段。
          </li>
        </ul>
      </KeyIdea>

      <Example title="多实现冲突：@Qualifier 与 @Primary">
        <p>
          一旦同一个接口有多个实现，按类型注入就会抛 <code>NoUniqueBeanDefinitionException</code>。
          这是工作里极常见的场景（多种支付渠道、多个数据源），三种解法要会：
        </p>
        <CodeBlock lang="java" title="PayService 多实现的装配" code={qualifierCode} />
        <p>
          记忆口诀：<strong>@Primary 定全局默认，@Qualifier 做局部精确指定，变量名兜底匹配</strong>。
          优先级上，<code>@Qualifier</code> 显式指定 &gt; <code>@Primary</code> &gt; 按变量名匹配。
        </p>
      </Example>

      <Callout variant="warn" title="@Autowired 和 @Resource 别记混">
        <p>这是高频考点，区别就两点：</p>
        <ul>
          <li>
            <strong>@Autowired</strong>：Spring 提供，默认按<strong>类型</strong>（byType）装配。
            当同一类型有多个 Bean 时会冲突，需要配合 <code>@Qualifier(&quot;beanName&quot;)</code> 按名字指定。
          </li>
          <li>
            <strong>@Resource</strong>：JDK（JSR-250）提供，默认按<strong>名字</strong>（byName）装配，
            找不到对应名字时才退回按类型找。
          </li>
        </ul>
        <p>一句话：@Autowired 先看类型，@Resource 先看名字。</p>
        <p>
          补一个高频追问：<code>@Autowired</code> 按类型找到多个候选时，会<strong>退化为按名字（变量名）</strong>
          匹配，仍匹配不上才报错；它还能配 <code>{'@Autowired(required = false)'}</code> 把依赖变成可选，
          以及直接注入 <code>{'List<PayService>'}</code> 把所有实现一次性收集成集合——这在策略模式里特别好用。
        </p>
      </Callout>

      <h3>循环依赖：能解和不能解的边界</h3>
      <p>
        A 依赖 B、B 又依赖 A，这叫循环依赖。Spring 靠<strong>三级缓存</strong>解决了
        <strong>单例 + setter/字段注入</strong>下的循环依赖：
      </p>
      <ul>
        <li><strong>一级缓存</strong>（singletonObjects）：放完全初始化好的成品 Bean。</li>
        <li><strong>二级缓存</strong>（earlySingletonObjects）：放提前曝光的、尚未填充完属性的「半成品」。</li>
        <li><strong>三级缓存</strong>（singletonFactories）：放生产「早期引用」的工厂，AOP 代理就靠它在需要时提前生成。</li>
      </ul>
      <p>
        核心招数是<strong>提前曝光</strong>：A 实例化后还没填属性，就先把它的引用塞进缓存，
        这样 B 在装配时能拿到这个「半成品 A」，从而打破死循环。
      </p>
      <CodeBlock lang="java" title="循环依赖：哪种注入能救、哪种救不了" code={circularCode} />
      <Callout variant="warn" title="构造器循环依赖为什么无解">
        <p>
          三级缓存的前提是「对象已经被 new 出来、只是还没填属性」，才能提前曝光引用。
          但<strong>构造器注入</strong>要求依赖在 new 的那一刻就备齐——造 A 必须先有 B，造 B 必须先有 A，
          连「半成品」都造不出来，自然无法提前曝光，于是直接 <code>BeanCurrentlyInCreationException</code>。
          这恰恰是构造器注入的优点：它把「循环依赖」这种设计问题在启动期就暴露出来，逼你重构而不是默默带病运行。
          顺带一提，Spring Boot 2.6+ 默认<strong>禁止循环依赖</strong>，需手动开 <code>allow-circular-references</code>，
          官方态度很明确：循环依赖应当被修掉，而不是被纵容。
        </p>
      </Callout>

      <h2>BeanFactory 与 ApplicationContext</h2>
      <p>
        容器有两层接口。<em>BeanFactory</em> 是最底层的容器，只提供最基础的 Bean
        获取能力，采用<strong>懒加载</strong>（用到时才创建）。
        <em>ApplicationContext</em> 继承自 BeanFactory，是我们实际开发用的「企业级容器」，
        额外提供了国际化、事件发布、注解支持、AOP 集成等能力，并且默认在<strong>启动时</strong>
        就把单例 Bean 都创建好。简单记：BeanFactory 是地基，ApplicationContext 是精装修后的成品。
      </p>

      <h3>Bean 的作用域</h3>
      <p>
        容器管理的对象叫 <em>Bean</em>，它有不同的「作用域」（scope），决定容器给你的是同一个实例还是新实例：
      </p>
      <ul>
        <li><strong>singleton</strong>（默认）：整个容器只有一个实例，所有人共享。</li>
        <li><strong>prototype</strong>：每次获取都新建一个实例。</li>
        <li><strong>request</strong>：每个 HTTP 请求一个实例（仅 Web 环境）。</li>
        <li><strong>session</strong>：每个 HTTP 会话一个实例（仅 Web 环境）。</li>
      </ul>
      <p>
        注意单例 Bean 无状态使用最安全；如果往单例 Bean 里塞了可变的成员变量，
        多线程下就可能出问题——这也是面试官爱挖的坑。
      </p>
      <Callout variant="warn" title="单例里注入多例：Bean 注入失效陷阱">
        <p>
          一个高频追问：往单例 Bean 里 <code>@Autowired</code> 一个 prototype Bean，
          每次用它还是<strong>同一个实例</strong>吗？答案是——还是同一个。因为依赖只在单例创建时注入<strong>一次</strong>，
          之后那个字段就固定了，prototype 的「每次新建」根本没机会触发。
          要真正每次拿新实例，得用 <code>{'@Lookup'}</code> 方法注入，或注入 <code>{'ObjectProvider<T>'}</code> /
          <code>{'Provider<T>'}</code> 每次现取，或直接持有 <code>ApplicationContext</code> 主动 getBean。
        </p>
      </Callout>
      <table>
        <thead>
          <tr><th>作用域</th><th>实例数</th><th>容器是否负责销毁</th><th>典型场景</th></tr>
        </thead>
        <tbody>
          <tr><td>singleton</td><td>容器内唯一</td><td>是（走 @PreDestroy 等）</td><td>无状态 Service / DAO（绝大多数）</td></tr>
          <tr><td>prototype</td><td>每次获取新建</td><td>否（拿到后容器不再管）</td><td>有状态、需要隔离的对象</td></tr>
          <tr><td>request</td><td>每个 HTTP 请求一个</td><td>请求结束时</td><td>Web 下绑定单次请求的数据</td></tr>
          <tr><td>session</td><td>每个会话一个</td><td>会话失效时</td><td>用户登录态、购物车</td></tr>
        </tbody>
      </table>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「什么是 IoC 和 DI」，别背定义堆术语，按这个顺序讲最稳：先点出痛点
        （对象自己 new 依赖导致紧耦合、难替换、难测试），再说 IoC 把创建权反转给容器、
        DI 是它的实现手段，最后落到三个好处（解耦、可替换、易测试）。
        如果还有时间，补一句「构造器注入是首选，因为依赖不可变、不为空、对单测友好」，
        基本就稳了。
      </p>
      <Callout variant="info" title="常见误区 & 高频追问清单">
        <ul>
          <li>
            <strong>误区：IDEA 给字段注入划黄线就说明它一无是处。</strong>不对，
            字段注入在<strong>测试类</strong>、<strong>无法改构造器的框架基类</strong>里仍有合理用武之地，只是生产业务代码应避免。
          </li>
          <li>
            <strong>追问：BeanFactory 和 FactoryBean 是一回事吗？</strong>完全不同。
            <code>BeanFactory</code> 是容器本身；<code>FactoryBean</code> 是一种「生产 Bean 的 Bean」，
            <code>getBean("xxx")</code> 拿到的是它 <code>getObject()</code> 的产物，想拿工厂本身得加前缀
            <code>&amp;</code>（MyBatis 的 <code>SqlSessionFactoryBean</code> 就是典型）。
          </li>
          <li>
            <strong>追问：Spring 容器是线程安全的吗？</strong>容器的读取（getBean）是线程安全的，
            但你放进去的<strong>单例 Bean 自身是否线程安全，取决于你有没有写可变共享状态</strong>，容器不替你兜底。
          </li>
        </ul>
      </Callout>

      <Practice title="用构造器注入 + Java 配置装配一组 Bean">
        <p>
          先写一个用构造器注入的 Service，让依赖通过构造参数传入：
        </p>
        <CodeBlock lang="java" title="UserServiceImpl.java" code={constructorInjectCode} />
        <p>
          再用 <code>@Configuration</code> + <code>@Bean</code> 把对象交给容器，
          观察容器如何自动把 <code>UserRepository</code> 装配进 <code>UserService</code>：
        </p>
        <CodeBlock lang="java" title="AppConfig.java" code={javaConfigCode} />
        <p>
          试着把 <code>JdbcUserRepository</code> 换成另一个实现，体会一下「只改配置、不动业务代码」的快感；
          再把某个 Bean 改成 <code>@Scope(&quot;prototype&quot;)</code>，连续 <code>getBean</code> 两次比较是不是同一个对象。
        </p>
      </Practice>

      <Summary
        points={[
          'IoC（控制反转）是把对象的创建权和依赖管理权交给容器的思想；DI（依赖注入）是它的实现手段。',
          '交给容器后换来三大好处：解耦、可替换、易测试，这是 Spring 所有特性的地基。',
          '注入有构造器、setter、字段三种；构造器注入最推荐，依赖不可变、不为空、对单测友好。',
          '@Autowired 默认按类型装配（多实现时配 @Qualifier），@Resource 默认按名字装配。',
          'BeanFactory 是懒加载的底层容器，ApplicationContext 继承它并在启动时创建单例、提供企业级能力。',
          'Bean 作用域有 singleton（默认）/prototype/request/session，单例 Bean 应避免可变成员以防线程安全问题。',
          '多实现冲突用 @Qualifier 精确指定或 @Primary 设默认；@Autowired 找到多个会退化按变量名匹配。',
          '单例+setter/字段注入的循环依赖靠三级缓存（提前曝光半成品）解决；构造器循环依赖无解，会启动失败。',
          'BeanFactory 是容器，FactoryBean 是生产 Bean 的 Bean；单例里注入 prototype 不会每次都新建，需用 ObjectProvider/@Lookup。',
        ]}
      />
    </>
  )
}

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

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「什么是 IoC 和 DI」，别背定义堆术语，按这个顺序讲最稳：先点出痛点
        （对象自己 new 依赖导致紧耦合、难替换、难测试），再说 IoC 把创建权反转给容器、
        DI 是它的实现手段，最后落到三个好处（解耦、可替换、易测试）。
        如果还有时间，补一句「构造器注入是首选，因为依赖不可变、不为空、对单测友好」，
        基本就稳了。
      </p>

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
        ]}
      />
    </>
  )
}

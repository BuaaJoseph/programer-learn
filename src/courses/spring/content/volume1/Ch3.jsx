import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import AopProxy from '@/courses/spring/illustrations/AopProxy.jsx'

const selfInvokeCode = `@Service
public class OrderService {

    @Transactional
    public void createOrder(Order order) {
        save(order);
        // 同类内部直接调用，走的是原始对象 this，不经过代理
        // 于是 updateStock 上的 @Transactional 完全失效！
        updateStock(order);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateStock(Order order) {
        stockMapper.reduce(order.getSku());
    }
}`

const fixCode = `@Service
public class OrderService {

    // 注入自己的代理对象（或抽到另一个 Bean 里）
    @Autowired
    private OrderService self;

    @Transactional
    public void createOrder(Order order) {
        save(order);
        // 通过代理对象调用，@Transactional 才会生效
        self.updateStock(order);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateStock(Order order) {
        stockMapper.reduce(order.getSku());
    }
}`

const aspectCode = `@Aspect          // 声明这是一个切面
@Component       // 别忘了交给容器管理
public class TimingAspect {

    // 切点：拦截 service 包下所有 public 方法
    @Around("execution(* com.demo.service..*(..))")
    public Object timing(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            // 放行，执行被代理的目标方法
            return pjp.proceed();
        } finally {
            long cost = System.currentTimeMillis() - start;
            String name = pjp.getSignature().toShortString();
            System.out.println(name + " 耗时 " + cost + "ms");
        }
    }
}`

const pointcutCode = `@Aspect
@Component
public class AnnotationAspect {

    // 1. 自定义注解切点：拦所有打了 @Loggable 的方法
    @Pointcut("@annotation(com.demo.anno.Loggable)")
    public void loggable() {}

    // 2. execution 表达式拆解：
    //    修饰符  返回值     包.类.方法(参数)
    //    public  *          com.demo.service.*.*(..)
    @Pointcut("execution(public * com.demo.service.*.*(..))")
    public void servicePublic() {}

    // 3. 组合：两个切点取交集 / 并集
    @Before("loggable() && servicePublic()")
    public void before(JoinPoint jp) {
        System.out.println("命中：" + jp.getSignature().getName());
    }
}`

const orderCode = `// 多个切面作用于同一方法时，用 @Order 控制顺序
@Aspect @Component @Order(1)   // 数字越小越靠外层
public class TxAspect { /* 事务 */ }

@Aspect @Component @Order(2)
public class LogAspect { /* 日志 */ }

// 执行像洋葱：
// Tx.before -> Log.before -> 目标方法 -> Log.after -> Tx.after
// 外层最先进入、最后退出（环绕的嵌套顺序）`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          事务、日志、权限校验这类逻辑，散落在每个方法里既重复又碍眼。
          <em>AOP</em>（面向切面编程）的思路是：把这些「横切关注点」抽出来集中管理，
          再由框架在运行时悄悄织回到目标方法周围。它的底层魔法只有一个词——<strong>动态代理</strong>：
          容器给你的不是原始对象，而是一个套了壳的代理，壳上挂着你的增强逻辑。
        </p>
      </Lead>

      <h2>AOP 的几个核心概念</h2>
      <p>
        先把术语理顺，面试常要你解释它们的关系：
      </p>
      <ul>
        <li><strong>切面</strong>（Aspect）：横切逻辑的载体，比如「记录耗时」这件事打包成的一个类。</li>
        <li><strong>连接点</strong>（JoinPoint）：程序执行中可以被插入的点，在 Spring 里就是「方法的执行」。</li>
        <li><strong>切点</strong>（Pointcut）：用表达式筛选出「到底要拦哪些连接点」，比如 service 包下所有方法。</li>
        <li><strong>通知</strong>（Advice）：在切点上具体要做的事，以及做的时机（方法前、后、环绕等）。</li>
      </ul>
      <p>
        典型用途就是那几样：<strong>事务管理</strong>（<code>@Transactional</code> 本质就是 AOP）、
        <strong>统一日志</strong>、<strong>权限校验</strong>、性能监控等。凡是「和业务无关、却到处都要写」的逻辑，都适合用 AOP。
      </p>
      <p>
        还有两个常被追问的术语：<strong>织入</strong>（Weaving）指把切面应用到目标对象、生成代理的过程；
        <strong>引入</strong>（Introduction）指给现有类动态「加」一个它本来没有的接口实现。
        Spring AOP 的织入发生在<strong>运行时</strong>（生成动态代理），而 AspectJ 还支持编译期、类加载期织入，
        功能更全但更重。这就引出一个关键边界——
      </p>
      <KeyIdea title="Spring AOP 和 AspectJ 不是一回事">
        <p>
          很多人把它们混为一谈。<strong>Spring AOP</strong> 是 Spring 自带的、基于<strong>动态代理</strong>的轻量 AOP，
          只能拦截<strong>容器管理的 Bean 的方法执行</strong>（method execution），靠运行时生成代理实现，
          所以才会有「自调用失效」「final 不能代理」这些限制。
          <strong>AspectJ</strong> 是一套独立完整的 AOP 框架，能在编译期/类加载期直接改字节码，
          可拦截字段访问、构造器、甚至非 Spring 管理的对象，能力强但需要专门的编译器或 agent。
          Spring 只是<strong>借用了 AspectJ 的注解语法</strong>（<code>@Aspect</code>、<code>@Around</code> 这些），
          底层引擎仍是自己的代理，不要因为注解一样就以为用上了 AspectJ 的全部能力。
        </p>
      </KeyIdea>

      <h2>两种动态代理：JDK 与 CGLIB</h2>
      <p>
        Spring AOP 在运行时生成代理，有两种实现方式，到底用哪种取决于目标类有没有实现接口：
      </p>
      <ul>
        <li>
          <strong>JDK 动态代理</strong>：目标类<strong>实现了接口</strong>时使用，
          基于<strong>接口</strong>生成一个实现同样接口的代理类。它是 JDK 自带能力（<code>Proxy</code> + <code>InvocationHandler</code>）。
        </li>
        <li>
          <strong>CGLIB 代理</strong>：目标类<strong>没有接口</strong>时使用，
          通过<strong>继承</strong>目标类、生成一个子类来做代理，在子类里重写方法插入增强。
        </li>
      </ul>

      <Example title="@Transactional 内部调用为什么失效">
        <p>
          这是 AOP 最经典的坑。下面这段代码里，<code>updateStock</code> 上的事务注解形同虚设：
        </p>
        <CodeBlock lang="java" title="OrderService.java（有 bug）" code={selfInvokeCode} />
        <p>
          原因在于 AOP 增强是挂在<strong>代理对象</strong>上的。外部调用 <code>createOrder</code>
          时走的是代理，没问题；但在 <code>createOrder</code> 内部直接写 <code>updateStock(order)</code>，
          等价于 <code>this.updateStock(order)</code>，调用的是<strong>原始对象</strong>，
          根本没经过代理，于是 <code>updateStock</code> 上的事务、日志等增强统统失效。
          这就是「同类内部方法自调用导致 AOP 失效」。
        </p>
      </Example>

      <AopProxy />

      <KeyIdea title="Spring Boot 默认强制用 CGLIB">
        <p>
          早期 Spring 的规则是「有接口用 JDK、无接口用 CGLIB」。但从 Spring Boot 2.x 起，
          自动配置<strong>默认强制使用 CGLIB</strong>（<code>proxy-target-class=true</code>），
          即便目标类实现了接口也走 CGLIB。这样做是为了行为统一、避免「注入接口能拿到代理、注入实现类却拿不到」之类的坑。
          想改回 JDK 代理可以把这个开关设为 <code>false</code>，但通常没必要。
        </p>
      </KeyIdea>

      <h3>常见的通知类型</h3>
      <p>
        在切点上挂的「通知」按时机分几种，记住对应注解即可：
      </p>
      <ul>
        <li><strong>@Before</strong>：目标方法执行前。</li>
        <li><strong>@AfterReturning</strong>：正常返回后。</li>
        <li><strong>@AfterThrowing</strong>：抛异常后。</li>
        <li><strong>@After</strong>：无论成功失败都执行（类似 finally）。</li>
        <li>
          <strong>@Around</strong>：最强大的一种，包裹整个方法执行，能在前后都插逻辑、
          能改返回值、甚至决定要不要放行（通过 <code>ProceedingJoinPoint.proceed()</code>）。
        </li>
      </ul>

      <Callout variant="warn" title="两个容易栽的坑">
        <p>
          第一，<strong>同类内部自调用</strong>：如上例，类内部方法互相调用绕过了代理，增强会失效。
          解法是注入自身代理后用 <code>self.xxx()</code> 调用，或干脆把方法拆到另一个 Bean 里。
        </p>
        <p>
          第二，<strong>final 方法 / final 类不能被 CGLIB 代理</strong>：
          CGLIB 靠生成子类、重写方法来增强，而 <code>final</code> 方法无法被重写、<code>final</code>
          类无法被继承，因此挂在它们上的 AOP 不会生效（也可能直接报错）。同理，private 方法也代理不到。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「AOP 原理」，先讲它解决什么（把横切逻辑抽出来，无侵入地织回目标方法），
        再说核心机制是动态代理，分 JDK（基于接口）和 CGLIB（基于继承子类）两种，
        并点出 Spring Boot 默认强制 CGLIB。最后主动抛出那个高频坑——「同类内部自调用导致
        <code>@Transactional</code> 失效」，并给出修复方案，面试官基本就满意了。
      </p>

      <Practice title="自定义 @Aspect 切面记录方法耗时">
        <p>
          写一个环绕通知，拦截 service 包下所有方法并打印执行耗时，亲手体会 AOP 是怎么「插」进去的：
        </p>
        <CodeBlock lang="java" title="TimingAspect.java" code={aspectCode} />
        <p>
          跑起来后，故意制造一次「同类内部自调用」（在一个被拦截的方法里直接调另一个被拦截的方法），
          你会发现内部那次调用的耗时<strong>没被打印</strong>——这就亲眼验证了自调用绕过代理的失效问题。
          再按上一节的办法注入 <code>self</code> 改用 <code>self.xxx()</code> 调用，日志就回来了。
        </p>
        <CodeBlock lang="java" title="修复自调用：注入自身代理" code={fixCode} />
      </Practice>

      <Summary
        points={[
          'AOP 把事务、日志、权限等横切逻辑抽成切面，由框架在运行时织回目标方法，核心机制是动态代理。',
          '核心概念：切面（Aspect）、连接点（JoinPoint）、切点（Pointcut，筛选拦哪些）、通知（Advice，做什么和何时做）。',
          '两种代理：目标有接口用 JDK 动态代理（基于接口），无接口用 CGLIB（基于继承生成子类）。',
          'Spring Boot 默认强制使用 CGLIB（proxy-target-class=true），即使有接口也不走 JDK 代理。',
          '通知类型：@Before/@AfterReturning/@AfterThrowing/@After/@Around，其中 @Around 最灵活，可控制是否放行。',
          '两大坑：同类内部自调用绕过代理导致 AOP 失效（用 self 代理调用修复）；final 方法/类无法被 CGLIB 代理。',
        ]}
      />
    </>
  )
}

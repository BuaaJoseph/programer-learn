import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Proxy from '@/courses/design-patterns/illustrations/Proxy.jsx'

const staticProxyCode = `// 1. 共同的接口
interface UserService {
    void save(String name);
}

// 2. 真实对象
class UserServiceImpl implements UserService {
    public void save(String name) {
        System.out.println("保存用户：" + name);
    }
}

// 3. 静态代理类：实现同一个接口，内部持有真实对象
class UserServiceProxy implements UserService {
    private final UserService target;

    public UserServiceProxy(UserService target) {
        this.target = target;
    }

    public void save(String name) {
        System.out.println("[日志] 方法开始");   // 增强：前置
        target.save(name);                       // 委托给真实对象
        System.out.println("[日志] 方法结束");   // 增强：后置
    }
}`

const jdkProxyCode = `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class JdkProxyDemo {

    interface UserService {
        void save(String name);
    }

    static class UserServiceImpl implements UserService {
        public void save(String name) {
            System.out.println("保存用户：" + name);
        }
    }

    // InvocationHandler：所有被代理方法的调用都会进到这里的 invoke
    static class LogHandler implements InvocationHandler {
        private final Object target;

        LogHandler(Object target) {
            this.target = target;
        }

        public Object invoke(Object proxy, Method method, Object[] args)
                throws Throwable {
            System.out.println("[日志] 调用 " + method.getName());
            Object result = method.invoke(target, args);  // 反射调用真实方法
            System.out.println("[日志] 调用结束");
            return result;
        }
    }

    public static void main(String[] args) {
        UserService real = new UserServiceImpl();

        UserService proxy = (UserService) Proxy.newProxyInstance(
                real.getClass().getClassLoader(),   // 类加载器
                real.getClass().getInterfaces(),     // 要实现的接口数组
                new LogHandler(real));               // 调用处理器

        proxy.save("张三");   // 实际走的是 LogHandler.invoke
    }
}`

const cglibProxyCode = `import net.sf.cglib.proxy.Enhancer;
import net.sf.cglib.proxy.MethodInterceptor;
import net.sf.cglib.proxy.MethodProxy;
import java.lang.reflect.Method;

// 目标类：没有实现任何接口，JDK 动态代理无能为力
class UserService {
    public void save(String name) {
        System.out.println("保存用户：" + name);
    }
}

public class CglibProxyDemo {

    // MethodInterceptor：所有被代理方法都会进到 intercept
    static class LogInterceptor implements MethodInterceptor {
        public Object intercept(Object obj, Method method,
                                Object[] args, MethodProxy proxy) throws Throwable {
            System.out.println("[日志] 调用 " + method.getName());
            // 注意用 invokeSuper（调父类方法），而不是 invoke，否则会无限递归
            Object result = proxy.invokeSuper(obj, args);
            System.out.println("[日志] 调用结束");
            return result;
        }
    }

    public static void main(String[] args) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(UserService.class);     // 设父类：生成它的子类
        enhancer.setCallback(new LogInterceptor());
        UserService proxy = (UserService) enhancer.create();
        proxy.save("李四");   // 走的是子类重写后的方法 -> intercept
    }
}`

const selfInvokeCode = `// AOP 经典陷阱：类内部自调用，事务/切面失效
@Service
public class OrderService {

    @Transactional
    public void create(Order order) {
        // ...
        this.audit(order);   // 走的是 this（真实对象），没经过代理！
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void audit(Order order) {
        // 期望它开一个新事务，但因为是自调用，@Transactional 完全不生效
    }
}

// 解法：①注入自己的代理 ②AopContext.currentProxy() ③拆成两个 Bean`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          有时候我们想给一个对象的方法「悄悄」加点东西——比如打日志、开事务、做权限校验、把远程调用包装成本地调用——
          但又不想去改它原来的代码。<em>代理模式</em>（Proxy）就是为此而生：给真实对象配一个「替身」，
          外部通过替身访问，替身在调用前后插入增强逻辑，再把真正的活儿转交给真实对象。
        </p>
      </Lead>

      <h2>什么是代理模式</h2>
      <p>
        代理模式的意图是：<strong>为另一个对象提供一个替身或占位符，以控制对这个对象的访问</strong>。
        关键词是「控制访问」——代理和真实对象长得一样（实现同一个接口），调用方根本感觉不到中间多了一层，
        但代理可以决定要不要放行、在前后做什么、甚至延迟创建真实对象。
      </p>
      <p>
        它由三个角色构成：<em>Subject</em>（共同接口）、<em>RealSubject</em>（真实对象）、
        <em>Proxy</em>（代理对象，持有真实对象的引用）。代理实现了和真实对象相同的接口，所以可以无缝替换原对象。
      </p>

      <h3>代理的四种常见类型</h3>
      <p>
        按「控制访问」的目的不同，代理在 GoF 里分出几种典型用途，理解它们有助于在面试里举出对的例子：
      </p>
      <ul>
        <li>
          <strong>远程代理（Remote Proxy）</strong>：为「在另一台机器上的对象」提供本地替身，
          代理在背后做序列化与网络传输。RPC 框架 Dubbo、Feign 就是它。
        </li>
        <li>
          <strong>虚拟代理（Virtual Proxy）</strong>：延迟创建开销大的对象，先给个轻量替身，真正用到时才创建。
          Hibernate 的懒加载、图片占位符都是它。
        </li>
        <li>
          <strong>保护代理（Protection Proxy）</strong>：在访问前做权限校验，决定放不放行。权限切面、网关鉴权属于它。
        </li>
        <li>
          <strong>智能引用代理（Smart Reference）</strong>：在访问时附带额外动作，如引用计数、缓存、日志、加锁。
        </li>
      </ul>

      <h3>静态代理：手写一个替身类</h3>
      <p>
        最朴素的做法是手写一个代理类，让它实现和目标相同的接口，内部持有真实对象，在转发调用的前后插入逻辑。
        以「给 save 方法加日志」为例：
      </p>
      <CodeBlock lang="java" title="StaticProxy.java" code={staticProxyCode} />
      <p>
        静态代理的优点是直观、好调试；缺点也很明显：<strong>一个接口要写一个代理类</strong>，
        接口里多一个方法，代理类就得跟着改。如果系统里有几十个 Service 都要加日志，就得写几十个几乎一样的代理类——
        这显然不可接受，于是有了「动态代理」。
      </p>

      <Example title="一句话区分静态与动态">
        <p>
          静态代理：代理类是你<strong>编译期手写</strong>好的 .java 文件。
        </p>
        <p>
          动态代理：代理类是<strong>运行期由 JVM 临时生成</strong>的字节码，你只写一段「拦截逻辑」，
          剩下的样板代码框架替你造。下面两种动态代理是面试的绝对高频考点。
        </p>
      </Example>

      <Proxy />

      <h3>JDK 动态代理：Proxy + InvocationHandler</h3>
      <p>
        JDK 自带的动态代理由 <code>java.lang.reflect.Proxy</code> 和 <code>InvocationHandler</code> 两个核心类协作完成。
        你不再为每个接口手写代理类，而是把增强逻辑统一写进 <code>InvocationHandler.invoke</code> 里：
        被代理对象的<strong>任何方法</strong>被调用，都会先进到这个 <code>invoke</code> 方法。
      </p>
      <p>
        它的硬性前提是：<strong>目标对象必须实现接口</strong>。因为 JDK 生成的代理类，本质是「实现了同一组接口」的一个新类，
        靠接口这条线和真实对象对齐。没有接口，JDK 动态代理就无能为力。
      </p>

      <h3>CGLIB：生成子类，无需接口</h3>
      <p>
        如果目标类没有实现任何接口怎么办？<em>CGLIB</em>（Code Generation Library）给出了另一条路：
        它在运行期<strong>动态生成目标类的子类</strong>，通过重写父类的方法来织入增强逻辑，
        靠的是「继承」而不是「接口」。所以 CGLIB <strong>无需接口</strong>，可以直接代理普通类。
      </p>
      <p>
        代价是：因为基于继承，CGLIB 不能代理 <code>final</code> 类（不能被继承），也不能拦截 <code>final</code>、
        <code>private</code> 方法（不能被重写）。它通过 <code>MethodInterceptor</code> 的 <code>intercept</code>
        方法拦截调用，思路和 <code>InvocationHandler</code> 类似。
      </p>
      <CodeBlock lang="java" title="CglibProxyDemo.java（无接口也能代理）" code={cglibProxyCode} />
      <p>
        注意上面的关键细节：CGLIB 拦截里要调 <code>proxy.invokeSuper(obj, args)</code>（调用父类方法），
        而不是 <code>method.invoke(obj, args)</code>——后者会在子类代理对象上再次触发拦截，造成<strong>无限递归 StackOverflow</strong>。
        这是 CGLIB 手写时最常见的坑。
      </p>

      <h2>JDK 动态代理 vs CGLIB 对比表</h2>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>JDK 动态代理</th>
            <th>CGLIB</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>实现机制</td>
            <td>运行期生成实现接口的代理类</td>
            <td>运行期生成目标类的子类</td>
          </tr>
          <tr>
            <td>依赖关系</td>
            <td>基于接口（implements）</td>
            <td>基于继承（extends）</td>
          </tr>
          <tr>
            <td>前提</td>
            <td>目标必须实现接口</td>
            <td>无需接口，但类不能 final</td>
          </tr>
          <tr>
            <td>拦截入口</td>
            <td>InvocationHandler.invoke</td>
            <td>MethodInterceptor.intercept</td>
          </tr>
          <tr>
            <td>不能代理</td>
            <td>没有接口的类</td>
            <td>final 类、final/private 方法</td>
          </tr>
          <tr>
            <td>是否内置</td>
            <td>JDK 自带</td>
            <td>需引入字节码库（ASM）</td>
          </tr>
        </tbody>
      </table>

      <KeyIdea title="三者怎么选">
        <p>
          <strong>静态代理</strong>——一对一手写，简单但不可扩展，实际工程基本不用。
          <strong>JDK 动态代理</strong>——基于接口、用反射，JDK 原生支持，目标有接口时首选。
          <strong>CGLIB</strong>——基于继承生成子类，目标没接口时用它，但不能代理 final。
          一句口诀：<strong>有接口走 JDK，没接口走 CGLIB</strong>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="Spring AOP 到底用哪种">
        <p>
          这是面试最爱追问的点：Spring AOP 会<strong>智能选择</strong>——
          目标对象实现了接口，默认用 JDK 动态代理；没有实现接口，就退化到 CGLIB。
        </p>
        <ul>
          <li>
            Spring Boot 2.x 起，<code>spring.aop.proxy-target-class</code> 默认为 <code>true</code>，
            也就是<strong>默认一律用 CGLIB</strong>，省去「必须面向接口编程」带来的踩坑。
          </li>
          <li>
            正因为基于代理，AOP 有个经典陷阱：<strong>同一个类内部方法自调用，事务/切面会失效</strong>——
            因为自调用走的是 <code>this</code>（真实对象），根本没经过代理那一层。
          </li>
        </ul>
      </Callout>

      <h3>自调用失效：原理与三种解法</h3>
      <p>
        这是工作中真正会踩、面试也最爱深挖的坑。Spring 注入给你的是<strong>代理对象</strong>，
        切面逻辑（开事务、记日志）都织在代理上。可一旦在类内部用 <code>this.xxx()</code> 调另一个方法，
        走的是真实对象自己的引用，绕过了代理，切面自然不触发：
      </p>
      <CodeBlock lang="java" title="自调用导致 @Transactional 失效" code={selfInvokeCode} />
      <p>
        三种常见解法：①把被调用的方法<strong>拆到另一个 Bean</strong>，通过注入调用（最干净）；
        ②<strong>注入自己的代理</strong>（<code>@Autowired private OrderService self;</code> 再调 <code>self.audit()</code>）；
        ③开启 <code>exposeProxy=true</code> 后用 <code>((OrderService) AopContext.currentProxy()).audit()</code>。
        根因都一样：必须让调用<strong>经过代理那一层</strong>，切面才会生效。
      </p>

      <h2>代理模式在实际中的应用</h2>
      <p>
        代理是框架里最常见的设计模式之一，下面这些场景几乎都是它在背后撑着：
      </p>
      <ul>
        <li>
          <strong>Spring AOP / 声明式事务</strong>——<code>@Transactional</code>、日志、权限切面，
          本质都是给目标方法套一层代理，在前后开关事务、记录日志。
        </li>
        <li>
          <strong>RPC 远程代理</strong>——Dubbo、Feign 给你一个本地接口，你调它就像调本地方法，
          代理在背后帮你做序列化、网络传输、反序列化（这叫<em>远程代理</em>）。
        </li>
        <li>
          <strong>MyBatis Mapper 代理</strong>——你只写一个 Mapper 接口、没有实现类，
          MyBatis 用 JDK 动态代理生成实现，把方法调用翻译成 SQL 执行。
        </li>
        <li>
          <strong>懒加载 / 虚拟代理</strong>——Hibernate 用代理实现延迟加载：先给个轻量替身，
          真正访问字段时才去查数据库。
        </li>
      </ul>

      <h3>代理模式 vs 装饰器模式</h3>
      <p>
        两者结构很像（都持有目标对象、都实现同一接口），但<strong>意图不同</strong>：
        <em>代理</em>关注的是<strong>控制访问</strong>——要不要让你访问、何时创建、是不是远程调用，
        通常代理自己负责创建/管理真实对象；<em>装饰器</em>关注的是<strong>增强功能</strong>——
        在不改原类的前提下叠加新能力，目标对象一般由外部传进来，强调可以层层嵌套。
        简单记：<strong>代理是「替你把门」，装饰器是「给你加料」</strong>。
      </p>

      <h3>代理 vs 适配器 vs 外观（结构型三兄弟）</h3>
      <p>
        这三个都「包了一层」，但意图完全不同，常被一起对比：
      </p>
      <ul>
        <li><strong>代理</strong>：接口不变，<strong>控制访问</strong>（要不要让你访问、何时创建）。</li>
        <li><strong>适配器</strong>：接口<strong>改变</strong>，把 A 接口转成客户端要的 B 接口，解决兼容。</li>
        <li><strong>装饰器</strong>：接口不变，<strong>增强功能</strong>，强调可层层叠加。</li>
        <li><strong>外观</strong>：把一堆子系统接口<strong>收敛成一个</strong>简单入口，强调简化。</li>
      </ul>
      <p>
        一句话钩子：代理控访问、适配转接口、装饰加功能、外观做简化。
      </p>

      <Callout variant="warn" title="代理不是免费的">
        <p>
          代理虽好，但每加一层都有<strong>性能与可调试性</strong>成本：反射调用比直接调用慢、
          调用栈里多了一堆 <code>$Proxy</code> / <code>$$EnhancerBySpringCGLIB$$</code> 帧，排查问题更绕。
          因此别滥用——只有真正需要「在不改源码的前提下统一织入横切逻辑」时才用代理，
          简单场景直接调用就好，否则又是一种过度设计。
        </p>
      </Callout>

      <Practice title="手写一个 JDK 动态代理">
        <p>
          下面是一个完整可运行的 JDK 动态代理例子：用 <code>InvocationHandler</code> 给 <code>UserService</code>
          的所有方法统一加上日志。把它复制到本地跑一遍，观察 <code>proxy.save</code> 调用是如何被 <code>invoke</code>
          拦截、再反射转发到真实对象的。
        </p>
        <CodeBlock lang="java" title="JdkProxyDemo.java" code={jdkProxyCode} />
        <p>
          进阶练习：把目标类的接口去掉，你会发现 <code>Proxy.newProxyInstance</code> 直接报错——
          这时只能换 CGLIB。再试着在 <code>invoke</code> 里用 try-finally 包住，模拟「事务提交/回滚」的开关。
        </p>
      </Practice>

      <Summary
        points={[
          '代理模式：给真实对象配一个实现相同接口的替身，以控制对它的访问，调用方无感知。',
          '静态代理是编译期手写的代理类，一接口一类，简单但无法扩展，工程上基本不用。',
          'JDK 动态代理基于 Proxy + InvocationHandler，用反射拦截调用，前提是目标必须实现接口。',
          'CGLIB 运行期生成目标类的子类、靠继承织入增强，无需接口，但不能代理 final 类与 final/private 方法。',
          '口诀「有接口走 JDK，没接口走 CGLIB」；Spring Boot 默认用 CGLIB，且类内自调用会让 AOP 失效。',
          '代理按用途分四种：远程代理（RPC）、虚拟代理（懒加载）、保护代理（鉴权）、智能引用代理（计数/缓存）。',
          '自调用失效根因是走 this 绕过代理，三种解法：拆 Bean、注入自身代理、AopContext.currentProxy()。',
          'CGLIB 手写要用 invokeSuper 而非 invoke，否则无限递归 StackOverflow。',
          '应用遍布 Spring AOP/事务、RPC 远程代理、MyBatis Mapper、懒加载；与装饰器的区别是「代理控制访问、装饰增强功能」。',
        ]}
      />
    </>
  )
}

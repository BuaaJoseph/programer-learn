import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Singleton from '@/courses/design-patterns/illustrations/Singleton.jsx'

const hungryCode = `// 饿汉式：类加载时就创建实例，天生线程安全，但不能懒加载
public class Hungry {

    // 类加载阶段由 JVM 保证只初始化一次，所以线程安全
    private static final Hungry INSTANCE = new Hungry();

    private Hungry() {}   // 私有构造，禁止外部 new

    public static Hungry getInstance() {
        return INSTANCE;
    }
}`

const lazyCode = `// 懒汉式（非线程安全）：用时才创建，但多线程下会创建多个实例
public class Lazy {

    private static Lazy instance;

    private Lazy() {}

    public static Lazy getInstance() {
        // 两个线程可能同时通过这个 if，于是各 new 一个
        if (instance == null) {
            instance = new Lazy();
        }
        return instance;
    }
}`

const innerClassCode = `// 静态内部类：既懒加载又线程安全，推荐写法之一
public class Holder {

    private Holder() {}

    // 内部类不会随外部类加载而加载，
    // 只有第一次调用 getInstance 才会触发，实现懒加载
    private static class Inner {
        // 类初始化由 JVM 加锁保证，所以线程安全
        private static final Holder INSTANCE = new Holder();
    }

    public static Holder getInstance() {
        return Inner.INSTANCE;
    }
}`

const dclCode = `// 写法一：双重检查锁 DCL
public class Dcl {

    // volatile 必不可少：禁止指令重排，防止拿到半初始化对象
    private static volatile Dcl instance;

    private Dcl() {}

    public static Dcl getInstance() {
        if (instance == null) {               // 第一次检查：避免每次都加锁
            synchronized (Dcl.class) {
                if (instance == null) {       // 第二次检查：防止重复创建
                    instance = new Dcl();
                }
            }
        }
        return instance;
    }
}`

const enumCode = `// 写法二：枚举单例，最安全，天然防反射与反序列化
public enum EnumSingleton {

    INSTANCE;

    public void doSomething() {
        System.out.println("枚举单例在工作");
    }
}

// 使用：EnumSingleton.INSTANCE.doSomething();`

const reflectionAttackCode = `// 反射攻击：普通单例的私有构造挡不住反射
Constructor<Dcl> c = Dcl.class.getDeclaredConstructor();
c.setAccessible(true);          // 强行打开私有构造
Dcl one = c.newInstance();      // 造出第二个实例，单例被打破！
Dcl two = Dcl.getInstance();
System.out.println(one == two); // false

// 防御：在构造方法里加判断，已存在实例就抛异常
private Dcl() {
    if (instance != null) {
        throw new IllegalStateException("已存在实例，禁止反射创建");
    }
}
// 但枚举从根上免疫：JVM 在 newInstance 里直接拒绝反射创建枚举`

const serializeAttackCode = `// 反序列化攻击：每次 readObject 都会 new 出新对象，破坏单例
// 防御：实现 readResolve，反序列化时强制返回已有实例
public class Singleton implements Serializable {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() {}
    public static Singleton getInstance() { return INSTANCE; }

    // 反序列化最后一步会调用它，用它顶替掉新 new 的对象
    private Object readResolve() {
        return INSTANCE;
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          单例模式（Singleton）要解决的问题只有一句话：<strong>保证一个类全局只有一个实例，
          并提供一个访问它的入口</strong>。听起来简单，却是面试里被追问最深的一个——
          因为它把「私有构造、懒加载、线程安全、指令重排、反射攻击」这些硬核知识点全串了起来。
        </p>
      </Lead>

      <h2>单例模式的意图与适用场景</h2>
      <p>
        GoF 对单例的定义是：<strong>保证一个类仅有一个实例，并提供一个全局访问点</strong>。
        它的两个核心承诺缺一不可——「仅有一个」（唯一性）和「全局可访问」（访问点）。
        从 UML 角色看，单例只有一个角色：<strong>Singleton</strong> 自身，它既是类、又是自己唯一实例的持有者与提供者。
      </p>
      <p>
        什么时候才真的需要它？典型场景有三类：
      </p>
      <ul>
        <li><strong>表示「物理上唯一」的资源</strong>：数据库连接池、线程池、文件系统句柄——多份反而出错或浪费。</li>
        <li><strong>无状态或状态全局一致的工具</strong>：日志器、ID 生成器、缓存、计数器。</li>
        <li><strong>全局配置中心</strong>：应用启动时加载一次配置，处处共享同一份。</li>
      </ul>
      <p>
        反过来，凡是「有请求级/会话级状态」「需要被替换以便测试」的对象都不该做成单例——这一点本章末尾会展开。
      </p>

      <h2>单例的三个共同要件</h2>
      <p>
        无论哪种写法，单例都离不开三件事：<strong>构造方法私有化</strong>（不让外部 new）、
        <strong>类内部自己持有唯一实例</strong>、<strong>对外暴露一个静态获取方法</strong>。
        各种写法的差异，本质都在回答两个问题：实例什么时候创建（懒不懒）、多线程下安不安全。
      </p>

      <h3>饿汉式：简单但不懒</h3>
      <p>
        实例在类加载时就创建好。JVM 保证类只初始化一次，所以<strong>天生线程安全</strong>。
        缺点是无论用不用都先创建，<strong>不能懒加载</strong>，可能浪费资源。
      </p>

      <h3>懒汉式：懒但不安全</h3>
      <p>
        第一次调用才创建，实现了懒加载，但裸写的判空在多线程下会<strong>同时通过 if 各创建一个</strong>，
        破坏了单例。直接加 <code>synchronized</code> 到方法上能解决，但每次获取都加锁，性能差。
      </p>

      <h3>双重检查锁 DCL：为什么必须 volatile</h3>
      <p>
        DCL 用两次判空把加锁缩小到「第一次创建」那一瞬间，兼顾性能与安全。关键的坑在
        <code>volatile</code>：<code>instance = new Dcl()</code> 这一行不是原子的，
        它包含「分配内存、初始化对象、把引用指向内存」三步，JVM 可能<strong>指令重排</strong>，
        让「引用先指向内存」而「对象还没初始化完」。此时另一个线程在第一次判空里看到
        instance 非空就直接返回，拿到的却是<strong>半初始化对象</strong>。
        加 <code>volatile</code> 禁止这种重排，问题才彻底解决。
      </p>

      <h3>静态内部类：又懒又安全</h3>
      <p>
        把实例放进一个静态内部类里。外部类加载时<strong>不会</strong>加载内部类，只有第一次调用
        getInstance 引用到内部类，才触发它的初始化——这就实现了懒加载。
        而类的初始化过程由 JVM 加锁保证只执行一次，所以又天然线程安全。写法干净，强烈推荐。
      </p>

      <h3>枚举：最安全的写法</h3>
      <p>
        《Effective Java》力荐的写法。枚举由 JVM 保证实例唯一且线程安全，更重要的是它能
        <strong>天然防反射和防反序列化</strong>：反射创建枚举会被 JDK 主动抛异常，
        反序列化也由 JVM 保证返回同一个枚举实例。其他写法都需要额外手段才能堵这两个漏洞。
      </p>

      <Example title="五种写法对比">
        <ul>
          <li><strong>饿汉式</strong> · 线程安全，<strong>不</strong>懒加载</li>
          <li><strong>懒汉式（裸）</strong> · 懒加载，<strong>非</strong>线程安全</li>
          <li><strong>DCL</strong> · 懒加载 + 线程安全（必须 volatile）</li>
          <li><strong>静态内部类</strong> · 懒加载 + 线程安全，写法最优雅</li>
          <li><strong>枚举</strong> · 线程安全 + 防反射 / 防反序列化，最安全</li>
        </ul>
      </Example>

      <Singleton />

      <h2>五种写法横向对比表</h2>
      <p>
        把懒加载、线程安全、防反射、防反序列化、推荐度五个维度拉成一张表，一眼看清各写法的取舍：
      </p>
      <table>
        <thead>
          <tr>
            <th>写法</th>
            <th>懒加载</th>
            <th>线程安全</th>
            <th>防反射</th>
            <th>防反序列化</th>
            <th>推荐度</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>饿汉式</td>
            <td>否</td>
            <td>是</td>
            <td>否</td>
            <td>需 readResolve</td>
            <td>简单场景可用</td>
          </tr>
          <tr>
            <td>裸懒汉式</td>
            <td>是</td>
            <td>否</td>
            <td>否</td>
            <td>需 readResolve</td>
            <td>不推荐</td>
          </tr>
          <tr>
            <td>DCL</td>
            <td>是</td>
            <td>是（须 volatile）</td>
            <td>否</td>
            <td>需 readResolve</td>
            <td>可用</td>
          </tr>
          <tr>
            <td>静态内部类</td>
            <td>是</td>
            <td>是</td>
            <td>否</td>
            <td>需 readResolve</td>
            <td>推荐</td>
          </tr>
          <tr>
            <td>枚举</td>
            <td>否</td>
            <td>是</td>
            <td>是（天然）</td>
            <td>是（天然）</td>
            <td>最推荐</td>
          </tr>
        </tbody>
      </table>

      <h2>两个被忽视的攻击面：反射与反序列化</h2>
      <p>
        面试官追问完 DCL，下一刀往往就是「私有构造真的拦得住所有人吗」。答案是：<strong>拦不住反射</strong>。
        通过 <code>setAccessible(true)</code> 可以强行打开私有构造，造出第二个实例，单例被打破：
      </p>
      <CodeBlock lang="java" title="反射攻击与防御" code={reflectionAttackCode} />
      <p>
        第二个口子是<strong>反序列化</strong>：每次 <code>readObject</code> 都会通过反射 new 出一个新对象，
        同样破坏唯一性。防御手段是实现 <code>readResolve</code>，让反序列化最后用已有实例顶替掉新对象：
      </p>
      <CodeBlock lang="java" title="反序列化攻击与防御" code={serializeAttackCode} />
      <p>
        而这两个口子，<strong>枚举单例天生免疫</strong>：JVM 在 <code>Constructor.newInstance</code> 里
        显式禁止反射创建枚举，反序列化也由 JVM 保证返回同一枚举实例。这正是《Effective Java》力荐枚举的根本原因。
      </p>

      <KeyIdea title="volatile 防的是「半成品对象」">
        <p>
          DCL 里 volatile 的作用常被误说成「保证可见性」。更精确地说，这里它真正解决的是
          <strong>指令重排导致的安全发布问题</strong>：禁止「引用赋值」越过「对象初始化」提前发生，
          从而保证任何线程看到非空 instance 时，对象一定<strong>已经完整初始化</strong>。
          这是 DCL 面试的标准追问，答出「半初始化对象」这五个字就拿分了。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="单例不是想用就用">
        <p>
          单例把对象生命周期变成全局可见，容易变成<strong>变相的全局变量</strong>，
          带来隐式依赖、难以单元测试、状态共享引发并发问题等隐患。
          配置类、连接池、日志器这类「确实全局唯一且无状态或状态可控」的对象才适合用单例，
          普通业务对象别滥用。
        </p>
      </Callout>

      <h2>单例的常见误用与争议</h2>
      <p>
        很多人把单例当成「方便取对象」的捷径，结果埋下不少坑：
      </p>
      <ul>
        <li>
          <strong>变相全局变量</strong>：单例的可变状态会被任意代码随时读写，并发下极易出现脏数据，
          且这种依赖是<em>隐式</em>的——从方法签名根本看不出它偷偷用了哪个单例。
        </li>
        <li>
          <strong>难以单元测试</strong>：单例把依赖写死在静态方法里，测试时无法替换成 mock；
          而且单例的状态会跨测试用例残留，导致用例之间互相污染。这正是 DIP（依赖注入）更受欢迎的原因。
        </li>
        <li>
          <strong>类加载器/多实例陷阱</strong>：在多个 ClassLoader（如某些容器、热部署环境）下，
          同一个单例类可能被加载多份，「全局唯一」在 JVM 层面就不再成立。
        </li>
        <li>
          <strong>过早优化</strong>：为「省一次创建」而上单例，往往得不偿失；现代对象创建极快，
          除非确有唯一性语义，否则普通对象 + 依赖注入更清晰。
        </li>
      </ul>
      <p>
        正因如此，社区里一直有「单例是反模式」的声音。更准确的说法是：<strong>单例适合表达「唯一性」的语义，
        但不该被用来做「全局取值」的偷懒</strong>。需要全局共享时，优先交给 IoC 容器以单例作用域管理 Bean，
        而不是自己写静态单例——这样既保留唯一性，又能注入、能替换、能测试。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        实际开发里我们很少手写单例，因为 <strong>Spring 的 Bean 默认就是单例</strong>（singleton 作用域），
        容器帮你保证唯一性，各种 <code>@Configuration</code> 配置类、Service、连接池都靠它管理。
        面试被问「单例怎么写」，建议主线答<strong>静态内部类</strong>（优雅）和<strong>枚举</strong>（最安全），
        再用 DCL 的 volatile 展示你懂底层，最后点一句「工程里一般交给 Spring」。
      </p>
      <p>
        几个高频追问预先备好答案：<strong>「Spring 的单例和 GoF 单例一样吗」</strong>——不一样，
        GoF 单例是「整个 JVM 一个实例」，Spring 单例是「每个<em>容器</em>、每个 beanName 一个实例」，
        作用域不同；<strong>「DCL 不加 volatile 会怎样」</strong>——可能拿到半初始化对象，答出「指令重排 + 安全发布」；
        <strong>「为什么枚举最安全」</strong>——天然防反射与反序列化，且写法最简；
        <strong>「单例有什么缺点」</strong>——隐式全局依赖、难测试、可变状态并发风险，建议交给容器管理。
      </p>

      <Practice title="手写 DCL 与枚举两种单例">
        <p>
          下面是面试最常要求手写的两种：双重检查锁与枚举。重点记住 DCL 的两次判空和那个
          关键的 <code>volatile</code>，以及枚举写法为何能一行解决所有安全问题。
        </p>
        <CodeBlock lang="java" title="双重检查锁 DCL" code={dclCode} />
        <CodeBlock lang="java" title="枚举单例" code={enumCode} />
        <p>
          对照参考：饿汉、懒汉、静态内部类三种写法的骨架如下，注意它们在懒加载与线程安全上的取舍。
        </p>
        <CodeBlock lang="java" title="饿汉式" code={hungryCode} />
        <CodeBlock lang="java" title="懒汉式（非线程安全）" code={lazyCode} />
        <CodeBlock lang="java" title="静态内部类" code={innerClassCode} />
      </Practice>

      <Summary
        points={[
          '单例三要件：私有构造、内部持有唯一实例、对外暴露静态获取方法，差异都在懒加载与线程安全的取舍。',
          '饿汉式线程安全但不懒；裸懒汉式懒加载但非线程安全，会创建多个实例。',
          'DCL 用两次判空把加锁缩到创建瞬间，volatile 必不可少，作用是禁止指令重排、防止拿到半初始化对象。',
          '静态内部类利用「内部类延迟加载 + JVM 类初始化加锁」做到又懒又安全，是最优雅的写法。',
          '枚举单例最安全，天然防反射与反序列化，是《Effective Java》推荐的首选。',
          '普通单例挡不住反射（setAccessible 强开私有构造）和反序列化（每次 readObject 造新对象），需构造判空 + readResolve 防御。',
          '单例适合表达「唯一性」语义（连接池、日志器、配置），但用作「全局取值」会带来隐式依赖、难测试、并发风险。',
          'Spring 单例是「每容器每 beanName 一个」，与 GoF「整个 JVM 一个」作用域不同；工程中优先交给容器管理而非手写静态单例。',
        ]}
      />
    </>
  )
}

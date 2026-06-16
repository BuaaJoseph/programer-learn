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

      <h2>实战 / 面试怎么答</h2>
      <p>
        实际开发里我们很少手写单例，因为 <strong>Spring 的 Bean 默认就是单例</strong>（singleton 作用域），
        容器帮你保证唯一性，各种 <code>@Configuration</code> 配置类、Service、连接池都靠它管理。
        面试被问「单例怎么写」，建议主线答<strong>静态内部类</strong>（优雅）和<strong>枚举</strong>（最安全），
        再用 DCL 的 volatile 展示你懂底层，最后点一句「工程里一般交给 Spring」。
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
          '工程中很少手写单例，Spring Bean 默认即单例，配置类、连接池、日志器是典型应用场景。',
        ]}
      />
    </>
  )
}

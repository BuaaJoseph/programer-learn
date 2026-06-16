import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ParentDelegation from '@/courses/jvm/illustrations/ParentDelegation.jsx'

const delegationCode = `// 双亲委派的核心逻辑（ClassLoader.loadClass 简化版）
protected Class<?> loadClass(String name, boolean resolve) {
    synchronized (getClassLoadingLock(name)) {
        Class<?> c = findLoadedClass(name);   // 1. 检查是否已加载
        if (c == null) {
            try {
                if (parent != null) {
                    c = parent.loadClass(name, false);  // 2. 先委派给父加载器
                } else {
                    c = findBootstrapClassOrNull(name); // 顶层交给 Bootstrap
                }
            } catch (ClassNotFoundException ignore) {}
            if (c == null) {
                c = findClass(name);          // 3. 父加载不了，才自己加载
            }
        }
        return c;
    }
}`

const customLoaderCode = `// 自定义类加载器：只需重写 findClass，复用双亲委派
public class MyClassLoader extends ClassLoader {
    private final String baseDir;

    public MyClassLoader(String baseDir) { this.baseDir = baseDir; }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] bytes = loadClassBytes(name);   // 从磁盘/网络读取字节
        if (bytes == null) throw new ClassNotFoundException(name);
        return defineClass(name, bytes, 0, bytes.length); // 字节 -> Class
    }

    private byte[] loadClassBytes(String name) {
        // 把全限定名转成路径，读取 .class 字节，省略具体 IO
        return null;
    }
}`

const tccCode = `// SPI 用线程上下文类加载器"反向"加载实现类
public final class ServiceLoaderDemo {
    public static void main(String[] args) {
        // ServiceLoader 内部就是用 TCCL 去加载 classpath 上的实现
        ServiceLoader<Driver> loaders = ServiceLoader.load(Driver.class);
        for (Driver d : loaders) {
            System.out.println("发现实现：" + d.getClass().getName());
        }
    }
    // 等价地，可以手动设置/获取上下文类加载器：
    // ClassLoader cl = Thread.currentThread().getContextClassLoader();
    // Thread.currentThread().setContextClassLoader(myLoader);
}`

const identityCode = `// 同一份字节，被两个不同加载器各加载一次，得到两个互不相等的类
MyClassLoader l1 = new MyClassLoader("/app");
MyClassLoader l2 = new MyClassLoader("/app");

Class<?> c1 = l1.loadClass("com.demo.Foo");
Class<?> c2 = l2.loadClass("com.demo.Foo");

System.out.println(c1 == c2);          // false！加载器不同 -> 类不同
Object foo = c1.getDeclaredConstructor().newInstance();
System.out.println(foo instanceof /* c2 的 Foo */ Object); // 用 c2.Foo 判断会是 false
// 经典报错：ClassCastException: com.demo.Foo cannot be cast to com.demo.Foo
// 看起来同名却 cast 不了，根因就是加载器不同`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章讲了类怎么被加载，这一章回答「由谁来加载」。JVM 里有好几种类加载器，它们之间不是各干各的，
          而是按一套「向上委派」的规矩协作，这就是<em>双亲委派模型</em>（Parent Delegation Model）。
          它是核心类安全的基石，也是面试里被反复追问「为什么、怎么打破」的高频考点。
        </p>
      </Lead>

      <h2>三类内置加载器</h2>
      <p>
        从上到下，JVM 默认有三层类加载器，各管一摊：
      </p>
      <ul>
        <li>
          <strong>启动类加载器</strong>（<em>Bootstrap ClassLoader</em>）：最顶层，用 C++ 实现、不是 Java 对象，
          负责加载 <code>JAVA_HOME/lib</code> 下的核心类（如 <code>rt.jar</code> 里的 <code>java.lang.*</code>）。
        </li>
        <li>
          <strong>扩展类加载器</strong>（<em>Extension ClassLoader</em>，JDK9 后改名 <em>Platform ClassLoader</em>）：
          加载 <code>lib/ext</code> 或平台模块里的类。
        </li>
        <li>
          <strong>应用类加载器</strong>（<em>Application ClassLoader</em>，也叫系统类加载器）：加载 classpath 上我们自己写的类，是默认的加载器。
        </li>
      </ul>
      <p>
        三者之外，开发者还能写<strong>自定义类加载器</strong>，挂在这条链的下方，用于热部署、加密类、隔离等场景。
        要注意这里的「父」是<em>组合</em>关系（通过 <code>parent</code> 字段持有），不是继承关系。
      </p>
      <Callout variant="tip" title="为什么 Bootstrap 用 C++ 写、getClassLoader 返回 null">
        <p>
          一个常见追问：<code>String.class.getClassLoader()</code> 返回什么？答案是 <code>null</code>——
          因为 <code>String</code> 由 Bootstrap 加载，而 Bootstrap 是 JVM 用 C++ 实现的、根本不是一个 Java 的
          <code>ClassLoader</code> 对象，所以在 Java 层用 <code>null</code> 表示它。
          为什么要用 C++ 写？因为它要在 JVM 启动最早期就把 <code>Object</code>、<code>ClassLoader</code> 这些类加载进来——
          可那时连 Java 的类加载器本身都还没法用，只能由原生代码兜底。这是「先有鸡还是先有蛋」的工程解法。
        </p>
      </Callout>

      <h2>双亲委派的流程</h2>
      <p>
        当一个加载器收到加载某个类的请求时，它不会自己先动手，而是：
      </p>
      <ul>
        <li>先把请求<strong>向上委派</strong>给父加载器，父加载器再往上委派，直到顶层 Bootstrap；</li>
        <li>父加载器能加载就由它加载、直接返回；</li>
        <li>只有当所有父加载器都<strong>加载不了</strong>（在自己负责的范围里找不到）时，子加载器才自己调 <code>findClass</code> 去加载。</li>
      </ul>
      <CodeBlock lang="java" title="loadClass 委派逻辑" code={delegationCode} />
      <p>
        读这段源码要抓住三个关键点：其一，<code>findLoadedClass</code> 保证已加载的类直接复用，不会重复加载；
        其二，<code>synchronized (getClassLoadingLock(name))</code> 说明类加载是<strong>按类名加锁</strong>的，
        保证并发下同一个类只被加载一次（JDK7 起用细粒度的 per-name 锁，避免了早期对整个 loader 加锁的并发瓶颈）；
        其三，委派是<strong>递归</strong>的——每一层都先问父亲，所以请求总会一路上到 Bootstrap 才开始「自上而下」地尝试加载。
      </p>

      <Example title="自己写一个 java.lang.String 会怎样">
        <p>
          假设你在自己工程里建一个 <code>java.lang.String</code>，里面写个 <code>main</code> 想运行。结果是：
          这个类<strong>永远加载不了你的版本</strong>。因为应用类加载器拿到加载 <code>java.lang.String</code> 的请求后，
          会一路向上委派到 Bootstrap，而 Bootstrap 在核心库里找到了官方的 <code>String</code> 并加载返回，
          你的版本根本没机会被加载。而且你那个类里也根本没有标准的 <code>main</code> 入口，会直接报错。
        </p>
        <p>
          这正是双亲委派要的效果：核心类只会被顶层加载器加载一次，<strong>不会被篡改、也不会重复加载</strong>。
          补一个边界：JDK 还有「<strong>包密封</strong>」保护——禁止用户定义 <code>java.*</code> 开头的包，
          就算你想绕过委派去 <code>defineClass</code> 一个 <code>java.lang.Evil</code>，也会被 <code>SecurityException</code> 拦下。
        </p>
      </Example>

      <ParentDelegation />

      <KeyIdea title="双亲委派带来的两个好处">
        <p>
          一是<strong>安全</strong>：像 <code>java.lang.*</code> 这样的核心类始终由 Bootstrap 加载，
          用户无法用同名类替换掉它们，杜绝了核心 API 被恶意篡改的风险。二是<strong>避免重复加载</strong>：
          同一个类沿着委派链只会被某一层加载一次，保证了类在 JVM 里的<em>唯一性</em>。
          注意：JVM 判断「两个类是否相等」的依据是<strong>全限定名 + 加载它的 ClassLoader</strong>，
          所以同一个 <code>.class</code> 被两个不同的加载器加载，会被当成两个不同的类，互相 <code>instanceof</code> 不通过。
        </p>
      </KeyIdea>
      <Example title="同名类却 cast 不了：ClassLoader 决定类的身份">
        <p>
          「全限定名 + ClassLoader」共同决定类的身份，这条规则在实战里会冒出诡异的
          <code>ClassCastException</code>：报错信息里两边类名一模一样，却就是转不了。根因就是它俩出自不同的加载器。
        </p>
        <CodeBlock lang="java" title="两个加载器加载同名类" code={identityCode} />
        <p>
          这类问题在 OSGi、热部署、插件化框架里很常见——重新加载后旧对象和新类的加载器不同，
          残留的旧引用一 cast 就炸。理解了「类的身份带上了加载器」，这种 bug 才不会让你抓狂。
        </p>
      </Example>

      <Callout variant="warn" title="哪些场景打破了双亲委派">
        <p>
          双亲委派不是铁律，下面三类场景就主动打破了它：
        </p>
        <ul>
          <li>
            <strong>SPI</strong>：像 JDBC、JNDI 这种核心接口在 <code>rt.jar</code>（由 Bootstrap 加载），但实现是第三方 jar
            （在 classpath，得由应用加载器加载）。父加载器没法「向下」加载子加载器的类，于是用<em>线程上下文类加载器</em>
            （Thread Context ClassLoader）打破委派，反向去加载实现。
          </li>
          <li>
            <strong>Tomcat 等容器</strong>：为了让多个 Web 应用各自隔离、且能用不同版本的同名库，每个应用有自己的 WebappClassLoader，
            对 Web 应用的类<em>优先自己加载</em>（先 findClass 再委派），实现类隔离。
          </li>
          <li>
            <strong>JDK9 模块化</strong>：引入模块系统后，类加载从单纯的委派变成了先按模块归属定位，再委派，规则被重构。
          </li>
        </ul>
      </Callout>
      <Example title="SPI 为什么不得不打破委派">
        <p>
          以 JDBC 为例：<code>java.sql.Driver</code> 接口由 Bootstrap 加载，但 MySQL 的实现类在第三方 jar 里，
          只能由应用类加载器加载。<code>DriverManager</code>（核心库）要 new 出 MySQL 的实现，
          可它自己的加载器（Bootstrap）<strong>看不见</strong> classpath 上的实现类——委派只能向上、不能向下。
          于是 JDK 让它取<strong>线程上下文类加载器</strong>（默认是应用类加载器），反过来加载实现，硬生生「逆流」了一把。
        </p>
        <CodeBlock lang="java" title="ServiceLoader / TCCL 的用法" code={tccCode} />
        <p>
          所以 TCCL 本质是给「父加载器想用子加载器的类」开的一道后门。理解了这个动机，
          你就明白为什么各种框架（JDBC、JAXP、Spring）里到处是 <code>getContextClassLoader()</code>。
        </p>
      </Example>

      <h2>实战与面试怎么答</h2>
      <p>
        被问双亲委派，标准答法是三步：先说三类加载器及各自范围，再讲「向上委派、父加载不了才自己加载」的流程，
        最后点出好处是核心类安全、避免重复加载。如果面试官追问「怎么打破」，就抛出 SPI 的线程上下文类加载器、
        Tomcat 的类隔离、JDK9 模块化三个例子。再补一句「类的唯一性由全限定名加 ClassLoader 共同决定」，深度就够了。
      </p>
      <p>
        高频追问：<strong>「String.class.getClassLoader() 返回啥？」</strong>——null，因为 Bootstrap 是 C++ 实现、非 Java 对象。
        <strong>「打破委派要重写哪个方法？」</strong>——重写 <code>loadClass</code>（改委派顺序）；遵守委派只需重写
        <code>findClass</code>。<strong>「为什么会出现同名类 cast 不了？」</strong>——两个不同加载器加载，类身份不同。
        <strong>「双亲委派的『双亲』是继承吗？」</strong>——不是，是组合（<code>parent</code> 字段），翻译用词其实有点误导。
      </p>

      <Practice title="写一个自定义类加载器">
        <p>
          自定义类加载器的正确姿势是<strong>只重写 <code>findClass</code></strong>，而不是 <code>loadClass</code>——
          这样能复用父类 <code>loadClass</code> 里的双亲委派逻辑，只在「父加载器都加载不了」时才轮到你的 <code>findClass</code>。
          核心是在 <code>findClass</code> 里读取字节，再用 <code>defineClass</code> 把字节变成 <code>Class</code> 对象。
        </p>
        <CodeBlock lang="java" title="MyClassLoader.java" code={customLoaderCode} />
        <p>
          如果确实需要打破委派（比如做类隔离），才去重写 <code>loadClass</code> 改变委派顺序，但要清楚这会牺牲掉双亲委派的安全保障。
        </p>
        <p>
          进阶实验：用<strong>两个</strong> <code>MyClassLoader</code> 实例各加载同一个 <code>.class</code>，
          打印 <code>c1 == c2</code>（会是 false），再把 <code>c1</code> 的实例强转成 <code>c2</code> 的类型，
          亲手复现那个「同名却 ClassCastException」的报错——这是把「类身份 = 全限定名 + 加载器」刻进脑子的最快方式。
        </p>
      </Practice>

      <Summary
        points={[
          '三类内置加载器：Bootstrap（核心类，C++ 实现、getClassLoader 返回 null）、Extension/Platform（扩展）、Application（classpath），下面还可挂自定义加载器。',
          '双亲委派：收到请求先向上委派给父加载器，父加载不了时子加载器才自己加载；loadClass 按类名加锁、保证只加载一次。',
          '好处一是核心类安全、不被同名类篡改（还有包密封禁止定义 java.* 包），二是同一个类只加载一次、保证唯一性。',
          '类的相等由「全限定名 + 加载它的 ClassLoader」共同决定，不同加载器加载的同名类互不相等，会引发诡异的 ClassCastException。',
          '打破委派的典型场景：SPI 用线程上下文类加载器反向加载实现、Tomcat 类隔离、JDK9 模块化。',
          '遵守委派只重写 findClass、复用 loadClass；要改委派顺序才重写 loadClass。用 defineClass 把字节转成 Class。',
        ]}
      />
    </>
  )
}

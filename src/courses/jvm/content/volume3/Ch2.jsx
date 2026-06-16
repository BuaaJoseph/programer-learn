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

      <Example title="自己写一个 java.lang.String 会怎样">
        <p>
          假设你在自己工程里建一个 <code>java.lang.String</code>，里面写个 <code>main</code> 想运行。结果是：
          这个类<strong>永远加载不了你的版本</strong>。因为应用类加载器拿到加载 <code>java.lang.String</code> 的请求后，
          会一路向上委派到 Bootstrap，而 Bootstrap 在核心库里找到了官方的 <code>String</code> 并加载返回，
          你的版本根本没机会被加载。而且你那个类里也根本没有标准的 <code>main</code> 入口，会直接报错。
        </p>
        <p>
          这正是双亲委派要的效果：核心类只会被顶层加载器加载一次，<strong>不会被篡改、也不会重复加载</strong>。
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

      <h2>实战与面试怎么答</h2>
      <p>
        被问双亲委派，标准答法是三步：先说三类加载器及各自范围，再讲「向上委派、父加载不了才自己加载」的流程，
        最后点出好处是核心类安全、避免重复加载。如果面试官追问「怎么打破」，就抛出 SPI 的线程上下文类加载器、
        Tomcat 的类隔离、JDK9 模块化三个例子。再补一句「类的唯一性由全限定名加 ClassLoader 共同决定」，深度就够了。
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
      </Practice>

      <Summary
        points={[
          '三类内置加载器：Bootstrap（核心类）、Extension/Platform（扩展）、Application（classpath），下面还可挂自定义加载器。',
          '双亲委派：收到请求先向上委派给父加载器，父加载不了时子加载器才自己加载。',
          '好处一是核心类安全、不被同名类篡改，二是同一个类只加载一次、保证唯一性。',
          '类的相等由「全限定名 + 加载它的 ClassLoader」共同决定，不同加载器加载的同名类互不相等。',
          '打破委派的典型场景：SPI 用线程上下文类加载器、Tomcat 类隔离、JDK9 模块化。',
          '自定义类加载器应只重写 findClass 以复用委派，用 defineClass 把字节转成 Class。',
        ]}
      />
    </>
  )
}

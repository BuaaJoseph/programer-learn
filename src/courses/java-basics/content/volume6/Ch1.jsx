import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const phaseSnippet = `类的生命周期（七个阶段）：

加载 Loading
  └─ 连接 Linking
       ├─ 验证 Verification   // 校验字节码合法、安全
       ├─ 准备 Preparation    // 为静态变量分配内存、赋「零值」（不是初始值！）
       └─ 解析 Resolution     // 符号引用 -> 直接引用
  └─ 初始化 Initialization     // 执行静态变量赋初值 + 静态代码块（<clinit>）
  └─ 使用 Using
  └─ 卸载 Unloading

口诀：加载 - 验证 - 准备 - 解析 - 初始化（连接含验证/准备/解析三步）`

const prepareSnippet = `class Demo {
    static int a = 10;        // 准备阶段：a 先被赋「零值」0
                              // 初始化阶段：才执行 a = 10
    static final int B = 20;  // 常量：准备阶段就直接是 20（编译期常量）
}
// 准备阶段后：a == 0, B == 20
// 初始化阶段后：a == 10`

const initTriggerSnippet = `// 触发「初始化」的典型时机（主动引用）：
// 1) new 对象、读写静态字段（非常量）、调用静态方法
// 2) 反射 Class.forName("X")（默认初始化）
// 3) 初始化子类会先初始化父类
// 4) main 方法所在类

// 不会触发初始化（被动引用）：
System.out.println(Child.PARENT_CONST);  // 引用常量不会初始化定义类
Parent[] arr = new Parent[10];           // 创建数组不会初始化元素类型
System.out.println(Child.parentStatic);  // 通过子类访问父类静态字段，只初始化父类`

const parentDelegationSnippet = `// 双亲委派的核心逻辑（ClassLoader.loadClass 简化版）
protected Class<?> loadClass(String name) {
    // 1) 先查是否已加载
    Class<?> c = findLoadedClass(name);
    if (c == null) {
        if (parent != null) {
            c = parent.loadClass(name);   // 2) 向上委派给父加载器
        } else {
            c = findBootstrapClass(name); // 顶层是启动类加载器
        }
        if (c == null) {
            c = findClass(name);          // 3) 父加载器加载不了，自己才尝试
        }
    }
    return c;
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        类加载机制是 JVM 体系里既底层又高频的考点。本章讲清一个类从加载到卸载经历哪些阶段、
        每个阶段干什么（尤其「准备」和「初始化」的区别）、双亲委派模型是什么、它如何保证核心类库安全，
        以及什么时候需要打破它。把这块讲透，类加载相关的题都能拿下。
      </Lead>

      <h2>一、类加载过程</h2>
      <KeyIdea>
        一个类从被加载到卸载，要经过<strong>加载 → 连接（验证、准备、解析）→ 初始化 → 使用 → 卸载</strong>。
        其中前五个阶段是「准备就绪」的过程，记忆口诀是「<strong>加载、验证、准备、解析、初始化</strong>」。
        最容易混的是「准备」和「初始化」——前者只赋零值，后者才赋真正的初始值。
      </KeyIdea>
      <CodeBlock lang="text" title="类的生命周期阶段" code={phaseSnippet} />

      <h3>面试题 1：类加载的过程是怎样的？</h3>
      <ul>
        <li><strong>加载（Loading）</strong>：通过类的全限定名找到 .class 字节流，转成方法区的运行时数据结构，并在堆里生成代表它的 <code>Class</code> 对象。</li>
        <li><strong>验证（Verification）</strong>：校验字节码格式合法、不会危害 JVM 安全（如检查魔数、栈映射）。</li>
        <li><strong>准备（Preparation）</strong>：为<strong>静态变量</strong>在方法区分配内存并赋<strong>零值</strong>（int 给 0、引用给 null），<strong>不是</strong>代码里写的初始值。</li>
        <li><strong>解析（Resolution）</strong>：把常量池里的<strong>符号引用</strong>替换成<strong>直接引用</strong>（真实内存地址/偏移）。</li>
        <li><strong>初始化（Initialization）</strong>：执行类构造器 <code>{'<clinit>'}</code>——给静态变量赋真正的初始值、执行静态代码块。</li>
      </ul>
      <CodeBlock lang="java" title="准备 vs 初始化：零值与初始值" code={prepareSnippet} />
      <Callout variant="warn" title="易错点：准备阶段赋的是零值，不是初始值">
        <code>static int a = 10</code>，在<strong>准备</strong>阶段 a 是 0，到<strong>初始化</strong>阶段才变成 10。
        但 <code>static final int B = 20</code> 这种编译期常量，准备阶段就直接是 20（被放进常量池）。
        这个区别是面试常设的陷阱，务必分清。
      </Callout>
      <Callout variant="note" title="什么时候才会「初始化」？">
        类加载不一定立刻初始化。只有发生「主动引用」时才触发：new 对象、读写非常量静态字段、调静态方法、
        反射、初始化子类先初始化父类、main 类。而引用常量、创建数组、通过子类访问父类静态字段属于「被动引用」，不会初始化该类。
      </Callout>
      <CodeBlock lang="java" title="主动引用 vs 被动引用" code={initTriggerSnippet} />

      <h2>二、类加载器与双亲委派</h2>
      <h3>面试题 2：有哪些类加载器？</h3>
      <p>
        JVM 内置三层类加载器，各自负责加载不同范围的类，构成父子层级（注意这里的「父」是组合关系，不是继承）：
      </p>
      <table>
        <thead>
          <tr><th>类加载器</th><th>负责加载</th></tr>
        </thead>
        <tbody>
          <tr><td>启动类加载器（Bootstrap）</td><td>核心类库 <code>{'<JAVA_HOME>'}/lib</code>（如 java.lang.*），C++ 实现</td></tr>
          <tr><td>扩展/平台类加载器（Ext/Platform）</td><td>扩展库（JDK 9+ 改名 PlatformClassLoader）</td></tr>
          <tr><td>应用类加载器（App/System）</td><td>classpath 上我们自己写的类</td></tr>
          <tr><td>自定义类加载器</td><td>继承 ClassLoader，实现热部署、加密类加载等</td></tr>
        </tbody>
      </table>

      <h3>面试题 3：什么是双亲委派模型？</h3>
      <KeyIdea>
        双亲委派（Parent Delegation）：一个类加载器收到加载请求时，<strong>先把请求委派给父加载器</strong>，
        层层向上直到启动类加载器；只有父加载器表示「我加载不了」，子加载器才自己尝试加载。
        简言之就是「<strong>能交给上面就交给上面，上面搞不定我才动手</strong>」。
      </KeyIdea>
      <CodeBlock lang="java" title="双亲委派的逻辑" code={parentDelegationSnippet} />

      <h3>面试题 4：双亲委派有什么好处？</h3>
      <ul>
        <li><strong>避免重复加载</strong>：同一个类只会被加载一次，父加载器加载过的子加载器不再重复加载。</li>
        <li><strong>保证核心类库安全</strong>：用户即使写一个 <code>java.lang.String</code>，请求也会被委派到启动类加载器，最终加载的是 JDK 真正的 String，恶意/错误的同名核心类无法顶替——这是最关键的安全保障。</li>
      </ul>
      <Example title="为什么自己写的 java.lang.String 不会生效？">
        <p>
          假设你在自己包里放了个 <code>java.lang.String</code>。当应用加载器要加载它时，
          会先委派给父、再到启动类加载器，而启动类加载器在核心库里找到了「正版」String 并加载返回。
          于是你的山寨 String 根本没机会被加载。这就是双亲委派对核心类库的保护：<strong>越核心的类，越靠上层加载，无法被下层覆盖</strong>。
        </p>
      </Example>

      <h3>面试题 5：什么情况下需要打破双亲委派？</h3>
      <p>
        双亲委派不是铁律。有些场景下「上层加载器需要用到下层的实现」，就得打破它：
      </p>
      <ul>
        <li><strong>SPI / JDBC</strong>：接口（如 <code>Driver</code>）由启动类加载器加载，但实现（MySQL 驱动）在 classpath、由应用加载器加载。启动类加载器「看不到」下层的实现，于是引入<strong>线程上下文类加载器（ContextClassLoader）</strong>反向委派给下层加载，这是经典的打破场景。</li>
        <li><strong>热部署 / 模块隔离</strong>：Tomcat 为每个 Web 应用配独立类加载器，让不同应用的同名类互不干扰；OSGi 更是完全自定义的网状加载模型。</li>
      </ul>
      <Callout variant="tip" title="打破方式：重写 loadClass 或用上下文加载器">
        打破双亲委派通常有两条路：① 重写 <code>loadClass</code> 改变委派逻辑（如 Tomcat 的 WebappClassLoader 优先加载自己的类）；
        ② 用线程上下文类加载器，让上层代码能加载到下层的类（SPI 的做法）。面试能举出 JDBC/Tomcat 两个例子就很扎实。
      </Callout>

      <h3>面试题 6：「类的初始化」和「对象的初始化」有什么区别？</h3>
      <p>
        这两个「初始化」常被混为一谈，其实层次完全不同：<strong>类初始化</strong>是给类的<strong>静态成员</strong>赋值、
        执行静态块，整个类生命周期里<strong>只发生一次</strong>，对应方法 <code>{'<clinit>'}</code>；
        <strong>对象初始化</strong>是 new 时给<strong>实例字段</strong>赋值、执行实例块和构造器，<strong>每 new 一次就发生一次</strong>，对应 <code>{'<init>'}</code>。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>类初始化 {'<clinit>'}</th><th>对象初始化 {'<init>'}</th></tr>
        </thead>
        <tbody>
          <tr><td>初始化什么</td><td>静态变量、静态代码块</td><td>实例字段、实例块、构造器</td></tr>
          <tr><td>次数</td><td>一个类只一次</td><td>每次 new 都执行</td></tr>
          <tr><td>触发</td><td>首次主动引用</td><td>每次创建对象</td></tr>
        </tbody>
      </table>
      <Example title="静态块、实例块、构造器的执行顺序">
        <p>
          创建一个有继承关系的对象时，执行顺序是：父类静态块/静态字段 → 子类静态块/静态字段（这一段只在类首次加载时跑一次）→
          父类实例块/字段 → 父类构造器 → 子类实例块/字段 → 子类构造器。
          一句话总结：<strong>静态的先于实例的，父类的先于子类的，字段/块按书写顺序执行，构造器最后</strong>。
          这个顺序题在笔试里很常见，理解了「类初始化只一次、对象初始化每次都来」就不会答错。
        </p>
      </Example>
      <Callout variant="note" title="clinit 是线程安全的">
        JVM 保证 <code>{'<clinit>'}</code> 在多线程下只被执行一次：多个线程同时首次访问一个类时，
        只有一个线程能执行类初始化，其余线程阻塞等待。这正是「静态内部类单例」线程安全的底层依据——
        利用类初始化的这把隐式锁，无需自己加 synchronized 就能保证单例只创建一次。
      </Callout>

      <h3>面试题 7：加载同一个类两次，会得到同一个 Class 对象吗？</h3>
      <p>
        关键看「<strong>由哪个类加载器加载</strong>」。JVM 判定「同一个类」的依据是
        <strong>「全限定类名 + 类加载器」</strong>这个二元组。同一个类加载器加载同名类只会得到一个 Class
        （加载过就缓存复用）；但<strong>不同类加载器</strong>各自加载同名类，会得到<strong>两个互不相等的 Class 对象</strong>。
      </p>
      <ul>
        <li>同一加载器 + 同名类 → 同一个 Class（缓存）。</li>
        <li>不同加载器 + 同名类 → 不同 Class，互相 <code>instanceof</code>/强转会失败。</li>
      </ul>
      <Callout variant="warn" title="经典报错：ClassCastException 同名类却转不了">
        有时会遇到「明明是同一个类名，强转却抛 ClassCastException」的诡异现象，根因往往就是
        <strong>两个类加载器各加载了一份</strong>，在 JVM 看来它们是两个不同的类。
        热部署、OSGi、不同 ClassLoader 隔离的场景里特别容易踩。理解「类的身份 = 类名 + 加载器」就能解释这类问题。
      </Callout>

      <h3>面试题 8：类什么时候会被卸载？</h3>
      <p>
        类卸载（Unloading）远比对象回收苛刻，要同时满足：① 该类的<strong>所有实例</strong>都已被回收；
        ② 加载该类的<strong>类加载器</strong>已被回收；③ 该类的 <code>Class</code> 对象没有任何引用、无法在任何地方通过反射访问。
      </p>
      <Callout variant="note" title="为什么核心类几乎不会被卸载？">
        由启动类加载器加载的核心类库（如 java.lang.*），其类加载器伴随 JVM 整个生命周期，永不被回收，
        所以这些类<strong>基本不会被卸载</strong>。类卸载主要发生在「自定义类加载器 + 频繁加载动态类」的场景
        （如 OSGi、JSP 热部署、大量动态代理）。这也是这类系统要特别关注元空间（Metaspace）内存的原因。
      </Callout>

      <Summary
        points={[
          '类生命周期：加载 → 连接（验证、准备、解析）→ 初始化 → 使用 → 卸载；口诀「加载、验证、准备、解析、初始化」。',
          '准备阶段给静态变量赋零值（int 0、引用 null），初始化阶段才赋真正初始值并执行静态块；编译期常量在准备阶段就是终值。',
          '初始化由主动引用触发（new/读写静态字段/静态方法/反射/初始化子类/main）；引用常量、建数组、子类访问父类静态字段是被动引用不触发。',
          '三层类加载器：Bootstrap（核心库）、Platform/Ext、App（classpath），加上自定义加载器，构成父子委派层级。',
          '双亲委派：先向上委派父加载器，父加载不了子才加载；好处是避免重复加载、保护核心类库（山寨 java.lang.String 无法顶替正版）。',
          '需打破双亲委派的场景：SPI/JDBC 用线程上下文类加载器反向加载下层实现；Tomcat/OSGi 为隔离与热部署自定义加载逻辑。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const reflectBasicSnippet = `// 获取 Class 对象的三种方式
Class<?> c1 = String.class;                 // 类字面量
Class<?> c2 = "hi".getClass();              // 对象的 getClass
Class<?> c3 = Class.forName("java.lang.String"); // 全限定名（会触发类初始化）

// 用反射创建实例、调用方法、访问字段
Class<?> clazz = Class.forName("com.demo.User");
Object obj = clazz.getDeclaredConstructor().newInstance();  // 反射 new

Method m = clazz.getDeclaredMethod("setName", String.class);
m.invoke(obj, "Tom");                       // 反射调方法

Field f = clazz.getDeclaredField("age");
f.setAccessible(true);                      // 突破 private 访问限制
f.set(obj, 18);                             // 反射改私有字段`

const reflectUseSnippet = `// 反射的典型应用：写一个迷你「依赖注入」
// 扫描字段上的 @Inject 注解，自动 set 进实例
for (Field f : bean.getClass().getDeclaredFields()) {
    if (f.isAnnotationPresent(Inject.class)) {
        Object dep = container.get(f.getType());  // 从容器找依赖
        f.setAccessible(true);
        f.set(bean, dep);                          // 注入
    }
}
// Spring 的 @Autowired、JUnit 找 @Test 方法、Jackson 读写字段，本质都靠反射`

const annotationDefSnippet = `import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)   // 保留到运行时，反射才读得到
@Target(ElementType.METHOD)           // 只能标在方法上
public @interface MyTest {
    String value() default "";        // 注解的成员，像方法一样声明
    int timeout() default 0;
}

// 使用
class Demo {
    @MyTest(value = "case1", timeout = 1000)
    void run() {}
}

// 运行时读取注解
Method m = Demo.class.getDeclaredMethod("run");
MyTest a = m.getAnnotation(MyTest.class);
System.out.println(a.value() + " / " + a.timeout());`

export default function Ch1() {
  return (
    <article>
      <Lead>
        反射和注解是 Spring、MyBatis、JUnit 等框架「凭空注入、自动扫描」的底层魔法。
        本章讲清反射机制如何在运行时操作类与对象、它的典型应用与代价，
        以及注解的本质和处理原理——理解了这两点，你就能看懂框架到底在背后做了什么。
      </Lead>

      <h2>一、反射机制</h2>
      <KeyIdea>
        反射（Reflection）让程序在<strong>运行时</strong>动态获取类的信息（字段、方法、构造器、注解），
        并能创建对象、调用方法、读写字段——哪怕是 private 的。它的本质是：每个类被加载后，
        JVM 都为它生成一个 <code>Class</code> 对象，反射就是通过这个 Class 对象「自省」并操作类。
      </KeyIdea>
      <CodeBlock lang="java" title="反射的基本操作" code={reflectBasicSnippet} />

      <h3>面试题 1：什么是反射？它有哪些应用？</h3>
      <p>
        反射打破了「编译期就要确定调用哪个类、哪个方法」的限制，让代码在运行时根据字符串/配置动态决定行为。
        正因如此，它是<strong>框架的基石</strong>：
      </p>
      <table>
        <thead>
          <tr><th>场景</th><th>反射做了什么</th></tr>
        </thead>
        <tbody>
          <tr><td>Spring IoC / DI</td><td>读配置/注解，反射创建 Bean、注入依赖</td></tr>
          <tr><td>JUnit / TestNG</td><td>扫描带 @Test 的方法，反射调用执行</td></tr>
          <tr><td>Jackson / Gson</td><td>反射读写对象字段做 JSON 序列化/反序列化</td></tr>
          <tr><td>JDBC / ORM</td><td>反射把结果集映射到对象字段</td></tr>
          <tr><td>动态代理</td><td>反射 invoke 被代理方法</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="用反射实现迷你依赖注入" code={reflectUseSnippet} />

      <h3>面试题 2：反射有什么代价？</h3>
      <p>
        反射强大但不是免费的，面试常追问它的缺点，要答全三点：
      </p>
      <ul>
        <li><strong>性能开销</strong>：反射调用比直接调用慢（需做安全检查、无法被某些 JIT 优化）。不过现代 JVM 对反射做了缓存与优化，差距已比早期小很多；热点路径仍建议缓存 Method/Field 对象复用。</li>
        <li><strong>破坏封装</strong>：<code>setAccessible(true)</code> 能强行访问 private 成员，绕过封装，可能破坏对象不变性、引入安全风险（模块系统对此有更严格限制）。</li>
        <li><strong>失去编译期检查</strong>：方法名、字段名变成字符串，写错了编译不报错，运行时才抛异常，重构也不易被 IDE 追踪。</li>
      </ul>
      <Callout variant="tip" title="优化建议：缓存反射对象">
        反射的主要开销在「查找」（getMethod/getField）而非「调用」本身。框架普遍把查到的 Method/Field
        缓存起来反复用，避免每次都查。需要极致性能时，还可用 <code>MethodHandle</code> 或在编译期生成代码替代反射。
      </Callout>

      <h2>二、注解原理</h2>
      <h3>面试题 3：注解的本质是什么，是怎么起作用的？</h3>
      <p>
        注解（Annotation）本质是一种<strong>特殊的接口</strong>（用 <code>@interface</code> 声明），
        它本身<strong>不产生任何行为</strong>，只是给代码贴的「元数据标签」。真正让注解「起作用」的，
        是<strong>读取并处理注解的代码</strong>——可能在编译期（注解处理器 APT），也可能在运行期（反射）。
      </p>
      <CodeBlock lang="java" title="定义与读取注解" code={annotationDefSnippet} />
      <p>注解能不能被读到，取决于它的<strong>保留策略 @Retention</strong>：</p>
      <table>
        <thead>
          <tr><th>RetentionPolicy</th><th>保留到</th><th>谁能读</th></tr>
        </thead>
        <tbody>
          <tr><td><code>SOURCE</code></td><td>仅源码，编译后丢弃</td><td>编译器/APT（如 @Override、Lombok）</td></tr>
          <tr><td><code>CLASS</code></td><td>class 文件，运行时不加载</td><td>字节码工具（默认策略）</td></tr>
          <tr><td><code>RUNTIME</code></td><td>运行时仍在</td><td>反射（如 Spring、JUnit 注解）</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="@Target、@Retention 等是「元注解」">
        用来修饰注解的注解叫元注解。<code>@Target</code> 限定能标在什么上（类/方法/字段），
        <code>@Retention</code> 决定保留到哪个阶段，<code>@Documented</code>、<code>@Inherited</code> 等是补充。
        想让反射在运行时读到注解，<code>@Retention(RUNTIME)</code> 是必须的——这是很常见的踩坑点。
      </Callout>
      <Example title="注解 + 反射 = 框架的声明式编程">
        <p>
          为什么标个 <code>@Test</code> 方法就能被 JUnit 跑起来？因为 JUnit 用反射扫描类的所有方法，
          找出带 <code>@Test</code>（RUNTIME 保留）的，再反射 invoke 它们。<code>@Autowired</code> 同理：
          Spring 反射扫描字段，发现注解就注入依赖。所以「注解只是标签，处理逻辑在框架里」——
          注解负责「声明意图」，反射负责「执行处理」，二者配合实现了声明式编程。
        </p>
      </Example>
      <Callout variant="warn" title="易错点：注解本身不做事">
        别误以为加了注解就会自动生效。如果没有对应的处理器/框架去读它，注解就是个没用的标签。
        比如你自定义一个 <code>@Loggable</code>，不写读取它的 AOP/反射逻辑，方法是不会自动打日志的。
      </Callout>

      <h3>面试题 4：注解有几种处理方式？编译期和运行期处理有何不同？</h3>
      <p>
        注解的处理大致分两条路线，对应两种保留策略：
      </p>
      <table>
        <thead>
          <tr><th>处理方式</th><th>时机</th><th>机制</th><th>典型</th></tr>
        </thead>
        <tbody>
          <tr><td>注解处理器（APT）</td><td>编译期</td><td>编译时扫描注解，生成额外源码/校验</td><td>Lombok、MapStruct、Dagger</td></tr>
          <tr><td>反射读取</td><td>运行期</td><td>运行时用反射读注解再执行逻辑</td><td>Spring、JUnit、Jackson</td></tr>
          <tr><td>字节码增强</td><td>编译后/加载时</td><td>改字节码织入逻辑</td><td>AspectJ、部分 APM 探针</td></tr>
        </tbody>
      </table>
      <p>
        编译期处理（APT）的好处是<strong>零运行时开销</strong>——活在编译时干完，运行时没有反射成本；
        缺点是只能「生成代码/校验」，不能改变运行时行为。运行期反射处理则灵活，能根据实际情况动态决策，
        代价是有反射开销。框架常把两者结合：编译期生成骨架，运行期反射收尾。
      </p>
      <Example title="Lombok 为什么是「编译期魔法」？">
        <p>
          你写 <code>@Data</code>，源码里看不到 getter/setter，但编译出的 .class 里却有——
          因为 Lombok 是<strong>注解处理器</strong>，在编译期介入抽象语法树（AST），把方法「写」进字节码。
          所以它是 <code>SOURCE</code> 保留策略，运行时注解早已不存在、也没有任何反射开销。
          这和 Spring 的 <code>@Autowired</code>（RUNTIME，靠反射）是两套完全不同的机制，面试能区分这点很加分。
        </p>
      </Example>
      <Callout variant="tip" title="自省 API：反射读注解的常用方法">
        运行期读注解的核心方法都在反射 API 里：<code>isAnnotationPresent(注解.class)</code> 判断是否存在、
        <code>getAnnotation(注解.class)</code> 取注解实例再读它的成员值、<code>getAnnotations()</code> 取全部。
        类、方法、字段、参数上都有这套方法，这就是 Spring 等框架「扫描并按注解装配」的底层入口。
      </Callout>

      <h3>面试题 5：getMethods 和 getDeclaredMethods 有什么区别？</h3>
      <p>
        反射 API 里有两组长得像的方法，很容易混，面试也爱问：带 <code>Declared</code> 的取「本类声明的全部成员（含 private）」，
        不带的取「本类及父类的 public 成员」。
      </p>
      <table>
        <thead>
          <tr><th>方法</th><th>范围</th><th>访问级别</th></tr>
        </thead>
        <tbody>
          <tr><td><code>getMethods()</code></td><td>本类 + 父类/接口</td><td>仅 public</td></tr>
          <tr><td><code>getDeclaredMethods()</code></td><td>仅本类声明的</td><td>所有（含 private/protected）</td></tr>
          <tr><td><code>getFields()</code></td><td>本类 + 父类</td><td>仅 public</td></tr>
          <tr><td><code>getDeclaredFields()</code></td><td>仅本类声明的</td><td>所有</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="访问 private 必须 setAccessible(true)">
        通过 <code>getDeclaredXxx</code> 拿到 private 成员后，直接 invoke/get 仍会抛 <code>IllegalAccessException</code>，
        必须先调 <code>setAccessible(true)</code> 关闭访问检查。这也是反射「能突破封装」的体现——
        框架做依赖注入、序列化时大量用它来读写私有字段。注意 JDK 9 的模块系统对此加了更严格的限制，跨模块访问可能被拒。
      </Callout>

      <h3>面试题 6：反射创建对象有哪几种方式？</h3>
      <p>
        通过反射 new 对象主要有两条路，区别在于调用哪个构造器：
      </p>
      <ul>
        <li><code>clazz.getDeclaredConstructor(参数类型...).newInstance(实参...)</code>：现代推荐方式，能指定调用任意构造器（含有参、私有）。</li>
        <li><code>clazz.newInstance()</code>：老 API，只能调<strong>无参 public</strong> 构造器，已被废弃（异常处理也不友好）。</li>
      </ul>
      <Callout variant="warn" title="为什么 clazz.newInstance() 被废弃？">
        它只能调无参构造器，且会把构造器抛出的受检异常「悄悄」往外传，绕过了编译期检查，容易埋坑。
        所以从 JDK 9 起被标记废弃，统一改用 <code>getDeclaredConstructor().newInstance()</code>——
        它显式声明异常、能调任意构造器，更安全清晰。这是个能体现你跟进新版本的小细节。
      </Callout>

      <Summary
        points={[
          '反射让程序在运行时通过 Class 对象自省类信息，并能动态创建对象、调用方法、读写字段（含 private，需 setAccessible）。',
          '反射是框架基石：Spring DI、JUnit、Jackson、ORM、动态代理都靠它在运行时按配置/注解动态决定行为。',
          '反射的代价：性能开销（查找慢，应缓存 Method/Field）、破坏封装、失去编译期检查；极致性能可用 MethodHandle 或编译期生成代码。',
          '注解本质是用 @interface 声明的特殊接口，本身只是元数据标签，不产生行为；起作用靠编译期 APT 或运行期反射去处理。',
          '@Retention 决定保留阶段：SOURCE（编译后丢）、CLASS（默认，运行时不加载）、RUNTIME（反射可读）；要被反射读到必须用 RUNTIME。',
          '注解 + 反射实现声明式编程：注解声明意图（如 @Test/@Autowired），框架反射扫描并执行处理逻辑。',
        ]}
      />
    </article>
  )
}

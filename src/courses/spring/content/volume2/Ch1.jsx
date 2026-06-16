import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import CircularDep from '@/courses/spring/illustrations/CircularDep.jsx'

const beanDefCode = `// 经典的循环依赖：A 依赖 B，B 又依赖 A
@Component
class A {
    @Autowired
    private B b;   // A 创建时需要一个 B
}

@Component
class B {
    @Autowired
    private A a;   // B 创建时又需要一个 A
}`

const cacheCode = `// DefaultSingletonBeanRegistry 里的三级缓存（简化）
// 一级：完整可用的成品 Bean
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

// 二级：提前暴露的早期引用（还没填完属性的半成品，或其代理）
private final Map<String, Object> earlySingletonObjects = new HashMap<>(16);

// 三级：对象工厂，调用 getObject() 才真正产出早期引用
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);`

const ctorFailCode = `// 构造器注入的循环依赖：启动直接报错
@Component
class A {
    private final B b;
    A(B b) { this.b = b; }   // 还没造出 A 就要求先有 B
}

@Component
class B {
    private final A a;
    B(A a) { this.a = a; }   // 还没造出 B 就要求先有 A
}
// 抛出 BeanCurrentlyInCreationException：
// Requested bean is currently in creation: Is there an unresolvable circular reference?

// 字段注入（或 setter 注入）则可以解：
@Component
class A {
    @Autowired private B b;  // 先实例化 A（半成品），再填属性，可被三级缓存救活
}
@Component
class B {
    @Autowired private A a;
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          面试官最爱问的 Spring 题之一就是「循环依赖怎么解决」。答案的核心是
          <em>三级缓存</em>：Spring 在 Bean 还是半成品时就把它「提前暴露」出去，让相互依赖的两个 Bean 都能拿到对方的引用，
          从而打破「你等我、我等你」的死结。这一章我们就把三级缓存掰开揉碎讲清楚。
        </p>
      </Lead>

      <h2>什么是循环依赖</h2>
      <p>
        <em>circular dependency</em> 指的是两个或多个 Bean 互相持有对方：「A 依赖 B、B 依赖 A」。
        Spring 创建一个单例 Bean 大致分两步——先<strong>实例化</strong>（调构造方法在堆上开辟对象），
        再<strong>填充属性</strong>（把依赖的其它 Bean 注入进来）。问题就出在第二步：创建 A 填属性时发现需要 B，
        于是转头去创建 B；创建 B 填属性时又发现需要 A，而此时 A 还没造完。如果没有特殊机制，这里就会无限递归。
      </p>
      <p>
        Spring 的破局思路是：A 一旦<strong>实例化</strong>完成（即使属性还没填），就先把「能拿到 A 的途径」登记起来。
        这样 B 在需要 A 时，不必等 A 彻底造好，先拿到 A 的「早期引用」用着，等大家都造完，引用自然就指向了完整对象。
      </p>

      <h3>三级缓存分别是什么</h3>
      <p>
        三级缓存都在 <code>DefaultSingletonBeanRegistry</code> 里，是三个 Map，按「成熟度」从高到低排列：
      </p>
      <ul>
        <li><strong>一级缓存 singletonObjects</strong>：放<em>成品</em>——属性已填好、初始化已完成、可直接使用的 Bean。</li>
        <li><strong>二级缓存 earlySingletonObjects</strong>：放<em>早期引用</em>——已实例化但还没填完属性的半成品（或它的 AOP 代理对象）。</li>
        <li><strong>三级缓存 singletonFactories</strong>：放<em>对象工厂</em> <code>ObjectFactory</code>，调用它的 <code>getObject()</code> 才真正产出早期引用。</li>
      </ul>
      <CodeBlock lang="java" title="DefaultSingletonBeanRegistry 三级缓存" code={cacheCode} />

      <Example title="A 依赖 B、B 依赖 A 的解决流程">
        <p>把上面那段 A、B 代码丢给 Spring，它的解决步骤是这样的：</p>
        <ul>
          <li>实例化 A（半成品）后，立刻把「造 A 的工厂」放进<strong>三级缓存</strong>，提前暴露。</li>
          <li>A 填属性发现需要 B，去创建 B；B 实例化后同样把自己的工厂放进三级缓存。</li>
          <li>B 填属性发现需要 A，从<strong>三级缓存</strong>取出 A 的工厂、调用得到 A 的早期引用，并把它升到<strong>二级缓存</strong>。</li>
          <li>B 拿到 A 的引用后彻底造完，成为成品进入<strong>一级缓存</strong>。</li>
          <li>A 拿到完整的 B，继续把自己造完，也进入一级缓存。循环依赖解开。</li>
        </ul>
      </Example>

      <CodeBlock lang="java" title="A、B 互相依赖" code={beanDefCode} />

      <CircularDep />

      <KeyIdea title="为什么必须是三级而不是两级">
        <p>
          只用「成品 + 早期引用」两级，似乎也能解普通的循环依赖。三级缓存真正的价值在<strong>AOP 代理对象的提前暴露</strong>。
          正常情况下，AOP 代理是在 Bean <em>初始化之后</em>才生成的；可一旦发生循环依赖，B 必须提前拿到 A 的引用——
          而这个引用应该是 A 的<strong>代理对象</strong>，否则 B 持有的就是没被增强过的原始对象，事务、日志等切面统统失效。
          三级缓存放的是<em>工厂</em>而非对象：只有当真的发生循环依赖、有人来取时，工厂才通过
          <code>getEarlyBeanReference()</code> 决定要不要提前生成代理，并保证「提前生成的代理」和「最终的代理」是同一个。
          这正是单纯的二级缓存做不到的——它无法把「是否需要代理」这件事延迟到被引用的那一刻。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="哪些循环依赖 Spring 也解不了">
        <p>三级缓存不是万能的，下面两类必然失败：</p>
        <ul>
          <li>
            <strong>构造器注入的循环依赖</strong>：提前暴露的前提是「已经实例化」，而构造器注入要求在
            <em>实例化那一刻</em>就拿到依赖，根本走不到放进三级缓存那一步，直接抛
            <code>BeanCurrentlyInCreationException</code>。
          </li>
          <li>
            <strong>prototype 作用域的循环依赖</strong>：三级缓存只服务单例，<code>prototype</code> Bean 每次都新建、
            不进缓存，Spring 干脆不尝试解决，发现循环就报错。
          </li>
        </ul>
        <p>另外，Spring Boot 2.6 起默认禁止循环依赖，遇到会启动失败，需显式开启 <code>allow-circular-references</code>，但更推荐重构掉。</p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到时，先一句话点题：「Spring 用三级缓存解决<strong>单例</strong>的<strong>字段/setter 注入</strong>循环依赖」。
        再按「一级成品、二级早期引用、三级工厂」介绍三个缓存，讲清楚「实例化后把工厂放三级缓存提前暴露」这条主线。
        如果想拿高分，一定要主动补上「<strong>为什么需要三级</strong>——为了 AOP 代理对象的提前暴露」，以及「<strong>解决不了</strong>构造器注入和 prototype」。
        最后落到工程态度：循环依赖往往是设计耦合的信号，能重构就重构，别依赖框架兜底。
      </p>

      <Practice title="亲手验证：构造器注入会炸，字段注入能救">
        <p>
          建两个互相依赖的 Bean，先都用构造器注入跑一遍，观察启动时抛出的
          <code>BeanCurrentlyInCreationException</code>；再改成字段注入，应用即可正常启动。
          对比之后你就彻底记住了「能不能解，取决于注入时机」。
        </p>
        <CodeBlock lang="java" title="CircularDepDemo.java" code={ctorFailCode} />
        <p>
          进阶：给 A 加一个 <code>@Transactional</code> 方法，在字段注入的循环依赖下，断点查看 B 持有的 <code>a</code>
          是不是代理对象（类名带 <code>$$EnhancerBySpringCGLIB</code> 或 <code>$Proxy</code>），体会三级缓存提前暴露代理的意义。
        </p>
      </Practice>

      <Summary
        points={[
          '循环依赖即「A 依赖 B、B 依赖 A」，难点在填充属性时互相等待造成无限递归。',
          '三级缓存：一级 singletonObjects 放成品，二级 earlySingletonObjects 放早期引用，三级 singletonFactories 放对象工厂。',
          '解决主线：Bean 实例化后立刻把工厂放进三级缓存提前暴露，让对方先拿到早期引用。',
          '必须三级而非两级，是为了把「是否生成 AOP 代理」延迟到被引用那一刻，保证早期引用与最终代理一致。',
          '解决不了的情况：构造器注入（实例化前就要依赖）、prototype 作用域（不进缓存）。',
          '面试落点：单例 + 字段/setter 注入才有效；循环依赖多是耦合信号，能重构尽量重构。',
        ]}
      />
    </>
  )
}

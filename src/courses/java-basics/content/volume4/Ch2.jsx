import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const genericSnippet = `// 没有泛型：取出要强转，运行时才暴露类型错误
List list = new ArrayList();
list.add("hi");
String s = (String) list.get(0);   // 手动强转，易出 ClassCastException

// 有泛型：编译期就保证类型安全，免去强转
List<String> typed = new ArrayList<>();
typed.add("hi");
String s2 = typed.get(0);          // 编译器知道是 String

// 泛型方法
static <T> T firstOf(List<T> list) { return list.get(0); }`

const eraseSnippet = `// 类型擦除：编译后泛型信息被抹掉，List<String> 和 List<Integer> 是同一个类
List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();
System.out.println(a.getClass() == b.getClass());  // true：运行时都是 ArrayList

// 擦除带来的限制：
// new T[10];            // 不能 new 泛型数组
// T t = new T();        // 不能 new 泛型实例
// if (obj instanceof List<String>) {}  // 不能对带参泛型做 instanceof
// class A<T> { static T x; }           // 静态字段不能用类型参数`

const pecsSnippet = `// 上界 extends：只能读，不能写（生产者 Producer）
List<? extends Number> producer = new ArrayList<Integer>();
Number n = producer.get(0);     // 读 OK，元素至少是 Number
// producer.add(1);             // 编译错误：不知道确切类型，不能写

// 下界 super：只能写，读出来是 Object（消费者 Consumer）
List<? super Integer> consumer = new ArrayList<Number>();
consumer.add(1);                // 写 OK，Integer 一定能放进去
Object o = consumer.get(0);     // 读只能当 Object

// 口诀 PECS：Producer-Extends, Consumer-Super`

const copySnippet = `// 浅拷贝：只复制对象本身，引用字段仍指向同一个内部对象
class Address { String city; }
class Person implements Cloneable {
    String name;
    Address addr;
    @Override protected Person clone() throws CloneNotSupportedException {
        return (Person) super.clone();   // 浅拷贝：addr 还是同一个！
    }
}

// 深拷贝：连同引用字段指向的对象也复制一份，互不影响
class PersonDeep implements Cloneable {
    String name;
    Address addr;
    @Override protected PersonDeep clone() throws CloneNotSupportedException {
        PersonDeep c = (PersonDeep) super.clone();
        Address a = new Address();
        a.city = this.addr.city;        // 手动复制内部对象
        c.addr = a;
        return c;
    }
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        泛型让集合和 API 在编译期就有类型保障，但它背后的「类型擦除」机制带来一连串看似奇怪的限制。
        本章讲清泛型的作用、类型擦除是什么、上下界通配符（PECS）怎么用，
        以及和拷贝相关的深拷贝与浅拷贝——它们常和泛型集合一起出现在面试里。
      </Lead>

      <h2>一、泛型的作用</h2>
      <KeyIdea>
        泛型（Generics，Java 5 引入）让类型成为参数，核心价值有两个：<strong>编译期类型安全</strong>
        （把 <code>ClassCastException</code> 从运行时提前到编译期发现）和<strong>消除强制类型转换</strong>
        （代码更简洁、可读）。一句话：泛型用「编译期检查」换「运行期安全」。
      </KeyIdea>
      <CodeBlock lang="java" title="泛型解决的问题" code={genericSnippet} />
      <h3>面试题 1：泛型有什么用？</h3>
      <ul>
        <li><strong>类型安全</strong>：往 <code>List{'<String>'}</code> 里放 Integer 会编译报错，不必等到运行时崩。</li>
        <li><strong>免强转</strong>：取出元素自动是声明的类型，不用手写 <code>(String)</code> 强转。</li>
        <li><strong>代码复用</strong>：一份泛型类/方法适配多种类型，无需为每种类型重写。</li>
      </ul>

      <h2>二、类型擦除</h2>
      <h3>面试题 2：什么是类型擦除？它带来哪些限制？</h3>
      <p>
        Java 泛型是<strong>编译期的语法糖</strong>。编译器检查完类型后，会把泛型信息<strong>擦除</strong>——
        <code>List{'<String>'}</code> 在字节码里变回原始的 <code>List</code>，类型参数 <code>T</code> 被替换为它的上界
        （无上界就是 <code>Object</code>），需要的地方插入强转。这就是类型擦除（type erasure），
        目的是兼容 Java 5 之前没有泛型的旧代码。
      </p>
      <CodeBlock lang="java" title="类型擦除及其限制" code={eraseSnippet} />
      <table>
        <thead>
          <tr><th>限制</th><th>原因</th></tr>
        </thead>
        <tbody>
          <tr><td>不能 <code>new T()</code> / <code>new T[]</code></td><td>运行时 T 已被擦除，不知道是什么类型</td></tr>
          <tr><td>不能 <code>obj instanceof List{'<String>'}</code></td><td>运行时类型参数不存在，无法判断</td></tr>
          <tr><td>静态字段/方法不能用类型参数</td><td>类型参数属于实例，静态成员所有实例共享</td></tr>
          <tr><td>不能对泛型用基本类型</td><td>只能用包装类（<code>List{'<int>'}</code> 不行）</td></tr>
          <tr><td>不能抛/捕获泛型异常</td><td>catch 需要运行时确切类型</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="擦除的副作用：运行时拿不到泛型类型">
        因为擦除，<code>List{'<String>'}</code> 和 <code>List{'<Integer>'}</code> 运行时是同一个类，
        你无法在运行时直接知道一个 List 的元素类型。需要保留泛型信息时（如反序列化），
        常借助 <code>TypeReference</code>（匿名子类把泛型写进类签名）这类技巧绕过擦除。
      </Callout>
      <Callout variant="note" title="对比 C# 的具体化泛型">
        C# 的泛型是「具体化」的，运行时保留类型信息，能 <code>new T()</code>、能反射拿到 <code>List{'<int>'}</code> 的 int。
        Java 选择擦除是为了向后兼容旧字节码，代价就是上面这堆限制。面试能点出这个设计差异会显得理解到位。
      </Callout>

      <h2>三、上下界通配符（PECS）</h2>
      <h3>面试题 3：extends 和 super 通配符有什么区别？</h3>
      <p>
        通配符 <code>?</code> 用来表示「某种不确定的类型」，配合上下界限定使用：
        <code>{'<? extends T>'}</code> 是<strong>上界</strong>（类型是 T 或其子类），
        <code>{'<? super T>'}</code> 是<strong>下界</strong>（类型是 T 或其父类）。
        记忆口诀是 <strong>PECS：Producer Extends, Consumer Super</strong>。
      </p>
      <CodeBlock lang="java" title="上下界通配符与 PECS" code={pecsSnippet} />
      <table>
        <thead>
          <tr><th>通配符</th><th>含义</th><th>能读？</th><th>能写？</th><th>角色</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{'<? extends T>'}</code></td><td>T 或其子类</td><td>能（当作 T 读）</td><td>不能</td><td>生产者（提供数据）</td></tr>
          <tr><td><code>{'<? super T>'}</code></td><td>T 或其父类</td><td>只能当 Object 读</td><td>能（写入 T）</td><td>消费者（接收数据）</td></tr>
        </tbody>
      </table>
      <Example title="为什么 extends 不能写、super 不能精确读？">
        <p>
          <code>{'<? extends Number>'}</code> 可能是 <code>List{'<Integer>'}</code> 也可能是
          <code>List{'<Double>'}</code>，编译器不知道确切类型，往里写任何具体值都可能类型不符，所以禁止写；
          但读出来至少是 Number，所以能读。<code>{'<? super Integer>'}</code> 反过来：
          它至少能容纳 Integer，所以写 Integer 安全；但读出来只能保证是 Object（上界未知），所以读受限。
          这就是 PECS 的内在逻辑——把数据取出来给别人用就 extends，往里塞数据就 super。
        </p>
      </Example>

      <h2>四、深拷贝 vs 浅拷贝</h2>
      <h3>面试题 4：深拷贝和浅拷贝有什么区别？</h3>
      <p>
        <strong>浅拷贝</strong>只复制对象本身和它的基本类型字段，<strong>引用类型字段仍指向同一个内部对象</strong>——
        改副本的内部对象会影响原对象。<strong>深拷贝</strong>则连引用字段指向的对象也递归复制一份，副本与原对象彻底独立。
      </p>
      <CodeBlock lang="java" title="浅拷贝与深拷贝" code={copySnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>浅拷贝</th><th>深拷贝</th></tr>
        </thead>
        <tbody>
          <tr><td>基本类型字段</td><td>复制值</td><td>复制值</td></tr>
          <tr><td>引用类型字段</td><td>复制引用（共享同一对象）</td><td>递归复制对象（各自独立）</td></tr>
          <tr><td>互相影响</td><td>改内部对象会互相影响</td><td>完全隔离</td></tr>
          <tr><td>实现</td><td><code>Object.clone()</code> 默认</td><td>手动逐层复制 / 序列化 / 拷贝构造</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="实现深拷贝的几种方式">
        ① 重写 clone，对每个引用字段也 clone（手动、易漏）；
        ② 序列化再反序列化（简单但要求都可序列化、性能一般）；
        ③ 拷贝构造器 / 工厂方法显式构造；
        ④ 用工具库（如 JSON 序列化/反序列化）。注意 <code>Object.clone()</code> 默认是浅拷贝。
      </Callout>
      <Callout variant="warn" title="Cloneable 接口的坑">
        <code>Cloneable</code> 是个「标记接口」，连 clone 方法都不含（clone 在 Object 里且是 protected），
        设计上一直被诟病。很多团队干脆不用 clone，改用拷贝构造器或工厂方法来做拷贝，更清晰可控。
      </Callout>

      <h3>面试题 5：为什么不能创建泛型数组？</h3>
      <p>
        <code>new T[10]</code> 和 <code>new List{'<String>'}[10]</code> 都编译不过。根因还是<strong>类型擦除</strong>
        与<strong>数组的协变</strong>之间的冲突：数组在运行时会保留元素类型并做检查（存错类型抛
        <code>ArrayStoreException</code>），但泛型运行时类型已被擦除，两者凑在一起就无法在运行时保证类型安全。
      </p>
      <table>
        <thead>
          <tr><th></th><th>数组</th><th>泛型</th></tr>
        </thead>
        <tbody>
          <tr><td>类型检查时机</td><td>运行时（保留元素类型）</td><td>编译时（运行时擦除）</td></tr>
          <tr><td>协变性</td><td>协变（String[] 是 Object[]）</td><td>不变（List{'<String>'} 不是 List{'<Object>'}）</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="实践：需要泛型数组怎么办？">
        通常用 <code>List{'<T>'}</code> 替代泛型数组（集合本就比数组更适合泛型）。
        若确实要数组，常见做法是创建 <code>Object[]</code> 再强转 <code>(T[])</code>（会有未检查警告），
        或用 <code>Array.newInstance(clazz, n)</code> 反射创建。但首选还是用 List，避免这堆麻烦。
      </Callout>

      <h3>面试题 6：泛型方法和泛型类有什么区别？</h3>
      <p>
        <strong>泛型类</strong>在类名后声明类型参数（<code>class Box{'<T>'}</code>），整个类共享这个 T，
        实例化时确定；<strong>泛型方法</strong>在方法返回值前单独声明类型参数（<code>{'<T> T first(List<T> l)'}</code>），
        作用域只在该方法内，调用时由实参推断，不依赖类是否是泛型类。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>泛型类</th><th>泛型方法</th></tr>
        </thead>
        <tbody>
          <tr><td>声明位置</td><td>类名后 <code>{'<T>'}</code></td><td>返回值前 <code>{'<T>'}</code></td></tr>
          <tr><td>作用域</td><td>整个类</td><td>仅该方法</td></tr>
          <tr><td>类型确定</td><td>实例化时</td><td>调用时由实参推断</td></tr>
          <tr><td>能否独立</td><td>—</td><td>可定义在非泛型类里</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="静态方法要泛型必须是泛型方法">
        因为类的类型参数 T 属于实例，<strong>静态方法访问不到它</strong>。所以静态方法若要用泛型，
        必须自己声明成泛型方法（在返回值前写 <code>{'<T>'}</code>），用方法自己的类型参数。
        这呼应了前面「静态成员不能用类的类型参数」的擦除限制。
      </Callout>

      <Summary
        points={[
          '泛型让类型成为参数，价值是编译期类型安全（提前发现 ClassCastException）和消除强制转换，用编译期检查换运行期安全。',
          '类型擦除：泛型是编译期语法糖，编译后类型参数被擦成上界/Object，故 List<String> 与 List<Integer> 运行时同类。',
          '擦除导致的限制：不能 new T()/new T[]、不能对带参泛型 instanceof、静态成员不能用类型参数、不能用基本类型。',
          'PECS：<? extends T> 是生产者只能读不能写，<? super T> 是消费者能写读出当 Object；取数据用 extends，塞数据用 super。',
          '浅拷贝只复制对象本身、引用字段共享同一内部对象；深拷贝递归复制引用对象、副本与原对象完全隔离。',
          '深拷贝可用手动 clone、序列化、拷贝构造器等；Object.clone() 默认浅拷贝，Cloneable 设计有缺陷，常改用拷贝构造器。',
        ]}
      />
    </article>
  )
}

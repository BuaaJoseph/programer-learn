import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const builderCode = `// 建造者模式：分步构建复杂对象，链式调用，结果是不可变对象
public class HttpRequest {

    // 字段都是 final，对象一旦建好就不可变
    private final String url;        // 必填
    private final String method;     // 选填，有默认值
    private final int timeout;       // 选填
    private final String body;       // 选填

    // 私有构造，只能通过 Builder 创建
    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.timeout = b.timeout;
        this.body = b.body;
    }

    public static class Builder {
        private final String url;            // 必填项放构造方法里
        private String method = "GET";       // 选填项给默认值
        private int timeout = 3000;
        private String body = "";

        public Builder(String url) {
            this.url = url;
        }

        // 每个设值方法返回 this，从而支持链式调用
        public Builder method(String method) {
            this.method = method;
            return this;
        }

        public Builder timeout(int timeout) {
            this.timeout = timeout;
            return this;
        }

        public Builder body(String body) {
            this.body = body;
            return this;
        }

        public HttpRequest build() {
            return new HttpRequest(this);
        }
    }
}

// 使用：可读性极强，想设哪个设哪个
// HttpRequest req = new HttpRequest.Builder("https://api.demo.com")
//         .method("POST")
//         .timeout(5000)
//         .body("{ }")
//         .build();`

const prototypeCode = `// 原型模式：通过克隆创建对象。注意浅克隆 vs 深克隆

public class User implements Cloneable {

    private String name;
    private int[] scores;   // 引用类型字段

    // 浅克隆：Object.clone 只复制引用，scores 仍与原对象共享同一个数组
    @Override
    public User clone() throws CloneNotSupportedException {
        return (User) super.clone();
    }

    // 深克隆：连引用指向的对象也一起复制，互不影响
    public User deepClone() throws CloneNotSupportedException {
        User copy = (User) super.clone();
        copy.scores = this.scores.clone();   // 把数组也复制一份
        return copy;
    }
}`

const telescopingCode = `// 反模式：可伸缩构造方法（telescoping constructor）
// 为了兼顾各种可选项，重载了一大堆构造方法，谁也记不住参数顺序
public class HttpRequest {
    public HttpRequest(String url) { ... }
    public HttpRequest(String url, String method) { ... }
    public HttpRequest(String url, String method, int timeout) { ... }
    public HttpRequest(String url, String method, int timeout, String body) { ... }
    // 调用方：new HttpRequest("u", "POST", 5000, "{}")
    // 第三个 5000 到底是 timeout 还是 retries？必须翻文档`

const directorCode = `// 完整建造者还有第四个角色：指挥者 Director，封装"固定的装配套路"
// Builder 负责"怎么造每一步"，Director 负责"按什么顺序造"

public class RequestDirector {
    // 把常用配置固化成一个套路，调用方一行搞定
    public HttpRequest buildJsonPost(String url, String body) {
        return new HttpRequest.Builder(url)
                .method("POST")
                .timeout(5000)
                .body(body)
                .build();
    }
}
// 实际工程里 Director 常被省略，调用方直接链式调用 Builder 即可`

const serializeDeepCloneCode = `// 深克隆的另一条路：序列化 / 反序列化，一次性深拷贝整棵对象树
// 要求对象图上所有类都实现 Serializable
public static <T extends Serializable> T deepClone(T obj) {
    try {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        new ObjectOutputStream(bos).writeObject(obj);   // 写成字节流
        ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
        return (T) new ObjectInputStream(bis).readObject();  // 再读回来，全是新对象
    } catch (Exception e) {
        throw new RuntimeException("深克隆失败", e);
    }
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          这一章把两个创建型模式放在一起：<strong>建造者</strong>解决「构造一个字段很多、很复杂的对象」，
          <strong>原型</strong>解决「与其重新造，不如复制一个现成的」。两者都绕开了直接用构造方法 new，
          但出发点完全不同——一个是为了<em>可读性与不可变</em>，一个是为了<em>省去重复初始化</em>。
        </p>
      </Lead>

      <h2>建造者模式 Builder</h2>
      <p>
        当一个对象有十几个字段、其中大半是可选项时，用构造方法会出现「长得吓人的参数列表」，
        谁也记不住第三个 int 到底是 timeout 还是 retries（这叫「可伸缩构造方法」反模式）。
        建造者模式用一个内部 Builder，把对象<strong>分步构建</strong>出来。
      </p>
      <p>
        先感受一下没有建造者时的痛——「可伸缩构造方法」反模式：
      </p>
      <CodeBlock lang="java" title="反模式：可伸缩构造方法" code={telescopingCode} />
      <p>
        参数一多，可读性、可维护性全面崩塌：分不清谁是谁、可选组合呈指数级、还无法保证不可变。
        另一个常见替代方案是「先 new 一个空对象再一堆 setter」（JavaBean 模式），
        但它的致命缺陷是<strong>对象在构造过程中处于不一致状态</strong>，且无法做成 final 不可变对象。
        建造者正是要同时解决这两类方案的缺陷。
      </p>
      <p>
        从 GoF 角度看，建造者完整有四个角色：<strong>Builder</strong>（抽象建造者，声明各装配步骤）、
        <strong>ConcreteBuilder</strong>（具体建造者，实现各步骤并提供 <code>getResult</code>）、
        <strong>Product</strong>（被构建的复杂产品）、<strong>Director</strong>（指挥者，封装固定的装配顺序）。
        工程里常用的「静态内部 Builder + 链式调用」是它的简化变体，通常省掉了 Director：
      </p>
      <CodeBlock lang="java" title="可选角色：Director 指挥者" code={directorCode} />
      <p>
        它的三个好处：第一，<strong>链式调用</strong>，每个设值方法返回 this，写起来流畅；
        第二，<strong>可读性强</strong>，<code>.timeout(5000)</code> 一眼就知道在设什么；
        第三，能产出<strong>不可变对象</strong>——字段设为 final，构造完就不可改，天然线程安全。
        必填项放进 Builder 的构造方法，选填项给默认值，最后用 <code>build()</code> 一次性产出对象。
      </p>

      <h3>身边的建造者</h3>
      <p>
        Lombok 的 <code>@Builder</code> 注解就是自动帮你生成上面那套 Builder 代码；
        <code>StringBuilder</code> 的 <code>append().append()</code> 也是建造者思想的链式拼装；
        OkHttp、各种 Config 配置对象基本都用建造者来构建。
      </p>
      <p>
        更多例子：<code>StringBuilder</code> / <code>StringBuffer</code> 的 append 链、
        Java 8 的 <code>Stream.Builder</code>、Guava 的 <code>ImmutableList.builder()</code>、
        Spring Security 的 <code>HttpSecurity</code> 链式配置、MyBatis 的 <code>SqlSessionFactoryBuilder</code>。
        凡是看到「<code>.xxx().yyy().build()</code> 然后产出一个配置好的对象」，背后基本都是建造者。
      </p>

      <h3>建造者 vs 工厂：别搞混</h3>
      <p>
        两者都是创建型、都绕开了直接 new，但关注点不同：
        <strong>工厂</strong>关心「造哪个对象」（按类型一步拿成品，产品之间往往是兄弟关系）；
        <strong>建造者</strong>关心「怎样一步步把一个复杂对象装配出来」（多步、可配置，产品是同一个但配置多样）。
        一句话：工厂解决「<em>是什么</em>」，建造者解决「<em>怎么装</em>」。
      </p>

      <Callout variant="warn" title="建造者不是万能的">
        <p>
          建造者有成本：要为产品多写一个 Builder 类、每个字段写一遍。
          如果对象只有两三个字段、且都是必填，直接用构造方法更省事，硬上 Builder 就是过度设计。
          建议门槛：<strong>字段超过 4 个、或可选项较多、或需要不可变</strong>时才用建造者
          （或直接用 Lombok 的 <code>@Builder</code> 省去样板代码）。
        </p>
      </Callout>

      <Example title="构造方法 vs 建造者">
        <ul>
          <li>
            <strong>构造方法</strong> · <code>new HttpRequest(url, "POST", 5000, body, true, ...)</code>，
            参数一多就分不清谁是谁，可选项还得写一堆重载。
          </li>
          <li>
            <strong>建造者</strong> · <code>.method("POST").timeout(5000).build()</code>，
            想设哪个设哪个，可读、可选、还能产出不可变对象。
          </li>
        </ul>
      </Example>

      <h2>原型模式 Prototype</h2>
      <p>
        有些对象创建成本很高（要读配置、查数据库、做大量初始化），如果需要很多个相似的实例，
        与其每个都从头初始化，不如<strong>先造一个原型，之后靠克隆来产出新对象</strong>。
        在 Java 里通常通过实现 <code>Cloneable</code> 接口、重写 <code>clone()</code> 来实现。
      </p>
      <p>
        原型模式的意图是<strong>用「拷贝已有实例」代替「从头创建」</strong>。它的 UML 角色很简单：
        <strong>Prototype</strong>（声明 <code>clone</code> 的接口）、
        <strong>ConcretePrototype</strong>（实现克隆的具体类）、
        <strong>Client</strong>（拿着原型调 clone 产新对象）。
        典型适用场景：对象创建成本高（要查库、读配置、大量计算）；需要大量结构相同、仅少量字段不同的对象；
        或想隔离「具体类」——客户端只持有原型引用，不关心它到底是哪个类。
      </p>

      <h3>浅克隆 vs 深克隆（核心考点）</h3>
      <p>
        这是原型模式必考的点。<code>Object.clone()</code> 默认是<strong>浅克隆</strong>：
        基本类型字段会复制值，但<strong>引用类型字段只复制引用地址</strong>，
        新旧对象会共享同一个内部对象，改一个会影响另一个。
        <strong>深克隆</strong>则连引用指向的对象也一并复制，两个对象彻底独立。
        实现深克隆有两条路：手动把每个引用字段也 clone 一遍，或者用
        <strong>序列化再反序列化</strong>（把对象写成字节流再读回来）一次性深拷贝整棵对象树。
      </p>
      <CodeBlock lang="java" title="序列化实现深克隆" code={serializeDeepCloneCode} />
      <p>
        实战里还有几个变体值得知道：用 JSON 工具（如 Jackson、Gson）「序列化再反序列化」也能做深拷贝，
        且不要求实现 Serializable，但会丢失类型信息、性能一般；
        Spring 的 <code>BeanUtils.copyProperties</code>、Apache 的 <code>BeanUtilsBean</code>
        本质是<strong>浅拷贝</strong>（只拷一层属性引用），用时要当心嵌套对象被共享。
      </p>

      <h3>原型 vs 拷贝构造方法</h3>
      <p>
        原型模式与「拷贝构造方法 <code>new User(other)</code>」目的相同，差别在<strong>多态</strong>：
        <code>clone()</code> 能在「只持有抽象类型引用、不知道具体类」时也复制出正确的子类对象；
        而拷贝构造方法在编译期就写死了类型。当客户端需要复制一个「运行期才知道具体类型」的对象时，原型才有不可替代的价值。</p>

      <KeyIdea title="一句话区分浅与深">
        <p>
          浅克隆是<strong>复制了一层壳，内部引用还共享</strong>；深克隆是<strong>连同内部引用对象一起复制，互不干扰</strong>。
          判断时只看<strong>引用类型字段</strong>：浅克隆后两个对象的该字段指向同一个对象，深克隆后指向各自的副本。
          序列化深拷贝最省事，但要求对象图上所有类都实现 Serializable，且性能开销比手写 clone 大。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="Cloneable 的坑">
        <p>
          Java 原生的 <code>Cloneable</code> 设计其实饱受诟病：它是个空接口、<code>clone()</code> 还在 Object 上、
          默认浅克隆容易埋雷。工程中更常用<strong>拷贝构造方法</strong>、
          <strong>静态工厂复制</strong>，或借助 JSON / 序列化工具来做深拷贝，而不是硬刚 Cloneable。
          面试讲清浅深克隆即可，落地未必真用 clone。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        建造者的标准回答：用于<strong>构建字段多、可选项多的复杂对象</strong>，
        优点是链式调用、可读性好、可产出不可变对象，代表是 Lombok 的 <code>@Builder</code> 和 <code>StringBuilder</code>。
        原型的标准回答：通过<strong>克隆</strong>来创建对象、避免重复的高成本初始化，
        必答<strong>浅克隆与深克隆的区别</strong>以及深克隆的两种实现（逐字段 clone / 序列化）。
      </p>

      <Practice title="Builder 链式调用 + 深浅拷贝">
        <p>
          下面是一个完整可复制的建造者实现（构建复杂的 HTTP 请求配置），重点看每个方法
          <code>return this</code> 如何撑起链式调用、final 字段如何带来不可变性。
        </p>
        <CodeBlock lang="java" title="建造者模式（链式调用 + 不可变对象）" code={builderCode} />
        <p>
          再看原型模式里浅克隆与深克隆的差异：关键就在那个引用类型字段 <code>scores</code>，
          浅克隆后新旧对象共享同一个数组，深克隆后各持一份。
        </p>
        <CodeBlock lang="java" title="原型模式（浅克隆 vs 深克隆）" code={prototypeCode} />
      </Practice>

      <Summary
        points={[
          '建造者模式用于构建字段多、可选项多的复杂对象，避免「长参数构造方法」反模式。',
          '建造者三大好处：链式调用（每步 return this）、可读性强、可产出 final 不可变对象。',
          '身边的建造者：Lombok 的 @Builder、StringBuilder 的 append 链、各种 Config 构建。',
          '原型模式通过克隆创建对象，适合创建成本高、又需要大量相似实例的场景。',
          '浅克隆只复制一层壳、引用字段仍共享；深克隆连引用对象一起复制，可逐字段 clone 或用序列化实现。',
          '建造者四角色（Builder/ConcreteBuilder/Product/Director），工程常用简化版省掉 Director；门槛是字段多、可选多或要不可变。',
          '建造者 vs 工厂：工厂关心「是什么」（按类型拿成品），建造者关心「怎么装」（多步配置同一对象）。',
          '原型 vs 拷贝构造：clone 支持在只持有抽象引用时多态复制，拷贝构造编译期写死类型；BeanUtils.copyProperties 是浅拷贝要当心。',
          'Cloneable 设计有缺陷，工程中常改用拷贝构造、静态工厂或 JSON / 序列化做深拷贝。',
        ]}
      />
    </>
  )
}

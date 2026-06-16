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

      <h3>浅克隆 vs 深克隆（核心考点）</h3>
      <p>
        这是原型模式必考的点。<code>Object.clone()</code> 默认是<strong>浅克隆</strong>：
        基本类型字段会复制值，但<strong>引用类型字段只复制引用地址</strong>，
        新旧对象会共享同一个内部对象，改一个会影响另一个。
        <strong>深克隆</strong>则连引用指向的对象也一并复制，两个对象彻底独立。
        实现深克隆有两条路：手动把每个引用字段也 clone 一遍，或者用
        <strong>序列化再反序列化</strong>（把对象写成字节流再读回来）一次性深拷贝整棵对象树。
      </p>

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
          'Cloneable 设计有缺陷，工程中常改用拷贝构造、静态工厂或 JSON / 序列化做深拷贝。',
        ]}
      />
    </>
  )
}

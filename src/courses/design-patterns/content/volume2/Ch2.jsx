import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const ioChainCode = `// Java IO 流就是装饰器模式最经典的现实案例
// FileInputStream 是「被装饰的核心」，外面层层包裹装饰器

InputStream in =
    new BufferedInputStream(          // 装饰：加缓冲
        new FileInputStream("a.txt") // 核心：从文件读字节
    );

// 想再加「读基本类型」的能力？再套一层就行，原有代码不用动
DataInputStream din =
    new DataInputStream(
        new BufferedInputStream(
            new FileInputStream("a.txt")));

int b = din.readInt();   // 缓冲 + 读 int，能力一层层叠加`

const decoratorCode = `// 1. 抽象组件：定义统一接口
interface Coffee {
    double cost();
    String desc();
}

// 2. 具体组件：被装饰的核心对象
class SimpleCoffee implements Coffee {
    public double cost() { return 10.0; }
    public String desc() { return "原味咖啡"; }
}

// 3. 抽象装饰类：实现同一接口，并持有一个 Coffee 引用（组合）
abstract class CoffeeDecorator implements Coffee {
    protected final Coffee coffee;   // 持有被装饰对象
    protected CoffeeDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
}

// 4. 具体装饰：在转发调用的基础上叠加自己的功能
class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 3.0; }
    public String desc() { return coffee.desc() + " + 牛奶"; }
}

class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) { super(coffee); }
    public double cost() { return coffee.cost() + 1.0; }
    public String desc() { return coffee.desc() + " + 糖"; }
}

class Demo {
    public static void main(String[] args) {
        // 像套娃一样动态组合：原味 -> 加奶 -> 加糖
        Coffee c = new SugarDecorator(new MilkDecorator(new SimpleCoffee()));
        System.out.println(c.desc() + " = " + c.cost());
        // 输出：原味咖啡 + 牛奶 + 糖 = 14.0
    }
}`

const objectAdapterCode = `// 对象适配器（推荐）：用「组合」持有被适配者，更灵活
// 目标接口：客户端期望的
interface Target {
    String request();
}

// 被适配者：已有的、接口对不上的类
class Adaptee {
    String specificRequest() { return "老接口的数据"; }
}

// 对象适配器：实现目标接口，内部持有 Adaptee 实例（组合）
class ObjectAdapter implements Target {
    private final Adaptee adaptee;
    ObjectAdapter(Adaptee adaptee) { this.adaptee = adaptee; }
    public String request() {
        return "适配后：" + adaptee.specificRequest();   // 转调 + 转换
    }
}`

const classAdapterCode = `// 类适配器：用「继承」实现，受单继承限制、耦合更强，少用
class ClassAdapter extends Adaptee implements Target {
    public String request() {
        return "适配后：" + specificRequest();   // 直接继承父类方法
    }
}`

const facadeCode = `// 外观：把"下单"涉及的库存、支付、物流三个子系统藏到一个门面后面
class InventoryService { void deduct(String sku) { /* 扣库存 */ } }
class PaymentService   { void pay(long amount) { /* 扣款 */ } }
class LogisticsService { void ship(String addr) { /* 发货 */ } }

// 门面：客户端只跟它打交道，不必知道内部协作细节
public class OrderFacade {
    private final InventoryService inventory = new InventoryService();
    private final PaymentService   payment   = new PaymentService();
    private final LogisticsService logistics = new LogisticsService();

    public void placeOrder(String sku, long amount, String addr) {
        inventory.deduct(sku);    // 1. 扣库存
        payment.pay(amount);      // 2. 付款
        logistics.ship(addr);     // 3. 发货
    }
}
// 客户端：new OrderFacade().placeOrder("A001", 9900, "北京");`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          这三个模式都属于<em>结构型</em>模式，都在围着「一个已有对象」做文章，初学时极易混淆。
          但它们的目的截然不同：装饰器要<strong>给对象加功能</strong>，适配器要<strong>把接口转个样</strong>，
          外观要<strong>把一堆复杂东西藏到一个简单入口后面</strong>。记住意图，就再也不会混了。
        </p>
      </Lead>

      <h2>装饰器模式：动态叠加功能</h2>
      <p>
        <em>装饰器</em>（Decorator）的意图是：<strong>在不修改原类、不写一堆子类的前提下，动态地给对象增加功能</strong>。
        它的精髓是<strong>组合而非继承</strong>——装饰器实现和被装饰对象相同的接口，同时<strong>持有</strong>一个被装饰对象的引用，
        在转发调用的前后插入自己的增强逻辑。这样就能像套娃一样把多个装饰器层层嵌套，功能自由组合。
      </p>
      <p>
        为什么不用继承？因为如果靠子类来组合功能，「加奶」「加糖」「加奶又加糖」「加奶加糖加香草」……会发生
        <strong>子类爆炸</strong>。装饰器把这些功能拆成一个个可叠加的小装饰，运行期想怎么组合就怎么组合。
      </p>
      <p>
        从 UML 看，装饰器有四个角色：<strong>Component</strong>（抽象组件，定义统一接口，如 <code>Coffee</code>）、
        <strong>ConcreteComponent</strong>（被装饰的核心，如 <code>SimpleCoffee</code>）、
        <strong>Decorator</strong>（抽象装饰类，实现 Component 接口并持有一个 Component 引用）、
        <strong>ConcreteDecorator</strong>（具体装饰，在转发调用前后叠加功能）。
        它最妙的一点是：装饰类<strong>既「是」一个 Component（implements），又「持有」一个 Component（组合）</strong>，
        正因如此才能被当作普通 Component 继续被下一层装饰，从而无限套娃。
      </p>

      <h3>最经典的例子：Java IO 流的装饰器链</h3>
      <p>
        Java 的 IO 体系就是装饰器模式的活教科书。<code>FileInputStream</code> 负责最基础的「从文件读字节」，
        但它没有缓冲、读起来慢。于是用 <code>BufferedInputStream</code> 把它<strong>包一层</strong>，加上缓冲能力；
        想再读 int、double 等基本类型，就再套一层 <code>DataInputStream</code>。
      </p>
      <CodeBlock lang="java" title="IoDecoratorChain.java" code={ioChainCode} />

      <Example title="为什么是装饰器而不是继承">
        <p>
          假设 IO 用继承实现，那「带缓冲的文件流」「带缓冲又能读基本类型的文件流」「网络流的对应版本」……
          每种组合都得是一个新类，数量呈指数爆炸。
        </p>
        <p>
          而装饰器把「缓冲」「读基本类型」做成独立的装饰类，<code>FileInputStream</code>、
          <code>SocketInputStream</code> 这些核心流都能被同样地包裹——<strong>能力可复用、可任意组合</strong>，
          这正是装饰器优于继承的地方。
        </p>
      </Example>

      <Callout variant="warn" title="装饰器的代价：小类爆炸与顺序敏感">
        <p>
          装饰器并非没有缺点：其一，它会产生<strong>很多细粒度的小类</strong>，IO 包里几十个 Stream 类初学者望而生畏，
          就是这个原因；其二，<strong>装饰顺序可能影响结果</strong>——「先加密再压缩」和「先压缩再加密」效果完全不同，
          调试一条长装饰链时要小心定位是哪一层出了问题；其三，多层包裹后，用 <code>instanceof</code>
          判断或拿到「最里层那个核心对象」会变得困难。功能正交、可自由组合时它才最划算。
        </p>
      </Callout>

      <h2>适配器模式：转换不兼容的接口</h2>
      <p>
        <em>适配器</em>（Adapter）的意图是：<strong>把一个类的接口转换成客户端期望的另一种接口</strong>，
        让原本因为接口不匹配而无法协作的两个东西能配合工作。它解决的是「接口对不上」的问题——
        好比把欧标插头通过转换头插进国标插座，<strong>不改变任何一方，只在中间做转换</strong>。
      </p>
      <ul>
        <li>
          <strong>SLF4J 适配各日志框架</strong>——SLF4J 只是一套日志门面接口，
          底层真正干活的可能是 Log4j、Logback、JUL。中间的 <code>slf4j-log4j12</code> 之类的桥接包
          就是适配器，把 SLF4J 的调用翻译成对应框架的 API。
        </li>
        <li>
          <strong>InputStreamReader</strong>——它把面向<strong>字节</strong>的 <code>InputStream</code>
          适配成面向<strong>字符</strong>的 <code>Reader</code>，中间顺带做编码转换，是 JDK 里的标准适配器。
        </li>
      </ul>

      <h2>外观模式：给复杂子系统一个统一入口</h2>
      <p>
        <em>外观</em>（Facade）的意图是：<strong>为一组复杂的子系统提供一个统一、简化的高层入口</strong>，
        让客户端不必了解内部的一堆类是怎么协作的，只跟这一个「门面」打交道。它降低了客户端与子系统之间的耦合。
      </p>
      <p>
        最典型的就是 Spring MVC 的 <code>DispatcherServlet</code>：一个 HTTP 请求进来，它在背后协调
        <code>HandlerMapping</code>、<code>HandlerAdapter</code>、<code>ViewResolver</code> 等一堆组件，
        但对你来说，复杂流程都被这一个「前端控制器」挡在了后面。你只管写 Controller，剩下的调度它全包了。
      </p>

      <KeyIdea title="三者意图区别（一句话记牢）">
        <p>
          <strong>装饰器</strong>：接口不变，<strong>增强功能</strong>（同一个接口，能力变强）。
          <strong>适配器</strong>：接口改变，<strong>转换适配</strong>（把 A 接口包成 B 接口）。
          <strong>外观</strong>：接口简化，<strong>统一入口</strong>（把一堆接口收成一个简单接口）。
          换句话说：装饰器关心「能力」，适配器关心「兼容」，外观关心「简化」。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把装饰器和适配器搞反">
        <p>
          面试常考它们的差别，关键看<strong>接口变没变</strong>：
        </p>
        <ul>
          <li>
            <strong>装饰器</strong>包裹后，对外暴露的还是<strong>同一个接口</strong>，只是行为被增强了——
            你照样把它当 <code>InputStream</code> 用。
          </li>
          <li>
            <strong>适配器</strong>包裹后，对外暴露的是<strong>一个新接口</strong>——
            <code>InputStreamReader</code> 进去是 <code>InputStream</code>，出来是 <code>Reader</code>，接口变了。
          </li>
        </ul>
      </Callout>

      <Practice title="手写一个装饰器：给咖啡加料">
        <p>
          下面用「咖啡加料」实现一套完整的装饰器：<code>Coffee</code> 是抽象组件，
          <code>SimpleCoffee</code> 是被装饰的核心，<code>CoffeeDecorator</code> 是抽象装饰类（持有 Coffee 引用），
          <code>MilkDecorator</code>、<code>SugarDecorator</code> 是具体装饰。复制到本地跑一遍，
          体会「组合而非继承」是怎么让功能自由叠加的。
        </p>
        <CodeBlock lang="java" title="CoffeeDecorator.java" code={decoratorCode} />
        <p>
          进阶练习：再写一个 <code>VanillaDecorator</code>（加香草），然后任意调整嵌套顺序，
          看看 <code>desc</code> 和 <code>cost</code> 的结果如何随组合变化——这正是装饰器链的灵活之处。
        </p>
      </Practice>

      <Summary
        points={[
          '装饰器：在不改原类的前提下动态叠加功能，核心是「组合而非继承」，可层层嵌套避免子类爆炸。',
          'Java IO 流是装饰器的经典案例，如 BufferedInputStream 套 FileInputStream 再套 DataInputStream。',
          '适配器：把一个类的接口转换成客户端期望的另一种接口，解决「接口对不上」的兼容问题。',
          '适配器的现实例子：SLF4J 桥接各日志框架、InputStreamReader 把字节流适配成字符流。',
          '外观：为复杂子系统提供统一简化的高层入口，如 Spring MVC 的 DispatcherServlet 调度一切。',
          '三者意图区别：装饰器增强功能（接口不变）、适配器转换接口（接口变）、外观简化入口（接口收敛）。',
        ]}
      />
    </>
  )
}

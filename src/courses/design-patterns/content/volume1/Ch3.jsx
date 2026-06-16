import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Factory from '@/courses/design-patterns/illustrations/Factory.jsx'

const simpleFactoryCode = `// 简单工厂：一个工厂用 if/switch 决定造哪个产品
public class DbConnectionFactory {

    public static Connection create(String type) {
        // 每加一种数据库就得回来改这里，违反开闭原则
        if ("mysql".equals(type)) {
            return new MySQLConnection();
        } else if ("oracle".equals(type)) {
            return new OracleConnection();
        }
        throw new IllegalArgumentException("不支持的类型: " + type);
    }
}`

const factoryMethodCode = `// 工厂方法：一个产品对应一个工厂，新增产品只加类不改老代码

// 1. 抽象产品
public interface Connection {
    void connect();
}

// 2. 具体产品
public class MySQLConnection implements Connection {
    public void connect() {
        System.out.println("连接 MySQL");
    }
}

public class OracleConnection implements Connection {
    public void connect() {
        System.out.println("连接 Oracle");
    }
}

// 3. 抽象工厂
public interface ConnectionFactory {
    Connection create();
}

// 4. 具体工厂：每个产品一个工厂
public class MySQLFactory implements ConnectionFactory {
    public Connection create() {
        return new MySQLConnection();
    }
}

public class OracleFactory implements ConnectionFactory {
    public Connection create() {
        return new OracleConnection();
    }
}

// 使用：要换数据库，只换注入的工厂，业务代码不变
// ConnectionFactory factory = new MySQLFactory();
// Connection conn = factory.create();
// conn.connect();`

const abstractFactoryCode = `// 抽象工厂：创建「一族」相关产品（同一风格的一整套 UI 组件）

public interface Button { void render(); }
public interface CheckBox { void render(); }

// 一个工厂负责造出一整套同风格的产品
public interface UIFactory {
    Button createButton();
    CheckBox createCheckBox();
}

public class DarkFactory implements UIFactory {
    public Button createButton() { return new DarkButton(); }
    public CheckBox createCheckBox() { return new DarkCheckBox(); }
}

public class LightFactory implements UIFactory {
    public Button createButton() { return new LightButton(); }
    public CheckBox createCheckBox() { return new LightCheckBox(); }
}`

const factoryMethodTemplateCode = `// 工厂方法在框架里常以「模板方法 + 工厂方法」组合出现：
// 父类定义流程骨架，把"造哪个产品"这一步留给子类的工厂方法

public abstract class ExportProcessor {

    // 模板方法：固定的导出流程
    public final void export(Data data) {
        Exporter exporter = createExporter();   // 工厂方法，子类决定造谁
        exporter.open();
        exporter.write(data);
        exporter.close();
    }

    // 工厂方法：留给子类实现，这就是 GoF "Factory Method" 的本意
    protected abstract Exporter createExporter();
}

public class PdfExportProcessor extends ExportProcessor {
    protected Exporter createExporter() { return new PdfExporter(); }
}

public class ExcelExportProcessor extends ExportProcessor {
    protected Exporter createExporter() { return new ExcelExporter(); }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          工厂模式要解决的痛点是：<strong>对象的创建过程是易变的</strong>。
          如果到处直接 <code>new</code>，一旦要换实现、加类型，就得满项目改 new。
          工厂模式把「创建对象」这件事单独隔离出来，让调用方只管「要什么」，不管「怎么造」。
          它有三个层次：简单工厂、工厂方法、抽象工厂。
        </p>
      </Lead>

      <h2>工厂模式的意图与 UML 角色</h2>
      <p>
        工厂模式的本质意图是<strong>把「对象的创建」与「对象的使用」解耦</strong>。
        调用方拿到的是抽象产品，至于背后 new 的是哪个具体类、怎么 new、要不要复用，全被工厂藏起来了。
        以 GoF 的工厂方法为例，UML 上有四个角色：
      </p>
      <ul>
        <li><strong>抽象产品（Product）</strong>：工厂要造的东西的接口，如 <code>Connection</code>。</li>
        <li><strong>具体产品（ConcreteProduct）</strong>：接口的实现，如 <code>MySQLConnection</code>。</li>
        <li><strong>抽象工厂（Creator）</strong>：声明工厂方法 <code>create()</code> 返回抽象产品。</li>
        <li><strong>具体工厂（ConcreteCreator）</strong>：实现工厂方法，决定造哪个具体产品。</li>
      </ul>

      <h2>三个层次，逐层进化</h2>
      <p>
        三者是从「能用」到「优雅」再到「成套」的递进。理解它们的关键，是看每一步是如何
        <strong>更好地满足开闭原则</strong>的。
      </p>

      <h3>简单工厂：一个工厂搞定一切（非 GoF）</h3>
      <p>
        用一个工厂类，靠 <code>if / switch</code> 判断参数来决定 new 哪个产品。
        它把 new 集中到一处，调用方确实清爽了。但它<strong>违反开闭原则</strong>：
        每加一种产品，都得回来改这个工厂的判断分支。注意，简单工厂<strong>不属于 GoF 的 23 种模式</strong>，
        它只是一种朴素的编程习惯，但因为常用所以单独拿出来讲。
      </p>

      <h3>工厂方法：一个产品一个工厂</h3>
      <p>
        把工厂也抽象成接口，每种产品配一个具体工厂。要加新产品，就<strong>新建一个产品类 + 一个工厂类</strong>，
        老代码完全不动——<strong>完美符合开闭原则</strong>。代价是类的数量变多了。
        这是真正意义上的 GoF 工厂方法模式。
      </p>

      <h3>抽象工厂：创建一族产品</h3>
      <p>
        当产品不是单个，而是<strong>一整套互相搭配</strong>的时候用它。比如 UI 主题：
        深色主题的按钮要配深色的复选框，不能混搭。抽象工厂让一个工厂负责造出
        <strong>同一族的一整套产品</strong>，保证它们风格一致。换主题就换整个工厂。
      </p>
      <p>
        这里有个关键概念要分清：<strong>产品等级结构</strong>（同一种产品的不同实现，如「所有按钮」）
        与<strong>产品族</strong>（同一风格下不同种产品的组合，如「深色按钮 + 深色复选框」）。
        工厂方法解决的是「同一等级结构里加新实现」，抽象工厂解决的是「成族地切换」。
        抽象工厂的硬伤也正在此：<strong>它对「增加产品等级」是封闭的</strong>——
        若要新增一种产品（比如再加个 <code>Slider</code>），所有工厂接口和实现都得改，违反开闭。
        所以抽象工厂适合「产品族稳定、但常整族切换」的场景。
      </p>

      <h3>工厂方法 ≠ 简单工厂里的静态方法</h3>
      <p>
        初学常把「带个 static 的创建方法」就叫工厂方法，其实 GoF 的工厂方法强调的是
        <strong>把创建步骤延迟到子类</strong>。它在框架里最常见的形态是和模板方法搭配：
        父类把流程定死，唯独「造哪个产品」做成抽象方法让子类去填。
      </p>
      <CodeBlock lang="java" title="工厂方法的经典形态：模板方法 + 工厂方法" code={factoryMethodTemplateCode} />

      <Example title="用「换数据库 / 换 UI 风格」记住区别">
        <ul>
          <li>
            <strong>简单工厂</strong> · 一个 DbFactory 用 switch 决定造 MySQL 还是 Oracle 连接，加类型要改它。
          </li>
          <li>
            <strong>工厂方法</strong> · MySQLFactory、OracleFactory 各管一个产品，加 PostgreSQL 只新建工厂。
          </li>
          <li>
            <strong>抽象工厂</strong> · DarkFactory 一次造出深色按钮 + 深色复选框一整套，换风格换工厂即可。
          </li>
        </ul>
      </Example>

      <Factory />

      <h2>三种工厂对比表</h2>
      <table>
        <thead>
          <tr>
            <th>维度</th>
            <th>简单工厂</th>
            <th>工厂方法</th>
            <th>抽象工厂</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>是否 GoF</td>
            <td>否（编程习惯）</td>
            <td>是</td>
            <td>是</td>
          </tr>
          <tr>
            <td>满足开闭</td>
            <td>否（加类型要改）</td>
            <td>是（加产品只加类）</td>
            <td>加族满足、加等级违反</td>
          </tr>
          <tr>
            <td>产品数量</td>
            <td>一种</td>
            <td>一种（多实现）</td>
            <td>一族（多种搭配）</td>
          </tr>
          <tr>
            <td>类的数量</td>
            <td>最少</td>
            <td>较多（一品一厂）</td>
            <td>最多</td>
          </tr>
          <tr>
            <td>典型例子</td>
            <td>Calendar.getInstance</td>
            <td>Collection.iterator</td>
            <td>跨平台 UI 组件库</td>
          </tr>
        </tbody>
      </table>

      <h2>与相近模式 / 概念的区别</h2>
      <ul>
        <li>
          <strong>vs 建造者</strong>：工厂关注「造哪个对象」（一步拿到成品，关注<em>类型</em>）；
          建造者关注「怎样一步步装配一个复杂对象」（多步构造，关注<em>过程与配置</em>）。
        </li>
        <li>
          <strong>vs 抽象工厂内部用工厂方法</strong>：抽象工厂的每个 <code>createXxx</code> 本身常用工厂方法实现，
          二者经常组合，但意图不同——一个解决「产品族」，一个解决「单产品延迟创建」。
        </li>
        <li>
          <strong>vs 单纯 new</strong>：当类型固定、几乎不变时，直接 new 最清晰，引入工厂只是噪音。
        </li>
      </ul>

      <KeyIdea title="工厂的本质是隔离「易变的创建」">
        <p>
          为什么要绕这么大圈子？因为<strong>new 一个具体类，意味着代码写死了依赖</strong>，
          违反依赖倒置原则。工厂模式把「决定造谁」这件最易变的事，从业务逻辑里抽离出来，
          让业务只依赖产品接口和工厂接口。一句话：<strong>工厂模式 = 把创建逻辑抽象化，以满足开闭与依赖倒置</strong>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="不要一上来就抽象工厂">
        <p>
          层次越高，类越多、越复杂。如果产品只有一两种、几乎不变，直接 new 或简单工厂就够了，
          强上工厂方法、抽象工厂就是<strong>过度设计</strong>。
          只有当「产品类型会增长」或「产品需要成套搭配」时，更高层次才划算。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        工厂模式在框架里随处可见：<strong>Spring 的 BeanFactory</strong> 就是巨型工厂，负责创建和管理所有 Bean；
        <code>Calendar.getInstance()</code> 根据地区返回不同的 Calendar 实现，是典型的工厂思想；
        日志框架（如 SLF4J 的 <code>LoggerFactory.getLogger()</code>）也用工厂屏蔽底层实现差异。
        面试要点：说清三者区别，强调<strong>简单工厂违反开闭且非 GoF</strong>、
        <strong>工厂方法符合开闭</strong>、<strong>抽象工厂解决产品族</strong>。
      </p>
      <p>
        JDK 里还有更多例子可顺手举：<code>Collection.iterator()</code> 是工厂方法（每个集合返回自己的迭代器实现）、
        <code>Integer.valueOf()</code> 是带缓存的静态工厂（-128~127 复用同一对象）、
        <code>ThreadLocalRandom.current()</code> 也是静态工厂思想。
        被追问「工厂模式和 IoC 容器什么关系」时，可以答：<strong>IoC 容器就是一个超级通用工厂</strong>，
        它把「创建 + 装配 + 生命周期管理」全包了，是工厂思想在框架层面的极致体现。
      </p>

      <Practice title="手写工厂方法模式">
        <p>
          以「创建不同数据库连接」为例，先看简单工厂的写法及其问题，再看如何用工厂方法重构成
          「加新数据库只新增类」。最后给出抽象工厂的骨架，体会「产品族」的概念。
        </p>
        <CodeBlock lang="java" title="简单工厂（违反开闭、非 GoF）" code={simpleFactoryCode} />
        <CodeBlock lang="java" title="工厂方法（接口 + 具体工厂）" code={factoryMethodCode} />
        <CodeBlock lang="java" title="抽象工厂（创建一族 UI 产品）" code={abstractFactoryCode} />
      </Practice>

      <Summary
        points={[
          '工厂模式隔离「易变的对象创建」，让调用方只关心要什么、不关心怎么造，满足开闭与依赖倒置。',
          '简单工厂用一个 if/switch 工厂集中创建，方便但违反开闭，且不属于 GoF 23 种模式。',
          '工厂方法为每个产品配一个工厂，新增产品只加类不改老代码，完美符合开闭原则。',
          '抽象工厂用于创建一整族互相搭配的产品（如同一风格的 UI 组件），换族就换工厂。',
          '层次越高类越多越复杂，产品稳定时强上抽象工厂属于过度设计。',
          '区分产品等级结构（同种产品多实现）与产品族（同风格多种产品组合）：抽象工厂对加族开放、对加等级封闭。',
          '工厂方法的经典形态是「模板方法 + 工厂方法」：父类定流程，把造哪个产品延迟到子类。',
          '实际应用：Spring BeanFactory（超级工厂）、Calendar.getInstance、LoggerFactory、Collection.iterator、Integer.valueOf 都是工厂思想。',
        ]}
      />
    </>
  )
}

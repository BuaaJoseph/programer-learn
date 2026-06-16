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
          '实际应用：Spring BeanFactory、Calendar.getInstance、日志框架的 LoggerFactory 都是工厂思想。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const java8Snippet = `// Java 8：函数式编程三件套
// Lambda
Runnable r = () -> System.out.println("hi");

// Stream：声明式集合处理
List<String> names = users.stream()
    .filter(u -> u.getAge() >= 18)
    .map(User::getName)
    .sorted()
    .collect(Collectors.toList());

// Optional（前面讲过）、新日期时间 API（LocalDate/LocalDateTime，不可变线程安全）
LocalDate today = LocalDate.now();`

const java1017Snippet = `// var（Java 10）：局部变量类型推断
var list = new ArrayList<String>();   // 编译器推断为 ArrayList<String>

// switch 表达式（Java 14 正式）：可返回值，箭头语法不穿透
String level = switch (score / 10) {
    case 10, 9 -> "A";
    case 8 -> "B";
    default -> "C";
};

// 文本块（Java 15）：多行字符串
String json = """
    { "name": "Tom", "age": 18 }
    """;

// record（Java 16）：不可变数据载体，自动生成构造/equals/hashCode/toString
record Point(int x, int y) {}

// sealed 类（Java 17）：限制可被哪些类继承
sealed interface Shape permits Circle, Square {}`

const java21Snippet = `// 虚拟线程（Java 21，Project Loom）：轻量级线程，海量并发不再靠线程池硬扛
Thread.startVirtualThread(() -> {
    // 阻塞操作（IO）时虚拟线程会让出载体线程，开销极小
    doBlockingIO();
});

// 用法上接近 BIO 的简单写法，却能像 NIO 一样支撑高并发——「同步代码，异步性能」

// 模式匹配（switch + record 解构，Java 21 正式）
String desc = switch (shape) {
    case Circle c -> "圆，半径 " + c.r();
    case Square s -> "方，边长 " + s.side();
    default -> "未知";
};`

export default function Ch2() {
  return (
    <article>
      <Lead>
        本章收束全课：先梳理 Java 8 到最新长期支持版本（LTS）的新特性脉络，看清语言这些年往哪个方向演进；
        再厘清 PO/VO/BO/DTO/DAO/POJO 这堆「分层对象命名」到底各指什么——这是工程实践里天天用、面试也常问的概念。
      </Lead>

      <h2>一、各版本新特性脉络</h2>
      <KeyIdea>
        记新特性别死背版本号，要抓<strong>主线</strong>：Java 8 引入<strong>函数式编程</strong>（Lambda/Stream）；
        9~17 持续做<strong>语法现代化</strong>（var、switch 表达式、文本块、record、sealed）；
        21 带来里程碑式的<strong>虚拟线程</strong>。整体趋势是「更简洁的语法 + 更强的并发」。
      </KeyIdea>

      <h3>面试题 1：Java 8 有哪些重要新特性？</h3>
      <p>Java 8 是分水岭，把函数式编程引入 Java，至今仍是日常用得最多的一批特性：</p>
      <ul>
        <li><strong>Lambda 表达式</strong>：把行为当参数传，配合函数式接口（<code>@FunctionalInterface</code>）。</li>
        <li><strong>Stream API</strong>：声明式地对集合做过滤、映射、归约，链式调用、可并行。</li>
        <li><strong>Optional</strong>：优雅处理可能为空的值（第三卷讲过）。</li>
        <li><strong>新日期时间 API</strong>：<code>LocalDate</code>/<code>LocalDateTime</code>，不可变、线程安全，取代老旧的 <code>Date</code>/<code>Calendar</code>。</li>
        <li><strong>接口默认方法</strong>：接口可有 <code>default</code> 实现（第一卷讲过）。</li>
      </ul>
      <CodeBlock lang="java" title="Java 8 函数式特性" code={java8Snippet} />

      <h3>面试题 2：Java 9~17 有哪些值得一提的特性？</h3>
      <table>
        <thead>
          <tr><th>版本</th><th>代表特性</th></tr>
        </thead>
        <tbody>
          <tr><td>Java 9</td><td>模块系统（JPMS）、<code>jshell</code>、集合工厂方法 <code>List.of</code>、紧凑字符串</td></tr>
          <tr><td>Java 10</td><td><code>var</code> 局部变量类型推断</td></tr>
          <tr><td>Java 11（LTS）</td><td>HttpClient 标准化、<code>String</code> 增强方法、可直接运行单文件源码</td></tr>
          <tr><td>Java 14~15</td><td>switch 表达式、文本块、有用的 NPE 提示信息</td></tr>
          <tr><td>Java 16</td><td><code>record</code>（不可变数据类）、模式匹配 instanceof</td></tr>
          <tr><td>Java 17（LTS）</td><td><code>sealed</code> 密封类、record/pattern 持续完善</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="Java 10~17 语法现代化" code={java1017Snippet} />
      <Callout variant="note" title="LTS 版本最值得记">
        Java 8、11、17、21 是长期支持版本（LTS），企业生产多锁定在这几个版本。
        所以面试重点关注 8（函数式）、17（record/sealed）、21（虚拟线程）这几个 LTS 的标志性特性，
        中间的过渡版本知道大方向即可。21 之后还有 25 等新 LTS 延续这些方向。
      </Callout>

      <h3>面试题 3：Java 21 的虚拟线程是什么，解决什么问题？</h3>
      <p>
        虚拟线程（Virtual Threads，Project Loom，Java 21 正式）是 JVM 管理的<strong>轻量级线程</strong>。
        传统平台线程一对一映射操作系统线程，创建成本高、数量有限（几千个就吃力）；
        虚拟线程极其轻量，可以创建<strong>百万级</strong>，阻塞时会自动让出底层载体线程。
      </p>
      <CodeBlock lang="java" title="Java 21 虚拟线程与模式匹配" code={java21Snippet} />
      <Example title="虚拟线程的意义：同步写法，异步性能">
        <p>
          以前要高并发只能写复杂的 NIO/异步回调代码（难写难调）；虚拟线程让你用<strong>最朴素的同步阻塞写法</strong>
          （一请求一线程），却能像 NIO 一样扛住海量并发——因为阻塞的虚拟线程几乎不占资源。
          这可能从根本上改变 Java 高并发编程的范式，是近年最重要的特性之一。
        </p>
      </Example>

      <h2>二、PO/VO/BO/DTO/DAO/POJO 命名</h2>
      <h3>面试题 4：PO、VO、BO、DTO、DAO、POJO 有什么区别？</h3>
      <p>
        这些是分层架构里给不同职责对象起的命名约定，本身都是普通 Java 类，区别在<strong>用在哪一层、承载什么职责</strong>：
      </p>
      <table>
        <thead>
          <tr><th>名称</th><th>全称</th><th>职责</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>POJO</strong></td><td>Plain Ordinary Java Object</td><td>「普通 Java 对象」的统称，无特殊约束的简单类（其它几种多是 POJO 的具体角色）</td></tr>
          <tr><td><strong>PO</strong></td><td>Persistent Object</td><td>持久化对象，和数据库表一一对应，一行记录映射一个 PO</td></tr>
          <tr><td><strong>DAO</strong></td><td>Data Access Object</td><td>数据访问对象，封装对数据库的增删改查（注意它是「操作」不是「数据」）</td></tr>
          <tr><td><strong>BO</strong></td><td>Business Object</td><td>业务对象，封装业务逻辑，可能聚合多个 PO</td></tr>
          <tr><td><strong>DTO</strong></td><td>Data Transfer Object</td><td>数据传输对象，跨层/跨服务传输用，常按接口需要裁剪字段</td></tr>
          <tr><td><strong>VO</strong></td><td>View Object</td><td>视图对象，给前端/页面展示用，字段贴合展示需求</td></tr>
        </tbody>
      </table>
      <Example title="一条数据流过各层的变身">
        <p>
          查询用户：DAO 从数据库取出 <strong>PO</strong>（贴合表结构）→ Service 用 <strong>BO</strong> 处理业务、组合数据 →
          转成 <strong>DTO</strong> 通过接口传给上层或别的服务 → Controller 再转成 <strong>VO</strong> 给前端展示
          （比如脱敏手机号、拼接展示字段）。同一份用户数据，在不同层用不同对象承载，是为了<strong>解耦各层、各管各的关注点</strong>，
          避免数据库结构直接暴露给前端、也避免展示需求污染领域模型。
        </p>
      </Example>
      <Callout variant="tip" title="面试要点：为什么要分这么多对象？">
        核心是<strong>各层解耦、单一职责</strong>。如果全用一个对象贯穿所有层，数据库字段一改就可能波及前端、
        敏感字段会被透传、不同接口的差异化需求也没法满足。分层对象虽然多写了转换代码，
        但换来了清晰的边界和可维护性。小项目可以适当简化，不必教条地全套都建。
      </Callout>

      <h3>面试题 5：record 和普通 POJO/DTO 有什么关系？</h3>
      <p>
        <code>record</code>（Java 16）天生就是为「<strong>不可变数据载体</strong>」设计的，非常适合用来写 DTO/VO。
        一行 <code>record Point(int x, int y) {}</code> 就自动生成了私有 final 字段、全参构造器、
        访问器、<code>equals</code>/<code>hashCode</code>/<code>toString</code>，省掉一大堆样板代码。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>普通 POJO</th><th>record</th></tr>
        </thead>
        <tbody>
          <tr><td>可变性</td><td>通常可变（有 setter）</td><td>不可变（字段 final）</td></tr>
          <tr><td>样板代码</td><td>需手写/IDE 生成</td><td>编译器自动生成</td></tr>
          <tr><td>适用</td><td>需要可变状态的领域对象</td><td>DTO、VO、值对象等只读数据</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="record 不是万能替代">
        record 不可变、不能继承普通类，所以适合做<strong>纯数据传输/展示对象</strong>（DTO/VO），
        而需要可变状态、配合 ORM 框架（很多框架要求无参构造和 setter）的 PO/实体类，仍常用普通 POJO。
        理解「record 适合只读值对象」这个边界，比盲目用 record 替换一切更重要。
      </Callout>

      <h3>面试题 6：你升级 JDK 版本时会关注哪些方面？</h3>
      <p>
        这是一道考工程经验的开放题。升级 JDK 不只是「换个版本号」，要系统评估：
      </p>
      <ul>
        <li><strong>语言/API 收益</strong>：能用上 record、文本块、虚拟线程等新特性带来的简化与性能。</li>
        <li><strong>GC 与性能</strong>：新版本常带来更好的 GC（如 ZGC/G1 的演进），需压测对比。</li>
        <li><strong>兼容性</strong>：废弃/移除的 API（如 JDK 9 模块化后部分内部 API 不可用）、第三方库是否支持新版本。</li>
        <li><strong>LTS 优先</strong>：生产环境优先选 LTS（8/11/17/21/25），获得长期安全补丁。</li>
      </ul>
      <Callout variant="tip" title="一句话收束这门课">
        从 Java 8 到 25，语言一直朝「更简洁、更安全、更高并发」演进，但底层的 OOP、JVM、类加载、反射等原理
        十多年来稳如磐石。<strong>把原理吃透，新特性只是锦上添花</strong>——这正是这门基础课最想留给你的东西。
      </Callout>

      <h3>面试题 7：Stream 是什么？和普通集合遍历有何不同？</h3>
      <p>
        Stream（Java 8）提供<strong>声明式</strong>的集合处理：你描述「想做什么」（过滤、映射、归约），
        而不是写「怎么一步步循环」。它和普通 for 遍历的本质区别有三点：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>普通遍历</th><th>Stream</th></tr>
        </thead>
        <tbody>
          <tr><td>风格</td><td>命令式（怎么做）</td><td>声明式（做什么）</td></tr>
          <tr><td>求值</td><td>立即执行</td><td>惰性：中间操作不执行，遇终结操作才触发</td></tr>
          <tr><td>并行</td><td>需手动写多线程</td><td>parallelStream 一键并行</td></tr>
          <tr><td>复用</td><td>集合可反复遍历</td><td>Stream 用完即废，不能重复消费</td></tr>
        </tbody>
      </table>
      <Callout variant="note" title="中间操作 vs 终结操作">
        <code>filter</code>/<code>map</code>/<code>sorted</code> 是<strong>中间操作</strong>，返回新 Stream、惰性不执行；
        <code>collect</code>/<code>forEach</code>/<code>count</code>/<code>reduce</code> 是<strong>终结操作</strong>，触发整条链真正执行。
        没有终结操作，前面的中间操作一行都不会跑——这是 Stream「惰性求值」的关键，也是常见的「为什么我的 Stream 没执行」的答案。
      </Callout>

      <h3>面试题 8：Lambda 表达式的本质是什么？</h3>
      <p>
        Lambda 是<strong>函数式接口</strong>（只有一个抽象方法的接口，可加 <code>@FunctionalInterface</code>）的简洁实现写法。
        它本质上是「把一段行为当作值传递」。底层并非简单的匿名内部类语法糖——编译器用
        <code>invokedynamic</code> 指令在运行时按需生成实现，比匿名内部类更高效、不会每个 Lambda 都生成一个 .class。
      </p>
      <Callout variant="tip" title="Lambda 和匿名内部类的区别别答错">
        三点核心差异：① Lambda 只能用于函数式接口，匿名内部类可实现任意接口/抽象类；
        ② Lambda 的 <code>this</code> 指向<strong>外部类实例</strong>，匿名内部类的 this 指向<strong>它自己</strong>；
        ③ Lambda 底层用 invokedynamic 动态生成、不额外产 class 文件，匿名内部类会编译出 <code>Outer$1.class</code>。
        这呼应了第一卷讲匿名内部类时的对比，能串起来答就很完整。
      </Callout>

      <h2>三、全课收束</h2>
      <p>
        到这里，这门课从「Java 与平台」起步，走过面向对象、类与对象、数值与字符串、异常与泛型、
        反射注解代理、类加载、IO 与新特性，把 Java 基础里最核心、面试最高频的考点串了一遍。
        基础课的目标不是让你背完所有八股，而是<strong>建立起「知其然更知其所以然」的思维</strong>——
        知道每个机制为什么这样设计、解决了什么问题、有什么取舍。带着这种思维，再深的题也能推演出答案。
      </p>

      <Summary
        points={[
          'Java 演进主线：8 引入函数式（Lambda/Stream/Optional/新日期）、9~17 语法现代化（var/switch 表达式/文本块/record/sealed）、21 虚拟线程。',
          'LTS 版本（8/11/17/21/25）是生产主力，面试重点记 8 的函数式、17 的 record/sealed、21 的虚拟线程。',
          '虚拟线程是 JVM 管理的轻量线程，可创建百万级、阻塞时自动让出载体线程，实现「同步写法、异步性能」，重塑高并发范式。',
          'POJO 是普通 Java 对象统称；PO 对应数据库表，DAO 封装数据库操作，BO 承载业务逻辑，DTO 跨层传输，VO 面向展示。',
          '分层对象的意义是各层解耦、单一职责：避免数据库结构暴露给前端、敏感字段透传，满足差异化接口需求。',
          '学 Java 基础的关键是「知其所以然」：理解每个机制的设计动机与取舍，比死记结论更能从容应对面试。',
        ]}
      />
    </article>
  )
}

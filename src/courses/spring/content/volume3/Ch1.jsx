import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const importsFileCode = `# 文件路径：META-INF/spring/
#   org.springframework.boot.autoconfigure.AutoConfiguration.imports
# 每行一个全限定类名，新版用它取代了 spring.factories 里的那段配置

org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.ServletWebServerFactoryAutoConfiguration
org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration`

const annotationCode = `// @SpringBootApplication 其实是一个组合注解，等价于下面三个：
@SpringBootConfiguration   // 本质是 @Configuration，标记它是一个配置类
@ComponentScan             // 扫描本包及子包下的 @Component / @Service 等
@EnableAutoConfiguration   // 开启自动配置，这是 starter 能开箱即用的关键
public class DemoApplication {

    public static void main(String[] args) {
        // run 内部：创建 IoC 容器 -> 准备环境 -> 刷新容器
        //          -> 触发自动配置 -> 启动内嵌 Tomcat
        SpringApplication.run(DemoApplication.class, args);
    }
}`

const conditionCode = `@AutoConfiguration
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
// 只有 classpath 上存在这些类时，这个配置类才会被处理
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean    // 容器里没有用户自定义的同类型 Bean 时才生效
    @ConditionalOnProperty(
        name = "spring.datasource.url")  // 配了 url 才装配
    DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          为什么 Spring 时代要写一大堆 XML、配 <code>DispatcherServlet</code>、配视图解析器、配数据源，
          到了 SpringBoot 只要引一个依赖、写个 <code>main</code> 方法就能跑起来？这背后没有魔法，
          全靠一套<em>自动配置</em>（auto-configuration）机制。这一章把它从头到尾拆开，让你面试时能讲清楚「它是怎么帮我配好的」。
        </p>
      </Lead>

      <h2>SpringBoot 到底解决了什么</h2>
      <p>
        传统 Spring 的痛点是「配置太多、太散」。SpringBoot 的核心思想是
        <strong>约定大于配置</strong>（convention over configuration）：它给绝大多数场景准备好一套合理的默认配置，
        你不配就用默认值，要改才动手。围绕这个思想，它提供了三件套：
      </p>
      <ul>
        <li>
          <strong>起步依赖</strong>（starter）：把一类功能要用到的依赖打成一个包，比如
          <code>spring-boot-starter-web</code> 一引，Spring MVC、Jackson、内嵌 Tomcat 全到位，不用自己挑版本。
        </li>
        <li>
          <strong>自动配置</strong>：根据 classpath 上有什么、配置文件里写了什么，自动帮你装配相应的 Bean。
        </li>
        <li>
          <strong>内嵌容器</strong>：把 Tomcat / Jetty 直接打进 jar 里，<code>java -jar</code> 就能起服务，不再需要单独部署到外部容器。
        </li>
      </ul>

      <h3>入口注解 @SpringBootApplication</h3>
      <p>
        一切从启动类上那个 <code>@SpringBootApplication</code> 开始。它是一个<em>组合注解</em>，
        拆开来是三个：<code>@SpringBootConfiguration</code>（本质就是 <code>@Configuration</code>，声明这是配置类）、
        <code>@ComponentScan</code>（扫描启动类所在包及其子包，把你的 <code>@Service</code>、<code>@Controller</code> 注册进容器）、
        以及最关键的 <code>@EnableAutoConfiguration</code>（开启自动配置）。
      </p>
      <CodeBlock lang="java" title="启动类与 @SpringBootApplication" code={annotationCode} />

      <h3>@EnableAutoConfiguration 是怎么找到配置类的</h3>
      <p>
        <code>@EnableAutoConfiguration</code> 内部用 <code>@Import(AutoConfigurationImportSelector.class)</code>
        导入了一个<em>选择器</em>。这个选择器在启动时会去读 classpath 下所有 jar 包里的一份清单文件——
        老版本是 <code>META-INF/spring.factories</code> 里 <code>EnableAutoConfiguration</code> 那个 key 对应的值，
        新版本（SpringBoot 2.7+）换成了 <code>META-INF/spring/...AutoConfiguration.imports</code> 文件。
        清单里列着一长串<em>自动配置类</em>（XxxAutoConfiguration）的全限定名。
      </p>
      <CodeBlock
        lang="text"
        title="AutoConfiguration.imports（节选）"
        code={importsFileCode}
      />
      <p>
        选择器把这些类名全部读出来，作为「候选配置类」交给容器。但注意——候选不等于全部生效，
        到底用不用，还要过下一道关卡：条件注解。
      </p>

      <h3>@Conditional：按条件决定生不生效</h3>
      <p>
        每个自动配置类上、以及里面的每个 <code>@Bean</code> 方法上，几乎都挂着
        <code>@Conditional</code> 家族的注解，比如 <code>@ConditionalOnClass</code>（classpath 上有某个类才生效）、
        <code>@ConditionalOnMissingBean</code>（容器里没有同类型 Bean 才生效）、<code>@ConditionalOnProperty</code>（配置项满足条件才生效）。
        正是这套条件判断，让「引了才配、没引不配、你配了我就让位」成为可能。
      </p>

      <Example title="引入 spring-boot-starter-web 就有了内嵌 Tomcat">
        <p>当你在 pom 里加上 <code>spring-boot-starter-web</code>，一连串自动配置被悄悄触发：</p>
        <ul>
          <li>
            starter 把 <code>tomcat-embed-core</code> 带进了 classpath，于是
            <code>ServletWebServerFactoryAutoConfiguration</code> 上的
            <code>@ConditionalOnClass(Tomcat.class)</code> 成立，内嵌 Tomcat 工厂被装配。
          </li>
          <li>
            同时 Spring MVC 相关类也在 classpath 上，于是
            <code>DispatcherServletAutoConfiguration</code> 生效，自动注册了 <code>DispatcherServlet</code>。
          </li>
        </ul>
        <p>
          结果就是：你一行配置没写，<code>run</code> 之后 8080 端口已经在监听了。换一个角度看，
          「开箱即用」=「合适的 jar 在 classpath 上」+「自动配置类被条件命中」。
        </p>
      </Example>

      <KeyIdea title="一句话串起整条链路">
        <p>
          <code>@SpringBootApplication</code> → <code>@EnableAutoConfiguration</code> →
          <code>@Import(AutoConfigurationImportSelector)</code> → 读
          <strong>imports / spring.factories</strong> 清单 → 拿到一堆候选 <em>XxxAutoConfiguration</em> →
          逐个用 <strong>@Conditional</strong> 过滤 → 命中的才把 Bean 装进 IoC 容器。
          记住这条链，自动配置原理这道题就答完了一大半。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="两个容易答错的细节">
        <ul>
          <li>
            自动配置类的优先级<strong>低于</strong>你自己写的配置。<code>@ConditionalOnMissingBean</code>
            的存在意味着：只要你定义了同类型的 Bean，自动配置就主动让位，所以「自定义会覆盖默认」而不是冲突报错。
          </li>
          <li>
            SpringBoot 2.7 起，<code>spring.factories</code> 注册自动配置的方式被<strong>废弃</strong>，
            改用 <code>AutoConfiguration.imports</code> 文件；老项目里两种可能都见得到，别记混了。
          </li>
        </ul>
      </Callout>

      <h2>run() 启动流程简述</h2>
      <p>
        面试常追问「<code>SpringApplication.run()</code> 里发生了什么」，记住几步主干即可：
        先<strong>创建并准备 IoC 容器</strong>（根据是不是 web 应用选 <code>AnnotationConfigServletWebServerApplicationContext</code> 之类的实现）；
        接着<strong>准备 Environment</strong>（加载 application.yml、命令行参数等）；
        然后<strong>刷新容器</strong>（<code>refresh()</code>，在这一步触发上面讲的自动配置、实例化所有 Bean）；
        web 应用在刷新过程中会<strong>创建并启动内嵌 Tomcat</strong>，绑定端口开始对外服务。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「SpringBoot 自动配置原理」，别上来就背名词。建议按这个顺序讲：
        <strong>它解决什么</strong>（约定大于配置）→ <strong>入口</strong>（@SpringBootApplication 拆成三注解）→
        <strong>怎么找到配置类</strong>（@EnableAutoConfiguration 用 selector 读 imports 清单）→
        <strong>怎么决定生效</strong>（@Conditional 系列）→ 举一个<strong>具体例子</strong>（引 web starter 就有了 Tomcat）。
        有了主线再补细节，考官会觉得你是真懂而不是死记。
      </p>

      <Practice title="读一个 XxxAutoConfiguration 的条件结构">
        <p>
          在 IDE 里按住 Ctrl 点开任意一个自动配置类（比如 <code>DataSourceAutoConfiguration</code>），
          重点看类上和 <code>@Bean</code> 方法上挂了哪些 <code>@ConditionalOnXxx</code>，对照下面这段结构理解它「在什么条件下、装配什么 Bean」。
        </p>
        <CodeBlock lang="java" title="DataSourceAutoConfiguration（简化）" code={conditionCode} />
        <p>
          再启动时加上 <code>--debug</code> 参数，控制台会打印一份 <em>Conditions Evaluation Report</em>，
          列出哪些自动配置「matched（生效）」、哪些「did not match（被条件挡掉）」以及原因，这是排查自动配置问题最直接的工具。
        </p>
      </Practice>

      <Summary
        points={[
          'SpringBoot 三件套：约定大于配置、起步依赖（starter）、内嵌容器，目标是开箱即用。',
          '@SpringBootApplication = @SpringBootConfiguration + @ComponentScan + @EnableAutoConfiguration。',
          '@EnableAutoConfiguration 通过 @Import(AutoConfigurationImportSelector) 读取 spring.factories（新版 AutoConfiguration.imports）里的候选配置类。',
          '@Conditional 家族（OnClass / OnMissingBean / OnProperty 等）按条件决定每个自动配置和 Bean 是否生效。',
          'run() 主干：创建 IoC 容器 -> 准备环境 -> 刷新容器（触发自动配置）-> 启动内嵌 Tomcat。',
          '排查神器：启动加 --debug 看 Conditions Evaluation Report，确认哪些自动配置生效及原因。',
        ]}
      />
    </>
  )
}

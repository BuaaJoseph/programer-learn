import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const moduleLayoutCode = `short-link-spring-boot-starter            <- 空壳，只声明对 autoconfigure 的依赖
  -> pom 里依赖 short-link-spring-boot-autoconfigure

short-link-spring-boot-autoconfigure      <- 真正干活的模块
  src/main/java/.../ShortLinkAutoConfiguration.java
  src/main/java/.../ShortLinkProperties.java
  src/main/java/.../ShortLinkService.java
  src/main/resources/META-INF/spring/
      org.springframework.boot.autoconfigure.AutoConfiguration.imports`

const propertiesCode = `// 把 application.yml 里 short-link.* 前缀的配置绑定到这个对象上
@ConfigurationProperties(prefix = "short-link")
public class ShortLinkProperties {

    // 短链域名，对应 short-link.domain
    private String domain = "https://s.demo.cn";

    // 是否启用，对应 short-link.enabled，默认开
    private boolean enabled = true;

    // getter / setter 省略（绑定靠的就是 setter）
}`

const autoConfigCode = `@AutoConfiguration
@ConditionalOnClass(ShortLinkService.class)       // 引了本 starter 才有这个类
@EnableConfigurationProperties(ShortLinkProperties.class)
@ConditionalOnProperty(                            // short-link.enabled=true 才装配
    prefix = "short-link", name = "enabled",
    havingValue = "true", matchIfMissing = true)
public class ShortLinkAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean   // 用户自己定义了就用用户的，否则用这个默认实现
    public ShortLinkService shortLinkService(ShortLinkProperties props) {
        return new ShortLinkService(props.getDomain());
    }
}`

const importsCode = `# 文件：autoconfigure 模块的
#   src/main/resources/META-INF/spring/
#     org.springframework.boot.autoconfigure.AutoConfiguration.imports
# 把自动配置类注册进去，SpringBoot 启动时才扫得到它

com.demo.shortlink.ShortLinkAutoConfiguration`

const useCode = `# 使用方只要引入 starter，再在 application.yml 里写配置即可
short-link:
  domain: https://s.myapp.cn
  enabled: true

# 然后在任意 Bean 里直接注入，开箱即用：
# @Autowired ShortLinkService shortLinkService;`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章讲了 SpringBoot 怎么读自动配置类、怎么用条件注解决定生效。这一章把视角反过来：
          假如<strong>你</strong>要做一个能让别人「引一下就能用」的功能组件，应该怎么打包成 <em>starter</em>？
          搞懂这件事，自动配置原理才算真正落到自己手上，面试里「你写过 starter 吗」也能答得有血有肉。
        </p>
      </Lead>

      <h2>starter 到底是什么</h2>
      <p>
        starter（起步依赖）= <strong>一组依赖</strong> + <strong>一套自动配置</strong>，打包在一起，目标是<em>开箱即用</em>。
        使用方只需引入一个坐标，不用关心内部用了哪些库、要配哪些 Bean——这些都被 starter 提前安排好了。
        官方约定命名规则也值得记：官方 starter 叫 <code>spring-boot-starter-xxx</code>，
        第三方的应叫 <code>xxx-spring-boot-starter</code>（前缀放自己的名字），别占用官方命名空间。
      </p>

      <h3>一个 starter 通常拆成两个模块</h3>
      <p>
        规范做法是分成两个 Maven 模块：一个 <code>autoconfigure</code> 模块装真正的自动配置代码和属性类；
        一个 <code>starter</code> 模块几乎是个空壳，只在 pom 里声明对 autoconfigure 以及相关第三方库的依赖。
        这样做的好处是「依赖管理」和「配置逻辑」职责分离，使用方引 starter 就会顺带把 autoconfigure 拉进来。
      </p>
      <CodeBlock lang="text" title="模块结构" code={moduleLayoutCode} />

      <h2>自己写一个 starter 的四步</h2>
      <p>把上一章学到的机制反过来用，写 starter 就是这四步：</p>
      <ul>
        <li>
          <strong>建 autoconfigure 模块</strong>，引入 <code>spring-boot-autoconfigure</code> 依赖。
        </li>
        <li>
          <strong>写配置属性类</strong>，用 <code>@ConfigurationProperties</code> 把 application.yml 里的配置绑定成对象。
        </li>
        <li>
          <strong>写自动配置类</strong>，用 <code>@Conditional</code> 家族控制按需装配，把功能 Bean 注册进容器。
        </li>
        <li>
          <strong>注册自动配置类</strong>，在 <code>META-INF/spring/...AutoConfiguration.imports</code>（老版本用 <code>spring.factories</code>）里登记它，否则 SpringBoot 根本扫不到。
        </li>
      </ul>

      <h3>第一关：@ConfigurationProperties 绑定 yml</h3>
      <p>
        让组件可配置，就得把 <code>application.yml</code> 里的值读进来。<code>@ConfigurationProperties(prefix = "short-link")</code>
        会把所有 <code>short-link.</code> 开头的配置项，按字段名自动绑定到这个 POJO 的属性上（靠 setter 注入），还能给默认值。
      </p>
      <CodeBlock lang="java" title="ShortLinkProperties.java" code={propertiesCode} />

      <h3>第二关：@Conditional 家族实现按需装配</h3>
      <p>
        自动配置类是核心。这里组合用了几个条件注解：<code>@ConditionalOnClass</code> 保证「引了本 starter 才生效」；
        <code>@ConditionalOnProperty</code> 让使用方能用一个开关关掉整个功能；
        <code>@ConditionalOnMissingBean</code> 给使用方留出「自定义覆盖默认实现」的余地。
        <code>@EnableConfigurationProperties</code> 则负责让上面那个属性类生效并注入容器。
      </p>
      <CodeBlock lang="java" title="ShortLinkAutoConfiguration.java" code={autoConfigCode} />

      <h3>第三关：把自动配置类注册进 imports 清单</h3>
      <p>
        最容易被忘、也最常导致「我明明写了自动配置却不生效」的一步：自动配置类必须登记在清单文件里，
        SpringBoot 启动时的 selector 才扫得到它。新版放在
        <code>META-INF/spring/...AutoConfiguration.imports</code>，一行一个全限定类名。
      </p>
      <CodeBlock lang="text" title="AutoConfiguration.imports" code={importsCode} />

      <Example title="自定义一个 short-link-spring-boot-starter">
        <p>
          把上面三段拼起来，一个短链生成 starter 就成形了。使用方的体验是这样的：引入坐标 →
          在 yml 里配个域名 → 直接 <code>@Autowired</code> 注入 <code>ShortLinkService</code> 就能用。
        </p>
        <CodeBlock lang="yaml" title="使用方 application.yml" code={useCode} />
        <p>
          注意这套设计同时满足了三种诉求：默认就能用（<code>matchIfMissing</code> + 默认域名）、可配置（properties 绑定）、
          可替换（<code>@ConditionalOnMissingBean</code>），这正是一个「好用的」starter 该有的样子。
        </p>
      </Example>

      <KeyIdea title="写 starter 就是把自动配置原理反着用">
        <p>
          上一章你<strong>读</strong>别人的 XxxAutoConfiguration；这一章你<strong>写</strong>自己的 XxxAutoConfiguration。
          底层是同一套机制：<em>imports 清单</em>负责被扫到，<em>@Conditional</em> 负责按需生效，
          <em>@ConfigurationProperties</em> 负责接住 yml 配置。把这三个点串起来，自定义 starter 就没有秘密了。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="新手最常踩的两个坑">
        <ul>
          <li>
            <strong>忘了注册 imports 文件</strong>：自动配置类写得再好，没登记就不会被加载，表现为「Bean 注入不到」。
            排查时先看 imports 文件路径和类名对不对。
          </li>
          <li>
            <strong>自动配置类被 @ComponentScan 扫到了</strong>：自动配置类应靠 imports 清单加载，
            而<strong>不该</strong>放在使用方启动类的扫描包路径下，否则可能重复装配或绕过条件判断。把它放到独立的包名里。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「怎么自己写一个 starter」，按这条线答最清楚：<strong>分两个模块</strong>（autoconfigure + starter 空壳）→
        <strong>@ConfigurationProperties</strong> 绑定配置 → <strong>@Conditional</strong> 系列控制按需装配 →
        <strong>imports / spring.factories</strong> 注册自动配置类。再补一句命名规范（<code>xxx-spring-boot-starter</code>）
        和「靠 @ConditionalOnMissingBean 让用户可覆盖」的设计考量，就很完整了。
      </p>

      <Practice title="搭一个最小自定义 starter">
        <p>
          照着下面的最小骨架，自己动手做一个 <code>short-link-spring-boot-starter</code>：
          一个属性类、一个自动配置类、一个 imports 文件，三样齐了就能在另一个项目里引用验证。
        </p>
        <CodeBlock lang="java" title="自动配置类（最小版）" code={autoConfigCode} />
        <p>
          建好后新开一个测试项目引入它，在 yml 里改 <code>short-link.domain</code>，
          注入 <code>ShortLinkService</code> 打印结果；再试试把 <code>short-link.enabled</code> 设为
          <code>false</code>，确认这时注入会失败——这说明你的 <code>@ConditionalOnProperty</code> 确实生效了。
        </p>
      </Practice>

      <Summary
        points={[
          'starter = 一组依赖 + 一套自动配置，打包成开箱即用的组件；第三方命名用 xxx-spring-boot-starter。',
          '规范做法分两个模块：autoconfigure 装配置逻辑，starter 空壳只声明依赖。',
          '@ConfigurationProperties(prefix) 把 application.yml 里对应前缀的配置绑定到 POJO，可设默认值。',
          '@Conditional 家族（OnClass / OnProperty / OnMissingBean）实现按需装配，并给使用方留出覆盖空间。',
          '自动配置类必须在 META-INF/spring/...AutoConfiguration.imports（旧版 spring.factories）注册，否则不生效。',
          '常见坑：忘注册 imports、或把自动配置类放进了使用方的组件扫描路径。',
        ]}
      />
    </>
  )
}

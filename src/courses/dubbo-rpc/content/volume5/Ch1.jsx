import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const xmlConfig = `<!-- XML 配置方式：集中、直观，适合统一管理 -->
<dubbo:application name="order-provider" />
<dubbo:registry address="zookeeper://127.0.0.1:2181" />
<dubbo:protocol name="dubbo" port="20880" />
<dubbo:service interface="com.demo.DemoService" ref="demoService"
               timeout="3000" retries="2" />`

const annoConfig = `// 注解配置方式：贴近代码，Spring Boot 主流
@DubboService(timeout = 3000, retries = 2)   // 暴露服务（提供者侧）
public class DemoServiceImpl implements DemoService { /* ... */ }

@DubboReference(timeout = 2000, check = false) // 引用服务（消费者侧）
private DemoService demoService;

// application.yml 里放全局/注册中心配置
// dubbo.registry.address=nacos://127.0.0.1:8848`

const timeoutConfig = `# 超时与重试：可在多个粒度配置，就近覆盖
# 全局
dubbo.consumer.timeout=2000
dubbo.consumer.retries=2

# 接口级 / 方法级（最细，方法级优先）
@DubboReference(
    timeout = 2000,
    methods = { @Method(name = "slowQuery", timeout = 5000, retries = 0) }
)
private DemoService demoService;
# 覆盖优先级（高到低）：方法级 > 接口级 > 消费者全局 > 提供者配置`

const directConfig = `// 直连提供者：开发调试时绕过注册中心，点对点调
@DubboReference(url = "dubbo://127.0.0.1:20880")
private DemoService demoService;

// 或在配置文件里
// dubbo.reference.com.demo.DemoService.url=dubbo://127.0.0.1:20880
// 注意：直连一般只用于联调/排错，生产仍走注册中心`

const aclConfig = `# 访问控制 ACL / 鉴权
@DubboService(
    parameters = {"accesslog", "true"}   // 开启访问日志
)
public class DemoServiceImpl implements DemoService {}

# Token 鉴权：提供者生成 token，消费者必须带对的 token 才能调
# <dubbo:service interface="..." token="true" />     随机 token
# <dubbo:service interface="..." token="abc123" />   固定 token
# 配合注册中心下发，消费者无 token 直接被拒`

export default function Ch1() {
  return (
    <article>
      <Lead>
        会配、配得对，是把 Dubbo 用好的第一步。面试里这一块偏「实战手感」：配置方式怎么选、超时重试在哪一级配、
        改了配置能不能不重启就生效、怎么直连调试、怎么做访问控制和健康检查、Telnet 命令怎么用。
        这一章按「配置 → 动态生效 → 调试 → 安全运维」的脉络，把这些题串起来讲清。
      </Lead>

      <h2>一、配置方式有哪些：XML vs 注解</h2>
      <h3>面试题：Dubbo 的配置方式有哪几种？各自适合什么场景？</h3>
      <p>
        主要有四种：XML、注解、API（编程式）、属性文件（properties/yml）。实际项目里最常见的是<strong>注解 + 属性文件</strong>（Spring Boot 风格）
        和 <strong>XML</strong>（传统 Spring 风格）。
      </p>
      <CodeBlock lang="xml" title="XML 配置方式" code={xmlConfig} />
      <CodeBlock lang="java" title="注解配置方式" code={annoConfig} />
      <table>
        <thead>
          <tr><th>方式</th><th>优点</th><th>适合</th></tr>
        </thead>
        <tbody>
          <tr><td>XML</td><td>集中、直观、可读性强，便于统一管理</td><td>传统 Spring 项目、配置项多</td></tr>
          <tr><td>注解</td><td>贴近代码、少样板，Spring Boot 主流</td><td>Spring Boot 微服务</td></tr>
          <tr><td>API</td><td>完全编程式、灵活</td><td>动态拼装、嵌入式场景</td></tr>
          <tr><td>属性文件</td><td>环境隔离、便于外部化</td><td>配合上面任一种做全局/环境配置</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        覆盖优先级要背熟：<strong>方法级 &gt; 接口级 &gt; 全局（消费者/提供者）</strong>，且消费者配置覆盖提供者配置（对超时这类）。
        粒度越细优先级越高。被问「我全局配了 timeout，某个慢方法想单独放宽怎么办」，答案就是在方法级再配一个更大的 timeout 覆盖它。
      </KeyIdea>

      <h2>二、超时与重试策略配置</h2>
      <h3>面试题：超时和重试在哪里配？默认值是多少？</h3>
      <CodeBlock lang="text" title="超时与重试配置及覆盖优先级" code={timeoutConfig} />
      <p>
        默认超时 <strong>1000ms</strong>，默认 <code>retries=2</code>（即 failover 下最多调 3 次）。两个高频追问：
      </p>
      <ul>
        <li><strong>超时是哪端控制的？</strong> 以消费者配置为准（消费者覆盖提供者），但提供者也能配默认值供未配置的消费者使用。</li>
        <li><strong>超时了服务端会停吗？</strong> 不会。消费者超时只是不再等待并抛 <code>TimeoutException</code>，服务端那次执行<strong>仍在继续</strong>。这就是为什么超时 + 重试对非幂等写操作危险——可能产生重复数据。</li>
      </ul>
      <Callout variant="warn" title="超时链路要做预算">
        A 调 B、B 调 C，若超时各设 3s，A 的超时必须 ≥ B 的，否则 A 早就超时返回了，B/C 还在白干。
        实战要做「超时预算」：越上游超时越大，越下游越小，避免无效等待和资源空转。
      </Callout>

      <h2>三、动态配置实时生效</h2>
      <h3>面试题：改了 Dubbo 配置，能不重启就生效吗？</h3>
      <p>
        能。Dubbo 把配置分成三类：注册中心、元数据中心、<strong>配置中心</strong>。治理类规则（权重、路由、降级、超时等覆盖规则）写进配置中心后，
        会通过监听机制<strong>动态推送</strong>到各节点，节点重新组装 URL 参数、刷新 Invoker，无需重启即可生效。
      </p>
      <p>
        实现原理和服务发现类似：节点对配置中心里的规则节点注册监听，规则一变就回调，把新参数合并进运行时配置。
        Dubbo Admin 控制台改权重、加路由规则、一键降级，底层走的就是这条「写配置中心 → 推送 → 动态生效」的链路。
        这也是「服务治理能动态调整」的技术基础。
      </p>

      <h2>四、动态服务发现</h2>
      <h3>面试题：提供者扩缩容，消费者怎么自动感知？</h3>
      <p>
        靠注册中心的<strong>订阅—推送</strong>。消费者订阅服务目录，提供者上线就新增地址、下线就删除（如 ZK 临时节点随会话消失自动删），
        注册中心把变更推给消费者，消费者据此<strong>动态重建 Invoker 列表</strong>。整个过程对业务透明，扩容的新节点会自动接到流量，
        缩容/宕机的节点会被及时剔除。这就是「动态服务发现」——服务地址不是写死的，而是随集群拓扑实时变化的。
      </p>
      <Example title="一次扩容的感知过程">
        <p>
          大促前给订单服务从 5 个节点扩到 20 个：新 15 个节点启动注册 → 注册中心推送地址变更 → 各消费者刷新列表 →
          负载均衡自然把流量分到新节点。全程不用改消费者配置、不用重启消费者。
        </p>
      </Example>

      <h2>五、直连提供者 Direct Provider</h2>
      <h3>面试题：什么是直连？什么时候用？</h3>
      <CodeBlock lang="java" title="直连提供者配置" code={directConfig} />
      <p>
        直连就是消费者<strong>绕过注册中心</strong>，直接指定提供者的 IP+端口点对点调用。最典型的用途是<strong>开发联调和线上排错</strong>：
        想单独测某台提供者、或注册中心有问题时临时点对点验证。配置 <code>url</code> 后，该引用就不再走注册中心订阅。
      </p>
      <Callout variant="note" title="直连只是临时手段">
        直连会丢掉负载均衡、动态发现、容错等治理能力（因为绕过了集群层的动态列表），所以<strong>生产环境不要长期直连</strong>，
        它只适合调试。排查「服务调不通」时，用直连能快速区分「是注册发现的问题」还是「网络/服务本身的问题」。
      </Callout>

      <h2>六、服务自动上线与下线机制</h2>
      <h3>面试题：服务是怎么自动上下线的？怎么做到优雅停机？</h3>
      <p>
        <strong>自动上线</strong>：提供者启动、服务初始化完成后，向注册中心写入自己的地址（注册），消费者收到推送开始向它分流。
        <strong>自动下线</strong>：进程退出或与注册中心会话断开，地址被删除（ZK 临时节点自动消失），消费者收到推送把它剔除。
      </p>
      <p>
        关键追问是<strong>优雅停机（graceful shutdown）</strong>：直接 kill 进程会让正在执行的请求丢失、还没收到下线推送的消费者继续打过来报错。
        Dubbo 的优雅停机会：① 先从注册中心<strong>注销</strong>，不再接收新请求；② 等待已收到的请求<strong>处理完</strong>（有等待超时上限）；
        ③ 再关闭连接和容器。配合 JVM 的 ShutdownHook 触发，能把停机对调用方的影响降到最低。
      </p>

      <h2>七、访问控制 ACL</h2>
      <h3>面试题：怎么防止未授权的消费者调用你的服务？</h3>
      <CodeBlock lang="text" title="访问控制与 Token 鉴权" code={aclConfig} />
      <p>
        几种常见手段：<strong>Token 令牌</strong>——提供者生成 token 并通过注册中心下发给授权消费者，没有正确 token 的请求被拒，
        可防止消费者绕过注册中心直连；<strong>访问日志</strong>（accesslog）记录谁调了什么，便于审计；
        还可以结合自定义 <strong>Filter</strong> 做更复杂的鉴权（如校验 appkey、IP 白名单）。
        生产里通常把鉴权做成统一 Filter，对所有服务生效。
      </p>

      <h2>八、健康检查 Health Check</h2>
      <h3>面试题：怎么判断一个 Dubbo 节点是否健康？</h3>
      <p>
        多个层面：
      </p>
      <ul>
        <li><strong>注册中心层</strong>：节点在不在注册中心里（临时节点是否存在）本身就是一种存活判断。</li>
        <li><strong>Dubbo QoS / 端点</strong>：Dubbo 提供 QoS 命令和（配合 Spring Boot Actuator 的）健康检查端点，可暴露服务是否就绪、注册是否正常。</li>
        <li><strong>就绪 vs 存活</strong>：在 K8s 里要区分 liveness（活着没）和 readiness（能不能接流量）。readiness 没通过时不分流量，避免把请求打到还没初始化好的节点。</li>
      </ul>
      <Callout variant="tip" title="健康检查要测「真能干活」">
        好的健康检查不只看进程活着，还要看依赖（DB、缓存、注册中心连接）正常、服务已成功注册。否则节点「活着但干不了活」，
        流量打进去就是错误。这也是「服务上线后调不通」的常见原因之一。
      </Callout>

      <h2>九、Telnet 命令</h2>
      <h3>面试题：不写代码，怎么在线上排查一个 Dubbo 服务？</h3>
      <p>
        Dubbo 提供了 Telnet / QoS 命令，直接连到提供者端口就能交互式排查，运维很爱用。常用命令：
      </p>
      <table>
        <thead>
          <tr><th>命令</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td>ls</td><td>列出当前暴露/引用的服务和方法</td></tr>
          <tr><td>invoke</td><td>直接调用某方法，验证服务是否可用、返回是否正确</td></tr>
          <tr><td>ps / status</td><td>查看端口、连接、运行状态</td></tr>
          <tr><td>online / offline</td><td>手动上线/下线服务（配合优雅发布）</td></tr>
        </tbody>
      </table>
      <p>
        比如线上怀疑某方法返回有问题，可以直接 <code>invoke</code> 一把看结果，不必动业务流量；要灰度上下线某服务，
        可以用 online/offline 手动控制。新版本里这些能力收敛到了 <strong>QoS</strong> 模块（默认 22222 端口），是无侵入排障的利器。
      </p>

      <h2>十、服务依赖问题解决</h2>
      <h3>面试题：消费者启动时依赖的提供者还没起来，会怎样？check 怎么配？</h3>
      <p>
        默认 <code>check=true</code>：消费者启动时会<strong>检查依赖的服务是否已注册</strong>，没有就启动失败。
        这能尽早暴露「依赖没就绪」，但也带来<strong>启动顺序耦合</strong>——如果两个服务互相依赖，可能谁都起不来。
      </p>
      <ul>
        <li><strong>关掉启动检查</strong>：对可能后启动的依赖配 <code>check=false</code>，允许消费者先起来，等提供者上线后再正常调用。</li>
        <li><strong>解循环依赖</strong>：A 和 B 互相调用时，至少给一方加 <code>check=false</code>，打破启动期的死锁。</li>
        <li><strong>容错兜底</strong>：配合 mock/降级，即使依赖暂时不可用，调用方也能拿到兜底结果而不是直接崩。</li>
      </ul>
      <Callout variant="warn" title="check=false 不是银弹">
        关掉检查只是推迟了「发现依赖缺失」的时机——运行时若依赖始终不可用，调用照样失败。更根本的是治理好服务的依赖关系、
        做好降级，并通过监控及时发现「某依赖长期无可用提供者」。
      </Callout>

      <Summary
        points={[
          '配置方式：XML（集中直观）、注解（Spring Boot 主流）、API、属性文件；覆盖优先级 方法级 > 接口级 > 全局，消费者覆盖提供者。',
          '超时默认 1000ms、retries=2；超时以消费者为准，超时后服务端仍在执行，故非幂等写慎用重试；超时要做上下游预算。',
          '动态配置实时生效：治理规则写配置中心 → 监听推送 → 节点刷新 URL/Invoker，无需重启，是动态治理的基础。',
          '动态服务发现靠注册中心订阅推送，扩缩容自动感知、动态重建 Invoker 列表，对业务透明。',
          '直连绕过注册中心点对点调，只用于联调和排错，会丢治理能力，生产勿长期使用。',
          '自动上下线 + 优雅停机：先注销不收新请求、等存量请求处理完再关闭；ACL 用 token/accesslog/Filter 鉴权。',
          '健康检查分存活与就绪、要测真能干活；Telnet/QoS 提供 ls/invoke/online/offline 无侵入排障；check=false 解启动期循环依赖但需配合降级与监控。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const lbConfig = `# 负载均衡可在多个粒度配置（就近优先）
# 消费者级
@DubboReference(loadbalance = "roundrobin")
private DemoService demoService;

# 方法级（更细）
@DubboReference(methods = { @Method(name = "findById", loadbalance = "consistenthash") })
private DemoService demoService2;

# 可选值：random（默认） / roundrobin / leastactive / shortestresponse / consistenthash`

const clusterConfig = `# 集群容错策略（cluster）配置
@DubboReference(cluster = "failover", retries = 2)   // 默认：失败重试其他节点
private DemoService demoService;

# 可选：
# failover  失败自动切换重试（默认，retries=2 即最多调 3 次）
# failfast  快速失败，只调一次，失败即抛（适合非幂等写操作）
# failsafe  失败忽略，返回空结果（适合写日志这类不重要操作）
# failback  失败后定时重发（适合通知类）
# forking   并行调多个，取最快返回（实时性高、浪费资源）
# broadcast 广播调用所有节点（适合刷新缓存/配置）`

const mockConfig = `# 服务降级 / Mock：调用失败时走兜底
@DubboReference(mock = "true")        // 找同包下 接口名+Mock 的类
private DemoService demoService;

# 或直接返回固定值（force: 直接不发起远程调用就返回；fail: 失败才走 mock）
@DubboReference(mock = "return null")        // 失败返回 null
@DubboReference(mock = "force:return null")  // 不调用直接返回 null（强制降级）

# 对应的 Mock 实现类（约定：接口全限定名 + "Mock"）
public class DemoServiceMock implements DemoService {
    public String sayHello(String name) {
        return "降级兜底数据";   // 远程调用失败时返回它
    }
}`

const groupVersion = `<!-- 分组 group：同接口的不同业务线/数据源隔离 -->
<dubbo:service interface="com.demo.UserService" ref="userA" group="aGroup" />
<dubbo:service interface="com.demo.UserService" ref="userB" group="bGroup" />
<dubbo:reference id="userA" interface="com.demo.UserService" group="aGroup" />

<!-- 版本 version：接口不兼容升级时新老并存，平滑迁移 -->
<dubbo:service interface="com.demo.UserService" ref="userV1" version="1.0.0" />
<dubbo:service interface="com.demo.UserService" ref="userV2" version="2.0.0" />
<dubbo:reference id="user" interface="com.demo.UserService" version="2.0.0" />`

export default function Ch3() {
  return (
    <article>
      <Lead>
        服务治理是 Dubbo 区别于「裸 RPC」的核心价值，也是面试里出题最密集的一卷。这一章把治理相关的高频题一网打尽：
        负载均衡、集群容错、路由、降级限流熔断、Mock 与 Stub、分组与版本、灰度发布、多协议多注册中心、治理中心与监控中心。
        每道题都给原理、对比和配置，让你答得既有广度又有深度。
      </Lead>

      <h2>一、负载均衡策略</h2>
      <h3>面试题：Dubbo 有哪些负载均衡策略？默认是哪个？</h3>
      <p>
        负载均衡决定「从多个提供者里挑哪个」。Dubbo 内置这几种，靠 SPI 可插拔：
      </p>
      <table>
        <thead>
          <tr><th>策略</th><th>原理</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td>random（默认）</td><td>按权重的随机，权重高被选概率大</td><td>通用，节点性能不均时靠权重调节</td></tr>
          <tr><td>roundrobin</td><td>按权重的轮询，均匀分摊</td><td>请求耗时相近的场景</td></tr>
          <tr><td>leastactive</td><td>选「活跃调用数最少」的节点</td><td>让慢节点少接活，自动避让</td></tr>
          <tr><td>shortestresponse</td><td>选预估响应最快的节点</td><td>对延迟敏感</td></tr>
          <tr><td>consistenthash</td><td>同参数请求落到同一节点（一致性哈希）</td><td>需要会话/缓存粘性</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="text" title="负载均衡的配置粒度" code={lbConfig} />
      <p>
        易错点：默认是 <strong>random（加权随机）</strong>而不是轮询。另外 leastactive 能「自动避让慢节点」，
        因为慢节点的活跃调用数下降得慢、会被少分流量，这是它相比纯随机/轮询的优势。
      </p>

      <h2>二、集群容错机制</h2>
      <h3>面试题：一个提供者节点调用失败了怎么办？有哪些容错策略？</h3>
      <p>
        集群容错决定「调用失败后整个集群层怎么兜」。默认 <strong>failover</strong>（失败重试其他节点）。
      </p>
      <CodeBlock lang="text" title="集群容错策略配置" code={clusterConfig} />
      <Callout variant="warn" title="failover 的重试陷阱">
        failover 默认 <code>retries=2</code>，意味着一次失败最多会调用 3 次（含首次）。对<strong>非幂等的写操作</strong>（如下单、扣款），
        重试可能造成重复执行！这类接口应改用 <strong>failfast</strong> 或把 retries 设为 0，并配合幂等设计。这是高频追问点。
      </Callout>
      <p>
        辨析「负载均衡 vs 集群容错」：负载均衡是「这次调用<strong>选哪个</strong>节点」，集群容错是「这次调用<strong>失败后</strong>怎么办」。
        二者协作——failover 重试时，会再走一次负载均衡（排除已失败节点）挑下一个目标。
      </p>

      <h2>三、服务路由控制</h2>
      <h3>面试题：Dubbo 的路由（Router）是干什么的？</h3>
      <p>
        路由在负载均衡<strong>之前</strong>执行：从全量可用提供者中先<strong>筛选出一个子集</strong>，再交给负载均衡挑一个。
        典型用途是「条件路由」「标签路由」——比如让某机房的消费者只调本机房的提供者，或者把带特定标签的请求只发往灰度节点。
      </p>
      <p>
        顺序记牢：<strong>目录(Directory) → 路由(Router 筛子集) → 负载均衡(LoadBalance 选一个) → 集群容错(Cluster 兜失败)</strong>。
        路由是「圈定范围」，负载均衡是「范围内挑」，两件事别混。灰度发布、同机房优先、读写分流，底层很多都靠路由实现。
      </p>

      <h2>四、服务降级策略</h2>
      <h3>面试题：服务降级怎么做？</h3>
      <p>
        降级是「当依赖不可用或为了保护核心链路时，主动给出一个可接受的兜底结果」。Dubbo 里最直接的方式是 <code>mock</code> 配置。
      </p>
      <CodeBlock lang="text" title="服务降级与 Mock 配置" code={mockConfig} />
      <p>
        两种降级形态要分清：
      </p>
      <ul>
        <li><strong>fail-mock（失败降级）</strong>：正常发起远程调用，<strong>失败时</strong>才返回 mock 值。用于容错。</li>
        <li><strong>force-mock（强制降级）</strong>：<code>force:</code> 前缀，<strong>根本不发起</strong>远程调用直接返回 mock 值。用于大促时主动屏蔽非核心服务、给后端减压。</li>
      </ul>
      <p>
        force-mock 可以通过治理控制台动态下发，运维在流量高峰时一键把某些非核心服务降级，是保命的常用手段。
      </p>

      <h2>五、限流、熔断与流量控制</h2>
      <h3>面试题：服务限流和熔断怎么实现？</h3>
      <p>
        三者目标不同，别混为一谈：
      </p>
      <table>
        <thead>
          <tr><th>手段</th><th>解决什么</th><th>典型实现</th></tr>
        </thead>
        <tbody>
          <tr><td>限流</td><td>流量超过承载能力，拒绝超出部分</td><td>tps Filter、Sentinel、信号量/令牌桶</td></tr>
          <tr><td>熔断</td><td>下游故障时快速失败，避免雪崩</td><td>Sentinel / Resilience4j 断路器</td></tr>
          <tr><td>降级</td><td>故障或保护时给兜底结果</td><td>mock / 熔断后的 fallback</td></tr>
        </tbody>
      </table>
      <p>
        Dubbo 本身有简单的并发控制（<code>actives</code> 限制单方法并发数、<code>executes</code> 限制服务端并发），
        但生产里更常用的是接入 <strong>Sentinel</strong>：它做限流、熔断、降级一体化，并能通过控制台动态配规则。
        熔断的核心是「断路器」三态——闭合（正常）、打开（直接快速失败）、半开（试探性放行少量请求探测下游是否恢复）。
      </p>
      <KeyIdea>
        一句话区分：<strong>限流</strong>是「我自己扛不住，拒绝多余流量」；<strong>熔断</strong>是「下游坏了，我别再去拖死它和我自己」；
        <strong>降级</strong>是「不管哪种情况，给个能用的兜底结果」。三者常组合使用，是高可用的三件套。
      </KeyIdea>

      <h2>六、Mock 机制：本地存根 Stub 与 Mock</h2>
      <h3>面试题：Stub 和 Mock 有什么区别？</h3>
      <p>
        两者都是「客户端本地代码」，但目的相反：
      </p>
      <ul>
        <li><strong>Stub（本地存根）</strong>：在消费者本地包装真实的远程调用，<strong>正常时也会执行</strong>。用于参数预校验、本地缓存、容错包装等——它把一部分逻辑前移到消费者侧，远程调用照常发生。</li>
        <li><strong>Mock</strong>：通常只在<strong>调用失败或强制降级</strong>时才生效，提供兜底结果，正常情况下不参与。</li>
      </ul>
      <Example title="一个直观对比">
        <p>
          Stub 像「门口的接待」：每次请求都先经过它，它可能先做点校验/缓存再决定是否真去后台。
          Mock 像「备用方案」：只有后台联系不上时才掏出来用。所以记住——<strong>Stub 常驻、Mock 兜底</strong>。
        </p>
      </Example>

      <h2>七、分组 Group 与版本控制 Version</h2>
      <h3>面试题：group 和 version 分别用来做什么？</h3>
      <CodeBlock lang="xml" title="分组与版本配置" code={groupVersion} />
      <ul>
        <li><strong>group（分组）</strong>：同一个接口的不同实现/数据源做<strong>逻辑隔离</strong>。比如同一个 <code>UserService</code> 一组连主库、一组连备库；消费者按 group 选用。还能配合 <code>group="*"</code> 做分组聚合调用。</li>
        <li><strong>version（版本）</strong>：接口<strong>不兼容升级</strong>时，新老版本并存。提供者同时暴露 1.0.0 和 2.0.0，消费者按需引用，逐步把流量从老版本迁到新版本，实现平滑升级。</li>
      </ul>
      <p>
        服务端客户端版本兼容的关键：只要接口方法签名兼容，version 一致即可互通；一旦做了不兼容改动（改方法签名/语义），就升 version 让两套并存，
        避免「新老节点混在一起、消费者随机调到不兼容节点」导致的反序列化或行为错乱。<strong>分组是横向隔离、版本是纵向演进</strong>。
      </p>

      <h2>八、多协议与多注册中心</h2>
      <h3>面试题：一个服务能同时用多个协议、注册到多个注册中心吗？</h3>
      <p>
        都可以。<strong>多协议</strong>：同一个服务可同时用 dubbo 和 triple 暴露，内部系统用 dubbo 高性能调用，
        网关/跨语言侧用 triple。<strong>多注册中心</strong>：服务可同时注册到多个注册中心（如同时注册到 ZK 和 Nacos），
        用于异构系统过渡、多机房、注册中心迁移期间的双写。消费者也能从多个注册中心订阅、做聚合。
        这是 Dubbo 在大型企业里支撑「平滑迁移」和「混合部署」的实用能力。
      </p>

      <h2>九、灰度发布</h2>
      <h3>面试题：用 Dubbo 怎么做灰度发布？</h3>
      <p>
        灰度发布 = 让一小部分流量先打到新版本节点，验证没问题再逐步放量。Dubbo 里常见两种实现：
      </p>
      <ul>
        <li><strong>标签路由</strong>：给新版本提供者打上 <code>tag=gray</code> 标签，再用路由规则让带灰度标识的请求（如特定用户、特定 header）路由到灰度节点，其余走老节点。</li>
        <li><strong>权重 + 版本</strong>：新版本节点先设低权重（如 5%），random/roundrobin 自然只分到少量流量，观察稳定后逐步调高权重，最后全量。</li>
      </ul>
      <Callout variant="tip" title="灰度的关键是「可动态、可回滚」">
        灰度规则应通过治理控制台<strong>动态下发</strong>，发现新版本有问题能立刻把权重调回 0 或撤掉灰度标签，秒级回滚，不用重启服务。
      </Callout>

      <h2>十、服务治理与监控中心</h2>
      <h3>面试题：什么是服务治理？治理中心和监控中心各干什么？</h3>
      <p>
        <strong>服务治理（Governance）</strong>是把前面这些能力——路由、权重、降级、限流、灰度、容错——统一管起来、能<strong>运行时动态调整</strong>的体系。
        载体是「治理中心 / 控制台」（如 Dubbo Admin），它把治理规则写进配置中心，再由各节点动态拉取生效，无需改代码重启。
      </p>
      <p>
        <strong>监控中心（Monitor）</strong>负责<strong>数据采集与统计</strong>：消费者和提供者会定时把调用次数、成功失败数、平均/最大耗时、
        并发数等指标上报给监控中心，用于观察服务健康度、做容量规划和告警。注意 Monitor 同样<strong>不在调用链路的关键路径上</strong>，
        上报是异步、旁路的，挂了也不影响正常调用。3.x 更倾向于对接 Prometheus + Grafana 这套云原生可观测体系。
      </p>
      <table>
        <thead>
          <tr><th></th><th>治理中心</th><th>监控中心</th></tr>
        </thead>
        <tbody>
          <tr><td>职责</td><td>下发规则、动态调整行为</td><td>采集指标、统计与展示</td></tr>
          <tr><td>方向</td><td>控制（写）</td><td>观测（读）</td></tr>
          <tr><td>典型工具</td><td>Dubbo Admin + 配置中心</td><td>Monitor / Prometheus + Grafana</td></tr>
        </tbody>
      </table>

      <Summary
        points={[
          '负载均衡默认 random（加权随机），还有 roundrobin、leastactive（避让慢节点）、shortestresponse、consistenthash（粘性）。',
          '集群容错默认 failover（retries=2，最多调 3 次）；非幂等写操作要改 failfast 或 retries=0，避免重复执行。',
          '调用顺序：Directory → Router 筛子集 → LoadBalance 选一个 → Cluster 兜失败；路由是圈范围、均衡是范围内挑。',
          '降级分 fail-mock（失败才兜底）和 force-mock（不调用直接兜底）；限流、熔断、降级是高可用三件套，生产常接 Sentinel。',
          'Stub 常驻（每次调用都过、做校验缓存），Mock 兜底（失败/强制降级才用）；group 横向隔离、version 纵向演进做不兼容升级。',
          '多协议、多注册中心支持混合部署与平滑迁移；灰度靠标签路由或权重+版本，规则动态下发可秒级回滚。',
          '治理中心下发规则做动态控制，监控中心旁路采集指标做观测；两者都不在调用关键链路上，3.x 倾向对接 Prometheus + Grafana。',
        ]}
      />
    </article>
  )
}

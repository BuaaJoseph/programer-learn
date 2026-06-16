import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const timeoutRetryCode = `<!-- 消费端配置：超时与重试 -->
<!-- timeout：单次调用最多等 1000ms，超过就报 TimeoutException -->
<!-- retries：失败后再重试 2 次（共 3 次），默认配 failover 集群策略 -->
<dubbo:reference id="orderService"
                 interface="com.demo.OrderService"
                 timeout="1000"
                 retries="2"
                 cluster="failover" />

<!-- 也可以在方法级别精细控制：查询可重试，下单不重试 -->
<dubbo:reference id="orderService" interface="com.demo.OrderService">
    <dubbo:method name="queryOrder" timeout="500" retries="2" />
    <dubbo:method name="createOrder" timeout="2000" retries="0" />
</dubbo:reference>`

const limitCode = `<!-- provider 端：限制每个方法的并发执行数（服务端自我保护） -->
<dubbo:service interface="com.demo.OrderService" executes="50" />

<!-- consumer 端：限制每个方法的并发调用数（客户端自我克制） -->
<dubbo:reference interface="com.demo.OrderService" actives="20" />

<!-- 超过阈值的请求会被直接拒绝，抛出 RpcException，避免把下游压垮 -->`

const sentinelMockCode = `// 方式一：Sentinel 熔断降级（@SentinelResource 指定兜底方法）
@Service
public class OrderClient {

    @SentinelResource(value = "queryOrder", fallback = "queryOrderFallback")
    public Order queryOrder(Long id) {
        return orderService.queryOrder(id);   // 远程调用
    }

    // 熔断或异常时走这里，返回兜底数据，不让用户看到报错
    public Order queryOrderFallback(Long id, Throwable ex) {
        Order fallback = new Order();
        fallback.setId(id);
        fallback.setStatus("UNKNOWN");        // 降级标记
        return fallback;
    }
}

// 方式二：Dubbo 原生 Mock 降级（无需引入 Sentinel）
// 1. 配置 reference 开启 mock
//    <dubbo:reference id="orderService"
//                     interface="com.demo.OrderService"
//                     mock="com.demo.OrderServiceMock" />
// 2. 写 Mock 实现，调用失败时自动回退到它
public class OrderServiceMock implements OrderService {
    public Order queryOrder(Long id) {
        Order fallback = new Order();
        fallback.setStatus("DEGRADED");       // 返回兜底
        return fallback;
    }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          本地方法调用慢一点、错一次，影响有限；可一旦跨进程、走网络，调用就<strong>必然</strong>会失败、会变慢——
          网络抖动、对端 GC、机器宕机，都躲不掉。服务治理做的事，本质就是给远程调用<em>加安全带</em>：
          超时不拖死、失败能重试、过载会限流、雪崩前先熔断、最坏也能降级返回兜底。
        </p>
      </Lead>

      <h2>超时 timeout：别让线程被一直拖住</h2>
      <p>
        最危险的不是「调用失败」，而是「调用一直不返回」。每个卡住的请求都占着一个线程，下游一慢，上游线程池被占满，
        新请求进不来，整个服务就被一个慢接口拖垮——这就是<em>线程耗尽</em>。<strong>timeout 是第一道安全带</strong>：
        到点还没返回就果断放弃，把线程还回去。
      </p>
      <CodeBlock lang="xml" title="超时与重试配置" code={timeoutRetryCode} />
      <p>
        经验上，timeout 要按接口的真实耗时来定，留出余量但别太长。链路上多个服务串起来时，
        还要注意<strong>上游的 timeout 应大于下游</strong>，否则上游早早超时、下游却还在白干，纯属浪费。
      </p>

      <h2>重试 retries：好用，但有个大前提</h2>
      <p>
        Dubbo 默认的集群策略是 <em>failover</em>（失败自动切换），配合 <code>retries</code> 就能在某台 provider
        出问题时，自动换另一台重试，对调用方几乎无感。但重试有个铁律：
      </p>
      <Callout variant="warn" title="重试只能用于幂等操作">
        <p>
          <strong>查询、读取这类幂等操作可以放心重试</strong>；而下单、扣款、发短信这类<strong>非幂等</strong>的写操作，
          重试会带来重复下单、重复扣款的灾难。所以下单接口要把 <code>retries="0"</code> 关掉，
          或者在业务侧做幂等设计（如唯一订单号去重）再开重试。这是面试高频考点，务必记牢。
        </p>
      </Callout>

      <h2>限流：保护自己不被打垮</h2>
      <p>
        限流是「自我保护」：当请求量超过自己能扛的上限时，主动拒绝一部分，保住核心能力，而不是来者不拒最后一起死。
        Dubbo 提供两端的并发控制，还可以接专门的限流组件：
      </p>
      <ul>
        <li><strong>provider 端 <code>executes</code></strong>——限制服务端每个方法的并发执行数，是服务端的自我保护。</li>
        <li><strong>consumer 端 <code>actives</code></strong>——限制客户端每个方法的并发调用数，是客户端的自我克制。</li>
        <li><strong>Sentinel / TPS 限流</strong>——按 QPS、按时间窗口做更精细的流量整形，能力比内置的并发数控制强很多。</li>
      </ul>
      <CodeBlock lang="xml" title="并发限流配置" code={limitCode} />

      <h2>熔断与降级：雪崩前的保险丝</h2>
      <p>
        <em>熔断</em>（circuit breaker）的灵感来自电路保险丝：当对某个下游的调用<strong>错误率或慢调用比例过高</strong>时，
        熔断器「跳闸」，接下来一段时间内的请求<strong>直接快速失败</strong>，不再真正打到那个奄奄一息的下游——
        给它喘息恢复的机会，也避免自己的线程都堆在它身上。过一会儿再放少量请求去「试探」，恢复了就合闸。
      </p>
      <p>
        <em>降级</em>（fallback）是熔断之后的下一步：既然真实结果拿不到，就返回一个<strong>兜底结果</strong>——
        缓存的旧数据、默认值、或一句「系统繁忙稍后再试」，保证用户体验不至于直接报错。
        Sentinel、Hystrix 都提供熔断加降级；Dubbo 自带的 <em>Mock 降级</em> 则是更轻量的方案：
        调用失败时自动回退到你写的 Mock 实现。
      </p>
      <CodeBlock lang="java" title="Sentinel 降级与 Dubbo Mock 降级" code={sentinelMockCode} />

      <Example title="下游抖动时，怎么不被拖垮">
        <p>
          场景：订单服务要调用库存服务，某天库存服务因为一次 GC 频繁卡顿，单次响应从 50ms 飙到 5 秒。如果什么都不做：
        </p>
        <ul>
          <li>订单服务的线程一个个卡在等库存上，线程池很快被占满；</li>
          <li>新进来的下单请求排不上队，订单服务自己也开始大面积超时；</li>
          <li>调订单服务的网关跟着卡，故障像多米诺骨牌一路蔓延——这就是<strong>服务雪崩</strong>。</li>
        </ul>
        <p>
          加上安全带之后：<code>timeout=500ms</code> 让线程最多卡半秒就释放；熔断器发现库存调用错误率超阈值后跳闸，
          后续请求<strong>不再真打库存</strong>而是直接走降级，返回「库存查询中」的兜底；库存服务没了持续压力，
          GC 缓过来后熔断器自动合闸恢复。整条链路稳稳扛住了一次下游抖动。
        </p>
      </Example>

      <KeyIdea title="治理的核心是「快速失败 + 兜底」">
        <p>
          分布式系统里，<strong>慢比错更可怕</strong>——错了至少能立刻知道，慢则会悄悄耗光资源引发雪崩。
          所以治理的主线就两条：用 timeout 和熔断让失败「来得快」，别拖；用降级和 Mock 让失败「有兜底」，别裸奔。
          重试和限流则分别在「失败后争取成功」和「过载前主动减负」上补位。
        </p>
      </KeyIdea>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Dubbo 怎么做服务治理 / 怎么防雪崩」，按一条主线串起来答：先 <strong>timeout</strong> 防线程耗尽，
        再 <strong>retries</strong>（强调只对幂等读、配 failover），然后 <strong>限流</strong>（provider 的 executes、consumer 的
        actives、或上 Sentinel 做 QPS 限流），最后 <strong>熔断 + 降级</strong>（错误率过高熔断、Mock 或 fallback 兜底）。
        能点出「慢比错可怕、治理就是加安全带」这句立意，层次感就有了。
      </p>

      <Practice title="配齐 timeout / retries 并加一个降级">
        <p>
          目标：给一个查询接口配上合理的超时与重试，再为它加一个降级兜底（Sentinel fallback 或 Dubbo Mock 二选一），
          然后手动制造下游异常，观察是否平滑回退到兜底结果而不是直接报错。
        </p>
        <CodeBlock lang="java" title="降级示例" code={sentinelMockCode} />
        <p>
          验证方法：把下游服务停掉或在它里面 <code>Thread.sleep</code> 制造超时，看调用方是否在 timeout 后走进
          fallback / Mock，返回带降级标记的兜底数据——这就是「不被拖垮」的可观测证据。
        </p>
      </Practice>

      <Summary
        points={[
          '远程调用必然会失败和变慢，服务治理的本质是给调用加安全带，核心立意是「慢比错更可怕」。',
          'timeout 防止线程被慢调用一直拖住，是防雪崩的第一道防线，注意上游 timeout 应大于下游。',
          'retries 配合 failover 可在失败时自动切换重试，但只能用于幂等的读操作，写操作要 retries=0。',
          '限流是自我保护：provider 端用 executes、consumer 端用 actives，或接 Sentinel 做 QPS/TPS 限流。',
          '熔断在错误率过高时跳闸快速失败，给下游恢复机会；降级返回兜底结果，Sentinel/Hystrix 或 Dubbo Mock 均可实现。',
          '面试主线：timeout → retries（幂等）→ 限流 → 熔断+降级，串起来讲清「快速失败 + 兜底」即可。',
        ]}
      />
    </>
  )
}

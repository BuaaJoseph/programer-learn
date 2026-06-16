import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DubboArch from '@/courses/dubbo-rpc/illustrations/DubboArch.jsx'

const providerCode = `<!-- provider.xml：服务提供方 -->
<!-- 1. 应用名 -->
<dubbo:application name="order-provider" />

<!-- 2. 注册中心地址 -->
<dubbo:registry address="zookeeper://127.0.0.1:2181" />

<!-- 3. 用哪个协议、哪个端口对外提供服务 -->
<dubbo:protocol name="dubbo" port="20880" />

<!-- 4. 把接口的实现暴露出去 -->
<bean id="orderService" class="com.example.OrderServiceImpl" />
<dubbo:service interface="com.example.OrderService" ref="orderService" />`

const consumerCode = `<!-- consumer.xml：服务消费方 -->
<dubbo:application name="order-consumer" />

<!-- 订阅同一个注册中心 -->
<dubbo:registry address="zookeeper://127.0.0.1:2181" />

<!-- 引用远程服务，拿到的是一个本地代理对象 -->
<dubbo:reference id="orderService" interface="com.example.OrderService" />

<!-- 业务代码里像调用本地方法一样使用 -->
<!-- orderService.createOrder(req); -->`

const zkTreeCode = `# ZooKeeper 里 Dubbo 的节点结构（接口级服务发现，2.x 经典模型）
/dubbo
  /com.example.OrderService          # 一个接口一棵子树
    /providers                        # 提供者列表（临时节点，Provider 掉线自动消失）
      /dubbo%3A%2F%2F192.168.0.11%3A20880%2F...   # URL 编码后的提供者地址
      /dubbo%3A%2F%2F192.168.0.12%3A20880%2F...
    /consumers                        # 消费者列表（便于运维查看谁在调）
      /consumer%3A%2F%2F...
    /configurators                    # 动态配置（限流、权重调整等）
    /routers                          # 路由规则

# Consumer 在 /providers 上注册一个 watcher，
# 节点一变（增删）ZooKeeper 推送 -> Consumer 刷新本地地址列表`

const appLevelCode = `# 应用级服务发现（Dubbo 3.x 默认）：注册的不再是「接口」而是「应用」
# 为什么改？接口级下，一个应用暴露 100 个接口就在注册中心写 100 份地址，
# 大规模集群里注册中心数据量爆炸（百万级节点），推送压力巨大。
#
# 应用级：一个应用实例只注册一条「应用 -> 实例地址」，
# 接口到应用的映射单独存一份元数据，数据量降低一两个数量级。
dubbo:
  application:
    name: order-provider
    # register-mode 可选 interface / instance / all（3.x 默认 all 平滑过渡）
    register-mode: instance
  registry:
    address: nacos://127.0.0.1:8848`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一个 Dubbo 调用看起来只是「Consumer 调了 Provider 一个方法」，但中间还藏着两个角色：
          <em>Registry</em>（注册中心）和 <em>Monitor</em>（监控中心）。搞清楚这四个角色各自干什么、
          一次调用按什么顺序串起来，是理解 Dubbo 的第一道关，也是面试最爱问的开场题。
        </p>
      </Lead>

      <h2>四个角色，各管一摊</h2>
      <p>
        Dubbo 的架构里有四个核心角色，记住它们的职责，后面所有问题都能往这张图上挂：
      </p>
      <ul>
        <li>
          <strong>Provider</strong>（服务提供方）：实现接口并启动服务，把自己的地址注册到注册中心，等着被调用。
        </li>
        <li>
          <strong>Consumer</strong>（服务消费方）：从注册中心订阅自己要用的服务，拿到 Provider 地址后发起调用。
        </li>
        <li>
          <strong>Registry</strong>（注册中心）：服务地址的「通讯录」，负责登记 Provider、把地址推给 Consumer，
          常见实现是 <em>ZooKeeper</em> 或 <em>Nacos</em>。
        </li>
        <li>
          <strong>Monitor</strong>（监控中心）：统计调用次数、耗时等指标，定时汇报，属于旁路角色，挂了也不影响业务。
        </li>
      </ul>

      <h2>一次调用是怎么串起来的</h2>
      <p>
        把四个角色连起来，标准流程是四步：<strong>注册 → 订阅 → 通知 → 调用</strong>。
      </p>
      <ul>
        <li>
          <strong>注册</strong>（register）：Provider 启动时，把自己的接口、IP、端口写到注册中心。
        </li>
        <li>
          <strong>订阅</strong>（subscribe）：Consumer 启动时，告诉注册中心「我要用 OrderService」，
          并把当前所有 Provider 地址拉到本地。
        </li>
        <li>
          <strong>通知</strong>（notify）：之后只要这个服务的地址列表有变化（上线、下线），
          注册中心会主动把<strong>最新的全量地址</strong>推给 Consumer。
        </li>
        <li>
          <strong>调用</strong>（invoke）：Consumer 从本地缓存的地址列表里，按负载均衡策略挑一台 Provider，
          直接发起网络请求。
        </li>
      </ul>

      <Example title="跟着一次「下单」走一遍">
        <p>
          假设 order-provider 部署了 3 台机器。它们启动后各自在注册中心登记了地址，比如
          <code>192.168.0.11:20880</code>、<code>192.168.0.12:20880</code>、<code>192.168.0.13:20880</code>。
        </p>
        <p>
          order-consumer 启动时订阅了 OrderService，注册中心把这 3 个地址推给它，缓存在本地。
          用户点「下单」，Consumer 从这 3 个里挑一台（比如第 2 台），<strong>直接</strong>把请求发过去——
          注意，这一步注册中心根本没参与。
        </p>
      </Example>

      <DubboArch />

      <KeyIdea title="注册中心不在调用链路上">
        <p>
          这是 Dubbo 架构最关键、也最容易被忽略的一点：<strong>真正调用时，Consumer 是直连 Provider 的，
          注册中心并不转发请求</strong>。注册中心只在「服务地址发生变化」时才工作（推送新列表）。
        </p>
        <p>
          推论很实用：<strong>注册中心短暂宕机，不影响已经缓存了地址的调用</strong>。Consumer 手里有上一次拿到的
          地址列表，照样能调通；只是这期间如果有 Provider 上下线，Consumer 暂时感知不到而已。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把注册中心当成网关">
        <p>
          有人误以为「请求要先发给注册中心，再由它转给 Provider」——这是错的。注册中心只做<strong>服务发现</strong>，
          不做<strong>流量转发</strong>。会转发请求的是网关（如 Gateway）或代理，那是另一回事。把这两者分清楚，
          面试时「注册中心挂了还能调用吗」这类问题就能答得稳。
        </p>
      </Callout>

      <h2>注册中心里到底存了什么</h2>
      <p>
        光说「登记地址」太抽象，打开 ZooKeeper 看一眼节点结构就懂了。Dubbo 2.x 用的是<strong>接口级</strong>服务发现：
        每个接口在 ZK 里是一棵子树，下面分 <code>providers</code> / <code>consumers</code> / <code>configurators</code> /
        <code>routers</code> 四类节点。Provider 把自己的地址 URL 编码后写进 <code>providers</code> 下，
        而且是<strong>临时节点</strong>——Provider 和 ZK 的会话一断（进程挂了），节点自动消失，下线感知就是靠这个机制：
      </p>
      <CodeBlock lang="text" title="ZooKeeper 中的 Dubbo 节点树（接口级）" code={zkTreeCode} />
      <p>
        Consumer 在 <code>providers</code> 节点上挂一个 <em>watcher</em>，节点一有增删，ZK 就推送通知，
        Consumer 据此刷新本地地址列表。这就是前面「通知」那一步的底层实现。

      </p>

      <h3>从接口级到应用级：Dubbo 3 的关键演进</h3>
      <p>
        接口级服务发现有个致命问题：<strong>注册中心数据量随接口数膨胀</strong>。一个应用暴露 100 个接口，
        就要在注册中心写 100 份几乎一样的地址数据；当集群有几千个实例、上万个接口时，注册中心节点数能到百万级，
        推送一次变更的开销大到能把 ZK 拖垮。Dubbo 3.x 默认改成<strong>应用级服务发现</strong>：
        注册的最小单位从「接口」变成「应用实例」，一个实例只注册一条「应用→地址」记录，
        接口到应用的映射单独作为元数据存储，注册中心的数据量直接降一两个数量级。
      </p>
      <CodeBlock lang="yaml" title="应用级服务发现配置（Dubbo 3.x）" code={appLevelCode} />
      <Callout variant="note" title="为什么 Nacos 越来越常见">
        <p>
          ZooKeeper 是 CP 系统（强一致优先），注册中心其实更需要 AP（可用性优先）——服务地址多一个少一个不致命，
          但注册中心因为分区不可用就麻烦了。Nacos 既能做注册中心又能做配置中心，且支持 AP/CP 切换，
          配合 Dubbo 3 的应用级发现是当下主流组合。面试问「ZK 和 Nacos 怎么选」，答这条 CAP 取向就到位了。
        </p>
      </Callout>

      <h2>Dubbo 的分层：每一层只干一件事</h2>
      <p>
        Dubbo 内部按职责分成多层，从上到下大致是：
      </p>
      <ul>
        <li><strong>service</strong>：业务接口与实现，你写的代码就在这一层。</li>
        <li><strong>config</strong>：配置层，把 XML/注解/API 配置解析成内部对象。</li>
        <li><strong>proxy</strong>：代理层，给 Consumer 生成本地代理，让远程调用看起来像本地方法。</li>
        <li><strong>registry</strong>：注册层，负责服务的注册与发现。</li>
        <li><strong>cluster</strong>：集群层，把多个 Provider 伪装成一个，负责负载均衡与容错。</li>
        <li><strong>protocol</strong>：协议层，封装一次远程调用（Invoker），是 RPC 的核心抽象。</li>
        <li><strong>exchange</strong>：信息交换层，封装请求/响应，处理同步转异步。</li>
        <li><strong>transport</strong>：传输层，底层网络通信，基于 Netty 等。</li>
        <li><strong>serialize</strong>：序列化层，把对象与字节流互相转换。</li>
      </ul>
      <p>
        不用死记每层细节，记住「<em>proxy</em> 让远程像本地、<em>cluster</em> 管负载均衡与容错、
        <em>protocol</em> 是 RPC 核心、<em>transport</em> 走网络」，就能在面试里讲清楚分层的意义：
        各层解耦，任意一层都能替换实现（换协议、换序列化、换注册中心都不影响业务代码）。
      </p>

      <h2>实战/面试怎么答</h2>
      <p>
        被问到「说说 Dubbo 的整体架构」，按这个骨架答最稳：先点出
        <strong>Provider / Consumer / Registry / Monitor 四个角色</strong>，再讲
        <strong>注册 → 订阅 → 通知 → 调用</strong>四步流程，然后强调
        <strong>调用时是 Consumer 直连 Provider、注册中心不在链路上</strong>这个杀手锏结论，
        最后如果还有时间，补一句分层设计「各层解耦、实现可插拔」。这样层次分明，比堆名词强得多。
      </p>

      <Callout variant="warn" title="面试高频追问">
        <ul>
          <li><strong>「注册中心挂了，新启动的 Consumer 还能调吗？」</strong>不能——它还没拿到地址列表，本地没缓存。已经运行的 Consumer 不受影响。这是和「短暂宕机」不同的场景，别答错。</li>
          <li><strong>「Provider 进程被 kill -9 了，地址多久消失？」</strong>取决于 ZK 会话超时（默认几十秒级），不是瞬时的。这段窗口内 Consumer 可能还会调到死节点，所以容错机制必不可少。</li>
          <li><strong>「接口级和应用级服务发现区别？」</strong>注册粒度不同：接口级一接口一份地址、数据量大；应用级一实例一份、数据量小，Dubbo 3 默认应用级。</li>
          <li><strong>误区：以为 Monitor 挂了会影响调用。</strong>Monitor 是旁路，只收集统计，挂了业务照常。</li>
        </ul>
      </Callout>

      <Practice title="跑通一对最小的 Provider 与 Consumer">
        <p>
          用 XML 配置一个最小可用的服务：Provider 暴露 OrderService，Consumer 引用它。
          重点体会 Consumer 拿到的 <code>orderService</code> 是个本地代理，调它就等于发起远程调用。
        </p>
        <CodeBlock lang="xml" title="provider.xml" code={providerCode} />
        <CodeBlock lang="xml" title="consumer.xml" code={consumerCode} />
        <p>
          跑起来后，把注册中心（ZooKeeper）停掉，再让 Consumer 发一次请求——你会发现调用照样成功，
          因为地址早就缓存在本地了。这就是「注册中心不在调用链路上」最直观的验证。
        </p>
      </Practice>

      <Summary
        points={[
          'Dubbo 有四个核心角色：Provider 提供服务、Consumer 消费服务、Registry 做服务发现、Monitor 做旁路监控。',
          '调用按四步串起来：Provider 注册 → Consumer 订阅 → 地址变化时注册中心通知 → Consumer 直连 Provider 调用。',
          '最关键的结论：调用时 Consumer 直连 Provider，注册中心不在调用链路上，只负责推送地址。',
          '因此注册中心短暂宕机不影响已缓存地址的调用，只是这期间感知不到 Provider 的上下线。',
          'Dubbo 内部分层（service/config/proxy/registry/cluster/protocol/exchange/transport/serialize），各层解耦、实现可插拔。',
          '面试回答顺序：四角色 → 四步流程 → 直连结论 → 分层设计，层次清晰最加分。',
        ]}
      />
    </>
  )
}

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

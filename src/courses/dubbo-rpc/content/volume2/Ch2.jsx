import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import RegistryDiscovery from '@/courses/dubbo-rpc/illustrations/RegistryDiscovery.jsx'

const zkCode = `# 使用 ZooKeeper 作为注册中心
dubbo.registry.address=zookeeper://127.0.0.1:2181

# 可选：连接超时、会话超时（毫秒）
dubbo.registry.timeout=5000
dubbo.registry.session=60000`

const nacosCode = `# 使用 Nacos 作为注册中心
dubbo.registry.address=nacos://127.0.0.1:8848

# 可选：命名空间、分组，便于多环境隔离
dubbo.registry.parameters.namespace=public
dubbo.registry.group=DEFAULT_GROUP`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说过，调用时 Consumer 直连 Provider。可 Provider 是一群机器，还会随时扩容、缩容、宕机——
          Consumer 怎么知道现在有哪些可用地址？这就是<em>注册中心</em>要解决的问题：让服务地址
          「自动登记、自动发现、变化自动推送」，不用人去改配置。
        </p>
      </Lead>

      <h2>注册中心到底解决什么</h2>
      <p>
        没有注册中心时，Consumer 想调 Provider，得把对方 IP 端口写死在配置里。一旦 Provider 扩容到 5 台、
        或者某台宕机换了新机器，所有 Consumer 都得改配置、重启——这在线上根本不可行。
      </p>
      <p>
        注册中心把这件事自动化了，核心就三个动作：
      </p>
      <ul>
        <li>
          <strong>Provider 注册</strong>：启动时把自己的地址写进注册中心；正常下线时主动删除，
          异常宕机时由注册中心自动摘除。
        </li>
        <li>
          <strong>Consumer 订阅</strong>：启动时声明「我要用某服务」，拉取当前全部可用地址并缓存到本地。
        </li>
        <li>
          <strong>地址变更推送</strong>：地址列表一有变化，注册中心主动把<strong>最新的全量列表</strong>推给所有订阅者。
        </li>
      </ul>

      <h2>地址变更是怎么传到 Consumer 的</h2>
      <p>
        一条完整的链路是这样：某台 Provider 上线或下线 → 注册中心里这个服务的地址列表被
        <strong>新增或摘除</strong> → 注册中心把变化后的全量列表<strong>推</strong>给所有订阅了它的 Consumer →
        Consumer 用新列表替换本地缓存，下次调用就只会挑到健康的节点。
      </p>

      <RegistryDiscovery />

      <Example title="一台 Provider 宕机，Consumer 多久才不再调它">
        <p>
          假设用 ZooKeeper，Provider 通过<strong>临时节点</strong>注册自己，并和 ZooKeeper 维持一个会话（session）。
          某台机器突然断电宕机，它和 ZooKeeper 的会话会在 session 超时（比如默认几十秒）后断开。
        </p>
        <p>
          会话一断，对应的临时节点被自动删除 → 这个服务的地址列表变了 → ZooKeeper 通过
          <em>watch</em> 机制通知 Consumer → Consumer 刷新本地列表，把宕机那台摘掉。
          所以「多久不再调它」≈ <strong>会话超时时间 + 推送与刷新的耗时</strong>，通常是几秒到几十秒。
          想更快发现，可以调小 session 超时，但太小又容易误判，要权衡。
        </p>
      </Example>

      <h2>ZooKeeper 还是 Nacos</h2>
      <p>
        这是面试高频对比题。两者都能做注册中心，但取舍不同：
      </p>
      <ul>
        <li>
          <strong>ZooKeeper</strong>：CAP 里偏 <em>CP</em>（强一致），靠<strong>临时节点 + watch</strong> 实现注册与通知。
          一致性好，但在网络分区或选主期间可能短暂不可用。是 Dubbo 早期最经典的搭配。
        </li>
        <li>
          <strong>Nacos</strong>：<em>AP/CP 可选</em>（服务发现默认走 AP，更可用），自带控制台、配置管理，
          对大规模实例、频繁变更的场景支持更好，运维体验也更友好，是目前更主流的选择。
        </li>
      </ul>
      <p>
        一句话记忆：<strong>ZooKeeper 重一致性、Nacos 重可用性与规模</strong>。小集群、已有 ZK 用 ZooKeeper 没问题；
        实例多、变更频繁、想要现成控制台，选 Nacos 更省心。
      </p>

      <KeyIdea title="本地缓存是兜底的命根子">
        <p>
          Consumer 订阅到的地址会<strong>缓存在本地（内存 + 磁盘文件）</strong>。这意味着：即便注册中心整个挂掉，
          Consumer 仍能用<strong>上一次拿到的旧地址</strong>继续发起调用，业务不会立刻瘫痪。
        </p>
        <p>
          代价是这段时间「地址是旧的」：新上线的 Provider 调不到、已宕机的可能还在被尝试（这时就要靠集群容错兜底，
          见下一章）。所以注册中心的高可用很重要，但本地缓存让系统对它的<strong>短暂故障有了容忍度</strong>。
        </p>
      </KeyIdea>

      <Callout variant="tip" title="应用级注册 vs 接口级注册">
        <p>
          Dubbo2 是<strong>接口级注册</strong>：每个接口都在注册中心存一份地址，接口一多，注册中心的数据量会膨胀。
          Dubbo3 改成<strong>应用级注册</strong>：以应用为单位注册，大幅减少注册中心的存储与推送压力，
          更适合大规模微服务。面试提一句「Dubbo3 的应用级注册解决了接口级注册的容量瓶颈」即可。
        </p>
      </Callout>

      <h2>实战/面试怎么答</h2>
      <p>
        被问「服务注册与发现的原理」，按这个顺序讲：<strong>注册中心存地址 → Provider 注册、Consumer 订阅 →
        地址变化时推送给 Consumer → Consumer 直连调用，本地缓存兜底</strong>。
        再补一组对比「ZooKeeper 偏 CP、临时节点 + watch；Nacos AP/CP 可选、更适合大规模」，
        最后点一句「Dubbo3 用应用级注册降低注册中心压力」，就是一个完整且有深度的回答。
      </p>

      <Practice title="把注册中心从 ZooKeeper 换成 Nacos">
        <p>
          注册中心是可插拔的，业务代码完全不用动，只改一行地址配置。先用 ZooKeeper 跑通，
          再换成 Nacos，体会「实现可替换」的解耦设计。
        </p>
        <CodeBlock lang="properties" title="application.properties（ZooKeeper）" code={zkCode} />
        <CodeBlock lang="properties" title="application.properties（Nacos）" code={nacosCode} />
        <p>
          换好后，启动两台 Provider，再 kill 掉其中一台，观察 Consumer 隔多久不再把请求打到它上面——
          这就是上面那个「宕机多久被摘除」例子的真实复现。
        </p>
      </Practice>

      <Summary
        points={[
          '注册中心让服务地址自动登记、自动发现、变化自动推送，免去把 IP 端口写死并手动改配置。',
          '三个核心动作：Provider 注册、Consumer 订阅、地址变更时注册中心推送最新全量列表给 Consumer。',
          'Provider 宕机后被摘除的耗时≈会话超时 + 推送刷新时间，调小超时能更快发现但易误判，要权衡。',
          'ZooKeeper 偏 CP、用临时节点 + watch；Nacos AP/CP 可选、带控制台、更适合大规模，是当前主流。',
          'Consumer 本地缓存地址，注册中心短暂挂掉仍能用旧地址调用，但感知不到新的上下线，需容错兜底。',
          'Dubbo3 的应用级注册替代了 Dubbo2 的接口级注册，显著降低注册中心的存储与推送压力。',
        ]}
      />
    </>
  )
}

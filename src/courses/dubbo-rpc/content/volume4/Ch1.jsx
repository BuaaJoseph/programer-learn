import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const invokeFlow = `// 一次同步调用在消费者侧大致经历这些环节
// 1) 代理拦截：业务拿到的 demoService 其实是一个代理对象
DemoService demoService = ...;              // 实为 InvokerInvocationHandler 代理
String r = demoService.sayHello("dubbo");   // 触发 invoke

// 2) 代理把方法名/参数包成 Invocation，交给集群层 Invoker
//    MockClusterInvoker -> FailoverClusterInvoker（默认容错）
// 3) 集群层做：路由(Router) -> 负载均衡(LoadBalance) 选出一个 Provider
// 4) 经过 Filter 责任链（一致性、监控、鉴权等）
// 5) DubboInvoker 拿到底层 ExchangeClient（Netty 连接）发出请求
// 6) 协议层把 Invocation 用约定的协议编码 + 序列化成字节
// 7) Netty 把字节写出去；服务端反序列化 -> 反射执行 -> 原路返回`

const protocolXml = `<!-- 指定通信协议与端口（XML 配置方式） -->
<dubbo:protocol name="dubbo" port="20880" serialization="hessian2" />

<!-- 也可以同时暴露多个协议 -->
<dubbo:protocol id="dubbo" name="dubbo" port="20880" />
<dubbo:protocol id="tri" name="tri" port="50051" />

<!-- 某个服务用哪些协议暴露 -->
<dubbo:service interface="com.demo.DemoService" ref="demoService"
               protocol="dubbo,tri" />`

const serializeConfig = `# application.properties：全局指定序列化方式
dubbo.protocol.name=dubbo
dubbo.protocol.port=20880
# 默认就是 hessian2；也可换成 fastjson2 / kryo / fst / protobuf
dubbo.protocol.serialization=hessian2

# 注意：3.x 出于安全考虑引入了序列化白名单/检查
# 跨大版本升级时，序列化方式与白名单是最常见的踩坑点`

const registryFlow = `// 服务注册（Provider 启动时）：把自己的可调用地址写进注册中心
// 形如一条 URL（这里把它折行只为可读，实际是一行）
dubbo://192.168.1.10:20880/com.demo.DemoService
   ?application=order-provider
   &methods=sayHello,findById
   &side=provider&timeout=3000&weight=100

// 服务发现（Consumer 启动时）：
// 1) 向注册中心订阅 com.demo.DemoService 这一类目录
// 2) 注册中心把当前所有可用 Provider 的 URL 列表推下来
// 3) Consumer 把每个 URL 转成一个 Invoker，组成可调用列表
// 4) Provider 上下线 -> 注册中心推送变更 -> Consumer 动态刷新列表`

export default function Ch1() {
  return (
    <article>
      <Lead>
        面试聊 Dubbo，开场十有八九是「说说 Dubbo 是什么、解决什么问题」，紧接着就是架构、调用流程、注册发现、协议与序列化这一串。
        这些题看似基础，却最能看出你是「背过」还是「懂过」。这一章我们把它们串成一条主线，
        从宏观定位讲到一次调用的字节级旅程，每道题都给你能讲清原理、又经得起追问的版本。
      </Lead>

      <h2>一、Dubbo 是什么、解决什么问题</h2>
      <h3>面试题：什么是 Dubbo？它到底解决了什么问题？</h3>
      <p>
        一句话定位：Dubbo 是一款高性能的 Java <strong>RPC 框架</strong>，并在 RPC 之上提供了一整套<strong>服务治理</strong>能力。
        它最初由阿里开源，现在是 Apache 顶级项目，3.x 版本把自己重新定位为「微服务开发框架」，新增了应用级服务发现、Triple 协议等能力。
      </p>
      <p>
        它解决的是单体拆成分布式之后冒出来的两类问题。第一类是<strong>「怎么调」</strong>：服务被拆到不同进程、不同机器上，
        本地方法调用变成了跨网络调用，你不想每次都手写 Socket、手写序列化、手写连接管理。
        第二类是<strong>「调不好怎么办」</strong>：远程调用一定会遇到节点变多、某些节点挂掉、流量倾斜、调用超时这些问题，
        需要注册发现、负载均衡、容错、限流降级这些治理手段兜底。Dubbo 把这两类问题一起解决了。
      </p>
      <KeyIdea>
        记住这个对仗：RPC 让你「<strong>像调本地方法一样调远程</strong>」，服务治理让你「<strong>在不可靠网络上调得稳</strong>」。
        Dubbo = RPC 内核 + 服务治理外壳。把这条主线讲清楚，后面所有细节都是它的展开。
      </KeyIdea>

      <h2>二、核心架构：四个角色</h2>
      <h3>面试题：画一下 Dubbo 的核心架构，各角色是什么关系？</h3>
      <p>
        Dubbo 有四个经典角色，关系可以用「牵线—调用」两条线讲清：
      </p>
      <ul>
        <li><strong>Provider（提供者）</strong>：暴露服务的一方，启动时把自己的访问地址注册到注册中心。</li>
        <li><strong>Consumer（消费者）</strong>：调用服务的一方，启动时向注册中心订阅它需要的服务。</li>
        <li><strong>Registry（注册中心）</strong>：负责牵线，记录谁提供了什么服务，并在变更时通知消费者。常用 ZooKeeper、Nacos。</li>
        <li><strong>Monitor（监控中心）</strong>：统计调用次数、耗时等指标，消费者和提供者定时上报。</li>
      </ul>
      <p>
        关键点，也是面试官最爱追的一刀：<strong>注册中心不在调用链路上</strong>。它只负责启动时的牵线和地址变更的推送，
        真正调用时消费者是<strong>直连</strong>提供者的。所以即使注册中心短暂宕机，已经拿到地址列表的消费者仍然能正常调用——
        这是 Dubbo 高可用设计的一个体现。
      </p>
      <Callout variant="note" title="还有两个隐形角色">
        实际还有 Container（服务运行容器，Provider 跑在里面）。另外 3.x 引入了应用级注册模型，
        注册中心里存的不再只是接口级数据，地址数据从「接口维度」收敛到了「应用维度」，大幅降低了大规模集群下注册中心的存储与推送压力。
      </Callout>

      <h2>三、工作原理与一次调用的完整流程</h2>
      <h3>面试题：说说一次 Dubbo 调用从发起到返回都经历了什么？</h3>
      <p>
        这是最高频的「链路题」。核心机制是<strong>动态代理</strong>：你拿到的服务对象其实是个代理，方法调用被拦截后，
        被包装成一个 <code>Invocation</code>（含方法名、参数类型、参数值），然后一路向下穿过集群层、协议层、传输层。
      </p>
      <CodeBlock lang="java" title="消费者侧一次同步调用的内部环节" code={invokeFlow} />
      <p>
        把它分成消费者侧和提供者侧两段来记：
      </p>
      <ol>
        <li><strong>消费者侧</strong>：代理拦截 → 包装 <code>Invocation</code> → 集群层（路由筛选 + 负载均衡选节点）→ Filter 责任链 → 协议层编码 + 序列化 → Netty 发送字节。</li>
        <li><strong>提供者侧</strong>：Netty 收到字节 → 反序列化 + 解码还原 <code>Invocation</code> → 经过提供者侧 Filter 链 → 派发到业务线程池 → 反射执行真正的实现方法 → 结果序列化后原路返回。</li>
      </ol>
      <Example title="为什么调用看起来「像本地」">
        <p>
          业务代码里写的是 <code>{'demoService.sayHello("dubbo")'}</code>，和调本地对象没区别。
          区别全藏在那个代理对象里：是它把这次方法调用翻译成了「选节点 + 编码 + 网络发送 + 等响应」。
          这正是 RPC 的核心价值——<strong>把网络细节对业务透明化</strong>。
        </p>
      </Example>

      <h2>四、服务注册与发现是如何实现的</h2>
      <h3>面试题：Dubbo 的服务注册与发现具体是怎么做的？</h3>
      <p>
        本质是一套基于注册中心的<strong>「发布—订阅」</strong>模型。Dubbo 内部用一个统一的 URL 模型描述一切配置，
        注册到注册中心的就是一条条 URL。
      </p>
      <CodeBlock lang="java" title="注册与发现的数据流" code={registryFlow} />
      <p>
        以 ZooKeeper 为例：Provider 在对应的服务节点下创建一个<strong>临时节点</strong>写入自己的 URL；
        Consumer 对这个目录注册 <strong>Watcher</strong> 监听。Provider 一旦下线，与 ZK 的会话断开，临时节点被自动删除，
        ZK 触发 Watcher 通知 Consumer，Consumer 刷新本地的 Invoker 列表，把挂掉的节点剔除。这样消费者拿到的永远是「活着」的地址。
      </p>
      <table>
        <thead>
          <tr><th>注册中心</th><th>一致性模型</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>ZooKeeper</td><td>CP（强一致）</td><td>经典选型，临时节点 + Watcher，分区时可能不可写</td></tr>
          <tr><td>Nacos</td><td>AP / CP 可选</td><td>云原生友好，支持配置中心一体化，大规模更从容</td></tr>
          <tr><td>Redis / etcd</td><td>视实现</td><td>可作为注册中心实现，按需选用</td></tr>
        </tbody>
      </table>
      <Callout variant="tip" title="接口级 vs 应用级注册">
        2.x 是<strong>接口级</strong>注册：每个接口都在注册中心存一份地址，接口一多数据量爆炸。
        3.x 推应用级注册：以应用为粒度注册地址，接口与方法等元数据放到元数据中心或随首次调用同步，注册中心压力骤降。
        被问到「Dubbo 如何支撑大规模集群」，这是一个高分回答点。
      </Callout>

      <h2>五、通信协议有哪些</h2>
      <h3>面试题：Dubbo 支持哪些协议？默认用哪个？</h3>
      <p>
        Dubbo 的协议是可插拔的（靠 SPI），最常用的是这几种：
      </p>
      <table>
        <thead>
          <tr><th>协议</th><th>传输</th><th>特点与适用</th></tr>
        </thead>
        <tbody>
          <tr><td>dubbo（默认）</td><td>TCP 长连接 + Netty</td><td>单一长连接 + NIO，适合「小数据量、高并发」的内部调用</td></tr>
          <tr><td>triple（tri）</td><td>HTTP/2 + gRPC 兼容</td><td>3.x 主推，云原生友好、能穿网关、跨语言、支持 Streaming</td></tr>
          <tr><td>rmi / hessian / http</td><td>各自</td><td>兼容老系统或特定场景，现已较少新用</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="xml" title="配置协议与端口" code={protocolXml} />
      <p>
        默认的 dubbo 协议采用<strong>单一长连接</strong>：消费者与某个提供者之间通常只建立一条 TCP 连接，所有请求复用它，
        靠请求 ID 把响应和请求对上号。这样省去了频繁建连的开销，适合「请求体小、调用频繁、提供者少消费者多」的典型微服务内部场景。
        反过来，如果你要传大文件、或者要跨语言/穿 HTTP 网关，triple 协议更合适。
      </p>

      <h2>六、支持哪些序列化方式</h2>
      <h3>面试题：Dubbo 用什么序列化？为什么不用 Java 原生序列化？</h3>
      <p>
        协议负责「怎么分帧、怎么对请求」，序列化负责「对象怎么变字节」。Dubbo 默认用 <strong>hessian2</strong>，
        此外支持 fastjson2、kryo、fst、protobuf 等。
      </p>
      <table>
        <thead>
          <tr><th>序列化</th><th>体积</th><th>速度</th><th>跨语言</th></tr>
        </thead>
        <tbody>
          <tr><td>Java 原生</td><td>大</td><td>慢</td><td>否</td></tr>
          <tr><td>hessian2（默认）</td><td>较小</td><td>较快</td><td>较好</td></tr>
          <tr><td>kryo / fst</td><td>小</td><td>快</td><td>否（偏 Java）</td></tr>
          <tr><td>protobuf</td><td>很小</td><td>很快</td><td>好（需定义 IDL）</td></tr>
        </tbody>
      </table>
      <p>
        不用 Java 原生序列化的原因很直接：它生成的字节流又大又慢，而且不能跨语言；同时反序列化任意类还带来过安全漏洞。
        所以 RPC 框架普遍选更高效、更可控的方案。选型上一个朴素原则：纯 Java 内部系统、追求极致性能可考虑 kryo；
        要兼顾跨语言和稳定性用 hessian2；要严格的契约和跨语言用 protobuf（配合 triple 协议很自然）。
      </p>
      <CodeBlock lang="text" title="全局配置序列化方式" code={serializeConfig} />
      <Callout variant="warn" title="升级序列化是高危操作">
        序列化方式必须<strong>提供者和消费者一致</strong>，否则解不出对象直接报错。3.x 还加入了序列化安全检查/白名单，
        跨大版本升级时若不放行需要的类，会出现「能连上但反序列化失败」的诡异现象。生产升级一定要灰度先行、对齐两端配置。
      </Callout>

      <Summary
        points={[
          'Dubbo = 高性能 Java RPC 内核 + 服务治理外壳，解决分布式下「怎么调」和「调不好怎么办」两类问题。',
          '四角色：Provider 注册、Consumer 订阅、Registry 牵线、Monitor 统计；注册中心不在调用链路上，调用是消费者直连提供者。',
          '一次调用：代理拦截包装 Invocation → 集群层路由+负载均衡 → Filter 链 → 协议编码序列化 → Netty 传输 → 服务端反序列化反射执行原路返回。',
          '注册发现是发布订阅模型：Provider 写 URL（ZK 临时节点），Consumer 订阅监听，上下线触发推送动态刷新；3.x 用应用级注册降低注册中心压力。',
          '协议默认 dubbo（TCP 单一长连接 + Netty），3.x 主推 triple（HTTP/2、跨语言、可穿网关）；协议可插拔。',
          '序列化默认 hessian2，可选 kryo/fst/protobuf 等；不用 Java 原生因其大、慢、不跨语言且有安全隐患；两端必须一致。',
        ]}
      />
    </article>
  )
}

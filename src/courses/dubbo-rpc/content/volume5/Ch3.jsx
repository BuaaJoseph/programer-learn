import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const threadPoolConfig = `# 业务线程池调优（提供者侧）
dubbo.protocol.threadpool=fixed     # fixed(默认) / cached / limited / eager
dubbo.protocol.threads=300          # 线程数，默认 200
dubbo.protocol.queues=0             # 队列长度，默认 0（不缓冲，满了直接拒绝）

# 为什么 queues 默认 0？有队列会「藏住」过载：请求堆在队列里看似没拒绝，
# 实则延迟暴涨、超时雪崩。queues=0 让过载尽快暴露为「线程池满」异常，便于扩容/限流。

# IO 线程（一般用默认即可，约 CPU 核数+1）
dubbo.protocol.iothreads=8`

const connectionConfig = `# 连接数控制
# 消费者到某提供者默认共享 1 条长连接，所有请求复用它
@DubboReference(connections = 1)        # 默认 1，足够大多数场景

# 高吞吐/大报文场景，可适当加连接（避免单连接成为瓶颈）
@DubboReference(connections = 4)

# 限制提供者总连接数，防止连接过多耗尽资源
# <dubbo:provider accepts="2000" />     超过则拒绝新连接`

const timeoutTune = `# 超时问题排查与调优清单
# 1) 先分清「谁超时」：消费者 timeout 还是提供者处理慢？看两端日志的 elapsed
# 2) 链路超时预算：上游 timeout 必须 >= 下游，否则上游早返回、下游白干
@DubboReference(timeout = 3000,
    methods = { @Method(name = "report", timeout = 8000, retries = 0) })  # 慢方法单独放宽
# 3) 慢方法别全局放大超时（会拖累快方法的故障感知），按方法级配
# 4) 超时 + retries 对写操作危险，写接口 retries=0 并做幂等`

const tracingCode = `// 链路追踪：traceId 在 Dubbo 调用间透传
// Dubbo 通过隐式参数 (attachment) 在调用链上传递上下文
RpcContext.getClientAttachment().setAttachment("traceId", traceId);

// 下游取出，串起整条调用链（接入 SkyWalking / Zipkin 自动完成）
String traceId = RpcContext.getServerAttachment().getAttachment("traceId");

// 接入 SkyWalking Agent 后无需手写：探针自动埋点 Dubbo 调用，
// 在 UI 上能看到 A->B->C 的完整调用链、每段耗时、异常节点`

export default function Ch3() {
  return (
    <article>
      <Lead>
        最后一章是「修车」的功夫：服务跑起来后，怎么调优、出了问题怎么定位。面试到这一层，问的全是真刀真枪的生产经验——
        线程池怎么调、连接多了怎么办、序列化和网络怎么优化、超时和启动慢怎么查、内存泄漏怎么抓、服务调不通从哪下手、
        链路追踪怎么用。这一章按「调优 → 排查 → 大规模优化」组织，给你一套可落地的排障方法论。
      </Lead>

      <h2>一、线程池调优</h2>
      <h3>面试题：Dubbo 提供者线程池怎么调？线程池满了报错怎么办？</h3>
      <p>
        提供者用业务线程池处理请求，默认 <code>fixed</code> 大小 200。调优要先<strong>定位瓶颈类型</strong>：CPU 密集型任务线程数不宜远超核数；
        IO 密集型（调 DB、调下游）可适当调大线程数，因为线程多在等待。
      </p>
      <CodeBlock lang="text" title="业务线程池配置" code={threadPoolConfig} />
      <p>
        「线程池满」是高频故障，根因通常<strong>不是线程不够，而是下游变慢</strong>：某个依赖（DB/下游服务）慢了，
        请求长时间占着线程不释放，线程很快被占满。所以遇到线程池满，<strong>先查慢调用、再考虑扩容</strong>，盲目调大线程数只会把问题推后并放大资源消耗。
      </p>
      <Callout variant="warn" title="queues 别乱设大">
        给线程池配大队列看似「不拒绝请求」更友好，实则危险：请求堆在队列里，延迟飙升、纷纷超时，形成雪崩，还难发现。
        Dubbo 默认 <code>queues=0</code> 就是要让过载<strong>尽快暴露</strong>为异常，便于触发扩容或限流。生产建议保持小队列或 0。
      </Callout>

      <h2>二、连接数过多如何处理</h2>
      <h3>面试题：连接数太多导致问题，怎么排查和优化？</h3>
      <p>
        dubbo 协议默认<strong>单一长连接</strong>：消费者到每个提供者只建一条连接、复用所有请求。所以正常情况下连接数不该爆。连接过多通常来自：
      </p>
      <ul>
        <li><strong>消费者实例太多</strong>：N 个消费者 × M 个提供者，连接数是乘积关系，大规模集群下提供者侧连接数可能很高。</li>
        <li><strong>误配 connections</strong>：把 <code>connections</code> 调大却没必要，连接成倍增长。</li>
        <li><strong>连接泄漏</strong>：异常路径下连接没被复用/回收。</li>
      </ul>
      <p>
        处理思路：保持 <code>connections=1</code>（默认就够）；用 <code>accepts</code> 限制提供者可接受的最大连接数防止被打爆；
        大规模下考虑应用级注册（3.x）降低连接与推送压力；必要时引入分组隔离，减少全连接的爆炸。
      </p>

      <h2>三、网络通信性能优化</h2>
      <h3>面试题：怎么优化 Dubbo 的网络通信性能？</h3>
      <ul>
        <li><strong>复用长连接</strong>：dubbo 协议本就单连接复用，避免频繁建连的 TCP 三次握手开销。</li>
        <li><strong>批量/合并</strong>：能合并的小请求合并，减少 RTT 次数；高延迟链路尤其有效。</li>
        <li><strong>异步化</strong>：用 CompletableFuture 异步调用，不让线程阻塞等待，提高吞吐。</li>
        <li><strong>合理超时与心跳</strong>：心跳维持连接活性、及时发现死连接；超时设置避免线程长占。</li>
        <li><strong>就近调用</strong>：同机房路由减少网络往返延迟。</li>
      </ul>

      <h2>四、序列化性能优化</h2>
      <h3>面试题：序列化是性能瓶颈，怎么优化？</h3>
      <p>
        序列化直接影响 CPU 和网络字节数。优化方向：
      </p>
      <ul>
        <li><strong>换更快的序列化</strong>：默认 hessian2 已不错；纯 Java 内部追求极致可考虑 kryo/fst；跨语言/契约严格用 protobuf。</li>
        <li><strong>瘦身 DTO</strong>：别传整个大对象，只传需要的字段；避免传冗余的嵌套结构、超大集合。</li>
        <li><strong>避免传输无关数据</strong>：懒加载字段、临时字段标 <code>transient</code>，别让它们进序列化。</li>
        <li><strong>注意兼容与安全</strong>：3.x 有序列化白名单，换序列化方式要两端一致并放行类。</li>
      </ul>
      <KeyIdea>
        序列化优化的两个抓手：<strong>选对算法</strong>（速度/体积/跨语言三角权衡）和<strong>减少要序列化的数据量</strong>（瘦身 DTO）。
        后者常被忽略，但「少传一半字段」往往比「换序列化框架」收益更直接。
      </KeyIdea>

      <h2>五、超时问题排查与调优</h2>
      <h3>面试题：线上频繁报 TimeoutException，怎么查？</h3>
      <CodeBlock lang="text" title="超时排查与调优清单" code={timeoutTune} />
      <p>
        步骤化排查：① 先看日志里的 <code>elapsed</code>，分清是<strong>服务端处理慢</strong>（服务端耗时已超）还是<strong>网络/排队慢</strong>（服务端没那么慢但消费者已超时）；
        ② 服务端慢就去查下游依赖、慢 SQL、GC 停顿；③ 排队慢就查线程池是否满、是否被慢调用占用；
        ④ 检查超时预算是否合理（上游 ≥ 下游）；⑤ 慢方法用<strong>方法级</strong>超时单独放宽，别全局放大。
      </p>

      <h2>六、网络延迟排查</h2>
      <h3>面试题：怀疑是网络延迟，怎么定位？</h3>
      <p>
        把「应用慢」和「网络慢」分开：用 <code>ping</code>/<code>tcpping</code> 看 RTT，用 <code>traceroute</code> 看路由跳数，
        用抓包（tcpdump）看是否有重传/丢包/RST。对比「服务端处理耗时」和「消费者观测的总耗时」，差值大就是网络或排队的锅。
        典型网络问题：跨机房绕路（用就近路由解决）、连接被中间设备掐断（心跳/重连）、带宽打满（大报文要瘦身或压缩）。
      </p>

      <h2>七、启动慢原因</h2>
      <h3>面试题：服务启动很慢，可能是什么原因？</h3>
      <ul>
        <li><strong>启动检查阻塞</strong>：<code>check=true</code> 时等依赖的提供者就绪，依赖没起来就一直等/失败。可对非关键依赖配 <code>check=false</code>。</li>
        <li><strong>注册中心连接慢</strong>：ZK/Nacos 不可达或网络慢，连接和订阅卡住。</li>
        <li><strong>服务/Bean 太多</strong>：接口级注册下大量服务暴露、订阅，注册中心交互耗时；3.x 应用级注册可缓解。</li>
        <li><strong>初始化重</strong>：Spring Bean 初始化、预热缓存等占时间。</li>
      </ul>
      <Callout variant="tip" title="启动优化思路">
        用 <code>delay</code> 控制暴露时机、对非核心依赖关闭启动检查、用 lazy connect 推迟建连、3.x 用应用级注册减少注册交互。
        先用启动日志/时间戳定位「卡在哪一步」，再对症下药，别盲目调参。
      </Callout>

      <h2>八、内存泄漏排查与修复</h2>
      <h3>面试题：服务跑久了内存涨、最后 OOM，怎么查？</h3>
      <p>
        标准排查流程：① 看监控发现内存只涨不降、Full GC 频繁但回收不动；② 用 <code>jmap</code> 导出堆 dump（<code>jmap -dump:format=b,file=heap.bin pid</code>）；
        ③ 用 MAT / jvisualvm 分析<strong>支配树和大对象</strong>，找出哪类对象在持续增长、被谁引用（GC Root 路径）。
      </p>
      <p>
        Dubbo 相关的常见泄漏点：异步回调的 future 没有正确完成/清理导致映射表堆积；自定义 Filter/拦截器里用了静态集合缓存却从不清理；
        <code>RpcContext</code> 是 ThreadLocal，线程池复用时若没清理可能<strong>串数据或累积</strong>；连接/资源没正确释放。
        修复关键：缓存设上限和过期（用有界缓存 / 弱引用）、ThreadLocal 用完即 <code>remove()</code>、异步任务保证终态、资源在 finally 里释放。
      </p>

      <h2>九、服务上线后无法调用 / 无法发现 / 调用失败</h2>
      <h3>面试题：服务上线了但消费者调不通，从哪查起？</h3>
      <p>
        这是综合排障题，按「<strong>注册 → 发现 → 网络 → 协议 → 业务</strong>」一层层往下排：
      </p>
      <table>
        <thead>
          <tr><th>层次</th><th>怎么查</th><th>常见原因</th></tr>
        </thead>
        <tbody>
          <tr><td>注册</td><td>注册中心里有没有该提供者地址</td><td>提供者没注册成功、注册中心地址配错</td></tr>
          <tr><td>发现</td><td>消费者订阅到的地址列表对不对</td><td>group/version 不匹配、订阅失败</td></tr>
          <tr><td>网络</td><td>telnet 提供者 IP:端口 通不通</td><td>防火墙/安全组、端口没监听、跨网段</td></tr>
          <tr><td>协议/序列化</td><td>两端协议、序列化、接口版本是否一致</td><td>序列化白名单、版本不兼容</td></tr>
          <tr><td>业务</td><td>用 telnet invoke 直接调</td><td>方法异常、参数不对、依赖故障</td></tr>
        </tbody>
      </table>
      <Example title="一个真实排查链">
        <p>
          消费者报 No provider available：先看注册中心——发现提供者地址<strong>根本不在</strong>，去查提供者日志，
          发现它注册时用了 <code>group=A</code> 而消费者订阅的是默认 group，<strong>group 不匹配</strong>导致订阅不到。
          统一 group 后立刻恢复。这类「能启动但调不通」的问题，<strong>九成出在注册发现的匹配条件（group/version）和网络可达性上</strong>。
        </p>
      </Example>
      <p>
        「服务无法发现」单独拎出来说：核心查 group/version 是否两端一致、提供者是否注册成功、消费者订阅的目录是否正确、注册中心是否健康；
        用直连（指定 url）能快速验证「是注册发现的问题还是服务本身的问题」。
      </p>

      <h2>十、服务调用链路追踪</h2>
      <h3>面试题：调用链路很长，怎么定位是哪一环出了问题？</h3>
      <p>
        靠<strong>分布式链路追踪</strong>：给每次入口请求生成一个 <code>traceId</code>，在 Dubbo 调用间通过隐式参数（attachment）<strong>透传</strong>，
        让 A→B→C 的所有 span 串到同一条 trace 上，就能看到整条链路、每段耗时、在哪一环出错或变慢。
      </p>
      <CodeBlock lang="java" title="traceId 在 Dubbo 调用间透传" code={tracingCode} />
      <p>
        实战通常接 <strong>SkyWalking</strong> 或 Zipkin：挂上 Agent/探针后自动埋点 Dubbo 调用，无需手写透传代码，
        UI 上直接看拓扑和耗时火焰图。链路追踪是排查「长链路里到底卡在哪」的最有效手段，也是大规模微服务可观测性的基石。
      </p>

      <h2>十一、大规模分布式性能优化策略</h2>
      <h3>面试题：服务规模上千节点，整体性能怎么优化？</h3>
      <ul>
        <li><strong>应用级服务发现（3.x）</strong>：地址数据从接口维度收敛到应用维度，注册中心存储和推送量大幅下降，这是大规模下的关键优化。</li>
        <li><strong>就近路由 + 单元化</strong>：减少跨机房调用，降低延迟和带宽成本。</li>
        <li><strong>限流熔断隔离</strong>：Sentinel 全局限流，防止局部故障雪崩；线程/连接隔离避免相互拖累。</li>
        <li><strong>序列化与报文瘦身</strong>：高频接口换更快序列化、精简 DTO，累积收益巨大。</li>
        <li><strong>连接与线程治理</strong>：合理连接复用、合适的线程池、避免队列堆积。</li>
        <li><strong>可观测先行</strong>：完善链路追踪 + 指标监控，先看得见才优化得准，避免凭感觉调参。</li>
      </ul>
      <Callout variant="note" title="优化的第一性原理">
        大规模优化别一上来就调参数。先用监控和链路追踪<strong>定位真正的瓶颈</strong>（是注册中心、序列化、网络还是慢下游？），
        再针对性优化。最大的杠杆往往是架构层面的（应用级注册、就近路由、限流），而不是某个线程数。
      </Callout>

      <Summary
        points={[
          '线程池默认 fixed=200，调优先分 CPU/IO 密集型；线程池满多因下游变慢占住线程，先查慢调用再扩容；queues 默认 0 是为让过载尽快暴露。',
          'dubbo 默认单一长连接复用，连接过多多因消费者实例多或误配 connections；保持 connections=1、用 accepts 限连、3.x 应用级注册降压。',
          '网络优化：复用长连接、合并请求、异步化、合理超时心跳、就近路由；序列化优化两抓手——选对算法 + 瘦身 DTO。',
          '超时排查看 elapsed 分清服务端慢还是排队/网络慢，做超时预算（上游≥下游），慢方法用方法级超时单独放宽。',
          '启动慢查 check 阻塞、注册中心连接、服务过多、初始化重；内存泄漏用 jmap+MAT 看大对象，注意 future 堆积、静态缓存、ThreadLocal 未清理。',
          '调不通按 注册→发现→网络→协议→业务 分层排查，调不通/发现不了九成出在 group/version 不匹配与网络可达；用直连快速二分定位。',
          '链路追踪靠 traceId 经 attachment 透传，接 SkyWalking/Zipkin 自动埋点；大规模优化先用可观测定位瓶颈，最大杠杆在架构层（应用级注册、就近路由、限流）。',
        ]}
      />
    </article>
  )
}

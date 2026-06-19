import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const idempotentCode = `// 幂等：用唯一业务键 + 去重表/缓存，保证重复请求只生效一次
public Result pay(PayRequest req) {
    String key = req.getRequestId();   // 调用方生成的全局唯一请求 ID
    // 1) 先抢占：SETNX 成功才继续，失败说明已处理过/正在处理
    if (!redis.setIfAbsent("pay:" + key, "1", Duration.ofMinutes(10))) {
        return queryPreviousResult(key);   // 返回上次结果，不重复扣款
    }
    // 2) 真正业务（数据库唯一索引再兜一道底）
    return doPay(req);
}
// 关键：唯一键来自调用方且全局唯一；数据库层用唯一约束做最后防线`

const seataCode = `// 分布式事务：Seata AT 模式，一个注解搞定全局事务
@GlobalTransactional      // 开启全局事务（TC 协调）
public void createOrder(OrderDTO dto) {
    orderService.insert(dto);       // 本地事务：写订单库
    storageService.deduct(dto);     // 远程 Dubbo 调用：扣库存（另一库）
    accountService.debit(dto);      // 远程 Dubbo 调用：扣余额（另一库）
    // 任一步失败，Seata 自动回滚前面已提交的分支（用 undo_log 反向补偿）
}
// AT 模式无侵入；强一致要 XA；高性能/最终一致用 TCC 或 可靠消息`

const haConfig = `# 高可用相关的常用配置组合
# 1) 多副本 + 容错
@DubboReference(cluster = "failover", retries = 2, timeout = 1500)
# 2) 慢节点避让
@DubboReference(loadbalance = "leastactive")
# 3) 降级兜底
@DubboReference(mock = "true")
# 4) 关闭启动强依赖，避免单点拖垮启动
@DubboReference(check = false)
# 配合：多机房部署 + 就近路由 + 限流熔断（Sentinel）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        到了系统设计层面，面试就不再纠结配置项，而是问「你怎么保证它在生产里稳」。这一章聚焦高可用与分布式的硬核题：
        服务怎么做高可用、跨机房怎么调、分布式事务和幂等怎么落地，以及和 Spring Cloud 生态（Feign、Gateway）的对比，
        最后串一遍「项目里到底怎么用 Dubbo」的完整流程。这些题答得有体系，能直接拉开分差。
      </Lead>

      <h2>一、如何保证服务高可用</h2>
      <h3>面试题：用 Dubbo 怎么保证服务高可用？</h3>
      <p>
        高可用没有银弹，是一套组合拳。用「冗余 + 容错 + 隔离 + 自愈」四个词撑起回答框架：
      </p>
      <ul>
        <li><strong>冗余</strong>：提供者多副本部署，单点不影响整体；注册中心也集群化。负载均衡把流量分摊到多副本。</li>
        <li><strong>容错</strong>：集群容错（failover/failfast）兜调用失败；超时控制避免被慢节点拖死。</li>
        <li><strong>隔离</strong>：限流、熔断（Sentinel）防止单个故障服务引发雪崩；线程池/信号量隔离避免相互影响。</li>
        <li><strong>自愈与降级</strong>：动态服务发现自动剔除坏节点、接入新节点；mock/降级保证核心链路在依赖故障时仍能给兜底结果。</li>
      </ul>
      <CodeBlock lang="text" title="高可用常用配置组合" code={haConfig} />
      <KeyIdea>
        关键认知：Dubbo 设计上<strong>把注册中心和监控中心都移出了调用关键路径</strong>，调用是消费者直连提供者，且消费者本地缓存了地址列表。
        所以即便注册中心短暂宕机，存量调用照常进行——这是 Dubbo 高可用的底层基因，面试一定要点出来。
      </KeyIdea>

      <h2>二、跨机房服务调用</h2>
      <h3>面试题：多机房部署时，怎么避免请求跨机房绕路？</h3>
      <p>
        跨机房调用的痛点是<strong>网络延迟</strong>和<strong>带宽成本</strong>：A 机房的消费者调到 B 机房的提供者，多了几十毫秒甚至更多的网络往返。
        核心思路是<strong>就近调用 / 同机房优先</strong>：
      </p>
      <ul>
        <li><strong>标签/同机房路由</strong>：给提供者打机房标签（如 <code>zone=hz</code>），用路由规则让消费者<strong>优先调本机房</strong>提供者，本机房全挂了再降级跨机房，保证可用性。</li>
        <li><strong>单元化部署</strong>：把一整条业务链路收敛在同一机房内闭环，尽量不跨机房，跨机房只走必要的数据同步。</li>
        <li><strong>多注册中心</strong>：各机房本地注册中心，再做必要的跨机房同步/聚合，避免所有机房都依赖一个中心注册中心。</li>
      </ul>
      <Callout variant="tip" title="就近不等于锁死">
        路由规则要写成「优先本机房、本机房不可用才跨机房」，而不是「只能本机房」。否则本机房全挂时服务整体不可用，反而降低了可用性。
        就近是为了性能，跨机房兜底是为了可用，二者要兼顾。
      </Callout>

      <h2>三、如何实现分布式事务</h2>
      <h3>面试题：跨多个 Dubbo 服务的写操作，怎么保证一致性？</h3>
      <p>
        单机本地事务管不了跨服务/跨库的写。常见方案，按一致性强弱排：
      </p>
      <table>
        <thead>
          <tr><th>方案</th><th>一致性</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>XA / 2PC</td><td>强一致</td><td>同步阻塞、性能差，长事务锁资源</td></tr>
          <tr><td>Seata AT</td><td>较强（最终回滚）</td><td>无侵入、用 undo_log 自动补偿，最常用</td></tr>
          <tr><td>TCC</td><td>较强</td><td>Try-Confirm-Cancel 三段，侵入大但灵活高性能</td></tr>
          <tr><td>可靠消息 / 本地消息表</td><td>最终一致</td><td>异步解耦、吞吐高，适合能容忍短暂不一致</td></tr>
          <tr><td>Saga</td><td>最终一致</td><td>长流程、按步骤补偿</td></tr>
        </tbody>
      </table>
      <CodeBlock lang="java" title="Seata AT 模式（与 Dubbo 集成）" code={seataCode} />
      <p>
        实战首选 <strong>Seata</strong>：它和 Dubbo 集成良好，能通过拦截器把全局事务 ID（XID）<strong>透传</strong>到下游 Dubbo 调用，
        TC（事务协调器）统一协调各分支提交或回滚。选型原则：能用最终一致就别上强一致——强一致性能代价高；
        对账务等强一致场景再考虑 TCC/XA。回答这题，<strong>讲清「按业务一致性要求选方案」的思路</strong>比背出所有方案更得分。
      </p>

      <h2>四、服务间调用如何保证幂等性</h2>
      <h3>面试题：超时重试可能导致重复请求，怎么保证幂等？</h3>
      <p>
        幂等 = 同一请求执行一次和执行多次效果相同。这在有重试的 RPC 里几乎是必备能力。通用做法：
      </p>
      <CodeBlock lang="java" title="基于唯一键 + 去重的幂等实现" code={idempotentCode} />
      <ul>
        <li><strong>全局唯一请求 ID</strong>：由调用方生成（如订单号、token），下游用它去重——同一 ID 重复来只处理一次。</li>
        <li><strong>去重表 / Redis SETNX</strong>：用唯一键抢占，抢到才执行，没抢到返回上次结果。</li>
        <li><strong>数据库唯一约束</strong>：作为最后防线，重复插入直接被唯一索引拦下。</li>
        <li><strong>状态机</strong>：用状态流转（如「待支付→已支付」）天然防止重复扣款，只在某状态下允许操作。</li>
      </ul>
      <Callout variant="warn" title="读 vs 写">
        查询天然幂等，删除（按 ID 删）通常也幂等，难点在「新增」和「带累加的更新」（如加余额、加库存）。
        这类一定要靠唯一键去重或状态机兜底。配置了 retries 的写接口，<strong>不做幂等就是定时炸弹</strong>。
      </Callout>
      <p>
        一个常被追问的细节：去重键<strong>该存多久</strong>？太短会让「延迟很久才到的重试」漏过去而重复执行，太长会占内存。
        实务上让去重键的存活时间 ≥ 调用方最大重试窗口 + 网络抖动余量，并以数据库唯一约束作为「永久兜底」，
        即便 Redis 去重键过期了，唯一索引仍能拦下重复写。把「快路径用缓存去重、慢路径靠数据库约束」讲清楚，是这题的加分点。
      </p>

      <h2>四点五、超时、重试与幂等的联动</h2>
      <h3>面试题：为什么说「超时 + 重试 + 非幂等」是事故三连？</h3>
      <p>
        把前几章的点串起来看一个真实事故链：消费者配了 1s 超时、failover retries=2；某次扣款调用，服务端其实已经扣成功，
        但因为一次 GC 停顿响应慢了，消费者在 1s 时<strong>超时</strong>，于是 failover <strong>重试</strong>到另一个节点又扣了一次——
        用户被扣了两次款。根因是：<strong>消费者超时并不会让服务端那次执行停止</strong>，重试又作用在非幂等接口上。
      </p>
      <ul>
        <li>写接口（尤其涉及金额、库存）一律 <strong>retries=0</strong> 或用 failfast，把重试关掉。</li>
        <li>同时做<strong>幂等</strong>：即便上层有重试或用户重复点击，靠唯一键也只生效一次。</li>
        <li>超时设置要<strong>留足余量</strong>，避免因偶发抖动把正常调用判成失败而触发重试。</li>
      </ul>
      <KeyIdea>
        记住这条因果链：<strong>超时不等于失败</strong>（服务端可能已成功）→ 重试可能重复执行 → 非幂等接口产生脏数据。
        解法是「写操作不重试 + 全接口幂等 + 合理超时」三管齐下。这道题答得透，能体现你对分布式调用语义的真正理解。
      </KeyIdea>

      <h2>五、Dubbo vs Spring Cloud Gateway</h2>
      <h3>面试题：Dubbo 和 Spring Cloud Gateway 是一回事吗？</h3>
      <p>
        不是，二者根本不在一个层面，这题考的是<strong>概念辨析</strong>，别被带偏。
      </p>
      <table>
        <thead>
          <tr><th></th><th>Dubbo</th><th>Spring Cloud Gateway</th></tr>
        </thead>
        <tbody>
          <tr><td>定位</td><td>服务间 RPC 调用框架</td><td>API 网关（流量入口）</td></tr>
          <tr><td>位置</td><td>服务与服务之间（东西向）</td><td>外部到内部的入口（南北向）</td></tr>
          <tr><td>协议</td><td>dubbo/triple 长连接</td><td>HTTP，做路由转发</td></tr>
          <tr><td>职责</td><td>负载均衡、容错、治理</td><td>统一鉴权、限流、路由、协议转换</td></tr>
        </tbody>
      </table>
      <p>
        实际架构里它们<strong>互补共存</strong>：外部请求先进 Gateway（南北向，做统一鉴权限流路由），进入内网后服务之间用 Dubbo 互调（东西向）。
        Gateway 解决「外面怎么进来」，Dubbo 解决「里面怎么互调」。把这两个方向讲清，就答到点子上了。
      </p>

      <h2>六、Feign vs Dubbo</h2>
      <h3>面试题：同样是服务调用，Feign 和 Dubbo 怎么选？</h3>
      <p>
        这才是真正同层面的对比——都是「服务间调用」的方案。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Dubbo（RPC）</th><th>Feign（HTTP）</th></tr>
        </thead>
        <tbody>
          <tr><td>协议</td><td>TCP 长连接 + 二进制</td><td>HTTP/1.1 短连接 + JSON</td></tr>
          <tr><td>性能</td><td>更高（连接复用、体积小）</td><td>较低（建连、文本体积大）</td></tr>
          <tr><td>治理</td><td>原生丰富（容错/路由/降级）</td><td>依赖 Ribbon/Sentinel 等组合</td></tr>
          <tr><td>跨语言/通用性</td><td>较弱（triple 改善）</td><td>强（标准 HTTP，谁都能调）</td></tr>
          <tr><td>开发体验</td><td>接口即服务，治理强</td><td>声明式、贴近 REST，简单</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        选型口诀：<strong>内部高频、性能敏感、要强治理 → Dubbo</strong>；<strong>对外开放、跨语言、要通用性 → HTTP/Feign</strong>。
        很多公司是混用的：内网核心链路 Dubbo，对外或跨团队接口走 HTTP。3.x 的 triple 协议则让 Dubbo 也能兼顾 HTTP/2 与跨语言，缩小了这条鸿沟。
      </KeyIdea>

      <h2>七、项目中如何使用 Dubbo RPC 的完整流程</h2>
      <h3>面试题：结合你的项目，讲讲 Dubbo 是怎么用起来的？</h3>
      <p>
        这是收尾的「串讲题」，考的是你有没有真正落地过。按下面这条线讲，既完整又有条理：
      </p>
      <ol>
        <li><strong>定义 API</strong>：抽一个 <code>api</code> 模块，放接口和 DTO，提供者和消费者都依赖它（保证契约一致）。</li>
        <li><strong>提供者实现并暴露</strong>：实现类加 <code>@DubboService</code>，配置注册中心、协议、超时；启动后自动注册到注册中心。</li>
        <li><strong>消费者引用</strong>：用 <code>@DubboReference</code> 注入接口，配 timeout、retries、loadbalance、check 等；启动时订阅地址。</li>
        <li><strong>治理配置</strong>：按业务配负载均衡、容错、降级 mock、限流（Sentinel）、灰度路由等。</li>
        <li><strong>可观测</strong>：接入链路追踪（traceId 透传）、监控指标（Prometheus）、访问日志，便于排障。</li>
        <li><strong>发布运维</strong>：优雅上下线、灰度发布、版本/分组隔离做平滑升级。</li>
      </ol>
      <Example title="一句话串起来">
        <p>
          「我们把接口抽成独立 api 模块两端共用；提供者 <code>@DubboService</code> 暴露、注册到 Nacos；消费者 <code>@DubboReference</code> 订阅调用，
          配了 2s 超时、failover、关键写接口做了幂等和 failfast；大促前用权重做灰度、Sentinel 限流，并接了链路追踪做排障。」
          这样讲，面试官一听就知道你真用过。
        </p>
      </Example>

      <Summary
        points={[
          '高可用是组合拳：冗余（多副本）+ 容错（failover/超时）+ 隔离（限流熔断）+ 自愈降级；Dubbo 把注册/监控移出调用链路是其高可用基因。',
          '跨机房靠就近路由（同机房优先、不可用才跨机房）、单元化、多注册中心，兼顾性能与可用性。',
          '分布式事务按一致性选：XA 强一致但慢、Seata AT 无侵入最常用、TCC 高性能侵入大、可靠消息/Saga 最终一致；Dubbo 透传 XID 配合 Seata。',
          '幂等用全局唯一请求 ID + 去重（Redis SETNX/去重表）+ 数据库唯一约束 + 状态机；配了 retries 的写接口必须做幂等。',
          'Dubbo 与 Gateway 不同层：Gateway 是南北向入口网关，Dubbo 是东西向服务间 RPC，二者互补共存。',
          'Feign vs Dubbo 同层对比：内部高频/性能/强治理选 Dubbo，对外/跨语言/通用选 HTTP/Feign；triple 缩小了差距。',
          '项目落地流程：抽 api 模块 → @DubboService 暴露 → @DubboReference 引用 → 治理配置 → 链路追踪监控 → 优雅发布灰度。',
        ]}
      />
    </article>
  )
}

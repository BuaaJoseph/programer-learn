import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ClusterFault from '@/courses/dubbo-rpc/illustrations/ClusterFault.jsx'

const queryCode = `# 查询类接口：失败重试其它节点（默认）
dubbo.reference.com.example.OrderQueryService.cluster=failover
# 总尝试次数 = 1 + retries，这里失败最多再换 2 台
dubbo.reference.com.example.OrderQueryService.retries=2`

const writeCode = `# 非幂等写接口：快速失败，绝不重试
dubbo.reference.com.example.OrderCreateService.cluster=failfast

# 等价于把 failover 的 retries 设为 0
# dubbo.reference.com.example.OrderCreateService.retries=0`

const idempotentCode = `// 让写操作变幂等，重试才安全：业务侧用唯一键去重
@DubboService
public class OrderCreateServiceImpl implements OrderCreateService {
    @Override
    public OrderResult create(CreateOrderReq req) {
        // req 里带一个由消费端生成的全局唯一幂等号 requestId
        String key = "order:idem:" + req.getRequestId();
        // setIfAbsent：第一次返回 true，重试/重复请求返回 false
        if (!redis.setIfAbsent(key, "1", Duration.ofMinutes(10))) {
            // 已经处理过：直接返回上次的结果，而不是再下一单
            return loadResultByRequestId(req.getRequestId());
        }
        return doCreate(req);   // 真正下单
    }
}
// 有了幂等保障，即使消费端 Failover 重试，也不会重复下单`

const forkingCode = `# Forking：同时发给 N 台，谁先回用谁（用资源换延迟）
dubbo.reference.com.example.PriceService.cluster=forking
# forks：并行调用的节点数，默认 2
dubbo.reference.com.example.PriceService.forks=3
# 典型场景：实时报价、推荐结果，宁可多打几台也要最快拿到一个结果

# Failback：失败后入队，后台定时重发
dubbo.reference.com.example.NotifyService.cluster=failback
# 适合「最终送达即可」的通知类，注意重发队列有上限、进程重启会丢`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          Consumer 挑了一台 Provider 发请求，结果对方超时、报错、或刚好宕机了——这一次调用怎么收场？
          是换一台重试，还是直接报错，还是默默吞掉？这就是<em>集群容错</em>（cluster fault-tolerance）要决定的。
          选错策略，轻则白等，重则<strong>重复下单、重复扣款</strong>。
        </p>
      </Lead>

      <h2>六种容错策略</h2>
      <p>
        Dubbo 在 cluster 层提供了六种容错策略，本质是「调用失败后怎么办」的不同答案：
      </p>
      <ul>
        <li>
          <strong>Failover</strong>（失败重试，<em>默认</em>）：调用失败后自动换其它节点重试，
          总尝试次数 = <code>1 + retries</code>。适合读/查询。<strong>但对非幂等写有风险</strong>——
          可能上一台其实已经处理成功，只是响应超时，重试就造成重复操作。
        </li>
        <li>
          <strong>Failfast</strong>（快速失败）：失败立即抛异常，<strong>绝不重试</strong>。
          适合非幂等的写操作（下单、扣款），宁可让上层处理，也不冒重复的险。
        </li>
        <li>
          <strong>Failsafe</strong>（失败安全）：出异常就<strong>忽略、只记日志</strong>，不影响主流程。
          适合可有可无的旁路操作，比如埋点、审计日志。
        </li>
        <li>
          <strong>Failback</strong>（失败自动恢复）：失败后记下来，<strong>后台定时重发</strong>。
          适合允许延迟、最终送达即可的操作，比如消息通知。
        </li>
        <li>
          <strong>Forking</strong>（并行调用）：同时调多台，<strong>谁先返回用谁</strong>，
          牺牲资源换低延迟，适合实时性要求极高的读。
        </li>
        <li>
          <strong>Broadcast</strong>（广播调用）：<strong>逐个调用全部</strong> Provider，
          任一台失败即报错。适合「要让每台都执行一遍」的场景，比如刷新各节点本地缓存。
        </li>
      </ul>

      <ClusterFault />

      <h3>容错发生在哪一层：Cluster 把多变一</h3>
      <p>
        理解容错的关键，是知道它在 Dubbo 哪一层做的。还记得分层里的 <strong>cluster 层</strong>吗？
        它的职责就是<strong>把多个 Provider 的 Invoker「伪装成」一个 Invoker</strong> 交给上层。
        当上层（代理）发起一次调用时，cluster 层内部才去做「选哪台（负载均衡）+ 失败了怎么办（容错）」。
        所以容错策略本质是不同的 <code>ClusterInvoker</code> 实现：<code>FailoverClusterInvoker</code> 里写的是
        「catch 异常后换一台再调」，<code>FailfastClusterInvoker</code> 里写的是「catch 异常直接抛」。
        负载均衡是容错的「子步骤」——每次重试都会重新走一遍负载均衡选节点。
      </p>
      <Callout variant="note" title="重试会换节点，不是死磕同一台">
        <p>
          Failover 重试时会<strong>排除已经失败的节点</strong>，从剩下的里重新选一台。这点很重要：
          如果它死磕同一台失败的机器，重试毫无意义。所以「换一台节点重试」对抗的是<strong>单点偶发故障</strong>，
          而不是「整个服务都不可用」——后者重试只会雪上加霜。
        </p>
      </Callout>

      <Example title="下单用哪种，查询用哪种">
        <p>
          <strong>查询订单</strong>是<em>幂等</em>的——查一次和查两次结果一样，重试没有副作用。
          所以用默认的 <strong>Failover</strong>：某台 Provider 偶发抖动失败了，自动换一台再查，用户几乎无感。
        </p>
        <p>
          <strong>创建订单</strong>通常是<em>非幂等</em>的——重复调用就可能生成两笔订单。这时绝不能用 Failover：
          万一第一台其实下单成功了、只是响应超时，重试就多下了一单。正确做法是用 <strong>Failfast</strong>
          快速失败，把结果交给上层（让用户重试或走对账），或者在业务侧用唯一键/幂等表保证幂等后再考虑重试。
        </p>
      </Example>

      <KeyIdea title="重试的前提是幂等">
        <p>
          Failover 好用，但它的<strong>隐含前提是「这个操作可以安全地做多次」</strong>。
          读操作天然幂等，放心重试；写操作要么<strong>本身设计成幂等</strong>（唯一订单号、幂等表去重），
          要么就<strong>别重试</strong>（Failfast 或把 retries 设为 0）。
        </p>
        <p>
          一句话：<strong>幂等才能重试，非幂等就快速失败</strong>。这是集群容错里最该刻进脑子的安全准则。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="retries 是「额外重试次数」，别数错">
        <p>
          Failover 的 <code>retries</code> 默认是 2，含义是<strong>额外重试 2 次</strong>，
          所以总尝试次数是 <code>1 + 2 = 3</code> 次，不是 2 次。把它配成 0 就等价于不重试。
        </p>
        <p>
          还要注意：超时 + 重试可能<strong>放大故障</strong>——某台慢了导致超时，重试又压向其它节点，
          高峰期容易雪崩。所以对耗时长或写类接口，要谨慎设置 retries 和 timeout。
        </p>
      </Callout>

      <h2>让写操作也能安全重试：业务幂等</h2>
      <p>
        Failfast 虽然安全，但「失败就报错让用户重来」体验并不好。更高级的做法是：
        <strong>把写操作本身设计成幂等的</strong>，这样即便重试也不会重复下单，就能放心用 Failover。
        通用套路是消费端生成一个全局唯一的<strong>幂等号</strong>随请求带上，提供端用它去重（Redis <code>setIfAbsent</code>、
        数据库唯一索引、幂等表都行）：
      </p>
      <CodeBlock lang="java" title="用幂等号让下单可安全重试" code={idempotentCode} />
      <p>
        这就把「能不能重试」的责任从框架挪到了业务设计上——框架的 retries 只是机制，
        <strong>幂等才是允许重试的真正前提</strong>。

      </p>

      <h3>Forking 与 Failback 的真实用法</h3>
      <p>
        前面两个例子集中在读/写，再补两个容易被忽视但实战有用的策略。<strong>Forking</strong> 同时打几台、取最快的，
        是「用资源换延迟」，适合实时报价、推荐这类「慢一点不如多花点机器」的读；<strong>Failback</strong> 失败后入队后台重发，
        适合通知这类「最终送达即可」的场景，但要知道它的重发队列有上限、进程重启会丢，不能当可靠消息用：
      </p>
      <CodeBlock lang="properties" title="Forking 与 Failback 配置" code={forkingCode} />

      <h2>怎么按业务选</h2>
      <p>
        给一个能套用的决策口诀：<strong>读/查询用 Failover；非幂等写用 Failfast；
        旁路日志用 Failsafe；可延迟送达用 Failback；要最快响应用 Forking；要全员执行用 Broadcast</strong>。
        先判断「这次调用是不是幂等」，再判断「失败了能不能容忍/要不要补偿」，策略基本就定了。
      </p>

      <h2>实战/面试怎么答</h2>
      <p>
        被问「Dubbo 的集群容错策略」，先把六种各报一句，再用「下单 vs 查询」这个例子收尾：
        <strong>查询幂等用默认 Failover、失败换节点重试；下单非幂等用 Failfast、绝不重试以防重复</strong>，
        最后强调「重试的前提是幂等，retries 是额外次数、总次数要加 1」。这样既全面又有实战判断力。
      </p>

      <Callout variant="warn" title="容错的致命坑">
        <ul>
          <li><strong>重试放大故障引发雪崩</strong>：下游变慢→超时→Failover 重试→流量翻倍压向其它节点→更慢→更多重试。高峰期对写类/慢接口尤其危险，要配合限流和熔断。</li>
          <li><strong>超时设太短 + 重试</strong>：方法本来要 800ms，timeout 配 500ms，结果每次都「假超时」并重试，等于把流量乘以 retries 倍，纯属自残。</li>
          <li><strong>对非幂等接口用了默认 Failover</strong>：这是线上重复下单/扣款的头号原因——Dubbo 默认就是 Failover，忘了改写接口的策略就埋雷。</li>
          <li><strong>误区「超时了说明对方没执行」</strong>：超时只代表消费端没等到响应，提供端可能已经执行完。所以才需要幂等。</li>
          <li><strong>Broadcast 任一台失败就整体失败</strong>：节点多时成功率会被拉低，且是串行调用、耗时随节点数增长，别用在大集群的高频路径上。</li>
        </ul>
      </Callout>

      <Practice title="按接口性质配置容错策略与 retries">
        <p>
          容错策略和重试次数都在 Consumer 端按引用配置。给查询接口配 Failover + 适当 retries，
          给写接口配 Failfast，亲手区分幂等与非幂等的处理方式。
        </p>
        <CodeBlock lang="properties" title="查询接口（幂等，可重试）" code={queryCode} />
        <CodeBlock lang="properties" title="下单接口（非幂等，不重试）" code={writeCode} />
        <p>
          验证方法：让 Provider 的查询方法随机抛异常，观察 Failover 是否自动换节点重试成功；
          再把下单方法做成每次都抛异常，确认 Failfast 立即报错、绝不重复调用——这就是两类策略的本质区别。
        </p>
      </Practice>

      <Summary
        points={[
          '集群容错决定「调用失败后怎么办」，选错可能导致重复下单、重复扣款等严重后果。',
          'Failover（默认）失败换节点重试，适合幂等的读；非幂等写慎用，可能因超时重试造成重复操作。',
          'Failfast 快速失败不重试，适合非幂等写；Failsafe 忽略异常记日志，适合旁路操作。',
          'Failback 失败后后台定时重发，适合可延迟送达；Forking 并行取最快、Broadcast 逐个广播全部。',
          '核心准则：幂等才能重试，非幂等就快速失败；retries 是额外重试次数，总尝试次数要加 1。',
          '选型口诀：查询 Failover、写 Failfast、日志 Failsafe、可延迟 Failback、求快 Forking、全员 Broadcast。',
        ]}
      />
    </>
  )
}

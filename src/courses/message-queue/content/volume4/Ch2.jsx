import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const txnSnippet = `// RocketMQ 事务消息：两阶段 + 回查
TransactionMQProducer producer = new TransactionMQProducer("group");
producer.setTransactionListener(new TransactionListener() {
    // 1) 发送半消息成功后，执行本地事务
    public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        try {
            doLocalBusiness();                       // 如：扣款、写订单
            return LocalTransactionState.COMMIT_MESSAGE;   // 提交：消息对消费者可见
        } catch (Exception e) {
            return LocalTransactionState.ROLLBACK_MESSAGE; // 回滚：丢弃半消息
        }
    }
    // 2) Broker 回查：本地事务状态未知时主动问
    public LocalTransactionState checkLocalTransaction(MessageExt msg) {
        return queryByBusinessKey(msg) ? COMMIT_MESSAGE : ROLLBACK_MESSAGE;
    }
});
producer.sendMessageInTransaction(msg, null);  // 发送半消息`

const orderSnippet = `// 顺序消息：同一业务键的消息发到同一队列 + 顺序消费
producer.send(msg, new MessageQueueSelector() {
    public MessageQueue select(List<MessageQueue> qs, Message m, Object arg) {
        int orderId = (int) arg;
        return qs.get(orderId % qs.size());  // 同一订单号选同一队列
    }
}, orderId);

// 消费端用 MessageListenerOrderly：同一队列单线程顺序消费
consumer.registerMessageListener((MessageListenerOrderly)(msgs, ctx) -> {
    for (MessageExt m : msgs) handle(m);
    return ConsumeOrderlyStatus.SUCCESS;
});`

const delaySnippet = `// 延迟消息：设置延迟级别（RocketMQ 4.x 只支持固定 18 个级别）
Message msg = new Message("topic", body);
msg.setDelayTimeLevel(3);  // 级别 3 = 10s
// 级别表：1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
//        1  2  3   4   5  6  7  8  9  10 11 12 13 14  15  16  17 18
producer.send(msg);
// RocketMQ 5.x 起支持任意时间的定时消息（不再局限于 18 个级别）`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章覆盖 RocketMQ 面试的「高级特性密集区」：事务消息与分布式事务、顺序性保证、延迟消息与延迟级别、
        重试机制、广播 vs 集群、消息过滤、幂等与可靠投递、Offset 管理、负载均衡、并发与顺序消费、死信、
        高可用、消息轨迹、批量消息、乱序与堆积调优。题目多但都是一类系统的真实考点，逐个吃透即可。
      </Lead>

      <h2>一、事务消息与分布式事务</h2>
      <p>
        RocketMQ 的事务消息是它的招牌特性，用来解决<strong>「本地事务 + 发消息」要么都成功要么都失败</strong>的难题
        （典型：扣款成功就必须发出「已扣款」消息，不能扣了款消息没发出去）。它用<strong>两阶段提交 + 事务回查</strong>实现。
      </p>
      <CodeBlock lang="java" title="RocketMQ 事务消息：半消息 + 本地事务 + 回查" code={txnSnippet} />
      <ol>
        <li><strong>发半消息</strong>：生产者先发一条<strong>「半消息（对消费者不可见）」</strong>到 Broker。</li>
        <li><strong>执行本地事务</strong>：半消息发送成功后，执行本地事务（如扣款写库）。</li>
        <li><strong>提交/回滚</strong>：本地事务成功则提交（半消息转为正式消息、消费者可见），失败则回滚（丢弃半消息）。</li>
        <li><strong>事务回查</strong>：若 Broker 长时间没收到提交/回滚（如生产者宕机），会<strong>主动回查</strong>生产者「这笔本地事务到底成没成」，据此决定提交还是回滚。</li>
      </ol>
      <Callout variant="warn" title="事务消息的缺点">
        ① 它只保证「本地事务与发消息的原子」，<strong>不保证下游消费一定成功</strong>——下游还得靠重试 + 幂等；
        ② 有<strong>回查机制，要求本地事务状态可查询</strong>，业务要配合实现回查接口；
        ③ 半消息、回查带来额外开销和复杂度，性能低于普通消息。它是「最终一致」方案，不是强一致的分布式事务。
      </Callout>

      <h2>二、顺序性保证</h2>
      <p>
        和通用篇一致：<strong>同一业务键的消息发到同一队列 + 消费端顺序消费</strong>。
        发送用 <code>MessageQueueSelector</code> 把同一订单的消息选到同一队列；消费用 <code>MessageListenerOrderly</code> 对该队列单线程顺序处理。
        分区/队列间并行，队列内有序，得到「局部有序」。
      </p>
      <CodeBlock lang="java" title="顺序消息：选同一队列 + Orderly 顺序消费" code={orderSnippet} />

      <h2>三、延迟消息与延迟级别</h2>
      <p>
        RocketMQ 4.x 的延迟消息<strong>不支持任意时间</strong>，只支持 <strong>18 个固定延迟级别</strong>（1s/5s/10s…2h），
        通过 <code>setDelayTimeLevel(n)</code> 指定。Broker 把延迟消息先存到一个内部的延迟 Topic，到点再投递到真实 Topic。
        <strong>RocketMQ 5.x 起支持任意时间的定时消息</strong>，不再受 18 级限制。
      </p>
      <CodeBlock lang="java" title="延迟消息与 18 个延迟级别" code={delaySnippet} />

      <h2>四、消息重试机制</h2>
      <p>
        分生产端和消费端：
      </p>
      <ul>
        <li><strong>生产端重试</strong>：同步发送失败会自动重试（默认 2 次，可配），重试时可<strong>换一个 Broker</strong>规避单点故障。</li>
        <li><strong>消费端重试</strong>：集群消费下，消费返回失败（或抛异常）时，消息会进入<strong>重试队列（%RETRY%消费组）</strong>，
          按<strong>递增的延迟级别</strong>（10s、30s、1m… 共 16/18 次）重投。重试达上限仍失败，进<strong>死信队列</strong>。</li>
      </ul>

      <h2>五、广播 vs 集群模式</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>集群消费（默认）</th><th>广播消费</th></tr>
        </thead>
        <tbody>
          <tr><td>投递</td><td>组内分摊，一条消息一个实例</td><td>组内每个实例都消费一遍</td></tr>
          <tr><td>offset 存储</td><td>存 Broker（集中管理）</td><td>存消费者本地（各自维护）</td></tr>
          <tr><td>消费失败重试</td><td>支持（重试队列）</td><td>不支持自动重试</td></tr>
          <tr><td>用途</td><td>负载分担（主流）</td><td>每台都要处理（如刷本地缓存）</td></tr>
        </tbody>
      </table>

      <h2>六、消息过滤</h2>
      <p>
        RocketMQ 支持两种过滤：<strong>Tag 过滤</strong>（最常用，Broker 用 ConsumeQueue 的 Tag 哈希粗过滤 + 消费端精过滤）；
        <strong>SQL92 过滤</strong>（按消息属性写 SQL 表达式过滤，更灵活，需 Broker 开启 <code>enablePropertyFilter</code>）。
      </p>

      <h2>七、幂等、可靠投递与 Offset 管理</h2>
      <p>
        <strong>幂等</strong>：RocketMQ 也是至少一次，重复不可避免（重试、负载均衡 rebalance、回查等都会引入），
        必须<strong>消费端用唯一键去重</strong>（RocketMQ 的 msgId 可能因重试变化，优先用业务键或 message key）。
      </p>
      <p>
        <strong>可靠投递</strong>：生产端同步发送 + 重试 + 兜底；存储端 CommitLog 持久化 + 主从复制；消费端处理成功才返回 SUCCESS（否则触发重试）。
      </p>
      <p>
        <strong>Offset 管理</strong>：集群消费下 offset 由 Broker 集中管理（消费者定期上报）；广播消费下 offset 存消费者本地。
        消费位点决定「从哪开始消费」，重置 offset 可实现重放或跳过。
      </p>

      <h2>八、消费负载均衡（Rebalance）</h2>
      <p>
        同一消费组的多个实例，会<strong>把 Topic 的队列分摊给各实例</strong>——这就是负载均衡。
        当实例增减、队列数变化时触发 <strong>Rebalance</strong> 重新分配。默认按平均分配策略（每个实例分到大致相等的队列数）。
        Rebalance 期间可能短暂重复消费（队列从一个实例转移到另一个），所以幂等很重要。
      </p>

      <h2>九、并发消费 vs 顺序消费、死信</h2>
      <p>
        <strong>并发消费（Concurrently）</strong>：多线程并行处理同一队列消息，吞吐高但不保序，失败重试不影响其他消息。
        <strong>顺序消费（Orderly）</strong>：对队列加锁单线程消费保证顺序，某条失败会<strong>阻塞重试当前消息</strong>（不跳过，否则乱序），代价是可能卡住后续。
      </p>
      <p>
        <strong>死信队列（DLQ）</strong>：消费重试达到最大次数仍失败的消息，进入死信队列 <code>%DLQ%消费组名</code>，
        需人工或专门程序处理。死信不会自动重投，要监控告警。
      </p>

      <h2>十、高可用、消息轨迹、批量、乱序与堆积调优</h2>
      <p>
        <strong>高可用</strong>：Broker 主从 + DLedger（Raft）自动选主；NameServer 多节点；生产消费多实例。任一组件挂部分节点仍可用。
      </p>
      <p>
        <strong>消息轨迹（Message Trace）</strong>：开启后，RocketMQ 把消息的「生产→存储→消费」全链路轨迹记录到一个内部 Topic，
        可查询某条消息何时被谁发送、存到哪、被谁消费、耗时多少——排查「消息去哪了/为啥没消费」极其有用。
      </p>
      <p>
        <strong>批量消息</strong>：把多条消息打成一个 List 一次发送，减少网络往返，提升吞吐（注意总大小限制，默认 4MB，超限要拆分）。
      </p>
      <p>
        <strong>乱序处理</strong>：并发消费天然可能乱序；若业务需要有序就用顺序消息；若只是偶发乱序，可在消费端用业务状态机让乱序也能正确收敛。
      </p>
      <p>
        <strong>堆积调优</strong>：增加消费者实例（受队列数限制，必要时加队列）、改并发消费、优化单条处理耗时（批量查库/异步）、
        把慢消息隔离、监控消费延迟（diff = 最大 offset - 消费 offset）提前告警。
      </p>

      <h2>十一、面试精讲</h2>

      <h3>Q1：RocketMQ 事务消息怎么实现？有什么缺点？</h3>
      <p>
        <strong>原创讲解。</strong>用<strong>「半消息 + 本地事务 + 回查」</strong>三步：① 先发对消费者不可见的<strong>半消息</strong>；
        ② 半消息发成功后执行<strong>本地事务</strong>；③ 本地事务成功就提交（半消息变可见）、失败就回滚（丢弃半消息）；
        ④ 若 Broker 迟迟收不到结果（如生产者宕机），主动<strong>回查</strong>生产者本地事务状态再定夺。
      </p>
      <p>这保证了「本地事务」与「发消息」的原子性，是分布式事务的<strong>最终一致</strong>方案。缺点要诚实说：</p>
      <ul>
        <li>只保证「本地事务 + 发消息」原子，<strong>不保证下游消费成功</strong>，下游仍需重试 + 幂等。</li>
        <li>需要<strong>实现回查接口</strong>，业务本地事务状态必须可查询，增加开发负担。</li>
        <li>半消息、回查有额外开销，性能低于普通消息；它是最终一致，不是强一致。</li>
      </ul>
      <p>
        <strong>面试追问：</strong>「回查为什么必要？」——因为「执行本地事务」和「告知 Broker 结果」之间生产者可能宕机，
        Broker 不知道该提交还是回滚，半消息就悬着了。回查是这个中间态的兜底，保证半消息最终一定有归宿。
      </p>

      <h3>Q2：RocketMQ 怎么保证消息不重复消费？</h3>
      <p>
        <strong>原创讲解。</strong>先摆正认知：<strong>RocketMQ 不承诺不重复（至少一次）</strong>，重复来源有重试、Rebalance、事务回查、网络重传等。
        所以不重复要靠<strong>消费端幂等</strong>——用业务唯一键（订单号、message key）建去重表或借助唯一索引/状态机，让重复只生效一次。
      </p>
      <p>
        <strong>面试追问：</strong>「能用 msgId 去重吗？」——不建议作为唯一依据。RocketMQ 的 msgId 在某些重试场景下可能变化，
        且不同生产重试可能产生「内容相同 msgId 不同」的消息。优先用<strong>业务键</strong>，msgId/messageKey 作辅助。
      </p>

      <h3>Q3：RocketMQ 顺序消费失败了怎么办？会不会卡住？</h3>
      <p>
        <strong>原创讲解。</strong>会卡住，这是顺序消费的必然代价。顺序消费（Orderly）下，某条消息处理失败时，
        RocketMQ <strong>不会跳过它去消费后面的</strong>（跳过就乱序了），而是<strong>原地阻塞、不断重试当前这条</strong>，
        直到成功或达到上限。这期间该队列后续消息全被堵住。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>并发消费</th><th>顺序消费</th></tr>
        </thead>
        <tbody>
          <tr><td>失败重试</td><td>该消息进重试队列，不阻塞其他</td><td>原地阻塞重试，堵住后续</td></tr>
          <tr><td>顺序</td><td>不保证</td><td>队列内严格有序</td></tr>
          <tr><td>吞吐</td><td>高（多线程）</td><td>低（队列单线程）</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「怎么避免一条毒消息把顺序队列堵死？」——设置合理的重试上限，超限后告警 + 人工介入或转人工补偿队列；
        或在业务层让该消息「失败也能安全跳过 + 后续对账」，避免无限阻塞影响整条队列。
      </p>

      <Summary
        points={[
          '事务消息用「半消息+本地事务+回查」保证本地事务与发消息原子（最终一致）；缺点：不保下游消费、需实现回查接口、有额外开销，非强一致。',
          '顺序消息：同业务键选同一队列(MessageQueueSelector)+消费端 Orderly 单线程；顺序消费失败会原地阻塞重试堵住后续，需设上限+告警。',
          '延迟消息：4.x 仅 18 个固定级别(setDelayTimeLevel)，5.x 起支持任意定时；重试分生产端(换 Broker)与消费端(重试队列递增延迟,超限进死信)。',
          '集群消费分摊+offset 存 Broker+支持重试；广播消费每实例各消费+offset 存本地+不重试；Rebalance 重分队列时可能短暂重复，故需幂等。',
          '过滤分 Tag(粗+精两级)与 SQL92；可靠投递三段堵；不重复靠消费端业务键幂等(msgId 不可靠);高可用靠主从 DLedger+多 NameServer。',
          '消息轨迹记录全链路便于排查;批量消息减往返(注意 4MB 上限);堆积调优靠加实例/加队列/并发消费/优化耗时/监控 diff 告警。',
        ]}
      />
    </article>
  )
}

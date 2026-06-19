import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ConsumerGroup from '@/courses/kafka/illustrations/ConsumerGroup.jsx'

const groupCmdCode = `# 查看某个消费者组当前的成员、分区分配和 lag（积压量）
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
    --group order-consumers --describe

# 输出大致长这样（LAG = 分区末尾 offset - 已提交 offset）：
# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
# orders  0          1500            1500            0    consumer-1
# orders  1          1480            1620            140  consumer-2
# orders  2          900             900             0    consumer-3

# 列出集群里所有消费者组
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list`

const assignorCode = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "order-consumers");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

// 用协作式 sticky，rebalance 时尽量不动原有分配、不全局暂停
props.put("partition.assignment.strategy",
          "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");

// 心跳与处理超时：两步消费要在 max.poll.interval.ms 内做完，否则会被踢出
props.put("session.timeout.ms", "10000");
props.put("heartbeat.interval.ms", "3000");
props.put("max.poll.interval.ms", "300000");`

const staticMemberCode = `// 静态成员：给消费者一个稳定身份，滚动重启不触发 rebalance
props.put("group.instance.id", "order-consumer-pod-3"); // 每个实例唯一且稳定
// 配合稍大的会话超时，重启窗口内 broker 不把它当掉线
props.put("session.timeout.ms", "45000");

// 效果：K8s 滚动发布时，实例带着同一个 group.instance.id 回来，
// broker 认得它，分区原样还给它，整组不抖动`

const rebalanceListenerCode = `// 在 rebalance 前后做收尾：交出分区前提交 offset，避免重复消费
consumer.subscribe(List.of("orders"), new ConsumerRebalanceListener() {
    @Override
    public void onPartitionsRevoked(Collection<TopicPartition> parts) {
        // 即将失去这些分区：把当前进度提交掉
        consumer.commitSync(currentOffsets);
    }
    @Override
    public void onPartitionsAssigned(Collection<TopicPartition> parts) {
        // 拿到新分区：可在此恢复本地状态/定位 offset
    }
});`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          一个分区的消息，怎么让多台机器一起消费却又不重不漏？Kafka 的答案是<em>消费者组</em>（consumer group）：
          同一个组里的消费者自动分摊分区，谁也不踩谁。但这套自动分配并不免费——成员一变动，就会触发
          <em>rebalance</em>（再均衡），处理不好它会让你的消费短暂停摆、甚至重复消费。这一章就把消费者组和 rebalance 讲透。
        </p>
      </Lead>

      <h2>消费者组：分摊与广播</h2>
      <p>
        消费者组是 Kafka 实现「负载均衡」和「广播」的核心机制，记住两条铁律就够了：
      </p>
      <ul>
        <li>
          <strong>组内分摊</strong>——同一个 <code>group.id</code> 下的消费者会把 topic 的所有分区分掉，
          <strong>一个分区在同一时刻只会被组内一个消费者消费</strong>。这就是水平扩展的方式：加消费者 = 加吞吐。
        </li>
        <li>
          <strong>组间独立</strong>——不同 <code>group.id</code> 的消费者各自维护自己的消费进度，互不影响。
          同一条消息会被每个组各消费一次，这天然就是<strong>广播</strong>：风控组、计费组、报表组可以各读各的同一份订单流。
        </li>
      </ul>
      <p>
        进度存哪？每个组的消费位移记在一个内部主题 <code>__consumer_offsets</code> 里（按 group + topic + partition 为 key、
        采用 compact 压实只留最新值）。负责协调某个组的那台 broker 叫 <strong>Group Coordinator</strong>，
        它管成员加入、分区分配下发、offset 提交。理解这一点，后面排查「组卡住」「offset 丢了」才有抓手。
      </p>

      <ConsumerGroup />

      <KeyIdea title="消费者数不要超过分区数">
        <p>
          因为「一个分区同一时刻只能被组内一个消费者消费」，所以组内消费者数<strong>多于</strong>分区数时，
          多出来的消费者会<strong>空闲</strong>，分不到任何分区、白白占着。分区数是消费并行度的上限。
        </p>
        <p>
          这也是为什么扩容消费能力前，往往要先评估分区数够不够——光加消费者没用，得先有足够的分区。
        </p>
      </KeyIdea>

      <h2>分区分配策略</h2>
      <p>
        分区到底怎么分给组内成员？由 <code>partition.assignment.strategy</code> 决定，常见四种：
      </p>
      <ul>
        <li>
          <strong>range</strong>——按 topic 逐个分，把每个 topic 的分区按范围切给消费者。多 topic 时容易分得不均，
          靠前的消费者拿得多。
        </li>
        <li>
          <strong>roundrobin</strong>——把所有分区拉平后轮流发，整体更均匀，但 rebalance 时分配会大面积变动。
        </li>
        <li>
          <strong>sticky</strong>——「粘性」：尽量保留上一次的分配结果，只挪动必要的分区，减少变动带来的代价。
        </li>
        <li>
          <strong>cooperative-sticky</strong>——协作式粘性，是目前推荐的默认。它把 rebalance 拆成多轮增量进行，
          <strong>不需要全组停下来</strong>，没受影响的分区可以继续消费。
        </li>
      </ul>
      <p>
        补一句机制差异：传统的 <strong>eager</strong> 协议在 rebalance 第一步就让所有人「先交出全部分区」再重分；
        而 cooperative 协议只让「确实要换主」的那部分分区被 revoke，其余继续跑，所以叫「增量协作」。
        切换分配器要注意<strong>滚动升级兼容性</strong>，新旧策略不能在同一组里混用太久。
      </p>

      <h2>Rebalance：触发与代价</h2>
      <p>
        当组内成员或分区发生变化，Kafka 需要重新分配分区，这个过程就是 <em>rebalance</em>。常见触发原因有三类：
      </p>
      <ul>
        <li><strong>成员增减</strong>——有消费者加入（扩容）或退出（宕机、重启、被踢）。</li>
        <li><strong>分区变化</strong>——topic 的分区数增加，需要把新分区分给某个消费者。</li>
        <li>
          <strong>消费者「失联」</strong>——心跳超时或处理太慢被判定为掉线（下面细说），等价于成员减少。
        </li>
      </ul>
      <p>
        传统（eager）rebalance 的代价很大：它是<em>stop-the-world</em> 的——整个组的所有消费者都要先放弃手里的分区、
        暂停消费，等重新分配完才能继续。这段「空窗」期间消息积压（lag 上涨）。更麻烦的是，
        如果 rebalance 发生在「处理完消息但还没提交 offset」的瞬间，分区被分给别的消费者后会<strong>从旧 offset 重新消费</strong>，
        造成<em>重复消费</em>。
      </p>

      <Example title="加一台机器扩容，反而抖了一下">
        <p>
          某服务订单消费有点跟不上，运维直接又起了一个同 <code>group.id</code> 的消费者实例想扩容。新实例一加入，
          立刻触发 rebalance：用传统策略时，组内原有的几个消费者全部短暂停止消费、交出分区，
          监控上 lag 瞬间冲高，下游告警响了一片，几秒后才恢复。
        </p>
        <p>
          原因就是 stop-the-world。换成 <code>cooperative-sticky</code> 后，再扩容时只有「需要让出的那一两个分区」被搬动，
          其余分区照常消费，曲线就平滑多了。所以「扩容触发 rebalance 抖动」是典型面试题，答案落点在协作式 rebalance + 粘性分配。
        </p>
      </Example>

      <Callout variant="warn" title="心跳和 max.poll.interval.ms 是两回事">
        <p>
          消费者活不活，Kafka 看两个维度：一是后台线程的<strong>心跳</strong>，由 <code>session.timeout.ms</code> 和
          <code>heartbeat.interval.ms</code> 控制，心跳停了说明进程挂了；二是两次 <code>poll()</code> 之间的间隔，
          由 <code>max.poll.interval.ms</code> 控制。
        </p>
        <p>
          常见的坑是：进程没死、心跳正常，但单批消息处理太慢，超过了 <code>max.poll.interval.ms</code> 还没回来 poll，
          Kafka 照样判定它「卡死」并<strong>把它踢出组、触发 rebalance</strong>。解决办法是减小单次 poll 的消息量
          （<code>max.poll.records</code>）、或加大该超时、或把重活异步化。
        </p>
      </Callout>

      <h2>少抖动的两个利器</h2>
      <p>
        除了换成 cooperative-sticky，还有两招显著减少无谓 rebalance。其一是<strong>静态成员</strong>
        （static membership）：给每个实例配一个稳定的 <code>group.instance.id</code>，并把 <code>session.timeout.ms</code> 调大些，
        这样 K8s 滚动发布、短暂重启时，broker 在超时窗口内认得它是「老熟人」，分区原样还给它，<strong>整组不触发 rebalance</strong>。
      </p>
      <CodeBlock lang="java" title="StaticMember.java" code={staticMemberCode} />
      <p>
        其二是用 <strong>ConsumerRebalanceListener</strong>：在分区被 revoke（即将失去）之前<strong>主动提交一次 offset</strong>，
        把「处理完但没提交」的窗口压到最小，从源头减少 rebalance 引发的重复消费。
      </p>
      <CodeBlock lang="java" title="RebalanceListener.java" code={rebalanceListenerCode} />

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「rebalance 为什么会重复消费、怎么避免」，思路是：rebalance 在 offset 提交前发生 → 分区易主 → 从旧 offset 重读。
        缓解手段一是<strong>缩短处理-提交的窗口</strong>（处理完尽快提交，见下一章），二是用 <code>cooperative-sticky</code>
        减少分区搬动，三是合理设置 <code>max.poll.records</code> 和 <code>max.poll.interval.ms</code> 避免被误踢，
        四是用静态成员 + RebalanceListener，五是消费端做<strong>业务幂等</strong>兜底——只要会 rebalance，重复就无法 100% 避免，幂等是终极保险。
      </p>

      <Practice title="用 kafka-consumer-groups 观察分配与 lag">
        <p>
          先用命令行看清楚某个组的成员、分区分配和每个分区的 <code>LAG</code>，再启动 / 关掉一个消费者，
          重新 <code>--describe</code> 一次，对比分配是怎么变的、lag 怎么波动。
        </p>
        <CodeBlock lang="bash" title="inspect-group.sh" code={groupCmdCode} />
        <p>
          然后在消费者代码里把分配策略换成 <code>CooperativeStickyAssignor</code>，再扩容一次，对比 rebalance 抖动的差别：
        </p>
        <CodeBlock lang="java" title="ConsumerConfig.java" code={assignorCode} />
      </Practice>

      <Summary
        points={[
          '消费者组：同组分摊分区（一个分区同时只被组内一个消费者消费），组间独立等于广播；进度存 __consumer_offsets，由 Group Coordinator 协调。',
          '消费者数超过分区数时多出来的会空闲，分区数是消费并行度的上限。',
          '分配策略 range / roundrobin / sticky / cooperative-sticky，后者增量再均衡、不全局停顿，是推荐默认。',
          'rebalance 由成员增减、分区变化、心跳/poll 超时触发，传统 eager 方式 stop-the-world 且可能重复消费。',
          '心跳超时和 max.poll.interval.ms 超时是两码事，处理太慢会被误踢出组引发 rebalance。',
          '静态成员（group.instance.id）让滚动重启不抖；RebalanceListener 在 revoke 前提交 offset 减少重复。',
          '避免重复消费靠缩短处理-提交窗口、协作式 rebalance、合理超时、静态成员，再加业务幂等兜底。',
        ]}
      />
    </>
  )
}

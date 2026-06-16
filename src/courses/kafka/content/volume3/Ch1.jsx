import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Isr from '@/courses/kafka/illustrations/Isr.jsx'

const describeCode = `# 查看某个 topic 的分区、副本与 ISR 分布
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --topic orders

# 典型输出（replication.factor=3，3 个 broker）
# Topic: orders  PartitionCount: 1  ReplicationFactor: 3
#   Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
#                                 ^^^^^^^^^  ^^^^^^^^^^^^^^^  ^^^^^^^^^
#                                 Leader     全部副本          同步副本集合`

const safeConfigCode = `# server.properties（broker 端）
# 关闭非同步副本当选 Leader，宁可不可用也不丢数据
unclean.leader.election.enable=false
# 一条消息至少要被 2 个副本确认，才算写入成功
min.insync.replicas=2

# 生产者端：等所有 ISR 副本都确认
acks=all`

const underReplicatedCode = `# 监控里最该盯的几个副本健康指标
# 1) 有多少分区副本数不足（ISR 掉队）—— 正常应恒为 0
kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions

# 2) 没有 Leader 的分区数（彻底不可用）—— 正常应为 0
kafka.controller:type=KafkaController,name=OfflinePartitionsCount

# 3) 命令行快速排查 under-replicated 分区
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --describe --under-replicated-partitions`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          一台 broker 宕机是常态而非意外。Kafka 靠的不是「永不出错」，而是「出错了也不丢、不停」。
          支撑这一切的核心机制只有一个：<em>replication</em>（多副本）。同一个分区的数据会在多台 broker 上各存一份，
          一台挂了，另一台顶上。理解了 Leader、Follower 与 <em>ISR</em> 这三个词，你就抓住了 Kafka 高可用的命脉。
        </p>
      </Lead>

      <h2>一个分区，多份副本</h2>
      <p>
        创建 topic 时有个参数叫 <code>replication.factor</code>，它决定每个分区有几份副本。比如设成 3，
        分区 0 的数据就会同时存在于 3 台 broker 上。这若干份副本里，有且只有一份是 <em>Leader</em>，其余都是 <em>Follower</em>。
      </p>
      <p>
        分工很清晰：生产者和消费者<strong>只跟 Leader 打交道</strong>，所有读写都走 Leader；
        Follower 不对外服务，它唯一的工作就是默默地从 Leader 拉取消息、把自己同步成和 Leader 一模一样的样子。
        这样一旦 Leader 所在的 broker 挂了，某个已经同步好的 Follower 就能立刻被推举成新 Leader，对外继续服务。
      </p>
      <p>
        有人会问：为什么 Follower 不能也对外提供读，分摊压力？答案是<strong>一致性</strong>——Follower 可能落后 Leader，
        从它读会读到旧数据，破坏「读到的就是最新已提交的」这个保证。这是 Kafka 与「主从读写分离」数据库的一大不同。
        副本的分布也有讲究：Kafka 会尽量把同一分区的多个副本放到<strong>不同的机架（rack）</strong>（<code>broker.rack</code> + 机架感知分配），
        这样整机架掉电也不至于丢掉某个分区的全部副本。
      </p>

      <h3>ISR：哪些副本「跟得上」</h3>
      <p>
        但 Follower 不一定都跟得上。有的 Follower 因为网络慢、机器卡，落后 Leader 一大截。
        Kafka 把那些<strong>与 Leader 保持同步</strong>的副本（包括 Leader 自己）归为一个集合，叫 <em>ISR</em>（In-Sync Replicas，同步副本集合）。
        判定标准是 <code>replica.lag.time.max.ms</code>：一个 Follower 只要在这个时间内还在持续追赶 Leader，就算「在 ISR 里」；
        长时间拉不动，就会被踢出 ISR，等它追上来了再重新加回。
      </p>
      <p>
        注意这里的判定是<strong>按时间而非按消息条数</strong>（老版本曾用 <code>replica.lag.max.messages</code> 按条数，
        会因突发大批量写入误判而被淘汰）。还有个相关概念 <strong>OSR</strong>（Out-of-Sync Replicas，掉队副本）：
        全部副本 = ISR + OSR。一个副本在 ISR 和 OSR 之间反复横跳，往往是磁盘或网络出问题的信号，值得告警。
      </p>

      <h3>LEO 与 HW：消费者能读到哪</h3>
      <p>
        要理解同步，得认识两个位移：<em>LEO</em>（Log End Offset）是某个副本日志里下一条消息要写入的位置，也就是它当前的「末端」；
        <em>HW</em>（High Watermark，高水位）则是<strong>所有 ISR 副本都已经同步到的最小位置</strong>。
        关键规则是：<strong>消费者只能读到 HW 以下的消息</strong>。HW 之上、还没被所有 ISR 确认的消息，对消费者是不可见的。
      </p>
      <p>
        为什么要这条规则？因为 HW 之上的消息还没被足够副本复制，万一 Leader 此刻挂了、新 Leader 上没有这些消息，
        那消费者就读到了「后来又消失的消息」——这叫脏读，绝不能允许。用 HW 卡住可见性，保证了
        <strong>「消费者读到的一定是不会再丢的已提交消息」</strong>。这也是 acks=all 下「写成功」的真正含义：HW 推进到了这条消息。
      </p>

      <Example title="副本如何保证 Leader 挂了不丢">
        <p>
          假设分区 0 有 3 个副本，broker 1 是 Leader，broker 2、3 是 Follower，ISR = {'{'}1, 2, 3{'}'}。
          生产者用 <code>acks=all</code> 发来一条消息 M：
        </p>
        <ul>
          <li>Leader（broker 1）先把 M 写进自己的日志，LEO 前进一格；</li>
          <li>Follower 2、3 拉到 M，也各自写进日志、LEO 跟着前进；</li>
          <li>当 ISR 里所有副本都确认了 M，HW 才推进到 M，Leader 这时才回复生产者「写成功」；</li>
          <li>现在 broker 1 突然宕机。因为 M 已经在 broker 2、3 上各存了一份，Kafka 从 ISR 里挑一个（比如 broker 2）当新 Leader，M 一条没丢。</li>
        </ul>
        <p>
          反过来想：如果只有 Leader 写完就回复成功（<code>acks=1</code>），而 Follower 还没来得及同步 Leader 就挂了，那条消息就<strong>真的没了</strong>。
        </p>
      </Example>

      <Isr />

      <h3>Leader Epoch：修掉「单靠 HW」的截断 bug</h3>
      <p>
        早期 Kafka 仅用 HW 做副本一致性，在「Leader 切换 + 同时宕机重启」的边角场景下会出现<strong>日志错配</strong>：
        某个 Follower 按旧 HW 截断日志，却把本不该丢的消息丢了，或保留了本该丢的消息。
        为此引入了 <em>Leader Epoch</em>（Leader 任期）：每次选出新 Leader，epoch 号 +1，每条消息记录它所属的 epoch。
        副本恢复时不再盲目按 HW 截断，而是<strong>带着 epoch 去问 Leader「我这个任期的末尾在哪」</strong>，按 epoch 边界精确截断，
        彻底修掉了上述数据不一致。面试被追问「HW 机制的缺陷」，答案就是它，Leader Epoch 是补丁。
      </p>

      <KeyIdea title="只从 ISR 里选新 Leader">
        <p>
          Leader 挂掉后选谁当新 Leader 至关重要。默认情况下，Kafka <strong>只从 ISR 集合里挑</strong>——因为只有 ISR 里的副本数据是最新的。
          如果允许从 ISR 之外（数据落后的副本）选 Leader，那部分还没同步过去的消息就会丢失。
          这个开关叫 <code>unclean.leader.election.enable</code>：设为 <code>false</code>（生产推荐）意味着<strong>宁可分区暂时不可用，也不从落后副本选 Leader</strong>，
          用可用性换取「不丢数据」。这本质是 CAP 里偏向 CP 的取舍。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="acks=all 不等于一定不丢">
        <p>
          很多人以为生产者设了 <code>acks=all</code> 就高枕无忧，其实有个隐藏前提。<code>acks=all</code> 只是说「等 ISR 里所有副本都确认」，
          但如果此刻 ISR 被踢得只剩 Leader 一个呢？那 <code>acks=all</code> 就退化成了 <code>acks=1</code>，Leader 一挂照样丢。
        </p>
        <p>
          所以必须搭配 <code>min.insync.replicas</code>：它规定 ISR 里至少要有几个副本，否则生产者直接报错、拒绝写入。
          经典组合是 <code>replication.factor=3</code> + <code>min.insync.replicas=2</code> + <code>acks=all</code>：
          既能容忍一台 broker 宕机，又保证每条消息至少落在 2 个副本上。
        </p>
      </Callout>

      <h2>怎么监控副本健康</h2>
      <p>
        线上最该盯的副本指标是 <strong>UnderReplicatedPartitions</strong>（副本不足的分区数）和
        <strong>OfflinePartitionsCount</strong>（没有 Leader、彻底不可用的分区数）。前者长期非 0 说明有 broker 掉队或磁盘/网络异常，
        后者非 0 意味着已经在丢可用性了，必须立刻处理。再配合命令行的 <code>--under-replicated-partitions</code> 快速定位。
      </p>
      <CodeBlock lang="bash" title="replica-health.sh" code={underReplicatedCode} />

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「Kafka 怎么保证 Leader 挂了不丢数据」，按这条线说就稳了：
        <strong>多副本</strong>（replication.factor≥3）保证数据有备份 → <strong>ISR</strong> 保证备份是最新的 →
        <strong>acks=all + min.insync.replicas≥2</strong> 保证写入时至少落到多个 ISR 副本 →
        <strong>unclean.leader.election.enable=false</strong> 保证只从 ISR 选新 Leader →
        <strong>Leader Epoch</strong> 修掉单靠 HW 的截断不一致。环环相扣，缺一个都有丢数据的口子。
      </p>

      <Practice title="动手看一眼分区副本与 ISR">
        <p>
          用 <code>kafka-topics.sh --describe</code> 把某个 topic 的副本分布和 ISR 打出来，
          重点看 <code>Leader</code>、<code>Replicas</code>、<code>Isr</code> 三列的差异。
        </p>
        <CodeBlock lang="bash" title="describe.sh" code={describeCode} />
        <p>
          如果你能搭起一个 3 节点集群，试试把 Leader 所在的 broker 停掉，再 <code>--describe</code> 一次，
          会看到 Leader 切换到了另一台、<code>Isr</code> 列也少了一个成员——这就是故障转移的实况。
        </p>
        <p>下面是保证「不丢」的一套推荐配置，可以对照自己环境检查：</p>
        <CodeBlock lang="properties" title="safe-config.properties" code={safeConfigCode} />
      </Practice>

      <Summary
        points={[
          'replication.factor 决定每个分区有几份副本；其中一份是 Leader 负责所有读写，其余 Follower 只同步、不对外读（避免读到旧数据）。',
          '副本机架感知分配可抵御整机架故障；ISR 是与 Leader 同步的副本集合，按 replica.lag.time.max.ms 时间判定，掉队进 OSR。',
          'LEO 是副本日志末端，HW 是所有 ISR 都同步到的最小位置；消费者只能读到 HW 以下，避免脏读。',
          'Leader Epoch 给每个 Leader 任期编号，修掉了早期仅靠 HW 截断导致的副本日志不一致。',
          '默认只从 ISR 里选新 Leader，unclean.leader.election.enable=false 用可用性换不丢数据（偏 CP）。',
          'acks=all 必须配 min.insync.replicas，否则 ISR 缩到只剩 Leader 时退化成 acks=1。',
          '经典不丢组合：replication.factor=3 + min.insync.replicas=2 + acks=all + 禁用 unclean 选举；监控 UnderReplicated/Offline 分区数。',
        ]}
      />
    </>
  )
}

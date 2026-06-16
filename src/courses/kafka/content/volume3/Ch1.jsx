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

      <h3>ISR：哪些副本「跟得上」</h3>
      <p>
        但 Follower 不一定都跟得上。有的 Follower 因为网络慢、机器卡，落后 Leader 一大截。
        Kafka 把那些<strong>与 Leader 保持同步</strong>的副本（包括 Leader 自己）归为一个集合，叫 <em>ISR</em>（In-Sync Replicas，同步副本集合）。
        判定标准是 <code>replica.lag.time.max.ms</code>：一个 Follower 只要在这个时间内还在持续追赶 Leader，就算「在 ISR 里」；
        长时间拉不动，就会被踢出 ISR，等它追上来了再重新加回。
      </p>

      <h3>LEO 与 HW：消费者能读到哪</h3>
      <p>
        要理解同步，得认识两个位移：<em>LEO</em>（Log End Offset）是某个副本日志里下一条消息要写入的位置，也就是它当前的「末端」；
        <em>HW</em>（High Watermark，高水位）则是<strong>所有 ISR 副本都已经同步到的最小位置</strong>。
        关键规则是：<strong>消费者只能读到 HW 以下的消息</strong>。HW 之上、还没被所有 ISR 确认的消息，对消费者是不可见的。
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

      <KeyIdea title="只从 ISR 里选新 Leader">
        <p>
          Leader 挂掉后选谁当新 Leader 至关重要。默认情况下，Kafka <strong>只从 ISR 集合里挑</strong>——因为只有 ISR 里的副本数据是最新的。
          如果允许从 ISR 之外（数据落后的副本）选 Leader，那部分还没同步过去的消息就会丢失。
          这个开关叫 <code>unclean.leader.election.enable</code>：设为 <code>false</code>（生产推荐）意味着<strong>宁可分区暂时不可用，也不从落后副本选 Leader</strong>，
          用可用性换取「不丢数据」。
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

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「Kafka 怎么保证 Leader 挂了不丢数据」，按这条线说就稳了：
        <strong>多副本</strong>（replication.factor≥3）保证数据有备份 → <strong>ISR</strong> 保证备份是最新的 →
        <strong>acks=all + min.insync.replicas≥2</strong> 保证写入时至少落到多个 ISR 副本 →
        <strong>unclean.leader.election.enable=false</strong> 保证只从 ISR 选新 Leader。
        四个点环环相扣，缺一个都有丢数据的口子。
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
          'replication.factor 决定每个分区有几份副本；其中一份是 Leader，负责所有读写，其余是 Follower，只负责同步。',
          'ISR 是与 Leader 保持同步的副本集合，靠 replica.lag.time.max.ms 判定，落后太多的副本会被踢出。',
          'LEO 是副本日志末端，HW 是所有 ISR 副本都同步到的最小位置；消费者只能读到 HW 以下的消息。',
          '默认只从 ISR 里选新 Leader，unclean.leader.election.enable=false 用可用性换取不丢数据。',
          'acks=all 必须配合 min.insync.replicas，否则 ISR 缩到只剩 Leader 时会退化成 acks=1。',
          '经典不丢组合：replication.factor=3 + min.insync.replicas=2 + acks=all + 禁用 unclean 选举。',
        ]}
      />
    </>
  )
}

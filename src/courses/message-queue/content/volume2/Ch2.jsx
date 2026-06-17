import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const controllerSnippet = `控制器（Controller）是集群里一个特殊的 Broker，负责管理元数据与协调：

  职责：
   - 监听 Broker 上下线（节点挂了，触发分区 leader 重新选举）
   - 管理分区与副本的分配
   - 处理 Topic 创建/删除、分区扩容
   - 把最新元数据下发给所有 Broker

  旧架构（ZK 时代）：Controller 通过 ZooKeeper 的 watch 感知变化，
                     再把变更广播给其他 Broker。`

const kraftSnippet = `KRaft（Kafka Raft）模式：抛弃 ZooKeeper，元数据自管理

  旧：[Broker 集群] <--watch--> [ZooKeeper 集群]   两套系统、两套运维
  新:  [Controller Quorum (Raft)]  <-- 元数据存成一个内部日志 topic
       \\__ 元数据变更像普通消息一样写进 __cluster_metadata，副本间用 Raft 复制

  好处：单一系统、元数据扩展性强、故障恢复快、运维简化`

const txnSnippet = `// Kafka 事务消息：保证「消费-处理-生产」原子
producer.initTransactions();
try {
    producer.beginTransaction();
    // 1. 处理并写出结果消息
    producer.send(resultRecord);
    // 2. 把消费位点也作为事务的一部分提交
    producer.sendOffsetsToTransaction(offsets, groupMetadata);
    producer.commitTransaction();   // 要么全部生效
} catch (Exception e) {
    producer.abortTransaction();    // 要么全部回滚
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        这一章深入 Kafka 的<strong>控制面</strong>：集群是怎么被「指挥」的。
        我们讲清控制器（Controller）如何处理集群事件、ZooKeeper 在老架构里扮演什么角色、
        Kafka 为什么下决心抛弃 ZooKeeper 转向自管理的 KRaft，最后讲 Kafka 的事务消息与「精确一次」是如何落地的。
        这些是 Kafka 从「能用」到「懂原理」的进阶考点。
      </Lead>

      <h2>一、控制器：集群的大脑</h2>
      <p>
        Kafka 集群有很多 Broker，但其中<strong>有且只有一个</strong>会被选为<strong>控制器（Controller）</strong>。
        它是集群的「大脑」，负责所有需要全局协调的事，普通 Broker 只管自己分区的读写。
      </p>
      <CodeBlock lang="text" title="控制器的职责" code={controllerSnippet} />
      <KeyIdea>
        控制器把「集群级的协调」从普通 Broker 中剥离出来集中处理：监听节点上下线、为失去 leader 的分区<strong>重新选举 leader</strong>、
        管理副本分配、处理 Topic 增删、并把最新元数据下发给全集群。它是 Kafka 高可用与自愈能力的核心。
      </KeyIdea>

      <h3>控制器处理事件的全流程（以 Broker 宕机为例）</h3>
      <ol>
        <li><strong>感知</strong>：某 Broker 宕机，控制器感知到节点下线（旧架构经 ZK 的 watch，新架构经元数据日志）。</li>
        <li><strong>找受影响分区</strong>：列出所有 leader 在该宕机节点上的分区——它们现在群龙无首。</li>
        <li><strong>选新 leader</strong>：从每个受影响分区的 <strong>ISR（同步副本集合）</strong>里挑一个作为新 leader（优先 ISR 保证不丢数据）。</li>
        <li><strong>更新并下发元数据</strong>：把新的 leader 信息写入元数据，通知相关 Broker 与客户端「以后找新 leader 读写」。</li>
        <li><strong>客户端切换</strong>：生产者/消费者刷新元数据后，请求自动转向新 leader，对外尽量无感。</li>
      </ol>

      <h2>二、ZooKeeper 在老架构里的作用</h2>
      <p>
        在 KRaft 之前，Kafka 重度依赖 ZooKeeper。它主要负责：
      </p>
      <table>
        <thead>
          <tr><th>用途</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>Broker 注册与存活</td><td>Broker 启动在 ZK 注册临时节点，掉线节点消失，集群据此感知上下线。</td></tr>
          <tr><td>控制器选举</td><td>多个 Broker 抢着在 ZK 创建同一个临时节点，谁创建成功谁当控制器。</td></tr>
          <tr><td>元数据存储</td><td>Topic、分区、副本分配、配置等集群元数据存在 ZK。</td></tr>
          <tr><td>ISR 与 leader 信息</td><td>分区的 leader、ISR 等状态变更通过 ZK 协调与通知。</td></tr>
        </tbody>
      </table>

      <h2>三、为什么抛弃 ZooKeeper：KRaft</h2>
      <p>
        ZooKeeper 用了多年，但它带来的问题越来越突出，于是社区推出 <strong>KRaft（Kafka Raft）</strong> 模式，
        让 Kafka <strong>自己管理元数据，彻底去掉 ZooKeeper</strong>。
      </p>
      <CodeBlock lang="text" title="KRaft：元数据自管理，去掉 ZooKeeper" code={kraftSnippet} />
      <p>抛弃 ZK 的核心动机：</p>
      <ul>
        <li><strong>两套系统、运维复杂</strong>：要同时维护 Kafka 和 ZK 两个分布式系统，部署、监控、调优都翻倍。</li>
        <li><strong>元数据扩展性瓶颈</strong>：分区数极多时，ZK 上的元数据量和 watch 通知成为瓶颈，限制了集群规模。</li>
        <li><strong>故障恢复慢</strong>：控制器重启时要从 ZK 全量加载元数据，集群越大恢复越慢。</li>
        <li><strong>数据一致性边界模糊</strong>：Kafka 状态和 ZK 状态分属两套，存在不一致风险。</li>
      </ul>
      <p>
        KRaft 把元数据本身存成一个<strong>内部的元数据日志 topic（__cluster_metadata）</strong>，
        由一组<strong>控制器节点组成 Raft Quorum</strong>来复制和达成共识。元数据变更就像普通消息一样追加到这个日志里。
        这样：单一系统、元数据可像数据一样水平扩展、故障恢复只需回放日志（快得多）。
      </p>
      <Callout variant="note" title="KRaft 的演进时间线">
        KRaft 在 Kafka 2.8 作为实验特性引入，3.3 起生产可用，到 <strong>Kafka 4.0（2025 年）正式移除了对 ZooKeeper 的支持</strong>，
        新集群默认且只能用 KRaft。所以「Kafka 还依赖 ZooKeeper 吗」的标准答案，2026 年应是「新版已不再依赖，转用 KRaft」。
      </Callout>

      <h2>四、Kafka 事务消息与精确一次</h2>
      <p>
        Kafka 的事务能力是为<strong>流处理</strong>（consume-transform-produce：消费一批、处理、再生产结果）设计的，
        目标是让「消费位点提交」和「结果消息生产」<strong>要么全成功、要么全失败</strong>，从而实现端到端的精确一次。
      </p>
      <p>它建立在两块基础上：</p>
      <ul>
        <li><strong>幂等生产者</strong>：每个生产者有唯一 PID，每条消息带序列号，Broker 据此<strong>对重试导致的重复消息去重</strong>，
          保证单分区内消息不因重试而重复。开启很简单：<code>enable.idempotence=true</code>。</li>
        <li><strong>事务</strong>：给生产者配 <code>transactional.id</code>，用 <code>beginTransaction</code> / <code>commitTransaction</code>
          把多条消息发送和位点提交绑成一个原子单元。事务由<strong>事务协调器（Transaction Coordinator）</strong>管理，
          通过两阶段提交把事务标记写入日志。</li>
      </ul>
      <CodeBlock lang="java" title="Kafka 事务：消费-处理-生产原子提交" code={txnSnippet} />
      <Callout variant="warn" title="精确一次的边界">
        Kafka 的 exactly-once 只在 <strong>Kafka 内部的读-处理-写闭环</strong>里成立（配合事务 + 读已提交隔离级别）。
        一旦你的消费逻辑要把结果写到<strong>外部数据库</strong>，Kafka 的事务就管不到那一步了，仍需业务侧用唯一键做幂等。
        面试时点出这个边界，比笼统说「Kafka 支持精确一次」更显功底。
      </Callout>

      <h2>五、面试精讲</h2>

      <h3>Q1：Kafka 控制器是干什么的？Broker 挂了它怎么处理？</h3>
      <p>
        <strong>原创讲解。</strong>控制器是集群里被选出的<strong>唯一一个</strong>负责全局协调的 Broker，
        管 Broker 上下线、分区 leader 选举、副本分配、Topic 增删、元数据下发。
      </p>
      <p>Broker 挂了的处理流程：感知节点下线 → 找出 leader 在该节点上的分区 → 从各分区 ISR 里选新 leader → 更新并下发元数据 → 客户端刷新后转向新 leader。
        关键点是<strong>「从 ISR 选 leader」</strong>——只在同步副本里选，保证新 leader 数据不落后，不丢已确认消息。</p>
      <p>
        <strong>面试追问：</strong>「能从非 ISR 选 leader 吗？」——可以，靠 <code>unclean.leader.election</code>。
        允许（true）则 leader 全挂时能从落后副本里强选一个，保住可用性但<strong>可能丢数据</strong>；
        禁止（false，推荐）则宁可分区暂不可用也不丢数据。这是 CAP 里可用性与一致性的取舍。
      </p>

      <h3>Q2：Kafka 为什么要抛弃 ZooKeeper？</h3>
      <p>
        <strong>原创讲解。</strong>四个核心原因：① 维护 Kafka + ZK <strong>两套分布式系统运维复杂</strong>；
        ② 分区极多时 ZK 元数据与 watch 成为<strong>扩展性瓶颈</strong>；③ 控制器重启要从 ZK 全量加载元数据，
        大集群<strong>故障恢复慢</strong>；④ Kafka 与 ZK 两套状态存在<strong>一致性风险</strong>。
      </p>
      <p>
        KRaft 的思路是<strong>「把元数据当数据」</strong>：元数据存成内部日志 topic，由控制器组成的 Raft Quorum 复制达成共识。
        于是只剩一套系统、元数据可水平扩展、恢复靠回放日志更快。Kafka 4.0 已正式移除 ZK 支持。
      </p>
      <p>
        <strong>面试追问：</strong>「KRaft 用的什么共识协议？」——Raft（Kafka 自实现的变体），
        控制器节点是 Raft 的成员，元数据日志通过 Raft 在它们之间复制并选主。
      </p>

      <h3>Q3：Kafka 的事务消息怎么实现？真能精确一次吗？</h3>
      <p>
        <strong>原创讲解。</strong>分两层：<strong>幂等生产者</strong>（PID + 序列号，Broker 去重，防重试重复）解决「单分区不重复」；
        <strong>事务</strong>（transactional.id + 事务协调器 + 两阶段提交）把「多分区消息发送 + 消费位点提交」绑成原子，
        消费端配 <code>read_committed</code> 只读已提交事务的消息。
      </p>
      <table>
        <thead>
          <tr><th>机制</th><th>解决什么</th></tr>
        </thead>
        <tbody>
          <tr><td>幂等生产者</td><td>生产重试导致的单分区重复</td></tr>
          <tr><td>事务 + 协调器</td><td>多分区写 + 位点提交的原子性</td></tr>
          <tr><td>read_committed</td><td>消费端只看已提交事务的消息，看不到回滚的</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「那写到 MySQL 还能精确一次吗？」——不能由 Kafka 保证。
        Kafka 的 exactly-once 只覆盖 Kafka 内部读-处理-写闭环，写外部系统要靠业务唯一键幂等兜底。务必点清这个边界。
      </p>

      <h3>Q4：什么是 ISR？它和 acks、HW 是怎么协作保证不丢的？</h3>
      <p>
        <strong>原创讲解。</strong>这三个概念是 Kafka 可靠性的核心三角，能讲清它们的协作就说明真懂 Kafka 复制了。
      </p>
      <ul>
        <li><strong>ISR（In-Sync Replicas，同步副本集合）</strong>：与 leader 保持同步（在允许的滞后范围内）的副本集合。
          只有 ISR 里的副本才有资格在 leader 挂掉时被选为新 leader——这保证新 leader 的数据不落后，不丢已确认消息。
          落后太多的副本会被踢出 ISR，追上后再加回。</li>
        <li><strong>acks</strong>：生产者要求的确认强度。<code>acks=all</code> 时，消息要被<strong>所有 ISR 副本</strong>都接收才算成功，
          配合 <code>min.insync.replicas</code>（ISR 最小数量）可要求至少几个副本在线才允许写入。</li>
        <li><strong>HW（High Watermark，高水位）</strong>：标记「所有 ISR 副本都已同步到的位置」。
          <strong>消费者只能消费 HW 以下的消息</strong>——因为 HW 以下的消息才在多个副本上都有，即使 leader 挂了也不会丢。</li>
      </ul>
      <table>
        <thead>
          <tr><th>概念</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td>ISR</td><td>限定「谁能当新 leader」「acks=all 等谁确认」，保证选主不丢数据</td></tr>
          <tr><td>acks=all + min.insync.replicas</td><td>写入要够多 ISR 确认，否则拒绝写，防「写了却没冗余」</td></tr>
          <tr><td>HW 高水位</td><td>消费者只看已被全 ISR 复制的消息，保证读到的都是「不会丢的」</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「<code>min.insync.replicas</code> 设大了有什么风险？」——设得越大越可靠，但<strong>可用性越低</strong>：
        若在线 ISR 数不足这个值，写入会直接被拒绝（抛 <code>NotEnoughReplicas</code>）。所以它是「可靠性 vs 可用性」的旋钮，
        常见组合是副本 3、<code>min.insync.replicas=2</code>、<code>acks=all</code>——允许挂一个副本仍可写，又保证至少两份冗余。
      </p>

      <Summary
        points={[
          '控制器是集群唯一的全局协调者：管 Broker 上下线、分区 leader 选举、副本分配、Topic 增删、元数据下发，是高可用与自愈的核心。',
          'Broker 挂了的流程：感知下线→找受影响分区→从 ISR 选新 leader→更新下发元数据→客户端转向新 leader；从 ISR 选保证不丢已确认数据。',
          '老架构里 ZooKeeper 负责 Broker 注册存活、控制器选举、元数据存储、ISR/leader 协调。',
          '抛弃 ZK 因运维复杂、扩展瓶颈、恢复慢、一致性风险；KRaft 把元数据存成内部日志、由控制器 Raft Quorum 复制，Kafka 4.0 已正式移除 ZK。',
          '事务消息靠幂等生产者（PID+序列号去重）+ 事务（transactional.id+协调器+两阶段提交）+ read_committed，实现「消费-处理-生产」原子。',
          '精确一次只在 Kafka 内部读-处理-写闭环成立，写外部数据库仍需业务幂等兜底——这是必须点清的边界。',
        ]}
      />
    </article>
  )
}

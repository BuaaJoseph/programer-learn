import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import HaCluster from '@/courses/rabbitmq/illustrations/HaCluster.jsx'

const quorumCode = `import pika

conn = pika.BlockingConnection(pika.ConnectionParameters('node1'))
ch = conn.channel()

# 声明一个 quorum 队列：靠 x-queue-type 参数指定
# quorum 队列天然是多副本、持久化的，不需要再单独配镜像策略
ch.queue_declare(
    queue='order',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',         # 关键：队列类型 = quorum
        'x-quorum-initial-group-size': 3, # 初始副本数，建议奇数 3 或 5
    },
)`

const cliCode = `# 命令行声明（rabbitmqadmin）
rabbitmqadmin declare queue name=order durable=true \\
  arguments='{"x-queue-type":"quorum"}'

# 查看队列类型与各副本所在节点
rabbitmqctl list_queues name type members

# 配置分区处理策略（broker 配置文件 rabbitmq.conf）
# 少数派节点在网络分区时自动暂停，避免脑裂
cluster_partition_handling = pause_minority`

const poisonCode = `# quorum 队列内建毒消息处理：x-delivery-limit 限制重投次数
# 超过次数自动投到死信队列，避免一条坏消息把 leader 拖垮
ch.queue_declare(
    queue='order',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-delivery-limit': 5,                    # 最多重投 5 次
        'x-dead-letter-exchange': 'dlx.exchange', # 超限后进死信
    },
)
# 镜像队列没有这个能力，毒消息只能靠业务自己数次数`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          单台 RabbitMQ 挂了，队列里的消息会不会丢、还能不能继续收发？这就是高可用要解决的问题。
          RabbitMQ 先后给出过三套答案：普通集群、<em>Mirrored Queue</em>（镜像队列）和
          <em>Quorum Queue</em>（仲裁队列）。这一章把它们的原理、代价和取舍讲透，
          顺带说清楚网络分区下的<strong>脑裂</strong>该怎么防。
        </p>
      </Lead>

      <h2>普通集群：元数据共享，但队列数据是单点</h2>
      <p>
        很多人以为「组了集群就高可用了」，这是最大的误区。RabbitMQ 的普通集群里，交换机、绑定关系、用户权限这些
        <strong>元数据</strong>会在所有节点间同步，但<strong>队列里的实际消息数据，只存在它被创建的那一个节点上</strong>，
        其它节点只保存「这个队列在某某节点」的指针。
      </p>
      <p>
        后果是：你连到节点 B 去消费一个在节点 A 上的队列，B 只是把请求转发给 A。
        一旦 <strong>A 宕机</strong>，这个队列就彻底不可用，里面的消息也读不到了——这就是赤裸裸的<em>单点风险</em>。
        所以普通集群解决的是「连接和吞吐的横向扩展」，并不解决数据高可用。
      </p>
      <p>
        补一点集群基础：节点分<strong>磁盘节点</strong>（disc，元数据落盘）和<strong>内存节点</strong>（ram，元数据只在内存）。
        集群至少要有一个磁盘节点，否则全部重启后元数据全丢。生产建议磁盘节点占多数，内存节点只用于提速元数据操作。
        节点间靠 Erlang 的 <code>.erlang.cookie</code> 互信，cookie 不一致是组集群最常见的报错原因。
      </p>

      <Example title="节点宕机后队列还能不能用">
        <p>三节点集群 node1 / node2 / node3，队列 order 创建在 node1 上：</p>
        <ul>
          <li>
            <strong>普通队列</strong>：node1 宕机 → order 直接不可用，未消费的消息要等 node1 恢复才能拿回，
            若 node1 磁盘损坏则<strong>永久丢失</strong>。
          </li>
          <li>
            <strong>镜像 / Quorum 队列</strong>：消息在 node1 / node2 / node3 都有副本，node1 宕机 →
            集群自动从剩余节点里<strong>选出新主</strong>，order 继续可读可写，业务几乎无感。
          </li>
        </ul>
      </Example>

      <HaCluster />

      <h2>镜像队列 Mirrored Queue：能 HA，但代价大、已过时</h2>
      <p>
        镜像队列是 RabbitMQ 早期的高可用方案：通过一条 policy 让某个队列在多个节点上各保留一份
        <strong>镜像副本</strong>。其中一个是 <em>master</em>（主），其余是 <em>mirror</em>（从）。
        所有读写都先到 master，再由 master 把操作同步给各个 mirror；master 所在节点挂了，就从 mirror 里提升一个当新 master。
      </p>
      <p>
        它确实能做到队列数据多节点冗余，但问题不少：每次写都要等所有 mirror 同步，<strong>同步开销大、吞吐受限</strong>；
        在网络分区或节点频繁抖动时，同步逻辑容易出现消息丢失或重复；新增节点要做全量同步会卡顿。
        正因如此，RabbitMQ 官方从 3.8 起力推 Quorum Queue，并在<strong>新版本中已弃用镜像队列</strong>，不建议新项目再用。
      </p>
      <p>
        一个易被追问的细节：镜像队列用 <code>ha-mode</code> policy 配置同步范围（<code>all</code> 全节点、
        <code>exactly</code> 指定个数、<code>nodes</code> 指定节点），还有 <code>ha-sync-mode</code> 决定新 mirror
        是自动还是手动全量同步。自动同步会在同步期间<strong>阻塞队列</strong>，大队列同步可能卡几十秒，这是它的硬伤之一。
      </p>

      <h2>Quorum Queue：基于 Raft 的多副本，新版首选</h2>
      <p>
        Quorum Queue 是新一代高可用队列，底层用的是 <em>Raft</em> 共识算法（和 etcd、Consul 同源）。
        队列数据被复制到一组节点（通常 3 或 5 个，建议奇数），其中一个是 leader，其余是 follower。
      </p>
      <ul>
        <li>
          <strong>过半确认才算成功</strong>：一条消息写入时，必须被<strong>多数派</strong>（quorum，N 个节点里的
          (N/2)+1 个）确认，才回复生产者成功。3 副本就是至少 2 个节点落盘，因此挂掉 1 个节点数据依然安全。
        </li>
        <li>
          <strong>自动选主</strong>：leader 节点宕机后，Raft 会在剩余 follower 里自动选出新 leader，
          全程无需人工干预，队列继续服务。
        </li>
        <li>
          <strong>数据更安全、行为更可预测</strong>：相比镜像队列，Quorum 在分区和节点恢复时有严格的一致性保证，
          不会出现镜像队列那种「同步窗口丢消息」的灰色地带。
        </li>
        <li>
          <strong>内建毒消息处理</strong>：支持 <code>x-delivery-limit</code> 限制重投次数，超限自动进死信，
          这是镜像队列没有的能力。
        </li>
      </ul>
      <CodeBlock lang="python" title="quorum 队列的毒消息保护" code={poisonCode} />
      <p>
        也要清楚它的<strong>代价与限制</strong>：每条消息要过半节点落盘，写延迟比单点高；副本越多写越慢（一般不超过 5）；
        quorum 队列<strong>不支持非持久化、不支持优先级队列、不支持惰性以外的内存优化</strong>，
        全程持久化导致内存/磁盘占用更高。所以它适合「要可靠」的核心队列，不适合海量临时性消息。

      </p>

      <KeyIdea title="为什么是「过半」而不是「全部」">
        <p>
          要求<strong>全部</strong>副本确认，只要挂一个节点就再也写不进去，可用性极差；只要<strong>一个</strong>确认，
          又可能在切主时丢数据。<em>quorum</em>（过半）是一个巧妙的中间点：
          只要多数派活着就能继续读写，而<strong>任何两个多数派必然有交集</strong>，
          这就保证了新选出的 leader 一定包含已提交的最新数据，既高可用又不丢数据。这正是 Raft 的精髓。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="脑裂与网络分区：pause_minority">
        <p>
          集群被网络切成两半（<em>network partition</em>）时，如果两边都以为自己是「主」继续接收写入，
          恢复后数据就冲突了，这叫<strong>脑裂</strong>（split-brain）。RabbitMQ 的应对是配置
          <code>cluster_partition_handling = pause_minority</code>：发生分区时，
          <strong>处于少数派的那一侧节点自动暂停服务</strong>，只让拥有多数派的一侧继续工作，
          从根本上杜绝两边同时写。这也是 Quorum Queue 必须用奇数副本的原因——保证任何时候都能分出唯一的多数派。
        </p>
        <p>
          除 pause_minority 外还有两种策略：<code>ignore</code>（不处理，自己承担脑裂风险，仅适合稳定内网）和
          <code>autoheal</code>（恢复后自动选一边为准、丢弃另一边，可能丢数据）。生产环境最稳的是 pause_minority。
        </p>
      </Callout>

      <h2>三种方案对比</h2>
      <table>
        <thead>
          <tr><th>方案</th><th>数据副本</th><th>一致性</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td>普通集群</td><td>单点（无副本）</td><td>无 HA</td><td>仅横向扩展</td></tr>
          <tr><td>镜像队列</td><td>主从镜像</td><td>弱，有丢消息窗口</td><td>已弃用</td></tr>
          <tr><td>Quorum 队列</td><td>Raft 多副本</td><td>强，过半提交</td><td>新版首选</td></tr>
        </tbody>
      </table>

      <h2>实战 / 面试怎么答</h2>
      <p>被问「RabbitMQ 怎么做高可用」，按演进脉络答最清晰：</p>
      <ul>
        <li>
          普通集群只同步元数据、队列数据单点，<strong>不算高可用</strong>，只解决横向扩展；
        </li>
        <li>
          镜像队列是老方案，多副本主从同步，<strong>开销大、新版已弃用</strong>，了解即可；
        </li>
        <li>
          生产新项目<strong>首选 Quorum Queue</strong>：基于 Raft、过半确认、自动选主、数据安全；
        </li>
        <li>
          配套用 <code>pause_minority</code> 防脑裂，副本数取<strong>奇数</strong>（3 或 5）。
        </li>
      </ul>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：quorum 队列能保证消息绝对不丢吗？</strong> 在「过半节点不同时永久损坏」的前提下不丢。
            若 3 副本里 2 个磁盘同时炸了，仍会丢——任何方案都有极限，多副本只是把概率降到可接受。
          </li>
          <li>
            <strong>追问：客户端怎么知道连哪个节点？</strong> 一般在客户端配置多个节点地址做故障转移，
            或前面挂一层负载均衡（HAProxy）；连任意节点都能访问到队列，leader 切换对客户端透明。
          </li>
          <li>
            <strong>误区：以为 quorum 队列吞吐一定比镜像高。</strong> quorum 在可靠性和恢复行为上更优，
            但因全程持久化 + 过半落盘，纯吞吐未必更高；它换来的是「确定性」而非「极致性能」。
          </li>
        </ul>
      </Callout>

      <Practice title="声明一个 Quorum 队列并验证容灾">
        <p>
          声明 quorum 队列的关键，是在 <code>queue.declare</code> 时传入 <code>x-queue-type=quorum</code> 参数：
        </p>
        <CodeBlock lang="python" title="declare_quorum.py" code={quorumCode} />
        <p>命令行声明、查看副本分布、以及配置分区处理策略：</p>
        <CodeBlock lang="bash" title="quorum_ops.sh" code={cliCode} />
        <p>
          验证：用 <code>rabbitmqctl stop_app</code> 停掉当前 leader 所在节点，再去管理台看队列——
          它会自动切到新 leader 继续可读可写，未消费的消息一条不少，这就是 Quorum Queue 的高可用效果。
          再试着连续停掉两个节点（3 副本只剩 1），观察队列变为不可写——亲眼看到「失去多数派就停写」的保护。
        </p>
      </Practice>

      <Summary
        points={[
          '普通集群只同步元数据，队列消息只存在创建它的那个节点上，该节点宕机队列即不可用，是单点风险，不等于高可用。',
          '集群节点分磁盘/内存节点，至少一个磁盘节点；节点靠 Erlang cookie 互信，cookie 不一致是组集群最常见报错。',
          '镜像队列多节点主从镜像，但同步开销大、有丢消息窗口、大队列同步会阻塞，新版本已弃用。',
          'Quorum Queue 基于 Raft：多副本、写入需过半确认、leader 宕机自动选主，内建 x-delivery-limit 毒消息保护，新版推荐。',
          '过半确认在可用性与一致性间平衡：多数派存活即可服务，任意两多数派必有交集，保证新 leader 含最新已提交数据。',
          'quorum 队列代价是全程持久化、写延迟高、不支持非持久化/优先级，适合核心可靠队列而非海量临时消息。',
          '网络分区用 cluster_partition_handling=pause_minority 让少数派暂停防脑裂；副本数取奇数（3 或 5）。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const archSnippet = `RocketMQ 四大角色：

  NameServer（无状态注册中心，多个互不通信）
       ^  路由注册/心跳            ^ 拉路由
       |                          |
  Broker（存消息，主从）      Producer / Consumer
       \\__ 定时上报 Topic 路由给所有 NameServer
       Producer/Consumer 启动时从 NameServer 拉到 Broker 地址，再直连 Broker 收发`

const storeSnippet = `RocketMQ 存储结构（与 Kafka 最大的不同：所有消息混写一个 CommitLog）：

  CommitLog       <- 所有 Topic 所有队列的消息，统一顺序追加到这里（只此一份）
       |
       +--> ConsumeQueue（逻辑队列索引）：记录每条消息在 CommitLog 的物理偏移
       |        topic-A/queue-0 -> [offset1, offset2, ...]
       |
       +--> IndexFile（按 key/时间的哈希索引，支持按 msgKey 查消息）

写：所有消息顺序写一个 CommitLog（顺序写，极快）
读：消费者按 ConsumeQueue 找到物理 offset，再去 CommitLog 取消息体`

const sendSnippet = `// 同步发送：等 Broker 返回结果，可靠，适合重要消息
SendResult result = producer.send(msg);          // 阻塞等结果

// 异步发送：回调拿结果，不阻塞，吞吐高
producer.send(msg, new SendCallback() {
    public void onSuccess(SendResult r) { /* 成功 */ }
    public void onException(Throwable e) { /* 失败重试/兜底 */ }
});

// 单向发送：发完不管结果，最快但可能丢，适合日志类
producer.sendOneway(msg);`

export default function Ch1() {
  return (
    <article>
      <Lead>
        RocketMQ 是阿里巴巴开源、后捐献给 Apache 的消息中间件，在国内电商、金融场景应用极广。
        它在设计上<strong>借鉴了 Kafka 的高吞吐思路，又针对业务消息做了大量增强</strong>（事务消息、延迟消息、顺序消息、消息过滤等）。
        这一章讲它的整体架构与一个关键抉择——<strong>为什么不用 ZooKeeper 而自研 NameServer</strong>，
        以及生产消费原理、Topic 与 Tag、发送方式、主从架构和它独特的 CommitLog 存储机制。
      </Lead>

      <h2>一、RocketMQ 是什么、用在哪</h2>
      <p>
        RocketMQ 定位是<strong>面向业务的高可靠消息中间件</strong>。相比 Kafka 偏日志流、RabbitMQ 偏灵活路由，
        RocketMQ 在「<strong>金融级可靠 + 丰富的业务特性</strong>」上取了平衡：它既有接近 Kafka 的吞吐（百万级），
        又原生支持事务消息、延迟消息、顺序消息、消息过滤、消息轨迹等业务场景刚需的能力。
        典型用在<strong>电商交易、订单、支付、削峰、分布式事务最终一致</strong>等对可靠性要求高的链路。
      </p>

      <h2>二、整体架构：四大角色</h2>
      <p>
        RocketMQ 有四个核心角色：<strong>NameServer</strong>（路由注册中心）、<strong>Broker</strong>（消息存储）、
        <strong>Producer</strong>（生产者）、<strong>Consumer</strong>（消费者）。
      </p>
      <CodeBlock lang="text" title="RocketMQ 四大角色与路由发现" code={archSnippet} />

      <h2>三、为什么自研 NameServer 而不用 ZooKeeper</h2>
      <p>
        RocketMQ 没有沿用 Kafka 当年的 ZooKeeper 方案，而是自研了一个极轻量的 <strong>NameServer</strong> 做服务发现。原因是 ZooKeeper 对它来说<strong>「太重了」</strong>。
      </p>
      <KeyIdea>
        RocketMQ 的服务发现只需要一个<strong>简单的路由表</strong>：哪个 Topic 在哪些 Broker 上、Broker 地址是什么。
        它不需要 ZooKeeper 的强一致选举、顺序节点、watch 等复杂能力。于是自研了 <strong>NameServer</strong>——
        一个<strong>无状态、节点间互不通信</strong>的轻量注册中心，简单、可靠、易运维。
      </KeyIdea>
      <p>NameServer 的设计要点：</p>
      <ul>
        <li><strong>无状态、节点互不通信</strong>：多个 NameServer 各自独立、不做数据同步。Broker 向<strong>每一个</strong> NameServer 都上报路由，
          所以每个 NameServer 都有全量路由，挂几个不影响（客户端换一个连即可）。</li>
        <li><strong>AP 而非 CP</strong>：放弃强一致，追求高可用与简单。短时间内各 NameServer 路由可能略有不一致，但对消息收发影响极小。</li>
        <li><strong>Broker 定时心跳上报</strong>：Broker 每隔 30 秒向所有 NameServer 上报自己负责的 Topic 路由；
          NameServer 超过 120 秒没收到心跳就剔除该 Broker。</li>
        <li><strong>客户端定时拉路由</strong>：Producer/Consumer 定时（默认 30 秒）从 NameServer 拉取 Topic 路由，缓存到本地，再直连 Broker 收发。</li>
      </ul>
      <Callout variant="note" title="对比 Kafka 的 ZK 之路">
        有意思的是：Kafka 后来也走上了「抛弃 ZooKeeper、自管理元数据（KRaft）」的路，
        本质动机和 RocketMQ 当初自研 NameServer 一致——<strong>消息系统的服务发现不需要 ZK 那么重</strong>，
        独立的轻量方案更好用。RocketMQ 算是更早看清了这一点。
      </Callout>

      <h2>四、Producer 与 Consumer 工作原理</h2>
      <p>
        <strong>Producer</strong>：启动时从 NameServer 拉到目标 Topic 的路由（在哪些 Broker、哪些队列），
        发送时按负载均衡策略（默认轮询）选一个队列，把消息发给对应 Broker 的主节点。失败会自动重试（可换 Broker）。
      </p>
      <p>
        <strong>Consumer</strong>：同样先拉路由，然后从 Broker <strong>拉取（pull）</strong>消息。
        RocketMQ 对外暴露的 Push 模式其实底层也是<strong>「长轮询拉取」</strong>包装的——客户端发起拉请求，没消息时 Broker 挂起请求一会儿，有消息立即返回。
        消费进度（offset）由消费者维护并定期上报 Broker。
      </p>
      <CodeBlock lang="java" title="三种发送方式：同步/异步/单向" code={sendSnippet} />

      <h2>五、Topic 与 Tag 的区别</h2>
      <p>
        这是 RocketMQ 特有、也常考的概念分层：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Topic</th><th>Tag</th></tr>
        </thead>
        <tbody>
          <tr><td>粒度</td><td>一级分类（消息的大类）</td><td>二级分类（Topic 内的子类标签）</td></tr>
          <tr><td>示例</td><td>order_topic（订单消息）</td><td>create / pay / cancel（订单的子类型）</td></tr>
          <tr><td>路由</td><td>决定消息存到哪些 Broker/队列</td><td>不影响存储，用于消费端过滤</td></tr>
          <tr><td>建议</td><td>不同业务用不同 Topic</td><td>同一业务的不同子类型用 Tag 区分</td></tr>
        </tbody>
      </table>
      <p>
        消费者订阅时可以指定只消费某些 Tag（如 <code>order_topic</code> 里只要 <code>pay</code>），Broker 据 Tag 做<strong>消息过滤</strong>，
        只把匹配的消息投给消费者。这样既共用一个 Topic 减少资源，又能按子类型精准消费。
      </p>

      <h2>六、消费方式及场景</h2>
      <ul>
        <li><strong>集群消费（Clustering，默认）</strong>：同一消费组的消息被组内实例<strong>分摊消费</strong>（点对点），用于负载分担。</li>
        <li><strong>广播消费（Broadcasting）</strong>：消息被组内<strong>每个</strong>实例各消费一遍，用于「每台机器都要处理」的场景（如本地缓存刷新）。</li>
        <li><strong>并发消费 vs 顺序消费</strong>：并发消费多线程处理同一队列消息（快，不保序）；顺序消费单线程按队列顺序处理（保序，慢）。</li>
      </ul>

      <h2>七、主从架构</h2>
      <p>
        RocketMQ 的 Broker 是<strong>主从结构</strong>：Master 负责读写，Slave 从 Master 复制数据做备份与分担读。
        早期主从角色固定、主挂了不能自动切换（需人工或借助工具）；新版引入 <strong>DLedger（基于 Raft）</strong>
        实现主从自动选举切换，主挂了从节点能自动顶上，达到真正的高可用。
      </p>

      <h2>八、消息存储机制：CommitLog 与写入优化</h2>
      <p>
        RocketMQ 存储设计是它和 Kafka 最大的差异点，必须讲清。
      </p>
      <CodeBlock lang="text" title="CommitLog + ConsumeQueue + IndexFile 三层存储" code={storeSnippet} />
      <p>
        核心是<strong>「所有消息混写一个 CommitLog」</strong>：不管哪个 Topic、哪个队列，消息体都<strong>顺序追加到同一个 CommitLog 文件</strong>。
        这保证了<strong>极致的顺序写</strong>，吞吐高。但消费者要按队列读，所以另建<strong>ConsumeQueue</strong>作为逻辑队列索引——
        它只存「消息在 CommitLog 里的物理偏移、大小、Tag 哈希」，消费时先读 ConsumeQueue 拿到偏移，再去 CommitLog 取消息体。
        此外 <strong>IndexFile</strong> 提供按 msgKey/时间的哈希索引，支持精确查某条消息。
      </p>
      <KeyIdea>
        Kafka：每个分区一个独立日志文件（分区多则文件多，随机写倾向）。
        RocketMQ：<strong>全局一个 CommitLog 顺序写</strong> + ConsumeQueue 逻辑索引。
        RocketMQ 的设计让磁盘写永远是顺序的（无论多少 Topic/队列），代价是消费要多一次「查索引再读 CommitLog」的间接寻址。
      </KeyIdea>
      <p>写入优化手段：</p>
      <ul>
        <li><strong>顺序写 CommitLog</strong>：单一文件顺序追加，避免随机写。</li>
        <li><strong>内存映射（mmap）</strong>：用 <code>MappedByteBuffer</code> 把 CommitLog 映射到内存，读写像操作内存，由 OS 管理刷盘。</li>
        <li><strong>页缓存 + 预热</strong>：利用 OS page cache；可预先「文件预热」把页面提前加载，减少缺页中断。</li>
        <li><strong>刷盘策略</strong>：同步刷盘（每条都 fsync，可靠慢）/ 异步刷盘（攒批刷，快但有丢失窗口），按可靠性需求选。</li>
      </ul>

      <h2>九、面试精讲</h2>

      <h3>Q1：RocketMQ 为什么不用 ZooKeeper，而自研 NameServer？</h3>
      <p>
        <strong>原创讲解。</strong>一句话：<strong>ZooKeeper 提供的强一致选举、watch 等能力对消息系统的服务发现是「杀鸡用牛刀」，反而带来复杂度和性能负担</strong>。
        RocketMQ 的路由需求很简单——维护「Topic 在哪些 Broker」的路由表而已。
      </p>
      <p>
        于是它造了 NameServer：<strong>无状态、节点间互不通信、各自持有全量路由</strong>。Broker 向所有 NameServer 心跳上报，
        客户端定时拉路由缓存本地。它是 AP 的——牺牲强一致换高可用与极简运维。挂几个 NameServer 没关系，客户端换一个连即可。
      </p>
      <p>
        <strong>面试追问：</strong>「NameServer 之间不同步，路由会不一致吧？」——会有短暂不一致，但无所谓：
        客户端从任一 NameServer 拿到的路由都够用，且发送失败会自动重试换 Broker，最终一致即可。这正是「简单优先」的取舍。
      </p>

      <h3>Q2：RocketMQ 的存储和 Kafka 有什么本质区别？</h3>
      <p>
        <strong>原创讲解。</strong>核心区别是<strong>「消息怎么落盘」</strong>：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Kafka</th><th>RocketMQ</th></tr>
        </thead>
        <tbody>
          <tr><td>消息文件</td><td>每个分区独立日志文件</td><td>全局一个 CommitLog 混写所有消息</td></tr>
          <tr><td>写入</td><td>多分区→多文件，分区多时趋向随机写</td><td>永远顺序写单一 CommitLog</td></tr>
          <tr><td>消费索引</td><td>分区内 offset 直接定位</td><td>ConsumeQueue 存物理偏移，间接寻址</td></tr>
          <tr><td>Topic/队列多时</td><td>文件句柄多、写入分散</td><td>写入仍集中顺序，更稳</td></tr>
        </tbody>
      </table>
      <p>
        RocketMQ 用「全局顺序写 + 逻辑索引」换来「Topic 再多写入也顺序」的稳定性，代价是消费多一次间接寻址。
      </p>
      <p>
        <strong>面试追问：</strong>「为什么 Kafka 分区多了性能会下降，RocketMQ 不会？」——Kafka 每分区一个文件，分区一多，
        磁盘要在多个文件间来回写，顺序写退化为随机写；RocketMQ 始终写一个 CommitLog，无论多少队列都保持顺序写，所以更抗「多 Topic/多队列」。
      </p>

      <h3>Q3：Topic 和 Tag 该怎么用？同步、异步、单向发送怎么选？</h3>
      <p>
        <strong>原创讲解。</strong>Topic 是一级大类（决定路由存储），Tag 是 Topic 内的二级标签（不影响存储，用于消费过滤）。
        原则：<strong>不同业务用不同 Topic，同业务的不同子类型用 Tag 区分</strong>，消费端按 Tag 订阅过滤，既省资源又精准。
      </p>
      <p>三种发送方式按「可靠 vs 性能」选：</p>
      <ul>
        <li><strong>同步</strong>：等结果，最可靠，用于重要消息（订单、支付）。</li>
        <li><strong>异步</strong>：回调拿结果，不阻塞，吞吐高，用于既要可靠又要性能的场景。</li>
        <li><strong>单向（oneway）</strong>：发完不管，最快但可能丢，用于日志、监控等可丢消息。</li>
      </ul>
      <p>
        <strong>面试追问：</strong>「Tag 过滤是在 Broker 还是消费端做？」——Broker 先用 ConsumeQueue 里存的 Tag 哈希做<strong>粗过滤</strong>
        （减少传输），消费端再用完整 Tag 做<strong>精确过滤</strong>（防哈希冲突误判）。两级过滤兼顾效率与正确性。
      </p>

      <Summary
        points={[
          'RocketMQ 是阿里开源的面向业务高可靠 MQ，借鉴 Kafka 高吞吐又增强了事务/延迟/顺序/过滤/轨迹等业务特性，用于电商交易等可靠链路。',
          '四角色：NameServer（路由）、Broker（存储，主从）、Producer、Consumer；自研 NameServer 因 ZK 太重——它无状态、节点互不通信、各持全量路由、AP 取向。',
          'Producer 拉路由后选队列发主 Broker；Consumer 底层长轮询拉取、自维护 offset；发送分同步（可靠）/异步（高吞吐）/单向（最快可能丢）。',
          'Topic 是一级分类决定路由存储，Tag 是二级标签不影响存储仅用于消费过滤；消费分集群（分摊）/广播（各消费一遍）、并发/顺序。',
          '存储核心是全局一个 CommitLog 混写所有消息（极致顺序写）+ ConsumeQueue 逻辑索引 + IndexFile；与 Kafka 每分区独立文件不同，更抗多 Topic/队列。',
          '写入优化：顺序写 CommitLog、mmap 内存映射、页缓存预热、同步/异步刷盘按可靠性选；主从架构经 DLedger(Raft) 实现自动选主高可用。',
        ]}
      />
    </article>
  )
}

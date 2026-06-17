import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const replConf = `# 从库指向主库（5.0 起用 replicaof，旧版 slaveof）
replicaof 192.168.1.10 6379
replica-read-only yes        # 从库只读

# 看复制状态
127.0.0.1:6379> info replication
role:master
connected_slaves:2
slave0:ip=192.168.1.11,port=6379,state=online,offset=12840,lag=0
master_repl_offset:12840`

const psyncCmd = `# 增量复制靠三件套：
# 1) replication ID（主库运行 ID）
# 2) replication backlog（主库内一段环形缓冲区，缓存最近的写命令)
# 3) offset（主从各自记录已复制到的偏移量）

# 从库断线重连后发 PSYNC <replid> <offset>
# 主库判断：offset 还在 backlog 里 -> 部分重同步（只补差量）
#           否则 -> 全量重同步（重新发 RDB）`

const sentinelConf = `# 哨兵配置：监控名为 mymaster 的主库，2 票同意才判定客观下线
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000   # 5 秒无响应判主观下线
sentinel failover-timeout mymaster 60000

# 启动哨兵
$ redis-sentinel /etc/redis/sentinel.conf`

const clusterCmd = `# Cluster：16384 个槽分给各主节点，key 通过 CRC16 定位槽
127.0.0.1:6379> cluster keyslot user:123
(integer) 5474                     # 这个 key 落在 5474 号槽

# 算法：HASH_SLOT = CRC16(key) mod 16384
# 用 {} 强制同槽（hash tag）：只对花括号内的部分做 CRC16
127.0.0.1:6379> cluster keyslot {user}:name
127.0.0.1:6379> cluster keyslot {user}:age   # 与上一条同槽，可放一起做事务`

export default function Ch1() {
  return (
    <article>
      <Lead>
        本章讲高可用三件套：主从复制的实现原理与延迟成因、常见拓扑、哨兵机制、集群实现原理、
        Cluster 与 Sentinel 模式的区别、集群脑裂如何发生与防范，以及集群中如何用 hash slot
        根据键定位节点。
      </Lead>

      <h2>一、主从复制实现原理</h2>
      <KeyIdea>
        主从复制的核心是<strong>全量同步 + 增量同步</strong>：首次连接走全量（主库 bgsave 出 RDB
        发给从库），之后主库把写命令<strong>持续传播</strong>给从库；断线重连时尽量走部分重同步，
        只补断开期间的差量命令。
      </KeyIdea>
      <CodeBlock lang="bash" title="配置主从与查看状态" code={replConf} />
      <p>首次全量同步三阶段：</p>
      <ul>
        <li><strong>建立连接</strong>：从库发 <code>PSYNC</code>，主库决定全量还是部分同步。</li>
        <li><strong>全量传输</strong>：主库 <code>bgsave</code> 生成 RDB 发给从库，从库清空自身后载入；
          期间主库的新写命令缓存在 <strong>replication buffer</strong>。</li>
        <li><strong>命令传播</strong>：主库把缓存的、以及后续所有写命令源源不断发给从库，保持同步。</li>
      </ul>
      <CodeBlock lang="text" title="增量/部分重同步靠什么" code={psyncCmd} />
      <p>
        <strong>面试追问：为什么要区分全量和部分重同步？</strong>早期版本从库一断线重连就触发全量同步，
        主库又要 bgsave、又要传整个 RDB，开销巨大，网络抖一下就是一次「全量风暴」。
        2.8 起引入<strong>部分重同步（PSYNC）</strong>：主库用一段环形的 <code>replication backlog</code>
        缓存最近的写命令，从库断线重连时报上自己的 <code>offset</code>，只要这个 offset 还在 backlog 里，
        主库就只补发断开期间的差量命令，避免全量。<strong>backlog 设太小</strong>会导致稍长的断线就回退到
        全量同步，所以 <code>repl-backlog-size</code> 要按「断线时长 × 写入速率」估算。
      </p>

      <h2>二、复制延迟的常见原因</h2>
      <p>
        主从是<strong>异步复制</strong>，从库总会比主库慢一点，即「复制延迟」。从库读到旧数据是常态。常见原因：
      </p>
      <table>
        <thead>
          <tr><th>原因</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>网络延迟/带宽</td><td>主从跨机房、带宽不足，命令传输慢</td></tr>
          <tr><td>从库负载高</td><td>从库读 QPS 高、或在做持久化/重写，处理复制命令变慢</td></tr>
          <tr><td>大 Key/慢命令</td><td>主库一条命令很重，从库重放也慢</td></tr>
          <tr><td>主库写入太快</td><td>写入速率超过复制传输能力，积压</td></tr>
        </tbody>
      </table>
      <p>
        排查看 <code>info replication</code> 里从库的 <code>lag</code> 和主从 <code>offset</code> 差。
        强一致读需求可读主库，或用 <code>WAIT</code> 命令等待若干从库确认。
      </p>

      <h2>三、主从复制常见拓扑</h2>
      <ul>
        <li><strong>一主一从</strong>：最简单，主写从读 + 数据冗余。</li>
        <li><strong>一主多从</strong>：多个从库分摊读流量；但主库给每个从库都发一份命令，从库太多会压主库。</li>
        <li><strong>级联（链式）</strong>：从库再带从库（主 → 从 → 从），减轻主库的复制压力，
          代价是末端从库延迟更大。</li>
      </ul>

      <h2>四、哨兵机制</h2>
      <KeyIdea>
        哨兵（Sentinel）是独立进程，持续监控主从。主库挂了就<strong>自动故障转移</strong>：
        选一个从库提升为新主，让其它从库改跟新主，并通知客户端新主地址。
      </KeyIdea>
      <CodeBlock lang="bash" title="哨兵配置" code={sentinelConf} />
      <p>关键概念：</p>
      <ul>
        <li><strong>主观下线（SDOWN）</strong>：单个哨兵 ping 不通主库，自己认为它下线了。</li>
        <li><strong>客观下线（ODOWN）</strong>：达到配置的票数（<code>quorum</code>）个哨兵都认为主库下线，
          才正式判定客观下线。</li>
        <li><strong>选举 + 故障转移</strong>：哨兵们通过 Raft 选出一个 Leader 哨兵来执行转移，
          挑选从库时综合优先级、复制 offset（数据最新）、运行 ID。</li>
      </ul>
      <Callout variant="warn" title="哨兵自身也要多个">
        哨兵至少部署 3 个且分布在不同机器，避免哨兵单点和误判。<code>quorum</code> 一般设为
        哨兵数的多数。

      </Callout>

      <p>
        <strong>面试追问：哨兵怎么挑选新主？</strong>不是随便选，而是按优先级层层筛：
        ① 先排除已下线、长期断连的从库；② 比 <code>replica-priority</code>（数字越小优先级越高，设 0 则永不当选）；
        ③ 优先级相同比<strong>复制偏移量</strong>（offset 越大说明数据越新，丢得越少）；
        ④ 再相同就比运行 ID（字典序小的）。选出来后让它执行 <code>SLAVEOF NO ONE</code> 升为主，
        其余从库改 <code>SLAVEOF 新主</code>，最后哨兵通过<strong>发布订阅</strong>把新主地址通知客户端。
      </p>

      <h2>五、集群实现原理</h2>
      <p>
        当单机内存/吞吐到顶，就上 <strong>Redis Cluster</strong> 做<strong>水平分片</strong>：
        数据被切分到多个主节点，每个主节点再带从库做高可用。Cluster 是<strong>去中心化</strong>的，
        节点之间用 <strong>Gossip 协议</strong>互相交换状态，不需要代理。
      </p>

      <h2>六、集群中如何根据键定位节点（hash slot）</h2>
      <KeyIdea>
        Cluster 把整个键空间划成 <strong>16384 个槽（slot）</strong>，每个主节点负责一部分槽。
        定位公式：<code>slot = CRC16(key) mod 16384</code>，先算槽再找负责该槽的节点。
      </KeyIdea>
      <CodeBlock lang="bash" title="键到槽、hash tag" code={clusterCmd} />
      <ul>
        <li><strong>为什么是 16384 而不是更多</strong>：节点间心跳要携带槽位图（bitmap），16384 位 = 2KB，
          大小可控；而 Cluster 设计上节点数不会太多，16384 个槽足够细分。</li>
        <li><strong>hash tag</strong>：用 <code>{'{...}'}</code> 包住 key 的一部分，只对花括号内的内容算 CRC16，
          让相关 key 落到同一槽，才能在同一节点上做 multi-key 操作/事务。</li>
        <li>客户端访问错节点会收到 <code>MOVED</code>/<code>ASK</code> 重定向，智能客户端会缓存槽到节点的映射。</li>
      </ul>

      <h2>七、Cluster vs Sentinel</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Sentinel（哨兵）</th><th>Cluster（集群）</th></tr>
        </thead>
        <tbody>
          <tr><td>解决的问题</td><td>高可用（自动故障转移）</td><td>高可用 + 水平扩展（分片）</td></tr>
          <tr><td>数据分片</td><td>无，全量数据在每个主库</td><td>有，16384 槽分到多主</td></tr>
          <tr><td>容量上限</td><td>受单机内存限制</td><td>可水平扩容</td></tr>
          <tr><td>架构</td><td>哨兵 + 主从</td><td>去中心化，节点 Gossip</td></tr>
          <tr><td>multi-key 操作</td><td>无限制</td><td>需同槽（hash tag）</td></tr>
        </tbody>
      </table>
      <p>
        一句话：数据量单机扛得住、只要高可用，用 Sentinel；数据量大需要分片扩展，用 Cluster。
      </p>

      <h2>八、集群脑裂</h2>
      <p>
        脑裂指网络分区导致<strong>同时存在两个主节点</strong>：旧主被网络隔离但还活着，
        哨兵/集群在另一侧又选了新主。客户端若还连着旧主继续写，等网络恢复、旧主降为从库时，
        它会清空自己去同步新主，<strong>这段时间写到旧主的数据就丢了</strong>。
      </p>
      <CodeBlock lang="bash" title="用两个参数防脑裂写丢失" code={`# 主库只有在能连上至少 N 个从库、且复制延迟都小于 M 秒时才接受写
min-replicas-to-write 1      # 至少 1 个从库在线
min-replicas-max-lag 10      # 且延迟不超过 10 秒，否则主库拒绝写入`} />
      <Callout variant="warn" title="脑裂只能缓解不能根治">
        上面两个参数让被隔离的旧主因「连不上足够从库」而<strong>主动拒绝写入</strong>，从而减少数据丢失，
        但代价是可用性下降（少数派主库不可写）。这本质是 CAP 里 C 与 A 的权衡。
      </Callout>

      <p>
        <strong>面试追问：Cluster 故障转移要不要哨兵？</strong>不需要。Cluster 是<strong>去中心化、自带
        故障转移</strong>的：每个主节点自己带从库，节点间通过 Gossip 互相 ping，当多数主节点都判定某主
        「失联（FAIL）」时，它的从库就发起选举（类似 Raft 的投票）升为新主，全程不依赖外部哨兵。
        所以 Sentinel 和 Cluster 是<strong>两套独立方案，不会一起用</strong>——用了 Cluster 就别再叠哨兵。
      </p>
      <p>
        <strong>面试追问：Cluster 能跨槽做事务/Lua 吗？</strong>不能直接做。multi-key 命令、事务、Lua
        要求涉及的 key 都在<strong>同一个槽</strong>，否则报 <code>CROSSSLOT</code> 错误。解决办法就是上面提到的
        <strong>hash tag</strong>：给需要放一起的 key 套上相同的 <code>{'{...}'}</code> 前缀，让它们 CRC16
        后落进同一槽、同一节点，才能一起操作。这也是 Cluster 与单机/Sentinel 在使用上的一个重要差异。
      </p>

      <Callout variant="info" title="MOVED 与 ASK 的区别">
        访问 Cluster 时若 key 不在当前节点，会收到重定向：<strong>MOVED</strong> 表示该槽已<strong>永久</strong>
        迁到别的节点，客户端应更新本地槽映射并改连新节点；<strong>ASK</strong> 表示槽正在<strong>迁移中</strong>，
        是<strong>临时</strong>重定向，客户端这一次去新节点（先发 ASKING），但不更新映射。理解这两者能解释
        「为什么扩缩容期间偶尔多一跳」。
      </Callout>

      <Example title="一句话串起来">
        <p>主从负责数据冗余与读扩展，哨兵负责自动选主保高可用，Cluster 在此基础上再加分片解决容量。
          脑裂是网络分区下的经典风险，靠 min-replicas 参数缓解。</p>
      </Example>

      <Summary
        points={[
          '主从复制 = 全量同步（bgsave 出 RDB）+ 命令传播；断线重连靠 replid/backlog/offset 走部分重同步。',
          '复制是异步的，延迟成因有网络、从库负载、大 Key 慢命令、主库写太快；强一致读可读主或用 WAIT。',
          '常见拓扑：一主一从、一主多从（读扩展但压主）、级联链式（减主库压力但末端延迟大）。',
          '哨兵监控主从并自动故障转移，区分主观下线(SDOWN)与客观下线(ODOWN)，Leader 哨兵执行选主。',
          'Cluster 用 16384 槽分片，slot = CRC16(key) mod 16384，hash tag 让相关 key 同槽；去中心化 Gossip。',
          'Sentinel 只做高可用、不分片；Cluster 同时分片扩容；按数据量是否超单机来选。',
          '脑裂是网络分区下出现双主导致写丢失，用 min-replicas-to-write / min-replicas-max-lag 缓解（牺牲部分可用性）。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Cluster from '@/courses/redis-internals/illustrations/Cluster.jsx'

const createCmd = `# 用 6 个节点（3 主 3 从）创建集群，每个主自动配 1 个从
redis-cli --cluster create \\
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \\
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \\
  --cluster-replicas 1`

const infoCmd = `127.0.0.1:7000> cluster info
cluster_state:ok
cluster_slots_assigned:16384      # 16384 个槽是否全部分配完
cluster_known_nodes:6
cluster_size:3                    # 负责槽的主节点数

# 看每个 key 落在哪个槽
127.0.0.1:7000> cluster keyslot user:1001
(integer) 4847
127.0.0.1:7000> cluster keyslot {user:1001}:name
(integer) 4847                    # hashtag 让它和上面落同一个槽`

const reshardCmd = `# 给集群在线扩容：加新节点后，把一部分槽迁移给它
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000
redis-cli --cluster reshard 127.0.0.1:7000
# 按提示输入：迁移多少个槽、目标节点ID、源节点（all 表示从所有现有主均摊）`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          哨兵能扛住主库宕机，却扛不住<strong>数据量和吞吐撑爆单机</strong>：一台机器内存就那么大，单线程的 QPS 也有上限。
          <em>Cluster</em>（集群）是 Redis 官方的<strong>分布式方案</strong>：把数据切成很多份，分散到多台机器上，
          一边水平扩容、一边内置高可用。它的核心，是一套叫「<strong>16384 个槽</strong>」的分片机制。
        </p>
      </Lead>

      <h2>为什么需要 Cluster</h2>
      <p>
        主从 + 哨兵的架构里，<strong>所有数据都在一台主库上</strong>，从库只是副本。当数据量超过单机内存、或写入 QPS 超过
        单线程上限时，再多从库也没用——瓶颈在主库。解决办法只有一个：<strong>分片</strong>（sharding），把数据拆开，
        让多台主库各管一部分，写入和内存都被摊薄。Cluster 就是把分片和高可用打包做好的官方方案。
      </p>

      <h2>16384 个槽：数据怎么分</h2>
      <p>
        Cluster 不按机器数直接哈希（那样加减机器要全量搬数据），而是引入一层<strong>固定的中间层</strong>：把整个键空间
        预先划成 <strong>16384 个槽</strong>（slot，编号 0 到 16383）。每个 key 通过
        <code>CRC16(key) % 16384</code> 算出它属于哪个槽；而每个槽被分配给某个主节点负责。
      </p>
      <p>
        于是定位一个 key 分两跳：<strong>key 先映射到槽，槽再映射到节点</strong>。加减节点时，只需在节点之间
        <strong>搬动槽</strong>（连带槽里的数据），不用重新计算所有 key 的归属，迁移成本可控。
      </p>

      <Cluster />

      <h2>MOVED 与 ASK：客户端重定向</h2>
      <p>
        客户端可能把命令发到了「不负责这个槽」的节点。这时节点不会帮你转发，而是回一个<strong>重定向</strong>错误：
      </p>
      <ul>
        <li>
          <em>MOVED</em>：这个槽<strong>已经稳定</strong>归别的节点了。节点回复 <code>MOVED 槽号 目标IP:端口</code>，
          客户端据此<strong>更新本地槽到节点的映射缓存</strong>，并重发到正确节点。智能客户端因此很少多跳。
        </li>
        <li>
          <em>ASK</em>：这个槽<strong>正在迁移中</strong>，部分 key 已经搬到目标节点。节点回 <code>ASK 槽号 目标IP:端口</code>，
          客户端这一次去目标节点（先发 <code>asking</code> 再发命令），但<strong>不更新本地缓存</strong>，因为迁移还没完成。
        </li>
      </ul>

      <KeyIdea title="hashtag：让相关 key 落同一个槽">
        <p>
          Cluster 默认<strong>不支持跨槽的多键操作</strong>（如 mget 多个落在不同节点的 key、跨槽事务），因为它们可能在不同机器上。
          解决办法是 <em>hashtag</em>：如果 key 里含有 <code>{'{...}'}</code>，则<strong>只用花括号内的内容</strong>算 CRC16。
          比如 <code>{'{user:1001}:name'}</code> 和 <code>{'{user:1001}:age'}</code> 都只对 <code>user:1001</code> 取哈希，
          必然落在<strong>同一个槽、同一个节点</strong>，于是可以对它们做多键操作和事务。
        </p>
      </KeyIdea>

      <Example title="数据量增长需要分片">
        <p>
          某社交应用用户数据从几百万涨到上亿，单机内存放不下，写入也开始排队。改造成 3 主 3 从的 Cluster：
          16384 个槽均分给 3 个主节点（每个约 5461 个槽），用户数据按 <code>CRC16(uid) % 16384</code> 散到三台机器，
          内存和写入压力直接降到三分之一。后续再涨，加第 4 台主节点、reshard 迁一部分槽过去即可，<strong>在线扩容不停服</strong>。
        </p>
        <p>
          注意把同一个用户的多个 key 用 hashtag 包成 <code>{'{uid}'}</code> 形式，保证「查这个用户的全部资料」能在一台机器上一次取回。
        </p>
      </Example>

      <h2>扩容缩容：槽迁移 reshard</h2>
      <p>
        加节点时，新节点初始不负责任何槽，要通过 <em>reshard</em> 把若干槽（连同数据）从现有节点迁过去；缩容则相反，
        先把被删节点的槽迁走再下线它。迁移以槽为单位、可在线进行，迁移中的槽就是靠上面的 ASK 重定向保证客户端仍能读到正确数据。
      </p>

      <h2>gossip：节点间怎么通信</h2>
      <p>
        Cluster 没有中心配置节点，所有节点通过 <em>gossip 协议</em>互相「八卦」：每个节点周期性地和随机几个节点交换信息
        （谁在线、谁负责哪些槽、谁疑似下线），消息在<strong>专用集群总线端口</strong>（数据端口 + 10000）上传播。
        靠这种点对点扩散，整个集群的拓扑视图最终趋于一致，也能发现节点故障并自动做主从切换（Cluster 自带高可用，无需哨兵）。
      </p>

      <Callout variant="warn" title="与哨兵方案的区别 / 面试陷阱">
        <ul>
          <li>
            <strong>哨兵不分片</strong>：哨兵方案数据全在一台主库，只解决高可用；Cluster <strong>既分片又高可用</strong>，能水平扩容。
          </li>
          <li>
            <strong>Cluster 限制多键操作</strong>：跨槽的 mget、事务、Lua 默认会报错，必须用 hashtag 把相关 key 收拢到同一槽。
          </li>
          <li>
            <strong>16384 不是 16383 也不是更大</strong>：选这个数是在「心跳消息体积（槽位图）」和「最大节点数」之间的权衡，常被追问，记住结论即可。
          </li>
        </ul>
      </Callout>

      <h3>面试怎么答</h3>
      <p>
        被问「Redis 集群怎么分片」，主线是：引入 16384 个槽做中间层，key 经 <code>CRC16(key) % 16384</code> 定位槽，
        槽再分给各主节点；客户端发错节点会收到 MOVED（稳定归属，更新缓存）或 ASK（迁移中，临时跳转）；扩缩容靠在线迁移槽（reshard）；
        节点间用 gossip 同步拓扑并自带故障转移。最后对比一句：哨兵只做高可用、数据不分片，Cluster 是分片 + 高可用一体。
      </p>

      <Practice title="创建集群并观察槽分布">
        <CodeBlock lang="bash" title="创建集群" code={createCmd} />
        <CodeBlock lang="text" title="cluster info / cluster keyslot" code={infoCmd} />
        <CodeBlock lang="bash" title="在线扩容：reshard 迁槽" code={reshardCmd} />
      </Practice>

      <Summary
        points={[
          'Cluster 是 Redis 官方分布式方案，通过分片突破单机内存与单线程吞吐上限，同时内置高可用。',
          '键空间预划成 16384 个槽，key 经 CRC16(key) % 16384 定位槽，槽再分配给各主节点，加减节点只搬槽不重算全部 key。',
          '客户端发错节点会收到 MOVED（归属已稳定，更新本地缓存）或 ASK（槽迁移中，本次临时跳转、不更新缓存）。',
          'hashtag 用 {} 只对花括号内容取哈希，让相关 key 落同一槽，从而支持多键操作和事务。',
          '扩缩容靠 reshard 在线迁移槽；节点间用 gossip 协议交换拓扑与故障信息，自带主从故障转移。',
          '与哨兵的区别：哨兵只做高可用、数据不分片，Cluster 是分片 + 高可用一体，但限制跨槽多键操作。',
        ]}
      />
    </>
  )
}

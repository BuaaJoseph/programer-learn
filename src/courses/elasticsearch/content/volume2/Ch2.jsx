import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ShardReplica from '@/courses/elasticsearch/illustrations/ShardReplica.jsx'

const createShardsCode = `PUT /orders
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}`

const catShardsCode = `GET /_cat/shards/orders?v

index  shard prirep state   docs  store node
orders 0     p      STARTED 1200  3.1mb node-a
orders 0     r      STARTED 1200  3.1mb node-b
orders 1     p      STARTED 1180  3.0mb node-b
orders 1     r      STARTED 1180  3.0mb node-c
orders 2     p      STARTED 1210  3.2mb node-c
orders 2     r      STARTED 1210  3.2mb node-a`

const updateReplicaCode = `# 副本数可以随时动态改（不影响写入路由）
PUT /orders/_settings
{
  "number_of_replicas": 2
}

# 自定义路由：把同一用户的订单聚到一个分片，查询提速
PUT /orders/_doc/1001?routing=user_42
{ "user": "user_42", "amount": 99 }

# 查询时也要带同样的 routing，否则会查全部分片
GET /orders/_search?routing=user_42
{ "query": { "term": { "user": "user_42" } } }`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          一台机器装不下、扛不住所有数据，这是分布式系统存在的根本理由。Elasticsearch 的答案是把一个索引拆成多个
          <em>shard</em>（分片），分散到不同节点上；再给每个分片配几个 <em>replica</em>（副本）做冗余和读扩展。
          理解主分片和副本的分工，是回答「数据量增长怎么扩」这类问题的钥匙。
        </p>
      </Lead>

      <h2>主分片 primary：把数据水平拆开</h2>
      <p>
        一个索引在创建时会被切成若干个<strong>主分片</strong>（primary shard），每个主分片是一个完整、独立的
        Lucene 索引，存着整份数据的一部分。这就是「水平拆分」：数据量大了，就让更多分片分摊到更多节点上。
      </p>
      <p>
        主分片的数量在<strong>建索引时就定死了，之后不能改</strong>。原因藏在写入路由里：一条文档该进哪个主分片，
        是按公式 <code>hash(_routing) % number_of_primary_shards</code> 算出来的（默认 <code>_routing</code> 就是 <code>_id</code>）。
        如果主分片数能随便改，这个取模结果就会变，老文档就「找不到家」了。所以分片数是必须提前规划好的参数。
      </p>
      <p>
        要强调「分片本质是一个独立 Lucene 索引」这件事：它有自己的倒排索引、自己的 segment、自己的 refresh/flush 周期。
        所以一次跨分片查询，其实是<strong>在多个 Lucene 索引上各跑一遍、再归并</strong>。这也解释了为什么分片是 ES
        伸缩和并行的最小单位——加分片就是加并行度，但也加了归并成本。
      </p>

      <h3>副本 replica：冗余加读扩展</h3>
      <p>
        每个主分片可以有零到多个<strong>副本分片</strong>（replica shard），它们是主分片的完整拷贝。副本干两件事：
      </p>
      <ul>
        <li><strong>高可用</strong>：主分片所在节点挂了，副本能顶上，数据不丢、服务不断。</li>
        <li><strong>读扩展</strong>：查询既可以打到主分片也可以打到副本，副本越多，读吞吐越高。</li>
      </ul>
      <p>
        和主分片相反，副本数量<strong>可以随时动态调整</strong>（改 <code>number_of_replicas</code> 即可），
        因为加减副本不影响写入路由。这也是面试常考的对比点：<em>主分片数定死、副本数可改</em>。
      </p>
      <p>
        但副本不是免费午餐：写入时主分片要把数据<strong>同步给所有副本</strong>，副本越多写入越慢、占用磁盘越多。
        所以是「以写换读」的权衡。常见取舍：搜索类（读重）多给副本，日志写入类（写重、可容忍少量丢）副本设 1 甚至临时设 0 加速灌数据。
      </p>
      <CodeBlock lang="json" title="动态改副本数 + 自定义路由" code={updateReplicaCode} />

      <Example title="数据量增长，到底怎么扩">
        <p>假设一个订单索引，最初只有几百万条，单节点够用。随着业务增长：</p>
        <ul>
          <li>数据撑爆单节点 → 靠<strong>多主分片</strong>把数据摊到多台 data 节点（但分片数得一开始就预留好）。</li>
          <li>查询并发上来了、读不过来 → <strong>加副本</strong>，把读请求分散到更多分片上。</li>
          <li>分片数当初没留够、已经不够分 → 只能新建一个分片数更大的索引，再 <code>_reindex</code> 搬过去。</li>
        </ul>
        <p>
          所以容量规划的精髓是：副本可以临时加，主分片数却是「一锤子买卖」，必须按未来数据量预估好。
          时序场景（日志）则换个思路：用按天/按周滚动的新索引来「横向扩」，每个索引分片数可独立设置，不必把单个索引开很大。
        </p>
      </Example>

      <ShardReplica />

      <KeyIdea title="路由：一条文档怎么找到它的分片">
        <p>
          写入和按 <code>_id</code> 查询时，Elasticsearch 用 <code>shard = hash(_routing) % 主分片数</code> 算出目标主分片，
          直接定位、不用遍历。这就是为什么<strong>主分片数不能改</strong>——它是路由公式的分母，改了等于把所有老数据的
          归属算错。需要按业务键聚集数据时，可以指定自定义 routing 值（如 user_id），让同一用户的数据落在同一分片，
          查询只命中一个分片、极大提速；但代价是可能造成<strong>数据倾斜</strong>（某分片被某大用户撑爆），且查询必须带相同 routing，要谨慎用。
        </p>
      </KeyIdea>

      <h2>节点角色：master、data、coordinating</h2>
      <p>
        分片落在节点上，而节点是有分工的。面试里把这几个角色说清楚很加分：
      </p>
      <ul>
        <li><strong>master 节点</strong>：管理集群元数据，比如索引的创建删除、分片分配、节点上下线，不负责存数据。</li>
        <li><strong>master-eligible（候选主）节点</strong>：有资格被选为 master，集群靠它们投票选主，数量是脑裂防护的关键。</li>
        <li><strong>data 节点</strong>：真正存储分片、执行增删改查和聚合的「干活」节点；大集群还细分 hot/warm/cold 做冷热分层。</li>
        <li><strong>coordinating 节点（协调节点）</strong>：接收客户端请求，把请求分发到相关分片，再把各分片结果汇总返回。任何节点默认都能当协调节点。</li>
        <li><strong>ingest 节点</strong>：写入前跑预处理管道（pipeline），做字段加工、格式转换等。</li>
      </ul>

      <Callout variant="warn" title="脑裂：为什么候选主节点要奇数">
        <p>
          <strong>脑裂（split-brain）</strong>指网络分区时集群裂成两半，各自选出一个 master，回到一起时数据冲突。
          ES 用<strong>多数派（quorum）</strong>选主来防止：只有获得超过半数候选主节点投票才能当选。
          所以候选主节点建议设<strong>奇数（如 3、5）</strong>，且任一分区都无法同时凑齐两个多数派。
          7.x 起这套逻辑内置为基于 Raft 的协议，自动维护 voting configuration，运维心智负担小了很多，
          但「为什么要奇数候选主」依然是经典面试题。
        </p>
      </Callout>

      <Callout variant="warn" title="分片不是越多越好">
        <p>新手常犯的错是「为了将来好扩，先开它一百个分片」。这会带来反效果：</p>
        <ul>
          <li>每个分片都有固定的内存、文件句柄、元数据开销，<strong>小分片太多会拖垮集群</strong>。</li>
          <li>查询要在所有分片上并行执行再汇总，分片越碎，协调和合并的成本越高。</li>
          <li>经验法则：让单个分片大小落在 <strong>30-50GB</strong> 这个区间，按目标数据量倒推分片数，别盲目堆数量。</li>
          <li>另一条经验：单节点的分片总数最好控制在「每 GB 堆内存 ≤ 20 个分片」量级，避免元数据压垮 master。</li>
        </ul>
      </Callout>

      <h2>故障转移：副本升主</h2>
      <p>
        当某个 data 节点宕机，它上面的主分片就没了。这时 master 会触发<strong>故障转移</strong>：
        把该主分片在其它节点上的某个副本<strong>提升为新的主分片</strong>，对外继续提供读写；
        随后再在健康节点上补出新的副本，让冗余度恢复。整个过程对客户端基本透明，这正是副本存在的核心价值。
      </p>
      <p>
        这里能把第一章的健康颜色串起来：节点刚宕、副本还没补齐时，集群是 <strong>yellow</strong>（数据还在但少冗余）；
        如果某主分片连一个可用副本都没有，就会变 <strong>red</strong>（该分片数据暂不可用）。所以 yellow 多数是「等恢复」，
        red 才是「真丢了主分片、需要人工介入」。ES 还有个保护机制：默认不会把主分片和它的副本分到同一台节点上，
        否则那台机器一挂就两份全没了。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「主分片和副本的区别」，按 <em>主分片负责水平拆分数据、建索引定死、决定写入路由；副本负责冗余和读扩展、可动态改</em>
        这条线答。被追问「分片数怎么定」，给出「单分片 30-50GB 经验、别开太多小分片、按目标数据量倒推」。
        再补一句「主分片挂了副本升主」，故障转移的链路就完整了。最后能聊到脑裂与多数派选主，层次就拉开了。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「主分片数能扩吗？」</strong>——不能，因为是路由公式的分母；要扩只能 reindex 到新索引（或用 split API 按倍数拆）。
          </li>
          <li>
            <strong>误区：副本越多越好</strong>——副本要同步写、占磁盘，是以写换读，按读写比例权衡。
          </li>
          <li>
            <strong>「怎么防脑裂？」</strong>——多数派选主 + 奇数候选主节点；7.x 后内置自动维护。
          </li>
          <li>
            <strong>误区：把分片数当性能旋钮无脑调大</strong>——小分片过多反而拖垮集群，30-50GB 是经验区间。
          </li>
        </ul>
      </Callout>

      <Practice title="设置分片副本并查看分布">
        <p>
          建一个指定主分片数和副本数的索引，再用 <code>_cat/shards</code> 观察每个分片（p 是主、r 是副本）
          落在了哪个节点上。试着把副本数改大，看新副本能不能动态加出来。
        </p>
        <CodeBlock lang="json" title="建索引并设置分片副本" code={createShardsCode} />
        <CodeBlock lang="text" title="查看分片分布 _cat/shards" code={catShardsCode} />
        <p>
          注意看 <code>prirep</code> 列：同一个 shard 号的 p 和 r 永远在不同节点（如 shard 0 的主在 node-a、副在 node-b），
          这正是「主副本不同机」保护的体现。再跑一次改副本数的命令，观察新副本被分配出来的过程。
        </p>
      </Practice>

      <Summary
        points={[
          '主分片把数据水平拆开，每个是独立的 Lucene 索引（有自己的倒排/segment），建索引时定死不可改。',
          '写入路由按 hash(_routing) % 主分片数 定位分片，默认 _routing 即 _id，这是主分片数不能改的根因。',
          '副本是主分片的拷贝，提供高可用和读扩展，数量可随时改；但要同步写、占磁盘，是以写换读。',
          '自定义 routing 能把同业务键数据聚到一分片提速，代价是可能数据倾斜、查询须带相同 routing。',
          '节点角色：master（元数据）、候选主、data（存储/可冷热分层）、coordinating（分发汇总）、ingest（预处理）。',
          '脑裂靠多数派选主防护，候选主节点建议奇数；7.x 起内置 Raft 类协议自动维护。',
          '分片不是越多越好：单分片 30-50GB、控制单节点分片总数，小分片过多会拖垮集群。',
          '故障转移时副本升主、对客户端透明；yellow 多为缺副本待恢复，red 才是主分片不可用需介入。',
        ]}
      />
    </>
  )
}

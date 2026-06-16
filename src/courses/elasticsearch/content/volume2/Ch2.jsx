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
        是按公式 <code>hash(_id) % number_of_primary_shards</code> 算出来的。如果主分片数能随便改，
        这个取模结果就会变，老文档就「找不到家」了。所以分片数是必须提前规划好的参数。
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

      <Example title="数据量增长，到底怎么扩">
        <p>假设一个订单索引，最初只有几百万条，单节点够用。随着业务增长：</p>
        <ul>
          <li>数据撑爆单节点 → 靠<strong>多主分片</strong>把数据摊到多台 data 节点（但分片数得一开始就预留好）。</li>
          <li>查询并发上来了、读不过来 → <strong>加副本</strong>，把读请求分散到更多分片上。</li>
          <li>分片数当初没留够、已经不够分 → 只能新建一个分片数更大的索引，再 <code>_reindex</code> 搬过去。</li>
        </ul>
        <p>
          所以容量规划的精髓是：副本可以临时加，主分片数却是「一锤子买卖」，必须按未来数据量预估好。
        </p>
      </Example>

      <ShardReplica />

      <KeyIdea title="路由：一条文档怎么找到它的分片">
        <p>
          写入和按 <code>_id</code> 查询时，Elasticsearch 用 <code>shard = hash(_id) % 主分片数</code> 算出目标主分片，
          直接定位、不用遍历。这就是为什么<strong>主分片数不能改</strong>——它是路由公式的分母，改了等于把所有老数据的
          归属算错。需要按业务键聚集数据时，可以指定自定义 routing 值，但代价和约束也随之而来，要谨慎用。
        </p>
      </KeyIdea>

      <h2>节点角色：master、data、coordinating</h2>
      <p>
        分片落在节点上，而节点是有分工的。面试里把这几个角色说清楚很加分：
      </p>
      <ul>
        <li><strong>master 节点</strong>：管理集群元数据，比如索引的创建删除、分片分配、节点上下线，不负责存数据。</li>
        <li><strong>data 节点</strong>：真正存储分片、执行增删改查和聚合的「干活」节点。</li>
        <li><strong>coordinating 节点（协调节点）</strong>：接收客户端请求，把请求分发到相关分片，再把各分片结果汇总返回。任何节点默认都能当协调节点。</li>
      </ul>

      <Callout variant="warn" title="分片不是越多越好">
        <p>新手常犯的错是「为了将来好扩，先开它一百个分片」。这会带来反效果：</p>
        <ul>
          <li>每个分片都有固定的内存、文件句柄、元数据开销，<strong>小分片太多会拖垮集群</strong>。</li>
          <li>查询要在所有分片上并行执行再汇总，分片越碎，协调和合并的成本越高。</li>
          <li>经验法则：让单个分片大小落在 <strong>30-50GB</strong> 这个区间，按目标数据量倒推分片数，别盲目堆数量。</li>
        </ul>
      </Callout>

      <h2>故障转移：副本升主</h2>
      <p>
        当某个 data 节点宕机，它上面的主分片就没了。这时 master 会触发<strong>故障转移</strong>：
        把该主分片在其它节点上的某个副本<strong>提升为新的主分片</strong>，对外继续提供读写；
        随后再在健康节点上补出新的副本，让冗余度恢复。整个过程对客户端基本透明，这正是副本存在的核心价值。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「主分片和副本的区别」，按 <em>主分片负责水平拆分数据、建索引定死、决定写入路由；副本负责冗余和读扩展、可动态改</em>
        这条线答。被追问「分片数怎么定」，给出「单分片 30-50GB 经验、别开太多小分片、按目标数据量倒推」。
        再补一句「主分片挂了副本升主」，故障转移的链路就完整了。
      </p>

      <Practice title="设置分片副本并查看分布">
        <p>
          建一个指定主分片数和副本数的索引，再用 <code>_cat/shards</code> 观察每个分片（p 是主、r 是副本）
          落在了哪个节点上。试着把副本数改大，看新副本能不能动态加出来。
        </p>
        <CodeBlock lang="json" title="建索引并设置分片副本" code={createShardsCode} />
        <CodeBlock lang="text" title="查看分片分布 _cat/shards" code={catShardsCode} />
      </Practice>

      <Summary
        points={[
          '主分片把数据水平拆开，每个是独立的 Lucene 索引，建索引时定死不可改。',
          '写入路由按 hash(_id) % 主分片数 定位分片，这正是主分片数不能改的根本原因。',
          '副本是主分片的拷贝，提供高可用和读扩展，数量可以随时动态调整。',
          '节点角色分 master（管元数据）、data（存数据干活）、coordinating（分发汇总请求）。',
          '分片不是越多越好：单分片 30-50GB 为经验值，小分片过多会拖垮集群。',
          '故障转移时副本会升为主分片，对客户端透明，这是副本最核心的价值。',
        ]}
      />
    </>
  )
}

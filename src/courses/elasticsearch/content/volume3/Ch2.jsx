import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const deepPageCode = `# 想看第 1000 页（每页 10 条）：跳过前 9990 条
GET /books/_search
{
  "from": 9990,
  "size": 10,
  "query": { "match_all": {} }
}

# 报错：Result window is too large, from + size must be
# less than or equal to: [10000] ...`

const searchAfterCode = `# 第一页：必须带一个全局唯一的排序键（这里用 price + _id 兜底）
GET /books/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "sort": [ { "price": "asc" }, { "_id": "asc" } ]
}

# 下一页：把上一页最后一条的 sort 值原样塞进 search_after
GET /books/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "search_after": [ 59.9, "book_10086" ],
  "sort": [ { "price": "asc" }, { "_id": "asc" } ]
}`

const pitCode = `# 导出大量数据：PIT（point in time）固定一个数据快照视图
POST /books/_pit?keep_alive=2m
# -> 返回 { "id": "<pit_id>" }

# 配合 search_after + pit 翻页，保证翻页期间数据视图一致
GET /_search
{
  "size": 1000,
  "pit": { "id": "<pit_id>", "keep_alive": "2m" },
  "sort": [ { "_shard_doc": "asc" } ],
  "search_after": [ 123456 ]
}`

const bulkCode = `# bulk：一次请求批量写多条，省去逐条 HTTP 往返
POST /_bulk
{ "index": { "_index": "logs", "_id": "1" } }
{ "level": "ERROR", "msg": "db timeout", "ts": "2026-06-16T10:00:00Z" }
{ "index": { "_index": "logs", "_id": "2" } }
{ "level": "INFO",  "msg": "ok",         "ts": "2026-06-16T10:00:01Z" }
# 注意：每行是独立 JSON，行尾必须有换行，最后一行也要换行`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章末尾埋了个雷：<code>from + size</code> 翻到很深的页会变慢甚至报错。本章先把「深分页」这个高频面试题讲透，
          再顺势聊聊 Elasticsearch 的集群机制和经典的 ELK 日志方案——这些都是上了规模之后绕不开的话题。
        </p>
      </Lead>

      <h2>深分页：翻到第 1000 页为什么会炸</h2>
      <p>
        Elasticsearch 的数据分散在多个<em>shard</em>（分片）上。当你请求 <code>from=9990, size=10</code>（第 1000 页），
        协调节点并不能只让每个分片返回 10 条——因为它不知道全局排序后哪 10 条才是第 1000 页的。
        于是它必须让<strong>每个分片都返回前 10000 条</strong>，再在协调节点上汇总、重排，最后只取中间那 10 条扔掉其余。
      </p>
      <p>
        分片越多、翻得越深，要在内存里汇总排序的数据量就越夸张。为防止把节点打爆，Elasticsearch 设了一道闸：
        <code>index.max_result_window</code>，默认 <strong>10000</strong>。一旦 <code>from + size</code> 超过它，就直接报错。
        把它和上一卷「query then fetch」串起来理解会更透：深分页贵的是 query 阶段每个分片都要排出并返回 from+size 条 id+score，
        而不是 fetch 阶段——所以即便每页只要 10 条，跳到第 1000 页一样炸。
      </p>

      <Example title="第 1000 页：慢、然后报错">
        <p>
          假设一页 10 条，想直接跳到第 1000 页。下面这个请求会被 max_result_window 拦下：
        </p>
        <CodeBlock lang="json" title="深分页报错" code={deepPageCode} />
        <p>
          有人想着把 <code>max_result_window</code> 调大就完事，这是<strong>反模式</strong>：闸门是在保护你，调大只会把性能和内存问题往后拖，迟早雪崩。
        </p>
      </Example>

      <h3>三种正确姿势</h3>
      <p>
        解决思路是「不要跳页，只要往后翻」。常用三招：
        <strong>search_after</strong> 是游标式翻页，拿上一页最后一条的排序值作为下一页的起点，无状态、性能稳定，适合「下一页」式的无限滚动，
        但缺点是<strong>没法直接跳到任意页</strong>；
        <strong>scroll</strong> 会对数据建一个快照，适合一次性<strong>导出</strong>大量数据，但快照期间数据不更新、还占资源，已不推荐做实时翻页；
        现在官方更推荐 <strong>PIT（point in time）+ search_after</strong> 来做一致性导出，比 scroll 更轻、更灵活；
        而最该做的，其实是<strong>从产品上避免让用户跳到第 1000 页</strong>。
      </p>
      <CodeBlock lang="json" title="PIT + search_after 一致性导出" code={pitCode} />

      <KeyIdea title="为什么 search_after 不爆内存">
        <p>
          search_after 给每个分片的指令变成了「从排序值 X 之后取 N 条」，每个分片只需返回 <code>size</code> 条，协调节点也只汇总
          <code>分片数 × size</code> 条。无论翻到多深，单次开销都恒定，这就是它能稳定深翻的根本原因。代价是排序键必须<strong>全局唯一</strong>
          （否则会漏数据或重复），通常用业务字段加 <code>_id</code> 兜底。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别把 max_result_window 当解药">
        <p>
          面试里如果你回答「把 max_result_window 改大」，基本就挂了。正确的回答永远是：<strong>用 search_after 做游标翻页、用 PIT/scroll 做导出、
          从产品上禁止深度跳页</strong>。改窗口大小只是临时止血，治标不治本。
        </p>
      </Callout>

      <h2>集群：master 选举与防脑裂</h2>
      <p>
        Elasticsearch 天生是分布式的。集群里有几类<em>node role</em>（节点角色）：<strong>master 节点</strong>负责管理集群状态（建索引、分片分配等），
        <strong>data 节点</strong>负责存数据和查询，还有协调、ingest 等角色。生产上通常把角色<strong>拆开规划</strong>，让专用 master 节点轻装上阵，别被查询流量拖垮。
      </p>
      <p>
        集群随时要有一个 master，靠<strong>选举</strong>产生。最怕的事故叫<em>split brain</em>（脑裂）：网络分区时两边各选出一个 master，
        各写各的，数据就乱了。老版本靠手动配 <code>discovery.zen.minimum_master_nodes</code>（设为「候选 master 数 / 2 + 1」，即多数派）来防脑裂；
        7.x 之后选举机制重写为基于 Raft 思想的协议，这个值由集群<strong>自动管理</strong>（voting configuration），不再需要手动配，但「过半数才能选主」的多数派原理没变——
        所以候选 master 节点要配<strong>奇数个（3 或 5）</strong>，让任一网络分区都无法同时凑出两个多数派。
      </p>
      <p>
        集群状态（cluster state）由 master 维护并广播给所有节点，包含索引 mapping、分片分配表、节点列表等。
        它越大、变更越频繁，master 压力越大，这也是「别开太多小分片」「专用 master」这些建议的底层原因。
      </p>

      <Callout variant="info" title="分片分配与 rebalance">
        <p>
          节点上下线、副本增减时，master 会触发<strong>分片重分配（rebalance）</strong>，把分片搬到合适节点以保持均衡，
          并默认遵守「主副本不同机」「同一索引分片尽量分散」等约束。大规模搬迁会吃带宽和 IO，所以滚动重启节点时常会先
          <code>cluster.routing.allocation.enable: none</code> 暂停分配，重启完再打开，避免不必要的数据搬来搬去。
        </p>
      </Callout>

      <h2>ELK / EFK：日志方案</h2>
      <p>
        Elasticsearch 最广为人知的落地场景就是日志。经典组合叫 <em>ELK</em>：
        <strong>Elasticsearch</strong> 存储与检索、<strong>Logstash</strong> 采集与清洗、<strong>Kibana</strong> 可视化。
        但 Logstash 偏重、吃资源，现在更常用轻量的 <strong>Beats</strong>（如 Filebeat）做采集，这套就叫 <em>EFK</em>（Elasticsearch + Filebeat + Kibana）。
        典型链路是：应用打日志 → Beats 采集 → （可选 Logstash 加工） → Elasticsearch 存储 → Kibana 看板。
      </p>
      <p>
        日志这类时序数据有两个标配实践：一是<strong>按时间滚动索引</strong>（如 <code>logs-2026.06.16</code> 或用 data stream + rollover），
        删旧数据等于删一个索引、秒级完成；二是<strong>ILM（索引生命周期管理）</strong>，自动把数据从 hot 节点（SSD、可写）降到
        warm/cold（廉价存储、只读），过期自动删除，做冷热分层省成本。
      </p>
      <p>
        规模上来后还要做调优：<strong>写入侧</strong>用 <code>_bulk</code> 批量写、加大 <code>refresh_interval</code> 减少刷新频率、合理设分片数、灌数据时副本可临时设 0；
        <strong>查询侧</strong>把精确条件放 filter 吃缓存（上一章讲过）、避免深分页、用 <code>_source</code> 过滤按需返回字段。
      </p>
      <CodeBlock lang="json" title="bulk 批量写入" code={bulkCode} />

      <h2>实战 / 面试怎么答</h2>
      <p>
        深分页是最爱考的：先说<strong>原因</strong>（每个分片都要在 query 阶段取 from+size 条到协调节点汇总，深翻爆内存，max_result_window 默认 1 万兜底），
        再说<strong>解法</strong>（search_after 游标翻页、PIT/scroll 导出、产品上禁跳页）。
        集群题答到「master 管状态、多数派选举防脑裂、奇数候选主、新版自动管理」即可；ELK 题能说清四个组件分工、Beats 替代 Logstash 的原因、再带出按天滚动 + ILM 冷热分层就够了。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「为什么深分页慢？」</strong>——query 阶段每分片都排 from+size 条返回协调节点归并，与最终只要 10 条无关。
          </li>
          <li>
            <strong>误区：调大 max_result_window 解决深分页</strong>——反模式，治标不治本，正解是 search_after。
          </li>
          <li>
            <strong>「scroll 和 search_after 怎么选？」</strong>——实时翻页用 search_after（无状态），一致性导出用 PIT+search_after（替代 scroll）。
          </li>
          <li>
            <strong>误区：候选 master 配偶数或只配 1 个</strong>——奇数（3/5）才能稳妥防脑裂，单候选无高可用。
          </li>
        </ul>
      </Callout>

      <Practice title="用 search_after 翻页">
        <p>
          把跳页改成游标翻页：先发第一页拿到每条的 <code>sort</code> 值，再把<strong>最后一条</strong>的 sort 值塞进下一页的 <code>search_after</code>。
          注意排序键要全局唯一，这里用 <code>price</code> 加 <code>_id</code> 兜底。
        </p>
        <CodeBlock lang="json" title="search_after 翻页" code={searchAfterCode} />
        <p>
          连续翻几页，观察单次请求耗时是否始终稳定；再试着把第二个排序键 <code>_id</code> 去掉，看遇到价格相同的文档时会不会漏数据。
          想体会一致性导出，可以再跑一遍 PIT 那段，开一个 pit、配合 search_after 翻完，结束后记得 <code>DELETE /_pit</code> 释放。
        </p>
      </Practice>

      <Summary
        points={[
          '深分页慢的根因：from+size 时 query 阶段每个分片都要返回前 from+size 条到协调节点汇总重排，翻得越深内存压力越大。',
          'max_result_window 默认 1 万是保护性闸门，from+size 超过即报错；调大它是反模式，治标不治本。',
          '正确解法：search_after 做游标翻页（无状态、性能恒定但不能跳页）、PIT+search_after 做一致性导出、产品上避免深度跳页。',
          'search_after 排序键必须全局唯一，通常业务字段 + _id 兜底，否则漏数据或重复。',
          '集群里 master 管状态（cluster state）、data 存数据，靠多数派选举产生 master；防脑裂要奇数候选主，7.x 后自动管理。',
          '节点变动触发分片 rebalance，遵守主副本不同机等约束；滚动重启常先暂停分配避免无谓搬迁。',
          'ELK = ES + Logstash + Kibana；用轻量 Beats 替代 Logstash 即 EFK，是最经典的日志方案。',
          '时序数据按时间滚动索引 + ILM 冷热分层；写入用 bulk、调大 refresh、副本临时设 0，查询条件放 filter 吃缓存。',
        ]}
      />
    </>
  )
}

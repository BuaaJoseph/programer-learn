import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const explainCode = `GET /products/_search
{
  "explain": true,
  "query": {
    "match": { "title": "降噪耳机" }
  }
}`

const filterQueryCode = `GET /products/_search
{
  "query": {
    "bool": {
      "must":   { "match": { "title": "耳机" } },
      "filter": [
        { "term":  { "brand": "Acme" } },
        { "range": { "price": { "lte": 500 } } }
      ]
    }
  },
  "profile": true
}`

const boolFullCode = `# bool 的四个子句：must / should / must_not / filter
GET /products/_search
{
  "query": {
    "bool": {
      "must":     [ { "match": { "title": "耳机" } } ],   // 必须匹配，打分
      "should":   [ { "match": { "title": "降噪" } } ],   // 匹配加分，可不命中
      "must_not": [ { "term":  { "brand": "山寨" } } ],   // 必须不匹配，不打分
      "filter":   [ { "range": { "price": { "lte": 500 } } } ], // 必须满足，不打分可缓存
      "minimum_should_match": 1
    }
  }
}`

const searchAfterCode = `# 深分页别用 from+size，用 search_after 按上一页末尾的排序值翻页
GET /products/_search
{
  "size": 10,
  "sort": [ { "price": "asc" }, { "_id": "asc" } ],
  "search_after": [299.0, "1001"]
}`

const dfsCode = `# 数据少或要求严格一致时，用 dfs 先汇总全局词频再打分校正 IDF
GET /products/_search?search_type=dfs_query_then_fetch
{
  "query": { "match": { "title": "降噪耳机" } }
}`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          数据分散在多个分片上，一次搜索却要返回一个全局有序、按相关性排好的结果列表——这背后是一套精巧的
          两阶段流程，加上一个叫 <em>BM25</em> 的打分算法。搞懂「query then fetch」和相关性打分，
          才能解释「为什么这条排在前面」「为什么分布式打分有时会有点偏」这类问题。
        </p>
      </Lead>

      <h2>查询两阶段：query then fetch</h2>
      <p>
        一次搜索请求到了协调节点后，分两个阶段执行：
      </p>
      <ul>
        <li>
          <strong>query 阶段</strong>：协调节点把查询广播到所有相关分片，每个分片在<strong>本地</strong>执行查询，
          算出本地的 top-N 文档，但只返回这些文档的 <code>_id</code> 和 <code>_score</code>（打分），不返回完整内容。
        </li>
        <li>
          <strong>fetch 阶段</strong>：协调节点把各分片返回的 id+score <strong>汇总、重新排序</strong>，挑出全局真正的 top-N，
          再回头去对应分片<strong>拉取这些文档的完整 _source</strong>，组装成最终结果返回客户端。
        </li>
      </ul>
      <p>
        这样设计的好处是：query 阶段网络上只传轻量的 id 和 score，只有最终入选的少量文档才需要传完整内容，
        省了大量带宽。这也是「为什么深分页很贵」的根源——要拿第 10000 到 10010 条，每个分片都得在 query 阶段
        排出并返回前 10010 条的 id+score，协调节点再归并 N×10010 条，翻得越深内存和 CPU 开销越爆炸。
      </p>

      <Callout variant="warn" title="深分页：用 search_after 替代 from+size">
        <p>
          <code>from + size</code> 翻到很深时每个分片都要排序大量数据，默认上限 <code>from+size ≤ 10000</code>。
          正确做法是用 <strong>search_after</strong>：按上一页最后一条的排序值往后翻，每页代价恒定、不随页数增长；
          需要导出全量历史数据则用 <strong>PIT（point in time）+ search_after</strong> 或老的 scroll。
          记住一句话：<strong>翻页用 search_after，导数据用 PIT/scroll，永远别 from 一万往后跳。</strong>
        </p>
        <CodeBlock lang="json" title="search_after 翻页" code={searchAfterCode} />
      </Callout>

      <Example title="搜索结果是怎么排出来的">
        <p>用户搜「降噪耳机」，集群有 3 个分片，要返回前 10 条：</p>
        <ul>
          <li>query 阶段：每个分片各自算出本地相关性最高的 10 条，返回 30 组 id+score 给协调节点。</li>
          <li>协调节点把这 30 组按 <code>_score</code> 全局排序，取出真正的前 10。</li>
          <li>fetch 阶段：协调节点去这 10 条所在的分片拉完整文档，拼成结果返回。</li>
        </ul>
        <p>
          所以你看到的最终排序，是「各分片本地 top-N → 协调节点全局合并」两步合作的产物，不是某一台机器一次算完的。
        </p>
      </Example>

      <h2>相关性打分：BM25</h2>
      <p>
        每条结果旁边的 <code>_score</code> 衡量「这条文档和查询有多相关」，默认算法是 <em>BM25</em>。它主要看三个因素：
      </p>
      <ul>
        <li><strong>TF（词频，term frequency）</strong>：查询词在该文档里出现得越多，越相关——但有<strong>饱和</strong>，出现 100 次不会比 10 次相关 10 倍。</li>
        <li><strong>IDF（逆文档频率，inverse document frequency）</strong>：一个词在<strong>越少</strong>文档里出现，它越「稀有」、区分度越高，权重越大。比如「降噪」比「的」值钱得多。</li>
        <li><strong>字段长度（field length）</strong>：同样命中一次，短字段里的命中比长字段里的更相关——短文本里出现说明更聚焦。</li>
      </ul>
      <p>
        相比老的 TF-IDF，BM25 的关键改进是给 TF 加了<strong>饱和上限</strong>（用参数 k1 控制）和<strong>字段长度归一化</strong>
        （用参数 b 控制），避免「堆词刷分」和「长文档天然占便宜」。这也是为什么 ES 5.x 之后默认换成 BM25。
        如果业务想自己掌控排序，还能在查询里叠加 <code>function_score</code>（按销量、时间衰减、地理距离等调权）或
        直接用 <code>script_score</code> 写打分脚本——这是电商「相关性 + 业务权重」混排的常用手段。
      </p>

      <KeyIdea title="为什么分布式打分可能有偏差">
        <p>
          这是面试高阶考点：IDF 需要知道「全局有多少文档包含这个词」，但 query 阶段每个分片是用<strong>自己本地的
          文档统计</strong>来算 IDF 的，而不是全局统计。如果文档在各分片间分布不均，<strong>同一个词在不同分片算出的 IDF
          就不一样</strong>，导致同一文档的得分受所在分片影响，排序可能轻微失真。文档量大时这种偏差通常可忽略；
          数据少或要严格一致时，可以用 <code>dfs_query_then_fetch</code> 先汇总全局词频再打分来校正。
        </p>
        <CodeBlock lang="json" title="dfs_query_then_fetch 校正 IDF" code={dfsCode} />
      </KeyIdea>

      <h2>filter 和 query：打不打分的区别</h2>
      <p>
        bool 查询里的 <code>query</code>（如 <code>must</code>）和 <code>filter</code> 看着像，性质却完全不同：
      </p>
      <ul>
        <li><strong>query 上下文</strong>：要计算相关性 <code>_score</code>，回答「有多匹配」，适合全文检索那一部分。</li>
        <li><strong>filter 上下文</strong>：只判断「符不符合」这个是非题，<strong>不打分</strong>，因此结果可以被<strong>缓存</strong>（filter cache，按 bitset 缓存哪些文档命中），重复查同样的过滤条件极快。</li>
      </ul>
      <p>
        顺手把 bool 的四个子句一次记全：<code>must</code>（必须匹配、打分）、<code>should</code>（匹配则加分、可用
        <code>minimum_should_match</code> 控制至少命中几个）、<code>must_not</code>（必须不匹配、不打分）、
        <code>filter</code>（必须满足、不打分可缓存）。这是日常写得最多的查询骨架。
      </p>
      <CodeBlock lang="json" title="bool 四子句全貌" code={boolFullCode} />

      <Callout variant="warn" title="能用 filter 就别用 query">
        <p>这是最实用的查询调优原则之一：</p>
        <ul>
          <li>精确匹配、范围、状态过滤这类「是非题」（品牌等于某值、价格小于某数）→ 放进 <code>filter</code>，不打分还能缓存。</li>
          <li>真正需要相关性排序的全文部分（标题里有没有「降噪耳机」）→ 才放进 <code>query</code>。</li>
          <li>把过滤条件错放进 query，既白白浪费打分计算，又享受不到缓存，是常见的性能浪费。</li>
        </ul>
      </Callout>

      <h2>聚合也走分片再归并</h2>
      <p>
        把视角从「搜文档」扩到「做统计」：聚合（aggregation）同样是<strong>各分片本地算、协调节点归并</strong>。
        但这里藏着一个经典坑——<strong>terms 聚合的「前 N 名」可能不准</strong>。比如要「销量 top 10 品牌」，
        每个分片只把自己本地的 top 若干名报上来归并，某个全局第 9 的品牌如果在每个分片都排在十名开外、没被报上来，
        最终就被漏掉了。返回里的 <code>doc_count_error_upper_bound</code> 就是在提示这种误差，可调大 <code>shard_size</code> 缓解。
        这正好和上一卷「doc values 服务聚合」、本章「query then fetch」两条线接上了。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「ES 查询流程」，答 <em>query then fetch 两阶段：各分片本地查 top-N 只返回 id+score，协调节点汇总排序后再
        fetch 取完整文档</em>。被追问「相关性怎么算」，落到 <em>BM25 看 TF（带饱和）、IDF（越稀有越值钱）、字段长度</em>，
        再主动抛出「分布式 IDF 是分片本地统计、可能有偏差，可用 dfs 校正」这个加分点。
        最后补一句「filter 不打分可缓存、query 打分」「深分页用 search_after」，整章逻辑就闭环了。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「为什么要两阶段？」</strong>——query 阶段只传 id+score 省带宽，最终入选才 fetch 完整文档。
          </li>
          <li>
            <strong>误区：from+size 随便翻几万页</strong>——每分片都要排 from+size 条再归并，深分页极贵，用 search_after。
          </li>
          <li>
            <strong>「BM25 比 TF-IDF 好在哪？」</strong>——TF 饱和 + 字段长度归一化，防堆词刷分和长文档占便宜。
          </li>
          <li>
            <strong>误区：以为 terms 聚合的 top N 一定准</strong>——分片各报本地 top 再归并可能漏，看 doc_count_error、调 shard_size。
          </li>
        </ul>
      </Callout>

      <Practice title="用 explain 看打分、用 profile 看耗时">
        <p>
          给查询加 <code>explain: true</code>，能看到每条结果的 <code>_score</code> 是怎么由 TF、IDF、字段长度
          一步步算出来的。再用 <code>profile: true</code> 看查询在各分片、各阶段分别花了多少时间，定位慢在哪。
        </p>
        <CodeBlock lang="json" title="用 explain 看打分细节" code={explainCode} />
        <CodeBlock lang="json" title="filter + query 并用 profile 看耗时" code={filterQueryCode} />
        <p>
          再把查询换成 bool 四子句那段，对比 <code>must</code> 命中加分、<code>filter</code> 不影响 <code>_score</code> 的差别；
          以及把同一个过滤条件分别放 <code>must</code> 和 <code>filter</code>，用 profile 看后者是否更快（命中 filter cache）。
        </p>
      </Practice>

      <Summary
        points={[
          '查询走 query then fetch 两阶段：分片本地查 top-N 返回 id+score，协调节点汇总排序后再 fetch 完整文档。',
          'query 阶段只传轻量 id+score，只有最终入选文档才拉完整 _source，省带宽。',
          '深分页贵在每分片都要排 from+size 条再归并，应改用 search_after，导数据用 PIT/scroll。',
          '相关性默认用 BM25：TF（带饱和 k1）、IDF（越稀有越值钱）、字段长度归一化（b），优于老 TF-IDF。',
          '可用 function_score / script_score 叠加业务权重（销量、时间衰减、距离）做相关性混排。',
          '分布式打分可能有偏差：IDF 用分片本地统计，分布不均时排序会轻微失真，可用 dfs 校正。',
          'bool 四子句：must（匹配打分）、should（加分）、must_not（排除不打分）、filter（过滤不打分可缓存）。',
          '聚合同样分片本地算再归并，terms 的 top N 可能不准，看 doc_count_error、调 shard_size。',
        ]}
      />
    </>
  )
}

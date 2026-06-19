import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const catIndicesCode = `# 查看集群里所有索引（health/status/文档数/占用空间一目了然）
GET _cat/indices?v

# 查看节点
GET _cat/nodes?v`

const createIndexCode = `# 创建一个商品索引，并定义字段类型（mapping）
PUT /products
{
  "mappings": {
    "properties": {
      "title":  { "type": "text" },
      "brand":  { "type": "keyword" },
      "price":  { "type": "double" },
      "stock":  { "type": "integer" }
    }
  }
}`

const indexDocCode = `# 索引（写入）一条文档，文档 id 指定为 1001
PUT /products/_doc/1001
{
  "title": "Apple iPhone 15 Pro 钛金属",
  "brand": "Apple",
  "price": 8999,
  "stock": 120
}

# 立刻按 id 取回这条文档
GET /products/_doc/1001`

const clusterHealthCode = `# 查看集群健康：green/yellow/red 一眼定生死
GET _cluster/health

# 典型返回（截取关键字段）
{
  "status": "green",            // green=主副本都齐；yellow=副本缺；red=主分片缺，数据不全
  "number_of_nodes": 3,
  "active_primary_shards": 5,
  "active_shards": 10,          // 主+副本
  "unassigned_shards": 0
}`

const searchVsGetCode = `# 全文搜索：拆词 + 相关性打分，返回 _score
GET /products/_search
{
  "query": {
    "match": { "title": "苹果手机" }
  }
}

# 对比：按 id 精确取回，不打分、不分词，是 KV 读取
GET /products/_doc/1001`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          在电商里搜「苹果手机」、在运维平台里翻几个 T 的日志找一条报错——这些场景如果直接用
          MySQL，往往慢到无法忍受。<em>Elasticsearch</em>（简称 ES）就是为「在海量文本里快速找东西、还能顺便统计分析」
          而生的工具。这一章先把它是什么、为什么快讲清楚，后面几章再拆开看原理。
        </p>
      </Lead>

      <h2>ES 到底是什么</h2>
      <p>
        一句话定位：ES 是一个<strong>分布式的搜索与分析引擎</strong>。它底层基于 <em>Lucene</em>（一个成熟的全文检索库），
        在外面包了一层分布式能力和一套 <em>RESTful</em> 接口——也就是说，你不需要写 SQL，也不需要专门的客户端，
        直接用 HTTP 发 JSON 就能建索引、写数据、做查询。
      </p>
      <p>
        把它拆成三个关键词来记：<strong>分布式</strong>（数据切片散在多台机器上，能横向扩容、能容灾）、
        <strong>搜索</strong>（核心是全文检索，靠倒排索引做到毫秒级返回）、
        <strong>分析</strong>（聚合 aggregation，能像 SQL 的 group by 一样做统计）。面试里被问「ES 是什么」，
        把这三点说全就够了。
      </p>
      <p>
        再往下抠一层「分层架构」会让记忆更牢：最底层是 <strong>Lucene</strong>，它管的是单机上一个目录里的倒排索引、
        段（segment）文件、打分公式；往上一层是 ES 的<strong>分片（shard）</strong>，一个 Lucene 索引实例就是一个分片；
        再往上把多个分片组织成一个<strong>索引（index）</strong>，并通过路由决定文档落在哪个分片；最外层是
        <strong>集群（cluster）</strong>，由多个节点（node）组成，负责分片的分配、副本的同步和故障转移。
        理解了这条「Lucene → 分片 → 索引 → 集群」的链路，后面几章的所有概念都能挂到这棵树上。
      </p>

      <Example title="把 ES 的概念对到关系库术语上">
        <p>初学时用熟悉的词做锚点会快很多，但要记住只是「类比」不是「等价」：</p>
        <table>
          <thead>
            <tr><th>关系型数据库</th><th>Elasticsearch</th><th>注意点</th></tr>
          </thead>
          <tbody>
            <tr><td>Database / Table</td><td>Index</td><td>ES 早期有 type，7.x 起一个 index 只一个 type，8.x 彻底移除</td></tr>
            <tr><td>Row</td><td>Document（JSON）</td><td>文档是 schema-flexible 的，但有 mapping 约束</td></tr>
            <tr><td>Column</td><td>Field</td><td>同一字段可有多种 type（如 text + keyword 的 multi-field）</td></tr>
            <tr><td>Schema</td><td>Mapping</td><td>mapping 一旦定型，已有字段类型不可改，只能 reindex</td></tr>
            <tr><td>SQL</td><td>Query DSL（JSON）</td><td>查询也是 JSON，靠 HTTP body 传</td></tr>
            <tr><td>Index（B+ 树）</td><td>Inverted Index（倒排）</td><td>本质完全不同，下一章细讲</td></tr>
          </tbody>
        </table>
      </Example>

      <h3>为什么数据库不适合全文检索</h3>
      <p>
        关系型数据库当然也能搜文本，写法是 <code>WHERE title LIKE '%手机%'</code>。但它有两个致命问题。
        第一，<code>LIKE '%x%'</code> 这种前面带通配符的查询<strong>用不上 B+ 树索引</strong>，只能逐行扫描全表，
        数据一多就慢得离谱。第二，数据库只会告诉你「匹配 / 不匹配」，
        <strong>没法按相关性排序</strong>——它不知道哪条结果更符合「苹果手机」这个意图。
      </p>
      <p>
        而搜索引擎天生就解决这两件事：它把文本提前切成词、建好倒排索引，查的时候直接拿词去定位文档；
        同时还会给每条结果算一个相关性得分（score），把最相关的排在前面。
      </p>
      <p>
        这里要说清「为什么 B+ 树救不了全文检索」：B+ 树索引是按字段值的<strong>整体有序</strong>来组织的，
        适合「前缀匹配」和「范围查找」（如 <code>title LIKE '手机%'</code> 或 <code>price &gt; 100</code>），
        因为有序结构能二分定位起点。但 <code>'%手机%'</code> 要找的是「值的中间某处包含某子串」，
        有序性帮不上忙，只能挨个比对。倒排索引换了个思路：它索引的不是「字段值」而是「字段值切出来的每一个词」，
        于是「包含某词」这件事本身就被预先算好了。
      </p>

      <Example title="同样搜「苹果手机」，两条路差在哪">
        <p>用 MySQL：</p>
        <ul>
          <li>
            <code>SELECT * FROM products WHERE title LIKE '%苹果手机%'</code> ——全表扫描，
            而且「苹果 手机」「手机 苹果」「iphone」这些变体都搜不到，结果也没有先后之分。
          </li>
        </ul>
        <p>用 ES：</p>
        <ul>
          <li>
            先把「Apple iPhone 15 Pro」拆成词建好倒排索引；搜「苹果手机」时拆成「苹果」「手机」两个词去查，
            命中的文档按相关性打分排序——卖得最对版的那台手机自然排在第一。
          </li>
        </ul>
        <CodeBlock lang="json" title="ES 的搜索 vs 精确取回" code={searchVsGetCode} />
        <p>
          注意两者的返回差异：<code>_search</code> 返回的每条命中都带 <code>_score</code>（相关性得分），
          结果默认按分降序；而 <code>_doc/1001</code> 是按主键直取，是一次 KV 读，根本不参与打分。
          这正是「搜索」和「查询」在 ES 里的分野。
        </p>
      </Example>

      <KeyIdea title="快的根源：先建索引，再查索引">
        <p>
          ES 快不是因为机器多，而是因为它<strong>把活儿提前干了</strong>：写入时就把文本分词、建成
          <em>inverted index</em>（倒排索引），查询时不再扫原文，而是直接查这张「词 → 文档」的表。
          这就像查字典——你不会一页页翻，而是先看部首索引直接跳到那一页。倒排索引的细节是下一章的主角。
        </p>
        <p>
          这也解释了 ES 的一个本质权衡：<strong>写入时多花的力气，换查询时省的力气</strong>。
          写一条文档要分词、更新倒排表、刷段、合并段，比数据库 INSERT 重；但换来的是查询时不用扫原文。
          所以 ES 是典型的「读多写少 / 读重于写」场景的利器，反过来如果你的业务是超高频写、几乎不搜，ES 并不划算。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="ES 不是数据库的替代品">
        <p>
          别把 ES 当主库用。它有几个要注意的点：
        </p>
        <ul>
          <li>
            <strong>近实时（NRT）</strong>——写入的数据默认要约 1 秒（refresh）后才搜得到，不是写完立刻可见。
          </li>
          <li>
            <strong>不擅长强事务</strong>——没有跨文档的 ACID 事务，不适合做转账这类强一致场景。
          </li>
          <li>
            <strong>不适合频繁更新</strong>——更新文档本质是「标记删除旧的 + 新写一条」，高频更新会产生大量待合并的段。
          </li>
          <li>
            <strong>深分页代价大</strong>——<code>from + size</code> 翻到很深时每个分片都要排序大量数据，要改用
            <code>search_after</code> 或 scroll。
          </li>
          <li>
            常见架构是：MySQL 当权威数据源，再把需要搜索的数据同步一份到 ES，各司其职。
          </li>
        </ul>
      </Callout>

      <h2>从一次请求看 ES 的全貌</h2>
      <p>
        把「一切皆 HTTP」具体化：你对着任意一个节点发 <code>GET /products/_search</code>，那个节点就成了本次请求的
        <strong>协调节点（coordinating node）</strong>。它先根据索引的分片信息，把查询<strong>广播到该索引的所有分片</strong>
        （主副本里挑一个）；每个分片在本地用倒排索引算出 top-N 候选和它们的 <code>_score</code>，把结果回传；
        协调节点再做一次<strong>归并排序</strong>（merge），拿到全局 top-N 的文档 id，最后回到对应分片把文档原文取回来拼成结果。
        这套「分发-本地算-归并」就是 ES 分布式查询的骨架，后面 query then fetch 一章会拆得更细。
      </p>
      <p>
        写入也是类似的两段式：文档先按路由公式 <code>shard = hash(_routing) % number_of_primary_shards</code>
        定位到某个主分片，主分片写成功后并行同步给它的副本分片，多数副本确认后才返回成功。这保证了即使一台机器宕机，
        副本上还有一份完整数据——这就是集群「容灾」的来源。
      </p>

      <Callout variant="info" title="green / yellow / red 是体检报告">
        <p>
          集群健康只有三种颜色，背下来在排障时极有用：<strong>green</strong> 所有主分片和副本都已分配；
          <strong>yellow</strong> 主分片都在但有副本没分配（数据没丢，只是少了冗余，单节点测试环境很常见）；
          <strong>red</strong> 有主分片没分配，意味着<strong>部分数据当前不可读写</strong>，是真正的事故。
          看到 yellow 不用慌，看到 red 要立刻查节点和分片分配。
        </p>
        <CodeBlock lang="json" title="集群健康速查" code={clusterHealthCode} />
      </Callout>

      <h2>它都用在哪些场景</h2>
      <p>
        理解了优势，场景就很自然了。其一是<strong>全文搜索</strong>：电商商品搜索、站内搜索、文档检索，
        要的就是分词 + 相关性排序。其二是<strong>日志分析</strong>：这就是大名鼎鼎的 ELK 栈
        （Elasticsearch + Logstash + Kibana），把服务器日志全收进 ES，再用 Kibana 可视化、按关键词秒级检索。
        其三是<strong>指标聚合分析</strong>：靠 aggregation 做实时统计，比如「最近一小时各接口的错误数 top 10」。
      </p>
      <p>
        还有两个容易被忽略但很主流的场景：<strong>地理位置检索</strong>（geo_point / geo_shape，做「附近的商家」）
        和<strong>向量检索 / 语义搜索</strong>（dense_vector + kNN，做以图搜图、RAG 召回）。后者这几年随着大模型起来，
        让 ES 同时具备「关键词搜」和「语义搜」的能力，混合检索（hybrid search）成了新热点。
      </p>

      <Example title="一个真实日志场景的取舍">
        <p>
          某团队把全站访问日志（每天约 2 亿条）写进 ES 做实时排障。他们踩过的坑很有代表性：
          一开始按「一个大索引存所有日志」，结果索引膨胀到数 TB，删旧数据极慢、查询也越来越卡。
          后来改成<strong>按天滚动索引</strong>（<code>logs-2026.06.16</code> 这种），配合 ILM（索引生命周期管理）
          自动把 7 天前的索引降冷、30 天前的删除——删一天数据就是删一个索引，秒级完成，查询也只命中相关日期的索引。
          这就是「时序数据按时间分索引」的经典实践，和电商商品索引那种「长期一个索引」的玩法完全不同。
        </p>
      </Example>

      <h3>面试怎么答</h3>
      <p>
        被问「为什么选 ES 而不是 MySQL 做搜索」，按这个逻辑讲：MySQL 的 <code>LIKE '%x%'</code>
        全表扫描且无法相关性排序 → ES 用倒排索引把「查原文」变成「查词」，毫秒级返回还能按 score 排序 →
        再补一句它分布式可扩展、支持聚合分析，所以同时扛得住全文搜索、日志（ELK）和指标统计三类需求。
        最后点一句「ES 是近实时、不做强事务，通常和主库配合用」，分寸感就有了。
      </p>

      <Callout variant="info" title="面试追问与常见误区">
        <ul>
          <li>
            <strong>「ES 是数据库吗？」</strong>——它能存数据，但定位是搜索/分析引擎，缺事务、近实时、不宜当唯一权威源，
            标准答案是「能存但不当主库用」。
          </li>
          <li>
            <strong>误区：ES 写完马上能搜到</strong>——默认有约 1 秒的 refresh 间隔，这是近实时的代价，不是 bug。
          </li>
          <li>
            <strong>误区：分片越多越快</strong>——分片过多会带来元数据和归并开销，反而拖慢；分片数还和数据量、节点数挂钩。
          </li>
          <li>
            <strong>「ES 和 Solr 的区别？」</strong>——两者都基于 Lucene，ES 在分布式、易用性、生态（ELK）上更占优，
            现在是事实标准。
          </li>
        </ul>
      </Callout>

      <Practice title="动手发三条 REST 命令">
        <p>
          在 Kibana 的 Dev Tools 里（或者用 curl）依次执行下面三步：先看集群有哪些索引，再建一个商品索引，
          最后写入并取回一条文档。亲手跑一遍，你就摸到 ES「一切皆 HTTP + JSON」的手感了。
        </p>
        <CodeBlock lang="bash" title="1. 查看现有索引" code={catIndicesCode} />
        <CodeBlock lang="json" title="2. 创建索引并定义 mapping" code={createIndexCode} />
        <CodeBlock lang="json" title="3. 索引一条文档并取回" code={indexDocCode} />
        <p>
          跑完第三步后，再执行一次 <code>GET _cat/indices?v</code>，你会看到 <code>products</code> 索引的
          <code>docs.count</code> 变成了 1。这就是「写入即建索引」的直观证据。再顺手跑一次
          <code>GET _cluster/health</code> 看看颜色——单节点环境下你大概率会看到 yellow（副本没地方放），这正常。
        </p>
      </Practice>

      <Summary
        points={[
          'ES 是基于 Lucene 的分布式搜索与分析引擎，对外是 RESTful 接口，发 JSON 即可建索引、写数据、查询。',
          '分层记忆：Lucene → 分片 shard → 索引 index → 集群 cluster，后面所有概念都挂在这条链上。',
          '数据库不适合全文检索：LIKE %x% 走不了 B+ 树索引要全表扫描，且无法按相关性排序。',
          'ES 的核心优势是倒排索引（毫秒级查词）、近实时、分布式可扩展、以及聚合分析能力。',
          '本质权衡：写入时多干活（分词建索引），换查询时省力，适合读重于写的场景。',
          '一次查询走「协调节点广播 → 各分片本地算 → 归并 top-N」；写入按路由定位主分片再同步副本。',
          '集群健康 green/yellow/red：green 全齐、yellow 缺副本、red 缺主分片有数据不可用。',
          '典型场景：全文搜索、日志分析（ELK，常按天滚动索引 + ILM）、聚合统计、地理与向量检索。',
          'ES 是近实时、不做强事务、不宜频繁更新、深分页代价大，不能替代主库，常与 MySQL 配合使用。',
        ]}
      />
    </>
  )
}

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
      </Example>

      <KeyIdea title="快的根源：先建索引，再查索引">
        <p>
          ES 快不是因为机器多，而是因为它<strong>把活儿提前干了</strong>：写入时就把文本分词、建成
          <em>inverted index</em>（倒排索引），查询时不再扫原文，而是直接查这张「词 → 文档」的表。
          这就像查字典——你不会一页页翻，而是先看部首索引直接跳到那一页。倒排索引的细节是下一章的主角。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="ES 不是数据库的替代品">
        <p>
          别把 ES 当主库用。它有几个要注意的点：
        </p>
        <ul>
          <li>
            <strong>近实时（NIR）</strong>——写入的数据默认要约 1 秒（refresh）后才搜得到，不是写完立刻可见。
          </li>
          <li>
            <strong>不擅长强事务</strong>——没有跨文档的 ACID 事务，不适合做转账这类强一致场景。
          </li>
          <li>
            常见架构是：MySQL 当权威数据源，再把需要搜索的数据同步一份到 ES，各司其职。
          </li>
        </ul>
      </Callout>

      <h2>它都用在哪些场景</h2>
      <p>
        理解了优势，场景就很自然了。其一是<strong>全文搜索</strong>：电商商品搜索、站内搜索、文档检索，
        要的就是分词 + 相关性排序。其二是<strong>日志分析</strong>：这就是大名鼎鼎的 ELK 栈
        （Elasticsearch + Logstash + Kibana），把服务器日志全收进 ES，再用 Kibana 可视化、按关键词秒级检索。
        其三是<strong>指标聚合分析</strong>：靠 aggregation 做实时统计，比如「最近一小时各接口的错误数 top 10」。
      </p>

      <h3>面试怎么答</h3>
      <p>
        被问「为什么选 ES 而不是 MySQL 做搜索」，按这个逻辑讲：MySQL 的 <code>LIKE '%x%'</code>
        全表扫描且无法相关性排序 → ES 用倒排索引把「查原文」变成「查词」，毫秒级返回还能按 score 排序 →
        再补一句它分布式可扩展、支持聚合分析，所以同时扛得住全文搜索、日志（ELK）和指标统计三类需求。
        最后点一句「ES 是近实时、不做强事务，通常和主库配合用」，分寸感就有了。
      </p>

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
          <code>docs.count</code> 变成了 1。这就是「写入即建索引」的直观证据。
        </p>
      </Practice>

      <Summary
        points={[
          'ES 是基于 Lucene 的分布式搜索与分析引擎，对外是 RESTful 接口，发 JSON 即可建索引、写数据、查询。',
          '数据库不适合全文检索：LIKE %x% 走不了索引要全表扫描，且无法按相关性排序。',
          'ES 的核心优势是倒排索引（毫秒级查词）、近实时、分布式可扩展、以及聚合分析能力。',
          '典型场景三类：全文搜索（商品/站内）、日志分析（ELK 栈）、指标聚合统计。',
          'ES 是近实时、不做强事务，不能替代主库，常与 MySQL 配合使用。',
          '一切皆 HTTP：_cat/indices 看索引、PUT 建索引与 mapping、PUT _doc 写文档，是上手三件套。',
        ]}
      />
    </>
  )
}

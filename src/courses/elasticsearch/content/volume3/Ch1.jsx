import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import QueryDsl from '@/courses/elasticsearch/illustrations/QueryDsl.jsx'

const matchVsTermCode = `# match：会对查询词分词，走全文检索
GET /books/_search
{
  "query": {
    "match": { "title": "Elasticsearch 实战" }
  }
}

# term：不分词、精确匹配。注意：对 text 字段几乎查不到！
GET /books/_search
{
  "query": {
    "term": { "title": "Elasticsearch 实战" }
  }
}`

const boolCode = `GET /books/_search
{
  "query": {
    "bool": {
      "must":   [ { "match": { "title": "Elasticsearch" } } ],
      "filter": [
        { "term":  { "status": "on_sale" } },
        { "range": { "price": { "gte": 30, "lte": 100 } } }
      ],
      "must_not": [ { "term": { "tag": "deprecated" } } ],
      "should":  [ { "match": { "intro": "入门" } } ]
    }
  },
  "sort": [ { "price": "asc" } ],
  "from": 0,
  "size": 10
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          会写 Query DSL，是面试 Elasticsearch 绕不过去的一关。它本质上就是一坨 JSON：你把「想查什么、怎么过滤、怎么排序、要第几页」描述清楚，
          扔给 <code>_search</code> 接口。本章把最常用的几个查询子句一次讲透，再用一个真实例子把它们拼起来。
        </p>
      </Lead>

      <h2>两种上下文：query 与 filter</h2>
      <p>
        理解 Query DSL，第一件事是分清<strong>查询上下文</strong>（query context）和<strong>过滤上下文</strong>（filter context）。
        放在 query 里的子句，会计算一个<em>relevance score</em>（相关性得分，字段名 <code>_score</code>），用来回答「这条结果跟我搜的有多像」；
        而放在 filter 里的子句，只回答「符不符合条件」这个是非题，<strong>不打分</strong>。
      </p>
      <p>
        差别带来两个后果：一是 filter 不参与算分，开销更小；二是 filter 的结果可以被 Elasticsearch <strong>缓存</strong>（filter cache），
        同样的过滤条件再来一次几乎是白嫖。所以经验法则是：凡是「精确的、不需要打分的」条件（状态、分类、价格区间、时间范围），统统塞进 filter。
      </p>

      <h3>match：分词的全文检索</h3>
      <p>
        <em>match</em> 是最常用的全文查询。它会先把你的查询词<strong>分词</strong>，再拿这些词去倒排索引里找。
        搜「Elasticsearch 实战」，会被切成 elasticsearch、实、战 之类的词项，命中包含这些词的文档，并按相关性打分。
      </p>

      <h3>term：精确不分词（坑最多）</h3>
      <p>
        <em>term</em> 是精确匹配，<strong>不分词</strong>，要求字段里存的词项和你给的值<strong>一模一样</strong>。
        它的经典坑：对 <code>text</code> 类型字段用 term 往往查不到。因为 text 字段在写入时已经被分词、转小写存进了倒排索引，
        而 term 拿你原样的「Elasticsearch 实战」去比，自然对不上。要精确匹配，应该用 <code>keyword</code> 类型字段（比如 <code>title.keyword</code>）。
      </p>

      <h3>match_phrase 与 range</h3>
      <p>
        <em>match_phrase</em> 是短语查询：不仅词都要在，<strong>顺序和相邻关系</strong>也要对，搜「数据 结构」不会命中「结构化数据」。
        <em>range</em> 则是范围查询，配合 <code>gte</code>/<code>lte</code>/<code>gt</code>/<code>lt</code> 做数字、日期的区间过滤，是 filter 里的常客。
      </p>

      <Example title="按标题搜 + 价格过滤 + 排序">
        <p>
          假设有个图书库，需求是：标题相关于「Elasticsearch」、价格在 30 到 100 之间、在售、按价格升序排，取第一页。
          这正是 query（标题打分）和 filter（价格、状态）分工的典型场景。先看 match 和 term 的区别：
        </p>
        <CodeBlock lang="json" title="match vs term" code={matchVsTermCode} />
        <p>
          上面第二个 term 查询，因为 <code>title</code> 是 text 字段，几乎查不到东西——这是面试和实战里最常见的翻车点。
        </p>
      </Example>

      <QueryDsl />

      <KeyIdea title="bool 是把积木拼起来的胶水">
        <p>
          复杂查询几乎都靠 <em>bool</em> 组合而成，它有四个槽：<strong>must</strong>（必须满足，参与打分）、
          <strong>should</strong>（满足则加分，类似 OR）、<strong>filter</strong>（必须满足，不打分可缓存）、
          <strong>must_not</strong>（必须不满足，不打分）。一句话记忆：要打分用 must/should，要过滤用 filter/must_not。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="term 打到 text 字段的坑">
        <p>
          最高频的事故：拿 term 去查一个 text 字段却始终空结果。排查口诀是——<strong>需要精确匹配，就建 keyword 字段；需要全文搜，就用 match</strong>。
          如果一个字段两种都要，Elasticsearch 默认会给 text 字段加一个 <code>.keyword</code> 子字段，term 时记得查 <code>字段名.keyword</code>。
        </p>
      </Callout>

      <h2>分页与聚合</h2>
      <p>
        分页用 <code>from</code>（跳过多少条）和 <code>size</code>（取多少条）。注意 <code>from + size</code> 不能太大，
        翻到很深的页会有严重的性能和内存问题，这个「深分页」坑下一章专门讲。
        至于<em>aggregations</em>（聚合），是 Elasticsearch 做统计分析的能力，比如按分类算每类有多少本书、平均价多少，
        相当于 SQL 的 <code>GROUP BY</code> 加聚合函数，这里先知道有这么个东西即可。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「query 和 filter 有什么区别」，标准答法是三句：<strong>query 算相关性得分、filter 不算；filter 结果可缓存所以更快；
        所以精确过滤条件应放 filter，需要相关性排序的才放 query</strong>。
        再追问 match 和 term，就强调「match 分词走全文、term 不分词要精确，term 别打到 text 字段」。这样基本就稳了。
      </p>

      <Practice title="拼一个完整的 bool 查询">
        <p>
          把本章学的子句组合起来：标题用 match 参与打分，价格 range、状态 term 放进 filter，排除废弃标签用 must_not，
          再加一个 should 给「入门」类目加点分，最后按价格升序、取第一页。
        </p>
        <CodeBlock lang="json" title="bool + filter + sort" code={boolCode} />
        <p>
          试着把 <code>title</code> 的 match 改成 term，观察结果如何变空；再把 range 从 filter 挪到 must，体会 <code>_score</code> 是否还有意义。
        </p>
      </Practice>

      <Summary
        points={[
          'query 上下文算相关性得分（_score），filter 上下文只判断是否符合、不打分且结果可缓存，精确过滤条件应放 filter。',
          'match 会分词、走全文检索；term 不分词、要求精确匹配，最大的坑是对 text 字段几乎查不到，需用 keyword 字段。',
          'match_phrase 是短语查询，要求词项顺序与相邻；range 配合 gte/lte 做数字、日期范围，是 filter 的常客。',
          'bool 用 must/should/filter/must_not 四个槽组合查询：要打分用 must/should，要过滤用 filter/must_not。',
          '分页用 from/size，但深分页有性能问题（下一章详述）；聚合 aggregations 负责统计分析，相当于 SQL 的 GROUP BY。',
          '面试核心三连：query 打分、filter 不打分可缓存、所以精确条件放 filter——再补一句 term 别打 text 字段即可拿分。',
        ]}
      />
    </>
  )
}

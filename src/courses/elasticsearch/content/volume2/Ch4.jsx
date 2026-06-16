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
        省了大量带宽。
      </p>

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

      <KeyIdea title="为什么分布式打分可能有偏差">
        <p>
          这是面试高阶考点：IDF 需要知道「全局有多少文档包含这个词」，但 query 阶段每个分片是用<strong>自己本地的
          文档统计</strong>来算 IDF 的，而不是全局统计。如果文档在各分片间分布不均，<strong>同一个词在不同分片算出的 IDF
          就不一样</strong>，导致同一文档的得分受所在分片影响，排序可能轻微失真。文档量大时这种偏差通常可忽略；
          数据少或要严格一致时，可以用 <code>dfs_query_then_fetch</code> 先汇总全局词频再打分来校正。
        </p>
      </KeyIdea>

      <h2>filter 和 query：打不打分的区别</h2>
      <p>
        bool 查询里的 <code>query</code>（如 <code>must</code>）和 <code>filter</code> 看着像，性质却完全不同：
      </p>
      <ul>
        <li><strong>query 上下文</strong>：要计算相关性 <code>_score</code>，回答「有多匹配」，适合全文检索那一部分。</li>
        <li><strong>filter 上下文</strong>：只判断「符不符合」这个是非题，<strong>不打分</strong>，因此结果可以被<strong>缓存</strong>，重复查同样的过滤条件极快。</li>
      </ul>

      <Callout variant="warn" title="能用 filter 就别用 query">
        <p>这是最实用的查询调优原则之一：</p>
        <ul>
          <li>精确匹配、范围、状态过滤这类「是非题」（品牌等于某值、价格小于某数）→ 放进 <code>filter</code>，不打分还能缓存。</li>
          <li>真正需要相关性排序的全文部分（标题里有没有「降噪耳机」）→ 才放进 <code>query</code>。</li>
          <li>把过滤条件错放进 query，既白白浪费打分计算，又享受不到缓存，是常见的性能浪费。</li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「ES 查询流程」，答 <em>query then fetch 两阶段：各分片本地查 top-N 只返回 id+score，协调节点汇总排序后再
        fetch 取完整文档</em>。被追问「相关性怎么算」，落到 <em>BM25 看 TF、IDF、字段长度</em>，
        再主动抛出「分布式 IDF 是分片本地统计、可能有偏差，可用 dfs 校正」这个加分点。
        最后补一句「filter 不打分可缓存、query 打分」，整章逻辑就闭环了。
      </p>

      <Practice title="用 explain 看打分、用 profile 看耗时">
        <p>
          给查询加 <code>explain: true</code>，能看到每条结果的 <code>_score</code> 是怎么由 TF、IDF、字段长度
          一步步算出来的。再用 <code>profile: true</code> 看查询在各分片、各阶段分别花了多少时间，定位慢在哪。
        </p>
        <CodeBlock lang="json" title="用 explain 看打分细节" code={explainCode} />
        <CodeBlock lang="json" title="filter + query 并用 profile 看耗时" code={filterQueryCode} />
      </Practice>

      <Summary
        points={[
          '查询走 query then fetch 两阶段：分片本地查 top-N 返回 id+score，协调节点汇总排序后再 fetch 完整文档。',
          'query 阶段只传轻量 id+score，只有最终入选文档才拉完整 _source，省带宽。',
          '相关性默认用 BM25，由 TF（词频，有饱和）、IDF（越稀有越值钱）、字段长度共同决定。',
          '分布式打分可能有偏差：IDF 用分片本地统计，分布不均时排序会轻微失真，可用 dfs 校正。',
          'filter 只判断是非、不打分、可缓存；query 计算相关性 _score，适合全文检索部分。',
          '调优原则：精确/范围/状态过滤放 filter，需要排序的全文匹配才放 query。',
        ]}
      />
    </>
  )
}

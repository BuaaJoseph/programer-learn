import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const productMappingCode = `PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "title":     { "type": "text" },
      "brand":     { "type": "keyword" },
      "price":     { "type": "double" },
      "stock":     { "type": "integer" },
      "tags":      { "type": "keyword" },
      "created_at":{ "type": "date" }
    }
  }
}`

const docCode = `PUT /products/_doc/1001
{
  "title": "无线蓝牙耳机 降噪版",
  "brand": "Acme",
  "price": 299.0,
  "stock": 120,
  "tags": ["耳机", "蓝牙", "降噪"],
  "created_at": "2026-06-16"
}

GET /products/_doc/1001`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          刚从关系型数据库转过来的人，第一反应总是问：<em>Elasticsearch</em> 里的「表」在哪、「建表语句」在哪？
          答案是：索引就是它的「表」，文档就是「行」，而决定一张表长什么样、字段怎么存的，是一份叫
          <em>mapping</em> 的结构定义。把这套对应关系搞清楚，后面的查询、聚合、分片才有立足点。
        </p>
      </Lead>

      <h2>从关系型数据库类比过来</h2>
      <p>
        最快的入门方式是做一组类比。它们并不严格相等，但足以让你建立直觉：
      </p>
      <ul>
        <li><strong>index（索引）</strong>≈ 数据库里的「表」，是一类文档的集合，比如「商品索引」「订单索引」。</li>
        <li><strong>document（文档）</strong>≈ 表里的一「行」，但它是一段 JSON，而不是固定列的元组。</li>
        <li><strong>field（字段）</strong>≈ 表里的「列」，是 JSON 里的一个个 key。</li>
        <li><strong>mapping（映射）</strong>≈ 「表结构 / DDL」，规定每个字段是什么类型、怎么被索引。</li>
      </ul>
      <p>
        注意一个关键差异：关系型数据库的行必须严格符合表结构，而 Elasticsearch 的文档是 JSON，天然支持嵌套、数组、
        可有可无的字段。这种灵活也带来一个坑——如果你不提前定义 mapping，它会替你「猜」，猜错了后面很难收场。
      </p>

      <h3>mapping 里的常见字段类型</h3>
      <p>
        mapping 的核心是给每个字段挑对类型，挑错了会直接影响能不能搜、能不能聚合。最常用的几类：
      </p>
      <ul>
        <li><code>text</code>：会被<strong>分词</strong>（拆成一个个词条），用于全文检索，比如商品标题、文章正文。</li>
        <li><code>keyword</code>：<strong>不分词</strong>，整体作为一个值，用于精确匹配、排序、聚合，比如品牌、状态、标签。</li>
        <li>数值类型：<code>integer</code> / <code>long</code> / <code>double</code> 等，用于范围查询和数值聚合，比如价格、库存。</li>
        <li><code>date</code>：日期类型，支持范围过滤和按时间聚合，比如创建时间。</li>
        <li><code>nested</code>：用于「对象数组」且需要保持对象内字段关联的场景，比如一个订单里的多个商品行。</li>
      </ul>

      <h3>动态映射 vs 显式映射</h3>
      <p>
        当你往一个还没定义 mapping 的索引里写文档时，Elasticsearch 会启动<em>动态映射</em>（dynamic mapping）：
        看到一个字符串就自动给它配上 <code>text</code> 加 <code>keyword</code> 的组合，看到数字就配数值类型。
        方便是方便，但它的猜测经常不是你想要的——比如把一个只该精确匹配的订单号猜成了 <code>text</code>。
      </p>
      <p>
        生产环境的建议是<strong>显式映射</strong>（explicit mapping）：建索引时就把每个字段类型写清楚，
        把动态映射当成临时探索用的兜底，而不是依赖它。
      </p>

      <Example title="商品索引该怎么设计 mapping">
        <p>假设要做一个电商商品搜索，字段和类型这样分配才合理：</p>
        <ul>
          <li><code>title</code> 用 <code>text</code>：用户要按「降噪耳机」这种关键词做全文搜索。</li>
          <li><code>brand</code>、<code>tags</code> 用 <code>keyword</code>：要按品牌精确筛选、要做「各品牌商品数」的聚合。</li>
          <li><code>price</code>、<code>stock</code> 用数值类型：要做价格区间过滤、按价格排序。</li>
          <li><code>created_at</code> 用 <code>date</code>：要做「最近上架」的时间范围过滤。</li>
        </ul>
        <p>
          如果偷懒把 <code>brand</code> 设成了 <code>text</code>，你会发现按品牌聚合时报错或结果被拆成了词条——
          这就是类型选错的典型代价。
        </p>
      </Example>

      <KeyIdea title="mapping 一旦定下来，很难改">
        <p>
          这是面试高频考点：已有字段的<strong>类型不能直接修改</strong>。你可以给索引<strong>新增</strong>字段，
          但不能把一个 <code>text</code> 改成 <code>keyword</code>，因为底层倒排索引已经按旧类型建好了。
          真要改，只能新建一个目标 mapping 的索引，再用 <code>_reindex</code> 把数据搬过去，最后切别名。
          所以「设计阶段把 mapping 想清楚」远比「上线后补救」划算。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="text 和 keyword 别用混了">
        <p>记住这条判断准则，能避免大量返工：</p>
        <ul>
          <li>需要<strong>全文检索</strong>（输入一部分词就能命中）→ 用 <code>text</code>。</li>
          <li>需要<strong>精确匹配、排序、聚合</strong>（整体相等、分组统计）→ 用 <code>keyword</code>。</li>
          <li>两者都要？用<strong>多字段</strong>（multi-field）：主字段 <code>text</code>，再挂一个 <code>title.keyword</code> 子字段，鱼和熊掌兼得。</li>
        </ul>
      </Callout>

      <h2>每个文档自带的两个元字段：_source 和 _id</h2>
      <p>
        除了你写进去的业务字段，每个文档还有两个绕不开的元字段。<code>_id</code> 是文档的唯一标识，
        你可以自己指定（比如用商品 ID），不指定则由系统生成；它还决定了文档被路由到哪个分片（下一章细讲）。
      </p>
      <p>
        <code>_source</code> 则是 Elasticsearch 完整保存的那份<strong>原始 JSON</strong>。搜索时返回给你的文档内容、
        以及将来要 <code>_reindex</code> 或 <code>update</code> 时依赖的原文，全靠它。把 <code>_source</code> 关掉能省存储，
        但会让很多操作没法做，一般不建议关。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「Elasticsearch 和 MySQL 的对应关系」时，按 <em>index≈表、document≈行、field≈列、mapping≈表结构</em>
        这条主线答，再补一句「但文档是 JSON、支持嵌套，且 mapping 字段类型定了不能改、只能 reindex」，
        立刻显得你真用过。被追问 <code>text</code> 和 <code>keyword</code> 区别时，落到「分词 vs 不分词、全文检索 vs 精确聚合」，
        并主动提多字段方案，基本就稳了。
      </p>

      <Practice title="亲手建一个带 mapping 的商品索引">
        <p>
          先用显式 mapping 建索引，再写一条文档进去，最后查出来看 <code>_source</code> 和 <code>_id</code> 长什么样。
          故意把 <code>brand</code> 改成 <code>text</code> 再试一次按品牌聚合，体会类型选错的后果。
        </p>
        <CodeBlock lang="json" title="建带 mapping 的索引" code={productMappingCode} />
        <CodeBlock lang="json" title="写入并查询文档" code={docCode} />
      </Practice>

      <Summary
        points={[
          'index≈表、document≈行 JSON、field≈列、mapping≈表结构，是从关系型数据库迁移过来的核心类比。',
          'mapping 常见类型：text（分词全文）、keyword（不分词精确/聚合）、数值、date、nested。',
          '动态映射会替你猜类型且常猜错，生产环境应优先用显式映射把字段类型写清楚。',
          'mapping 字段类型一旦定下不能改，只能新建索引再 _reindex，所以设计阶段要想清楚。',
          'text 用于全文检索，keyword 用于精确匹配与聚合，两者都要时用多字段（multi-field）。',
          '每个文档自带 _id（唯一标识、决定路由）和 _source（完整原始 JSON，支撑返回与 reindex）。',
        ]}
      />
    </>
  )
}

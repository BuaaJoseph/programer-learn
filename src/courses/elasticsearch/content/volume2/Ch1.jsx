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

const nestedCode = `# 对象数组场景：一个订单含多个商品行
PUT /orders
{
  "mappings": {
    "properties": {
      "items": {
        "type": "nested",
        "properties": {
          "sku":   { "type": "keyword" },
          "qty":   { "type": "integer" }
        }
      }
    }
  }
}

# nested 查询：sku=A 且 qty>=2 必须是「同一个」商品行
GET /orders/_search
{
  "query": {
    "nested": {
      "path": "items",
      "query": {
        "bool": {
          "must": [
            { "term":  { "items.sku": "A" } },
            { "range": { "items.qty": { "gte": 2 } } }
          ]
        }
      }
    }
  }
}`

const reindexCode = `# 改不了字段类型，正确姿势：建新索引 + reindex + 切别名
PUT /products_v2 { "mappings": { "properties": { "brand": { "type": "keyword" } } } }

POST _reindex
{
  "source": { "index": "products" },
  "dest":   { "index": "products_v2" }
}

# 用别名做无缝切换，业务始终访问 products_alias
POST _aliases
{
  "actions": [
    { "remove": { "index": "products",    "alias": "products_alias" } },
    { "add":    { "index": "products_v2", "alias": "products_alias" } }
  ]
}`

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
      <p>
        还有一组术语别答漏：早期 ES 有 <strong>type</strong>（类似一张表里再分子表），但 7.x 起一个 index 只允许一个 type
        （固定为 <code>_doc</code>），8.x 彻底移除。面试若被问「index 和 type 关系」，直接说「type 已废弃，一个 index 一类文档」即可。
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
        <li><code>boolean</code>、<code>ip</code>、<code>geo_point</code>：分别用于布尔过滤、IP 检索、地理位置（「附近的商家」）。</li>
        <li><code>nested</code>：用于「对象数组」且需要保持对象内字段关联的场景，比如一个订单里的多个商品行。</li>
        <li><code>object</code>：普通嵌套对象，会被打平存储；<code>dense_vector</code>：存向量做 kNN 语义检索。</li>
      </ul>

      <h3>为什么对象数组要用 nested</h3>
      <p>
        这是个高频且阴险的坑。默认的 <code>object</code> 类型会把对象数组<strong>打平（flatten）</strong>：
        <code>items: [&#123;sku:A, qty:1&#125;, &#123;sku:B, qty:5&#125;]</code> 会被存成
        <code>items.sku:[A,B]</code> 和 <code>items.qty:[1,5]</code> 两个独立数组——字段间的对应关系丢了。
        于是查询「sku=A 且 qty=5」会错误命中（因为 A 在 sku 数组里、5 在 qty 数组里，分开看都满足）。
        <code>nested</code> 类型把每个子对象当成<strong>独立的隐藏文档</strong>来索引，才能保证「同一行内」的条件关联。
        代价是写入和查询都更重，所以只在真的需要「数组内对象字段联动」时才用它。
      </p>
      <CodeBlock lang="json" title="nested 类型与查询" code={nestedCode} />

      <h3>动态映射 vs 显式映射</h3>
      <p>
        当你往一个还没定义 mapping 的索引里写文档时，Elasticsearch 会启动<em>动态映射</em>（dynamic mapping）：
        看到一个字符串就自动给它配上 <code>text</code> 加 <code>keyword</code> 的组合，看到数字就配数值类型。
        方便是方便，但它的猜测经常不是你想要的——比如把一个只该精确匹配的订单号猜成了 <code>text</code>。
      </p>
      <p>
        生产环境的建议是<strong>显式映射</strong>（explicit mapping）：建索引时就把每个字段类型写清楚，
        把动态映射当成临时探索用的兜底，而不是依赖它。动态映射还有两个隐患要知道：一是<strong>字段爆炸（mapping explosion）</strong>，
        如果日志里有大量不固定的 key，会自动生成成千上万字段拖垮集群，可设 <code>dynamic: strict</code> 或限制字段数；
        二是<strong>类型冲突</strong>，同一字段第一次是数字、后来写了字符串，会直接报 mapper parsing 错误。
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

      <Callout variant="info" title="reindex + 别名 = 不停机改结构">
        <p>
          生产里改 mapping 的标准流程不是直接改，而是「建新索引 → reindex 灌数据 → 切别名」。
          关键在<strong>别名（alias）</strong>：业务代码永远访问 <code>products_alias</code> 而不是具体索引名，
          切换时一条原子的 <code>_aliases</code> 命令把别名从旧索引指到新索引，业务无感知。这套打法也是
          索引滚动（rollover）、零停机升级的基础，值得作为一个固定套路记住。
        </p>
        <CodeBlock lang="json" title="reindex 改结构 + 别名切换" code={reindexCode} />
      </Callout>

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
      <p>
        还有几个常被问到的元字段：<code>_version</code>（版本号，做乐观并发控制，下一卷写入会用到）、
        <code>_routing</code>（自定义路由值，默认就是 <code>_id</code>）、<code>_index</code>（所属索引名）。
        理解 <code>_id</code> 既是主键又是默认路由值，是连接「mapping」和「分片路由」两章的关键纽带。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问到「Elasticsearch 和 MySQL 的对应关系」时，按 <em>index≈表、document≈行、field≈列、mapping≈表结构</em>
        这条主线答，再补一句「但文档是 JSON、支持嵌套，且 mapping 字段类型定了不能改、只能 reindex」，
        立刻显得你真用过。被追问 <code>text</code> 和 <code>keyword</code> 区别时，落到「分词 vs 不分词、全文检索 vs 精确聚合」，
        并主动提多字段方案，基本就稳了。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「能不能改字段类型？」</strong>——已有字段类型不可改，只能新增字段或 reindex；答出别名切换是加分项。
          </li>
          <li>
            <strong>误区：对象数组随便用 object</strong>——会打平丢失字段关联，需要联动条件时必须 nested。
          </li>
          <li>
            <strong>「动态映射有什么风险？」</strong>——字段爆炸和类型冲突，生产建议显式映射 + dynamic strict。
          </li>
          <li>
            <strong>误区：以为关掉 _source 没影响</strong>——会导致无法 reindex、update、高亮取原文，慎关。
          </li>
        </ul>
      </Callout>

      <Practice title="亲手建一个带 mapping 的商品索引">
        <p>
          先用显式 mapping 建索引，再写一条文档进去，最后查出来看 <code>_source</code> 和 <code>_id</code> 长什么样。
          故意把 <code>brand</code> 改成 <code>text</code> 再试一次按品牌聚合，体会类型选错的后果。
        </p>
        <CodeBlock lang="json" title="建带 mapping 的索引" code={productMappingCode} />
        <CodeBlock lang="json" title="写入并查询文档" code={docCode} />
        <p>
          想体会改结构的正确姿势，可以接着跑 reindex + 别名那段：建 <code>products_v2</code>、把数据搬过去、
          再用一条 <code>_aliases</code> 把别名切到新索引，全程业务访问别名、无感知。
        </p>
      </Practice>

      <Summary
        points={[
          'index≈表、document≈行 JSON、field≈列、mapping≈表结构，是从关系型数据库迁移过来的核心类比。',
          'type 已废弃：7.x 起一个 index 只一个 type，8.x 移除，一个 index 就是一类文档。',
          'mapping 常见类型：text、keyword、数值、date、boolean、ip、geo_point、nested、dense_vector。',
          '对象数组需要字段联动时必须用 nested，否则 object 打平会丢失同一行内的关联。',
          '动态映射会替你猜类型且常猜错，还有字段爆炸/类型冲突风险，生产应优先显式映射。',
          'mapping 字段类型一旦定下不能改，标准做法是新建索引 + _reindex + 别名原子切换，业务无感知。',
          'text 用于全文检索，keyword 用于精确匹配与聚合，两者都要时用多字段（multi-field）。',
          '每个文档自带 _id（主键 + 默认路由）、_source（原始 JSON）、_version（乐观并发）等元字段。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const standardCnCode = `# 用内置 standard 分析器切中文，看看会发生什么
POST _analyze
{
  "analyzer": "standard",
  "text": "苹果手机很好用"
}`

const ikCode = `# 用 ik_smart（粗粒度）切同一句话
POST _analyze
{
  "analyzer": "ik_smart",
  "text": "苹果手机很好用"
}

# 用 ik_max_word（细粒度）切同一句话
POST _analyze
{
  "analyzer": "ik_max_word",
  "text": "苹果手机很好用"
}`

const mappingCode = `# 建索引时给 text 字段指定 ik 分析器
PUT /articles
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "tag": { "type": "keyword" }
    }
  }
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章看到，倒排索引的 key 是分词产生的一个个 term。那么「怎么切词」就直接决定了「能不能搜到」。
          负责切词的组件叫 <em>analyzer</em>（分析器）。这一章讲清它的组成、为什么建索引和查询的分词必须一致，
          以及中文为什么几乎一定要装 ik 分词器——这是 ES 中文场景最容易踩的坑。
        </p>
      </Lead>

      <h2>analyzer 的三段流水线</h2>
      <p>
        一个 analyzer 由三部分按顺序组成，像一条流水线：
      </p>
      <ul>
        <li>
          <strong>character filter（字符过滤器）</strong>——在分词前对原始字符做预处理，
          比如去掉 HTML 标签、替换字符。可有可无、可多个。
        </li>
        <li>
          <strong>tokenizer（分词器）</strong>——核心，负责把字符流切成一个个 token（词）。
          有且只有一个，中文能不能切对，主要看它。
        </li>
        <li>
          <strong>token filter（词元过滤器）</strong>——对切出来的 token 再加工，
          比如转小写、去停用词、加同义词。可有可多个。
        </li>
      </ul>
      <p>
        内置的 standard 分析器就是「无 char filter + standard tokenizer + 小写 token filter」的组合。
        理解了这条流水线，你就知道想定制分词时该改哪一段。
      </p>

      <h3>建索引分词 与 查询分词 必须一致</h3>
      <p>
        这是最关键、也最容易被忽略的一点。文档写入时会用 analyzer 切词建倒排索引（叫
        <em>index analyzer</em>）；用户查询时，查询词也要先被切成 term，再去倒排索引里比对（叫
        <em>search analyzer</em>）。如果两边用了不同的切法，切出来的 term 对不上，
        倒排索引里明明有数据，却<strong>怎么也搜不到</strong>。默认两边用同一个 analyzer，
        正是为了保证一致；只有在明确知道自己要干嘛时，才单独指定 <code>search_analyzer</code>。
      </p>

      <Example title="standard 切中文：按字切，灾难现场">
        <p>
          内置 standard 分析器对英文很好用（按空格、标点切），但它<strong>不认识中文词</strong>，
          只会把中文按单个字切开。「苹果手机很好用」会被切成：
        </p>
        <ul>
          <li><code>苹</code>、<code>果</code>、<code>手</code>、<code>机</code>、<code>很</code>、<code>好</code>、<code>用</code></li>
        </ul>
        <p>
          于是倒排索引里只有单字，没有「苹果」「手机」这种词。用户搜「华为手机」时，
          「手」「机」也能命中——结果一堆不相关的文档混进来，相关性彻底崩了。这就是为什么中文必须换分词器。
        </p>
      </Example>

      <KeyIdea title="中文必须装 ik">
        <p>
          ik 是最常用的中文分词器，装好后提供两个分析器：<strong>ik_smart</strong>（粗粒度，
          一段话尽量切成最少的词，如「苹果手机 / 很 / 好用」，适合查询）和
          <strong>ik_max_word</strong>（细粒度，穷尽所有可能的词，如「苹果 / 手机 / 苹果手机 …」，
          召回更全，适合建索引）。常见做法：建索引用 <code>ik_max_word</code> 多切多存，
          查询用 <code>ik_smart</code> 少切精准，兼顾召回和准确。
        </p>
      </KeyIdea>

      <h3>新词搜不到？扩展词典</h3>
      <p>
        ik 内置词典里没有的新词、专有名词、品牌名（比如某个新产品型号），可能被切碎。
        解决办法是配置 ik 的<strong>扩展词典</strong>（自定义 dict 文件），把这些词加进去，
        ik 就会把它们当成一个完整的词来切。停用词同理，可以用扩展停用词典过滤掉。
      </p>

      <Callout variant="warn" title="text 与 keyword：分不分词是本质区别">
        <p>
          ES 里两种最常用的字符串类型，差别就在「要不要分词」：
        </p>
        <ul>
          <li>
            <strong>text</strong>——<strong>会分词</strong>，建倒排索引，用于全文检索（match 查询）。
            搜「苹果手机」能命中含「苹果」「手机」的文档。但 text 字段不适合精确匹配、排序、聚合。
          </li>
          <li>
            <strong>keyword</strong>——<strong>不分词</strong>，整个值作为一个 term 存储，
            用于精确匹配（term 查询）、排序、聚合。比如标签、状态、品牌名这类「整体作为一个值」的字段。
          </li>
        </ul>
        <p>
          常见做法是给同一字段同时建 text 和 keyword 两种（<code>fields</code> 子字段），
          既能全文搜又能精确聚合。选错类型是新手第一大坑：拿 text 去做聚合，或拿 keyword 去做全文搜，都会出问题。
        </p>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「ES 中文分词怎么做」，按这条线说：analyzer 由 character filter → tokenizer → token filter
        三段组成；内置 standard 对中文是按单字切，会导致相关性崩，所以中文要装 ik；ik 有 ik_smart（粗）和
        ik_max_word（细），通常建索引用 max_word、查询用 smart；新词搜不到就配扩展词典。
        最后补一刀关键点：<strong>建索引分词和查询分词必须一致</strong>，否则 term 对不上、明明有数据却搜不到。
        再点一句 text（分词，全文搜）vs keyword（不分词，精确/聚合）的区别，就答得很完整了。
      </p>

      <Practice title="测 ik 分词、给字段指定 analyzer">
        <p>
          先用 <code>_analyze</code> 对比 standard 和 ik 切同一句中文的差异，直观感受「按字切」和「按词切」；
          再建一个索引，给 text 字段显式指定 ik 分析器。
        </p>
        <CodeBlock lang="json" title="1. standard 切中文（按字切）" code={standardCnCode} />
        <CodeBlock lang="json" title="2. ik_smart 与 ik_max_word 对比" code={ikCode} />
        <CodeBlock lang="json" title="3. mapping 中指定 analyzer" code={mappingCode} />
        <p>
          跑完前两步，对比一下 token 列表：standard 切出一堆单字，ik 切出「苹果手机 / 很 / 好用」这样的真词。
          第三步给 <code>title</code> 设了 <code>analyzer: ik_max_word</code>（建索引细切）和
          <code>search_analyzer: ik_smart</code>（查询粗切），这正是上面说的经典搭配。
        </p>
      </Practice>

      <Summary
        points={[
          'analyzer 由 character filter → tokenizer → token filter 三段流水线组成，tokenizer 是切词核心。',
          '建索引分词与查询分词必须一致，否则切出的 term 对不上，有数据也搜不到。',
          '内置 standard 分析器把中文按单字切，会让相关性崩坏，中文场景几乎必须换分词器。',
          'ik 提供 ik_smart（粗粒度，适合查询）和 ik_max_word（细粒度，适合建索引）；新词靠扩展词典补充。',
          'text 会分词、用于全文检索；keyword 不分词、用于精确匹配、排序与聚合。',
          '同一字段常同时建 text + keyword 子字段，既能全文搜又能精确聚合；选错类型是常见坑。',
        ]}
      />
    </>
  )
}

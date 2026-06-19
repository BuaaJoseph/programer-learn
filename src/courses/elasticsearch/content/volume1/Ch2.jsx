import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import InvertedIndex from '@/courses/elasticsearch/illustrations/InvertedIndex.jsx'

const analyzeCode = `# 看看一句话被 standard 分析器切成了哪些词
POST _analyze
{
  "analyzer": "standard",
  "text": "苹果手机 Apple iPhone"
}`

const matchCode = `# 准备两条文档
PUT /goods/_doc/1
{ "title": "Apple 苹果手机 iPhone 15" }

PUT /goods/_doc/2
{ "title": "小米手机 Redmi" }

# match 查询会先把「苹果手机」分词，再去倒排索引里查
GET /goods/_search
{
  "query": {
    "match": { "title": "苹果手机" }
  }
}`

const postingDetailCode = `# 一个 term 的 posting list 里到底存了什么（概念示意）
"手机": [
  { "doc": 1, "freq": 2, "positions": [3, 7] },   // 在 doc1 出现 2 次，位置 3、7
  { "doc": 3, "freq": 1, "positions": [1] }
]
# freq 用于打分（BM25），positions 用于短语/邻近查询`

const phraseCode = `# 短语查询：必须「手机 壳」相邻且按序，靠 positions 实现
GET /goods/_search
{
  "query": {
    "match_phrase": { "title": "苹果 手机" }
  }
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说 ES 快是因为「先建好索引再查索引」，这张索引就是 <em>inverted index</em>（倒排索引）。
          它是整个 ES 的地基，也是面试的高频考点。这一章把它从原理到查询过程拆开讲清楚——
          理解了它，你就懂了 ES 为什么能在亿级文档里毫秒返回。
        </p>
      </Lead>

      <h2>正排 vs 倒排</h2>
      <p>
        先分清两种索引方向。<strong>正排索引（forward index）</strong>是「文档 → 词」：给一个文档 id，
        能拿到它包含哪些词，就像一本书的正文。<strong>倒排索引（inverted index）</strong>正好反过来，
        是「词 → 文档列表」：给一个词（term），能立刻拿到所有包含它的文档 id 列表。
      </p>
      <p>
        搜索要的恰恰是后者：用户输入一个词，你需要瞬间知道「哪些文档有这个词」。如果只有正排，就得把每篇文档都翻一遍——
        那又退化成全表扫描了。所以搜索引擎一定建倒排索引。
      </p>
      <p>
        但别以为 ES 只有倒排。它对每个字段会按需建多种数据结构：倒排索引负责「搜」（按词找文档），
        而排序、聚合则靠另一种叫 <strong>doc values</strong> 的<strong>列式正排结构</strong>——
        因为聚合要做的是「给一批文档，快速取出它们某字段的所有值再统计」，这恰恰是「文档 → 值」方向，倒排反而不擅长。
        所以记住：<strong>倒排服务搜索，doc values 服务排序与聚合</strong>，两者各管一摊，这也是后面聚合章节的伏笔。
      </p>

      <h3>倒排索引是怎么建起来的</h3>
      <p>
        写入一篇文档时，ES 大致做三件事：先<strong>分词</strong>（把文本切成一个个 term），
        再<strong>去重并规范化</strong>（比如统一小写），最后把每个 term 指向的<strong>文档信息记下来</strong>。
        这些信息通常包含：文档 id、词频（这个词在文档里出现几次，用于相关性打分）、以及位置
        （position，用于短语查询）。这份「term → 文档信息」的列表，就叫 <em>posting list</em>（倒排列表）。
      </p>
      <p>
        分词这步严格说是「分析（analysis）」流水线：<strong>字符过滤（character filter）</strong>
        先处理原文（比如去 HTML 标签），<strong>分词器（tokenizer）</strong>切成 token，
        <strong>词项过滤（token filter）</strong>再做小写化、去停用词、同义词扩展、词干还原等。
        关键铁律是：<strong>写入建索引和查询时用的分析器要一致</strong>，否则索引里存的是「苹果」而查询切成「蘋果」就永远命不中。
        这也是下一章分词器的核心。
      </p>

      <Example title="三篇文档建出的倒排索引">
        <p>假设有三篇文档：</p>
        <ul>
          <li><code>doc1: 苹果 手机</code>、<code>doc2: 苹果 电脑</code>、<code>doc3: 华为 手机</code></li>
        </ul>
        <p>分词去重后，倒排索引长这样：</p>
        <ul>
          <li><code>苹果 → [doc1, doc2]</code></li>
          <li><code>手机 → [doc1, doc3]</code></li>
          <li><code>电脑 → [doc2]</code></li>
          <li><code>华为 → [doc3]</code></li>
        </ul>
        <p>
          搜「苹果手机」时，拆成「苹果」和「手机」，分别拿到 <code>[doc1, doc2]</code> 和
          <code>[doc1, doc3]</code>，求交集得到 <code>doc1</code>——它同时含两个词，最相关，排第一。
        </p>
      </Example>

      <InvertedIndex />

      <h3>posting list 里到底存了什么</h3>
      <p>
        别把 posting list 想成只有一串文档 id。每个 term 的列表里，针对每个文档还存了<strong>词频 freq</strong>
        （用于 BM25 打分）和<strong>位置 positions</strong>（用于短语和邻近查询），有时还有偏移量 offsets（用于高亮）。
        正因为存了这些，倒排索引才不止能回答「含不含」，还能回答「有多相关」和「这几个词是否相邻」。
      </p>
      <CodeBlock lang="json" title="posting list 的内部信息（概念示意）" code={postingDetailCode} />
      <p>
        有了 positions，短语查询 <code>match_phrase</code> 才成立：它不只要求文档同时含「苹果」「手机」，
        还要求它们的位置相邻且按序。这就是「关键词搜」和「短语搜」精度差异的来源。
      </p>
      <CodeBlock lang="json" title="短语查询依赖 positions" code={phraseCode} />

      <h3>三层结构：term index + term dictionary + posting list</h3>
      <p>
        真实的倒排索引不止「词 → 文档」一张表，而是三层。最底层是<strong>posting list</strong>（每个词的文档列表）；
        中间是 <em>term dictionary</em>（词典，按字典序存所有 term，方便二分查找）；
        词典可能非常大、放不进内存，于是最上层再加一层 <em>term index</em>——
        用 <em>FST</em>（有限状态转换机，一种极省内存的前缀树结构）常驻内存，
        先快速定位到词典中的大致位置，再去磁盘上的词典精确查找。
      </p>
      <p>
        为什么用 FST 而不是普通哈希表或前缀树？因为词典动辄上千万 term，全放内存吃不消。FST 把<strong>公共前缀</strong>
        甚至<strong>公共后缀</strong>都合并复用，用极小的内存表示海量词的有序集合，还能直接支持前缀匹配。
        这就是「内存放索引的索引、磁盘放真正的词典」这种分层设计的精髓——拿一点内存换一次磁盘随机读的省略。
      </p>

      <KeyIdea title="为什么倒排索引这么快">
        <p>
          两点：其一，<strong>查词直接拿文档</strong>——term index（FST）→ term dictionary →
          posting list 一路定位，不碰原文；其二，<strong>多词靠 posting list 求交集</strong>，
          而 posting list 是有序的，求交集可以用跳表（skip list）加速，几乎是线性合并。
          所以查询代价只和「命中文档数」相关，和「总文档数」基本无关，这才有了海量数据下的毫秒级响应。
        </p>
      </KeyIdea>

      <Callout variant="info" title="posting list 还做了压缩">
        <p>
          亿级文档的 posting list 如果直接存 id 会非常占空间。Lucene 用了两个技巧：
          <strong>FOR（Frame Of Reference）</strong>把有序 id 转成差值（delta）再按块位压缩；
          需要快速跳过时用<strong>跳表</strong>定位。求交集时（AND 查询），可以拿较短列表的 id 去较长列表里跳跃式查找，
          避免逐个比对。理解这些能让你在面试里把「为什么快」答得有血有肉，而不只是背概念。
        </p>
      </Callout>

      <Callout variant="warn" title="和 B+ 树索引的区别，别答混了">
        <p>
          面试常拿数据库的 B+ 树索引来对比，关键差异有三点：
        </p>
        <ul>
          <li>
            <strong>解决的问题不同</strong>——B+ 树擅长「等值 / 范围」查找（如 <code>id = 5</code>、
            <code>price &gt; 100</code>），但对「文本里是否含某个词」无能为力；倒排索引专为全文检索而生。
          </li>
          <li>
            <strong>结构不同</strong>——B+ 树是「值 → 行」的有序树；倒排索引是「词 → 文档列表」，
            还额外记了词频、位置，天然支持相关性打分。
          </li>
          <li>
            <strong>能力不同</strong>——倒排索引能算 score 做相关性排序，B+ 树只判断匹配与否。
          </li>
        </ul>
      </Callout>

      <h2>面试怎么答</h2>
      <p>
        被问「倒排索引原理」，按这条线说：正排是文档→词、倒排是词→文档；写入时分词去重，
        把每个 term 的 posting list（含文档 id、词频、位置）记下来；查询时多个词各取 posting list 再求交集，
        靠跳表加速；底层是 term index（FST，常驻内存）+ term dictionary + posting list 三层。
        最后点一句「所以查询代价只跟命中数有关，跟总量无关」，这就是它快的本质，也是和 B+ 树最大的不同。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「倒排索引能改吗？」</strong>——单个段（segment）的倒排索引是<strong>不可变</strong>的，
            更新文档靠「新写 + 标记删旧」，这是下一卷段与合并的核心，先记住「倒排索引只增不改」。
          </li>
          <li>
            <strong>误区：以为 ES 只有倒排</strong>——排序聚合靠 doc values（列存正排），别答漏了。
          </li>
          <li>
            <strong>「为什么不用 HashMap 存词典？」</strong>——量太大放不进内存且不支持范围/前缀，FST 用极小内存表达有序大词集。
          </li>
          <li>
            <strong>误区：term 就是「字」</strong>——term 是分析器切出来的结果，分析器不同切法天差地别，所以查不查得到取决于分词。
          </li>
        </ul>
      </Callout>

      <Practice title="看分词、对比命中">
        <p>
          先用 <code>_analyze</code> 看一句话被切成了哪些 term（这些 term 就是倒排索引的 key），
          再写两条文档、用 <code>match</code> 查询，体会「先分词、再查倒排、求交集」的完整链路。
        </p>
        <CodeBlock lang="json" title="1. 用 _analyze 看分词结果" code={analyzeCode} />
        <CodeBlock lang="json" title="2. 写文档并用 match 查询" code={matchCode} />
        <p>
          注意第一步：standard 分析器会把中文「苹果手机」切成「苹果」「手机」两个字（其实是按单字切），
          英文 Apple、iPhone 各成一词。正因为切成了这些 term，第二步的 match 才能查到 doc1。
          再把第二步换成 <code>match_phrase</code> 试试，体会短语查询对 positions 的依赖。
          下一章我们就专门讲分词器——尤其是中文为什么必须换成 ik。
        </p>
      </Practice>

      <Summary
        points={[
          '正排是「文档→词」，倒排是「词→文档列表」；搜索需要的是倒排，否则又退化成全表扫描。',
          '倒排服务搜索、doc values（列存正排）服务排序与聚合，两者各管一摊。',
          '建倒排索引经过分析流水线：字符过滤 → 分词器 → 词项过滤；写入与查询分析器必须一致。',
          'posting list 不只是文档 id，还存词频 freq（打分）和位置 positions（短语/邻近查询）。',
          '三层结构：term index（FST 常驻内存）→ term dictionary（词典）→ posting list（文档列表）。',
          '快的本质：查词直接定位文档、多词 posting list 求交集（跳表加速），代价只跟命中数有关。',
          'Lucene 用 FOR 等手段压缩 posting list，用 FST 极省内存地存有序词典。',
          '单段倒排索引不可变，更新靠新写+标记删旧，这是下一卷段与合并的伏笔。',
          '与 B+ 树的区别：B+ 树做等值/范围查找，倒排索引做全文检索并支持相关性排序。',
        ]}
      />
    </>
  )
}

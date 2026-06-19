import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import EsWriteFlow from '@/courses/elasticsearch/illustrations/EsWriteFlow.jsx'

const refreshFlushCode = `# 手动触发 refresh：让刚写入的文档立刻可搜（一般别在生产里频繁调）
POST /products/_refresh

# 手动触发 flush：把内存数据 fsync 落盘并清空 translog
POST /products/_flush`

const intervalCode = `# 批量导入时把 refresh 调大甚至关掉，导完再恢复
PUT /products/_settings
{
  "index": { "refresh_interval": "30s" }
}

# 关闭 refresh：-1 表示不自动刷新
PUT /products/_settings
{
  "index": { "refresh_interval": "-1" }
}`

const refreshParamCode = `# 单条写入也能控制可见性：?refresh 的三种取值
# 1) 默认：不强制，等下一个 refresh 周期（吞吐最好）
PUT /products/_doc/1 { "title": "a" }

# 2) refresh=true：立刻 refresh 让本条可搜（最费性能，慎用）
PUT /products/_doc/2?refresh=true { "title": "b" }

# 3) refresh=wait_for：阻塞直到下一次 refresh 完成才返回（折中）
PUT /products/_doc/3?refresh=wait_for { "title": "c" }`

const versionCode = `# 乐观并发：用 if_seq_no + if_primary_term 防止并发覆盖
PUT /products/_doc/1001?if_seq_no=12&if_primary_term=2
{ "title": "改后的标题", "stock": 80 }
# 若 seq_no/term 对不上，返回 409 version_conflict，说明数据被别人改过`

const forcemergeCode = `# 对只读的历史索引做 force merge，把段合到 1 个，查询更快、空间更省
POST /logs-2026.06.10/_forcemerge?max_num_segments=1`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          一个让无数人困惑的现象：往 Elasticsearch 写了一条文档，马上去搜却搜不到，过个一秒左右才出现。
          这不是 bug，而是它「近实时」（<em>NRT</em>，near real-time）设计的必然结果。
          要把这件事讲透，得拆开写入路径上的三个动作：<em>translog</em>、<em>refresh</em> 和 <em>flush</em>。
        </p>
      </Lead>

      <h2>写入路径：数据进来后经历了什么</h2>
      <p>
        一条文档写进某个主分片时，并不是直接落盘、立刻可搜的，而是分几步走：
      </p>
      <ul>
        <li>先写进内存里的 <strong>index buffer</strong>（内存缓冲区），同时追加一条记录到 <strong>translog</strong>（事务日志）。</li>
        <li>每隔一段时间（默认约 1 秒）触发一次 <strong>refresh</strong>：把内存 buffer 里的数据生成一个新的 <em>segment</em>（段），放进文件系统缓存（FS cache）。<strong>此刻文档才变得可搜索</strong>。</li>
        <li>积累到一定程度后触发 <strong>flush</strong>：把数据真正 <code>fsync</code> 到磁盘，并清空已经落盘的那部分 translog。</li>
      </ul>
      <p>
        关键点：让文档「可搜」的是 refresh，而把数据「持久化到磁盘」的是 flush——这是两件不同的事，很多人会混。
        再补一条完整的分布式视角：写入先到<strong>主分片</strong>，主分片本地走完上面的 buffer + translog，
        再把这条操作<strong>并行转发给所有副本分片</strong>，副本也各自写 buffer + translog，主分片收到足够副本的成功确认后才向客户端返回成功。
        所以「写入路径」既有单分片内的三段式，也有跨分片的主副本同步两层。
      </p>

      <Example title="写完为什么 1 秒后才搜到">
        <p>把上面的链路套到这个经典现象上，就一目了然了：</p>
        <ul>
          <li>你 <code>PUT</code> 一条文档，它进了内存 buffer 和 translog，<strong>但还没生成 segment</strong>，所以搜不到。</li>
          <li>默认 <code>refresh_interval</code> 是 1 秒，到点后 refresh 把 buffer 刷成 segment 进 FS cache，文档<strong>这才可搜</strong>。</li>
          <li>于是你观察到的就是「写完大约 1 秒后才搜得到」——这就是「近实时」而非「实时」的由来。</li>
        </ul>
        <p>
          如果测试时需要立刻搜到，可以手动 <code>POST /index/_refresh</code> 强制刷新，但生产环境别这么频繁调，
          太费性能。更细粒度的办法是写入时带 <code>?refresh</code> 参数控制本条文档的可见性。
        </p>
        <CodeBlock lang="json" title="?refresh 的三种取值" code={refreshParamCode} />
        <p>
          注意 <code>refresh=true</code> 会立即生成一个新 segment，高频调用等于制造大量小段、加重 merge，
          所以「测试用 true、生产用默认或 wait_for」是基本原则。
        </p>
      </Example>

      <EsWriteFlow />

      <KeyIdea title="近实时为什么不是实时">
        <p>
          可搜索的前提是数据进入了 segment，而 segment 是 refresh 周期性生成的，默认每秒一次。这中间的延迟，
          就是「近实时」三个字的全部含义。把 <code>refresh_interval</code> 调小能让延迟更短，但会更频繁地生成
          小 segment、增加开销；调大则反过来——这是一个明确的<strong>延迟与吞吐的权衡</strong>。
        </p>
      </KeyIdea>

      <h2>为什么按 _id 取（GET）却是实时的</h2>
      <p>
        这是个容易被忽略的细节、也是不错的面试加分点：<strong>搜索是近实时，但按 _id 直接 GET 是实时的</strong>。
        因为 GET 一条文档时，ES 会先去查还没 refresh 的 translog（以及内存 buffer），能立刻拿到最新写入的版本，
        不必等 segment 生成。而 <code>_search</code> 走的是倒排索引，倒排索引只存在于已生成的 segment 里，所以必须等 refresh。
        一句话：<strong>GET 走 translog 实时、SEARCH 走 segment 近实时</strong>。
      </p>

      <h2>segment 不可变，删除是「标记」</h2>
      <p>
        Lucene 的 segment 一旦生成就<strong>不可修改</strong>。那删除和更新怎么实现？答案是：删除只是给文档打一个
        「已删除」的标记（记在 <code>.del</code> / liveDocs 里），原数据仍然躺在旧 segment 里；更新则等于「标记旧文档删除 + 写一条新文档」。
        所以一段时间后，磁盘上会堆积很多带删除标记、内容零碎的小 segment。
      </p>
      <p>
        为什么坚持「不可变」？因为不可变带来三个大好处：<strong>无需加锁即可并发读</strong>（段不会变，读多少遍都一致）、
        <strong>可放心利用文件系统缓存</strong>（缓存的内容永不失效）、<strong>段级别可被多查询共享</strong>。
        代价就是更新要靠「删旧写新 + 后台合并」来兑现，这也是 ES 不适合高频更新的根本原因。
      </p>

      <h3>merge：合并小 segment</h3>
      <p>
        为了不让小 segment 无限膨胀，Elasticsearch 会在后台做 <em>merge</em>（段合并）：把多个小 segment 合成大的，
        过程中<strong>真正丢弃掉被标记删除的文档</strong>，回收空间、减少 segment 数量、提升查询效率。
        merge 是自动进行的，但它会吃 IO 和 CPU，批量写入场景要心里有数。
      </p>
      <p>
        对于不再写入的历史索引（比如昨天的日志），可以主动做一次 <strong>force merge</strong> 把段合到 1 个，
        让查询少扫几个段、磁盘也更省。但切记：<strong>只对只读索引做</strong>，对还在写的索引强制合并会产生超大段、后续难以再合并。
      </p>
      <CodeBlock lang="bash" title="对只读历史索引 force merge" code={forcemergeCode} />

      <Callout variant="warn" title="批量导入时记得调 refresh_interval">
        <p>大批量灌数据时，默认每秒 refresh 会生成海量小 segment，拖慢导入又加重 merge 负担。正确姿势是：</p>
        <ul>
          <li>导入前把 <code>refresh_interval</code> 调大（比如 <code>30s</code>）甚至设为 <code>-1</code> 关闭自动刷新。</li>
          <li>大批量场景可临时把 <code>number_of_replicas</code> 设为 0，导完再恢复，省去同步副本的开销。</li>
          <li>导入完成后<strong>恢复</strong>成默认值，并按需手动 refresh 一次让数据可搜。</li>
          <li>这样能显著提升批量写入吞吐，是面试里「ES 写入调优」的标准答案之一。</li>
        </ul>
      </Callout>

      <h2>translog：宕机不丢数据的保险</h2>
      <p>
        refresh 之后数据只在 FS cache 里，还没真正落盘；万一这时机器断电，岂不是丢了？translog 就是为这个兜底的：
        每条写入都先追加到 translog，且 translog 会按策略 <code>fsync</code> 到磁盘。
        节点重启时，Elasticsearch 会<strong>重放 translog</strong>把还没 flush 的数据补回来，保证宕机不丢。
        flush 成功落盘后，对应的 translog 才会被清空——这就是 translog 和 flush 的配合关系。
      </p>
      <p>
        translog 的落盘策略也是个权衡点：默认 <code>durability: request</code>，<strong>每个写请求都 fsync translog 后才返回</strong>，
        最安全但每次写多一次磁盘同步；改成 <code>async</code> 则按固定间隔（默认 5s）批量 fsync，吞吐更高但断电可能丢最近几秒。
        日志这类「丢一点点能接受」的场景常用 async 换吞吐，订单这类不能丢的保持默认 request。
      </p>

      <Callout variant="info" title="顺带一提：乐观并发控制">
        <p>
          ES 没有事务，但对单文档提供<strong>乐观锁</strong>。每次写入文档的 <code>_seq_no</code> 和 <code>_primary_term</code> 会变，
          更新时带上 <code>if_seq_no</code> / <code>if_primary_term</code>，若与当前不符就返回 <strong>409 version_conflict</strong>，
          说明这条文档在你读到和写回之间被别人改过。这是并发更新同一文档时防「后写覆盖先写」的标准手段。
        </p>
        <CodeBlock lang="json" title="乐观并发控制" code={versionCode} />
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「ES 是实时的吗」，答 <em>搜索是近实时（默认 1 秒），但按 _id 的 GET 是实时的</em>，并解释 refresh 生成 segment 才可搜、GET 会查 translog。
        被追问「translog、refresh、flush 各干啥」，按 <em>translog 保证不丢、refresh 让可搜、flush 落盘清 translog</em>
        三句话切开。再补上「segment 不可变、删除是标记、merge 回收」和「批量导入调大或关闭 refresh_interval」，
        这一章的考点就答全了。
      </p>

      <Callout variant="info" title="面试追问与误区">
        <ul>
          <li>
            <strong>「refresh 和 flush 有啥区别？」</strong>——refresh 让可搜（生成段进 FS cache），flush 让持久化（fsync + 清 translog），别混。
          </li>
          <li>
            <strong>误区：以为 refresh 就落盘了</strong>——refresh 后数据只在 FS cache，靠 translog 兜底，flush 才真落盘。
          </li>
          <li>
            <strong>「为什么 segment 要不可变？」</strong>——免锁并发读、缓存友好、可共享；代价是更新靠删旧写新 + merge。
          </li>
          <li>
            <strong>误区：对正在写的索引 force merge</strong>——只能对只读历史索引做，否则产生超大段难再合并。
          </li>
        </ul>
      </Callout>

      <Practice title="手动 refresh / flush 与调优 refresh_interval">
        <p>
          先写一条文档不要 refresh，立刻搜（应该搜不到），再手动 <code>_refresh</code> 后重搜（出现了）。
          然后体验批量导入调优：把 <code>refresh_interval</code> 调大或关闭，导完再恢复。
        </p>
        <CodeBlock lang="text" title="手动 refresh 与 flush" code={refreshFlushCode} />
        <CodeBlock lang="json" title="调优 refresh_interval" code={intervalCode} />
        <p>
          再对比一个有意思的现象：写完文档先别 refresh，用 <code>GET /products/_doc/&lt;id&gt;</code> 能立刻取到（走 translog），
          但 <code>_search</code> 还搜不到（要等段生成）。这正是「GET 实时、SEARCH 近实时」的直观验证。
        </p>
      </Practice>

      <Summary
        points={[
          '写入路径：内存 buffer + translog → refresh 生成 segment 进 FS cache 可搜 → flush 落盘清 translog。',
          '分布式视角：先写主分片再并行同步副本，主分片收到足够确认才返回成功。',
          '近实时（NRT）的根源是 refresh 周期性（默认 1 秒）生成 segment；GET 走 translog 是实时的，SEARCH 走 segment 是近实时。',
          'refresh 决定可搜性、flush 决定持久化，是两件不同的事，别混为一谈。',
          'segment 不可变（免锁并发读、缓存友好），删除是打标记、更新是删旧写新，靠后台 merge 合并并回收。',
          '只读历史索引可 force merge 合段提速省空间，但绝不能对正在写的索引做。',
          'translog 保证宕机不丢：默认每请求 fsync（request），async 可换吞吐但断电丢几秒。',
          '批量导入时调大/关闭 refresh_interval、可临时把副本设 0，导完恢复，显著提升写入吞吐。',
          '单文档乐观并发用 if_seq_no + if_primary_term，冲突返回 409，防并发覆盖。',
        ]}
      />
    </>
  )
}

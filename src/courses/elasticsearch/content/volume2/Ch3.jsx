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
          太费性能。
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

      <h2>segment 不可变，删除是「标记」</h2>
      <p>
        Lucene 的 segment 一旦生成就<strong>不可修改</strong>。那删除和更新怎么实现？答案是：删除只是给文档打一个
        「已删除」的标记，原数据仍然躺在旧 segment 里；更新则等于「标记旧文档删除 + 写一条新文档」。
        所以一段时间后，磁盘上会堆积很多带删除标记、内容零碎的小 segment。
      </p>

      <h3>merge：合并小 segment</h3>
      <p>
        为了不让小 segment 无限膨胀，Elasticsearch 会在后台做 <em>merge</em>（段合并）：把多个小 segment 合成大的，
        过程中<strong>真正丢弃掉被标记删除的文档</strong>，回收空间、减少 segment 数量、提升查询效率。
        merge 是自动进行的，但它会吃 IO 和 CPU，批量写入场景要心里有数。
      </p>

      <Callout variant="warn" title="批量导入时记得调 refresh_interval">
        <p>大批量灌数据时，默认每秒 refresh 会生成海量小 segment，拖慢导入又加重 merge 负担。正确姿势是：</p>
        <ul>
          <li>导入前把 <code>refresh_interval</code> 调大（比如 <code>30s</code>）甚至设为 <code>-1</code> 关闭自动刷新。</li>
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

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「ES 是实时的吗」，答 <em>近实时，默认 1 秒</em>，并解释 refresh 生成 segment 才可搜。
        被追问「translog、refresh、flush 各干啥」，按 <em>translog 保证不丢、refresh 让可搜、flush 落盘清 translog</em>
        三句话切开。再补上「segment 不可变、删除是标记、merge 回收」和「批量导入调大或关闭 refresh_interval」，
        这一章的考点就答全了。
      </p>

      <Practice title="手动 refresh / flush 与调优 refresh_interval">
        <p>
          先写一条文档不要 refresh，立刻搜（应该搜不到），再手动 <code>_refresh</code> 后重搜（出现了）。
          然后体验批量导入调优：把 <code>refresh_interval</code> 调大或关闭，导完再恢复。
        </p>
        <CodeBlock lang="text" title="手动 refresh 与 flush" code={refreshFlushCode} />
        <CodeBlock lang="json" title="调优 refresh_interval" code={intervalCode} />
      </Practice>

      <Summary
        points={[
          '写入路径：内存 buffer + translog → refresh 生成 segment 进 FS cache 可搜 → flush 落盘清 translog。',
          '近实时（NRT）的根源是 refresh 周期性（默认 1 秒）生成 segment，文档进 segment 才可搜。',
          'segment 不可变，删除只是打标记、更新是删旧写新，靠后台 merge 合并小段并真正回收删除文档。',
          'translog 保证宕机不丢：写入先记日志并 fsync，重启时重放，flush 后清空对应 translog。',
          '批量导入时把 refresh_interval 调大或设为 -1 关闭，导完恢复，可显著提升写入吞吐。',
          'refresh 决定可搜性、flush 决定持久化，是两件不同的事，别混为一谈。',
        ]}
      />
    </>
  )
}

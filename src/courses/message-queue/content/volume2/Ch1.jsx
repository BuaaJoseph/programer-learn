import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const zeroCopySnippet = `// 传统读文件发网络：4 次拷贝 + 4 次上下文切换
read(file -> 内核缓冲 -> 用户缓冲);   // 拷贝1 + 拷贝2
write(用户缓冲 -> socket 缓冲 -> 网卡); // 拷贝3 + 拷贝4

// 零拷贝（sendfile）：内核里直接把页缓存送到网卡
sendfile(file_fd, socket_fd);
// 数据不经过用户态，省掉 2 次拷贝和 2 次切换，Kafka 消费推送就靠它`

const logStructureSnippet = `Kafka 分区在磁盘上 = 一串分段的日志文件（Segment）：

  partition-0/
    00000000000000000000.log    <- 消息本体，顺序追加
    00000000000000000000.index  <- 偏移量索引（offset -> 物理位置）
    00000000000000000000.timeindex <- 时间索引（时间戳 -> offset）
    00000000000000368769.log    <- 下一个分段，文件名=起始 offset
    ...

写：永远追加到最后一个 .log 末尾（顺序写，极快）
读：先用文件名二分定位分段，再查 .index 跳到大致位置，顺序扫到目标`

const sparseIndexSnippet = `稀疏索引（Sparse Index）：不是每条消息都建索引，而是每隔一段建一条。

  .index 内容（offset 相对值 -> 物理字节位置）：
    0    -> 0
    35   -> 4096     <- 每攒够约 4KB 才记一条
    72   -> 8192
    ...

查 offset=50：二分找到 <=50 的最近索引项(35->4096)，
            从 4096 处开始顺序扫，扫到 50 即可。
好处：索引文件小、可全部放内存；代价：定位后要扫一小段。`

export default function Ch1() {
  return (
    <article>
      <Lead>
        Kafka 是当今吞吐量天花板级别的消息系统，单机就能扛每秒百万级消息。
        这一章回答面试里最经典的 Kafka 问题——<strong>「Kafka 为什么这么快」</strong>，
        并顺着这条线讲清它处理一条请求的全流程、磁盘上日志与索引的设计亮点，以及它用<strong>时间轮</strong>
        高效管理海量延时任务的巧思。理解了这些「为什么快」的底层抉择，你就抓住了 Kafka 设计的灵魂。
      </Lead>

      <h2>一、Kafka 高性能的四根支柱</h2>
      <p>
        Kafka 的快不是某个单点优化，而是一套环环相扣的设计。面试时能成体系地讲出这四点，远胜零散记忆。
      </p>

      <h3>支柱一：顺序写磁盘</h3>
      <p>
        Kafka 把每个分区当作一个<strong>只追加（append-only）的日志</strong>，新消息永远写到文件末尾。
        顺序写磁盘的速度可以接近甚至超过随机写内存——因为机械盘省去了寻道，SSD 也对顺序写更友好。
        Kafka 故意放弃了「随机读写」的灵活性，换来了「顺序写」的极致速度。
      </p>

      <h3>支柱二：页缓存（Page Cache）</h3>
      <p>
        Kafka 不自己在 JVM 堆里维护消息缓存，而是<strong>把缓存交给操作系统的页缓存</strong>。
        写消息先进 page cache，由 OS 异步刷盘；读消息时大概率命中 page cache，根本不碰磁盘。
        这样既避免了 JVM 大堆带来的 GC 压力，又复用了 OS 高度优化的缓存机制，重启后缓存还在（属于 OS）。
      </p>

      <h3>支柱三：零拷贝（Zero-Copy）</h3>
      <p>
        给消费者发消息时，Kafka 用 <code>sendfile</code> 系统调用，让数据<strong>在内核态直接从页缓存送到网卡</strong>，
        不经过用户态、省掉两次内存拷贝和两次上下文切换。这对「读多」的消费推送场景提速明显。
      </p>
      <CodeBlock lang="text" title="零拷贝省掉了用户态的两次拷贝" code={zeroCopySnippet} />

      <h3>支柱四：批量与压缩</h3>
      <p>
        生产者不是一条一条发，而是<strong>攒一批（batch）再发</strong>；Broker 也按批存储、按批投递。
        批量摊薄了网络与系统调用的固定开销，还能整批压缩（gzip/snappy/lz4/zstd），网络与磁盘传输的数据量大幅下降。
        分区机制则提供了<strong>横向扩展的并行度</strong>——多分区多机器同时读写。
      </p>
      <KeyIdea>
        Kafka 快的本质：<strong>顺序写盘 + 页缓存 + 零拷贝 + 批量压缩</strong>，再叠加分区带来的水平并行。
        它的核心取舍是「牺牲随机访问的灵活性，把一切优化压在『顺序、批量、零拷贝』这条主线上」，
        所以特别适合高吞吐的日志与流场景。
      </KeyIdea>

      <h2>二、一条请求的处理全流程</h2>
      <p>
        Kafka Broker 用一套<strong>Reactor 风格的网络模型</strong>处理请求，理解它能解释「为什么高并发下还稳」。
      </p>
      <ol>
        <li><strong>Acceptor 线程</strong>：监听端口，接收新连接，把连接分给若干 Processor 线程。</li>
        <li><strong>Processor（网络线程）</strong>：负责读取请求字节、写回响应，但<strong>不处理业务</strong>，
          只把解析好的请求放入一个共享的<strong>请求队列</strong>。</li>
        <li><strong>KafkaRequestHandler（IO 线程池）</strong>：从请求队列取请求，真正干活——
          写消息到日志、读消息、处理元数据等，处理完把响应放回对应 Processor 的响应队列。</li>
        <li><strong>Processor</strong> 再把响应写回客户端。</li>
      </ol>
      <p>
        这种「网络线程只管收发、IO 线程专心干活」的<strong>职责分离</strong>，让 Kafka 能用少量线程扛住大量连接，
        是它高并发的工程基础。
      </p>

      <h2>三、磁盘存储与索引设计</h2>
      <p>
        分区在磁盘上是一串<strong>分段（Segment）日志文件</strong>。每个 Segment 由 <code>.log</code>（消息本体）、
        <code>.index</code>（偏移量索引）、<code>.timeindex</code>（时间索引）三件套组成，文件名是该段的起始 offset。
      </p>
      <CodeBlock lang="text" title="分区的磁盘结构：分段日志 + 索引三件套" code={logStructureSnippet} />

      <h3>稀疏索引：小而快的设计亮点</h3>
      <p>
        Kafka 的索引是<strong>稀疏索引</strong>——不为每条消息建索引，而是每写够一定字节（默认约 4KB）才记一条
        「offset → 物理位置」。这样索引文件<strong>足够小，能整个加载进内存</strong>。查找时先二分索引找到最近的锚点，
        再从那里顺序扫一小段到目标。用「定位后扫一点」的小代价，换来索引常驻内存的大收益，是空间与时间的精妙权衡。
      </p>
      <CodeBlock lang="text" title="稀疏索引：每隔一段建一条，文件小可入内存" code={sparseIndexSnippet} />
      <Callout variant="note" title="为什么文件名用起始 offset">
        因为查某个 offset 时，可以先用文件名对所有 Segment 做<strong>二分查找</strong>，瞬间定位它在哪个段，
        再进段内查稀疏索引。两级二分让海量消息里的定位依然飞快。
      </Callout>

      <h2>四、时间轮：高效管理海量延时任务</h2>
      <p>
        Kafka 内部有大量<strong>延时操作</strong>：延时拉取（长轮询等消息）、延时生产（等 acks）、心跳超时等。
        如果用 <code>DelayQueue</code>（基于堆），插入和取出都是 O(log n)，海量任务下性能堪忧。
        Kafka 选择了<strong>时间轮（Timing Wheel）</strong>。
      </p>
      <p>
        时间轮像一个钟表：一圈被分成若干<strong>格子（bucket）</strong>，每格代表一个时间跨度，每格挂一个任务链表。
        一根指针随时间推进，转到哪格就触发哪格里到期的任务。<strong>添加任务 O(1)、删除 O(1)、推进 O(1)</strong>——
        因为不需要排序，只按到期时间扔进对应格子。对于「到期就触发」的延时任务，这比堆高效得多。
      </p>
      <p>
        任务时间超出一圈怎么办？Kafka 用<strong>多层时间轮</strong>：低层轮精度高、覆盖短；高层轮一格代表低层一整圈，覆盖长。
        长延时任务先放高层轮，随时间被「降级」到低层轮，最终精确触发。类似钟表的时、分、秒针分层。
      </p>
      <Example title="时间轮 vs 延时队列直观对比">
        <p>
          假设有 10 万个延时任务。<strong>DelayQueue（堆）</strong>：每次插入/取出 O(log 10万) ≈ 17 次比较。
        </p>
        <p>
          <strong>时间轮</strong>：插入就是「算出该进哪个格子，挂上去」，O(1)；指针每跳一格只处理该格的到期任务。
          海量任务下，时间轮在「插入 + 推进」的整体开销上明显更优，这正是 Kafka 选它的原因。
        </p>
      </Example>

      <h2>五、面试精讲</h2>

      <h3>Q1：Kafka 为什么能这么快？</h3>
      <p>
        <strong>原创讲解。</strong>不要只蹦「零拷贝」一个词，要成体系。我会答四点 + 一句总纲：
      </p>
      <ul>
        <li><strong>顺序写盘</strong>：分区是 append-only 日志，顺序写接近内存速度，放弃随机写换极致顺序写。</li>
        <li><strong>页缓存</strong>：缓存交给 OS page cache，避开 JVM GC，读多命中缓存不碰盘。</li>
        <li><strong>零拷贝</strong>：sendfile 在内核直接把页缓存送网卡，省两次拷贝两次切换。</li>
        <li><strong>批量 + 压缩 + 分区并行</strong>：攒批发送摊薄开销、整批压缩降传输量、多分区水平并行。</li>
      </ul>
      <p>
        总纲：<strong>「Kafka 把一切都压在顺序、批量、零拷贝这条主线上，牺牲随机访问灵活性换吞吐」</strong>。
      </p>
      <p>
        <strong>易错点。</strong>有人把「零拷贝」说成「不拷贝任何数据」——其实是省掉<strong>用户态的两次拷贝</strong>，
        内核内仍有必要的传输。表述要准确。
      </p>

      <h3>Q2：Kafka 的索引为什么用稀疏索引？查一条消息的完整路径是怎样的？</h3>
      <p>
        <strong>原创讲解。</strong>用稀疏索引是为了<strong>让索引小到能常驻内存</strong>。若为每条消息都建索引，
        索引文件会和数据一样大，放不进内存，查找又要读盘，得不偿失。稀疏索引每隔约 4KB 才记一条，文件极小。
      </p>
      <p>查一条 offset 的完整路径（两级二分 + 顺序扫）：</p>
      <ol>
        <li>用各 Segment 的<strong>文件名（起始 offset）二分</strong>，定位目标在哪个 Segment。</li>
        <li>在该段的 <code>.index</code> 里<strong>二分</strong>，找到不大于目标 offset 的最近索引项（锚点）。</li>
        <li>从锚点对应的物理位置开始<strong>顺序扫描 .log</strong>，扫到目标 offset。</li>
      </ol>
      <p>
        <strong>面试追问：</strong>「时间索引 timeindex 干嘛用？」——支持按时间戳查 offset，
        典型场景是「从某个时间点开始消费」或按时间做日志保留/检索，它把时间戳映射到 offset，再走上面的流程。
      </p>

      <h3>Q3：Kafka 为什么用时间轮而不是 DelayQueue 管延时任务？</h3>
      <p>
        <strong>原创讲解。</strong>核心是<strong>复杂度</strong>。延时任务多到几万几十万时，基于堆的 DelayQueue 插入/删除都是 O(log n)，
        而时间轮把任务按到期时间「扔进对应格子」，<strong>添加、删除、推进都是 O(1)</strong>，不需要全局排序。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>DelayQueue（堆）</th><th>时间轮</th></tr>
        </thead>
        <tbody>
          <tr><td>插入/删除</td><td>O(log n)</td><td>O(1)</td></tr>
          <tr><td>是否需排序</td><td>需要</td><td>不需要（按格子分桶）</td></tr>
          <tr><td>海量任务表现</td><td>随 n 增长变慢</td><td>基本恒定</td></tr>
          <tr><td>长延时支持</td><td>天然支持</td><td>靠多层时间轮分层降级</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「延时超过一圈怎么办？」——多层时间轮：长延时先进覆盖范围大的高层轮，
        随指针推进逐层「降级」到精度更高的低层轮，最终精确触发，类似时分秒针的分层结构。
      </p>

      <h3>Q4：Kafka 既然用页缓存，那它怎么保证消息不丢？数据不还在内存里吗？</h3>
      <p>
        <strong>原创讲解。</strong>这是个很好的反向追问——页缓存确实意味着「写成功」时数据可能还在内存（page cache）没真正落盘。
        Kafka 的答案是<strong>「不靠单机刷盘保证可靠，而靠多副本」</strong>。
      </p>
      <ul>
        <li><strong>不强依赖 fsync</strong>：Kafka 默认不为每条消息强制 fsync，而是依赖 OS 异步刷盘——这正是它高吞吐的来由之一。</li>
        <li><strong>用副本对冲单机风险</strong>：消息写入 leader 后，会复制到多个 follower（ISR）。
          配 <code>acks=all</code> 时，要等所有 ISR 副本都收到才算成功。即使某台机器还没刷盘就宕机，<strong>其他副本上有这条消息</strong>，不丢。</li>
        <li><strong>本质是用「分布式冗余」替代「单机持久化」</strong>：与其赌单机磁盘，不如让数据在多台机器上都有一份，可用性和可靠性都更好。</li>
      </ul>
      <table>
        <thead>
          <tr><th>可靠性手段</th><th>Kafka 的取舍</th></tr>
        </thead>
        <tbody>
          <tr><td>单机同步刷盘</td><td>默认不强制（太慢，伤吞吐）</td></tr>
          <tr><td>多副本 + acks=all</td><td>主力手段，靠冗余保证不丢</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「那如果所有副本所在机器同时断电呢？」——极端情况下页缓存里未刷盘的数据可能丢，
        这是 Kafka 用「吞吐换极端可靠」的取舍。要更强保证可调大刷盘频率或开同步刷盘，但会牺牲吞吐——又回到「快 vs 稳」的权衡。
      </p>

      <Summary
        points={[
          'Kafka 高性能四支柱：顺序写盘（append-only 日志）、页缓存（交给 OS 避 GC）、零拷贝（sendfile 省用户态拷贝）、批量+压缩；再叠加分区水平并行。',
          '核心取舍：牺牲随机访问灵活性，把一切压在顺序、批量、零拷贝主线上，因而极擅长高吞吐日志与流场景。',
          '请求处理用 Reactor 模型：Acceptor 接连接、Processor 网络线程只收发、IO 线程池专心处理业务，职责分离支撑高并发。',
          '存储是分段日志（.log/.index/.timeindex），文件名为起始 offset；稀疏索引每隔约 4KB 记一条，小到可入内存，查找走「文件名二分→段内索引二分→顺序扫」。',
          '时间轮管延时任务：按到期时间分桶，添加/删除/推进 O(1)，优于堆的 O(log n)；多层时间轮通过分层降级支持长延时。',
        ]}
      />
    </article>
  )
}

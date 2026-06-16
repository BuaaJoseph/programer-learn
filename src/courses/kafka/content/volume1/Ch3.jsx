import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LogStorage from '@/courses/kafka/illustrations/LogStorage.jsx'

const lsSegments = `# 进入某个分区的数据目录（orders-0 表示 orders 这个 topic 的 0 号分区）
ls -lh /tmp/kafka-logs/orders-0/

# 典型输出：每个 segment 由三个同名前缀的文件组成
# 00000000000000000000.log     消息本体（顺序追加写在这里）
# 00000000000000000000.index   稀疏的 offset -> 物理位置 索引
# 00000000000000000000.timeindex 时间 -> offset 索引
# 00000000000000368500.log     滚动出的下一个 segment，文件名是它的起始 offset`

const segmentConfig = `# server.properties 里几个和 segment、清理相关的关键配置

# 单个 segment 文件多大就滚动一个新的（默认 1G）
log.segment.bytes=1073741824

# segment 最长多久滚动一次（即便没写满）
log.roll.hours=168

# 索引文件最大大小，影响索引稀疏程度
log.index.size.max.bytes=10485760

# 消息保留多久后过期删除（默认 7 天）
log.retention.hours=168`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          这里有个反直觉的事实：Kafka 把数据全写在<strong>磁盘</strong>上，吞吐却能甩开很多纯内存的队列。
          磁盘不是出了名的慢吗？答案是——Kafka 用对了磁盘的「正确用法」。
          这一章拆开它的存储原理，把上一卷预告的「为什么快」一次讲透。
        </p>
      </Lead>

      <h2>顺序写：磁盘也能快得像内存</h2>
      <p>
        我们说磁盘慢，指的是<strong>随机读写</strong>慢：磁头要来回寻道，或 SSD 要做地址映射。但如果是
        <em>sequential write</em>（顺序写）——一直往文件末尾追加，不回头——磁盘的吞吐能逼近内存。
        Kafka 的每个分区就是一条只追加的日志，写消息永远是「在末尾追加」，天然就是顺序写。这是它快的第一根支柱。
      </p>

      <Example title="为什么用磁盘还这么快">
        <p>
          常见的误会是「快的系统一定把数据放内存」。Kafka 偏不：它让消息顺序落盘，再借操作系统的
          <em>page cache</em>（页缓存）把热数据自动留在内存里。写的时候是顺序追加（快），
          读的时候大多命中 page cache（也快），既有了磁盘的持久与廉价大容量，又拿到了接近内存的速度。
          所以「用磁盘」和「快」在 Kafka 这里并不矛盾，关键全在<strong>用顺序、靠 OS 缓存</strong>。
        </p>
      </Example>

      <h2>分段日志：segment 加稀疏索引</h2>
      <p>
        一个分区的日志要是只有一个无限增长的大文件，删旧数据、定位消息都会很难。Kafka 把分区日志切成一段段
        <em>segment</em>（分段）：写满一定大小（默认 1G）就滚动出新的一段，文件名是这段的起始 offset。
        删旧数据时只要整段删除，不用在大文件里抠，干净利落。
      </p>
      <p>
        每个 segment 配一个 <em>sparse index</em>（稀疏索引）：它不是给每条消息都建索引，而是每隔若干条记一条
        「offset → 文件物理位置」。查一条消息时，先用二分在稀疏索引里找到离它最近的位置，再从那里顺序扫一小段就到了。
        稀疏索引体积小、能整个放进内存，查找又足够快——典型的空间换时间的折中。
      </p>

      <LogStorage />

      <h2>page cache：把缓存交给操作系统</h2>
      <p>
        Kafka 没有自己实现一套复杂的内存缓存，而是直接依赖操作系统的 <strong>page cache</strong>。
        写消息时数据先进 page cache，由 OS 决定何时刷盘；读消息时若数据还在 page cache 就直接命中，根本不碰磁盘。
        好处是省去了 JVM 堆内缓存的开销与 GC 压力，缓存大小随系统空闲内存自动伸缩，重启进程缓存也还在（因为它在 OS 那边）。
      </p>

      <h2>零拷贝：sendfile 少绕两趟</h2>
      <p>
        把一段磁盘数据发给消费者，传统做法要经历<strong>四次拷贝</strong>：磁盘 → 内核缓冲区 → 用户空间应用缓冲区 →
        socket 内核缓冲区 → 网卡，中间还伴随多次用户态/内核态切换。数据只是「过个路」，却被反复搬运。
      </p>
      <p>
        Kafka 用 <em>zero-copy</em>（零拷贝），底层走 <code>sendfile</code> 系统调用：内核直接把 page cache 里的数据
        送到 socket 缓冲区（甚至网卡），<strong>不再经过用户空间</strong>。拷贝次数从四次降到两次（甚至更少），
        上下文切换也大幅减少。海量数据分发时，这一步省下的 CPU 和内存带宽非常可观。
      </p>

      <KeyIdea title="高吞吐是这几件事叠出来的">
        <p>
          没有单独的「黑科技」，是四件事乘在一起：<strong>顺序写</strong>让落盘接近内存速度、
          <strong>分段日志加稀疏索引</strong>让定位和清理都高效、<strong>page cache</strong>把缓存交给 OS 省心又高效、
          <strong>零拷贝</strong>让数据分发少绕几趟内存。再叠上生产消费两端的<strong>批量加压缩</strong>，
          单位数据的开销被压到极低，吞吐自然就上去了。
        </p>
      </KeyIdea>

      <h2>批量加压缩：把每条消息的开销摊薄</h2>
      <p>
        生产者不是来一条发一条，而是把消息攒成一<em>batch</em>（批）再发，整批一起压缩（如 gzip、lz4、zstd）。
        批量减少了网络往返和系统调用次数，压缩减少了网络与磁盘的数据量；而且 Kafka 存的就是压缩后的批，
        消费者整批取走再解压，broker 全程不用解压——又省一道功夫。批越大，单条消息分摊到的固定开销越小。
      </p>

      <Callout variant="warn" title="高吞吐的代价要心里有数">
        <p>
          这些优化也有副作用：依赖 page cache 意味着<strong>数据可能还在缓存没落盘时机器就宕机</strong>，
          所以可靠性要靠副本而不是单机刷盘来兜底；批量发送会引入<strong>一点延迟</strong>（攒批等待），
          对超低延迟场景要调小 batch 或等待时间。Kafka 的定位是「高吞吐」，不是「最低延迟」，选型时别搞错。
        </p>
      </Callout>

      <h3>面试怎么答</h3>
      <p>
        被问「Kafka 为什么快」，按这条线说最稳：「顺序写磁盘接近内存速度；日志分段加稀疏索引让定位和清理高效；
        依赖操作系统 page cache 做缓存；发送走零拷贝 sendfile，比传统四次拷贝少绕用户空间；再加批量和压缩摊薄单条开销。
        这几点叠加才有了高吞吐。」能顺带说出「四次拷贝是哪四次」和「为什么顺序写比随机写快」，就是加分项。
      </p>

      <Practice title="翻一眼真实的 segment 文件与配置">
        <p>
          找到某个分区的数据目录，看看 segment 是怎么由 <code>.log</code>、<code>.index</code>、<code>.timeindex</code>
          三类文件组成的，文件名又是怎么用起始 offset 命名的。
        </p>
        <CodeBlock lang="bash" title="查看分区目录下的 segment 文件" code={lsSegments} />
        <p>
          再看几个和分段、保留相关的核心配置。试着把 <code>log.segment.bytes</code> 调小，多发点消息，
          观察目录里是不是滚动出了更多 segment 文件——这能直观感受「分段」是怎么发生的。
        </p>
        <CodeBlock lang="bash" title="segment 与保留相关配置" code={segmentConfig} />
      </Practice>

      <Summary
        points={[
          '顺序写磁盘只在末尾追加，吞吐接近内存；Kafka 的只追加日志天然就是顺序写，这是快的第一根支柱。',
          '分区日志切成 segment 分段，配稀疏索引（每隔若干条记一条 offset 到位置），定位用二分加小段顺扫，清理直接整段删。',
          'Kafka 把缓存交给操作系统的 page cache，省去堆内缓存与 GC 开销，缓存随空闲内存伸缩、重启仍在。',
          '零拷贝走 sendfile，数据从 page cache 直送 socket，不经用户空间，把传统的四次拷贝减到两次，省 CPU 与带宽。',
          '生产消费两端批量加压缩，摊薄每条消息的网络与磁盘开销；broker 存压缩批、不解压，又省一道。',
          '代价：依赖 page cache 要靠副本兜底防丢，批量会引入少量延迟；Kafka 定位高吞吐而非最低延迟。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import PartitionModel from '@/courses/kafka/illustrations/PartitionModel.jsx'

const createMultiPartition = `# 建一个 6 分区的订单 topic
bin/kafka-topics.sh --create \\
  --topic orders \\
  --partitions 6 \\
  --replication-factor 1 \\
  --bootstrap-server localhost:9092

# 查看每个分区的 leader、副本、offset 范围
bin/kafka-topics.sh --describe --topic orders \\
  --bootstrap-server localhost:9092`

const checkOffset = `# 查看每个分区当前的最新 offset（末尾位置）
bin/kafka-run-class.sh kafka.tools.GetOffsetShell \\
  --broker-list localhost:9092 \\
  --topic orders

# 带 key 发送，相同 key 会落到同一分区
bin/kafka-console-producer.sh \\
  --topic orders \\
  --property parse.key=true \\
  --property key.separator=: \\
  --bootstrap-server localhost:9092
> u1001:下单 iphone
> u1001:下单 耳机
> u2002:下单 键盘`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说 Kafka 把消息当只追加日志来存，那「日志」具体长什么样？答案藏在三个最核心的概念里：
          <em>topic</em>、<em>partition</em>、<em>offset</em>。面试里这是必考题，但很多人只会背定义，
          答不出「为什么要分区」「offset 到底是什么粒度的」。这一章用一个订单的例子把它们串清楚。
        </p>
      </Lead>

      <h2>Topic：消息的逻辑分类</h2>
      <p>
        <strong>Topic</strong> 是消息的逻辑分类，相当于一张「表名」：订单走 <code>orders</code>，日志走 <code>logs</code>。
        生产者发消息要指定 topic，消费者订阅 topic 来读。topic 只是个逻辑概念，真正存数据的是它下面的分区。
      </p>

      <h2>Partition：并行与扩展的单位</h2>
      <p>
        一个 topic 在物理上被切成若干 <strong>partition</strong>（分区），每个分区就是一条独立的、只追加的日志。
        分区是 Kafka 里<em>最关键</em>的概念，因为它同时是<strong>并行的单位</strong>和<strong>扩展的单位</strong>：
      </p>
      <ul>
        <li>
          <strong>并行</strong>：一个消费者组里，一个分区只能由组内一个消费者读。所以分区数决定了一个消费者组能并行到几个消费者——
          这是消费端并行度的上限。
        </li>
        <li>
          <strong>扩展</strong>：不同分区可以分散到不同的 broker（服务器）上，写入和读取的压力被摊开。topic 想扛更大吞吐，就加分区、加机器。
        </li>
      </ul>

      <PartitionModel />

      <h2>Offset：分区内的消费位置</h2>
      <p>
        每条消息写进某个分区时，会被分配一个 <strong>offset</strong>：它是<em>分区内</em>唯一的、从 0 开始单调递增的编号。
        注意「分区内」三个字——offset 只在单个分区里有意义，不同分区各有各的 offset 序列，<strong>没有全局 offset</strong>。
      </p>
      <p>
        消费者读到哪了，就用「分区 + offset」来记录，这叫<em>消费位移</em>。下次接着从这个位置往后读。
        因为消息读完不删，消费者完全可以把 offset 改回去重读历史，或者跳着读——位置完全由消费者自己掌控。
      </p>

      <Example title="订单按 userId 分区保证同用户有序">
        <p>
          需求：同一个用户的下单、改单、取消，必须按发生顺序处理；不同用户之间则无所谓顺序。
          Kafka 的整体顺序是<strong>不保证</strong>的，它只保证<strong>单个分区内有序</strong>。怎么办？
        </p>
        <p>
          发消息时带上 <em>key</em>，用 <code>userId</code> 当 key。Kafka 默认用 <code>hash(key) % 分区数</code>
          来决定落到哪个分区，于是同一个 <code>userId</code> 的消息<strong>永远落在同一个分区</strong>，自然就保证了局部有序。
          不同用户被打散到各个分区，整体又能并行。这就是「用 key 换局部有序」的经典套路。
        </p>
      </Example>

      <KeyIdea title="key 决定分区，分区保证有序">
        <p>
          把这两句连起来背：<strong>有序性只在分区内成立</strong>，而<strong>消息落哪个分区由 key 的 hash 决定</strong>。
          所以「想让某一类消息有序」就让它们带相同的 key。反过来，如果不带 key，消息会被轮询打散到各分区，
          全局看上去就是乱序的——这是面试高频陷阱。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="分区数怎么定，定了别乱改">
        <p>
          分区数是个需要提前想清楚的决策：它是消费并行度的上限，太少会限制吞吐，太多又会增加元数据和文件句柄开销、拉长选主时间。
          更要命的是——分区数<strong>只能增不能减</strong>，而且<strong>增加分区会改变 hash(key) % 分区数 的结果</strong>，
          导致同一个 key 之后落到新分区，破坏原有的局部有序。所以一开始就要按预期吞吐量留好余量，不要随意扩缩。
        </p>
      </Callout>

      <h2>Replica：副本（下一卷展开）</h2>
      <p>
        每个分区还可以有多个 <em>replica</em>（副本），分布在不同 broker 上：其中一个是 leader 负责读写，其余是 follower 同步数据。
        某台机器挂了，副本能顶上，保证不丢数据。副本机制（leader、follower、ISR、ack）是高可用的核心，这里先记住有这回事，
        细节留到讲可靠性时再展开。
      </p>

      <h3>面试怎么答</h3>
      <p>
        被问「topic、partition、offset 的关系」，一句话框架：「topic 是逻辑分类，物理上切成多个 partition；partition 是并行和扩展单位，
        每个 partition 是一条只追加日志；offset 是分区内唯一递增的消息编号，也是消费位置。Kafka 只保证分区内有序，
        靠相同 key 路由到同一分区来实现局部有序。」能把「为什么分区」「为什么没有全局有序」说清楚，就比背定义高一档。
      </p>

      <Practice title="建多分区 topic，观察分区与 offset">
        <p>
          建一个多分区 topic，用 <code>--describe</code> 看清每个分区的 leader 和副本，再用 GetOffsetShell 观察 offset 的增长。
        </p>
        <CodeBlock lang="bash" title="创建并查看分区" code={createMultiPartition} />
        <p>
          然后带 key 发几条消息，故意让两条用同一个 <code>userId</code>。发完再查一次各分区 offset，
          你会发现相同 key 的消息让<strong>同一个分区</strong>的 offset 增长，而不同 key 落到了别的分区——亲眼验证「key 决定分区」。
        </p>
        <CodeBlock lang="bash" title="查看 offset 并带 key 发送" code={checkOffset} />
      </Practice>

      <Summary
        points={[
          'Topic 是消息的逻辑分类；物理上一个 topic 切成多个 partition，每个 partition 是一条独立的只追加日志。',
          'Partition 是并行与扩展的单位：一个分区在一个消费者组内只由一个消费者读，分区还能分散到不同 broker 摊开压力。',
          'Offset 是分区内唯一、从 0 单调递增的消息编号，也是消费位置；没有全局 offset，跨分区不可比。',
          'Kafka 只保证分区内有序；发消息带 key，hash(key) % 分区数 决定分区，相同 key 落同一分区即得局部有序。',
          '分区数是并行度上限，只能增不能减，且增加分区会改变 key 的落点、破坏原有有序，需提前按吞吐留余量。',
          'Replica（副本）提供高可用：leader 读写、follower 同步，细节留到可靠性章节展开。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const createTopicCmd = `# 创建一个名为 logs 的 topic，3 个分区，副本数 1
bin/kafka-topics.sh --create \\
  --topic logs \\
  --partitions 3 \\
  --replication-factor 1 \\
  --bootstrap-server localhost:9092

# 查看 topic 列表与详情
bin/kafka-topics.sh --list --bootstrap-server localhost:9092
bin/kafka-topics.sh --describe --topic logs --bootstrap-server localhost:9092`

const produceConsumeCmd = `# 终端 A：启动一个控制台生产者，逐行输入即逐条发送
bin/kafka-console-producer.sh \\
  --topic logs \\
  --bootstrap-server localhost:9092
> hello kafka
> 第二条消息

# 终端 B：从头消费这个 topic 的全部消息
bin/kafka-console-consumer.sh \\
  --topic logs \\
  --from-beginning \\
  --bootstrap-server localhost:9092`

const offsetDemoCmd = `# 观察「读完不删」：消费者位置(offset)只是个游标
# 同一个 topic 用两个不同的消费组从头读，互不影响
bin/kafka-console-consumer.sh --topic logs --from-beginning \\
  --group g1 --bootstrap-server localhost:9092

bin/kafka-console-consumer.sh --topic logs --from-beginning \\
  --group g2 --bootstrap-server localhost:9092

# 查看某个组各分区已经读到哪个 offset、还差多少(LAG)
bin/kafka-consumer-groups.sh --describe --group g1 \\
  --bootstrap-server localhost:9092`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          面试里被问到「为什么选 Kafka 而不是 RabbitMQ」，答不上来的人往往会绕到「Kafka 性能好」就卡住了。
          真正的答案要从一句话讲起：Kafka 把消息当成一条<strong>只追加的日志</strong>来存，所有设计都是为「高吞吐」服务的。
          理解了这一点，它和传统消息队列的所有区别都能顺下来。
        </p>
      </Lead>

      <h2>Kafka 到底是什么</h2>
      <p>
        Kafka 是一个<em>distributed publish-subscribe</em>（分布式发布订阅）系统。生产者（producer）把消息发到某个
        <em>topic</em>，消费者（consumer）订阅这个 topic 来读消息——这点和所有消息队列一样。不一样的是它存消息的方式：
        Kafka 不是把消息「投递完就删」，而是把每条消息<strong>顺序追加</strong>到磁盘上的一个日志文件里，读和写都围绕这个日志展开。
      </p>
      <p>
        所以更准确的说法是：Kafka 是一个「日志型」的消息中间件，或者叫<em>distributed commit log</em>（分布式提交日志）。
        消息发进来就是往日志末尾写一行，消费就是按位置往后读，读过的消息默认不删除，按时间或大小到期才清理。
        这个「日志」模型，正是它能扛住超高吞吐的根。
      </p>
      <p>
        把这套模型拆成几个名词，后面整本书都会反复用到：<em>topic</em> 是逻辑上的一类消息（比如「订单」「点击流」）；
        每个 topic 物理上切成若干 <em>partition</em>（分区），分区才是 Kafka 真正的并行与存储单元；
        分区里的每条消息有一个单调递增的编号叫 <em>offset</em>（位移），它就是这条消息在该分区日志里的「行号」；
        消费者读到哪了，记的不是「哪些消息确认过」，而是<strong>一个 offset 游标</strong>——这是它和传统队列最关键的认知差异。
      </p>

      <table>
        <thead>
          <tr><th>概念</th><th>一句话理解</th><th>类比</th></tr>
        </thead>
        <tbody>
          <tr><td>Topic</td><td>一类消息的逻辑名字</td><td>一张表名</td></tr>
          <tr><td>Partition</td><td>topic 的物理切片，顺序日志</td><td>表的一个分片文件</td></tr>
          <tr><td>Offset</td><td>消息在分区内的行号</td><td>文件里的字节/行偏移</td></tr>
          <tr><td>Broker</td><td>一台 Kafka 服务进程</td><td>一个存储节点</td></tr>
          <tr><td>Consumer Group</td><td>共享进度的一组消费者</td><td>一个下游业务方</td></tr>
        </tbody>
      </table>

      <h3>和 RabbitMQ 的根本区别</h3>
      <p>
        很多人把两者当成同类产品，其实它们的设计目标几乎相反。RabbitMQ 是传统的<em>message broker</em>，
        强项是<strong>灵活路由</strong>：它有 exchange、binding、routing key，能把一条消息按规则精确投递给某些队列，
        适合「这条订单消息只给库存服务和风控服务」这种业务路由。
      </p>
      <ul>
        <li>
          <strong>吞吐 vs 路由</strong>：Kafka 牺牲灵活路由，换来极致吞吐；RabbitMQ 牺牲单机吞吐，换来灵活的投递规则。
        </li>
        <li>
          <strong>pull vs push</strong>：Kafka 消费者主动<em>pull</em>（拉）消息，自己控制速度、自己记位置；
          RabbitMQ 默认是 broker 主动<em>push</em>（推）给消费者，broker 要替每个消费者跟踪投递状态。
        </li>
        <li>
          <strong>分区并行</strong>：Kafka 的一个 topic 切成多个<em>partition</em>，可以分散到不同机器上并行读写；
          RabbitMQ 的队列本身不天然横向切分，扩展并行度更费劲。
        </li>
        <li>
          <strong>消息去留</strong>：Kafka 消息读完不删、可重复消费、可回放历史；RabbitMQ 消息被确认（ack）后通常就删了。
        </li>
      </ul>
      <p>
        为什么 push 模型扛不住高吞吐？因为 broker 要为每个消费者维护「这条投递了没、ack 了没、要不要重发」的状态机，
        消费者一慢，broker 内存里堆积的未确认状态就爆炸。Kafka 反过来：broker 只管把消息顺序写进日志，
        <strong>「消费到哪了」这件事完全甩给消费者自己</strong>，broker 几乎无状态，自然能轻装上阵冲吞吐。
        这就是「pull + offset 游标」相比「push + 逐条 ack」在吞吐上的结构性优势。
      </p>

      <Example title="日志采集每秒百万条">
        <p>
          假设你要收集全公司上千台服务器的日志，高峰期每秒产生上百万条。如果用「投递完即删、按消息逐条 ack」的传统队列，
          broker 要为海量小消息维护投递状态，很快就被压垮。
        </p>
        <p>
          换成 Kafka：把日志 topic 切成 50 个分区，分到几台 broker 上，每个分区都是顺序追加写磁盘。生产者把消息
          <strong>批量打包</strong>发送，消费者（比如写入 ES 的程序）按自己的节奏成批拉取。同样的硬件，吞吐能高出一个数量级。
          这就是为什么「日志收集」几乎是 Kafka 的标配场景。
        </p>
      </Example>

      <KeyIdea title="一切为吞吐让路">
        <p>
          记住这条主线：Kafka 的每个设计选择——只追加日志、分区、pull、批量、消息不立即删——
          都是在用「放弃一部分灵活性」交换「更高的吞吐」。当你比较它和别的 MQ 时，先问一句
          <strong>「这个特性是为吞吐服务的吗」</strong>，答案几乎都是「是」。
        </p>
      </KeyIdea>

      <h2>三大典型场景</h2>
      <ul>
        <li>
          <strong>日志收集</strong>：海量日志先汇聚到 Kafka，再分发给搜索、监控、数仓等多个下游，互不影响。
        </li>
        <li>
          <strong>流处理</strong>：Kafka 当作流式数据的「管道」，配合 Flink、Kafka Streams 做实时计算（如实时大盘、风控）。
          消息可回放的特性让重算历史数据变得简单。
        </li>
        <li>
          <strong>解耦与削峰</strong>：上游突发流量先堆进 Kafka，下游按自己能力慢慢消费，避免被瞬时高峰打挂；
          同时上下游不再直接调用，彼此解耦。
        </li>
      </ul>
      <p>
        还有两个被低估但极常见的用法值得点名：一是<strong>事件溯源 / CDC</strong>——把数据库的变更（Change Data Capture）
        写进 Kafka，作为整个系统的「事实日志」，下游各自重建自己的视图；二是<strong>服务间的异步事件总线</strong>——
        微服务发布领域事件，多个订阅方各取所需，天然支持「一份数据多方消费」。这两类场景共同看中的，
        依然是 Kafka「写一次、多方读、可回放」的日志本质。
      </p>

      <Callout variant="warn" title="别拿它当业务路由用">
        <p>
          如果你的需求是「一条消息按复杂规则精确投递给某几个消费者」「需要消息优先级」「需要单条消息级别的 ack 与重试」，
          这些恰恰是 Kafka 的弱项，硬上会很别扭。这类场景 RabbitMQ 往往更合适。
          选型先看<strong>你要的是吞吐还是路由</strong>，别被「大厂都在用 Kafka」带跑偏。
        </p>
      </Callout>

      <h2>为什么它能这么快</h2>
      <p>
        Kafka 的高吞吐不是靠某一个黑科技，而是四件事叠在一起：消息按<em>partition</em>分区并行、写盘是<strong>顺序追加</strong>
        （比随机写快几个数量级）、发送数据走<em>zero-copy</em>（零拷贝）少绕几层内存、生产消费都<strong>批量 + 压缩</strong>。
        这几点是后面三章的主线，这里先记住名字，知道「快是设计出来的」就够了。
      </p>
      <p>
        多解释一句「顺序写为什么快」：很多人以为「磁盘慢、内存快」，但机械盘的真正瓶颈是<strong>磁头寻道</strong>，
        随机写要不停寻道，而顺序写几乎没有寻道开销，吞吐可以逼近内存级别。Kafka 永远只往日志末尾追加，
        天生就是顺序写。再叠加操作系统的<strong>页缓存（page cache）</strong>——写入先落到内存页缓存，
        读取热数据也直接命中页缓存——Kafka 自己几乎不维护应用层缓存，把内存管理交给操作系统，既省事又快。
        这些机制的细节会在「存储原理」一章展开，这里先建立直觉。
      </p>

      <Callout variant="info" title="面试常见追问">
        <p>
          被问「Kafka 一定比 RabbitMQ 快吗」，标准答法是<strong>分场景</strong>：大批量、顺序、可回放、单机超高吞吐，Kafka 赢；
          少量消息、复杂路由、强单条投递语义、低延迟点对点，RabbitMQ 不输甚至更顺手。再被追问「Kafka 延迟高吗」——
          它靠批量攒吞吐，所以<strong>极低延迟不是它的强项</strong>，可以调小 <code>linger.ms</code> 和 <code>batch.size</code> 换低延迟，
          但那是在和它的设计初衷对着干，要权衡。
        </p>
      </Callout>

      <Example title="同一份数据，多方独立消费">
        <p>
          一个「用户下单」topic，下游同时挂着：库存服务（扣库存）、风控服务（反欺诈）、数仓（落 ODS 表）、
          搜索（更新订单索引）。在 Kafka 里它们是<strong>四个不同的消费组</strong>，各自维护各自的 offset 游标，
          互不干扰、互不阻塞。风控临时下线一小时，重新上来从自己上次的 offset 继续读，一条不丢。
        </p>
        <CodeBlock lang="bash" title="两个消费组互不影响地读同一 topic" code={offsetDemoCmd} />
        <p>
          这就是「日志 + offset 游标」模型的威力：消息只存一份，读它的多少个下游、各自读到哪，
          都只是<strong>每个组记一个游标</strong>而已，broker 完全不必为「谁读没读」操心。
        </p>
      </Example>

      <Practice title="跑通第一个 topic">
        <p>
          本地起一个 Kafka（单机即可），亲手建一个 topic，再用控制台生产者和消费者收发几条消息，感受一下最朴素的「发布-订阅」。
        </p>
        <CodeBlock lang="bash" title="创建并查看 topic" code={createTopicCmd} />
        <p>
          建好后开两个终端，一个生产、一个消费。注意消费者加了 <code>--from-beginning</code>，
          所以它能读到生产者之前发的全部历史消息——这正体现了「消息读完不删、可重复消费」。试着关掉消费者再重开一次，看它能不能再读一遍。
        </p>
        <CodeBlock lang="bash" title="控制台生产与消费" code={produceConsumeCmd} />
      </Practice>

      <Summary
        points={[
          'Kafka 是分布式发布订阅系统，本质是把消息当成只追加的日志来存（distributed commit log）。',
          '核心名词：topic 逻辑分类、partition 物理切片兼并行单元、offset 是分区内的行号、消费者记的是 offset 游标。',
          '与 RabbitMQ 的根本区别：吞吐优先 vs 灵活路由优先、消费者 pull vs broker push、天然分区并行、消息读完不删可回放。',
          'pull+offset 让 broker 几乎无状态，这是它相对 push+逐条ack 的结构性吞吐优势。',
          '典型场景：日志收集、流处理、解耦削峰，外加 CDC/事件溯源、服务间事件总线，都看中高吞吐与可回放。',
          '它不擅长复杂业务路由、消息优先级、单条级 ack 重试、极低延迟，这类需求 RabbitMQ 往往更合适。',
          '高吞吐来自四件事叠加：分区并行、顺序写、零拷贝、批量加压缩；顺序写靠免寻道+页缓存逼近内存速度。',
          '动手：用 kafka-topics 建 topic，用 console 生产者消费者收发消息，--from-beginning 可重读历史，不同 group 互不影响。',
        ]}
      />
    </>
  )
}

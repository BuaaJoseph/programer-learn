import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ProducerAck from '@/courses/kafka/illustrations/ProducerAck.jsx'

const producerConfigCode = `Properties props = new Properties();
props.put("bootstrap.servers", "broker1:9092,broker2:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

// 可靠性：要求 leader 与所有 ISR 副本都写入才算成功
props.put("acks", "all");
// 配合 acks=all：ISR 至少要有 2 个副本，否则拒绝写入
// 注意 min.insync.replicas 是 broker/topic 端配置，这里仅作示意
props.put("retries", "2147483647");          // 失败重试到底
props.put("delivery.timeout.ms", "120000");  // 整体超时上限，超了才真正失败

// 幂等：开启后 broker 用 PID + 序列号给单分区去重
props.put("enable.idempotence", "true");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
producer.send(new ProducerRecord<>("orders", "user-42", "下单成功"));
producer.flush();
producer.close();`

const txnCode = `// 事务：原子写多个分区，配合消费端 read_committed 实现端到端精确一次
props.put("transactional.id", "order-tx-1");  // 必须唯一且稳定
KafkaProducer<String, String> producer = new KafkaProducer<>(props);

producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("orders", "order-100"));
    producer.send(new ProducerRecord<>("audit",  "order-100-created"));
    producer.commitTransaction();   // 两条消息要么都可见，要么都不可见
} catch (Exception e) {
    producer.abortTransaction();    // 出错则整体回滚
}`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          消息系统里最让人头疼的从来不是「发出去」，而是「发出去之后到底有没有写成功、会不会丢、会不会重」。
          生产者这一端，Kafka 把这件事拆成了四个旋钮：消息发到哪个分区、要等几个副本确认（<em>acks</em>）、
          失败了要不要重试、以及怎么保证重试不会写重。把这四个旋钮拧明白，你就掌握了 Kafka 可靠性的一半。
        </p>
      </Lead>

      <h2>消息发到哪个分区</h2>
      <p>
        一个 topic 由多个分区组成，生产者发每一条消息时，必须先决定这条消息进哪个分区。Kafka 的分区选择有三种情况，
        按优先级从高到低：
      </p>
      <ul>
        <li>
          <strong>显式指定分区号</strong>——你在 <code>ProducerRecord</code> 里直接写死 partition，最直接也最不灵活，
          一般只在特殊场景（比如手动做数据隔离）才用。
        </li>
        <li>
          <strong>按 key 做 hash</strong>——只要消息带了 key，Kafka 就用 <code>hash(key) % 分区数</code> 算出分区。
          这保证了<strong>同一个 key 的消息永远落在同一个分区</strong>，从而保证它们之间的顺序，这也是最常用的方式。
        </li>
        <li>
          <strong>粘性轮询</strong>（sticky partitioning）——消息没有 key 时，Kafka 不再逐条轮询，而是「黏」在一个分区上
          连续发一批，攒满一个 batch 再换下一个分区。这样能凑出更大的批次、减少请求数、提升吞吐。
        </li>
      </ul>
      <p>
        这里有个面试常踩的坑：分区数一旦增加，<code>hash(key) % 分区数</code> 的结果会变，
        同一个 key 可能被分到新的分区，<strong>历史顺序保证就断了</strong>。所以涉及顺序的业务要谨慎扩分区。
      </p>

      <Example title="为什么同一个用户的订单要用 userId 当 key">
        <p>
          假设有个「订单状态变更」topic，要求同一个订单的「创建 → 支付 → 发货」三条消息按顺序被消费。
          如果不带 key，三条消息可能被打散到不同分区，消费端并行消费就乱序了。
        </p>
        <p>
          把 <code>orderId</code> 作为消息 key，三条消息就一定落在同一个分区，分区内严格有序，消费端自然就拿到了正确顺序。
          代价是：如果某个分区的 key 特别热（比如一个大客户的订单暴增），会造成<em>数据倾斜</em>，这个分区成为瓶颈。
        </p>
      </Example>

      <h2>acks：要等几个副本确认</h2>
      <p>
        消息进了 leader 分区，但 leader 还要把数据复制给其它副本（follower）。「写成功」到底以谁为准？这就是
        <code>acks</code> 控制的：
      </p>
      <ul>
        <li>
          <code>acks=0</code>——发出去就不管了，不等任何确认。吞吐最高，但 broker 一崩消息直接丢，几乎不用于重要数据。
        </li>
        <li>
          <code>acks=1</code>——只等 leader 写入本地日志就返回成功。性能和可靠性折中，但如果 leader 写完还没来得及
          复制给 follower 就宕机，这条消息就丢了。
        </li>
        <li>
          <code>acks=all</code>（即 <code>acks=-1</code>）——leader 要等所有 <em>ISR</em>（in-sync replicas，与 leader 保持同步的副本集合）
          都写入才返回成功。最可靠，延迟也最高。
        </li>
      </ul>

      <ProducerAck />

      <KeyIdea title="acks=all 必须配 min.insync.replicas 才真正可靠">
        <p>
          只设 <code>acks=all</code> 还不够。如果某一刻 ISR 里只剩 leader 一个副本（其它都掉队了），那么
          <code>acks=all</code> 等于只等 leader——和 <code>acks=1</code> 没区别，照样会丢。
        </p>
        <p>
          所以要在 broker / topic 端配 <code>min.insync.replicas=2</code>：要求 ISR 至少有 2 个副本可写，
          否则生产者直接收到错误、拒绝写入。<strong>「acks=all + min.insync.replicas≥2 + 副本数≥3」</strong>
          才是经典的高可靠组合，面试答可靠性配置一定要把这三个一起说出来。
        </p>
      </KeyIdea>

      <h2>retries 与重复：幂等生产者</h2>
      <p>
        网络抖动会让生产者发出消息后收不到确认，于是它<strong>重试</strong>。但消息可能其实已经写进 broker 了，
        只是确认包丢在路上——重试就造成了<em>重复</em>。这就是「至少一次」（at-least-once）语义的代价。
      </p>
      <p>
        Kafka 的解法是<em>幂等生产者</em>：开启 <code>enable.idempotence=true</code> 后，broker 给每个生产者分配一个
        <em>PID</em>（producer id），每条消息带上「分区内单调递增的序列号」。broker 发现某个序列号已经写过，就直接丢弃，
        从而做到<strong>单分区、单会话内的精确一次写入</strong>，重试也不会写重。
      </p>
      <Callout variant="warn" title="幂等的边界别说错">
        <p>
          幂等生产者只保证<strong>同一个生产者、同一个分区</strong>不重复。它不跨分区、不跨生产者会话、
          也不解决「消费端重复消费」的问题。要做到跨分区原子、端到端精确一次，得上事务。
        </p>
      </Callout>

      <h2>事务：原子写多分区，配合消费端实现 EOS</h2>
      <p>
        有时一条业务操作要同时写多个 topic / 分区（比如订单库和审计库），需要它们<strong>要么都成功、要么都不写</strong>。
        Kafka 事务用一个稳定唯一的 <code>transactional.id</code> 把多次 send 包成一个原子单元，
        <code>commitTransaction()</code> 后这些消息才一起对消费者可见，<code>abortTransaction()</code> 则整体回滚。
      </p>
      <p>
        关键的另一半在消费端：消费者要设 <code>isolation.level=read_committed</code>，这样它<strong>只能读到已提交的事务消息</strong>，
        被回滚或未提交的消息对它不可见。生产端事务 + 消费端 <code>read_committed</code> + 幂等，合起来就是 Kafka 著名的
        <em>EOS</em>（exactly-once semantics，精确一次语义），常用于「消费 → 处理 → 再生产」的流处理链路。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Kafka 怎么保证消息不丢」，标准答法是分三端说：
        <strong>生产端</strong>用 <code>acks=all</code> + 重试 + <code>min.insync.replicas≥2</code>；
        <strong>broker 端</strong>副本数≥3、关掉 <code>unclean.leader.election</code>；
        <strong>消费端</strong>处理完再手动提交 offset（下一章详细讲）。
        再追问「怎么不重」，就答幂等生产者去掉生产侧重复、消费侧做业务幂等或上事务实现 EOS。
      </p>

      <Practice title="配一套高可靠的生产者">
        <p>
          照下面把生产者配成高可靠模式，重点理解 <code>acks=all</code>、<code>enable.idempotence=true</code> 和
          <code>retries</code> 三者如何协同；然后试试用事务原子地写两个 topic。
        </p>
        <CodeBlock lang="java" title="ReliableProducer.java" code={producerConfigCode} />
        <p>
          再加上事务，把「写订单」和「写审计」两条消息绑在一起，体会 commit 前消费端（read_committed）看不到任何一条：
        </p>
        <CodeBlock lang="java" title="TxnProducer.java" code={txnCode} />
      </Practice>

      <Summary
        points={[
          '分区选择三种：显式指定 > 按 key 做 hash（保证同 key 有序）> 无 key 时粘性轮询攒批提吞吐。',
          'acks=0 不等确认最快但易丢；acks=1 只等 leader；acks=all 等所有 ISR 最可靠。',
          'acks=all 必须配 min.insync.replicas≥2 且副本数≥3 才真正不丢，三者要一起说。',
          'retries 会因确认丢失造成重复；幂等生产者用 PID + 序列号在单分区单会话内去重。',
          '事务用 transactional.id 原子写多分区，配合消费端 read_committed 实现端到端精确一次 EOS。',
          '回答不丢不重要分生产端、broker 端、消费端三层讲，别只答一个 acks。',
        ]}
      />
    </>
  )
}

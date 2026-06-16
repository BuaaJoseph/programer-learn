import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const idempotentCode = `Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("acks", "all");                 // 等所有 ISR 副本确认
props.put("enable.idempotence", "true");  // 开启幂等生产者：自动去重
props.put("retries", Integer.MAX_VALUE);  // 配合幂等，可放心重试
props.put("max.in.flight.requests.per.connection", "5"); // 幂等下仍保序

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
// key 用账户 id，保证同一账户的转账消息进同一分区、严格有序
producer.send(new ProducerRecord<>("transfer", accountId, msg));`

const consumerCode = `// 关闭自动提交，改为「先处理、处理成功再提交」
props.put("enable.auto.commit", "false");

while (true) {
  ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
  for (ConsumerRecord<String, String> r : records) {
    // 消费端幂等：用唯一业务 id 去重（数据库唯一键 / Redis 去重表）
    if (alreadyProcessed(r.key(), r.value())) continue;
    handle(r);          // 处理业务
    markProcessed(r);   // 记录已处理
  }
  consumer.commitSync(); // 全部处理成功后才提交位移
}`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          「消息不丢、不重、不乱」是消息队列面试的必考三连，再加一个进阶的 <em>exactly-once</em>。
          这四件事没有一个开关能一键搞定，每一条都要生产端、broker、消费端三方配合。
          这一章把它们拆开讲清楚：各自的成因、各自的解法，以及哪些是 Kafka 包办、哪些得你自己兜底。
        </p>
      </Lead>

      <h2>不丢：每一棒都不能掉</h2>
      <p>
        消息从生产者到落盘再到被消费，要经过三个环节，<strong>任何一环掉链子都会丢</strong>，所以要三处一起兜：
      </p>
      <ul>
        <li><strong>生产端</strong>：<code>acks=all</code> 等所有 ISR 副本确认，再配 <code>retries</code> 让发送失败自动重发；</li>
        <li><strong>broker 端</strong>：<code>replication.factor≥3</code> 多副本 + <code>min.insync.replicas≥2</code>，保证消息落在多台机器上（详见上一章）；</li>
        <li><strong>消费端</strong>：关掉自动提交位移，改成<strong>先处理业务、成功后再手动提交</strong>，避免「位移已提交但业务还没做完就崩了」导致的丢消息。</li>
      </ul>

      <h3>不重：幂等生产者 + 消费端幂等</h3>
      <p>
        重复几乎总是「重试」带来的：生产者发出去了、broker 也写成功了，但确认包在网络上丢了，
        生产者以为失败就<strong>又发了一次</strong>。Kafka 的 <em>idempotent producer</em>（幂等生产者，<code>enable.idempotence=true</code>）
        给每条消息打上序号，broker 端按 (生产者 id, 分区, 序号) 去重，<strong>单分区内的重试不再产生重复</strong>。
      </p>
      <p>
        但幂等生产者只管「生产侧的网络重试」。消费侧如果处理到一半崩了、重启后又拉到同一批消息，照样会重复处理。
        所以<strong>消费端也要自己做幂等</strong>：用唯一业务 id 配合数据库唯一键或去重表，处理前先查「这条做过没有」。
      </p>

      <h3>不乱：顺序只在单分区内</h3>
      <p>
        这是最容易被忽略的一点：<strong>Kafka 只保证单个分区内的消息顺序，不保证跨分区的全局顺序</strong>。
        所以想让一组消息有序，必须让它们进同一个分区——做法是给它们用<strong>同一个 key</strong>，
        Kafka 默认按 key 哈希分配分区，同 key 必进同分区。
      </p>
      <Callout variant="warn" title="重试 + max.in.flight 的乱序坑">
        <p>
          有个隐蔽的乱序场景：<code>max.in.flight.requests.per.connection</code> 大于 1（允许多个请求并发在途）时，
          如果第 1 个请求失败重试、第 2 个却先成功了，消息顺序就<strong>被打乱</strong>了。
        </p>
        <p>
          解法是开启幂等生产者：开了 <code>enable.idempotence=true</code> 后，即使 <code>max.in.flight</code> 设到 5，
          Kafka 也会在 broker 端按序号纠正顺序，<strong>既保序又不丢吞吐</strong>。没开幂等又要严格保序，就只能把 <code>max.in.flight</code> 压到 1。
        </p>
      </Callout>

      <Example title="转账消息既不丢也不重">
        <p>
          场景：账户 A 给账户 B 转账，下游靠消费一条「转账成功」消息来更新余额。这条消息<strong>既不能丢</strong>（否则余额对不上），
          <strong>也不能重</strong>（否则重复加钱）：
        </p>
        <ul>
          <li>不丢：生产端 <code>acks=all</code> + 重试，broker 三副本，消费端处理成功再提交位移；</li>
          <li>不重：生产端开幂等去掉网络重发的重复；消费端拿「转账流水号」做唯一键，重复消费时直接跳过；</li>
          <li>不乱：用账户 id 当 key，保证同一账户的多笔操作落进同一分区、按发生顺序处理。</li>
        </ul>
        <p>
          三管齐下，即使中途 broker 宕机、消费者重启，最终账面也分毫不差。
        </p>
      </Example>

      <KeyIdea title="幂等是兜底的最后一道闸">
        <p>
          分布式系统里，「恰好一次投递」在网络层面几乎不可能严格做到，工程上的通行做法是
          <strong>「至少一次投递 + 消费端幂等」</strong>：允许消息偶尔重复，但保证<strong>重复处理的结果和处理一次一样</strong>。
          所以哪怕你用了所有 Kafka 的高级特性，消费端的业务幂等设计依然是不能省的最后一道闸。
        </p>
      </KeyIdea>

      <h3>Exactly-Once 的真实边界</h3>
      <p>
        Kafka 确实提供 <em>exactly-once semantics</em>（EOS，精确一次语义），但它的适用范围比想象中窄。它由三块拼成：
        <strong>幂等生产者</strong>（去掉重试重复）+ <strong>事务</strong>（把「消费—处理—生产」绑成一个原子操作，要么全成功要么全回滚）+
        消费端 <code>isolation.level=read_committed</code>（只读已提交的事务消息）。
      </p>
      <p>
        它真正擅长的是 Kafka 内部的「<strong>消费一个 topic、处理后写另一个 topic</strong>」这种流处理链路（Kafka Streams 就是基于它）。
        但一旦你的处理结果要写到 <strong>Kafka 之外</strong>（比如写 MySQL、调第三方接口），Kafka 事务就管不到外部系统了——
        这时还是得回到「至少一次 + 消费端幂等」的老路。所以面试里别把 EOS 说成万能，要点出它的边界。
      </p>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Kafka 怎么保证消息不丢不重不乱」，按维度分层答：
        <strong>不丢</strong>看生产（acks=all+重试）、broker（多副本+min.insync.replicas）、消费（手动提交）三处；
        <strong>不重</strong>靠幂等生产者去网络重复 + 消费端业务幂等兜底；
        <strong>不乱</strong>记住「顺序只在单分区内」，用 key 路由，并当心 max.in.flight 与重试的乱序坑。
        最后补一句 EOS = 幂等 + 事务 + read_committed，但仅限 Kafka 内部链路，跨外部系统仍需幂等。
      </p>

      <Practice title="写一套 EOS 关键配置清单">
        <p>
          把「不丢不重 + 尽量精确一次」的配置整理成一张清单，落到生产者和消费者代码里：
        </p>
        <CodeBlock lang="java" title="IdempotentProducer.java" code={idempotentCode} />
        <CodeBlock lang="java" title="ManualCommitConsumer.java" code={consumerCode} />
        <p>
          清单要点：生产端 <code>enable.idempotence=true</code> + <code>acks=all</code> + 大 <code>retries</code>；
          broker 端 <code>replication.factor=3</code> + <code>min.insync.replicas=2</code>；
          消费端关闭自动提交、先处理后提交、配合唯一键做业务幂等；要内部 EOS 再加事务 + <code>read_committed</code>。
        </p>
      </Practice>

      <Summary
        points={[
          '不丢要三处兜底：生产 acks=all+重试、broker 多副本+min.insync.replicas、消费手动提交位移。',
          '不重靠幂等生产者去掉网络重试的重复，外加消费端用唯一业务 id 做幂等兜底。',
          '顺序只在单分区内保证，想有序就用同一个 key 让消息进同一分区。',
          '小心 max.in.flight>1 时重试导致的乱序，开启幂等生产者可在保序的同时保留吞吐。',
          'EOS = 幂等生产者 + 事务 + read_committed，但只适用于 Kafka 内部的消费—处理—生产链路。',
          '处理结果写到 Kafka 之外时事务失效，工程通行解仍是「至少一次投递 + 消费端幂等」。',
        ]}
      />
    </>
  )
}

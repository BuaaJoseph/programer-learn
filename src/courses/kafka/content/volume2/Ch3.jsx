import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const manualCommitCode = `props.put("enable.auto.commit", "false");   // 关闭自动提交，自己掌控
props.put("auto.offset.reset", "earliest"); // 没有已提交 offset 时从最早开始

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(List.of("orders"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<String, String> r : records) {
        // 先处理：业务侧用唯一键做幂等，重复消费也不会出错
        handleWithIdempotency(r.key(), r.value());
    }
    // 后提交：处理完整批再同步提交，保证「处理过的才算消费过」
    consumer.commitSync();   // 失败会抛异常，可重试
}`

const idempotentCode = `// 幂等思路：用消息里的唯一业务键去重，让「至少一次」变成「效果上一次」
void handleWithIdempotency(String key, String value) {
    String dedupKey = "consumed:" + key;
    // setIfAbsent 返回 false 说明这条已经处理过，直接跳过
    boolean firstTime = redis.setIfAbsent(dedupKey, "1", Duration.ofHours(24));
    if (!firstTime) {
        return;   // 重复消息，丢弃
    }
    doBusiness(value);
}`

const perPartitionCommitCode = `// 进阶：按分区精确提交，并指定「下一条」offset（注意要 +1）
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
    for (TopicPartition tp : records.partitions()) {
        List<ConsumerRecord<String, String>> ps = records.records(tp);
        for (ConsumerRecord<String, String> r : ps) {
            handleWithIdempotency(r.key(), r.value());
        }
        long lastOffset = ps.get(ps.size() - 1).offset();
        // 提交的是「已处理的最后一条 + 1」，即下一条要读的位置
        consumer.commitSync(Map.of(tp,
            new OffsetAndMetadata(lastOffset + 1)));
    }
}`

const seekCode = `// 重放 / 跳读：offset 完全由消费者掌控
// 1) 从头重放某分区
consumer.seekToBeginning(List.of(new TopicPartition("orders", 0)));

// 2) 跳到末尾，只看新消息
consumer.seekToEnd(List.of(new TopicPartition("orders", 0)));

// 3) 按时间点回放：找到「昨天 0 点」对应的 offset 再 seek 过去
long ts = LocalDate.now().minusDays(1).atStartOfDay()
    .toInstant(ZoneOffset.UTC).toEpochMilli();
var tp = new TopicPartition("orders", 0);
var off = consumer.offsetsForTimes(Map.of(tp, ts)).get(tp);
if (off != null) consumer.seek(tp, off.offset());`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          消费者怎么知道自己读到哪了？靠的是 <em>offset</em>（位移）——它记录「这个组在这个分区已经消费到第几条」。
          offset 提交得早了会<strong>丢消息</strong>，提交得晚了会<strong>重复消费</strong>，提交方式选错了两头不讨好。
          这一章把 offset 的存储、提交时机和「不丢不重」的取舍掰开讲清楚，这是 Kafka 面试出现频率最高的点之一。
        </p>
      </Lead>

      <h2>offset 是什么，存在哪</h2>
      <p>
        每个分区里的消息都有一个从 0 开始单调递增的编号，就是 offset。消费者组消费到哪，就把「下一条要读的 offset」
        记下来，这个记录叫<strong>已提交位移</strong>（committed offset）。下次启动或 rebalance 后，
        消费者就从这个位置接着读。
      </p>
      <p>
        这个进度存在哪？存在 Kafka 自己的一个内部 topic 里，叫 <code>__consumer_offsets</code>。
        它以 <code>（group, topic, partition）</code> 为 key、最新 offset 为 value，是个 compacted topic（只保留每个 key 的最新值）。
        所以消费进度本身也是一条 Kafka 消息——这是 Kafka 设计上很优雅的一点：用自己存自己。
      </p>
      <p>
        一个常被搞混的细节：提交的 offset 是「<strong>已处理的最后一条 + 1</strong>」，也就是「下一条要读的位置」，而不是
        「最后处理的那条的 offset」。手写按分区提交时若忘了 <code>+1</code>，重启会重读最后一条——这是个经典 off-by-one bug。
      </p>

      <h2>自动提交的问题</h2>
      <p>
        默认开启的 <code>enable.auto.commit=true</code> 会按 <code>auto.commit.interval.ms</code>（默认 5 秒）
        在后台<strong>定期</strong>把当前 offset 提交掉。它图省事，但有两个隐患：
      </p>
      <ul>
        <li>
          <strong>可能丢消息</strong>——它提交的是「已经 poll 到的」offset，<strong>不管你处理完没有</strong>。
          如果 poll 回一批、自动提交先跑了，然后消费者在处理途中崩溃，这批没处理完的消息却已被标记为「消费过」，重启后不会再读，等于丢了。
        </li>
        <li>
          <strong>提交时机不可控</strong>——提交和处理是两条独立节奏，你无法精确对齐，出问题时也很难推理到底丢在哪一步。
        </li>
      </ul>
      <p>
        准确说，自动提交是在<strong>下一次 poll() 被调用时</strong>检查「距上次提交是否超过 interval」，到了才提交。
        所以它既不会丢「已经 poll 过但还没到提交间隔」的进度（rebalance 时还会补一次），也不保证「处理完才提交」——
        它对齐的是「poll 到」而非「处理完」，这正是它会丢消息的根本原因。
      </p>

      <h2>手动提交：同步与异步</h2>
      <p>
        要精确控制，就关掉自动提交、自己调提交接口。手动提交有两种：
      </p>
      <ul>
        <li>
          <code>commitSync()</code>——<strong>同步</strong>提交，会阻塞直到 broker 确认，失败会自动重试，可靠但慢。
        </li>
        <li>
          <code>commitAsync()</code>——<strong>异步</strong>提交，发出去就继续干活、不阻塞，吞吐高，但<strong>失败不自动重试</strong>
          （重试可能把更小的旧 offset 盖回去），需要在回调里自行处理。
        </li>
      </ul>
      <p>
        常见组合是：循环里用 <code>commitAsync()</code> 追求吞吐，在消费者关闭或 rebalance 前用一次 <code>commitSync()</code>
        兜底确保最终提交成功。还可以<strong>按分区单独提交</strong>，配合 RebalanceListener 让每个分区的进度更精确、
        减少 rebalance 时的重复范围。
      </p>
      <CodeBlock lang="java" title="PerPartitionCommit.java" code={perPartitionCommitCode} />

      <KeyIdea title="提交时机决定语义：先后顺序是核心">
        <p>
          <strong>先提交、后处理</strong>：offset 已经前移，但处理还没做完就崩了 → 这批消息再也读不到 → <strong>丢消息</strong>，
          对应「至多一次」（at-most-once）。
        </p>
        <p>
          <strong>先处理、后提交</strong>：处理完了、提交前崩了 → 重启后从旧 offset 重读这批 → <strong>重复消费</strong>，
          对应「至少一次」（at-least-once）。
        </p>
        <p>
          两害相权，工程上几乎总是选「先处理后提交」——<strong>宁可重复，不可丢失</strong>，因为重复可以靠幂等消掉，丢了就找不回来了。
        </p>
      </KeyIdea>

      <Example title="转账场景为什么必须先处理后提交">
        <p>
          消费一条「给账户 A 加 100 元」的消息。如果先提交 offset 再去加钱，结果加钱那步崩了：offset 已前移，
          这条消息永远不会重读，用户的 100 元就<strong>凭空丢了</strong>——这是绝对不能接受的。
        </p>
        <p>
          所以改成先处理（加钱）后提交。代价是：加完钱、提交 offset 前若崩溃，重启会重读这条，可能<strong>加两次</strong>。
          解决办法是给每条消息一个唯一 <code>transactionId</code>，处理前先查「这个 id 处理过没」，处理过就跳过——这就是消费端幂等。
        </p>
      </Example>

      <h2>重放与跳读：offset 完全归你掌控</h2>
      <p>
        因为消息读完不删、offset 只是个游标，消费者可以随意把它移到任意位置——这是 Kafka 区别于传统队列的杀手锏。
        <code>seekToBeginning</code> 从头重放、<code>seekToEnd</code> 跳到最新、<code>offsetsForTimes</code> + <code>seek</code>
        按时间点回放。线上排查、修数据、重算指标都靠它：换个新 <code>group.id</code> 从 <code>earliest</code> 跑一遍，
        就能把历史数据重新灌进下游，原有消费组完全不受影响。
      </p>
      <CodeBlock lang="java" title="SeekAndReplay.java" code={seekCode} />

      <Callout variant="warn" title="auto.offset.reset 只在「没有已提交 offset」时生效">
        <p>
          当一个组<strong>第一次</strong>消费某分区、或它的已提交 offset 已经过期被删时，从哪开始读由
          <code>auto.offset.reset</code> 决定：<code>earliest</code> 从最早的消息读起（不漏历史数据），
          <code>latest</code>（默认）只读启动之后的新消息（会跳过历史）。
        </p>
        <p>
          常见误解是以为它每次启动都生效。其实<strong>只要有有效的已提交 offset，它就被忽略</strong>，永远从已提交位置接着读。
          新建组想跑全量历史，记得设 <code>earliest</code>。还有个坑：如果消费组下线太久，已提交 offset 因 retention 过期被删，
          下次上线会触发 reset——若是 <code>latest</code> 就会<strong>静默跳过这段时间的全部消息</strong>，排查时极易踩雷。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Kafka 消费怎么做到不丢不重」，标准答法：<strong>不丢</strong>靠「先处理后提交 + 手动提交」，绝不让 offset 跑在处理前面；
        <strong>不重</strong>靠消费端<strong>幂等</strong>（唯一键去重 / 数据库唯一约束 / 状态机），因为只要会 rebalance 或崩溃重启，
        at-least-once 下的重复就无法根除。要更强的端到端精确一次，再上生产端事务 + 消费端 <code>read_committed</code>（见本卷第 1 章）。
        再追问「能不能用事务把 offset 和业务写入绑一起」——能，<code>sendOffsetsToTransaction</code> 把 offset 提交纳入生产事务，
        这是流处理里实现 EOS 的关键一招。
      </p>

      <Practice title="手动提交 + 消费端幂等">
        <p>
          关掉自动提交，改成「处理整批 → <code>commitSync()</code>」的循环，并给业务处理加上基于唯一键的幂等判断，
          这样即便重复消费也不会出错。
        </p>
        <CodeBlock lang="java" title="ManualCommitConsumer.java" code={manualCommitCode} />
        <p>
          幂等的核心是「同一条消息处理多次，效果和一次相同」，下面用 Redis 的 setIfAbsent 做最简单的去重：
        </p>
        <CodeBlock lang="java" title="Idempotency.java" code={idempotentCode} />
      </Practice>

      <Summary
        points={[
          'offset 是消费者在分区里的消费位置，已提交位移存在内部 compacted topic __consumer_offsets；提交值是「最后处理+1」，别漏 +1。',
          '自动提交（enable.auto.commit）在下次 poll 时按间隔提交，对齐的是「poll 到」而非「处理完」，崩溃时可能丢消息。',
          '手动提交分同步 commitSync（阻塞、会重试、可靠）和异步 commitAsync（不阻塞、不自动重试、高吞吐），可按分区精确提交。',
          '先提交后处理→丢消息（at-most-once）；先处理后提交→重复消费（at-least-once），工程上选后者。',
          '宁可重复不可丢失，重复用消费端幂等（唯一键去重）消掉，配合后可做到不丢不重。',
          'offset 可任意 seek：从头重放、跳到末尾、按时间点回放，用新 group 即可重灌历史而不影响他人。',
          'auto.offset.reset（earliest/latest）只在没有有效已提交 offset 时生效；组下线太久 offset 过期 + latest 会静默跳过消息。',
        ]}
      />
    </>
  )
}

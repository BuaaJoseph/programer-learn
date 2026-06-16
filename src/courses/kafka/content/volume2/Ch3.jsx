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
        兜底确保最终提交成功。
      </p>

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

      <Callout variant="warn" title="auto.offset.reset 只在「没有已提交 offset」时生效">
        <p>
          当一个组<strong>第一次</strong>消费某分区、或它的已提交 offset 已经过期被删时，从哪开始读由
          <code>auto.offset.reset</code> 决定：<code>earliest</code> 从最早的消息读起（不漏历史数据），
          <code>latest</code>（默认）只读启动之后的新消息（会跳过历史）。
        </p>
        <p>
          常见误解是以为它每次启动都生效。其实<strong>只要有有效的已提交 offset，它就被忽略</strong>，永远从已提交位置接着读。
          新建组想跑全量历史，记得设 <code>earliest</code>。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「Kafka 消费怎么做到不丢不重」，标准答法：<strong>不丢</strong>靠「先处理后提交 + 手动提交」，绝不让 offset 跑在处理前面；
        <strong>不重</strong>靠消费端<strong>幂等</strong>（唯一键去重 / 数据库唯一约束 / 状态机），因为只要会 rebalance 或崩溃重启，
        at-least-once 下的重复就无法根除。要更强的端到端精确一次，再上生产端事务 + 消费端 <code>read_committed</code>（见本卷第 1 章）。
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
          'offset 是消费者在分区里的消费位置，已提交位移存在内部 compacted topic __consumer_offsets。',
          '自动提交（enable.auto.commit）按时间定期提交，不管处理完没有，崩溃时可能丢消息且时机不可控。',
          '手动提交分同步 commitSync（阻塞、会重试、可靠）和异步 commitAsync（不阻塞、不自动重试、高吞吐）。',
          '先提交后处理→丢消息（at-most-once）；先处理后提交→重复消费（at-least-once），工程上选后者。',
          '宁可重复不可丢失，重复用消费端幂等（唯一键去重）消掉，配合后可做到不丢不重。',
          'auto.offset.reset（earliest/latest）只在没有有效已提交 offset 时生效，否则永远从已提交位置续读。',
        ]}
      />
    </>
  )
}

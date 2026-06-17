import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const threeStageSnippet = `消息的一生有三段，每一段都可能丢：

  [生产者] --(1)--> [Broker 存储] --(2)--> [消费者] --(3)--> 处理完成
            发送丢            存储丢                消费丢

(1) 发送阶段：网络抖动、Broker 没收到 -> 消息没进 Broker
(2) 存储阶段：Broker 收了但只在内存没落盘，宕机 -> 消息蒸发
(3) 消费阶段：消费者拿到了，没处理完就提交了位点 / 崩溃 -> 消息没被真正处理`

const producerConfirmSnippet = `// 生产端可靠发送：等 Broker 确认 + 失败重试
// Kafka 示例：acks=all 要求所有同步副本都落盘才返回成功
props.put("acks", "all");          // 0=不等 1=等 leader all=等所有 ISR
props.put("retries", 3);           // 发送失败自动重试
props.put("enable.idempotence", true); // 开启幂等生产者，重试不产生重复

producer.send(record, (meta, ex) -> {
    if (ex != null) {
        // 回调里收到异常：记日志 + 落本地兜底表，绝不静默吞掉
        saveToFallbackTable(record);
    }
});`

const consumerAckSnippet = `// 消费端可靠：处理成功后才手动提交位点（at-least-once）
props.put("enable.auto.commit", false);  // 关闭自动提交！

while (running) {
    ConsumerRecords<K,V> records = consumer.poll(Duration.ofMillis(500));
    for (ConsumerRecord<K,V> r : records) {
        handle(r);          // 1. 先把业务处理完（且做幂等）
    }
    consumer.commitSync();  // 2. 整批处理成功后再提交位点
    // 若处理到一半崩溃：位点没提交，重启后这批会重新消费 -> 不丢，但会重复
}`

const idempotentSnippet = `// 幂等消费：用唯一业务键 + 去重表，保证重复消息只生效一次
public void handle(OrderPaidEvent event) {
    String msgId = event.getMsgId();   // 全局唯一消息 ID（或业务唯一键）
    // 利用数据库唯一索引：插入成功才处理，重复插入直接吞掉
    int rows = dedupDao.insertIgnore(msgId);
    if (rows == 0) {
        log.info("重复消息，已处理过，跳过: {}", msgId);
        return;
    }
    doBusiness(event);    // 真正的业务逻辑，确保只执行一次
}`

export default function Ch1() {
  return (
    <article>
      <Lead>
        从这一卷起，我们攻克所有消息队列都绕不开的硬骨头。第一块、也是面试出现频率最高的，
        就是<strong>「如何保证消息不丢失」</strong>与它的孪生问题<strong>「如何处理重复消息、保证幂等」</strong>。
        这两个问题为什么总是一起出现？因为它们是同一枚硬币的两面：为了不丢，你不得不重试与重投，
        而重试与重投又必然带来重复。理解这层因果，是答好这道题的钥匙。
      </Lead>

      <h2>一、消息会在哪儿丢？三段式分析</h2>
      <p>
        要保证不丢，先得知道会在哪儿丢。一条消息的生命周期分为三段，<strong>每一段都有丢失的可能</strong>。
        面试时务必按这三段来组织答案，逻辑才完整。
      </p>
      <CodeBlock lang="text" title="消息可能丢失的三个阶段" code={threeStageSnippet} />
      <KeyIdea>
        保证消息不丢 = 三段都不丢：<strong>生产者确保发到 Broker、Broker 确保持久化到磁盘且有副本、消费者确保处理成功后才确认</strong>。
        任何一段偷懒，整条链路的可靠性就被它拉低。这是「木桶效应」。
      </KeyIdea>

      <h2>二、生产阶段：确保消息真的进了 Broker</h2>
      <p>
        生产者发消息走网络，网络不可靠。要确保送达，靠两件事：<strong>等待 Broker 确认 + 失败重试</strong>。
      </p>
      <p>
        以 Kafka 为例，<code>acks</code> 参数决定「Broker 怎样才算收到」：<code>acks=0</code> 发了就不管（最快但最易丢）；
        <code>acks=1</code> 等 leader 副本落地（leader 挂了仍可能丢）；<code>acks=all</code> 等所有同步副本（ISR）都确认（最可靠）。
        生产可靠场景必须用 <code>acks=all</code>，并配 <code>retries</code> 自动重试。RocketMQ 用同步发送 + 重试，RabbitMQ 用 publisher confirm 机制，思路一致。
      </p>
      <CodeBlock lang="java" title="生产端可靠发送：acks=all + 重试 + 兜底" code={producerConfirmSnippet} />
      <Callout variant="warn" title="发送回调里的异常绝不能静默吞掉">
        最常见的线上事故，是把发送失败的异常 <code>catch</code> 了却什么都不做。可靠投递要求：发送失败要么重试成功，
        要么落到<strong>本地兜底表</strong>（本地消息表）由定时任务补发，绝不能让消息「悄无声息地消失」。
      </Callout>

      <h2>三、存储阶段：Broker 必须落盘 + 有副本</h2>
      <p>
        Broker 收到消息后，如果只放在内存就告诉生产者「成功」，那么一旦宕机，内存里的消息就全没了。
        所以可靠的 Broker 必须做到两点：
      </p>
      <ul>
        <li><strong>持久化（落盘）</strong>：消息要刷写到磁盘。注意操作系统的页缓存——「写到磁盘」可能只是写到了 page cache，
          真正的强可靠需要 <code>fsync</code> 刷盘（RocketMQ 的同步刷盘 / 异步刷盘就是这个权衡）。</li>
        <li><strong>多副本（冗余）</strong>：单机磁盘也会坏。消息要复制到多个 Broker 节点，挂一个还有别的。
          Kafka 靠 <code>replication.factor</code> + ISR，RocketMQ 靠主从 / DLedger。</li>
      </ul>
      <p>
        这里有个经典权衡：<strong>同步刷盘 + 同步复制</strong>最可靠但慢；<strong>异步刷盘 + 异步复制</strong>快但宕机时有丢失窗口。
        生产上按业务对「丢一条的代价」来选——金融场景倾向同步，日志场景可接受异步。
      </p>

      <h2>四、消费阶段：处理成功后才确认</h2>
      <p>
        消费阶段丢消息的典型姿势是<strong>「自动提交位点」</strong>：消费者一拉到消息就自动把 Offset 提交了，
        结果业务还没处理完就崩溃——重启后从已提交的 Offset 之后开始消费，那条没处理完的就被永久跳过了，这就是丢消息。
      </p>
      <p>
        正确做法是<strong>关闭自动提交，处理成功后再手动确认</strong>：先把业务逻辑跑完，再提交位点 / 发 ACK。
        这样即使处理到一半崩溃，位点没动，重启后会重新消费——<strong>消息不丢，但会重复</strong>。
        这正是「至少一次（at-least-once）」语义，也是绝大多数 MQ 默认且推荐的可靠级别。
      </p>
      <CodeBlock lang="java" title="消费端：处理成功后才手动提交位点" code={consumerAckSnippet} />

      <h2>五、三种投递语义</h2>
      <table>
        <thead>
          <tr><th>语义</th><th>含义</th><th>代价</th></tr>
        </thead>
        <tbody>
          <tr><td>至多一次 At-most-once</td><td>最多投一次，可能丢</td><td>不丢的反面：会丢消息</td></tr>
          <tr><td>至少一次 At-least-once</td><td>至少投一次，不丢但可能重复</td><td>需要消费端幂等</td></tr>
          <tr><td>精确一次 Exactly-once</td><td>不多不少正好一次</td><td>实现复杂、有性能代价（事务/幂等生产者）</td></tr>
        </tbody>
      </table>
      <p>
        现实中绝大多数系统选<strong>「至少一次 + 消费端幂等」</strong>，用业务侧的幂等去等效地实现「精确一次」的效果，
        这比依赖 MQ 端真正的 exactly-once 更通用、更可控。
      </p>

      <h2>六、处理重复消息：幂等是关键</h2>
      <p>
        既然「不丢」必然带来「重复」，那重复就不是要消灭的，而是要<strong>让它无害</strong>——这就是幂等。
        <strong>幂等</strong>指：同一条消息处理一次和处理多次，对系统状态的影响完全相同。
      </p>
      <KeyIdea>
        不要试图在 MQ 层「保证消息绝不重复」（代价极高且仍不可靠），而要在<strong>消费端做幂等</strong>：
        给每条消息一个全局唯一标识（消息 ID 或业务唯一键），消费时先查「这个 ID 处理过没」，处理过就直接跳过。
        这是处理重复消息最通用、最稳的方案。
      </KeyIdea>
      <p>幂等的常见实现手段：</p>
      <ul>
        <li><strong>数据库唯一索引 / 去重表</strong>：用消息 ID 或业务键建唯一索引，重复插入会失败，据此跳过。最常用。</li>
        <li><strong>状态机判断</strong>：业务本身有状态流转时，先判状态。如「订单已支付」就不再重复扣款。</li>
        <li><strong>乐观锁 / 版本号</strong>：更新时带版本号，重复消息因版本不匹配而更新失败。</li>
        <li><strong>Redis 去重</strong>：用 <code>SETNX</code> 记录已处理 ID（注意要兜底落库，防 Redis 数据丢失）。</li>
      </ul>
      <CodeBlock lang="java" title="幂等消费：唯一键去重表，重复只生效一次" code={idempotentSnippet} />

      <h2>七、面试精讲</h2>

      <h3>Q1：如何保证消息不丢失？请系统地讲</h3>
      <p>
        <strong>原创讲解。</strong>这题答得好不好，全看有没有<strong>「三段式」框架</strong>。我会先抛出结论：
        消息会在生产、存储、消费三个阶段丢失，要保证不丢，三段都要堵住。然后逐段给方案：
      </p>
      <ol>
        <li><strong>生产端</strong>：同步等待 Broker 确认（Kafka <code>acks=all</code> / RabbitMQ confirm / RocketMQ 同步发送），失败重试，重试仍败则落本地兜底表补发。</li>
        <li><strong>存储端</strong>：Broker 持久化落盘（必要时同步刷盘）+ 多副本冗余，避免单机宕机或磁盘损坏导致消息蒸发。</li>
        <li><strong>消费端</strong>：关闭自动提交，<strong>业务处理成功后再手动提交位点 / ACK</strong>，保证至少一次。</li>
      </ol>
      <p>
        最后补一句点睛：「不丢的代价是可能重复，所以消费端还要做幂等」——这能体现你看到了问题的全貌。
      </p>
      <p>
        <strong>易错点。</strong>只答消费端「手动 ack」而漏掉生产和存储两段，是最常见的失分点。木桶效应，三段缺一不可。
      </p>

      <h3>Q2：为什么「至少一次」是主流？精确一次不香吗？</h3>
      <p>
        <strong>原创讲解。</strong>精确一次（exactly-once）听起来最完美，但<strong>端到端的精确一次极难且有代价</strong>。
        消息从生产到消费跨网络、跨进程、跨存储，要真正做到不多不少，需要事务、幂等生产者、消费与位点提交原子化等一整套机制
        （Kafka 的 exactly-once 就只在 Kafka 内部的「读-处理-写」闭环里成立，一旦写到外部数据库就破功了）。
      </p>
      <p>
        所以工程上更务实的做法是<strong>「至少一次 + 消费端幂等」</strong>：MQ 只负责不丢（可能重复），
        重复由业务侧用唯一键去重消化掉。效果等价于精确一次，但实现简单、性能好、不依赖特定 MQ 的强能力。
      </p>
      <p>
        <strong>面试追问：</strong>「Kafka 的 exactly-once 到底保了什么？」——它靠幂等生产者（去重 PID + 序列号）防生产重试重复，
        靠事务把「消费 + 生产」绑成原子，在 Kafka 流处理（consume-transform-produce）链路内成立；但跨出 Kafka 写外部系统仍需业务幂等兜底。
      </p>

      <h3>Q3：消费端做幂等，唯一键该用消息 ID 还是业务键？</h3>
      <p>
        <strong>原创讲解。</strong>优先用<strong>业务唯一键</strong>，其次才是 MQ 的消息 ID。原因：
      </p>
      <table>
        <thead>
          <tr><th>去重键</th><th>能防的重复</th><th>局限</th></tr>
        </thead>
        <tbody>
          <tr><td>MQ 消息 ID</td><td>同一条消息被重复投递</td><td>若生产者因重试发了两条「内容相同但 ID 不同」的消息，挡不住</td></tr>
          <tr><td>业务唯一键（如订单号）</td><td>同一业务动作的任何重复</td><td>需要业务本身有天然唯一标识</td></tr>
        </tbody>
      </table>
      <p>
        业务键（订单号、支付流水号）能从业务语义上保证「同一件事只做一次」，比 MQ 的传输 ID 更可靠。
        实践中常二者结合：业务键做主去重，消息 ID 做辅助日志追踪。
      </p>
      <p>
        <strong>面试追问：</strong>「去重表会无限膨胀吗？」——会，要配合<strong>定期清理</strong>（按时间删老记录）或给去重记录设 TTL，
        只保留一段合理时间窗内的去重信息，因为超过这个窗口重复投递几乎不可能发生。
      </p>

      <Summary
        points={[
          '消息可能在生产、存储、消费三段丢失，保证不丢必须三段都堵住，是木桶效应，缺一不可。',
          '生产端：等 Broker 确认（acks=all/confirm）+ 失败重试 + 兜底落表，发送异常绝不静默吞掉。',
          '存储端：Broker 持久化落盘（必要时同步刷盘）+ 多副本冗余，防宕机与磁盘损坏。',
          '消费端：关闭自动提交，业务处理成功后再手动提交位点/ACK，得到「至少一次」——不丢但可能重复。',
          '三种语义：至多一次（会丢）、至少一次（不丢可能重复，主流）、精确一次（难且有代价）；实践用「至少一次+消费端幂等」等效精确一次。',
          '幂等是处理重复的核心：用唯一键（优先业务键）+ 去重表/状态机/乐观锁，让重复消息只生效一次；去重记录要定期清理。',
        ]}
      />
    </article>
  )
}

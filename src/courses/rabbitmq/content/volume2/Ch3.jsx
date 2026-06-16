import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MessageOrder from '@/courses/rabbitmq/illustrations/MessageOrder.jsx'

const hashCode = `// 按业务 key 哈希到固定队列，保证同一订单的消息有序
public class OrderRouter {
    // 事先声明 N 个有序队列：order.queue.0 ... order.queue.(N-1)
    private static final int QUEUE_COUNT = 4;

    public String routingKeyFor(String orderNo) {
        // 同一个 orderNo 永远落到同一个队列，从而局部有序
        int idx = (orderNo.hashCode() & 0x7fffffff) % QUEUE_COUNT;
        return "order.q" + idx;
    }

    public void send(Channel channel, String orderNo, byte[] body)
            throws Exception {
        channel.basicPublish(
            "order.exchange",
            routingKeyFor(orderNo),   // 路由到该订单专属的队列
            MessageProperties.PERSISTENT_TEXT_PLAIN,
            body
        );
    }
}`

const consumerCode = `// 每个有序队列只挂一个消费者，且 prefetch = 1，保证串行处理
channel.basicQos(1);
channel.basicConsume("order.q2", false, (tag, delivery) -> {
    long deliveryTag = delivery.getEnvelope().getDeliveryTag();
    handleInOrder(new String(delivery.getBody()));  // 严格按到达顺序处理
    channel.basicAck(deliveryTag, false);
}, t -> {});`

const seqCode = `// 进阶：用序号 + 状态机让乱序也能「最终有序」，不强依赖队列顺序
// 消息体里带上业务版本号 seq，消费端用状态机判断该不该处理
public void handle(OrderMsg msg) {
    Order o = db.find(msg.getOrderNo());
    // 只接受「正好下一步」的状态流转，乱序来的超前消息先丢回/暂存
    if (msg.getSeq() != o.getExpectedSeq()) {
        // 顺序不对：要么稍后重试，要么进等待区，等前序到齐再处理
        throw new OutOfOrderException(msg.getSeq(), o.getExpectedSeq());
    }
    applyTransition(o, msg);          // 推进状态
    o.setExpectedSeq(msg.getSeq() + 1);
    db.save(o);
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          “订单的创建、支付、发货消息，能不能保证按顺序被消费？” 这道题考的是你是否真懂队列。
          很多人以为「队列天然先进先出，当然有序」，可一上多消费者、一加重试，顺序立刻就乱了。
          这一节讲清：乱序从哪来、怎么保证有序、以及保序要付出的代价。
        </p>
      </Lead>

      <h2>为什么会乱序</h2>
      <p>
        单个队列确实是 FIFO 的，但消息从入队到「处理完成」之间还有很多环节，乱序主要来自三处：
      </p>
      <ul>
        <li><strong>一个队列多消费者并发</strong>：队列把消息轮流分给多个消费者，谁先处理完不确定，
          消息 2 可能比消息 1 先完成。</li>
        <li><strong>消费失败重试</strong>：消息 1 处理失败被重新入队，排到了消息 2、3 后面，顺序被打乱。</li>
        <li><strong>多队列分散</strong>：同一业务的消息被路由到不同队列，各队列消费进度不同，整体就无序了。</li>
      </ul>
      <p>
        要点辨析：队列保证的是<strong>「投递顺序」</strong>（按入队序推给消费者），但我们真正关心的是
        <strong>「处理完成顺序」</strong>。一旦有多个消费者并发、或单消费者并发处理多条（prefetch &gt; 1 且多线程），
        投递有序也不等于处理有序。这是「队列是 FIFO 为什么还会乱」的根本答案。
      </p>

      <Example title="订单状态不能乱：创建 → 支付 → 发货">
        <p>
          订单 1001 依次产生三条消息：「创建」「支付」「发货」。如果它们被两个消费者并发处理，
          很可能「发货」先于「支付」被消费——系统就会试图给一个还没付钱的订单发货，业务直接错乱。
        </p>
        <p>
          注意：真正需要保序的，只是<strong>同一个订单</strong>的这几条消息；不同订单之间谁先谁后无所谓。
          这个观察是所有保序方案的出发点。
        </p>
      </Example>

      <MessageOrder />

      <KeyIdea title="保序的代价是牺牲并发">
        <p>
          顺序的本质是<strong>串行</strong>：要严格有序，就只能让需要保序的那批消息「一个处理完再处理下一个」。
          所以保序和吞吐天生矛盾——保得越严，并发越低。聪明的做法不是全局保序，而是<strong>只保需要保的那部分</strong>，
          把保序的粒度缩到最小。
        </p>
      </KeyIdea>

      <h2>怎么保证顺序</h2>
      <ul>
        <li><strong>单队列单消费者</strong>：一个队列只挂一个消费者，且 prefetch=1 串行处理，能做到全局严格有序——
          但吞吐极低，只适合量小且必须强保序的场景。</li>
        <li><strong>按业务 key 哈希到同一队列</strong>：把同一订单（按 orderNo 哈希）的所有消息路由到固定的某个队列，
          每个队列单消费者处理。这样<strong>同一订单内部严格有序，不同订单之间并行</strong>，兼顾了顺序和吞吐。</li>
      </ul>
      <p>
        实践中几乎都选第二种——这叫<em>局部有序</em>（按 key 分区有序），是 RabbitMQ、Kafka 等消息系统通用的保序思路。
        RabbitMQ 也有插件实现一致性哈希交换机（<code>x-consistent-hash</code>），自动按 key 把消息散到多个队列，
        效果等同于手写哈希路由，但扩缩队列时再平衡更平滑。
      </p>

      <h3>换个思路：不靠队列保序，靠业务保序</h3>
      <p>
        当并发要求高、又无法把同 key 消息约束到单队列时，还有一招——<strong>让消费端对乱序「免疫」</strong>。
        给每条消息带一个业务版本号 <code>seq</code>，消费端用状态机只接受「正好是下一步」的消息，超前到达的先暂存或丢回重试。
        这样即便消息乱序到达，最终状态仍然正确：
      </p>
      <CodeBlock lang="java" title="序号 + 状态机抗乱序" code={seqCode} />
      <p>
        这和幂等是一脉相承的思路：与其费力保证「到达即有序」，不如让业务逻辑本身能容忍乱序。
        实务中「按 key 局部有序 + 状态机兜底」是最稳的组合。
      </p>

      <Callout variant="warn" title="重试会偷偷打乱顺序">
        <p>
          即便做到了单队列单消费者，<strong>失败重新入队</strong>仍可能破坏顺序：失败的消息回到队尾，
          就排到了后面的消息之后。保序场景下要慎用「nack requeue=true」，更稳妥的是<strong>失败即阻塞重试</strong>
          （原地重试，不让后面消息越过去）或把失败消息连同后续一起暂停，否则「有序」只是看上去有序。
        </p>
      </Callout>

      <h2>各方案权衡</h2>
      <table>
        <thead>
          <tr><th>方案</th><th>有序范围</th><th>吞吐</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td>单队列单消费者</td><td>全局严格有序</td><td>最低</td><td>量小、必须强保序</td></tr>
          <tr><td>按 key 哈希分区</td><td>同 key 内有序</td><td>较高</td><td>大多数业务保序场景</td></tr>
          <tr><td>序号+状态机</td><td>最终有序</td><td>高</td><td>高并发、能容忍乱序到达</td></tr>
        </tbody>
      </table>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「RabbitMQ 怎么保证顺序」，按三段答：先说乱序来源（多消费者并发、失败重试、多队列分散，
        并点出「投递有序≠处理有序」），再说做法（单队列单消费者可全局有序但吞吐低；生产上用按业务 key 哈希到固定队列做局部有序），
        最后点出取舍（顺序的代价是串行、牺牲并发，所以只保需要保的最小粒度，并注意重试别把顺序搅乱）。
        能再补一句「实在要并发就让消费端带序号做状态机、对乱序免疫」，就拉满了。
      </p>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：prefetch 和顺序有什么关系？</strong> 单消费者下，prefetch=1 才能保证「处理完一条再要下一条」；
            prefetch &gt; 1 时消费者可能拿到多条并发处理，顺序又乱了。保序必须 prefetch=1。
          </li>
          <li>
            <strong>追问：Kafka 和 RabbitMQ 保序有何不同？</strong> Kafka 用「分区」天然按 key 局部有序，是它的强项；
            RabbitMQ 没有分区概念，要靠哈希路由到多队列模拟，所以高吞吐严格保序场景 Kafka 更顺手。
          </li>
          <li>
            <strong>误区：以为加 prefetch 提高吞吐不影响顺序。</strong> 这恰恰是保序场景最常见的破坏源。
          </li>
        </ul>
      </Callout>

      <Practice title="按订单号路由实现局部有序">
        <p>
          声明若干个有序队列，用订单号哈希决定路由到哪个队列，每个队列单消费者 + prefetch=1 串行消费，
          验证同一订单的「创建/支付/发货」始终按序处理，不同订单之间仍并行。
        </p>
        <CodeBlock lang="java" title="OrderRouter.java" code={hashCode} />
        <p>每个有序队列单消费者、prefetch=1，严格串行处理：</p>
        <CodeBlock lang="java" title="OrderedConsumer.java" code={consumerCode} />
        <p>
          进阶：把队列数从 4 调到 8，观察吞吐变化；再思考某个订单的「支付」消息处理失败时，
          怎样原地重试而不让「发货」越过它，把保序做得真正可靠。最后给消息加上 seq 字段，
          用状态机让消费端即便乱序到达也能拼回正确顺序，对比两种思路的取舍。
        </p>
      </Practice>

      <Summary
        points={[
          '单队列是 FIFO，但多消费者并发、失败重试、多队列分散都会让「处理完成顺序」乱掉——投递有序≠处理有序。',
          '真正要保的只是同一业务实体（如同一订单）内部的顺序，不同实体之间无需保序。',
          '单队列单消费者 + prefetch=1 可全局严格有序，但串行导致吞吐极低，慎用。',
          '生产首选：按业务 key 哈希路由到固定队列（或一致性哈希交换机），做到局部有序，兼顾顺序与吞吐。',
          '高并发场景可让消费端带序号 + 状态机对乱序免疫，做到「最终有序」。',
          '保序的代价是串行、牺牲并发，原则是把保序粒度缩到最小；prefetch 必须为 1。',
          '失败重新入队会把顺序搅乱，保序场景要用原地阻塞重试而非 requeue。',
        ]}
      />
    </>
  )
}

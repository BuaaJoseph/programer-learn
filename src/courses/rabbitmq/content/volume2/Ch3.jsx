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
      </p>

      <Callout variant="warn" title="重试会偷偷打乱顺序">
        <p>
          即便做到了单队列单消费者，<strong>失败重新入队</strong>仍可能破坏顺序：失败的消息回到队尾，
          就排到了后面的消息之后。保序场景下要慎用「nack requeue=true」，更稳妥的是<strong>失败即阻塞重试</strong>
          （原地重试，不让后面消息越过去）或把失败消息连同后续一起暂停，否则「有序」只是看上去有序。
        </p>
      </Callout>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「RabbitMQ 怎么保证顺序」，按三段答：先说乱序来源（多消费者并发、失败重试、多队列分散），
        再说做法（单队列单消费者可全局有序但吞吐低；生产上用按业务 key 哈希到固定队列做局部有序），
        最后点出取舍（顺序的代价是串行、牺牲并发，所以只保需要保的最小粒度，并注意重试别把顺序搅乱）。
        三段齐全，分数就稳了。
      </p>

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
          怎样原地重试而不让「发货」越过它，把保序做得真正可靠。
        </p>
      </Practice>

      <Summary
        points={[
          '单队列是 FIFO，但多消费者并发、失败重试、多队列分散都会让「消费完成顺序」乱掉。',
          '真正要保的只是同一业务实体（如同一订单）内部的顺序，不同实体之间无需保序。',
          '单队列单消费者 + prefetch=1 可全局严格有序，但串行导致吞吐极低，慎用。',
          '生产首选：按业务 key 哈希路由到固定队列，做到局部有序，兼顾顺序与吞吐。',
          '保序的代价是串行、牺牲并发，原则是把保序粒度缩到最小。',
          '失败重新入队会把顺序搅乱，保序场景要用原地阻塞重试而非 requeue。',
        ]}
      />
    </>
  )
}

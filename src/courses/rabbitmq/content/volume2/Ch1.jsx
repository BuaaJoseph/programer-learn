import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ReliableDelivery from '@/courses/rabbitmq/illustrations/ReliableDelivery.jsx'

const confirmCode = `import com.rabbitmq.client.Channel;
import com.rabbitmq.client.MessageProperties;

// 1) 生产者端：开启 publisher confirm
channel.confirmSelect();

// 2) 声明持久化的交换机和队列（durable = true）
channel.exchangeDeclare("order.exchange", "direct", true);
channel.queueDeclare("order.queue", true, false, false, null);
channel.queueBind("order.queue", "order.exchange", "create");

// 3) 发消息时把消息也设成持久化（deliveryMode = 2）
channel.basicPublish(
    "order.exchange",
    "create",
    MessageProperties.PERSISTENT_TEXT_PLAIN,   // deliveryMode = 2
    "order-1001".getBytes()
);

// 4) 等 broker 回执，确认这条消息确实落到了队列
if (channel.waitForConfirms(5000)) {
    System.out.println("broker 已确认收下");
} else {
    System.out.println("没收到确认，需要重发或记录补偿");
}`

const consumerCode = `// 消费者端：关闭 autoAck，改成手动 ack
boolean autoAck = false;
channel.basicQos(1);   // 一次只取一条，处理完再取下一条

channel.basicConsume("order.queue", autoAck, (tag, delivery) -> {
    long deliveryTag = delivery.getEnvelope().getDeliveryTag();
    try {
        handle(new String(delivery.getBody()));   // 真正的业务处理
        // 处理成功，才告诉 broker 可以删消息了
        channel.basicAck(deliveryTag, false);
    } catch (Exception e) {
        // 处理失败：拒绝并重新入队，留给下一次重试
        channel.basicNack(deliveryTag, false, true);
    }
}, tag -> {});`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          “消息会不会丢”是 RabbitMQ 面试的第一道硬菜。答案是：一条消息从生产者出发，到被消费者成功处理，
          要经过三段旅程，<strong>每一段都可能丢</strong>。想做到不丢，就得在三个环节各设一道防线，缺一不可。
          这一节把三道防线一次讲透。
        </p>
      </Lead>

      <h2>消息会在哪三个环节丢</h2>
      <p>
        把一条消息的一生拆开看，它要走三步：生产者把消息发给 broker、broker 把消息存起来、broker 再把消息投给消费者。
        对应三个丢失点：
      </p>
      <ul>
        <li><strong>生产者 → broker</strong>：网络抖动、broker 宕机，消息根本没到，生产者却以为发成功了。</li>
        <li><strong>broker 存储期间</strong>：消息只在内存里，broker 一重启就没了。</li>
        <li><strong>broker → 消费者</strong>：消费者刚拿到消息、还没处理完就崩了，消息却已经从队列删除。</li>
      </ul>

      <h3>第一道防线：生产者确认 publisher confirm</h3>
      <p>
        要确保消息真的到了 broker，靠的是 <em>publisher confirm</em>（发布确认）机制。开启后，broker 每收下一条消息，
        就回一个 ack 给生产者；如果消息进不了队列，则回 nack。生产者据此判断是否要重发。
      </p>
      <p>
        另一种方案是 <em>transaction</em>（事务），但事务是同步阻塞的，每次提交都要和 broker 一来一回，
        吞吐会掉一个数量级。所以生产环境基本都用 confirm，几乎不用事务。
      </p>

      <h3>第二道防线：三件套持久化</h3>
      <p>
        消息确认到了 broker，还要保证 broker 重启后它还在。这需要三处同时持久化：<strong>交换机持久化</strong>
        （exchangeDeclare 的 durable=true）、<strong>队列持久化</strong>（queueDeclare 的 durable=true）、
        以及<strong>消息持久化</strong>（投递时设 <code>deliveryMode=2</code>）。三者缺一，重启后都可能丢。
      </p>

      <h3>第三道防线：消费者手动 ack</h3>
      <p>
        默认的 <em>autoAck</em> 是「broker 把消息推给消费者的那一刻就当作已消费、立刻删除」。一旦消费者拿到消息后崩溃，
        消息就再也找不回来了。正确做法是关闭 autoAck，改成<strong>手动 ack</strong>：业务处理成功才 ack，
        失败就 nack/reject 让消息重新入队或进死信。
      </p>

      <Example title="一条订单消息走完三道防线">
        <p>下单服务发出「订单 1001 已创建」这条消息：</p>
        <ul>
          <li>发出后等到 broker 的 confirm 回执，确认消息落到了队列（第一道）；</li>
          <li>交换机、队列、消息都持久化，即便此刻 broker 重启，消息仍躺在磁盘上（第二道）；</li>
          <li>库存服务取走消息、扣完库存后才 ack；若扣库存时进程被 kill，消息会重回队列被重投（第三道）。</li>
        </ul>
        <p>三道防线都立住了，这条消息才算「绝不会丢」。</p>
      </Example>

      <ReliableDelivery />

      <KeyIdea title="不丢 = 三段链路各自闭环">
        <p>
          可靠投递不是一个开关，而是<strong>三段链路各自闭环</strong>：每一段都要有「对方确认收到」的回执，
          中间环节还要能扛住重启。任何一段只发不确认，整条链路就漏了。记住这条主线，三道防线的代码细节自然就串起来了。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="只持久化、不开 confirm 也会丢">
        <p>
          常见误区是「我把队列和消息都设成持久化了，应该不会丢吧」。其实持久化是异步刷盘的——
          消息可能还在操作系统的页缓存里没落盘，broker 就宕机了。所以持久化必须和 publisher confirm 配合：
          broker 只有在<strong>真正刷盘后</strong>才回 confirm，这时生产者才能安心。
        </p>
      </Callout>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「RabbitMQ 怎么保证消息不丢」，别只背名词，按三段链路答：“消息分三段可能丢，所以设三道防线——
        生产端开 publisher confirm 拿回执（事务太慢不用），存储端把交换机、队列、消息都持久化（deliveryMode=2），
        消费端关 autoAck 改手动 ack、处理成功才确认。三者缺一不可。” 这样答既有结构又显原理。
      </p>

      <Practice title="搭一条不丢消息的最小链路">
        <p>
          用 RabbitMQ Java 客户端把三道防线一次配齐：生产端开 confirm + 持久化发送，消费端手动 ack。
          先跑通正常流程，再故意在消费时抛异常，观察消息是否被重新投递。
        </p>
        <CodeBlock lang="java" title="ReliableProducer.java" code={confirmCode} />
        <p>消费端关闭 autoAck，处理成功才 ack，失败 nack 重新入队：</p>
        <CodeBlock lang="java" title="ReliableConsumer.java" code={consumerCode} />
        <p>
          进阶：把 <code>waitForConfirms</code> 换成异步的 <code>addConfirmListener</code>，
          用一个有序集合记录未确认的 deliveryTag，体会高吞吐下「批量异步确认」是怎么做的。
        </p>
      </Practice>

      <Summary
        points={[
          '一条消息有三个丢失点：生产者到 broker、broker 存储期间、broker 到消费者，要分别设防。',
          '第一道：生产者开 publisher confirm 拿 broker 回执；事务也能保证但同步阻塞、性能差，基本不用。',
          '第二道：交换机、队列、消息三件套都要持久化，消息靠 deliveryMode=2，缺一在重启后都可能丢。',
          '第三道：消费者关闭 autoAck 改手动 ack，业务成功才 ack，失败 nack/reject 重新入队或进死信。',
          '持久化是异步刷盘，必须和 confirm 配合：broker 刷盘后才回 confirm，生产者才真正安全。',
          '三道防线缺一不可，面试按“三段链路各自闭环”这条主线作答最稳。',
        ]}
      />
    </>
  )
}

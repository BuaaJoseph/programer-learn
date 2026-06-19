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

const asyncConfirmCode = `// 高吞吐下用异步确认：不阻塞等回执，靠回调批量销账
ConcurrentNavigableMap<Long, String> unconfirmed =
    new ConcurrentSkipListMap<>();   // 记录未确认的消息

channel.confirmSelect();
channel.addConfirmListener(
    // ackCallback：broker 确认收下
    (deliveryTag, multiple) -> {
        if (multiple) {
            // multiple=true 表示「这个 tag 及之前的都确认了」，批量清掉
            unconfirmed.headMap(deliveryTag, true).clear();
        } else {
            unconfirmed.remove(deliveryTag);
        }
    },
    // nackCallback：broker 拒收，需要重发或告警
    (deliveryTag, multiple) -> {
        String body = unconfirmed.get(deliveryTag);
        System.out.println("nack，需要重发: " + body);
    });

for (int i = 0; i < 1000; i++) {
    long seq = channel.getNextPublishSeqNo();   // 拿到本条的序号
    String body = "order-" + i;
    unconfirmed.put(seq, body);
    channel.basicPublish("order.exchange", "create",
        MessageProperties.PERSISTENT_TEXT_PLAIN, body.getBytes());
}`

const returnCode = `// mandatory + ReturnListener：路由不到队列的消息会被退回，而不是静默丢弃
channel.addReturnListener((replyCode, replyText,
                           exchange, routingKey, props, body) -> {
    // 进到这里说明消息进了交换机却没匹配到任何队列
    System.out.println("路由失败被退回: " + new String(body)
        + " reason=" + replyText);
    // 通常落库记录、告警，或转投兜底队列
});

channel.basicPublish("order.exchange", "no.such.key",
    true,                                  // mandatory = true
    MessageProperties.PERSISTENT_TEXT_PLAIN,
    "lost?".getBytes());`

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
      <p>
        除此之外还有一个隐蔽的「第零个」丢失点：消息进了交换机却<strong>路由不到任何队列</strong>（key 写错、队列没声明），
        默认被静默丢弃。所以严格说有「3+1」个丢失点，下面把每一个都堵上。
      </p>

      <h3>第一道防线：生产者确认 publisher confirm</h3>
      <p>
        要确保消息真的到了 broker，靠的是 <em>publisher confirm</em>（发布确认）机制。开启后，broker 每收下一条消息，
        就回一个 ack 给生产者；如果消息进不了队列，则回 nack。生产者据此判断是否要重发。
      </p>
      <p>
        另一种方案是 <em>transaction</em>（事务），但事务是同步阻塞的，每次提交都要和 broker 一来一回，
        吞吐会掉一个数量级。所以生产环境基本都用 confirm，几乎不用事务。
      </p>
      <p>
        confirm 有三种用法，吞吐依次升高：<strong>单条同步</strong>（每发一条 <code>waitForConfirms</code> 一次，最慢）、
        <strong>批量同步</strong>（发一批再统一等，快但出错难定位是哪条）、<strong>异步监听</strong>
        （<code>addConfirmListener</code> 回调销账，最快，生产推荐）。异步确认要自己维护「未确认消息表」，
        靠序号 <code>deliveryTag</code> 销账，<code>multiple=true</code> 时表示「该序号及之前的都已确认」可批量清除：
      </p>
      <CodeBlock lang="java" title="异步发布确认（高吞吐）" code={asyncConfirmCode} />

      <h3>补一道：mandatory + Return 防「路由不到」</h3>
      <p>
        confirm 只保证「消息到了交换机」，但<strong>到了交换机不等于进了队列</strong>。若 routing key 匹配不到队列，
        confirm 仍会回 ack（交换机确实收到了），消息却被悄悄丢弃。要堵这个洞，发布时设 <code>mandatory=true</code>
        并注册 <code>ReturnListener</code>，路由失败的消息会被退回给生产者：
      </p>
      <CodeBlock lang="java" title="mandatory + ReturnListener" code={returnCode} />
      <p>
        记忆口诀：<strong>confirm 管「到没到交换机」，return 管「进没进队列」</strong>，两者配合才覆盖生产端全部丢失点。
      </p>

      <h3>第二道防线：三件套持久化</h3>
      <p>
        消息确认到了 broker，还要保证 broker 重启后它还在。这需要三处同时持久化：<strong>交换机持久化</strong>
        （exchangeDeclare 的 durable=true）、<strong>队列持久化</strong>（queueDeclare 的 durable=true）、
        以及<strong>消息持久化</strong>（投递时设 <code>deliveryMode=2</code>）。三者缺一，重启后都可能丢。
      </p>
      <p>
        为什么是「三件套」而不是只持久化消息？因为持久化的消息必须存在持久化的队列里、队列又必须挂在持久化的交换机上，
        重启后这三者会被一起从磁盘恢复。如果队列是非持久化的，重启后队列本身就没了，里面再「持久」的消息也无处安放。
      </p>

      <h3>第三道防线：消费者手动 ack</h3>
      <p>
        默认的 <em>autoAck</em> 是「broker 把消息推给消费者的那一刻就当作已消费、立刻删除」。一旦消费者拿到消息后崩溃，
        消息就再也找不回来了。正确做法是关闭 autoAck，改成<strong>手动 ack</strong>：业务处理成功才 ack，
        失败就 nack/reject 让消息重新入队或进死信。
      </p>
      <p>
        三个确认方法要分清：<code>basicAck</code>（确认成功，删消息）、<code>basicNack</code>
        （拒绝，可批量、可选 requeue）、<code>basicReject</code>（拒绝，只能单条、可选 requeue）。
        nack/reject 把 <code>requeue=true</code> 会重回队列重投，<code>requeue=false</code> 则丢弃或进死信队列。
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

      <h2>可靠不是免费的：性能代价与边界</h2>
      <p>
        三道防线全开会显著拉低吞吐：持久化要刷盘（磁盘 IO）、confirm 要往返（网络 RTT）、手动 ack 要等业务处理完。
        实测下，全可靠配置相比「全异步无确认」吞吐可能掉到 1/5 甚至更低。所以要按业务分级：
      </p>
      <table>
        <thead>
          <tr><th>场景</th><th>持久化</th><th>confirm</th><th>手动ack</th></tr>
        </thead>
        <tbody>
          <tr><td>支付/订单（绝不能丢）</td><td>是</td><td>异步</td><td>是</td></tr>
          <tr><td>日志/埋点（丢少量可接受）</td><td>否</td><td>否</td><td>autoAck</td></tr>
          <tr><td>通知/短信（尽量不丢）</td><td>是</td><td>批量</td><td>是</td></tr>
        </tbody>
      </table>
      <p>
        还有个边界：即便三道防线全开，<strong>「绝对不丢」在分布式下仍是理论极限</strong>——磁盘损坏、单点 Broker 整机故障
        都可能丢已确认的消息。要再上一层，得靠多副本（镜像队列/quorum 队列，后续章节展开）。
      </p>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问「RabbitMQ 怎么保证消息不丢」，别只背名词，按三段链路答：“消息分三段可能丢，所以设三道防线——
        生产端开 publisher confirm 拿回执（事务太慢不用），存储端把交换机、队列、消息都持久化（deliveryMode=2），
        消费端关 autoAck 改手动 ack、处理成功才确认。三者缺一不可。” 这样答既有结构又显原理。
        再加一句「confirm 管到没到交换机、mandatory+return 管进没进队列、镜像/quorum 队列防单点」，就近乎满分。
      </p>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：confirm 和事务能一起用吗？</strong> 不能，二者互斥，开了事务就不能开 confirm，反之亦然。
          </li>
          <li>
            <strong>追问：手动 ack 忘了 ack 会怎样？</strong> 消息一直处于 unacked 状态不会被删，
            也不会再投给别的消费者，直到该连接断开才重新入队。大量 unacked 会让队列「看起来有消息却消费不动」。
          </li>
          <li>
            <strong>追问：nack 一直 requeue 会怎样？</strong> 同一条坏消息反复重投形成「毒消息」死循环，
            要靠重试次数限制 + 死信队列兜底（后续章节）。
          </li>
        </ul>
      </Callout>

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
          再加一条往不存在的 routing key 发的消息，配 mandatory + ReturnListener，看它被退回——
          亲手验证「confirm 回了 ack，消息却没进队列」这个隐蔽坑。
        </p>
      </Practice>

      <Summary
        points={[
          '一条消息有「3+1」个丢失点：生产者到 broker、broker 存储期间、broker 到消费者，外加路由不到队列。',
          '第一道：生产者开 publisher confirm 拿 broker 回执（异步监听吞吐最高）；事务同步阻塞、性能差，基本不用。',
          'confirm 只管到没到交换机，进没进队列要靠 mandatory+ReturnListener，二者配合覆盖生产端全部丢失点。',
          '第二道：交换机、队列、消息三件套都要持久化，消息靠 deliveryMode=2，缺一在重启后都可能丢。',
          '第三道：消费者关闭 autoAck 改手动 ack（ack/nack/reject），业务成功才确认，失败重入队或进死信。',
          '持久化是异步刷盘，必须和 confirm 配合：broker 刷盘后才回 confirm，生产者才真正安全。',
          '可靠有性能代价，要按业务分级；绝对不丢的极限要靠镜像/quorum 队列防单点。',
        ]}
      />
    </>
  )
}

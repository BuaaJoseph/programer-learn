import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import DeadLetter from '@/courses/rabbitmq/illustrations/DeadLetter.jsx'

const dlxCode = `import java.util.HashMap;
import java.util.Map;

// 1) 先声明死信交换机和死信队列（消息最终的归宿）
channel.exchangeDeclare("dlx.exchange", "direct", true);
channel.queueDeclare("dlx.queue", true, false, false, null);
channel.queueBind("dlx.queue", "dlx.exchange", "dead");

// 2) 声明业务队列，挂上死信参数
Map<String, Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "dlx.exchange");  // 死信去哪个交换机
args.put("x-dead-letter-routing-key", "dead");       // 死信用什么路由键
args.put("x-message-ttl", 30 * 60 * 1000);           // 消息 30 分钟过期
args.put("x-max-length", 10000);                     // 队列最多 1 万条

channel.queueDeclare("order.delay.queue", true, false, false, args);`

const delayConsumeCode = `// 延迟队列消费端：消费的是「过期后转入死信队列」的消息
channel.basicConsume("dlx.queue", false, (tag, delivery) -> {
    long deliveryTag = delivery.getEnvelope().getDeliveryTag();
    String orderNo = new String(delivery.getBody());
    // 到这里说明该订单 30 分钟内没等到「已支付」，执行自动取消
    cancelIfUnpaid(orderNo);
    channel.basicAck(deliveryTag, false);
}, t -> {});`

const retryCode = `// 用死信实现「有限次重试 + 最终进死信」，避免毒消息无限重投
// 消费失败时读取已重试次数（放在 header 里），超限就 reject 不 requeue
channel.basicConsume("biz.queue", false, (tag, delivery) -> {
    long deliveryTag = delivery.getEnvelope().getDeliveryTag();
    Map<String, Object> headers = delivery.getProperties().getHeaders();
    int retry = headers == null ? 0
        : (int) headers.getOrDefault("x-retry", 0);
    try {
        handle(new String(delivery.getBody()));
        channel.basicAck(deliveryTag, false);
    } catch (Exception e) {
        if (retry >= 3) {
            // 重试 3 次仍失败：丢进死信队列等人工介入，别再 requeue
            channel.basicReject(deliveryTag, false);
        } else {
            // 重新发一条 retry+1 的消息（也可借 TTL 队列做退避重试）
            republishWithRetry(delivery.getBody(), retry + 1);
            channel.basicAck(deliveryTag, false);
        }
    }
}, t -> {});`

const pluginCode = `// 用 rabbitmq-delayed-message-exchange 插件：每条消息独立延迟，无队头阻塞
Map<String, Object> exArgs = new HashMap<>();
exArgs.put("x-delayed-type", "direct");   // 底层按 direct 路由
channel.exchangeDeclare("delay.ex", "x-delayed-message", true, false, exArgs);

// 发消息时用 header x-delay 指定本条延迟毫秒数，互不影响
Map<String, Object> headers = new HashMap<>();
headers.put("x-delay", 60000);            // 这条延迟 60 秒
channel.basicPublish("delay.ex", "task",
    new AMQP.BasicProperties.Builder().headers(headers).build(),
    "do-it-later".getBytes());`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          消息被消费失败、过期、或队列塞满了，这些「没法正常处理」的消息去哪了？答案是
          <em>dead letter</em>（死信）——它们会被转送到专门的<strong>死信队列</strong>里，等人来兜底。
          更妙的是，死信机制还能反过来当成<strong>延迟队列</strong>用，实现「30 分钟未支付自动取消订单」这类需求。
        </p>
      </Lead>

      <h2>什么样的消息会变成死信</h2>
      <p>
        一条消息满足以下任意一种情况，就会被 broker 判为 <em>dead letter</em>，转投到死信交换机：
      </p>
      <ul>
        <li><strong>被 nack/reject 且 requeue=false</strong>：消费者拒收且明确不让它重新入队（比如重试多次仍失败）。</li>
        <li><strong>消息 TTL 过期</strong>：消息在队列里待的时间超过了 <code>x-message-ttl</code>，还没被消费。</li>
        <li><strong>队列达到最大长度</strong>：队列里消息数超过 <code>x-max-length</code>，最早的消息被挤出去。</li>
      </ul>
      <p>
        TTL 可以设在两个层面：<strong>队列级</strong>（<code>x-message-ttl</code>，该队列所有消息统一时长）和
        <strong>消息级</strong>（发消息时在 <code>expiration</code> 属性里单独设）。两者都设时取较小值。
        理解这点对后面分析「队头阻塞」很关键。
      </p>

      <h3>死信交换机 DLX</h3>
      <p>
        死信不会凭空消失，而是被路由到一个<em>死信交换机</em>（dead letter exchange，简称 DLX）。
        做法是在声明业务队列时，加上参数 <code>x-dead-letter-exchange</code> 指定 DLX，
        再用 <code>x-dead-letter-routing-key</code> 指定路由键。这样变成死信的消息，
        就会被 DLX 投递到绑定的死信队列，供你统一处理（重试、报警、人工介入）。
      </p>
      <p>
        一个容易被追问的细节：消息变成死信后，RabbitMQ 会在它的 header 里加上 <code>x-death</code> 数组，
        记录它「因何死、死了几次、原队列是谁」。排查问题时这个字段非常有用，能看出一条消息是被拒、过期还是溢出而来的。
        另外若不指定死信 routing key，死信会<strong>沿用原消息的 routing key</strong>，这点不注意容易路由到意外的队列。
      </p>

      <Example title="用「TTL + DLX」搭一个延迟队列">
        <p>
          这是个经典技巧：建一个<strong>没有消费者</strong>的业务队列，给它设 <code>x-message-ttl=30分钟</code>
          和死信交换机。消息进来后没人消费，30 分钟后必然 TTL 过期 → 变成死信 → 被 DLX 转到死信队列 →
          死信队列的消费者这时才收到它。等于消息被「延迟」了 30 分钟才真正被处理。
        </p>
        <p>
          除了这种 TTL+DLX 的土办法，RabbitMQ 还有官方的 <em>rabbitmq-delayed-message-exchange</em> 插件，
          可以直接给每条消息设独立的延迟时间，比固定 TTL 更灵活。
        </p>
      </Example>

      <DeadLetter />

      <KeyIdea title="死信 = 队列的「兜底出口」">
        <p>
          可以把 DLX 理解成队列的<strong>兜底出口</strong>：正常消费走前门，处理不了的（拒收、过期、溢出）走后门进死信队列。
          有了这个出口，异常消息不会被悄悄丢弃，也不会堵死主流程——而把「过期」这个出口反向利用，
          就得到了延迟队列。<strong>同一套死信机制，正着用是异常兜底，反着用是延迟调度。</strong>
        </p>
      </KeyIdea>

      <h2>死信的另一大用途：可控重试 + 毒消息隔离</h2>
      <p>
        上一章提过「nack 一直 requeue 会形成毒消息死循环」。死信正是它的解药：给消费失败做<strong>有限次重试</strong>，
        超过次数就 reject 进死信队列，由人工或补偿任务处理，主流程不再被这条坏消息卡死。
      </p>
      <CodeBlock lang="java" title="有限次重试 + 死信隔离" code={retryCode} />
      <p>
        更工程化的做法是「<strong>退避重试</strong>」：失败的消息不立即重投，而是丢进一个带递增 TTL 的延迟队列，
        过 10s/30s/60s 再回到业务队列重试，给下游故障一点恢复时间。这正是 TTL+DLX 在重试场景的应用。
      </p>

      <Callout variant="warn" title="TTL 延迟队列的队头阻塞坑">
        <p>
          用单个队列 + 队列级 TTL 做延迟时要小心：RabbitMQ 只检查<strong>队头</strong>的消息是否过期。
          如果队头是一条 TTL=30 分钟的消息，后面跟着一条 TTL=1 分钟的，那条 1 分钟的也得等队头那条到期后才会被检查到——
          这就是「队头阻塞」。要支持不同延迟时长，要么按延迟分多个队列，要么直接上 delayed-message-exchange 插件。
        </p>
      </Callout>

      <h2>延迟队列两种实现对比</h2>
      <p>插件方案给每条消息独立延迟，从根上避免了队头阻塞：</p>
      <CodeBlock lang="java" title="delayed-message-exchange 插件" code={pluginCode} />
      <table>
        <thead>
          <tr><th>方案</th><th>延迟粒度</th><th>队头阻塞</th><th>依赖</th></tr>
        </thead>
        <tbody>
          <tr><td>队列级 TTL + DLX</td><td>同队列统一</td><td>有（混发不同时长时）</td><td>无需插件</td></tr>
          <tr><td>消息级 TTL + DLX</td><td>每条可不同</td><td>有（短的被长的挡住）</td><td>无需插件</td></tr>
          <tr><td>delayed-message 插件</td><td>每条独立</td><td>无</td><td>需装插件</td></tr>
        </tbody>
      </table>
      <p>
        选型建议：延迟时长固定（如统一 30 分钟取消未支付订单）用队列级 TTL 最简单；延迟时长五花八门（不同活动不同延迟）
        优先上插件。注意插件方案的延迟消息暂存在 Broker 节点本地，海量延迟消息时要评估内存与持久化。
      </p>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问死信，先答三个触发条件（nack/reject 且 requeue=false、TTL 过期、队列超长），再说 DLX 的配置
        （<code>x-dead-letter-exchange</code> 把死信路由到死信队列做兜底），可补一句死信 header 里的
        <code>x-death</code> 能看出死因。被问延迟队列，答两种实现：「TTL + DLX」组合（注意队列级 TTL 的队头阻塞问题），
        或 rabbitmq-delayed-message-exchange 插件（更灵活）。最后用「下单 30 分钟未支付自动取消」举个例子，落地感立刻就有了。
      </p>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：死信队列里的消息满了怎么办？</strong> 死信队列也是普通队列，可以给它再配一个 DLX
            或设最大长度告警；但通常死信量不大，重点是接入监控，有死信就报警人工看。
          </li>
          <li>
            <strong>追问：消息级 TTL 能避免队头阻塞吗？</strong> 不能。即便每条 TTL 不同，队列仍只检查队头，
            排在后面的短 TTL 消息要等前面的处理完才被检查。真正免阻塞只有插件方案。
          </li>
          <li>
            <strong>误区：以为 TTL 到了消息立刻就被投到 DLX。</strong> 实际是「惰性检查」——队列级 TTL 只在消息到队头时才判定过期，
            可能略有延迟，对秒级精度要求高的场景要注意。
          </li>
        </ul>
      </Callout>

      <Practice title="声明带死信和 TTL 的延迟队列">
        <p>
          以「下单 30 分钟未支付自动取消」为目标：声明一个带 <code>x-dead-letter-exchange</code> 和
          <code>x-message-ttl</code> 的业务队列（无消费者），消息过期后落到死信队列，由死信消费者执行取消逻辑。
        </p>
        <CodeBlock lang="java" title="DelayQueueSetup.java" code={dlxCode} />
        <p>死信队列的消费者，到点才收到消息并执行自动取消：</p>
        <CodeBlock lang="java" title="CancelConsumer.java" code={delayConsumeCode} />
        <p>
          进阶：把固定的队列级 TTL 换成 rabbitmq-delayed-message-exchange 插件，给每条消息设独立延迟，
          再对比两种方案在「不同延迟时长混发」时的表现，亲手体会队头阻塞问题。
          再做一个「有限次退避重试」的小实验：失败消息进递增 TTL 的延迟队列，重试满 3 次落死信。
        </p>
      </Practice>

      <Summary
        points={[
          '死信的三种触发：被 nack/reject 且 requeue=false、消息 TTL 过期、队列达到最大长度。',
          'TTL 分队列级和消息级；死信 header 里的 x-death 记录死因、次数、原队列，排查很有用。',
          '死信不会丢，会被路由到死信交换机 DLX，再进死信队列供统一兜底处理（不指定 key 则沿用原 key）。',
          '死信可做有限次重试 + 毒消息隔离：超次数 reject 进死信，配 TTL 还能实现退避重试。',
          '延迟队列经典实现：无消费者的队列 + x-message-ttl + DLX，消息过期后转死信队列被处理。',
          '队列级/消息级 TTL 都有队头阻塞问题，多种延迟时长建议用 delayed-message-exchange 插件。',
          '同一套死信机制：正用是异常兜底，反用是延迟调度，典型场景是下单 30 分钟未支付自动取消。',
        ]}
      />
    </>
  )
}

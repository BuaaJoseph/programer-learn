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

      <h3>死信交换机 DLX</h3>
      <p>
        死信不会凭空消失，而是被路由到一个<em>死信交换机</em>（dead letter exchange，简称 DLX）。
        做法是在声明业务队列时，加上参数 <code>x-dead-letter-exchange</code> 指定 DLX，
        再用 <code>x-dead-letter-routing-key</code> 指定路由键。这样变成死信的消息，
        就会被 DLX 投递到绑定的死信队列，供你统一处理（重试、报警、人工介入）。
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

      <Callout variant="warn" title="TTL 延迟队列的队头阻塞坑">
        <p>
          用单个队列 + 队列级 TTL 做延迟时要小心：RabbitMQ 只检查<strong>队头</strong>的消息是否过期。
          如果队头是一条 TTL=30 分钟的消息，后面跟着一条 TTL=1 分钟的，那条 1 分钟的也得等队头那条到期后才会被检查到——
          这就是「队头阻塞」。要支持不同延迟时长，要么按延迟分多个队列，要么直接上 delayed-message-exchange 插件。
        </p>
      </Callout>

      <h2>面试怎么答 / 实战要点</h2>
      <p>
        被问死信，先答三个触发条件（nack/reject 且 requeue=false、TTL 过期、队列超长），再说 DLX 的配置
        （<code>x-dead-letter-exchange</code> 把死信路由到死信队列做兜底）。被问延迟队列，答两种实现：
        「TTL + DLX」组合（注意队列级 TTL 的队头阻塞问题），或 rabbitmq-delayed-message-exchange 插件（更灵活）。
        最后用「下单 30 分钟未支付自动取消」举个例子，落地感立刻就有了。
      </p>

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
        </p>
      </Practice>

      <Summary
        points={[
          '死信的三种触发：被 nack/reject 且 requeue=false、消息 TTL 过期、队列达到最大长度。',
          '死信不会丢，会被路由到死信交换机 DLX，再进死信队列供统一兜底处理。',
          '配置靠队列参数 x-dead-letter-exchange（及 routing-key），把死信导向 DLX。',
          '延迟队列经典实现：无消费者的队列 + x-message-ttl + DLX，消息过期后转死信队列被处理。',
          '队列级 TTL 有队头阻塞问题，多种延迟时长建议用 rabbitmq-delayed-message-exchange 插件。',
          '同一套死信机制：正用是异常兜底，反用是延迟调度，典型场景是下单 30 分钟未支付自动取消。',
        ]}
      />
    </>
  )
}

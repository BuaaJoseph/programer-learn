import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import AmqpModel from '@/courses/rabbitmq/illustrations/AmqpModel.jsx'

const declareCode = `import pika

# 1. 建立 TCP 连接（Connection）
conn = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost'))

# 2. 在连接上开一个轻量通道（Channel），后续操作都走它
ch = conn.channel()

# 3. 声明一个 direct 类型的交换机（Exchange）
ch.exchange_declare(exchange='order.exchange',
                    exchange_type='direct', durable=True)

# 4. 声明一个队列（Queue）
ch.queue_declare(queue='order.points.queue', durable=True)

# 5. 用 routing key 把 exchange 和 queue 绑起来（Binding）
ch.queue_bind(exchange='order.exchange',
              queue='order.points.queue',
              routing_key='order.created')`

const cliCode = `# 用 rabbitmqadmin 声明同样的拓扑（命令行版）
rabbitmqadmin declare exchange name=order.exchange type=direct durable=true
rabbitmqadmin declare queue name=order.points.queue durable=true
rabbitmqadmin declare binding source=order.exchange \\
  destination=order.points.queue routing_key=order.created`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          很多人用 RabbitMQ 时有个误区：以为生产者把消息「发给队列」。其实在 <em>AMQP</em> 协议里，
          生产者<strong>从不直接发给队列</strong>，它只把消息丢给<em>交换机</em>（Exchange），
          再由交换机按规则路由到队列。搞懂 Exchange、Binding、Queue 这三者的关系，
          是理解 RabbitMQ 一切行为的地基。这一章我们把 AMQP 的核心角色都摆出来，再走一遍订单消息的完整旅程。
        </p>
      </Lead>

      <h2>AMQP 里有哪些角色</h2>
      <p>
        AMQP（<em>Advanced Message Queuing Protocol</em>）是 RabbitMQ 实现的协议标准。它定义了一组角色，
        各司其职：
      </p>
      <ul>
        <li>
          <strong>Producer（生产者）</strong>：发消息的一方。它只把消息交给 Exchange，
          <strong>不知道也不关心</strong>有哪些消费者。
        </li>
        <li>
          <strong>Connection（连接）</strong>：生产者/消费者与 RabbitMQ 之间的一条 TCP 长连接。
        </li>
        <li>
          <strong>Channel（信道）</strong>：建立在 Connection 之上的<strong>轻量逻辑通道</strong>。
          一条 TCP 连接里可以开很多 Channel，所有发收消息、声明拓扑的操作都在 Channel 上做。
        </li>
        <li>
          <strong>Exchange（交换机）</strong>：消息的「路由器」。它接收生产者的消息，按类型和规则决定丢给哪些队列。
        </li>
        <li>
          <strong>Binding（绑定）</strong>：连接 Exchange 和 Queue 的一条规则，通常带一个
          <em>routing key</em>，告诉交换机「满足这个 key 的消息请投到这个队列」。
        </li>
        <li>
          <strong>Queue（队列）</strong>：消息真正存放、排队的地方，消费者从这里取消息。
        </li>
        <li>
          <strong>Consumer（消费者）</strong>：从队列里取消息处理的一方。
        </li>
        <li>
          <strong>VHost（虚拟主机）</strong>：逻辑隔离的命名空间。不同 VHost 里的 Exchange、Queue 互不可见，
          常用来隔离不同业务或环境。
        </li>
      </ul>

      <h3>为什么要有 Channel？</h3>
      <p>
        建立 TCP 连接是有开销的，频繁开关连接很浪费。AMQP 的做法是：一个应用只开少量
        <strong>Connection</strong>，然后在上面开多个轻量的 <strong>Channel</strong> 来复用这条 TCP。
        每个线程用自己的 Channel，互不干扰。可以把 Connection 想成一根光纤，Channel 是这根光纤里跑的多条独立信道。
      </p>

      <Callout variant="warn" title="面试常考：生产者发给谁？">
        <p>
          「生产者把消息发到队列吗？」——错。生产者永远只把消息发给 <strong>Exchange</strong>，
          并附带一个 routing key。消息能不能进队列、进哪个队列，完全由 Exchange 的类型和 Binding 规则决定。
          这是 RabbitMQ 和某些「直接往队列里塞」的 MQ 最大的设计区别，也正是它路由灵活的来源。
        </p>
      </Callout>

      <Example title="一条订单消息的完整旅程">
        <p>顺着 AMQP 的角色，走一遍 <code>order.created</code> 消息从发出到被消费的全过程：</p>
        <ul>
          <li>生产者通过 <strong>Channel</strong> 把消息发给 <code>order.exchange</code>，附带 routing key <code>order.created</code>。</li>
          <li>交换机查自己的 <strong>Binding</strong>：发现 <code>order.points.queue</code> 用 <code>order.created</code> 绑过来了，于是把消息投进去。</li>
          <li>消息在 <strong>Queue</strong> 里排队等待。</li>
          <li><strong>Consumer</strong>（积分服务）从队列取出消息，加积分，处理完发回 ack 确认。</li>
          <li>队列收到 ack，把这条消息删掉，旅程结束。</li>
        </ul>
        <p>
          全程生产者只认识 Exchange，消费者只认识 Queue，两边通过 Binding 间接对接——这就是上一章「解耦」在协议层的体现。
        </p>
      </Example>

      <AmqpModel />

      <KeyIdea title="记住这条链路：Producer → Exchange → Binding → Queue → Consumer">
        <p>
          AMQP 的核心就是这一条投递链路。生产者发给 <strong>Exchange</strong>，
          Exchange 靠 <strong>Binding</strong> 找到 <strong>Queue</strong>，消费者从 Queue 取走。
          中间任何一环（交换机类型、绑定规则）的变化，都不会惊动两头的生产者和消费者。
          把这条链路画出来，RabbitMQ 的大部分问题都能在图上定位。
        </p>
      </KeyIdea>

      <h2>面试怎么答</h2>
      <p>
        被问「描述一下 AMQP 模型」，可以这样组织：先点出核心链路
        <strong>Producer → Exchange → Binding → Queue → Consumer</strong>，
        强调生产者只发给 Exchange、不认识 Queue；再补充 Connection 与 Channel 的关系
        （Channel 复用 TCP，省连接开销）；最后提一句 VHost 做逻辑隔离。
        如果能顺手用「订单消息」举个例子走一遍，就比纯背概念高出一截。
      </p>

      <Practice title="声明一套 exchange / queue / binding">
        <p>
          用 pika 在代码里把上面订单例子的拓扑搭出来：先开 Connection 和 Channel，
          再依次声明 Exchange、Queue，并用 routing key 把它们绑起来。
        </p>
        <CodeBlock lang="python" title="declare_topology.py" code={declareCode} />
        <p>也可以用命令行工具 <code>rabbitmqadmin</code> 声明同样一套拓扑，方便快速验证：</p>
        <CodeBlock lang="bash" title="declare_topology.sh" code={cliCode} />
        <p>
          声明完后，去管理台（<code>http://localhost:15672</code>）的 Exchanges 和 Queues 页面，
          能看到这个 exchange 通过 <code>order.created</code> 绑到了那个 queue 上。
        </p>
      </Practice>

      <Summary
        points={[
          'AMQP 的核心角色：Producer、Connection、Channel、Exchange、Binding、Queue、Consumer、VHost。',
          '生产者只把消息发给 Exchange，从不直接发给 Queue，也不认识消费者。',
          'Binding 用 routing key 把 Exchange 和 Queue 绑起来，决定消息往哪个队列投。',
          'Channel 是建立在 Connection 之上的轻量通道，用来复用一条 TCP，避免频繁建连。',
          '完整投递链路：Producer → Exchange → Binding → Queue → Consumer，中间环节变化不影响两头。',
          'VHost 提供逻辑隔离，不同 VHost 的 Exchange 与 Queue 互不可见，常用于隔离业务或环境。',
        ]}
      />
    </>
  )
}

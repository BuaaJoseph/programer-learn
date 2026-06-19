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

const channelCode = `# Channel 不是线程安全的：每个线程开自己的 Channel，但共享一个 Connection
import pika, threading

conn = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost'))   # 整个进程一个连接

def worker(i):
    ch = conn.channel()          # 每个线程独立 Channel
    ch.basic_publish(exchange='order.exchange',
                     routing_key='order.created',
                     body=f'msg from thread {i}')

# 反例：多个线程共用同一个 ch，会导致帧交错、协议错乱
# for i in range(8): threading.Thread(target=lambda: shared_ch.publish(...)).start()`

const defaultExCode = `# 「直接发给队列」其实是发给了默认交换机（""空名字）
# RabbitMQ 自动把每个队列用「队列名」当 routing key 绑到默认交换机上
ch.queue_declare(queue='task.queue', durable=True)

# 下面这行看起来是「发给队列」，本质是：发给默认交换机，routing_key=队列名
ch.basic_publish(exchange='',                  # 空字符串 = 默认交换机
                 routing_key='task.queue',     # 等于目标队列名
                 body='hello')`

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
      <p>
        要补一个高频踩坑点：<strong>Channel 不是线程安全的</strong>。多个线程共用一个 Channel 发消息，
        会导致 AMQP 帧（frame）在 TCP 上交错，引发协议错乱甚至连接被服务端关闭。正确做法是
        「连接复用、信道隔离」：进程级共享 Connection，线程级各自持有 Channel。
      </p>
      <CodeBlock lang="python" title="连接复用、信道隔离" code={channelCode} />
      <p>
        另外，AMQP 帧分四种：method 帧（命令，如 declare/publish）、header 帧（消息属性，如 delivery_mode）、
        body 帧（消息体，可拆多帧）、heartbeat 帧（心跳保活）。理解这点有助于排查「连接莫名断开」——
        往往是心跳超时（默认 60 秒）或长事务阻塞了心跳帧。
      </p>

      <h3>「发给队列」的真相：默认交换机</h3>
      <p>
        既然生产者只能发给 Exchange，那入门教程里「直接发给队列」是怎么回事？答案是：你用了
        <strong>默认交换机</strong>（名字为空字符串 <code>{'""'}</code> 的 direct 交换机）。
        RabbitMQ 会自动把每个队列用「队列名作为 routing key」绑到这个默认交换机上，所以
        <code>{'basic_publish(exchange="", routing_key="队列名")'}</code> 看起来像直接投队列，实则仍走了交换机。
      </p>
      <CodeBlock lang="python" title="默认交换机的把戏" code={defaultExCode} />

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

      <h2>路由不到队列怎么办：消息会丢吗</h2>
      <p>
        一个重要的边界情况：如果消息发给交换机后，<strong>没有任何队列能匹配</strong>（比如 routing key 写错、
        队列还没声明），这条消息会怎样？默认会被<strong>静默丢弃</strong>——这是新手最常踩的「消息凭空消失」之坑。
        有两种兜底手段：
      </p>
      <ul>
        <li>
          <strong>mandatory + Return 回调</strong>：发布时设 <code>mandatory=True</code>，路由失败的消息会被退回给生产者的
          Return 监听器，你能感知到。
        </li>
        <li>
          <strong>Alternate Exchange（备用交换机）</strong>：给交换机配一个 AE，路由不到的消息自动转投到备用交换机，
          再由它兜底到一个「未路由队列」做事后排查。
        </li>
      </ul>
      <p>这两点在后续「可靠性」章节会展开，这里先建立「路由不到默认会丢」的警觉。</p>

      <h2>面试怎么答</h2>
      <p>
        被问「描述一下 AMQP 模型」，可以这样组织：先点出核心链路
        <strong>Producer → Exchange → Binding → Queue → Consumer</strong>，
        强调生产者只发给 Exchange、不认识 Queue；再补充 Connection 与 Channel 的关系
        （Channel 复用 TCP，省连接开销，但非线程安全）；最后提一句 VHost 做逻辑隔离。
        如果能顺手用「订单消息」举个例子走一遍，就比纯背概念高出一截。
      </p>
      <Callout variant="info" title="高频追问与误区">
        <ul>
          <li>
            <strong>追问：Connection 和 Channel 各开多少合适？</strong> 经验值：每个进程 1～2 个 Connection，
            Channel 按线程数或并发任务数开，但不宜过多（每个 Channel 有内存与状态开销，几十到上百量级为宜）。
          </li>
          <li>
            <strong>追问：交换机和队列声明是幂等的吗？</strong> 是。重复声明同名同参数的交换机/队列不会报错；
            但如果参数不同（如 durable 不一致），会抛 <code>PRECONDITION_FAILED</code> 并关闭 Channel。
          </li>
          <li>
            <strong>误区：以为一个交换机只能绑一个队列。</strong> 一个交换机可绑多个队列，一个队列也可被多个交换机绑，
            是多对多关系。
          </li>
          <li>
            <strong>误区：把 VHost 当物理隔离。</strong> VHost 只是逻辑命名空间，同一 Broker 内共享 CPU、内存、磁盘，
            一个 VHost 把资源吃满会影响其他 VHost。
          </li>
        </ul>
      </Callout>

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
          再做个实验：故意把 routing key 改成一个没绑过的值发一条，观察队列计数纹丝不动——
          这条消息就被静默丢弃了，正好印证上面「路由不到默认会丢」的结论。
        </p>
      </Practice>

      <Summary
        points={[
          'AMQP 的核心角色：Producer、Connection、Channel、Exchange、Binding、Queue、Consumer、VHost。',
          '生产者只把消息发给 Exchange，从不直接发给 Queue，也不认识消费者；「发给队列」其实是发给默认交换机。',
          'Binding 用 routing key 把 Exchange 和 Queue 绑起来，决定消息往哪个队列投，是多对多关系。',
          'Channel 是建立在 Connection 之上的轻量通道，复用一条 TCP；但 Channel 非线程安全，每线程独立持有。',
          '完整投递链路：Producer → Exchange → Binding → Queue → Consumer，中间环节变化不影响两头。',
          '路由不到任何队列的消息默认被静默丢弃，可用 mandatory+Return 或备用交换机兜底。',
          'VHost 提供逻辑隔离，不同 VHost 的 Exchange 与 Queue 互不可见，但物理资源仍共享。',
        ]}
      />
    </>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const archSnippet = `RabbitMQ 的核心数据流（注意：生产者不直接发给队列！）：

  Producer --> Exchange --(binding + routing key)--> Queue --> Consumer
                  交换机        绑定规则路由            队列

  - Exchange 收到消息，按"绑定规则"决定把消息投到哪些 Queue
  - Queue 存消息，等消费者来取
  - Connection（TCP 连接）里复用多个 Channel（轻量信道）做收发`

const exchangeSnippet = `四种交换机类型，决定"消息如何路由到队列"：

  direct ：routing key 完全相等才匹配（精确路由）
           routing key = "order.pay" -> 绑定 key 也必须是 "order.pay"

  topic  ：routing key 支持通配符（模式路由）
           * 匹配一个单词， # 匹配零或多个单词
           绑定 "order.#" 可收到 order.pay / order.create.vip ...

  fanout ：忽略 routing key，广播给所有绑定的队列（最快）

  headers：不看 routing key，按消息 headers 的键值匹配（少用）`

const workQueueSnippet = `// 工作队列模式：多个消费者竞争消费同一队列（分摊任务）
channel.basicQos(1);   // prefetch=1，公平分发，谁闲谁拿
channel.basicConsume("task_queue", false, (tag, msg) -> {
    doWork(msg);
    channel.basicAck(msg.getEnvelope().getDeliveryTag(), false);
});

// 发布订阅模式：fanout 交换机广播给多个队列，各队列各自的消费者
channel.exchangeDeclare("logs", "fanout");
channel.queueBind(queue1, "logs", "");  // routing key 被忽略
channel.queueBind(queue2, "logs", "");`

export default function Ch1() {
  return (
    <article>
      <Lead>
        RabbitMQ 是基于 <strong>AMQP 协议</strong>的老牌消息中间件，以<strong>灵活的路由能力</strong>著称。
        和 Kafka「一个 Topic 多分区」的简单粗暴不同，RabbitMQ 在生产者和队列之间插了一个<strong>交换机（Exchange）</strong>层，
        靠交换机 + 绑定规则把消息精准地分发到各个队列。这一章讲透它的架构、AMQP 协议与核心角色、
        四种交换机与路由策略、工作模式、虚拟主机，以及 routing key / binding key 的长度限制等细节。
      </Lead>

      <h2>一、RabbitMQ 是什么、用在哪</h2>
      <p>
        RabbitMQ 是用 Erlang 编写、实现 AMQP 0-9-1 协议的消息代理。Erlang 天生擅长高并发与分布式，
        让 RabbitMQ 在<strong>低延迟、复杂路由、灵活的投递控制</strong>上很有优势。
        它特别适合<strong>业务解耦、异步任务、需要复杂路由分发</strong>的场景，比如订单事件按类型分发给不同处理方、
        任务分发给工作池、需要按规则灵活路由的通知系统。它不像 Kafka 那样追求极致吞吐，但在「单条消息的灵活处理」上更细腻。
      </p>

      <h2>二、基本架构与核心组件</h2>
      <p>
        RabbitMQ 最反直觉、也最关键的一点：<strong>生产者不直接把消息发给队列，而是发给交换机</strong>，
        由交换机根据绑定规则决定投到哪些队列。
      </p>
      <CodeBlock lang="text" title="RabbitMQ 核心数据流：经交换机路由到队列" code={archSnippet} />
      <table>
        <thead>
          <tr><th>组件</th><th>作用</th></tr>
        </thead>
        <tbody>
          <tr><td>Producer / Consumer</td><td>生产者发消息、消费者收消息。</td></tr>
          <tr><td>Exchange 交换机</td><td>接收生产者消息，按类型与绑定规则路由到队列。消息进入 MQ 的入口。</td></tr>
          <tr><td>Queue 队列</td><td>存储消息，等待消费者拉取/接收。</td></tr>
          <tr><td>Binding 绑定</td><td>交换机与队列之间的「路由规则」，含 binding key。</td></tr>
          <tr><td>Routing Key</td><td>生产者发消息时附带的「路由标签」，交换机据它匹配绑定。</td></tr>
          <tr><td>Connection / Channel</td><td>Connection 是 TCP 连接；Channel 是连接上复用的轻量信道，真正的收发在 Channel 上做。</td></tr>
          <tr><td>VHost 虚拟主机</td><td>逻辑隔离单元，相当于 MQ 里的「命名空间」。</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        记住 RabbitMQ 的投递链路：<strong>生产者 → 交换机 →（按 routing key 匹配 binding）→ 队列 → 消费者</strong>。
        交换机只负责「路由决策」，不存消息；队列才存消息。这一层交换机正是 RabbitMQ 灵活路由的来源。
      </KeyIdea>

      <h2>三、AMQP 协议与主要角色</h2>
      <p>
        AMQP（Advanced Message Queuing Protocol）是一个<strong>应用层的消息协议标准</strong>，
        RabbitMQ 是它最主流的实现。AMQP 定义了上面这套「Exchange / Queue / Binding / Routing Key」的模型，
        以及消息的发布、确认、消费等交互。理解 AMQP 模型，就理解了 RabbitMQ 的设计骨架。
      </p>
      <p>AMQP 里的主要角色概念，除了上表，还要补充：</p>
      <ul>
        <li><strong>Broker</strong>：RabbitMQ 服务端实例本身。</li>
        <li><strong>Message</strong>：消息体（body）+ 属性（properties，如持久化标记、优先级、过期时间）。</li>
        <li><strong>Channel（信道）</strong>：AMQP 在一条 TCP 连接上多路复用多个信道，避免频繁建连的开销。
          多线程下应<strong>每个线程用独立信道</strong>，信道非线程安全。</li>
      </ul>

      <h2>四、四种交换机类型与工作方式</h2>
      <p>
        交换机类型决定了「消息怎么路由到队列」，这是 RabbitMQ 最核心的考点。
      </p>
      <CodeBlock lang="text" title="四种交换机类型的路由规则" code={exchangeSnippet} />
      <table>
        <thead>
          <tr><th>类型</th><th>路由方式</th><th>典型用途</th></tr>
        </thead>
        <tbody>
          <tr><td>direct 直连</td><td>routing key 与 binding key 完全相等</td><td>精确分发：按 key 投给指定队列</td></tr>
          <tr><td>topic 主题</td><td>routing key 按通配符匹配（<code>*</code> 一个词，<code>#</code> 零或多个词）</td><td>模式分发：按层级标签灵活路由</td></tr>
          <tr><td>fanout 扇出</td><td>忽略 routing key，广播给所有绑定队列</td><td>发布订阅、广播通知</td></tr>
          <tr><td>headers 头</td><td>按消息 headers 键值匹配，不看 routing key</td><td>复杂条件匹配（较少用）</td></tr>
        </tbody>
      </table>

      <h2>五、工作模式</h2>
      <p>
        RabbitMQ 官方教程归纳了几种经典工作模式，本质都是上面组件的组合：
      </p>
      <ul>
        <li><strong>简单队列</strong>：一个生产者 → 一个队列 → 一个消费者。</li>
        <li><strong>工作队列（Work Queue）</strong>：一个队列多个消费者竞争消费，分摊任务（点对点）。</li>
        <li><strong>发布订阅（Publish/Subscribe）</strong>：fanout 交换机广播到多个队列，每队列各自消费。</li>
        <li><strong>路由（Routing）</strong>：direct 交换机按 routing key 精确分发到不同队列。</li>
        <li><strong>主题（Topic）</strong>：topic 交换机按通配符模式灵活路由。</li>
        <li><strong>RPC</strong>：用回调队列 + correlationId 实现请求-响应式调用。</li>
      </ul>
      <CodeBlock lang="java" title="工作队列与发布订阅的代码形态" code={workQueueSnippet} />

      <h2>六、消息路由与策略</h2>
      <p>
        路由的核心是<strong>routing key（消息携带）与 binding key（绑定时设置）的匹配</strong>。
        交换机收到消息后，拿消息的 routing key，按交换机类型的规则去和各条 binding 的 binding key 比对，
        匹配上的队列就收到消息的副本。一条消息可能匹配多个队列（投多份），也可能一个都不匹配（无法路由）。
      </p>
      <Example title="topic 通配符路由实例">
        <p>
          队列 A 绑定 <code>order.#</code>，队列 B 绑定 <code>*.pay</code>。
        </p>
        <p>
          消息 routing key = <code>order.pay</code>：A 匹配（order 开头）、B 也匹配（pay 结尾），<strong>两个队列都收到</strong>。
          routing key = <code>order.create.vip</code>：A 匹配（# 匹配多词），B 不匹配（* 只一词且要 pay 结尾）。
        </p>
      </Example>

      <h2>七、虚拟主机 VHost</h2>
      <p>
        <strong>VHost（虚拟主机）</strong>是 RabbitMQ 的<strong>逻辑隔离单元</strong>，类似数据库里的「database」。
        每个 VHost 有自己独立的交换机、队列、绑定和权限，互不可见。不同业务/团队/环境可以用不同 VHost 隔离，
        共用一个 RabbitMQ 实例却互不干扰。默认 VHost 是 <code>/</code>。连接时需指定要进入哪个 VHost。
      </p>

      <h2>八、routing key 与 binding key 的长度限制</h2>
      <p>
        这是个偏细节但会被问到的点：AMQP 规定 routing key 和 binding key 的<strong>最大长度为 255 字节</strong>。
        超过会报错。实践中 routing key 远用不到这么长，但答得出这个具体数字能体现对协议细节的掌握。
      </p>
      <Callout variant="note" title="binding key 与 routing key 的区别">
        别搞混：<strong>binding key 是「绑定队列到交换机时」设置的规则</strong>（静态，由消费侧/配置定义）；
        <strong>routing key 是「生产者发消息时」附带的标签</strong>（动态，每条消息可不同）。
        交换机做的就是拿 routing key 去匹配各条 binding key。两者上限都是 255 字节。
      </Callout>

      <h2>九、面试精讲</h2>

      <h3>Q1：RabbitMQ 的消息是怎么从生产者到达消费者的？</h3>
      <p>
        <strong>原创讲解。</strong>这题最容易答错的点是——<strong>生产者并不直接发给队列</strong>。完整链路是：
        生产者把消息（带 routing key）发给<strong>交换机</strong> → 交换机按自身类型规则，拿 routing key 去匹配各条 binding 的 binding key
        → 匹配上的<strong>队列</strong>收到消息副本 → 消费者从队列拉取/被推送消费。
      </p>
      <p>
        强调「交换机只做路由、不存消息，队列才存消息」是关键。这层交换机正是 RabbitMQ 比 Kafka 路由更灵活的根源。
      </p>
      <p>
        <strong>面试追问：</strong>「一条消息能进多个队列吗？」——能。只要多个队列的 binding 都匹配上 routing key（如 fanout 广播、
        或 topic 下多个通配规则同时命中），消息会被复制投递到每个匹配队列。
      </p>

      <h3>Q2：四种交换机有什么区别？分别用在什么场景？</h3>
      <p>
        <strong>原创讲解。</strong>按「路由依据」来记最清楚：
      </p>
      <ul>
        <li><strong>direct</strong>：routing key <strong>完全相等</strong>才路由，用于精确分发（如按事件类型投不同队列）。</li>
        <li><strong>topic</strong>：routing key <strong>通配符匹配</strong>（<code>*</code> 一词、<code>#</code> 多词），用于按层级标签灵活路由，最常用。</li>
        <li><strong>fanout</strong>：<strong>忽略 routing key 直接广播</strong>给所有绑定队列，用于发布订阅，最快。</li>
        <li><strong>headers</strong>：按消息 <strong>headers 键值</strong>匹配，不看 routing key，灵活但少用、性能略差。</li>
      </ul>
      <p>
        <strong>面试追问：</strong>「topic 的 <code>*</code> 和 <code>#</code> 区别？」——<code>*</code> 精确匹配<strong>一个</strong>单词，
        <code>#</code> 匹配<strong>零个或多个</strong>单词（单词以 <code>.</code> 分隔）。所以 <code>#</code> 能匹配任意 key，<code>*</code> 只匹配特定词数的 key。
      </p>

      <h3>Q3：Connection 和 Channel 是什么关系？为什么要有 Channel？</h3>
      <p>
        <strong>原创讲解。</strong>Connection 是客户端与 Broker 之间的一条 <strong>TCP 长连接</strong>，建立成本高（三次握手、认证）。
        如果每个线程都开一条 TCP 连接，连接数会爆炸。Channel（信道）是<strong>在一条 Connection 上多路复用的虚拟连接</strong>，
        创建几乎零成本，真正的发布、消费、声明都在 Channel 上进行。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Connection</th><th>Channel</th></tr>
        </thead>
        <tbody>
          <tr><td>本质</td><td>TCP 连接</td><td>连接内的逻辑信道</td></tr>
          <tr><td>创建成本</td><td>高</td><td>极低</td></tr>
          <tr><td>线程安全</td><td>可共享</td><td>非线程安全，每线程独占</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「能多线程共用一个 Channel 吗？」——不建议，Channel 非线程安全，
        多线程并发用同一 Channel 会导致协议错乱。正确做法是<strong>每个线程用自己的 Channel</strong>，共享 Connection 即可。
      </p>

      <Summary
        points={[
          'RabbitMQ 是基于 AMQP、用 Erlang 写的老牌 MQ，以灵活路由见长，适合业务解耦、异步任务、复杂路由分发。',
          '核心链路：生产者→交换机→(routing key 匹配 binding)→队列→消费者；交换机只路由不存消息，队列才存消息。',
          '四种交换机：direct（key 完全相等）、topic（通配符 * 一词/# 多词）、fanout（忽略 key 广播）、headers（按 headers 匹配）。',
          '工作模式：简单队列、工作队列（竞争消费）、发布订阅(fanout)、路由(direct)、主题(topic)、RPC；都是组件组合。',
          'VHost 是逻辑隔离命名空间，各自独立的交换机/队列/权限；Connection 是 TCP 连接，Channel 是其上复用的轻量信道（非线程安全，每线程独占）。',
          'routing key（生产者发消息携带，动态）与 binding key（绑定时设置，静态）由交换机匹配，二者最大长度均为 255 字节。',
        ]}
      />
    </article>
  )
}

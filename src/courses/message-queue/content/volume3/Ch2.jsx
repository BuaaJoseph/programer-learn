import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const persistSnippet = `// 消息不丢的三道关：持久化要"三件齐全"
// 1. 交换机持久化
channel.exchangeDeclare("ex", "direct", true /* durable */);
// 2. 队列持久化
channel.queueDeclare("q", true /* durable */, false, false, null);
// 3. 消息持久化
AMQP.BasicProperties props = MessageProperties.PERSISTENT_TEXT_PLAIN;
channel.basicPublish("ex", "key", props, body);
// 三者都持久化，Broker 重启后消息才还在`

const confirmSnippet = `// 生产端：publisher confirm（确认消息到达 Broker）
channel.confirmSelect();
channel.basicPublish(ex, key, props, body);
if (!channel.waitForConfirms(5000)) {
    // Broker 未确认，重发或落兜底表
}

// 消费端：手动 ack（确认消息处理完成）
channel.basicConsume("q", false /* autoAck=false */, (tag, msg) -> {
    try {
        handle(msg);
        channel.basicAck(msg.getEnvelope().getDeliveryTag(), false);
    } catch (Exception e) {
        // 处理失败：nack 并决定是否重回队列
        channel.basicNack(msg.getEnvelope().getDeliveryTag(), false, false);
    }
});`

const dlxSnippet = `// 死信队列（DLX）：给队列配死信交换机，转移"坏消息"
Map<String,Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "dlx.exchange");   // 死信去哪个交换机
args.put("x-dead-letter-routing-key", "dead");        // 死信用什么 routing key
args.put("x-message-ttl", 60000);                     // 消息 60s 不消费即过期成死信
channel.queueDeclare("biz.queue", true, false, false, args);

// 消息变成死信的三种情况：
//  1) 被 nack/reject 且 requeue=false
//  2) 消息 TTL 过期
//  3) 队列达到最大长度，被挤出`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章讲了 RabbitMQ 的路由骨架，这一章解决<strong>生产可靠性</strong>的一系列问题：
        如何确保消息不丢、持久化机制、确认机制与 prefetch、TTL 过期、死信队列与延迟队列、
        镜像队列与集群、重复消费与顺序性、事务机制，以及无法路由的消息去哪。
        这些是 RabbitMQ 实战与面试的密集考点，本章逐个拆解。
      </Lead>

      <h2>一、如何确保消息不丢失</h2>
      <p>
        和通用篇一致，RabbitMQ 也要堵住生产、存储、消费三段，对应它特有的三个机制：
      </p>
      <ol>
        <li><strong>生产端</strong>：<strong>publisher confirm</strong>（发布确认）——Broker 收到并落地后回 ack，否则重发。</li>
        <li><strong>存储端</strong>：<strong>持久化</strong>——交换机、队列、消息三者都要持久化，Broker 重启后消息才在。</li>
        <li><strong>消费端</strong>：<strong>手动 ack</strong>——处理成功才 ack，失败 nack；关闭 autoAck 避免「拿到就算消费」。</li>
      </ol>

      <h2>二、消息持久化：持久化 vs 非持久化队列</h2>
      <p>
        持久化要<strong>三件齐全</strong>才有效：交换机 durable、队列 durable、消息 persistent。缺一就有丢失风险——
        比如队列没持久化，Broker 重启后队列本身就没了，里面的消息自然全丢。
      </p>
      <CodeBlock lang="java" title="持久化三件齐全：交换机+队列+消息" code={persistSnippet} />
      <table>
        <thead>
          <tr><th>维度</th><th>持久化队列</th><th>非持久化队列</th></tr>
        </thead>
        <tbody>
          <tr><td>Broker 重启</td><td>队列与持久化消息还在</td><td>队列消失，消息全丢</td></tr>
          <tr><td>性能</td><td>较低（要写盘）</td><td>较高（纯内存）</td></tr>
          <tr><td>适用</td><td>不能丢的业务消息</td><td>可丢的临时/缓存类消息</td></tr>
        </tbody>
      </table>
      <Callout variant="warn" title="持久化也不是 100% 不丢">
        消息持久化是「写到磁盘」，但写盘有短暂的内存缓冲窗口，极端情况下（刚收到还没落盘就宕机）仍可能丢极少量。
        要更强保证需配合 publisher confirm（Broker 确认时才算落地）+ 镜像/仲裁队列（多副本）。
      </Callout>

      <h2>三、确认机制与 prefetch</h2>
      <p>
        <strong>确认机制</strong>分两端：生产端的 <strong>publisher confirm</strong>（消息到没到 Broker）和消费端的 <strong>ack/nack</strong>（消息处理完没）。
        消费端关闭 autoAck、手动 ack 是不丢消息的关键。
      </p>
      <CodeBlock lang="java" title="生产端 confirm 与消费端手动 ack" code={confirmSnippet} />
      <p>
        <strong>prefetch（预取数）</strong>通过 <code>basicQos(n)</code> 设置：限制一个消费者<strong>最多有多少条未 ack 的消息</strong>。
        它是推模式下的流控阀门——prefetch=1 时一条没 ack 就不再推下一条，实现「能者多劳」的公平分发，避免快消费者被压垮、慢消费者堆积。
      </p>

      <h2>四、TTL 过期</h2>
      <p>
        <strong>TTL（Time-To-Live）</strong>给消息设过期时间，可设在<strong>队列级</strong>（队列里所有消息统一 TTL）或<strong>消息级</strong>（单条消息的 expiration）。
        到期未被消费的消息会被丢弃，或——如果配了死信交换机——<strong>转为死信</strong>。这正是实现延迟队列的基础。
      </p>

      <h2>五、死信队列 DLX 与死信交换机</h2>
      <p>
        消息在以下三种情况会变成<strong>死信（Dead Letter）</strong>：① 被 nack/reject 且不重回队列；② TTL 过期；③ 队列满被挤出。
        给队列配上 <code>x-dead-letter-exchange</code>，死信就会被转投到指定的<strong>死信交换机（DLX）</strong>，
        再路由到死信队列由专门的消费者处理（告警、人工介入、重试）。
      </p>
      <CodeBlock lang="java" title="配置死信交换机 DLX 与触发死信的三种情况" code={dlxSnippet} />

      <h2>六、延迟队列 / 延迟消息</h2>
      <p>
        RabbitMQ 本身没有原生延迟消息，但有两种实现：
      </p>
      <ul>
        <li><strong>TTL + DLX</strong>：把消息发到一个「设了 TTL、没有消费者」的队列，到期后变死信被转到 DLX，再路由到真正的处理队列——
          消息就「延迟」了 TTL 那么久才被处理。这是经典做法。</li>
        <li><strong>延迟交换机插件</strong>：安装 <code>rabbitmq_delayed_message_exchange</code> 插件，
          用一种 <code>x-delayed-message</code> 类型的交换机，发消息时指定延迟毫秒数，更直接，且支持每条不同延迟。</li>
      </ul>
      <Example title="用 TTL + DLX 做订单超时取消">
        <p>
          下单时发一条 TTL=30 分钟的消息到「延迟队列」（无消费者）。30 分钟后若订单仍未支付，
          这条消息过期成死信，经 DLX 转到「订单取消队列」，消费者收到后检查订单状态并取消。
          这就用 MQ 实现了「延迟 30 分钟自动取消」的定时任务。
        </p>
      </Example>

      <h2>七、未确认消息处理、镜像队列与集群</h2>
      <p>
        <strong>未确认消息（unacked）</strong>：消费者拿到但还没 ack 的消息处于 unacked 状态。如果消费者断开连接（且未 ack），
        这些消息会<strong>重新回到队列</strong>，投给其他消费者——保证不丢，但要注意这会带来重复消费。
      </p>
      <p>
        <strong>集群模式</strong>：RabbitMQ 集群默认<strong>只同步元数据</strong>（交换机、队列定义、绑定），
        而队列的<strong>消息数据默认只在创建它的那个节点上</strong>。所以普通集群下某节点挂了，它上面队列的消息就不可用。
      </p>
      <p>
        <strong>镜像队列（Mirrored Queue）</strong>：为解决上述问题，镜像队列把队列内容<strong>复制到多个节点</strong>，
        一主多从，主挂了从顶上，消息不丢。它是 RabbitMQ 经典的高可用方案（新版推荐用更现代的<strong>仲裁队列 Quorum Queue</strong>，基于 Raft，一致性更强）。
      </p>
      <Callout variant="note" title="镜像队列的代价">
        镜像队列要把消息复制到多个节点，<strong>写入吞吐下降、网络开销增加</strong>。它用性能换可用性，
        要根据业务对「丢消息的容忍度」来决定是否开启、镜像几份。
      </Callout>

      <h2>八、重复消费、顺序性、事务机制</h2>
      <p>
        <strong>重复消费</strong>：RabbitMQ 是至少一次语义，未 ack 重回队列、网络重传都会导致重复，解法仍是<strong>消费端幂等</strong>（唯一键去重）。
      </p>
      <p>
        <strong>顺序性</strong>：单队列单消费者天然有序；一旦多消费者竞争消费同一队列，或消息被 nack 重回队列，顺序就乱了。
        要保序需<strong>单队列 + 单消费者 + 不开并发</strong>，代价是吞吐受限。
      </p>
      <p>
        <strong>事务机制</strong>：RabbitMQ 支持 AMQP 事务（<code>txSelect</code> / <code>txCommit</code> / <code>txRollback</code>），
        但它是<strong>同步阻塞</strong>的，性能很差（吞吐下降可达 90%）。实践中几乎不用事务，而用<strong>性能好得多的 publisher confirm</strong>来保证生产可靠。
      </p>

      <h2>九、无法路由的消息去哪</h2>
      <p>
        如果交换机收到消息却<strong>没有任何队列的 binding 匹配</strong>，这条消息默认会被<strong>直接丢弃</strong>。
        想救回来有两招：① 发送时设 <code>mandatory=true</code>，无法路由的消息会通过 <code>basic.return</code> 回退给生产者，可感知并处理；
        ② 给交换机配<strong>备用交换机（Alternate Exchange）</strong>，无法路由的消息自动转投到备用交换机的兜底队列。
      </p>

      <h2>十、面试精讲</h2>

      <h3>Q1：RabbitMQ 如何保证消息不丢失？</h3>
      <p>
        <strong>原创讲解。</strong>三段式，对应 RabbitMQ 的具体机制：
      </p>
      <ul>
        <li><strong>生产端</strong>：开 <strong>publisher confirm</strong>，Broker 确认收到才算成功，没确认就重发/落兜底表。</li>
        <li><strong>存储端</strong>：<strong>持久化三件齐全</strong>（交换机 durable + 队列 durable + 消息 persistent），并辅以镜像/仲裁队列做多副本。</li>
        <li><strong>消费端</strong>：关闭 autoAck，<strong>处理成功后手动 ack</strong>，失败 nack 决定是否重回。</li>
      </ul>
      <p>
        <strong>易错点。</strong>很多人只说「消息持久化」就完事，漏掉「交换机和队列也要持久化」——队列没持久化，重启后队列没了消息全丢；
        也漏掉「持久化仍有落盘窗口，要配 confirm 兜底」。
      </p>
      <p>
        <strong>面试追问：</strong>「为什么不用事务保证可靠？」——AMQP 事务同步阻塞、性能极差，
        publisher confirm 是异步的、吞吐高得多，效果又能满足「确保到达 Broker」，所以生产可靠用 confirm 不用事务。
      </p>

      <h3>Q2：死信队列是什么？延迟队列怎么用它实现？</h3>
      <p>
        <strong>原创讲解。</strong>死信是「无法被正常消费的消息」，触发条件有三：被 nack/reject 且不重回、TTL 过期、队列满被挤出。
        给队列配 <code>x-dead-letter-exchange</code>，死信会被转到死信交换机（DLX），再路由到死信队列专门处理。
      </p>
      <p>
        <strong>延迟队列</strong>正是「TTL + DLX」的巧妙组合：把消息投进一个<strong>设了 TTL、且没有消费者</strong>的队列，
        消息必然在 TTL 后过期成死信，经 DLX 转到真正的处理队列——于是消息「延迟」了 TTL 时长才被消费。
        订单超时取消、定时提醒都靠它。也可用延迟交换机插件更直接地实现。
      </p>
      <p>
        <strong>面试追问：</strong>「TTL+DLX 实现延迟有什么坑？」——队列级 TTL 下消息<strong>按入队顺序过期</strong>，
        若前一条 TTL 长、后一条 TTL 短，后一条也得等前一条过期才被检查（队头阻塞），所以不同延迟时长建议用消息级 TTL 或延迟插件。
      </p>

      <h3>Q3：RabbitMQ 集群和镜像队列有什么区别？</h3>
      <p>
        <strong>原创讲解。</strong>这是高可用的核心区分点：
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>普通集群</th><th>镜像队列 / 仲裁队列</th></tr>
        </thead>
        <tbody>
          <tr><td>同步内容</td><td>只同步元数据（交换机/队列定义/绑定）</td><td>同步元数据 + 队列消息数据</td></tr>
          <tr><td>消息位置</td><td>只在创建它的节点</td><td>复制到多个节点</td></tr>
          <tr><td>节点宕机</td><td>该节点队列的消息不可用</td><td>从节点顶上，消息不丢</td></tr>
          <tr><td>代价</td><td>无额外复制开销</td><td>写吞吐下降、网络开销增加</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「镜像队列和仲裁队列怎么选？」——镜像队列是老方案、最终一致、脑裂处理较弱；
        仲裁队列（Quorum Queue）基于 Raft、一致性更强、是新版推荐。新项目优先仲裁队列。
      </p>

      <Summary
        points={[
          '不丢消息三段：生产端 publisher confirm、存储端持久化三件齐全（交换机+队列+消息 durable/persistent）+多副本、消费端手动 ack。',
          '持久化队列重启后消息还在但性能低；非持久化纯内存重启全丢；持久化仍有落盘窗口，需配 confirm 兜底。',
          '确认机制：生产端 confirm、消费端手动 ack/nack；prefetch（basicQos）限制未 ack 消息数，是推模式的流控与公平分发阀门。',
          '死信由 nack 不重回/TTL 过期/队列满触发，经 DLX 转死信队列；延迟队列用「TTL+无消费者队列+DLX」实现，注意队列级 TTL 的队头阻塞。',
          '普通集群只同步元数据、消息在创建节点；镜像队列/仲裁队列复制消息到多节点做高可用（用性能换可用），新版推荐基于 Raft 的仲裁队列。',
          '至少一次会重复（消费端幂等去重）；保序需单队列单消费者；事务同步阻塞性能差几乎不用；无法路由的消息默认丢弃，可用 mandatory 回退或备用交换机兜底。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const p2pSnippet = `点对点（Point-to-Point）模型：
   Producer ---> [ Queue ] ---> Consumer A
                              \\-> Consumer B
   一条消息只会被一个消费者拿走（竞争消费）。
   多个消费者 = 分担负载，每人处理一部分，消息不重复。`

const pubsubSnippet = `发布-订阅（Publish-Subscribe）模型：
                       /--> Subscriber A（积分服务）
   Publisher --> Topic --> Subscriber B（短信服务）
                       \\--> Subscriber C（风控服务）
   一条消息被所有订阅者各收到一份（广播）。`

const pushPullSnippet = `// 推模式（Push）：Broker 主动把消息推给消费者
//   消费者注册一个回调，消息一到 Broker 就调用
consumer.onMessage(msg -> {
    handle(msg);   // Broker 决定何时、推多少，消费者被动接
});

// 拉模式（Pull）：消费者主动向 Broker 要消息
while (running) {
    List<Message> batch = consumer.poll(timeout);  // 消费者决定何时、拉多少
    for (Message m : batch) handle(m);
    consumer.commit();   // 处理完再提交位点
}`

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们建立了「消息队列是什么、为什么需要它」的直觉。这一章把基础概念做扎实：
        消息队列有哪两种经典模型、贯穿全课的核心术语各指什么，以及一个看似细节却频繁被问的设计抉择——
        <strong>消息到底应该由 Broker「推」给消费者，还是由消费者主动「拉」？</strong>
        把这些搞清楚，后面讲 Kafka、RabbitMQ、RocketMQ 时你就能一眼看出它们各自在这些维度上的取舍。
      </Lead>

      <h2>一、两种经典消息模型</h2>
      <p>
        消息队列在历史上形成了两种基础模型：<strong>点对点（P2P）</strong> 和 <strong>发布-订阅（Pub/Sub）</strong>。
        理解它们的差异是理解一切 MQ 的起点。
      </p>

      <h3>点对点模型：一条消息只被消费一次</h3>
      <p>
        点对点模型围绕<strong>队列（Queue）</strong>展开：生产者把消息发到队列，多个消费者可以同时监听同一个队列，
        但<strong>每条消息只会被其中一个消费者取走</strong>。多个消费者之间是「竞争关系」，目的是分担负载——
        消息总量被均摊，每个消费者处理一部分，不会重复。
      </p>
      <CodeBlock lang="text" title="点对点：竞争消费，消息不重复" code={p2pSnippet} />

      <h3>发布-订阅模型：一条消息被所有订阅者各收一份</h3>
      <p>
        发布-订阅模型围绕<strong>主题（Topic）</strong>展开：发布者把消息发到主题，所有订阅了该主题的订阅者
        <strong>各自收到一份完整的消息</strong>。这是「广播」语义，目的是让同一条事件触发多方各自的处理逻辑——
        上一章「下单事件被积分、短信、风控同时订阅」就是典型。
      </p>
      <CodeBlock lang="text" title="发布订阅：广播，每个订阅者各收一份" code={pubsubSnippet} />

      <KeyIdea>
        点对点 = 竞争消费（一条消息只被一个消费者处理，用于负载分担）；
        发布订阅 = 广播（一条消息被所有订阅者各处理一遍，用于事件多方响应）。
        现代 MQ（Kafka、RocketMQ）用<strong>「Topic + 消费组」</strong>把两种模型统一了：
        同一消费组内是点对点（组内分摊），不同消费组之间是发布订阅（组间各收一份）。
      </KeyIdea>

      <Example title="消费组如何统一两种模型">
        <p>一个 Topic「order.created」，有两个消费组：</p>
        <p>
          <strong>积分组</strong>（3 个实例）和 <strong>风控组</strong>（2 个实例）。
          一条订单消息会被积分组「拿一次」、风控组「拿一次」——组间是广播（发布订阅）；
          但在积分组内部，这条消息只会落到 3 个实例中的某一个——组内是竞争（点对点）。
          于是「事件要被几方处理」和「每一方内部如何分摊负载」这两个维度被干净地拆开了。
        </p>
      </Example>

      <h2>二、核心术语对照表</h2>
      <p>
        不同 MQ 叫法略有差异，但概念是相通的。先建立一张统一的术语地图，后面各章会反复用到。
      </p>
      <table>
        <thead>
          <tr><th>术语</th><th>含义</th></tr>
        </thead>
        <tbody>
          <tr><td>Producer 生产者</td><td>产生并发送消息的一方。</td></tr>
          <tr><td>Consumer 消费者</td><td>接收并处理消息的一方。</td></tr>
          <tr><td>Broker</td><td>消息中间件的服务端节点，负责接收、存储、投递消息。</td></tr>
          <tr><td>Topic 主题</td><td>消息的逻辑分类，生产者发到某 Topic，消费者订阅某 Topic。</td></tr>
          <tr><td>Queue 队列</td><td>消息的实际存放单元；RocketMQ/Kafka 里一个 Topic 由多个队列/分区组成。</td></tr>
          <tr><td>Partition 分区</td><td>Kafka 里 Topic 的物理分片，是并行与有序的基本单位。</td></tr>
          <tr><td>Consumer Group 消费组</td><td>一组协作消费同一 Topic 的消费者；组内分摊、组间广播。</td></tr>
          <tr><td>Offset 位点</td><td>消费者在分区里「消费到哪了」的进度标记。</td></tr>
          <tr><td>ACK 确认</td><td>消费者告诉 Broker「这条我处理好了」，Broker 才认为可以推进 / 删除。</td></tr>
        </tbody>
      </table>

      <h2>三、推模式 vs 拉模式</h2>
      <p>
        消息从 Broker 到达消费者，有两条路：<strong>推（Push）</strong>——Broker 主动把消息推给消费者；
        <strong>拉（Pull）</strong>——消费者主动向 Broker 索要消息。这是 MQ 设计里一个根本抉择。
      </p>
      <CodeBlock lang="java" title="推模式 vs 拉模式的编程形态" code={pushPullSnippet} />

      <h3>推模式的优缺点</h3>
      <p>
        推模式下，消息一到 Broker 就尽快推给消费者，<strong>实时性好、延迟低</strong>，消费者代码也简单（注册个回调即可）。
        但它的致命弱点是<strong>不知道消费者的处理能力</strong>：如果 Broker 推得比消费者处理得快，消息就在消费者侧堆积，
        甚至把消费者内存撑爆。要解决就得引入复杂的<strong>流控 / 反压</strong>机制让消费者反向告知「我还能吃多少」。
      </p>

      <h3>拉模式的优缺点</h3>
      <p>
        拉模式把节奏交给消费者：<strong>消费者按自己的能力决定何时拉、拉多少</strong>，天然不会被压垮，
        还方便批量拉取（一次拉一批，提高吞吐）。代价是<strong>实时性稍差</strong>——没消息时消费者频繁空轮询既浪费资源、又增加延迟。
        现代 MQ（如 Kafka、RocketMQ）用<strong>长轮询（long polling）</strong>来弥补：消费者发起拉取后，
        若暂时没消息，Broker 把请求<strong>挂起一小段时间</strong>，期间一旦有消息立刻返回，既避免空轮询又保住了实时性。
      </p>

      <table>
        <thead>
          <tr><th>维度</th><th>推模式 Push</th><th>拉模式 Pull</th></tr>
        </thead>
        <tbody>
          <tr><td>谁控制节奏</td><td>Broker</td><td>Consumer</td></tr>
          <tr><td>实时性</td><td>好（消息即推）</td><td>稍差（靠长轮询弥补）</td></tr>
          <tr><td>消费者过载风险</td><td>高（可能被推爆，需流控）</td><td>低（按能力拉，天然反压）</td></tr>
          <tr><td>批量消费</td><td>不便</td><td>方便（一次拉一批）</td></tr>
          <tr><td>空轮询消耗</td><td>无</td><td>有（长轮询缓解）</td></tr>
          <tr><td>代表</td><td>RabbitMQ（默认推，带 prefetch 限流）</td><td>Kafka、RocketMQ（拉 + 长轮询）</td></tr>
        </tbody>
      </table>

      <Callout variant="note" title="主流 MQ 的选择">
        Kafka 与 RocketMQ 都选择<strong>拉模式 + 长轮询</strong>，因为它们面向高吞吐、堆积可控；
        RabbitMQ 默认是<strong>推模式</strong>，但用 <code>prefetch</code>（一次最多预取多少未确认消息）来限流，
        本质上是给推模式加了个「消费者能吃多少」的阀门，思想上向拉模式的反压靠拢。
      </Callout>

      <h2>四、面试精讲</h2>

      <h3>Q1：点对点和发布订阅的区别？现代 MQ 怎么用一套机制同时支持两者？</h3>
      <p>
        <strong>原创讲解。</strong>区别一句话：<strong>点对点是「一条消息一个消费者」的竞争消费，发布订阅是「一条消息所有订阅者各一份」的广播</strong>。
        前者用于负载分担，后者用于事件多方响应。
      </p>
      <p>
        关键的进阶答法是<strong>消费组</strong>：Kafka/RocketMQ 不再做两套模型，而是统一成「Topic + Consumer Group」。
        规则是——<strong>同一分区的一条消息，在一个消费组内只会被一个消费者消费（组内点对点），
        但每个消费组都会独立消费一遍（组间发布订阅）</strong>。
        想要广播，就让每个消费者用<strong>不同的消费组</strong>；想要负载分担，就让它们用<strong>同一个消费组</strong>。
        一个机制，两种语义，由消费组的配置切换。
      </p>
      <p>
        <strong>易错点。</strong>有人答「发布订阅消息会被消费多次所以更耗资源」——不准确，广播是「不同订阅方各处理一次」，
        是业务需要，不是浪费。也别把「消费组内多个实例」误说成会重复消费，恰恰相反，组内是不重复的。
      </p>

      <h3>Q2：消息队列应该设计成推还是拉？说说你的取舍</h3>
      <p>
        <strong>原创讲解。</strong>没有绝对答案，取决于优化目标。我会这样回答：
      </p>
      <ul>
        <li><strong>若追求低延迟、消费者处理能力强且稳定</strong>，推模式更直接，消息一到就送达。</li>
        <li><strong>若追求高吞吐、要批量消费、且要防止消费者被压垮</strong>，拉模式更稳——消费者按自己的节奏拉，天然有反压。</li>
        <li>拉模式的实时性短板可用<strong>长轮询</strong >补上：没消息时 Broker 把拉请求挂起等一会儿，有消息立即返回，既不空转又低延迟。</li>
      </ul>
      <p>
        所以主流高吞吐 MQ（Kafka、RocketMQ）选了<strong>拉 + 长轮询</strong>这个折中方案，
        既要拉模式的反压与批量优势，又要逼近推模式的实时性。RabbitMQ 走推模式，但用 prefetch 给它装了限流阀门。
      </p>
      <p>
        <strong>面试追问：</strong>「纯推模式怎么防止把消费者压垮？」——靠流控/反压：消费者把自身负载或「还能接收多少」反馈给 Broker，
        Broker 据此控制推送速率；RabbitMQ 的 prefetch（未 ack 的消息数上限）就是这个思路的简化实现。
      </p>

      <h3>Q3：Offset（位点）是什么？为什么 Kafka 把它交给消费者而不是 Broker 维护？</h3>
      <p>
        <strong>原创讲解。</strong>Offset 是消费者在某个分区里「读到第几条了」的进度数字。
        在传统 MQ（如 RabbitMQ）里，消息被确认后就从队列删除，Broker 维护「谁消费了什么」；
        而 Kafka 把消息当作<strong>不可变的日志</strong>顺序追加，消费不删除消息，只移动一个 Offset 游标。
      </p>
      <p>把进度交给消费者（提交到 <code>__consumer_offsets</code>）有几个好处：</p>
      <ul>
        <li><strong>多消费组互不干扰</strong>：同一份日志，不同组各自维护自己的 Offset，想从头重放只需把 Offset 重置到 0。</li>
        <li><strong>Broker 极简</strong>：Broker 不用为每条消息记录「谁消费过」，只管顺序存日志，这是 Kafka 高吞吐的前提之一。</li>
        <li><strong>支持回溯消费</strong>：因为消息不因消费而删除，随时能把 Offset 往回拨重新消费历史数据。</li>
      </ul>
      <p>
        <strong>面试追问：</strong>「那 Offset 什么时候提交？提交早了和晚了各有什么风险？」——提交早了（拉到就提交、还没处理完就崩）会丢消息（at-most-once）；
        提交晚了（处理完才提交、提交前崩）会重复消费（at-least-once）。这正是下一卷「不丢与幂等」要解决的核心矛盾。
      </p>

      <h3>Q4：一个消费组里消费者数量和分区数是什么关系？设多了会怎样？</h3>
      <p>
        <strong>原创讲解。</strong>核心规则一句话：<strong>同一消费组内，一个分区在同一时刻只能被一个消费者消费</strong>。
        由此推出消费者数与分区数的关系：
      </p>
      <table>
        <thead>
          <tr><th>消费者数 vs 分区数</th><th>结果</th></tr>
        </thead>
        <tbody>
          <tr><td>消费者数 &lt; 分区数</td><td>有的消费者分到多个分区，负载不均但都在干活。</td></tr>
          <tr><td>消费者数 = 分区数</td><td>一对一，并行度拉满，最理想。</td></tr>
          <tr><td>消费者数 &gt; 分区数</td><td>多出来的消费者<strong>分不到分区、空闲</strong>，纯属浪费。</td></tr>
        </tbody>
      </table>
      <p>
        所以「想提高消费并行度」不能无脑加消费者，<strong>并行度的上限是分区数</strong>，要先加分区。这也是上一卷讲堆积泄洪时
        「消费者超过分区数无效」的原因。
      </p>
      <p>
        <strong>面试追问：</strong>「那为什么不一开始就设很多分区？」——分区不是越多越好：分区越多，文件句柄、元数据、
        副本同步、leader 选举的开销越大，过多分区反而拖累集群、增大故障恢复时间。应按预期峰值并行度合理预留，而非堆砌。
      </p>

      <Summary
        points={[
          '两种经典模型：点对点（队列，竞争消费，一条消息一个消费者，用于负载分担）与发布订阅（主题，广播，每个订阅者各一份，用于事件多方响应）。',
          '现代 MQ 用「Topic + 消费组」统一两者：组内点对点分摊、组间发布订阅广播，靠消费组配置切换语义。',
          '核心术语：Producer/Consumer/Broker/Topic/Queue/Partition/Consumer Group/Offset/ACK，是贯穿全课的地图。',
          '推模式实时性好但易压垮消费者需流控；拉模式按消费者能力拉取、天然反压、便于批量，但实时性靠长轮询弥补。',
          'Kafka/RocketMQ 选「拉 + 长轮询」兼顾吞吐反压与实时性；RabbitMQ 默认推但用 prefetch 限流。',
          'Offset 是消费进度游标，Kafka 把它交给消费者维护，使消息日志不可变、多消费组互不干扰、可回溯重放，也是高吞吐的前提。',
        ]}
      />
    </article>
  )
}

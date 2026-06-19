import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const checklistCode = `# 「按需求选 MQ」决策清单（从上往下问）

1. 要复杂路由 / 灵活分发？（topic、fanout、按 header 路由）
   → RabbitMQ（exchange 模型最灵活）

2. 是海量日志 / 埋点 / 大数据流，要超高吞吐 + 长期回溯？
   → Kafka（分区 + 顺序写盘 + 消费位移可重置）

3. 是电商 / 金融，要事务消息、严格顺序、海量堆积 + 国内生态？
   → RocketMQ（事务消息、顺序消息、削峰能力强）

4. 团队已有技术栈 / 运维经验？
   → 优先沿用，别为了「更优」徒增运维成本

# 经验法则：
#   业务解耦、削峰、RPC 异步化   -> RabbitMQ
#   日志收集、流处理、数据管道   -> Kafka
#   订单交易、事务一致、大规模   -> RocketMQ`

const pullPushCode = `# 推 vs 拉：决定了堆积能力和消费节奏的差异

# RabbitMQ：push 模型，broker 主动把消息推给消费者
#   靠 prefetch 做背压，消费者本地缓冲，堆积压力在 broker 内存
ch.basic_qos(prefetch_count=50)
ch.basic_consume(queue='q', on_message_callback=cb, auto_ack=False)

# Kafka / RocketMQ：pull 模型，消费者按自己节奏主动拉
#   消息顺序落盘、靠 offset 记录消费位置，可重置 offset 回溯重放
#   伪代码：
#   while True:
#       records = consumer.poll(timeout=1000)   # 主动拉一批
#       handle(records)
#       consumer.commit()                       # 提交 offset`

const txnCode = `# RocketMQ 事务消息（半消息 + 回查）解决「本地事务 + 发消息」的一致性
# RabbitMQ 没有原生事务消息，要靠「本地消息表」自己实现类似效果

# 本地消息表方案（RabbitMQ 常用替代）：
# 1) 同一个数据库事务里：写业务数据 + 写一条「待发送消息」记录
# 2) 事务提交后，由定时任务/CDC 扫描待发送记录并投递到 MQ
# 3) 收到 confirm 后把消息记录标记为已发送
# 关键：业务和「消息待发」在同一本地事务，保证不会出现
#       「业务成功但消息没发」或「消息发了但业务回滚」`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          「消息队列选哪个」几乎是后端面试必问。RabbitMQ、Kafka、RocketMQ 三者都能收发消息，
          但设计目标差别很大：选错了，要么吞吐撑不住，要么路由做不灵活，要么白白背上运维负担。
          这一章按几个核心维度横向对比，再给一套<strong>按需求对号入座</strong>的选型方法。
        </p>
      </Lead>

      <h2>先记住一句话定位</h2>
      <p>
        三者最粗的画像是：<strong>RabbitMQ 是「灵活的邮局」</strong>（路由花样多、延迟低），
        <strong>Kafka 是「高速的流水账」</strong>（顺序写盘、吞吐怪兽、可回溯），
        <strong>RocketMQ 是「为电商金融定制的物流系统」</strong>（事务消息、顺序消息、堆积能力强）。
        记住这个定位，再看维度对比就不会乱。
      </p>

      <h2>一图看懂：架构本质差异</h2>
      <p>
        差异的根子在<strong>存储与投递模型</strong>不同。RabbitMQ 是「队列 + push」：消息在队列里，broker 主动推给消费者，
        消费完即删；Kafka/RocketMQ 是「日志 + pull」：消息顺序追加写到磁盘日志，消费者按自己的 offset 主动拉，
        消费完不删、可回溯重放。这一条差异几乎能推导出后面所有维度的结论：
      </p>
      <CodeBlock lang="python" title="push vs pull 模型" code={pullPushCode} />
      <p>
        正因为 RabbitMQ 消费完即删、消息优先驻留内存，它<strong>延迟低但不擅长堆积</strong>；
        而 Kafka 顺序写盘、按 offset 拉取，它<strong>吞吐高、可回溯但单条延迟略高</strong>。
        记住「push+队列 vs pull+日志」这条主线，比死记硬背维度表强得多。
      </p>

      <h2>逐维度对比</h2>

      <h3>吞吐量</h3>
      <ul>
        <li><strong>Kafka &gt; RocketMQ &gt; RabbitMQ</strong>。</li>
        <li>
          Kafka 靠分区（partition）水平扩展 + 顺序写磁盘 + 零拷贝，单机几十万到百万级 TPS；
          RocketMQ 量级接近 Kafka；RabbitMQ 受 Erlang 进程模型与路由开销限制，通常万级到几万 TPS。
        </li>
      </ul>

      <h3>延迟</h3>
      <ul>
        <li><strong>RabbitMQ 最低</strong>（微秒到毫秒级），适合对实时性敏感的场景。</li>
        <li>Kafka 为了攒批提升吞吐，单条延迟略高；RocketMQ 居中。</li>
      </ul>

      <h3>消息模型与路由</h3>
      <ul>
        <li>
          <strong>RabbitMQ 最灵活</strong>：基于 AMQP 的 <em>exchange</em> 模型，支持 direct / topic / fanout / headers
          多种路由，能按 routing key、通配符、header 灵活分发，做复杂业务路由得心应手。
        </li>
        <li>
          Kafka 是 <strong>topic + partition</strong> 的简单模型，路由能力弱，消费靠消费者组分摊分区；
          RocketMQ 类似，topic + queue + tag 过滤，路由比 Kafka 略丰富但远不及 RabbitMQ。
        </li>
      </ul>

      <h3>堆积能力</h3>
      <ul>
        <li>
          <strong>Kafka / RocketMQ 强</strong>：消息直接顺序落盘，天生为海量堆积设计，存几天几 TB 也不慌，还能按位移回溯重放。
        </li>
        <li>
          <strong>RabbitMQ 弱</strong>：消息优先驻留内存，堆积多了触发 flow control、性能骤降，不适合长期囤积大量消息。
          （lazy queue 能缓解，但仍不是它的强项。）
        </li>
      </ul>

      <h3>顺序与事务消息</h3>
      <ul>
        <li>
          <strong>RocketMQ 最强</strong>：原生支持<strong>事务消息</strong>（两阶段 + 回查，保证本地事务与发消息的最终一致）
          和<strong>严格顺序消息</strong>，这是它在电商金融场景的杀手锏。
        </li>
        <li>
          Kafka 在<strong>单分区内</strong>保证顺序，有事务 API 但偏流处理语义；RabbitMQ 单队列单消费者下才有序，原生不支持事务消息。
        </li>
      </ul>
      <p>
        RabbitMQ 没有事务消息，但工程上可用「<strong>本地消息表</strong>」补齐这个能力，思路是把「写业务」和「记一条待发消息」
        放进同一个本地事务，再异步投递：
      </p>
      <CodeBlock lang="python" title="本地消息表补齐事务一致性" code={txnCode} />

      <h3>消息回溯与重放</h3>
      <ul>
        <li>
          <strong>Kafka / RocketMQ 支持</strong>：消息消费后不删，按 offset 保存，可以把消费位置重置到过去任意点重新消费，
          做数据回放、问题复现、新消费者全量初始化都很方便。
        </li>
        <li>
          <strong>RabbitMQ 不支持</strong>：消息一旦被 ack 就从队列删除，无法回溯。要重放只能靠业务侧自己存档重发。
        </li>
      </ul>

      <h3>生态与运维</h3>
      <ul>
        <li>
          Kafka 大数据生态最完整（Flink、Spark、Connect 等），社区成熟；RocketMQ 国内生态好、阿里背书、文档中文友好；
          RabbitMQ 老牌稳定、管理界面好用、客户端语言全。
        </li>
        <li>
          运维上：RabbitMQ 单机部署简单但集群高可用要花心思（见上一章）；Kafka 早期依赖 ZooKeeper（新版用 KRaft）、调优门槛较高；
          RocketMQ 组件（NameServer、Broker）清晰但需要一定运维投入。
        </li>
      </ul>

      <h2>一张总表</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>RabbitMQ</th><th>Kafka</th><th>RocketMQ</th></tr>
        </thead>
        <tbody>
          <tr><td>吞吐</td><td>万级</td><td>百万级</td><td>十万级</td></tr>
          <tr><td>延迟</td><td>最低</td><td>较高</td><td>居中</td></tr>
          <tr><td>路由</td><td>最灵活（exchange）</td><td>弱（topic/partition）</td><td>中（tag 过滤）</td></tr>
          <tr><td>堆积/回溯</td><td>弱，不可回溯</td><td>强，可回溯</td><td>强，可回溯</td></tr>
          <tr><td>事务/顺序</td><td>弱（需自实现）</td><td>分区内有序</td><td>最强（事务消息）</td></tr>
          <tr><td>模型</td><td>队列 + push</td><td>日志 + pull</td><td>日志 + pull</td></tr>
        </tbody>
      </table>

      <Example title="三个典型场景分别选谁">
        <ul>
          <li>
            <strong>日志收集 / 埋点管道</strong>：每秒百万条、要长期保存供离线分析和回溯重放 →
            <strong>选 Kafka</strong>。高吞吐 + 顺序落盘 + 位移回放正中下怀，路由简单也无所谓。
          </li>
          <li>
            <strong>订单系统业务解耦</strong>：下单后要通知库存、积分、短信等多个下游，路由复杂、延迟敏感、量不算极大 →
            <strong>选 RabbitMQ</strong>。exchange 灵活分发、低延迟，正合适。
          </li>
          <li>
            <strong>大数据实时计算管道</strong>：要对接 Flink 做实时数仓、流量巨大 →
            <strong>选 Kafka</strong>，它是流处理生态的事实标准。
          </li>
          <li>
            <strong>电商交易 / 资金链路</strong>：要保证「扣款」和「发消息」的事务一致、订单状态严格有序、还要扛大促堆积 →
            <strong>选 RocketMQ</strong>，事务消息与顺序消息是它的主场。
          </li>
        </ul>
      </Example>

      <KeyIdea title="选型的本质是「匹配主要矛盾」">
        <p>
          没有「最好的 MQ」，只有「最匹配你主要矛盾的 MQ」。先问自己：我最在意的是
          <strong>路由灵活、还是吞吐堆积、还是事务顺序</strong>？把这个主要矛盾找准，
          再叠加团队已有技术栈和运维能力做权衡，答案基本就出来了。盲目追新或追性能，往往得不偿失。
        </p>
      </KeyIdea>

      <Callout variant="tip" title="面试加分点">
        <p>
          除了背维度对比，能说出「为什么」更显功力：Kafka 吞吐高是因为
          <strong>分区并行 + 顺序写盘 + 零拷贝 + 批量</strong>；RabbitMQ 延迟低、路由强是因为
          <strong>AMQP exchange 模型 + 内存优先 + push</strong>；RocketMQ 事务消息强是因为
          <strong>半消息 + 事务回查</strong>机制。把原理串起来，比单纯报结论强得多。
        </p>
      </Callout>

      <Callout variant="info" title="常见误区">
        <ul>
          <li>
            <strong>误区：以为 Kafka 一定比 RabbitMQ「先进、该全用 Kafka」。</strong> 复杂路由、低延迟、量不大的业务场景，
            RabbitMQ 反而更省心；Kafka 的高吞吐在这些场景用不上，还得忍受它弱路由和较高延迟。
          </li>
          <li>
            <strong>误区：把 exactly-once 当成选型决定因素。</strong> 三者端到端都无法真正 exactly-once，
            都靠「at-least-once + 消费端幂等」，这点上没有谁有本质优势。
          </li>
          <li>
            <strong>误区：用消息量「峰值」而非「常态」选型。</strong> 偶发峰值可以靠削峰扛过，按常态 + 合理余量选更经济。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>被问「这三个 MQ 怎么选」，建议这样组织回答：</p>
      <ul>
        <li>先用一句话给三者定位（灵活邮局 / 高速流水账 / 电商物流系统）；</li>
        <li>点出架构本质差异：RabbitMQ 是队列 + push、Kafka/RocketMQ 是日志 + pull，这条推导出后面所有差异；</li>
        <li>再按吞吐、延迟、路由、堆积回溯、顺序事务五个维度快速对比；</li>
        <li>最后落到场景：日志大数据选 Kafka、复杂路由业务解耦选 RabbitMQ、电商金融选 RocketMQ；</li>
        <li>补一句「还要结合团队栈和运维成本」，体现工程权衡意识。</li>
      </ul>

      <Practice title="一套「按需求选 MQ」的决策清单">
        <p>把下面这张清单背熟，遇到选型题从上往下逐条问，就能快速定位：</p>
        <CodeBlock lang="text" title="mq_decision_checklist.txt" code={checklistCode} />
        <p>
          练习：给自己出三道题——「短信验证码下发」「APP 全量行为埋点」「秒杀下单扣库存」，
          用清单各选一个 MQ 并说出理由，对照前面的维度检查是否站得住脚。
          进阶再想一步：如果用 RabbitMQ 也要做到「扣款和发消息一致」，怎么用本地消息表补齐它缺失的事务消息能力？
        </p>
      </Practice>

      <Summary
        points={[
          '一句话定位：RabbitMQ 是灵活邮局（路由强、延迟低），Kafka 是高速流水账（吞吐高、可回溯），RocketMQ 是电商物流系统（事务/顺序/堆积强）。',
          '架构本质：RabbitMQ 是队列+push、消费即删；Kafka/RocketMQ 是日志+pull、按 offset 可回溯——这条推导出几乎所有差异。',
          '吞吐 Kafka > RocketMQ > RabbitMQ；延迟 RabbitMQ 最低；堆积与回溯能力 Kafka/RocketMQ 远强于 RabbitMQ。',
          '路由灵活性 RabbitMQ 凭 exchange 模型最强；顺序与事务消息 RocketMQ 最强（半消息+事务回查），RabbitMQ 可用本地消息表替代。',
          '场景对号入座：日志/大数据选 Kafka，复杂路由/业务解耦/低延迟选 RabbitMQ，电商金融大规模/事务顺序选 RocketMQ。',
          '选型本质是匹配主要矛盾（路由 vs 吞吐堆积 vs 事务顺序），再叠加团队技术栈与运维成本；别盲目追新、别用峰值选型。',
          '面试能讲清「为什么」（Kafka 顺序写盘+零拷贝、RabbitMQ exchange+push、RocketMQ 半消息）比只报结论更出彩。',
        ]}
      />
    </>
  )
}

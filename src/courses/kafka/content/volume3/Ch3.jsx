import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const checklistCode = `选型决策清单（按问题逐条勾选）

1. 主要诉求是什么？
   - 海量数据流 / 日志采集 / 大数据管道  → Kafka
   - 复杂业务路由、削峰解耦、可靠投递    → RabbitMQ
   - 电商 / 金融、要事务消息 / 定时消息    → RocketMQ

2. 吞吐量级？
   - 十万~百万条/秒，要长期堆积+回溯      → Kafka
   - 万级/秒，更看重低延迟与灵活路由       → RabbitMQ

3. 顺序与一致性？
   - 仅需分区内有序                       → Kafka / RocketMQ
   - 需要分布式事务消息                   → RocketMQ

4. 团队与生态？
   - 已有大数据栈（Flink/Spark/Connect）  → Kafka
   - Java 技术栈、阿里系经验               → RocketMQ
   - 多语言、AMQP 标准、运维要简单         → RabbitMQ`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          「为什么选 Kafka 而不是 RabbitMQ / RocketMQ」是架构面试的高频题。
          答好它不是背三者参数，而是说清<strong>各自的设计取向</strong>，再落到「什么场景该选谁」。
          这一章从 Kafka 的视角横向对比，帮你建立一套能现场推导的选型判断。
        </p>
      </Lead>

      <h2>从六个维度横向对比</h2>
      <p>
        三者都是消息中间件，但出身和取向差别很大：Kafka 生于大数据日志管道，RabbitMQ 是经典的 AMQP 消息代理，
        RocketMQ 脱胎于阿里电商的交易场景。下面逐个维度看差异。
      </p>

      <h3>吞吐与延迟</h3>
      <p>
        <strong>Kafka</strong> 靠分区并行 + 顺序写磁盘 + 零拷贝，吞吐是三者里最强的，轻松到几十万甚至百万条每秒，
        但单条延迟相对略高（批量攒一攒再发）。<strong>RabbitMQ</strong> 走内存队列，单条延迟低，但吞吐量级通常在万级，
        消息一旦大量堆积性能下滑明显。<strong>RocketMQ</strong> 介于两者之间，吞吐接近 Kafka、延迟也较低。
      </p>

      <h3>消息模型</h3>
      <p>
        这是最本质的区别。<strong>Kafka</strong> 是<em>分区日志</em>模型：消息按 offset 顺序追加到 partition，
        消费者自己记录读到哪、可以反复重读，模型简单但路由能力弱。<strong>RabbitMQ</strong> 是灵活的 <em>exchange</em> 模型：
        消息先到 exchange，再按 direct / topic / fanout 等规则路由到不同队列，<strong>复杂路由是它的强项</strong>。
        RocketMQ 的模型偏向 Kafka（topic + queue），但加了 tag 过滤等业务友好的能力。
      </p>

      <h3>堆积与回溯</h3>
      <p>
        <strong>Kafka</strong> 消息落盘、按时间或大小保留，天然支持<strong>海量堆积和按 offset / 时间回溯重放</strong>——
        这是数据管道场景的刚需（新上线一个消费者从头重算）。RabbitMQ 的设计假设是「消息尽快被消费掉」，
        大量堆积是异常状态，也不擅长重放。RocketMQ 支持堆积和回溯，能力接近 Kafka。
      </p>

      <h3>顺序与事务消息</h3>
      <p>
        顺序上三者都只能保证「局部有序」（Kafka 是分区内、RocketMQ 是队列内）。
        <strong>事务消息</strong>是 RocketMQ 的招牌：它原生支持「本地事务 + 消息发送」的分布式事务（半消息机制），
        非常贴合订单、支付这类场景。Kafka 有事务但偏向流处理内部的 EOS，不是为业务分布式事务设计的。
      </p>

      <h3>生态</h3>
      <p>
        <strong>Kafka 生态最厚</strong>：<em>Kafka Streams</em> 做流处理、<em>Kafka Connect</em> 做数据集成、
        与 Flink / Spark 等大数据组件深度打通，是事实上的流处理标准底座。RabbitMQ 胜在 AMQP 标准、多语言客户端成熟、上手简单。
        RocketMQ 在阿里系和国内金融、电商场景生态扎实。
      </p>

      <h3>运维成本</h3>
      <p>
        <strong>RabbitMQ</strong> 部署最轻、单机即用，小规模最省心。<strong>Kafka</strong> 早期依赖 ZooKeeper（现已转向 KRaft），
        集群和分区管理有学习曲线，但成熟度高、资料多。RocketMQ 需要部署 NameServer + Broker，运维复杂度居中。
      </p>

      <Example title="三个场景，三种选择">
        <p>用三个典型需求，把「该选谁」推导出来：</p>
        <ul>
          <li>
            <strong>用户行为日志采集，灌进数据仓库做分析</strong>：数据量巨大、要长期堆积和回溯、要接 Flink——
            毫无疑问选 <strong>Kafka</strong>，这正是它的主场。
          </li>
          <li>
            <strong>一个订单事件要同时通知库存、积分、风控等多个下游，路由规则复杂</strong>：吞吐不极端但路由灵活是核心诉求——
            选 <strong>RabbitMQ</strong>，用 topic exchange 把一条消息按规则分发到多个队列最顺手。
          </li>
          <li>
            <strong>电商下单：扣库存和发「下单成功」消息必须保证一致，还要支持 15 分钟未支付自动取消</strong>：
            既要分布式事务消息、又要定时/延时消息——选 <strong>RocketMQ</strong>，这两样都是它的原生能力。
          </li>
        </ul>
      </Example>

      <KeyIdea title="选型不是比谁强，而是比谁更贴场景">
        <p>
          三者没有绝对的优劣，只有适不适合。一句话记法：
          <strong>日志大数据流走 Kafka，复杂路由与业务解耦走 RabbitMQ，电商金融的事务与定时消息走 RocketMQ</strong>。
          面试时先问清场景的核心诉求（吞吐？路由？事务？回溯？），再对症下药，比硬背参数表有说服力得多。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="别被「吞吐量高」带偏">
        <p>
          很多人一上来就说「Kafka 吞吐最高所以选它」，这是典型误区。
          如果你的真实诉求是<strong>复杂路由</strong>，Kafka 简陋的分区模型会让你写一堆 topic 和过滤逻辑去硬凑；
          如果你要的是<strong>分布式事务消息</strong>，Kafka 也给不了 RocketMQ 那样开箱即用的体验。
          脱离场景谈吞吐量，是选型最常踩的坑。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        遇到选型题，先<strong>反问场景</strong>：数据量级多大？要不要回溯重放？路由复杂不复杂？要不要事务/定时消息？团队栈是什么？
        然后用六个维度（吞吐延迟、消息模型、堆积回溯、顺序事务、生态、运维）逐一对照，
        最后给出结论并说明取舍。展现「按需推导」的过程，远比报一串数字更打动面试官。
      </p>

      <Practice title="做一张按需求选 MQ 的决策清单">
        <p>
          把选型逻辑沉淀成一张可复用的决策清单，下次拍板时照着勾选即可：
        </p>
        <CodeBlock lang="text" title="mq-decision-checklist.txt" code={checklistCode} />
        <p>
          试着拿你正在做或熟悉的一个项目套这张清单走一遍，看最终落到哪个 MQ，再回头检查这个选择和你项目里实际用的是否一致——
          如果不一致，想清楚是当初选错了，还是有清单没覆盖的约束（比如公司已有的技术栈惯性）。
        </p>
      </Practice>

      <Summary
        points={[
          '从六维度对比：吞吐延迟、消息模型、堆积回溯、顺序与事务、生态、运维成本。',
          'Kafka 吞吐最强、分区日志模型、天然支持海量堆积与 offset 回溯，是流处理与大数据管道的标准底座。',
          'RabbitMQ 的 exchange 模型路由最灵活、延迟低、部署轻，适合复杂路由与业务解耦。',
          'RocketMQ 原生支持事务消息与定时/延时消息，最贴合电商、金融的交易场景。',
          '一句话选型：日志大数据流→Kafka，复杂路由业务解耦→RabbitMQ，事务/定时消息→RocketMQ。',
          '选型先问场景诉求再按维度推导，别脱离场景只比吞吐量。',
        ]}
      />
    </>
  )
}

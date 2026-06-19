import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const decisionSnippet = `选型决策树（先问业务，再定 MQ）：

  需要每秒百万级吞吐 / 日志流 / 大数据生态对接？
     -> Kafka

  电商/金融业务消息，要事务消息、延迟、顺序、消息轨迹，且要高可靠？
     -> RocketMQ

  消息量不大，但要复杂灵活路由（topic 通配/header）、低延迟、AMQP 协议？
     -> RabbitMQ

  团队已有成熟运维栈 / 公司技术栈倾向？  -> 优先复用，别为新特性硬切`

export default function Ch1() {
  return (
    <article>
      <Lead>
        学完三大主流 MQ 的原理，最后一卷回到工程师最实际的问题：<strong>到底该选哪个？</strong>
        这一章把 Kafka、RocketMQ、RabbitMQ 放进同一张表做多维对比，再给出一套<strong>「先看业务诉求、再定 MQ」</strong>
        的选型决策方法。选型没有标准答案，但有清晰的判断维度——这正是面试官想考的「架构权衡」能力。
      </Lead>

      <h2>一、三大 MQ 的基因差异</h2>
      <p>
        它们诞生于不同的需求土壤，基因决定了各自的长短板。先理解出身，对比才有根。
      </p>
      <ul>
        <li><strong>Kafka</strong>：为<strong>海量日志与流数据</strong>而生（LinkedIn）。一切设计围绕吞吐，是大数据生态（Flink/Spark/数仓）的事实标准管道。</li>
        <li><strong>RocketMQ</strong>：为<strong>电商交易的业务消息</strong>而生（阿里）。在高吞吐基础上叠加事务、延迟、顺序、轨迹等业务刚需特性，金融级可靠。</li>
        <li><strong>RabbitMQ</strong>：为<strong>灵活的企业消息路由</strong>而生（实现 AMQP）。强在路由灵活、低延迟、协议标准，适合中小流量的复杂分发。</li>
      </ul>

      <h2>二、多维对比表</h2>
      <table>
        <thead>
          <tr><th>维度</th><th>Kafka</th><th>RocketMQ</th><th>RabbitMQ</th></tr>
        </thead>
        <tbody>
          <tr><td>吞吐量</td><td>极高（百万级/s）</td><td>高（十万~百万级/s）</td><td>中（万级/s）</td></tr>
          <tr><td>延迟</td><td>毫秒级</td><td>毫秒级</td><td>微秒~毫秒级（最低）</td></tr>
          <tr><td>消息可靠性</td><td>高（副本+ISR）</td><td>很高（金融级）</td><td>高（需正确配置）</td></tr>
          <tr><td>路由灵活性</td><td>弱（Topic+分区）</td><td>中（Topic+Tag+SQL）</td><td>强（四种交换机+通配）</td></tr>
          <tr><td>事务消息</td><td>有（流处理内）</td><td>有（半消息+回查，强项）</td><td>弱（AMQP 事务慢）</td></tr>
          <tr><td>延迟消息</td><td>无原生（需自实现）</td><td>有（级别/任意定时）</td><td>有（TTL+DLX/插件）</td></tr>
          <tr><td>顺序消息</td><td>分区有序</td><td>分区有序（顺序消费 API）</td><td>单队列单消费者</td></tr>
          <tr><td>消息回溯</td><td>强（offset 重置）</td><td>支持（按时间/offset）</td><td>弱（消费即删）</td></tr>
          <tr><td>消息堆积能力</td><td>极强（磁盘日志）</td><td>强（CommitLog）</td><td>弱（堆积影响性能）</td></tr>
          <tr><td>运维复杂度</td><td>中高（新版去 ZK 后简化）</td><td>中</td><td>低~中</td></tr>
          <tr><td>开发语言</td><td>Scala/Java</td><td>Java</td><td>Erlang</td></tr>
          <tr><td>生态</td><td>大数据生态最强</td><td>阿里系/国内电商广</td><td>跨语言、协议标准</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        一句话记忆：<strong>Kafka 拼吞吐与流生态、RocketMQ 拼业务特性与可靠、RabbitMQ 拼路由灵活与低延迟</strong>。
        三者没有绝对优劣，选型的本质是「把业务最看重的那个维度，匹配到最擅长它的 MQ」。
      </KeyIdea>

      <h2>三、关键维度详解</h2>

      <h3>吞吐 vs 延迟</h3>
      <p>
        Kafka 和 RocketMQ 靠批量、顺序写、磁盘日志把<strong>吞吐</strong>拉满，适合海量消息；
        RabbitMQ 不批量、消息处理更精细，单条<strong>延迟最低</strong>，但吞吐上不去。
        要「快速处理海量」选前两者；要「单条尽快送达且量不大」选 RabbitMQ。
      </p>

      <h3>路由灵活性</h3>
      <p>
        这是 RabbitMQ 的独门优势：四种交换机 + 通配符路由 + header 匹配，能做非常复杂的分发逻辑。
        Kafka 只有 Topic + 分区，路由全靠消费端自己过滤；RocketMQ 居中，有 Tag 和 SQL92 过滤。
        <strong>路由需求复杂 → RabbitMQ</strong>。
      </p>

      <h3>消息堆积与回溯</h3>
      <p>
        Kafka/RocketMQ 把消息存为磁盘日志、消费不删除，所以<strong>堆积能力极强、能回溯重放</strong>（重置 offset 从头读）；
        RabbitMQ 消费即删、堆积会拖累性能、几乎不能回溯。<strong>要削峰扛大量堆积、要重放历史 → Kafka/RocketMQ</strong>。
      </p>

      <h2>四、选型决策方法</h2>
      <p>
        别上来就比技术参数，<strong>先问业务三件事</strong>：① 消息量级有多大？② 对可靠性/一致性要求多高？③ 路由和特性（事务/延迟/顺序）需求是什么？再据此匹配。
      </p>
      <CodeBlock lang="text" title="选型决策树" code={decisionSnippet} />

      <Example title="三个典型场景的选型">
        <p>
          <strong>场景一：用户行为日志收集 + 实时数仓</strong>。量极大、要对接 Flink、能容忍最终一致、要回溯。
          → <strong>Kafka</strong>，吞吐与流生态完胜。
        </p>
        <p>
          <strong>场景二：电商下单 → 扣款 → 发消息保证最终一致</strong>。要事务消息、顺序、高可靠、延迟（超时取消）。
          → <strong>RocketMQ</strong>，业务特性齐全。
        </p>
        <p>
          <strong>场景三：内部系统间的通知分发，按多种规则路由给不同处理方，量不大</strong>。要灵活路由、低延迟。
          → <strong>RabbitMQ</strong>，交换机路由灵活。
        </p>
      </Example>

      <Callout variant="note" title="技术之外的选型因素">
        真实选型还要看：<strong>团队熟悉度与运维能力</strong>（已有成熟 Kafka 运维就别为一个特性硬上 RocketMQ）、
        <strong>公司技术栈倾向</strong>（阿里系多用 RocketMQ）、<strong>社区活跃度与商业支持</strong>。
        「最合适」往往不是「参数最强」，而是「团队能驾驭、能长期维护好」的那个。
      </Callout>

      <h2>五、常见误区澄清</h2>
      <p>
        选型讨论里有几个流传很广却不准确的说法，面试时若能主动澄清会显得很有判断力：
      </p>
      <ul>
        <li><strong>「Kafka 会丢消息所以不可靠」</strong>——不准确。Kafka 配 <code>acks=all</code> + 多副本 + 合理 <code>min.insync.replicas</code>
          可达到很高可靠性，早年「丢消息」的印象多源于默认配置或误用，不是设计缺陷。</li>
        <li><strong>「RabbitMQ 性能差」</strong>——片面。它单条延迟最低，只是<strong>吞吐和堆积能力</strong>不如另两者；
          在中小流量的低延迟、灵活路由场景里它反而最合适。</li>
        <li><strong>「RocketMQ 就是国产 Kafka」</strong>——不对。它借鉴了 Kafka 内核，但存储模型（全局 CommitLog）、
          服务发现（NameServer）、业务特性（事务/延迟/轨迹）都做了重做，定位也偏业务消息而非纯流处理。</li>
      </ul>

      <h2>六、面试精讲</h2>

      <h3>Q1：Kafka、RocketMQ、RabbitMQ 怎么选？</h3>
      <p>
        <strong>原创讲解。</strong>不要直接背参数，先亮出<strong>方法论：选型从业务诉求出发，把最看重的维度匹配到最擅长它的 MQ</strong>。
        然后给三句话定位：
      </p>
      <ul>
        <li><strong>Kafka</strong>：超高吞吐、日志/流、大数据生态对接、要回溯——日志与流处理首选。</li>
        <li><strong>RocketMQ</strong>：业务消息、要事务/延迟/顺序/轨迹、金融级可靠——电商交易类首选。</li>
        <li><strong>RabbitMQ</strong>：量不大但路由复杂、要低延迟、AMQP 协议——灵活分发首选。</li>
      </ul>
      <p>
        最后补技术之外的考量（团队熟悉度、技术栈、运维成本），体现成熟。
      </p>
      <p>
        <strong>易错点。</strong>只比「谁吞吐高」是片面的——RabbitMQ 吞吐最低却在「灵活路由 + 低延迟」上无可替代。
        选型是多维权衡，不是单维排名。
      </p>

      <h3>Q2：为什么大数据场景几乎都用 Kafka，而不用 RocketMQ/RabbitMQ？</h3>
      <p>
        <strong>原创讲解。</strong>三个原因：① <strong>吞吐与堆积能力</strong>——大数据是海量数据流，Kafka 的分区并行 + 磁盘日志能扛；
        ② <strong>生态</strong>——Flink、Spark、各类数仓/CDC 工具都把 Kafka 当作标准接入口，连接器最全、最成熟；
        ③ <strong>回溯重放</strong>——大数据常要重算历史，Kafka 消息不删、offset 可重置，天然支持。
        RabbitMQ 吞吐和堆积都顶不住；RocketMQ 虽吞吐够，但大数据生态对接远不如 Kafka 广。
      </p>
      <p>
        <strong>面试追问：</strong>「RocketMQ 能做流处理吗？」——能做基础的，但生态、连接器、社区积累远不及 Kafka，
        所以「流处理 + 大数据」这条赛道事实上是 Kafka 的主场。
      </p>
      <p>
        <strong>再追问：</strong>「Pulsar 这类新 MQ 会取代 Kafka 吗？」——可以坦诚说：Pulsar 的存算分离架构在弹性扩缩、
        多租户上有亮点，但 Kafka 生态太成熟、迁移成本高，短期内难被取代。这类问题答「看场景与生态成熟度，不盲目追新」即可，
        体现技术判断的稳健。
      </p>

      <h3>Q3：消息堆积能力为什么 RabbitMQ 最弱？</h3>
      <p>
        <strong>原创讲解。</strong>根因在<strong>存储模型</strong>：RabbitMQ 的队列设计偏向「消息快进快出」，
        消息主要在内存 + 有限落盘，<strong>大量堆积会把内存吃满、触发流控甚至阻塞生产者</strong>，性能急剧下降；
        而 Kafka/RocketMQ 把消息当作<strong>磁盘上的顺序日志</strong>，堆积只是磁盘多占点空间，对读写性能影响很小。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Kafka/RocketMQ</th><th>RabbitMQ</th></tr>
        </thead>
        <tbody>
          <tr><td>存储</td><td>磁盘顺序日志，消费不删</td><td>内存为主，消费即删</td></tr>
          <tr><td>堆积影响</td><td>仅占磁盘，性能稳</td><td>吃内存、触发流控、降速</td></tr>
          <tr><td>回溯</td><td>支持(offset 重置)</td><td>基本不支持</td></tr>
        </tbody>
      </table>
      <p>
        <strong>面试追问：</strong>「那 RabbitMQ 不适合削峰咯？」——大规模、长时间的削峰确实不适合 RabbitMQ；
        小规模的瞬时缓冲可以，但若预期会大量长期堆积，应选 Kafka/RocketMQ。
      </p>

      <h3>Q4：面试官说「我们公司全用 Kafka」，你还会建议引入 RocketMQ 吗？</h3>
      <p>
        <strong>原创讲解。</strong>这是考<strong>架构成熟度</strong>的题——技术选型不是「谁特性多选谁」，而是要算总账。我会这样答：
      </p>
      <ul>
        <li><strong>默认倾向复用 Kafka</strong>：已有成熟的 Kafka 集群、运维经验、监控告警、踩坑积累，这些是巨大的隐性资产。
          再引入一个 RocketMQ，意味着<strong>两套系统的部署、监控、调优、故障处理、人员学习</strong>成本全部翻倍。</li>
        <li><strong>只在「Kafka 确实补不上的硬需求」出现时才考虑</strong>：比如大量需要<strong>事务消息 + 任意时间延迟消息 + 海量 Topic</strong>
          且用 Kafka 实现代价过高、可靠性存疑——这时引入 RocketMQ 才划算。</li>
        <li><strong>能用 Kafka 现有能力解决就别引第二套</strong>：延迟消息可用 Kafka + 外部调度补；事务可用「本地消息表 + 幂等」绕过，
          很多「特性需求」其实有 Kafka 生态内的替代方案。</li>
      </ul>
      <p>
        <strong>面试追问：</strong>「那什么信号说明真该引入第二套 MQ 了？」——当用现有 MQ 实现某需求的
        <strong>复杂度、可靠性风险或维护成本，已经超过「再维护一套专用 MQ」的成本</strong>时，就是该引入的信号。
        在那之前，「单一技术栈的简单」往往比「多套技术栈的功能齐全」更有价值。
      </p>

      <Callout variant="tip" title="一句话记住三者的「人设」">
        把它们想成三种性格：<strong>Kafka 是「大力士」</strong>——能扛海量、能回溯，适合流与日志的重活；
        <strong>RocketMQ 是「业务管家」</strong>——事务、延迟、顺序、轨迹样样齐全，懂电商交易的规矩；
        <strong>RabbitMQ 是「灵活的快递分拣员」</strong>——量不大但路由花样多、送得快。
        面试被问选型时，先报出这三句人设，再对着业务诉求点名，思路立刻清晰。
      </Callout>

      <Summary
        points={[
          '三者基因：Kafka 为日志流而生拼吞吐与生态，RocketMQ 为电商业务消息而生拼特性与可靠，RabbitMQ 为灵活路由而生拼路由与低延迟。',
          '多维对比关键：吞吐 Kafka>RocketMQ>RabbitMQ；延迟 RabbitMQ 最低；路由灵活 RabbitMQ 最强；事务/延迟/轨迹 RocketMQ 最全；堆积/回溯 Kafka/RocketMQ 强、RabbitMQ 弱。',
          '选型方法：先问业务三件事（量级/可靠性/特性需求），把最看重维度匹配到最擅长的 MQ，而非单比吞吐。',
          '典型对应：日志流+大数据→Kafka；电商交易+事务/延迟/顺序→RocketMQ；量小+复杂路由+低延迟→RabbitMQ。',
          '大数据用 Kafka 因吞吐堆积强、生态连接器最全、支持回溯重放；RabbitMQ 堆积最弱因内存为主、消费即删，不适合大规模长期削峰。',
          '技术之外还要看团队熟悉度、公司技术栈、运维成本——最合适的是团队能长期驾驭的，而非参数最强的。',
        ]}
      />
    </article>
  )
}

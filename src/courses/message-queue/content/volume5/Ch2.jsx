import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Example from '@/components/cards/Example.jsx'
import Summary from '@/components/cards/Summary.jsx'

const tuningSnippet = `三端通用调优清单（以高吞吐 + 可靠为目标）：

【生产端】
  - 批量发送 + 压缩（攒批摊薄开销，压缩降传输量）
  - 合理 acks/确认级别：可靠场景 acks=all / 同步发送
  - 异步发送 + 回调兜底，提升吞吐又不丢
  - 失败重试 + 本地兜底表

【Broker 端】
  - 刷盘策略：可靠用同步刷盘，性能用异步刷盘
  - 复制策略：可靠用同步复制，性能用异步复制
  - 分区/队列数预留余量，匹配消费并行度
  - 监控磁盘、堆积、副本同步状态

【消费端】
  - 关闭自动提交，处理成功后再提交位点
  - 消费幂等（业务唯一键去重）
  - 批量拉取 + 批量处理，慢操作异步化
  - prefetch/拉取量与处理能力匹配，防压垮或空转`

export default function Ch2() {
  return (
    <article>
      <Lead>
        全课的最后一章，先解开一个常被追问的渊源问题——<strong>RocketMQ 与 Kafka 在架构与功能上到底像在哪、不同在哪，
        RocketMQ 为什么参考 Kafka 又走出了自己的路</strong>；再把贯穿全课的可靠性、性能要点收拢成一份
        <strong>三端通用调优与最佳实践清单</strong>，让你既能讲清原理，也能在生产里把 MQ 用对、用稳。
      </Lead>

      <h2>一、RocketMQ 与 Kafka：架构功能对比</h2>
      <p>
        RocketMQ 诞生时确实<strong>大量参考了 Kafka</strong>——阿里早期用过 Kafka，但在电商交易这种<strong>海量 Topic、强业务特性、金融级可靠</strong>
        的场景下遇到瓶颈，于是自研 RocketMQ，保留 Kafka 高吞吐的精髓，针对痛点重做了存储、路由发现和业务特性。
      </p>
      <table>
        <thead>
          <tr><th>维度</th><th>Kafka</th><th>RocketMQ</th></tr>
        </thead>
        <tbody>
          <tr><td>设计目标</td><td>日志/流，极致吞吐</td><td>业务消息，高吞吐 + 丰富特性 + 金融可靠</td></tr>
          <tr><td>服务发现</td><td>早期 ZooKeeper，现 KRaft</td><td>自研 NameServer（无状态、互不通信）</td></tr>
          <tr><td>存储</td><td>每分区独立日志文件</td><td>全局一个 CommitLog + ConsumeQueue 索引</td></tr>
          <tr><td>多 Topic 表现</td><td>Topic/分区多时文件多、写入分散</td><td>写入始终集中顺序，抗海量 Topic</td></tr>
          <tr><td>事务消息</td><td>流处理内的事务</td><td>半消息 + 回查（业务事务，强项）</td></tr>
          <tr><td>延迟消息</td><td>无原生</td><td>原生（级别 / 任意定时）</td></tr>
          <tr><td>消息过滤</td><td>消费端自行过滤</td><td>Tag / SQL92 在 Broker 过滤</td></tr>
          <tr><td>消息轨迹</td><td>需外部方案</td><td>原生支持</td></tr>
          <tr><td>消费模型</td><td>拉 + 消费组</td><td>拉(长轮询) + 集群/广播</td></tr>
        </tbody>
      </table>
      <KeyIdea>
        RocketMQ「参考 Kafka」主要继承了<strong>顺序写日志、页缓存、拉模式 + 长轮询、分区/队列并行</strong>这套高吞吐内核；
        而它「走出自己的路」体现在<strong>自研 NameServer（替代重 ZK）、全局 CommitLog（抗海量 Topic）、
        以及事务/延迟/过滤/轨迹等面向业务的增强</strong>。一句话：<strong>Kafka 是流的内核，RocketMQ 在其上长出了业务的血肉。</strong>
      </KeyIdea>

      <h2>二、RocketMQ 为什么参考 Kafka：三个关键改良</h2>
      <h3>① 用 NameServer 替代 ZooKeeper</h3>
      <p>
        Kafka 早期靠 ZK 做元数据与选举，运维重、扩展受限。RocketMQ 认为消息系统的服务发现没那么复杂，
        自研了无状态、互不通信、AP 取向的 NameServer，简单可靠。<strong>有趣的是 Kafka 后来也走向去 ZK（KRaft），印证了这个判断。</strong>
      </p>
      <h3>② 用全局 CommitLog 解决「多 Topic 写入退化」</h3>
      <p>
        Kafka 每个分区一个文件，<strong>Topic/分区一多，磁盘要在大量文件间切换，顺序写退化为随机写</strong>，性能下降。
        RocketMQ 把所有消息混写一个 CommitLog，无论多少 Topic/队列<strong>磁盘写永远顺序</strong>，特别适合电商「海量 Topic」场景；
        代价是消费要经 ConsumeQueue 间接寻址。
      </p>
      <h3>③ 补齐业务特性</h3>
      <p>
        电商需要事务消息、延迟消息、顺序消息、消息轨迹、Broker 端过滤，这些 Kafka 当年都没有或要自己造，
        RocketMQ 把它们做成<strong>原生能力</strong>，开箱即用。
      </p>

      <h2>三、通用调优与最佳实践</h2>
      <p>
        无论用哪个 MQ，调优都围绕<strong>生产端、Broker、消费端</strong>三处，目标是在「吞吐」「可靠」「延迟」之间按业务取平衡。
      </p>
      <CodeBlock lang="text" title="三端通用调优清单" code={tuningSnippet} />

      <h3>生产端最佳实践</h3>
      <ul>
        <li><strong>批量 + 压缩</strong>：攒批发送摊薄网络与系统调用开销，整批压缩降传输量——提吞吐的第一招。</li>
        <li><strong>确认级别按需</strong>：可靠场景用 acks=all / 同步发送；可丢场景用低确认换吞吐。</li>
        <li><strong>异步 + 兜底</strong>：异步发送提吞吐，回调里处理失败（重试 / 落本地兜底表），绝不静默吞异常。</li>
      </ul>

      <h3>Broker 端最佳实践</h3>
      <ul>
        <li><strong>刷盘与复制权衡</strong>：金融级用同步刷盘 + 同步复制（慢但不丢）；普通用异步（快，有极小丢失窗口）。</li>
        <li><strong>分区/队列数预留</strong>：按峰值消费并行度规划，避免事后频繁加分区破坏顺序。</li>
        <li><strong>监控先行</strong>：磁盘水位、堆积量、副本同步、消费延迟都要有告警，别等出事才发现。</li>
      </ul>

      <h3>消费端最佳实践</h3>
      <ul>
        <li><strong>手动提交 + 幂等</strong>：处理成功才提交位点（不丢），业务唯一键去重（不重）——这是可靠消费的黄金组合。</li>
        <li><strong>批量与异步</strong>：批量拉取、批量处理，慢 SQL/慢 RPC 异步化或加缓存，提升单实例吞吐。</li>
        <li><strong>速率匹配</strong>：拉取量 / prefetch 与处理能力匹配，太大压垮自己、太小空转浪费。</li>
        <li><strong>毒消息隔离</strong>：反复失败的消息踢到死信队列单独处理，别堵住正常消费。</li>
      </ul>

      <Callout variant="tip" title="贯穿全课的两条主线">
        回看整门课，所有 MQ 的设计与调优都在回答两个问题：<strong>「如何更快」</strong>（顺序写、批量、零拷贝、页缓存、并行）
        与<strong>「如何更稳」</strong>（多副本、确认机制、持久化、幂等、重试、死信）。理解这两条主线，
        再遇到任何 MQ 的任何特性，你都能问出「它在为快还是为稳服务、代价是什么」，这才是真正的融会贯通。
      </Callout>

      <h2>四、面试精讲</h2>

      <h3>Q1：RocketMQ 和 Kafka 架构上最大的不同是什么？</h3>
      <p>
        <strong>原创讲解。</strong>抓两个最本质的差异，别罗列一堆：
      </p>
      <ul>
        <li><strong>存储模型</strong>：Kafka 每分区一个独立日志文件；RocketMQ 所有消息混写<strong>一个全局 CommitLog</strong> + ConsumeQueue 逻辑索引。
          这让 RocketMQ 在「海量 Topic」下写入仍保持顺序，不像 Kafka 那样分区一多就退化为随机写。</li>
        <li><strong>服务发现</strong>：Kafka 早期用 ZooKeeper（现 KRaft）；RocketMQ 自研<strong>无状态的 NameServer</strong>，节点互不通信、各持全量路由、AP 取向、运维极简。</li>
      </ul>
      <p>
        再补一句定位差异：Kafka 偏流/日志拼吞吐与生态，RocketMQ 偏业务消息拼事务/延迟/轨迹等特性与金融可靠。
      </p>
      <p>
        <strong>面试追问：</strong>「全局 CommitLog 有什么代价？」——消费要先查 ConsumeQueue 拿到物理偏移，再去 CommitLog 读消息体，
        多一次<strong>间接寻址</strong>；而且 CommitLog 是所有 Topic 共用，单点压力集中，需要靠 mmap、页缓存等优化扛住。
      </p>

      <h3>Q2：RocketMQ 既然参考了 Kafka，为什么不直接用 Kafka？</h3>
      <p>
        <strong>原创讲解。</strong>因为 Kafka 当年在<strong>电商交易场景</strong>下有三个不合适：
      </p>
      <ol>
        <li><strong>海量 Topic 写入退化</strong>：电商业务 Topic 极多，Kafka 每分区一文件，文件一多顺序写退化、性能下滑——RocketMQ 用全局 CommitLog 解决。</li>
        <li><strong>缺业务特性</strong>：事务消息、延迟消息、顺序消费 API、消息轨迹、Broker 端过滤这些电商刚需，当年 Kafka 没有——RocketMQ 做成原生。</li>
        <li><strong>ZK 运维重</strong>：RocketMQ 用轻量 NameServer 替代，更简单可靠。</li>
      </ol>
      <p>
        所以是<strong>「借鉴内核 + 针对性重做」</strong>，不是另起炉灶，也不是照搬。
      </p>
      <p>
        <strong>面试追问：</strong>「现在 Kafka 也支持事务、KRaft 了，RocketMQ 还有优势吗？」——在业务消息的丰富度
        （原生延迟/轨迹/Broker 过滤）、海量 Topic 的写入稳定性、以及国内电商生态的成熟度上，RocketMQ 仍有其位置；
        但两者在很多场景已高度重叠，最终还是回到「业务诉求 + 团队栈」的选型逻辑。
      </p>

      <h3>Q3：给你一个新系统要接 MQ，你的落地步骤是什么？</h3>
      <p>
        <strong>原创讲解。</strong>这是收束全课的综合题，我会给一套有条理的落地流程：
      </p>
      <ol>
        <li><strong>明确诉求</strong>：量级、可靠性/一致性要求、是否要事务/延迟/顺序、路由复杂度——据此选型（上一章方法）。</li>
        <li><strong>保证不丢</strong>：生产端确认 + 重试兜底、Broker 持久化 + 多副本、消费端手动提交。</li>
        <li><strong>处理重复</strong>：消费端做幂等（业务唯一键去重），默认按至少一次设计。</li>
        <li><strong>考虑顺序</strong>：需要则业务键哈希同队列 + 单线程消费；不需要就并发提吞吐。</li>
        <li><strong>防堆积</strong>：分区/队列预留、监控消费延迟告警、备好泄洪扩容预案。</li>
        <li><strong>高可用与可观测</strong>：集群多副本、死信队列兜底、消息轨迹/全链路监控。</li>
      </ol>
      <p>
        这套流程恰好把全课的六卷串了起来：选型(卷五)→不丢/不重/有序/不堆(卷二)→落到具体 MQ 的特性(卷三四)。
        能这样成体系地答，说明你真正掌握了消息队列。
      </p>

      <h3>Q4：MQ 在「快」与「稳」上做的取舍，能举几对具体例子吗？</h3>
      <p>
        <strong>原创讲解。</strong>这是全课的「主线收束题」。我会强调：几乎每个 MQ 参数背后都是一对「快 vs 稳」的旋钮，
        理解这点就不用死记参数。举几对最典型的：
      </p>
      <table>
        <thead>
          <tr><th>旋钮</th><th>偏「快」</th><th>偏「稳」</th></tr>
        </thead>
        <tbody>
          <tr><td>生产确认级别</td><td>acks=0/1、单向发送</td><td>acks=all、同步发送</td></tr>
          <tr><td>刷盘策略</td><td>异步刷盘（攒批，有丢失窗口）</td><td>同步刷盘（每条 fsync）</td></tr>
          <tr><td>复制策略</td><td>异步复制（不等从节点）</td><td>同步复制（等 ISR/从节点）</td></tr>
          <tr><td>位点提交</td><td>自动提交（拉到即提交，可能丢）</td><td>手动提交（处理成功才提交）</td></tr>
          <tr><td>消费方式</td><td>并发消费（多线程，乱序）</td><td>顺序消费（单线程，阻塞重试）</td></tr>
          <tr><td>批量大小</td><td>大批量（高吞吐，延迟高）</td><td>小批量/单条（低延迟，吞吐低）</td></tr>
        </tbody>
      </table>
      <p>
        关键认知：<strong>没有「又快又稳还省」的银弹</strong>，每个选择都在花掉另一头的预算。
        好的工程师不是把所有旋钮都拧到最可靠，而是<strong>按业务对「丢一条消息的代价」与「延迟/吞吐的要求」精准配置</strong>——
        日志类可以偏快、金融类必须偏稳。
      </p>
      <p>
        <strong>面试追问：</strong>「怎么判断某个业务该偏快还是偏稳？」——问一句：<strong>「丢一条消息会怎样？」</strong>
        若是丢一条钱就对不上（支付），坚决偏稳；若是丢一条监控点无伤大雅（埋点日志），可以偏快换吞吐。
        让业务影响来驱动技术配置，而不是凭感觉。
      </p>

      <Callout variant="tip" title="结课寄语：从「会用」到「懂权衡」">
        这门课从「消息队列是什么」一路走到三大 MQ 的内部机制与选型调优。如果只带走一句话，那就是：
        <strong>消息队列的所有复杂度，都源于「异步」这个简单决定带来的连锁后果——解开了时间耦合，就得自己处理不丢、不重、有序、不堆。</strong>
        真正的高手不是背下每个参数，而是看到任何一个 MQ 特性，都能立刻反应出「它在为快还是为稳服务、用什么换什么、代价落在谁头上」。
        带着这套权衡的眼光，无论面对 Kafka、RocketMQ、RabbitMQ 还是未来的新 MQ，你都能快速看懂它、用对它。
      </Callout>

      <Summary
        points={[
          'RocketMQ 借鉴 Kafka 的高吞吐内核（顺序写日志、页缓存、拉+长轮询、并行），又自研 NameServer、全局 CommitLog 并补齐业务特性，走出自己的路。',
          'RocketMQ 不直接用 Kafka 的三个原因：海量 Topic 下 Kafka 每分区一文件写入退化、缺事务/延迟/轨迹等业务特性、ZK 运维重。',
          '架构最大不同：存储（每分区独立文件 vs 全局 CommitLog+逻辑索引）与服务发现（ZK/KRaft vs 无状态 NameServer）。',
          '通用调优三端：生产端批量+压缩+确认+异步兜底；Broker 端刷盘/复制权衡+分区预留+监控；消费端手动提交+幂等+批量异步+速率匹配+毒消息隔离。',
          '全课两条主线：如何更快（顺序写/批量/零拷贝/页缓存/并行）与如何更稳（多副本/确认/持久化/幂等/重试/死信）——遇到任何特性都能问「为快还是为稳、代价是什么」。',
          '接 MQ 落地步骤：明确诉求选型→保证不丢→处理重复→考虑顺序→防堆积→高可用与可观测，恰好串起全课六卷。',
        ]}
      />
    </article>
  )
}

import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'

const listCode = `# 方案一：List 当简单队列
# 生产者从左边推入
LPUSH queue:notify "order:8001"
# 消费者从右边阻塞式弹出，没有消息就等待
BRPOP queue:notify 0
# 缺点：弹出即消失，没有 ACK；处理到一半崩溃，这条消息就丢了`

const pubsubCode = `# 方案二：Pub/Sub 发布订阅（广播）
# 订阅者先订阅频道
SUBSCRIBE channel:notify
# 发布者发消息，所有在线订阅者都能收到
PUBLISH channel:notify "order:8001 paid"
# 缺点：不持久化，订阅者不在线时发的消息直接丢失，无法补收`

const streamCode = `# 方案三：Stream（类 Kafka）
# 追加一条消息（* 表示自动生成消息 ID）
XADD stream:notify * type order id 8001

# 创建消费组（从头开始消费用 0，只收新消息用 $）
XGROUP CREATE stream:notify g1 0

# 消费组里的消费者 c1 读取尚未分配的消息
XREADGROUP GROUP g1 c1 COUNT 10 BLOCK 0 STREAMS stream:notify >

# 处理成功后确认这条消息（按消息 ID 进行 ACK）
XACK stream:notify g1 1718500000000-0`

const pelCode = `# Stream 的待处理与重投：保证「消费到一半崩溃也不丢」
# 查看消费组的待处理消息(PEL)：哪些消息已分配但还没 XACK
XPENDING stream:notify g1
# 详细版：列出每条 PEL 消息的归属消费者、已等待时长、被投递次数
XPENDING stream:notify g1 - + 10

# 把空闲超过 60s 的消息从故障消费者「认领」给 c2 重新处理
XCLAIM stream:notify g1 c2 60000 1718500000000-0

# Redis 6.2+：XAUTOCLAIM 自动批量认领超时消息
XAUTOCLAIM stream:notify g1 c2 60000 0

# 给 Stream 设上限，防止无限膨胀(近似裁剪，性能更好)
XADD stream:notify MAXLEN ~ 100000 * type order id 8002`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          很多场景需要「把任务丢出去、稍后再处理」：下单成功后发短信、推送、更新积分……这些不必卡在主流程里。
          Redis 本身不是专业消息队列，但提供了三种能凑合做异步消息的工具：<em>List</em>、<em>Pub/Sub</em>、
          <em>Stream</em>。它们能力差很多，选错了会丢消息，这正是面试爱考的点。
        </p>
      </Lead>

      <h2>方案一：List 做简单队列</h2>
      <p>
        最朴素的队列：生产者用 <code>LPUSH</code> 从左边塞消息，消费者用 <code>BRPOP</code> 从右边阻塞式取，
        没消息就挂起等待，来了立刻被唤醒。先进先出，实现简单。
        <code>BRPOP</code> 的 <code>0</code> 表示永久阻塞，也可设超时（如 <code>BRPOP queue 5</code> 等 5 秒）。
      </p>
      <Callout variant="warn" title="List 的硬伤">
        <p>
          一是<strong>没有确认机制</strong>：<code>BRPOP</code> 把消息弹出来就从队列删了，消费者处理到一半崩溃，这条消息就<strong>丢了</strong>，无法重投；
          二是<strong>不支持多消费者分组</strong>：一条消息只能被一个消费者抢到，没法像消费组那样既分摊又各自留存进度；
          三是没有历史，消费完即消失，无法回溯。
        </p>
        <p>
          想给 List 加一点可靠性，可以用 <code>BRPOPLPUSH</code>（或 6.2 的 <code>BLMOVE</code>）做<strong>备份队列</strong>：
          取出的同时把消息塞进一个「处理中」队列，处理成功再从处理中队列删除，崩溃后能从处理中队列恢复。
          但这只是打补丁，远不如 Stream 原生支持完善。
        </p>
      </Callout>

      <h2>方案二：Pub/Sub 做广播</h2>
      <p>
        <code>SUBSCRIBE</code> 订阅一个频道，<code>PUBLISH</code> 往频道发消息，所有在线订阅者<strong>同时</strong>收到，
        这是典型的发布订阅广播模型，适合「实时通知所有在线节点」这类场景，比如配置变更广播、本地缓存失效通知。
        还支持 <code>PSUBSCRIBE</code> 按模式（如 <code>news.*</code>）订阅一批频道。
      </p>
      <Callout variant="warn" title="Pub/Sub 的硬伤">
        <p>
          <strong>不持久化</strong>，且是「发完即忘」：消息发出去的那一刻，只有<strong>当时在线</strong>的订阅者能收到，
          订阅者掉线期间发的消息全部丢失，上线后也补不回来。所以它适合可丢失的实时广播，绝不适合要求可靠投递的业务消息。
          另一个坑：如果订阅者消费慢、消息堆积，会占满订阅者的<strong>输出缓冲区</strong>，触发 Redis 强制断开连接（client-output-buffer-limit）。
        </p>
      </Callout>

      <h2>方案三：Stream 像个小 Kafka</h2>
      <p>
        Redis 5.0 引入的 <em>Stream</em> 是专门为消息设计的：消息<strong>持久化</strong>地追加在日志里，每条有唯一递增 ID
        （格式 <code>毫秒时间戳-序号</code>，如 <code>1718500000000-0</code>），
        支持<strong>消费组</strong>（Consumer Group）、<strong>ACK 确认</strong>，还能<strong>回溯</strong>历史消息，能力上最接近 Kafka。
      </p>
      <KeyIdea title="消费组 + ACK + PEL 是关键">
        <p>
          一个消费组里可以有多个消费者，组内消息会被<strong>分摊</strong>给不同消费者（提高吞吐），
          每条消息处理完要 <code>XACK</code> 确认。没确认的消息会留在<strong>待处理列表</strong>（PEL，Pending Entries List）里，
          消费者崩溃重启后能通过 <code>XPENDING</code> 看到、用 <code>XCLAIM</code>/<code>XAUTOCLAIM</code> 重新认领这些没确认的消息继续处理——
          这就是 List 和 Pub/Sub 都做不到的<strong>不丢消息</strong>。每个消费者还各自维护「已读到哪」的位置，互不干扰。
        </p>
      </KeyIdea>
      <p>
        Stream 的两种读法要分清：<code>XREAD</code> 是「无组」读，不记录消费进度、不进 PEL，类似 tail -f；
        <code>XREADGROUP ... STREAMS key &gt;</code> 是「按组」读未分配的新消息，会进 PEL、需要 ACK。
        投递语义是<strong>至少一次</strong>（at-least-once）：崩溃重投可能让同一条消息被处理两次，所以消费端必须做<strong>幂等</strong>。
      </p>

      <Example title="下单后发通知，该选谁">
        <p>
          场景：用户下单成功，需要异步发送「订单已支付」的短信和推送。这条消息<strong>不能丢</strong>，
          短信服务可能临时挂掉、需要重试，还可能有多个发送 worker 分摊压力。
        </p>
        <ul>
          <li><strong>用 Pub/Sub？</strong> 不行——发送服务重启那几秒的消息会丢，用户收不到短信。</li>
          <li><strong>用 List？</strong> 勉强，但 worker 处理到一半崩溃，<code>BRPOP</code> 出来的消息没了，无法重试。</li>
          <li>
            <strong>用 Stream？</strong> 合适——消息持久化，多个 worker 组成消费组分摊，
            处理成功才 <code>XACK</code>，崩溃后未确认的消息能重新消费，保证至少一次投递。
          </li>
        </ul>
        <p>
          一句话结论：可丢的实时广播用 Pub/Sub；极简单又能容忍丢失的内部队列用 List；
          要可靠、要重试、要多消费者的业务消息用 Stream（量大且要求高时，直接上 Kafka/RocketMQ）。
        </p>
      </Example>

      <table>
        <thead>
          <tr><th>能力</th><th>List</th><th>Pub/Sub</th><th>Stream</th></tr>
        </thead>
        <tbody>
          <tr><td>持久化</td><td>是(随RDB/AOF)</td><td>否</td><td>是</td></tr>
          <tr><td>ACK 确认</td><td>无</td><td>无</td><td>有(PEL)</td></tr>
          <tr><td>消费组分摊</td><td>不支持</td><td>不支持</td><td>支持</td></tr>
          <tr><td>历史回溯</td><td>消费即删</td><td>不可</td><td>可按 ID 回溯</td></tr>
          <tr><td>离线补收</td><td>消息留存</td><td>全丢</td><td>可补收</td></tr>
          <tr><td>投递语义</td><td>至多一次</td><td>至多一次</td><td>至少一次</td></tr>
        </tbody>
      </table>

      <h2>面试怎么答</h2>
      <p>
        被问「Redis 能做消息队列吗」，先给三件套对比：List 简单无 ACK、Pub/Sub 广播不持久化、Stream 最完整（消费组 + ACK + PEL + 回溯）。
        再点出 Stream 的至少一次语义要求消费端幂等。最后表态：Redis 消息队列适合<strong>轻量、削峰、内部异步</strong>，
        要严格顺序、超大吞吐、复杂路由还是上专业 MQ（Kafka/RocketMQ）。能讲清「为什么 Pub/Sub 会丢」「PEL 怎么保证不丢」就到位了。
      </p>

      <Practice title="用 Stream 跑一遍生产-消费-确认">
        <p>
          下面这组命令完整演示了 Stream 的核心流程：追加消息、建消费组、按组读取、处理后确认。
        </p>
        <CodeBlock lang="bash" title="Stream：XADD / XREADGROUP / XACK" code={streamCode} />
        <p>再练一遍待处理列表与重投，这是 Stream「不丢消息」的真正机制：</p>
        <CodeBlock lang="bash" title="PEL / XPENDING / XCLAIM / 裁剪" code={pelCode} />
        <p>对照另外两种方案，体会它们缺了什么：</p>
        <CodeBlock lang="bash" title="List 队列" code={listCode} />
        <CodeBlock lang="bash" title="Pub/Sub 广播" code={pubsubCode} />
        <p>
          试试：<code>XADD</code> 几条消息后<strong>不</strong> <code>XACK</code>，再用
          <code>XPENDING stream:notify g1</code> 查看待处理列表，体会「未确认会被记住、可重投」。
        </p>
      </Practice>

      <Summary
        points={[
          'Redis 有三种做异步消息的工具：List、Pub/Sub、Stream，能力差异很大，选错会丢消息。',
          'List：LPUSH + BRPOP 做简单队列，没有 ACK、不支持消费组、消费即消失，崩溃会丢消息(可用 BRPOPLPUSH 打补丁)。',
          'Pub/Sub：发布订阅广播，不持久化、发完即忘，订阅者离线期间的消息全丢，只适合可丢的实时广播。',
          'Stream：类 Kafka，消息持久化、支持消费组分摊、XACK 确认、可回溯，未确认消息进 PEL 可用 XCLAIM 重投。',
          'Stream 是至少一次投递语义，崩溃重投可能重复，消费端必须做幂等。',
          '下单发通知这类不能丢、要重试、要多消费者的业务消息应选 Stream；量大或要求极高直接上专业 MQ。',
        ]}
      />
    </>
  )
}

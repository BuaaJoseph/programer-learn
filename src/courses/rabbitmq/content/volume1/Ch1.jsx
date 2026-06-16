import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import MqDecoupling from '@/courses/rabbitmq/illustrations/MqDecoupling.jsx'

const syncCode = `# 没有消息队列：下单接口里串行调用三个下游
def create_order(req):
    order = save_order(req)        # 1. 落库，核心步骤
    deduct_stock(order)            # 2. 扣库存，调用库存服务
    add_points(order)              # 3. 加积分，调用积分服务
    send_sms(order)                # 4. 发短信，调用短信服务
    return order                   # 全部成功才返回，慢且脆`

const mqCode = `# 引入消息队列：主流程只做核心，其余丢进队列
def create_order(req):
    order = save_order(req)              # 1. 落库，核心步骤
    deduct_stock(order)                  # 2. 扣库存，核心步骤
    mq.publish('order.created', order)   # 3. 发一条消息就返回
    return order                         # 快速返回，不等下游

# 积分服务、短信服务各自订阅这条消息，异步消费
def points_consumer(msg):
    add_points(msg)                      # 加积分

def sms_consumer(msg):
    send_sms(msg)                        # 发短信`

const latencyCode = `# 直观感受一下：同步串行 vs 异步发消息的耗时差距
# 假设各步骤耗时（毫秒）
save_order   = 20    # 落库
deduct_stock = 30    # 扣库存
add_points   = 40    # 加积分（调外部服务）
send_sms     = 200   # 发短信（第三方网关，最慢）

# 串行：用户要等四步全部跑完
sync_latency = 20 + 30 + 40 + 200          # = 290ms

# 异步：主流程只做核心两步 + 一次入队（约 2ms）
async_latency = 20 + 30 + 2                # = 52ms

# 接口 P99 从 290ms 降到 52ms，下游再慢也只影响它自己`

const overflowCode = `# 削峰填谷的数学：洪峰进、匀速出，队列只是临时蓄水
peak_qps     = 100000   # 秒杀瞬时下单 10 万/秒
consume_qps  =  10000   # 库存服务最大处理能力 1 万/秒
peak_seconds =      3   # 洪峰大约持续 3 秒

# 这 3 秒涌入的总量
total = peak_qps * peak_seconds            # = 300000 条

# 下游匀速消费完需要的时间
drain_seconds = total / consume_qps        # = 30 秒
# 代价：用户看到「排队中」要等约 30 秒，但下游始终没被压垮`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          消息队列（<em>Message Queue</em>，常简称 MQ）几乎是后端面试的必考题。但面试官真正想听的不是「它是个中间件」，
          而是你能不能讲清楚一件事：为什么明明可以直接调用，还要多搭一个 MQ 进来？答案就三个词——
          <strong>解耦、异步、削峰填谷</strong>。这一章我们用「下单」这个例子，把这三个用途和它的代价一次讲透。
        </p>
      </Lead>

      <h2>先看没有 MQ 时有多难受</h2>
      <p>
        设想一个电商下单接口：用户点「提交订单」后，系统要做四件事——订单落库、扣库存、加积分、发短信通知。
        最朴素的写法就是在一个接口里把它们一个接一个调完：
      </p>
      <CodeBlock lang="python" title="串行调用（反例）" code={syncCode} />
      <p>
        这种写法有三个硬伤。第一，<strong>慢</strong>：用户要等四个步骤全部跑完才能看到「下单成功」，
        发短信慢一点，整个接口就被拖住。第二，<strong>脆</strong>：积分服务挂了，整个下单就失败，
        可加积分明明不是核心步骤。第三，<strong>耦合</strong>：以后产品说「下单后还要给推荐系统推个事件」，
        你就得回来改这个下单接口，再加一行调用——上游被下游绑死了。
      </p>
      <p>
        把这三个硬伤再往深里想一层就明白：它们的共同病根是<strong>上游和下游被「同步调用」这根线硬绑在一起</strong>。
        同步调用意味着三件事被强行捆死：上游必须<strong>等</strong>下游（时间耦合）、上游必须<strong>认识</strong>下游（空间耦合）、
        上游的速度必须<strong>迁就</strong>下游（容量耦合）。下面三个用途，正好是把这三根绳子一根根剪断。
      </p>

      <h2>MQ 的三大用途</h2>
      <h3>一、解耦：下游变动不影响上游</h3>
      <p>
        引入 MQ 后，下单接口只管把一条「订单已创建」的消息丢进队列，至于谁关心这条消息、要做什么，
        它一概不管。积分服务、短信服务、推荐系统各自去订阅。以后再来十个下游，
        下单接口<strong>一行都不用改</strong>。上游和下游之间，从「直接调用」变成了「通过消息间接通信」，
        这就是解耦。
      </p>
      <p>
        这里要区分两种解耦：<strong>空间解耦</strong>（上游不需要知道下游的地址、数量、是否在线）和
        <strong>时间解耦</strong>（上游发消息时下游可以根本没启动，等下游上线再消费）。
        正是时间解耦让「短信服务宕机时下单仍能成功」成为可能——消息安静地躺在队列里等它恢复。
        对比一下：RPC 调用是「点对点、同步、要求对方此刻在线」；MQ 是「发布订阅、异步、对方可以稍后再来」。
      </p>
      <h3>二、异步：主流程快速返回，非核心异步做</h3>
      <p>
        订单落库、扣库存是核心，必须当场完成；加积分、发短信是非核心，晚几百毫秒用户根本无感。
        把非核心步骤丢进队列后，主流程发完消息就立刻返回，接口耗时从「四步之和」降到「两步之和」，
        响应快了一大截。
      </p>
      <CodeBlock lang="python" title="引入 MQ 后" code={mqCode} />
      <p>
        异步的收益可以量化。下面把每一步的耗时填进去，你会看到接口 P99 从近 300ms 直接掉到 50ms 上下——
        而且最慢的「发短信」无论怎么抖动，都不会再拖累主接口：
      </p>
      <CodeBlock lang="python" title="同步 vs 异步耗时对比" code={latencyCode} />
      <h3>三、削峰填谷：洪峰先入队，下游匀速消费</h3>
      <p>
        秒杀场景下，一秒钟可能涌进来十万个下单请求，而库存服务每秒只扛得住一万。
        如果直接打过去，下游瞬间被压垮。有了 MQ，洪峰来的请求先排进队列里「填谷」，
        下游则按自己的节奏每秒取一万条匀速消费。队列在这里就像水库：上游洪峰进、下游平稳出，
        把尖刺磨平了。
      </p>
      <CodeBlock lang="python" title="削峰填谷的数学" code={overflowCode} />
      <p>
        注意削峰是有代价的：它用<strong>时延</strong>换<strong>稳定</strong>。洪峰期间用户看到的不是「下单成功」而是
        「排队处理中」，这要求业务能接受「先受理、后处理」的异步语义。如果业务要求强同步反馈（比如银行转账要立即知道结果），
        削峰就不适用，得换成限流、扩容等手段。能说清「削峰适用于可异步、可容忍延迟的场景」，比单纯背名词高一个段位。
      </p>

      <Example title="同一条「下单」消息，三个下游各取所需">
        <p>用户下单后，系统只发出一条 <code>order.created</code> 消息，三个下游互不知晓、各自消费：</p>
        <ul>
          <li><strong>积分服务</strong>：收到消息 → 给用户账户加 100 积分。</li>
          <li><strong>短信服务</strong>：收到消息 → 给用户发「下单成功」短信。</li>
          <li><strong>数据服务</strong>：收到消息 → 把这笔订单写进数仓做实时报表。</li>
        </ul>
        <p>
          上游下单接口完全不知道这三个下游的存在。明天砍掉短信、后天新增风控，都跟它无关。
        </p>
      </Example>

      <MqDecoupling />

      <KeyIdea title="MQ 的本质是「中间加一层缓冲」">
        <p>
          解耦、异步、削峰看起来是三件事，根子上是同一招：在上游和下游之间塞进一个<strong>缓冲队列</strong>。
          有了这层缓冲，上游不必等下游（异步），上游不必认识下游（解耦），上游的速度不必迁就下游（削峰）。
          记住这一句，三个用途就串成一条线了。
        </p>
      </KeyIdea>

      <h2>MQ 不是万能：什么时候不该用</h2>
      <p>
        加厚一层认知：MQ 是把「同步强一致」换成「异步最终一致」的工具，这个交换不是任何场景都划算。
        下面这些情况，引入 MQ 往往是过度设计：
      </p>
      <ul>
        <li>
          <strong>需要立即拿到下游返回值</strong>：比如下单要实时校验风控并据此放行/拒绝，这是请求-响应语义，
          天然适合 RPC，硬塞 MQ 反而要搞「发消息再轮询结果」的别扭回调。
        </li>
        <li>
          <strong>强一致事务</strong>：扣款和入账必须原子，用本地事务或分布式事务更直接；MQ 只能做到最终一致。
        </li>
        <li>
          <strong>调用链很短、QPS 很低</strong>：一个内部小系统每秒几次调用，引入 MQ 带来的运维、监控、排查成本远超收益。
        </li>
        <li>
          <strong>对延迟极度敏感</strong>：MQ 多一跳网络和一次落盘，微秒级延迟场景（如高频交易撮合）不适合。
        </li>
      </ul>

      <Callout variant="warn" title="面试陷阱：MQ 不是免费的">
        <p>
          只夸 MQ 好处、答不上代价，是面试的减分项。引入 MQ 至少要付出四笔账：
        </p>
        <ul>
          <li>
            <strong>系统复杂度变高</strong>：多了一个要部署、要监控、可能成为单点的中间件，链路也更难排查。
          </li>
          <li>
            <strong>一致性变弱</strong>：原本同步事务能保证的「要么都成功要么都失败」，
            变成了最终一致性，得自己兜底。
          </li>
          <li>
            <strong>消息三大问题</strong>：消息可能<strong>丢失</strong>、可能<strong>重复</strong>消费、
            可能<strong>乱序</strong>，每一个都得专门设计方案（后面几章会逐个讲）。
          </li>
          <li>
            <strong>运维成本</strong>：MQ 自身的高可用、积压告警、扩容，都是要长期维护的活。
          </li>
        </ul>
      </Callout>

      <h2>主流 MQ 一句话对比</h2>
      <p>
        面试常被追问「为什么选 RabbitMQ 不选 Kafka」，先有个总体印象，后面章节会聚焦 RabbitMQ 的细节：
      </p>
      <table>
        <thead>
          <tr><th>产品</th><th>模型</th><th>吞吐</th><th>典型场景</th><th>特点</th></tr>
        </thead>
        <tbody>
          <tr><td>RabbitMQ</td><td>AMQP，交换机+队列路由</td><td>万级/秒</td><td>业务解耦、可靠投递、复杂路由</td><td>路由灵活、可靠性强、延迟低</td></tr>
          <tr><td>Kafka</td><td>分区日志（Log）</td><td>百万级/秒</td><td>日志、流式、大数据管道</td><td>高吞吐、顺序、可回溯</td></tr>
          <tr><td>RocketMQ</td><td>类 Kafka + 事务消息</td><td>十万级/秒</td><td>电商订单、金融事务</td><td>事务消息、延迟消息强</td></tr>
        </tbody>
      </table>
      <p>
        一句话记忆：<strong>RabbitMQ 胜在路由灵活与可靠投递，Kafka 胜在吞吐与可回溯</strong>。
        本课程聚焦 RabbitMQ，它的「交换机—绑定—队列」三段式路由模型是它最有特色、也是最容易被追问的地方。
      </p>

      <h2>面试怎么答</h2>
      <p>
        被问「为什么用消息队列」，别只背三个名词。推荐这样答：先讲<strong>用途</strong>——
        用下单的例子说清解耦（下游随便加减不影响上游）、异步（主流程快速返回）、
        削峰（秒杀洪峰先入队再匀速消费）；再主动补一句<strong>代价</strong>——
        引入 MQ 会带来系统复杂度、一致性、消息丢失重复顺序、运维这些新问题，
        所以「能不用就不用，该用才用」。能把好处和代价都讲到，面试官就知道你是真用过、而不是背的。
      </p>
      <Callout variant="info" title="高频追问与常见误区">
        <ul>
          <li>
            <strong>追问：异步和解耦是一回事吗？</strong> 不是。异步强调「不等」（时间维度），
            解耦强调「不认识」（依赖维度）。一个同步的发布订阅也算解耦，但不算异步。
          </li>
          <li>
            <strong>追问：削峰会不会导致消息一直积压？</strong> 会，如果生产速率长期高于消费速率，
            队列只会越积越多直到撑爆。削峰只对「短时洪峰」有效，长期高负载要靠扩容消费者。
          </li>
          <li>
            <strong>误区：以为加了 MQ 就一定更快。</strong> MQ 降低的是「主接口的响应时间」，
            整个业务的「端到端完成时间」其实更长了（多了入队、调度、消费）。它是把延迟从用户感知挪到了后台。
          </li>
          <li>
            <strong>误区：把 MQ 当数据库用。</strong> 队列只是临时缓冲，不是持久存储，消费完即删；
            需要长期查询历史的，该落库的还得落库。
          </li>
        </ul>
      </Callout>

      <Practice title="写一个最小的发消息与消费">
        <p>
          用伪代码走一遍「下单发消息、下游消费」的最小闭环，体会上游和下游是如何通过一条消息间接通信的。
          先发布，再消费，注意上游 <code>publish</code> 之后并不等待下游。
        </p>
        <CodeBlock lang="python" title="minimal_mq.py" code={mqCode} />
        <p>
          想想看：如果此刻短信服务挂了，下单还能成功吗？（能，因为消息已经进了队列，
          等短信服务恢复后再消费即可——这正是解耦带来的好处。）再想一层：如果是<strong>库存服务</strong>挂了呢？
          那就不该用异步，因为扣库存是核心步骤，必须在主流程里同步完成、失败要让用户立刻知道。
          这正是「哪些步骤丢进队列」的判断标准——非核心、可补偿、可延迟的才丢。
        </p>
      </Practice>

      <Summary
        points={[
          '消息队列的三大用途是解耦、异步、削峰填谷，本质都是在上下游之间加一层缓冲队列。',
          '解耦分空间解耦（不认识下游）和时间解耦（下游可稍后上线），后者让下游宕机时上游仍能发消息。',
          '异步：主流程做完核心步骤、发条消息就快速返回，非核心步骤交给下游异步处理，主接口耗时大幅下降。',
          '削峰填谷：洪峰请求先入队，下游匀速消费，用时延换稳定，只对短时洪峰有效，长期高负载要扩容。',
          '代价不可忽视：系统复杂度上升、一致性变弱、消息会丢失重复乱序、运维成本增加。',
          '不该用 MQ 的场景：需要立即返回值、强一致事务、调用链短 QPS 低、对延迟极度敏感。',
          '面试要点：既能用下单例子讲清三大用途，又能主动说出代价，做到「该用才用」。',
        ]}
      />
    </>
  )
}

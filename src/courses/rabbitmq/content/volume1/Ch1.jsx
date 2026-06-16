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

      <h2>MQ 的三大用途</h2>
      <h3>一、解耦：下游变动不影响上游</h3>
      <p>
        引入 MQ 后，下单接口只管把一条「订单已创建」的消息丢进队列，至于谁关心这条消息、要做什么，
        它一概不管。积分服务、短信服务、推荐系统各自去订阅。以后再来十个下游，
        下单接口<strong>一行都不用改</strong>。上游和下游之间，从「直接调用」变成了「通过消息间接通信」，
        这就是解耦。
      </p>
      <h3>二、异步：主流程快速返回，非核心异步做</h3>
      <p>
        订单落库、扣库存是核心，必须当场完成；加积分、发短信是非核心，晚几百毫秒用户根本无感。
        把非核心步骤丢进队列后，主流程发完消息就立刻返回，接口耗时从「四步之和」降到「两步之和」，
        响应快了一大截。
      </p>
      <CodeBlock lang="python" title="引入 MQ 后" code={mqCode} />
      <h3>三、削峰填谷：洪峰先入队，下游匀速消费</h3>
      <p>
        秒杀场景下，一秒钟可能涌进来十万个下单请求，而库存服务每秒只扛得住一万。
        如果直接打过去，下游瞬间被压垮。有了 MQ，洪峰来的请求先排进队列里「填谷」，
        下游则按自己的节奏每秒取一万条匀速消费。队列在这里就像水库：上游洪峰进、下游平稳出，
        把尖刺磨平了。
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

      <h2>面试怎么答</h2>
      <p>
        被问「为什么用消息队列」，别只背三个名词。推荐这样答：先讲<strong>用途</strong>——
        用下单的例子说清解耦（下游随便加减不影响上游）、异步（主流程快速返回）、
        削峰（秒杀洪峰先入队再匀速消费）；再主动补一句<strong>代价</strong>——
        引入 MQ 会带来系统复杂度、一致性、消息丢失重复顺序、运维这些新问题，
        所以「能不用就不用，该用才用」。能把好处和代价都讲到，面试官就知道你是真用过、而不是背的。
      </p>

      <Practice title="写一个最小的发消息与消费">
        <p>
          用伪代码走一遍「下单发消息、下游消费」的最小闭环，体会上游和下游是如何通过一条消息间接通信的。
          先发布，再消费，注意上游 <code>publish</code> 之后并不等待下游。
        </p>
        <CodeBlock lang="python" title="minimal_mq.py" code={mqCode} />
        <p>
          想想看：如果此刻短信服务挂了，下单还能成功吗？（能，因为消息已经进了队列，
          等短信服务恢复后再消费即可——这正是解耦带来的好处。）
        </p>
      </Practice>

      <Summary
        points={[
          '消息队列的三大用途是解耦、异步、削峰填谷，本质都是在上下游之间加一层缓冲队列。',
          '解耦：上游只发消息、不认识下游，下游随便增减都不用改上游代码。',
          '异步：主流程做完核心步骤、发条消息就快速返回，非核心步骤交给下游异步处理。',
          '削峰填谷：洪峰请求先入队，下游按自己的速度匀速消费，避免被瞬时流量压垮。',
          '代价不可忽视：系统复杂度上升、一致性变弱、消息会丢失重复乱序、运维成本增加。',
          '面试要点：既能用下单例子讲清三大用途，又能主动说出代价，做到「该用才用」。',
        ]}
      />
    </>
  )
}

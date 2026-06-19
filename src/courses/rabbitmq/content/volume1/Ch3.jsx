import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import ExchangeRouting from '@/courses/rabbitmq/illustrations/ExchangeRouting.jsx'

const topicCode = `# 声明一个 topic 交换机
rabbitmqadmin declare exchange name=order.topic type=topic durable=true

# 队列 A：只关心订单创建，绑 order.create
rabbitmqadmin declare queue name=order.create.queue durable=true
rabbitmqadmin declare binding source=order.topic \\
  destination=order.create.queue routing_key=order.create

# 队列 B：关心所有 order 下的单层事件，绑 order.*
rabbitmqadmin declare queue name=order.audit.queue durable=true
rabbitmqadmin declare binding source=order.topic \\
  destination=order.audit.queue routing_key=order.*

# 队列 C：关心 order 下的一切事件，绑 order.#
rabbitmqadmin declare queue name=order.archive.queue durable=true
rabbitmqadmin declare binding source=order.topic \\
  destination=order.archive.queue routing_key=order.#`

const publishCode = `# 发一条 routing key 为 order.create 的消息
rabbitmqadmin publish exchange=order.topic \\
  routing_key=order.create payload='{"id":1001}'

# 结果：
#   order.create.queue  收到（精确等于 order.create）
#   order.audit.queue   收到（order.* 匹配 order 后一个单词）
#   order.archive.queue 收到（order.# 匹配 order 后零或多个单词）

# 再发一条 order.pay.success
rabbitmqadmin publish exchange=order.topic \\
  routing_key=order.pay.success payload='{"id":1001}'

# 结果：
#   order.create.queue  不收（key 不等）
#   order.audit.queue   不收（order.* 只匹配一个单词，这里是两个）
#   order.archive.queue 收到（order.# 匹配多个单词）`

const headersCode = `# headers 交换机：不看 routing key，看 arguments 里的键值对
ch.exchange_declare(exchange='report.headers',
                    exchange_type='headers', durable=True)

# 绑定时用 x-match 指定匹配模式
# all = 所有键值都要匹配；any = 任一匹配即可
ch.queue_bind(exchange='report.headers', queue='vip.cn.queue',
              arguments={'x-match': 'all',
                         'level': 'vip', 'region': 'cn'})

# 发消息时把条件放在 headers 属性里
ch.basic_publish(exchange='report.headers', routing_key='',
                 body='report',
                 properties=pika.BasicProperties(
                     headers={'level': 'vip', 'region': 'cn'}))
# level 和 region 都匹配 → vip.cn.queue 收到`

const aeCode = `# 给主交换机配「备用交换机」，路由不到的消息不丢，转投兜底队列
ch.exchange_declare(exchange='order.dlx-ae',
                    exchange_type='fanout', durable=True)
ch.queue_declare(queue='order.unrouted.queue', durable=True)
ch.queue_bind(exchange='order.dlx-ae', queue='order.unrouted.queue')

# 主交换机声明时通过 alternate-exchange 指向备用交换机
ch.exchange_declare(exchange='order.direct',
                    exchange_type='direct', durable=True,
                    arguments={'alternate-exchange': 'order.dlx-ae'})
# 之后任何在 order.direct 上路由不到队列的消息，都会进 order.unrouted.queue`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          上一章我们知道生产者只把消息发给交换机，由交换机路由到队列。那交换机到底<strong>怎么</strong>路由？
          这取决于它的<em>类型</em>。RabbitMQ 有四种 Exchange：<strong>direct、fanout、topic、headers</strong>。
          它们决定了同一条消息会被投到哪些队列。这一章用具体的 routing key 例子，
          把四种路由规则和典型场景讲清楚——这是面试里关于 RabbitMQ 最高频的考点。
        </p>
      </Lead>

      <h2>四种 Exchange 各是什么规则</h2>
      <h3>direct：routing key 精确匹配</h3>
      <p>
        最简单的一种。消息的 routing key 必须和 Binding 的 routing key
        <strong>完全相等</strong>，才会投到对应队列。比如 binding key 是 <code>order.create</code>，
        那只有 routing key 也是 <code>order.create</code> 的消息才进得来。常用于「按级别/类型精确分发」，
        比如按日志级别路由：<code>error</code> 进告警队列、<code>info</code> 进归档队列。
      </p>
      <p>
        一个细节：direct 允许<strong>同一个 binding key 绑多个队列</strong>，此时它退化成「按 key 分组的广播」——
        发 <code>error</code> 时所有绑了 <code>error</code> 的队列都收到。这其实就是上一章「默认交换机」的本体，
        默认交换机就是一个特殊的、用队列名当 key 的 direct 交换机。
      </p>
      <h3>fanout：广播，忽略 routing key</h3>
      <p>
        最「无脑」也最快的一种。它<strong>无视 routing key</strong>，把收到的每条消息
        <strong>复制一份投给所有绑定到它的队列</strong>。典型场景是广播通知：一条「系统公告」消息发出，
        所有订阅了的服务（推送、站内信、缓存刷新）各收一份。因为不做 key 匹配，fanout 是四种里
        <strong>路由最快</strong>的，配置变更广播、价格刷新这类「全员同步」场景首选它。
      </p>
      <h3>topic：用通配符做模式匹配</h3>
      <p>
        最灵活的一种。routing key 由点号分隔成若干单词（如 <code>order.create.success</code>），
        binding key 里可以用两个通配符：
      </p>
      <ul>
        <li><code>*</code>（星号）：恰好匹配<strong>一个</strong>单词。</li>
        <li><code>#</code>（井号）：匹配<strong>零个或多个</strong>单词。</li>
      </ul>
      <p>
        比如 binding key 写 <code>order.*</code>，能匹配 <code>order.create</code>、<code>order.pay</code>，
        但匹配不了 <code>order.pay.success</code>（那是两个单词）；写 <code>order.#</code>
        则上面三个都能匹配。topic 适合「灵活订阅」：每个下游按自己关心的粒度绑不同的模式。
        设计 routing key 时建议用「层级化命名」，如 <code>{'<业务>.<动作>.<结果>'}</code>
        （订单 <code>order.pay.success</code>、日志 <code>app.web.error</code>），后续扩展订阅只需改 binding 模式。
      </p>
      <h3>headers：按消息头属性匹配（少用）</h3>
      <p>
        它不看 routing key，而是看消息头（headers）里的<strong>键值对</strong>是否匹配 Binding 设定的条件
        （可设 <code>x-match=all</code> 全部满足或 <code>any</code> 任一满足）。功能上能覆盖 direct/topic，
        但配置繁琐、性能略差，实际<strong>很少用</strong>。仅当路由条件是「多维度、非字符串层级」时才考虑它，
        例如同时按 <code>level</code> 和 <code>region</code> 两个独立维度路由：
      </p>
      <CodeBlock lang="python" title="headers 交换机示例" code={headersCode} />

      <Example title="同一个 topic 交换机，三种 binding 的命中差异">
        <p>
          有三个队列分别用 <code>order.create</code>、<code>order.*</code>、<code>order.#</code> 绑到同一个 topic 交换机。
          发不同 routing key 的消息时：
        </p>
        <ul>
          <li>消息 key = <code>order.create</code>：三个队列<strong>全部命中</strong>。</li>
          <li>消息 key = <code>order.pay.success</code>：只有 <code>order.#</code> 命中（另两个一个要精确、一个只匹一词）。</li>
          <li>消息 key = <code>user.login</code>：三个<strong>都不命中</strong>（前缀不是 order）。</li>
        </ul>
      </Example>

      <ExchangeRouting />

      <KeyIdea title="一句话记住四种交换机">
        <p>
          <strong>direct = 精确匹配</strong>（key 必须相等）、<strong>fanout = 广播</strong>（不看 key，人人有份）、
          <strong>topic = 通配匹配</strong>（<code>*</code> 一词、<code>#</code> 多词）、
          <strong>headers = 看消息头</strong>（少用）。选型口诀：要广播用 fanout，要精确用 direct，
          要灵活订阅用 topic。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="面试陷阱：* 和 # 别搞反">
        <p>
          topic 的两个通配符是高频陷阱：<code>*</code> 只匹配<strong>恰好一个</strong>单词，
          <code>#</code> 匹配<strong>零个或多个</strong>单词。所以 <code>order.*</code> 匹配不了
          <code>order.pay.success</code>，也匹配不了光秃秃的 <code>order</code>；而 <code>order.#</code>
          这两个都能匹配。另一个易错点：fanout <strong>完全无视 routing key</strong>，
          别在 fanout 上纠结 key 写什么。
        </p>
      </Callout>

      <h2>路由不到队列怎么兜底：Alternate Exchange</h2>
      <p>
        无论哪种交换机，都可能遇到「消息匹配不到任何队列」的情况（routing key 写错、队列未声明）。
        默认这条消息被静默丢弃。生产环境为了不丢，常给主交换机配一个<strong>备用交换机</strong>
        （Alternate Exchange，AE）：凡是在主交换机上路由失败的消息，自动转投到 AE，再由 AE 投进一个
        「未路由队列」做事后排查与补偿。
      </p>
      <CodeBlock lang="python" title="备用交换机兜底" code={aeCode} />
      <p>
        AE 与生产端的 <code>mandatory</code>+Return 是两种互补手段：AE 在 Broker 侧兜底（消息不丢但生产者不一定知道），
        mandatory 在生产侧感知（消息退回生产者）。可靠系统两者都上。
      </p>

      <h2>性能与选型权衡</h2>
      <p>
        四种交换机的路由开销不同，这点常被忽略但面试官爱追问：
      </p>
      <table>
        <thead>
          <tr><th>类型</th><th>匹配方式</th><th>相对开销</th><th>适用</th></tr>
        </thead>
        <tbody>
          <tr><td>fanout</td><td>不匹配，直接复制</td><td>最低</td><td>全员广播、配置同步</td></tr>
          <tr><td>direct</td><td>哈希精确查找</td><td>低</td><td>按类型/级别精确分发</td></tr>
          <tr><td>topic</td><td>通配符树匹配</td><td>中</td><td>灵活订阅、层级化事件</td></tr>
          <tr><td>headers</td><td>逐键值比对</td><td>高</td><td>多维度非层级路由（罕见）</td></tr>
        </tbody>
      </table>
      <p>
        实务建议：能用 fanout/direct 解决就别上 topic，能用 topic 就别上 headers。绑定数量极多时，
        topic 的匹配树也会有性能成本，超大规模订阅场景要评估。
      </p>

      <h2>面试怎么答</h2>
      <p>
        被问「RabbitMQ 有几种交换机、区别是什么」，按这个顺序答最稳：先一句话给出四种类型，
        再分别用<strong>规则 + 场景</strong>讲——direct 精确匹配、用于按级别路由日志；
        fanout 广播、用于全员通知；topic 通配匹配、用于灵活订阅，记得点出 <code>*</code> 匹一词、<code>#</code> 匹多词；
        headers 看消息头、实际少用。最后用 <code>order.create</code> / <code>order.*</code> / <code>order.#</code>
        举个命中例子，立刻显得你真懂。
      </p>
      <Callout variant="info" title="高频追问">
        <ul>
          <li>
            <strong>追问：交换机之间能不能绑交换机？</strong> 能。RabbitMQ 支持
            exchange-to-exchange 绑定，可以搭多级路由（先 topic 分流，再 fanout 广播），灵活但调试更难。
          </li>
          <li>
            <strong>追问：消息会同时进多个队列吗？会复制几份？</strong> 会。匹配到 N 个队列就投 N 次（逻辑上各一份）；
            RabbitMQ 内部对消息体做引用计数，不会真的把 body 复制 N 遍占内存，但每个队列各自维护一份投递状态。
          </li>
          <li>
            <strong>误区：以为 topic 比 direct「更高级所以都该用 topic」。</strong> 多余的通配匹配是额外开销，
            精确路由场景 direct 更省更直观。
          </li>
        </ul>
      </Callout>

      <Practice title="搭一个 topic 交换机并验证通配匹配">
        <p>
          声明一个 topic 交换机，挂上 <code>order.create</code>、<code>order.*</code>、<code>order.#</code>
          三种 binding，然后发不同 routing key 的消息，观察哪些队列收到了。
        </p>
        <CodeBlock lang="bash" title="declare_topic.sh" code={topicCode} />
        <p>接着发两条不同 routing key 的消息，对照注释里的命中结果：</p>
        <CodeBlock lang="bash" title="publish_topic.sh" code={publishCode} />
        <p>
          在管理台的每个队列页面看 <code>Messages</code> 计数，验证 <code>order.pay.success</code>
          只进了绑 <code>order.#</code> 的那个队列，亲手感受 <code>*</code> 和 <code>#</code> 的区别。
          再发一条 <code>user.login</code>，三个队列都不动——它会被静默丢弃，正好可以试着挂个备用交换机接住它。
        </p>
      </Practice>

      <Summary
        points={[
          'RabbitMQ 有四种交换机：direct、fanout、topic、headers，决定消息怎么路由到队列。',
          'direct：routing key 精确匹配，典型场景是按级别精确路由；默认交换机就是用队列名当 key 的 direct。',
          'fanout：广播，忽略 routing key，把消息复制给所有绑定队列，路由最快，适合全员通知。',
          'topic：通配匹配，* 匹配恰好一个单词、# 匹配零或多个单词，适合层级化命名的灵活订阅。',
          'headers：按消息头键值对匹配（x-match=all/any），功能强但配置繁琐、性能差，仅多维度路由才用。',
          '路由不到队列默认静默丢弃，可用备用交换机（Alternate Exchange）+ mandatory/Return 兜底。',
          '面试要点：用 order.create / order.* / order.# 举例讲清通配规则，别把 * 和 # 搞反。',
        ]}
      />
    </>
  )
}

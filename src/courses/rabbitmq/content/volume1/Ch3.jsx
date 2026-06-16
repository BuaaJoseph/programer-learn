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
      <h3>fanout：广播，忽略 routing key</h3>
      <p>
        最「无脑」也最快的一种。它<strong>无视 routing key</strong>，把收到的每条消息
        <strong>复制一份投给所有绑定到它的队列</strong>。典型场景是广播通知：一条「系统公告」消息发出，
        所有订阅了的服务（推送、站内信、缓存刷新）各收一份。
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
      </p>
      <h3>headers：按消息头属性匹配（少用）</h3>
      <p>
        它不看 routing key，而是看消息头（headers）里的<strong>键值对</strong>是否匹配 Binding 设定的条件
        （可设 <code>x-match=all</code> 全部满足或 <code>any</code> 任一满足）。功能上能覆盖 direct/topic，
        但配置繁琐、性能略差，实际<strong>很少用</strong>，了解即可。
      </p>

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

      <h2>面试怎么答</h2>
      <p>
        被问「RabbitMQ 有几种交换机、区别是什么」，按这个顺序答最稳：先一句话给出四种类型，
        再分别用<strong>规则 + 场景</strong>讲——direct 精确匹配、用于按级别路由日志；
        fanout 广播、用于全员通知；topic 通配匹配、用于灵活订阅，记得点出 <code>*</code> 匹一词、<code>#</code> 匹多词；
        headers 看消息头、实际少用。最后用 <code>order.create</code> / <code>order.*</code> / <code>order.#</code>
        举个命中例子，立刻显得你真懂。
      </p>

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
        </p>
      </Practice>

      <Summary
        points={[
          'RabbitMQ 有四种交换机：direct、fanout、topic、headers，决定消息怎么路由到队列。',
          'direct：routing key 精确匹配，典型场景是按级别精确路由（如日志按 error/info 分发）。',
          'fanout：广播，忽略 routing key，把消息复制给所有绑定队列，适合全员通知。',
          'topic：通配匹配，* 匹配恰好一个单词、# 匹配零或多个单词，适合灵活订阅。',
          'headers：按消息头键值对匹配，功能强但配置繁琐、性能差，实际很少用。',
          '面试要点：用 order.create / order.* / order.# 举例讲清通配规则，别把 * 和 # 搞反。',
        ]}
      />
    </>
  )
}

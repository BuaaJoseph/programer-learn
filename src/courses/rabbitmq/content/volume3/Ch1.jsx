import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import Prefetch from '@/courses/rabbitmq/illustrations/Prefetch.jsx'

const qosCode = `import pika

conn = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
ch = conn.channel()
ch.queue_declare(queue='order', durable=True)

# 关键：每个消费者最多同时持有 50 条未 ack 的消息
# 处理完一条、ack 一条，broker 才会再推下一条
ch.basic_qos(prefetch_count=50)

def on_message(channel, method, props, body):
    handle(body)                              # 真正的业务处理
    channel.basic_ack(method.delivery_tag)    # 手动 ack，背压才生效

# auto_ack 必须为 False，否则 prefetch 形同虚设
ch.basic_consume(queue='order', on_message_callback=on_message, auto_ack=False)
ch.start_consuming()`

const springCode = `# Spring Boot application.yml
spring:
  rabbitmq:
    listener:
      simple:
        acknowledge-mode: manual   # 手动 ack
        prefetch: 50               # 每个消费者预取 50 条
        concurrency: 4             # 起 4 个消费者线程
        max-concurrency: 16        # 高峰自动扩到 16 个`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          消息队列的初衷是「削峰填谷」，可一旦消费跟不上，队列里的消息就会越堆越多，
          内存和磁盘被吃光、延迟从毫秒涨到几十分钟，甚至把整个 broker 拖垮。
          这一章讲清楚堆积是怎么来的、有多危险，以及 RabbitMQ 用来给消费方「踩刹车」的核心机制——
          <em>QoS prefetch</em>（消费端预取 + 背压）。
        </p>
      </Lead>

      <h2>消息为什么会堆积</h2>
      <p>
        队列本质是一个缓冲区：生产者往里塞，消费者往外取。只要在一段时间内
        <strong>消费速度持续小于生产速度</strong>，队列长度就会单调上涨。常见成因有三类：
      </p>
      <ul>
        <li>
          <strong>消费速度天然慢于生产</strong>——比如每条消息要调一次第三方接口、写一次数据库，单条耗时几百毫秒，
          而生产端一秒钟塞进来几千条。
        </li>
        <li>
          <strong>消费者卡住或挂掉</strong>——某条消息触发了死循环、慢 SQL，或者下游服务超时，
          线程被一直占着不返回，相当于消费能力突然归零。
        </li>
        <li>
          <strong>突发流量</strong>——大促、秒杀、定时批处理瞬间灌进海量消息，平时够用的消费者一下子被打穿。
        </li>
      </ul>

      <h3>堆积的危害</h3>
      <p>堆积不是「慢一点」这么简单，它会连锁恶化：</p>
      <ul>
        <li>
          <strong>内存与磁盘压力</strong>——RabbitMQ 会先把消息放内存，到达
          <code>vm_memory_high_watermark</code> 阈值后触发 <em>flow control</em>，
          开始把消息换页到磁盘；磁盘也快满时直接<strong>阻塞生产者连接</strong>，整条链路卡死。
        </li>
        <li>
          <strong>延迟急剧变大</strong>——后进队列的消息要排在百万条之后，端到端延迟从毫秒级劣化到分钟甚至小时级，
          时效性业务（如下单后短信）直接失效。
        </li>
      </ul>

      <h2>QoS prefetch：给消费者上一道背压阀门</h2>
      <p>
        默认情况下，broker 会把消息<strong>尽可能快地一股脑推给</strong>已连接的消费者，塞满它的本地缓冲。
        消费者处理慢，这些消息就堆在客户端内存里，既不公平也容易 OOM。
        <em>QoS</em>（Quality of Service）就是用来限制这个推送量的开关，调用的是 AMQP 的
        <code>basic.qos</code>，核心参数是 <code>prefetchCount</code>。
      </p>
      <p>
        它的语义是：<strong>每个消费者同时最多持有 N 条「已推送但还没 ack」的消息</strong>。
        broker 推够 N 条后就停手，直到消费者 ack 掉一条，才补推一条。这就形成了一条天然的
        <em>backpressure</em>（背压）链路——消费得快就推得快，消费得慢就推得慢，broker 不会再单方面把消费者压垮。
      </p>

      <Example title="大促把队列堆到百万条">
        <p>
          某电商大促，订单创建事件每秒涌入 8000 条，而下游库存服务单条处理要 50ms、只起了 4 个消费者，
          理论吞吐只有 4 / 0.05 = 80 条/秒。差距巨大，半小时就堆了上百万条消息。
        </p>
        <p>
          排查发现没设 QoS，broker 把消息全推给了消费者客户端，结果消费者进程因为本地缓存了几十万条消息直接 OOM 重启，
          重启后又被重新推满、再次 OOM，陷入<strong>雪崩循环</strong>。
          正确做法是先设 <code>prefetch_count=50</code> 让每个消费者只拿一小批稳住不崩，
          再横向扩容消费者并优化下游耗时，把吞吐拉到生产速度之上，让积压慢慢回落。
        </p>
      </Example>

      <Prefetch />

      <KeyIdea title="prefetch 取值是一道权衡题">
        <p>
          prefetch 不是越大越好，也不是越小越好，它在<strong>吞吐</strong>和<strong>公平 / 安全</strong>之间做平衡：
        </p>
        <ul>
          <li>
            <strong>太大</strong>（比如几千）：一个消费者一次抢走太多消息囤在本地，容易撑爆客户端内存，
            而且分配<strong>不均衡</strong>——快的消费者把活全抢走，慢的反而闲着。
          </li>
          <li>
            <strong>太小</strong>（比如 1）：每处理完一条都要等 broker 来回推送一次，网络往返成为瓶颈，
            <strong>吞吐很低</strong>，CPU 也利用不满。
          </li>
          <li>
            <strong>经验值</strong>：单条处理较快时常取 <strong>10~100</strong>；处理越慢、消费者越多，取值应越小，
            目标是「消费者一直有活干、但又不会囤太多」，最终要靠压测调出来。
          </li>
        </ul>
      </KeyIdea>

      <Callout variant="warn" title="prefetch 生效有前提">
        <p>
          QoS 只在<strong>手动 ack</strong>模式下才真正起作用。如果开了 <code>auto_ack=True</code>（自动确认），
          消息一推出去就立刻被当成「已确认」，永远不会有「未 ack」的消息计数，prefetch 形同虚设，broker 还是会狂推。
          所以做流控时必须 <code>auto_ack=False</code> 加上处理完再 <code>basic_ack</code>。
        </p>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>被问「消息堆积了怎么办」，按<strong>止血 → 扩容 → 治本</strong>三步答：</p>
      <ul>
        <li>
          <strong>先止血</strong>：确认消费者是不是卡住或在反复重启；设 / 调小 prefetch 让消费者别再被压垮，先稳住不崩。
        </li>
        <li>
          <strong>再扩容</strong>：横向加消费者实例 / 线程提高并发；优化单条消费效率（批量写库、异步调用、去掉慢 SQL）；
          必要时临时多开一个队列分流。
        </li>
        <li>
          <strong>最后治本</strong>：在生产端做<strong>限流</strong>削峰，让生产速度别长期超过消费能力；
          对历史积压评估是否可丢弃或转存离线处理。
        </li>
      </ul>

      <Practice title="给消费者设置 prefetch 并验证背压">
        <p>下面用 Python pika 客户端设置 <code>prefetch_count</code>，注意必须搭配手动 ack：</p>
        <CodeBlock lang="python" title="consumer_qos.py" code={qosCode} />
        <p>
          Spring Boot 项目里同样的配置写在 application.yml 里，并可配 <code>max-concurrency</code> 让消费者随积压自动扩缩：
        </p>
        <CodeBlock lang="yaml" title="application.yml" code={springCode} />
        <p>
          验证方法：在管理台观察队列的 <code>Unacked</code> 数会稳定在 prefetch × 消费者数附近，
          而 <code>Ready</code>（待推送）数随着消费推进逐步下降，说明背压生效了。
        </p>
      </Practice>

      <Summary
        points={[
          '堆积的根因是「消费速度 < 生产速度」，常见于单条消费慢、消费者卡住 / 挂掉、突发流量三类场景。',
          '危害是连锁的：内存到水位触发 flow control 换页磁盘、磁盘满则阻塞生产者，同时端到端延迟急剧变大。',
          'QoS basic.qos(prefetchCount) 限制每个消费者「未 ack 消息」的最大条数，形成天然的背压（backpressure）。',
          'prefetch 取值是权衡：太大撑爆客户端且分配不均，太小往返开销大吞吐低，常用经验值 10~100，最终靠压测。',
          'QoS 只在手动 ack（auto_ack=False，处理完再 basic_ack）下生效，自动确认会让 prefetch 失效。',
          '堆积处置按「止血（调 prefetch 稳住）→ 扩容（加消费者 / 提效率）→ 治本（生产端限流削峰）」三步走。',
        ]}
      />
    </>
  )
}

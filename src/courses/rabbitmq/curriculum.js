// RabbitMQ 实战：3 卷 10 章。slug 规则 mq{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'mq1',
    index: 1,
    title: '入门与核心模型',
    subtitle: 'Model & Routing',
    theme: '先想清楚为什么要引入 MQ，再看懂 AMQP 的生产-交换-队列-消费模型与四种 Exchange 的路由，后面的可靠性才有根。',
    chapters: [
      { slug: 'mq1-c1', title: '为什么需要消息队列：解耦、异步、削峰', topic: 'MQ 的价值', hook: 'MQ 的三大用途——解耦、异步、削峰填谷——本质都是在系统之间加一个缓冲，让上下游不必同生共死。', minutes: 90, hasContent: true },
      { slug: 'mq1-c2', title: 'AMQP 核心模型：交换机、绑定与队列', topic: 'AMQP 模型', hook: '生产者只把消息发给交换机(exchange)，由绑定(binding)规则决定进哪个队列——生产者根本不知道消费者是谁。', minutes: 120, hasContent: true },
      { slug: 'mq1-c3', title: '四种 Exchange：消息到底怎么路由', topic: 'Exchange 路由', hook: 'direct 精确匹配、fanout 广播、topic 模式匹配、headers 按属性——选错 exchange，消息就到不了该到的队列。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'mq2',
    index: 2,
    title: '可靠性：不丢、不重、不乱',
    subtitle: 'Reliability',
    theme: '消息中间件最值钱的就是可靠性。这一卷把「消息会不会丢、会不会重复、会不会乱序」三个面试必考问题逐一讲透。',
    chapters: [
      { slug: 'mq2-c1', title: '消息不丢：生产者确认 + 持久化 + 手动 ack', topic: '可靠投递', hook: '一条消息从生产到消费要过三关：发到 broker、存到磁盘、被消费成功——每一关都可能丢，三道防线缺一不可。', minutes: 150, hasContent: true },
      { slug: 'mq2-c2', title: '重复消费与幂等设计', topic: '幂等', hook: '只要有重试，就一定有重复消费；解决之道不是杜绝重复，而是让消费逻辑「做多少次结果都一样」。', minutes: 120, hasContent: true },
      { slug: 'mq2-c3', title: '消息顺序性：为什么会乱、怎么保证', topic: '顺序消息', hook: '多消费者并发、失败重试都会打乱顺序；保证顺序的代价是牺牲并发——单队列单消费者或按 key 分区。', minutes: 90, hasContent: true },
      { slug: 'mq2-c4', title: '死信队列与延迟队列', topic: '死信 / 延迟', hook: '消息被拒绝、过期或队列满就成了死信，转入死信交换机(DLX)；用 TTL + DLX 就能实现延迟队列。', minutes: 120, hasContent: true },
    ],
  },
  {
    id: 'mq3',
    index: 3,
    title: '进阶与生产',
    subtitle: 'Production',
    theme: '上了生产，堆积、限流、高可用就是绕不开的问题。这一卷讲清流控与集群，并帮你做 MQ 选型。',
    chapters: [
      { slug: 'mq3-c1', title: '消息堆积与流控：QoS prefetch', topic: '堆积 / 流控', hook: '消费跟不上生产就会堆积；prefetch 控制每个消费者一次最多拿多少条，是最基本的背压手段。', minutes: 90, hasContent: true },
      { slug: 'mq3-c2', title: '高可用：镜像队列与 Quorum Queue', topic: '高可用', hook: '单节点宕机队列就不可用；镜像队列与新一代 Quorum Queue 用多副本保证节点挂了消息还在、队列还能用。', minutes: 120, hasContent: true },
      { slug: 'mq3-c3', title: '选型：RabbitMQ vs Kafka vs RocketMQ', topic: 'MQ 选型', hook: '没有最好的 MQ，只有最合适的：吞吐、延迟、可靠、功能、运维成本，每个维度都要权衡。', minutes: 90, hasContent: true },
    ],
  },
]

export const FLAT_CHAPTERS = VOLUMES.flatMap((vol) =>
  vol.chapters.map((ch) => ({ ...ch, volumeId: vol.id, volumeIndex: vol.index, volumeTitle: vol.title })),
)

export const TOTAL_CHAPTERS = FLAT_CHAPTERS.length
export const TOTAL_MINUTES = FLAT_CHAPTERS.reduce((sum, ch) => sum + ch.minutes, 0)

export function findChapterBySlug(slug) {
  const i = FLAT_CHAPTERS.findIndex((ch) => ch.slug === slug)
  if (i === -1) return { chapter: null, prev: null, next: null }
  return {
    chapter: FLAT_CHAPTERS[i],
    prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null,
    next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null,
  }
}

export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}

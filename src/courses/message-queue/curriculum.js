// 消息队列 · 原理与面试精讲：6 卷 12 章。slug 规则 mq{卷}-c{章}。
export const VOLUMES = [
  {
    id: 'mq0',
    index: 0,
    title: '总论：消息队列是什么',
    subtitle: 'MQ Fundamentals',
    theme: '从动机出发：消息队列到底解决什么问题、典型用在哪，再建立通用模型与术语，把「推还是拉」这个贯穿全课的设计取舍说清楚。',
    chapters: [
      { slug: 'mq0-c1', title: '什么是消息队列：动机与场景', topic: '动机', hook: '一个用来在系统间「异步传话」的中间件，凭什么成了后端标配？解耦、削峰、异步三大价值，加上日志、事件驱动、流处理等典型场景，看清 MQ 为何无处不在。', minutes: 90, hasContent: true },
      { slug: 'mq0-c2', title: '消息模型、术语与推拉之争', topic: '原理', hook: '点对点 vs 发布订阅、生产者/消费者/Broker/Topic/分区/消费组等核心术语，以及「Broker 推消息还是消费者拉消息」的推拉模式优缺点对比。', minutes: 100, hasContent: true },
    ],
  },
  {
    id: 'mq1',
    index: 1,
    title: '通用难题：不丢、不重、有序、不堆',
    subtitle: 'The Hard Problems',
    theme: '所有 MQ 都绕不开的四块硬骨头。讲透可靠投递与不丢消息、幂等去重处理重复、有序性保证，以及消息堆积的成因与应对。',
    chapters: [
      { slug: 'mq1-c1', title: '消息不丢与幂等去重', topic: '原理', hook: '消息可能在生产、存储、消费三段任意一段丢失；至少一次投递又必然带来重复——如何端到端保证不丢，又如何用幂等把「重复」变得无害。', minutes: 120, hasContent: true },
      { slug: 'mq1-c2', title: '消息有序性与消息堆积', topic: '原理', hook: '为什么分区内有序、全局有序代价高；以及消息堆积是怎么产生的、堆积之后如何快速泄洪与扩容消费。', minutes: 110, hasContent: true },
    ],
  },
  {
    id: 'mq2',
    index: 2,
    title: 'Kafka：高吞吐的设计内幕',
    subtitle: 'Kafka Internals',
    theme: '拆解 Kafka 高性能的来由与控制面演进。讲请求全流程、索引与时间轮等设计亮点，再讲控制器、ZooKeeper 的作用与被抛弃，以及事务消息。',
    chapters: [
      { slug: 'mq2-c1', title: 'Kafka 为何快：请求链路与设计亮点', topic: '原理', hook: '顺序写盘、页缓存、零拷贝、批量与压缩——Kafka 高吞吐的底层逻辑；再看一条请求的处理全流程、稀疏索引设计与时间轮如何管海量延时任务。', minutes: 130, hasContent: true },
      { slug: 'mq2-c2', title: '控制器、ZooKeeper 与事务消息', topic: '原理', hook: '控制器如何处理集群事件、ZooKeeper 原本管什么、Kafka 为何要抛弃它转向 KRaft，以及 Kafka 事务消息与「精确一次」是怎么实现的。', minutes: 130, hasContent: true },
    ],
  },
  {
    id: 'mq3',
    index: 3,
    title: 'RabbitMQ：AMQP 与灵活路由',
    subtitle: 'RabbitMQ in Depth',
    theme: '以 AMQP 为骨架理解 RabbitMQ。讲架构与核心组件、交换机类型与路由策略、工作模式与虚拟主机，再到可靠投递、确认机制、死信与延迟队列、集群。',
    chapters: [
      { slug: 'mq3-c1', title: '架构、AMQP、交换机与路由', topic: '原理', hook: '是什么与用在哪、基本架构与核心组件、AMQP 协议与主要角色、四种交换机与工作方式、工作模式、消息路由策略、vhost，以及 routing key 与 binding key 的长度限制。', minutes: 140, hasContent: true },
      { slug: 'mq3-c2', title: '可靠投递、确认、死信与集群', topic: '原理', hook: '如何确保不丢、持久化与持久/非持久队列、确认机制与 prefetch、TTL 过期、死信队列与 DLX、延迟队列、未确认消息处理、镜像队列与集群、重复消费、顺序性、事务机制与无法路由的消息。', minutes: 150, hasContent: true },
    ],
  },
  {
    id: 'mq4',
    index: 4,
    title: 'RocketMQ：自研存储与事务',
    subtitle: 'RocketMQ in Depth',
    theme: '理解阿里系 RocketMQ 的设计抉择。讲自研 NameServer 与服务发现、生产消费原理、Topic 与 Tag、存储机制，再到事务消息、顺序与延迟、重试、高可用与调优。',
    chapters: [
      { slug: 'mq4-c1', title: 'NameServer、收发模型与存储机制', topic: '原理', hook: '是什么与场景、为何不用 ZK 而自研 NameServer 做服务发现、Producer 与 Consumer 工作原理、Topic 与 Tag 区别、同步/异步发送、消费方式、主从架构与 CommitLog 存储及写入优化。', minutes: 140, hasContent: true },
      { slug: 'mq4-c2', title: '事务、顺序、重试与高可用调优', topic: '原理', hook: '事务消息与分布式事务及其缺点、顺序保证、延迟级别、重试机制、广播 vs 集群、消息过滤、幂等与可靠投递、Offset 管理、负载均衡、并发/顺序消费、死信、高可用、消息轨迹、批量、乱序与堆积调优。', minutes: 160, hasContent: true },
    ],
  },
  {
    id: 'mq5',
    index: 5,
    title: '对比与选型：三大 MQ 怎么选',
    subtitle: 'Compare & Choose',
    theme: '把三大 MQ 放到一张表里横向对比并给出选型决策，再讲 RocketMQ 与 Kafka 的渊源、通用调优与最佳实践，收束全课。',
    chapters: [
      { slug: 'mq5-c1', title: 'Kafka vs RocketMQ vs RabbitMQ 选型', topic: '总结', hook: '吞吐、延迟、可靠性、功能丰富度、运维成本、生态——多维对比三大 MQ，并给出「日志流 / 业务解耦 / 复杂路由」等场景下的选型决策路径。', minutes: 120, hasContent: true },
      { slug: 'mq5-c2', title: '渊源、通用调优与最佳实践', topic: '总结', hook: 'RocketMQ 与 Kafka 架构功能对比、RocketMQ 为何参考 Kafka，以及生产端/消费端/Broker 的通用调优与最佳实践清单，收束全课。', minutes: 120, hasContent: true },
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
  return { chapter: FLAT_CHAPTERS[i], prev: i > 0 ? FLAT_CHAPTERS[i - 1] : null, next: i < FLAT_CHAPTERS.length - 1 ? FLAT_CHAPTERS[i + 1] : null }
}
export function findVolumeById(id) {
  return VOLUMES.find((v) => v.id === id) || null
}
